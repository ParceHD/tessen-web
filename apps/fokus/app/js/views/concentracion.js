// FOKUS · Pantalla de concentración: el momento icónico de la marca.
(function () {
  const F = window.F;
  const R = 156, C = 2 * Math.PI * R;
  let off = null;

  F.views.concentracion = {
    title: 'Concentración',
    unmount() { off?.(); off = null; },
    render(el) {
      const T = F.timer, st = F.store.state, s = st.settings;
      const cycles = s.cyclesBeforeLong;
      el.innerHTML = `
        <div class="focus-screen">
          <div class="focus-top">
            <div class="seg" style="background:var(--glass)">${Object.entries(T.PRESETS).map(([k, p]) =>
              `<button class="${T.preset === k ? 'on' : ''}" data-preset="${k}">${k === 'deep' ? F.icon('moon') .replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px;margin-right:4px"') : ''}${p.label}</button>`).join('')}</div>
            <button class="icon-btn" data-act="zen" title="${document.body.classList.contains('zen') ? 'Salir del modo inmersivo' : 'Modo inmersivo'}" style="position:absolute;right:0;top:0;background:var(--glass)">${F.icon(document.body.classList.contains('zen') ? 'collapse' : 'expand')}</button>
          </div>

          <div class="focus-center">
            <div class="focus-subject"><span class="t-eyebrow">${T.phase === 'focus' ? 'Estudiando' : 'Descansando'}</span>
              <select class="select" data-act="subject" aria-label="Asignatura">${st.subjects.length ? F.subjectOptions(T.subjectId).replace('Sin asignatura', 'Estudio libre') : '<option value="">Estudio libre</option>'}</select></div>

            <div class="ring" role="timer" aria-live="off">
              <svg viewBox="0 0 340 340">
                <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9283EF"/><stop offset="1" stop-color="#5B49D8"/></linearGradient></defs>
                <circle class="track" cx="170" cy="170" r="${R}" fill="none" stroke-width="10"/>
                <circle class="prog" cx="170" cy="170" r="${R}" fill="none" stroke-width="10" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
              </svg>
              <div class="face"><span class="time num">${T.fmt()}</span><span class="phase">${T.PHASE_LABEL[T.phase]}</span>
                <span class="cycles" title="Bloques completados antes del descanso largo">${[...Array(cycles)].map((_, i) => `<i class="${i < T.cycle % cycles || (T.cycle && T.cycle % cycles === 0 && T.phase === 'long') ? 'on' : ''}"></i>`).join('')}</span></div>
            </div>

            ${T.preset === 'custom' ? `<div class="focus-custom t-meta">Enfoque <input class="input num" type="number" min="1" max="180" data-custom="focus" value="${T.custom.focus}"> min ·
              Descanso <input class="input num" type="number" min="1" max="60" data-custom="short" value="${T.custom.short}"> min</div>` : ''}

            <div class="focus-controls">
              <button class="round-btn" data-act="reset" title="Reiniciar">${F.icon('reset')}</button>
              <button class="play-btn" data-act="toggle" aria-label="${T.running ? 'Pausar' : 'Empezar'}">${F.icon(T.running ? 'pause' : 'play')}</button>
              <button class="round-btn" data-act="skip" title="${T.phase === 'focus' ? 'Pasar al descanso' : 'Saltar descanso'}">${F.icon('skip')}</button>
            </div>
          </div>

          <aside class="focus-side">
            <div class="side-card">${F.icon('wave')}<div style="flex:1;min-width:0"><b>Sonido ambiente</b>
              <select class="select" data-act="sound" style="height:30px;border:0;padding:0 24px 0 0;background-position:right 0 center;background-color:transparent;font-size:13px;color:var(--ink-2)">
                ${Object.entries(F.sound.SOUNDS).map(([k, v]) => `<option value="${k}" ${F.sound.current === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
              ${F.sound.current !== 'none' ? `<input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-act="vol" aria-label="Volumen" style="width:100%;accent-color:var(--brand)">` : ''}</div></div>
            <div class="side-card">${F.icon('bell')}<div><b>Modo silencio</b><span>${s.silent ? 'Recordatorios en pausa' : 'Desactivado'}</span></div>
              <button class="switch ${s.silent ? 'on' : ''}" data-act="silent" aria-label="Modo silencio"></button></div>
            <div class="side-card dim">${F.icon('shield')}<div><b>Bloqueo de webs</b><span class="soon">Próximamente</span></div></div>
          </aside>

          <div class="focus-bottom"><p class="t-quote">“${F.quoteOfDay()}”</p></div>
        </div>`;

      const timeEl = el.querySelector('.time'), prog = el.querySelector('.prog');
      const paint = () => {
        timeEl.textContent = T.fmt();
        prog.style.strokeDashoffset = C * (1 - T.progress());
        document.title = T.running ? `${T.fmt()} · FOKUS` : 'FOKUS';
      };
      paint();
      off?.();
      let lastPhase = T.phase, lastRunning = T.running;
      off = T.on(() => {
        if (T.phase !== lastPhase || T.running !== lastRunning) { lastPhase = T.phase; lastRunning = T.running; F.rerender(); }
        else paint();
      });

      el.addEventListener('click', (e) => {
        const p = e.target.closest('[data-preset]');
        if (p) { F.timer.setPreset(p.dataset.preset); return F.rerender(); }
        const a = e.target.closest('[data-act]')?.dataset.act;
        if (a === 'toggle') T.toggle();
        if (a === 'reset') T.reset();
        if (a === 'skip') T.skip();
        if (a === 'zen') { document.body.classList.toggle('zen'); F.rerender(); }
        if (a === 'silent') { s.silent = !s.silent; F.store.commit(); }
      });
      el.addEventListener('change', (e) => {
        const a = e.target.dataset.act;
        if (a === 'subject') T.subjectId = e.target.value;
        if (a === 'sound') { F.sound.play(e.target.value); F.rerender(); }
        const c = e.target.dataset.custom;
        if (c) { T.custom[c] = Math.max(1, Math.min(Number(e.target.max), Number(e.target.value) || 1)); if (!T.running) T.setPhase(T.phase); }
      });
      el.addEventListener('input', (e) => { if (e.target.dataset.act === 'vol') F.sound.setVolume(Number(e.target.value)); });
    },
  };
})();
