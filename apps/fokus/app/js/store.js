// FOKUS · Estado y persistencia.
// En la app de escritorio se guarda en <userData>/fokus-data.json (escritura atómica).
// Abierta en un navegador (vista previa) usa localStorage como respaldo.
(function () {
  const F = window.F;
  const native = window.fokusNative || null;
  const LS_KEY = 'fokus-data';
  const SCHEMA = 1;

  const empty = () => ({
    schema: SCHEMA,
    profile: { name: '', createdAt: new Date().toISOString() },
    subjects: [],   // { id, name, color, createdAt }
    tasks: [],      // { id, title, subjectId, priority, estimate, due, done, doneAt, createdAt }
    events: [],     // { id, title, subjectId, type, date, start, end, notes }
    files: [],      // { id, name, stored, size, ext, subjectId, addedAt }
    reminders: [],  // { id, text, at, done, notified }
    sessions: [],   // { id, subjectId, start, minutes, kind }
    settings: { focus: 25, short: 5, long: 15, cyclesBeforeLong: 4, autoStartBreaks: false, notifications: true, sound: 'none', volume: 0.5, silent: false, theme: 'system', fileAccess: null, lowPower: true },
  });

  // ---------- Saneado ----------
  // Todo lo que se carga (disco o copia importada) pasa por aquí: tipos, longitudes, formatos y valores permitidos.
  // Así una copia manipulada no puede inyectar HTML/atributos ni romper la app, aunque la interfaz ya escape el texto.
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const STORED_RE = /^[0-9a-f-]{36}(\.[a-z0-9_-]{1,16})?$/i;
  const str = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
  const id = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : F.uid());
  const ref = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : '');
  const oneOf = (v, list, def) => (list.includes(v) ? v : def);
  const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  const date = (v) => (typeof v === 'string' && DATE_RE.test(v) ? v : '');
  const time = (v, def) => (typeof v === 'string' && TIME_RE.test(v) ? v : def);
  const iso = (v) => { const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
  const list = (v, fn, max = 20000) => (Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === 'object').map(fn).filter(Boolean) : []);

  const migrate = (d) => {
    const base = empty();
    if (!d || typeof d !== 'object' || Array.isArray(d)) return base;
    const s = { ...base.settings, ...(d.settings && typeof d.settings === 'object' ? d.settings : {}) };
    const p = d.profile && typeof d.profile === 'object' ? d.profile : {};
    const seen = new Set();
    const uniq = (x) => { if (seen.has(x.id)) x.id = F.uid(); seen.add(x.id); return x; };
    return {
      schema: SCHEMA,
      profile: { name: str(p.name, 30), createdAt: iso(p.createdAt) || base.profile.createdAt, onboarded: p.onboarded === true },
      subjects: list(d.subjects, (x) => uniq({ id: id(x.id), name: str(x.name, 40) || 'Asignatura', color: oneOf(x.color, F.PALETTE, 'lavanda'), createdAt: iso(x.createdAt) || base.profile.createdAt }), 200),
      tasks: list(d.tasks, (x) => uniq({ id: id(x.id), title: str(x.title, 140) || 'Tarea', subjectId: ref(x.subjectId), priority: oneOf(x.priority, ['alta', 'media', 'baja'], 'media'),
        estimate: num(x.estimate, 0, 600, 0), due: date(x.due), done: x.done === true, doneAt: iso(x.doneAt), createdAt: iso(x.createdAt) || base.profile.createdAt })),
      events: list(d.events, (x) => { const dt = date(x.date); if (!dt) return null; return uniq({ id: id(x.id), title: str(x.title, 80) || 'Evento', subjectId: ref(x.subjectId),
        type: oneOf(x.type, ['clase', 'estudio', 'examen', 'entrega', 'otro'], 'otro'), date: dt, start: time(x.start, '09:00'), end: time(x.end, '10:00'), notes: str(x.notes, 500) }); }),
      files: list(d.files, (x) => { if (typeof x.stored !== 'string' || !STORED_RE.test(x.stored)) return null; return uniq({ id: id(x.id), name: str(x.name, 200) || x.stored, stored: x.stored,
        size: num(x.size, 0, 1e12, 0), ext: str(x.ext, 10).toLowerCase().replace(/[^a-z0-9]/g, ''), subjectId: ref(x.subjectId), addedAt: iso(x.addedAt) || new Date().toISOString() }); }),
      reminders: list(d.reminders, (x) => { const at = iso(x.at); if (!at) return null; return uniq({ id: id(x.id), text: str(x.text, 120) || 'Recordatorio', at, done: x.done === true, notified: x.notified === true }); }),
      sessions: list(d.sessions, (x) => { const st = iso(x.start); if (!st) return null; return uniq({ id: id(x.id), subjectId: ref(x.subjectId), start: st, minutes: num(x.minutes, 0, 600, 0), kind: 'focus' }); }, 100000),
      settings: {
        focus: num(s.focus, 1, 180, 25), short: num(s.short, 1, 60, 5), long: num(s.long, 1, 90, 15), cyclesBeforeLong: num(s.cyclesBeforeLong, 2, 8, 4),
        autoStartBreaks: s.autoStartBreaks === true, notifications: s.notifications !== false, silent: s.silent === true,
        sound: oneOf(s.sound, ['none', 'lluvia', 'marron', 'olas'], 'none'), volume: num(s.volume, 0, 1, 0.5),
        theme: oneOf(s.theme, ['light', 'dark', 'system'], 'system'), fileAccess: oneOf(s.fileAccess, ['granted', 'denied'], null), lowPower: s.lowPower !== false,
      },
    };
  };

  const listeners = new Set();
  let saveTimer = null;

  const store = {
    state: empty(),
    native,
    async load() {
      let raw = null;
      if (native) raw = await native.load();
      else { try { raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { raw = null; } }
      this.state = migrate(raw);
      return this.state;
    },
    save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => this.flush(), 250);
    },
    async flush() {
      clearTimeout(saveTimer);
      try {
        if (native) await native.save(this.state);
        else localStorage.setItem(LS_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error(e);
        F.toast('No se han podido guardar los cambios', { icon: 'x' });
      }
    },
    // El permiso de archivos nunca viene de fuera: una copia importada no puede concederlo.
    replace(data) { const access = this.state.settings.fileAccess; this.state = migrate(data); this.state.settings.fileAccess = access; this.commit(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    commit() { this.save(); listeners.forEach((fn) => fn(this.state)); },

    // ---------- Selectores ----------
    subject(id) { return this.state.subjects.find((s) => s.id === id) || null; },
    color(id) { return this.subject(id)?.color || null; },
    minutesBetween(from, to) {
      return this.state.sessions.filter((s) => s.kind === 'focus' && s.start >= from && s.start < to).reduce((a, s) => a + s.minutes, 0);
    },

    // ---------- Mutaciones genéricas ----------
    add(coll, item) { const it = { id: F.uid(), createdAt: new Date().toISOString(), ...item }; this.state[coll].push(it); this.commit(); return it; },
    update(coll, id, patch) { const it = this.state[coll].find((x) => x.id === id); if (it) Object.assign(it, patch); this.commit(); return it; },
    remove(coll, id) { const i = this.state[coll].findIndex((x) => x.id === id); const [it] = i > -1 ? this.state[coll].splice(i, 1) : []; this.commit(); return it; },
    restore(coll, item) { this.state[coll].push(item); this.commit(); },

    async removeSubject(id) {
      // Las tareas, eventos y archivos se conservan, solo pierden la asignatura.
      for (const k of ['tasks', 'events', 'files', 'sessions']) this.state[k].forEach((x) => { if (x.subjectId === id) x.subjectId = ''; });
      this.remove('subjects', id);
    },

    // ---------- Datos de ejemplo (solo si el usuario lo pide en Ajustes) ----------
    loadDemo() {
      const S = (name, color) => ({ id: F.uid(), name, color, createdAt: new Date().toISOString() });
      const subj = [S('Matemáticas', 'lavanda'), S('Historia', 'melocoton'), S('Física', 'cielo'), S('Literatura', 'rosa'), S('Inglés', 'menta'), S('Química', 'mantequilla')];
      const [mat, his, fis, lit, ing, qui] = subj.map((s) => s.id);
      const today = new Date();
      const d = (n) => F.ymd(F.addDays(today, n));
      const wk = F.startOfWeek(today);
      const wd = (n) => F.ymd(F.addDays(wk, n));
      const T = (title, subjectId, priority, estimate, due, done = false) => ({ id: F.uid(), title, subjectId, priority, estimate, due, done, doneAt: done ? new Date().toISOString() : null, createdAt: new Date().toISOString() });
      const E = (title, subjectId, type, date, start, end) => ({ id: F.uid(), title, subjectId, type, date, start, end, notes: '' });
      const sessions = [];
      for (let i = 0; i < 7; i++) {
        const day = F.addDays(today, -i);
        const blocks = [2, 3, 1, 4, 2, 3, 2][i];
        for (let b = 0; b < blocks; b++) {
          const st = new Date(day); st.setHours(9 + b * 2, 0, 0, 0);
          if (st > today) continue;
          sessions.push({ id: F.uid(), subjectId: subj[(i + b) % subj.length].id, start: st.toISOString(), minutes: 25, kind: 'focus' });
        }
      }
      const rem = new Date(today); rem.setHours(today.getHours() + 2, 0, 0, 0);
      this.state = migrate({
        ...this.state,
        subjects: subj,
        tasks: [
          T('Repasar tema 4: derivadas', mat, 'alta', 60, d(0)),
          T('Hacer resumen de la Revolución Francesa', his, 'media', 45, d(0)),
          T('Ejercicios página 32–40', fis, 'media', 60, d(0), true),
          T('Leer capítulo 6', lit, 'baja', 30, d(1)),
          T('Preparar exposición oral', ing, 'alta', 90, d(2)),
          T('Formular compuestos orgánicos', qui, 'media', 40, d(3)),
        ],
        events: [
          // Hoy siempre tiene agenda, sea el día que sea
          E('Matemáticas', mat, 'clase', d(0), '08:00', '10:00'),
          E('Historia', his, 'clase', d(0), '10:00', '12:00'),
          E('Bloque de estudio', fis, 'estudio', d(0), '16:00', '17:30'),
          E('Inglés', ing, 'clase', d(0), '18:00', '19:00'),
          ...[1, 2, 3, 4, 5, 6].map((n) => wd(n)).filter((x) => x !== d(0)).slice(0, 4).flatMap((day, i) => [
            [E('Física', fis, 'clase', day, '12:00', '14:00')],
            [E('Inglés', ing, 'clase', day, '09:00', '10:30'), E('Química', qui, 'clase', day, '15:00', '17:00')],
            [E('Literatura', lit, 'clase', day, '12:00', '14:00')],
            [E('Bloque de estudio', mat, 'estudio', day, '11:30', '13:00')],
          ][i]),
          E('Examen de Matemáticas', mat, 'examen', d(3), '09:00', '11:00'),
          E('Entrega trabajo de Historia', his, 'entrega', d(5), '23:00', '23:30'),
        ],
        reminders: [{ id: F.uid(), text: 'Llevar calculadora al examen', at: rem.toISOString(), done: false, notified: false }],
        sessions,
        files: [],
      });
      this.commit();
    },
  };

  F.store = store;
})();
