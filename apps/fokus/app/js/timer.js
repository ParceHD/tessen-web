// FOKUS · Motor del temporizador (Pomodoro, modo profundo y personalizado) + sonido ambiente.
// Vive fuera de las vistas: sigue contando aunque cambies de pantalla.
(function () {
  const F = window.F;

  const PRESETS = {
    pomodoro: { label: 'Pomodoro', focus: () => F.store.state.settings.focus, short: () => F.store.state.settings.short, long: () => F.store.state.settings.long },
    deep: { label: 'Modo profundo', focus: () => 50, short: () => 10, long: () => 20 },
    custom: { label: 'Personalizado', focus: () => timer.custom.focus, short: () => timer.custom.short, long: () => timer.custom.short * 3 },
  };
  const PHASE_LABEL = { focus: 'Enfoque', short: 'Descanso corto', long: 'Descanso largo' };

  const listeners = new Set();
  let tick = null;

  const timer = {
    preset: 'pomodoro',
    phase: 'focus',
    running: false,
    endsAt: 0,
    remaining: 0,     // segundos
    total: 0,         // segundos
    cycle: 0,         // bloques de enfoque completados en esta tanda
    subjectId: '',
    startedAt: null,  // inicio del bloque de enfoque actual (para registrar la sesión)
    custom: { focus: 40, short: 8 },
    PRESETS, PHASE_LABEL,

    init() {
      this.setPhase('focus');
      F.store.native?.onTimerDue(() => this.update());
      // Al volver a mostrar la ventana, se pone al día de golpe y retoma el repintado.
      document.addEventListener('visibilitychange', () => { if (this.running) { this.update(); this.scheduleTick(); } });
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { listeners.forEach((fn) => fn(this)); },
    minutesFor(phase) { return Math.max(1, Math.round(Number(PRESETS[this.preset][phase]()) || 1)); },

    setPreset(p) { if (this.running) this.logPartial(); this.preset = p; this.cycle = 0; this.setPhase('focus'); },
    setPhase(phase) {
      this.stopTick();
      this.running = false;
      this.phase = phase;
      this.total = this.remaining = this.minutesFor(phase) * 60;
      this.startedAt = null;
      this.emit();
    },
    start() {
      if (this.running) return;
      if (this.phase === 'focus' && !this.startedAt) this.startedAt = new Date().toISOString();
      this.running = true;
      this.endsAt = Date.now() + this.remaining * 1000;
      this.scheduleEnd();
      this.scheduleTick();
      sound.resume();
      this.emit();
    },
    // Un único repintado por segundo, alineado con el cambio de segundo, y ninguno si la ventana no se ve.
    scheduleTick() {
      clearTimeout(tick); tick = null;
      if (!this.running || document.hidden) return;
      const ms = ((this.endsAt - Date.now()) % 1000 + 1000) % 1000 || 1000;
      tick = setTimeout(() => { this.update(); this.scheduleTick(); }, ms + 15);
    },
    // El fin del bloque lo vigila el proceso principal (no se ralentiza con la ventana minimizada).
    scheduleEnd() {
      const native = F.store.native;
      if (native) native.scheduleTimer(this.endsAt);
      else { clearTimeout(this._end); if (this.endsAt > Date.now()) this._end = setTimeout(() => this.update(), this.endsAt - Date.now() + 50); }
    },
    pause() {
      if (!this.running) return;
      this.update();
      this.running = false;
      this.stopTick();
      this.emit();
    },
    toggle() { this.running ? this.pause() : this.start(); },
    reset() { if (this.phase === 'focus') this.logPartial(); this.setPhase(this.phase); },
    skip() {
      if (this.phase === 'focus') { this.logPartial(); this.cycle++; }
      this.next(false);
    },
    stopTick() {
      clearTimeout(tick); tick = null;
      clearTimeout(this._end);
      F.store.native?.scheduleTimer(0);
    },
    update() {
      if (!this.running) return;
      this.remaining = Math.max(0, Math.round((this.endsAt - Date.now()) / 1000));
      if (this.remaining <= 0) this.complete();
      else this.emit();
    },
    complete() {
      this.stopTick();
      this.running = false;
      const s = F.store.state.settings;
      if (this.phase === 'focus') {
        this.log(this.total / 60);
        this.cycle++;
        chime();
        if (s.notifications) F.notify('¡Bloque completado!', `${F.dur(this.total / 60)} de enfoque. Toca descansar un poco.`);
      } else {
        chime();
        if (s.notifications) F.notify('Fin del descanso', 'Cuando quieras, empezamos otro bloque.');
      }
      this.next(s.autoStartBreaks && this.phase === 'focus');
    },
    next(autostart) {
      const s = F.store.state.settings;
      const nextPhase = this.phase === 'focus' ? (this.cycle > 0 && this.cycle % s.cyclesBeforeLong === 0 ? 'long' : 'short') : 'focus';
      this.setPhase(nextPhase);
      if (autostart) this.start();
    },
    // Si se interrumpe un bloque, se registra el tiempo real estudiado (mínimo 1 minuto).
    logPartial() {
      if (this.phase !== 'focus' || !this.startedAt) return;
      if (this.running) this.update();
      const mins = (this.total - this.remaining) / 60;
      if (mins >= 1) this.log(mins);
      this.startedAt = null;
    },
    log(minutes) {
      F.store.state.sessions.push({ id: F.uid(), subjectId: this.subjectId || '', start: this.startedAt || new Date().toISOString(), minutes: Math.round(minutes), kind: 'focus' });
      F.store.commit();
      this.startedAt = null;
    },
    fmt() { const m = Math.floor(this.remaining / 60), s = this.remaining % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; },
    progress() { return this.total ? 1 - this.remaining / this.total : 0; },
  };

  F.notify = (title, body) => {
    if (F.store.native) F.store.native.notify(title, body);
    else if ('Notification' in window) {
      if (Notification.permission === 'granted') new Notification(title, { body });
      else if (Notification.permission !== 'denied') Notification.requestPermission();
    }
    F.toast(title, { icon: 'bell', ms: 5000 });
  };

  // ---------- Audio: generado en tiempo real con Web Audio, sin archivos externos ----------
  let ctx = null, idleTimer = null;
  const ensureCtx = () => { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); clearTimeout(idleTimer); ctx.resume(); return ctx; };
  // El motor de audio se duerme cuando no suena nada (si no, gasta CPU aunque esté en silencio).
  const idleAudio = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!sound.nodes) ctx?.suspend(); }, 2500); };

  function chime() {
    try {
      const c = ensureCtx(); const t = c.currentTime;
      [659.25, 880, 1318.5].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.14);
        g.gain.linearRampToValueAtTime(0.14, t + i * 0.14 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.14 + 1.4);
        o.connect(g).connect(c.destination); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 1.5);
      });
      idleAudio();
    } catch { /* sin audio disponible */ }
  }

  const SOUNDS = {
    none: { label: 'Sin sonido' },
    lluvia: { label: 'Lluvia suave' },
    marron: { label: 'Ruido marrón' },
    olas: { label: 'Olas' },
  };

  const sound = {
    SOUNDS,
    current: 'none',
    nodes: null,
    noiseBuffer(c, kind) {
      const len = c.sampleRate * 4, buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch); let last = 0, b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
          else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
        }
      }
      return buf;
    },
    play(name) {
      this.stop();
      this.current = name;
      F.store.state.settings.sound = name; F.store.save();
      if (name === 'none') return;
      const c = ensureCtx();
      const src = c.createBufferSource(); src.loop = true;
      const gain = c.createGain(); gain.gain.value = 0;
      const filter = c.createBiquadFilter();
      let lfo = null;
      if (name === 'lluvia') { src.buffer = this.noiseBuffer(c, 'pink'); filter.type = 'highpass'; filter.frequency.value = 400; }
      if (name === 'marron') { src.buffer = this.noiseBuffer(c, 'brown'); filter.type = 'lowpass'; filter.frequency.value = 900; }
      if (name === 'olas') {
        src.buffer = this.noiseBuffer(c, 'brown'); filter.type = 'lowpass'; filter.frequency.value = 600;
        lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.35;
        lfo.connect(lg).connect(gain.gain); lfo.start();
      }
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
      gain.gain.linearRampToValueAtTime(F.store.state.settings.volume * (name === 'olas' ? 0.6 : 0.5), c.currentTime + 1.2);
      this.nodes = { src, gain, lfo };
    },
    stop() {
      if (!this.nodes) return;
      const { src, gain, lfo } = this.nodes; const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + 0.4);
      setTimeout(() => { try { src.stop(); lfo?.stop(); } catch {} }, 450);
      idleAudio();
      this.nodes = null;
    },
    setVolume(v) {
      F.store.state.settings.volume = v; F.store.save();
      if (this.nodes) this.nodes.gain.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.1);
    },
    resume() { if (this.nodes) ctx?.resume(); },
  };

  F.timer = timer;
  F.sound = sound;
})();
