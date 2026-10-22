// FOKUS · Arranque, navegación, buscador global y recordatorios.
(function () {
  const F = window.F;
  F.VERSION = '1.0.0';

  const NAV = [
    ['inicio', 'Inicio', 'home'],
    ['calendario', 'Calendario', 'calendar'],
    ['tareas', 'Tareas', 'tasks'],
    ['asignaturas', 'Asignaturas', 'book'],
    ['archivos', 'Archivos', 'folder'],
    ['concentracion', 'Concentración', 'timer'],
    ['estadisticas', 'Estadísticas', 'chart'],
  ];
  let current = 'inicio';
  // Móvil: pestañas inferiores + hoja "Más"
  const TABS = [['inicio', 'Inicio', 'home'], ['calendario', 'Calendario', 'calendar'], ['tareas', 'Tareas', 'tasks'], ['concentracion', 'Enfoque', 'timer'], ['mas', 'Más', 'sparkle']];
  const MORE = [['asignaturas', 'Asignaturas', 'book'], ['archivos', 'Archivos', 'folder'], ['estadisticas', 'Estadísticas', 'chart'], ['ajustes', 'Ajustes', 'settings']];
  F.isMobile = () => matchMedia('(max-width: 760px)').matches;

  function shell() {
    document.body.classList.toggle('mac', F.store.native?.platform === 'darwin');
    document.getElementById('root').innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="brand">${F.logoMark(30, 'sb')}<span class="brand-word">FOKUS</span></div>
          <nav class="nav" aria-label="Principal">${NAV.map(([id, label, ico]) => `<a href="#${id}" data-nav="${id}">${F.icon(ico)}<span>${label}</span><span class="count" hidden></span></a>`).join('')}</nav>
          <div class="focus-cta" data-go="concentracion" role="button" tabindex="0">
            <span class="t-eyebrow" data-cta-label>Concentración</span>
            <span class="mini-timer num" data-cta-time>25:00</span>
            <span class="t-meta" data-cta-sub>Listo cuando tú lo estés</span>
            <button class="btn btn-sm" data-cta-btn style="background:var(--brand-soft);color:var(--brand-ink)">${F.icon('play')}Empezar</button>
          </div>
          <button class="profile" data-go="ajustes"><span class="avatar" data-avatar></span><span style="flex:1;min-width:0"><b data-pname></b><span class="t-meta">Ajustes</span></span>${F.icon('settings').replace('<svg', '<svg style="width:18px;height:18px;color:var(--ink-2)"')}</button>
        </aside>
        <div class="main">
          <header class="topbar">
            <span class="m-logo" aria-hidden="true">${F.logoMark(30, 'tb')}</span>
            <div class="search">${F.icon('search')}<input class="input" id="q" placeholder="${F.isMobile() ? 'Buscar…' : 'Buscar tareas, asignaturas, archivos…'}" autocomplete="off" spellcheck="false"><kbd>Ctrl K</kbd>
              <div class="search-results" hidden></div></div>
            <span class="today">${F.longDate()}</span>
            <button class="icon-btn" data-theme-toggle></button>
          </header>
          <div class="install-tip" data-install-tip></div>
          <main class="view" id="view"></main>
        </div>
        <nav class="tabbar" aria-label="Secciones">
          ${TABS.map(([id, label, ico]) => `<button data-tab="${id}">${F.icon(ico)}<span>${label}</span>${id === 'concentracion' ? '<span class="tab-timer" data-tab-timer hidden></span>' : ''}</button>`).join('')}
        </nav>
        <div class="more-sheet" data-more-sheet><div class="sheet" role="dialog" aria-label="Más secciones"><div class="grab"></div>
          ${MORE.map(([id, label, ico]) => `<a href="#${id}" data-nav="${id}">${F.icon(ico)}${label}</a>`).join('')}
        </div></div>
      </div>`;
    bindSearch();
  }

  // ---------- Tema (día / noche / según el sistema) ----------
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  F.isDark = () => document.documentElement.dataset.theme === 'dark';
  F.applyTheme = () => {
    const pref = F.store.state.settings.theme || 'system';
    const dark = pref === 'dark' || (pref === 'system' && darkMQ.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    F.store.native?.setTheme(pref);
    const b = F.$('[data-theme-toggle]');
    if (b) { b.innerHTML = F.icon(dark ? 'sun' : 'moon'); b.title = dark ? 'Cambiar a modo día' : 'Cambiar a modo noche'; b.setAttribute('aria-label', b.title); }
  };
  F.setTheme = (pref) => { F.store.state.settings.theme = pref; F.applyTheme(); F.store.commit(); };
  darkMQ.addEventListener('change', () => { if ((F.store.state.settings.theme || 'system') === 'system') F.applyTheme(); });

  // ---------- Arrastrar archivos a la ventana ----------
  // Se aceptan en cualquier pantalla: se piden permisos si hace falta y se llevan a Archivos.
  function bindDrop() {
    let depth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    document.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; depth++; document.body.classList.add('dropping'); });
    document.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--depth <= 0) { depth = 0; document.body.classList.remove('dropping'); } });
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0; document.body.classList.remove('dropping');
      if (!hasFiles(e) || !F.store.native) return;
      const paths = [...e.dataTransfer.files].map((f) => F.store.native.pathForFile(f)).filter(Boolean);
      if (paths.length) F.importFiles(paths);
    });
  }

  // Navegación global: se registra una sola vez al arrancar.
  function bindNavigation() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-theme-toggle]')) { F.setTheme(F.isDark() ? 'light' : 'dark'); return; }
      const sheet = F.$('[data-more-sheet]');
      const tab = e.target.closest('[data-tab]');
      if (tab) { if (tab.dataset.tab === 'mas') sheet.classList.toggle('open'); else { sheet.classList.remove('open'); F.go(tab.dataset.tab); } return; }
      if (sheet?.classList.contains('open') && (e.target === sheet || e.target.closest('[data-nav]'))) sheet.classList.remove('open');
      const nav = e.target.closest('[data-nav]');
      if (nav) { e.preventDefault(); F.go(nav.dataset.nav); return; }
      const g = e.target.closest('[data-go]');
      if (!g) return;
      if (e.target.closest('[data-cta-btn]')) { e.stopPropagation(); F.timer.toggle(); return; }
      F.go(g.dataset.go);
    });
    window.addEventListener('hashchange', () => F.go(location.hash.slice(1)));
  }

  function paintChrome() {
    const st = F.store.state;
    F.$$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === current));
    const tabOf = TABS.some(([id]) => id === current) ? current : 'mas';
    F.$$('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tabOf));
    const pend = st.tasks.filter((t) => !t.done && t.due && t.due <= F.ymd()).length;
    const c = F.$('[data-nav=tareas] .count'); c.hidden = !pend; c.textContent = pend;
    const name = st.profile.name || 'Estudiante';
    F.$('[data-pname]').textContent = name;
    F.$('[data-avatar]').textContent = name.charAt(0).toUpperCase();
    paintCta();
  }

  function paintCta() {
    const T = F.timer, box = F.$('.focus-cta'); if (!box) return;
    const active = T.running || T.startedAt || T.remaining !== T.total;
    const tt = F.$('[data-tab-timer]');
    if (tt) { tt.hidden = !(T.running && current !== 'concentracion'); tt.textContent = T.fmt(); }
    box.classList.toggle('running', T.running);
    box.hidden = current === 'concentracion';
    F.$('[data-cta-time]').textContent = T.fmt();
    F.$('[data-cta-label]').textContent = T.PHASE_LABEL[T.phase];
    const s = F.store.subject(T.subjectId);
    F.$('[data-cta-sub]').textContent = T.running ? (s ? s.name : 'Estudio libre') : active ? 'En pausa' : 'Listo cuando tú lo estés';
    F.$('[data-cta-btn]').innerHTML = T.running ? `${F.icon('pause')}Pausar` : `${F.icon('play')}${active ? 'Continuar' : 'Empezar'}`;
    F.$('[data-cta-btn]').style.cssText = T.running ? '' : 'background:var(--brand-soft);color:var(--brand-ink)';
  }

  F.go = (id) => {
    if (!F.views[id]) id = 'inicio';
    if (id !== current) { F.views[current]?.unmount?.(); if (id !== 'concentracion') document.body.classList.remove('zen'); }
    current = id;
    document.body.dataset.view = id;
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    F.rerender(true);
  };

  // Cada render crea un contenedor nuevo, así los listeners de la vista anterior desaparecen con él.
  F.rerender = (animate = false) => {
    const host = F.$('#view'); if (!host) return;
    const scroll = animate ? 0 : host.scrollTop;
    const el = document.createElement('div');
    F.views[current].render(el);
    host.replaceChildren(el);
    host.style.animation = 'none';
    if (animate) { void host.offsetWidth; host.style.animation = ''; }
    host.scrollTop = scroll;
    paintChrome();
  };

  // ---------- Buscador global ----------
  function bindSearch() {
    const input = F.$('#q'), box = F.$('.search-results');
    let sel = 0, items = [];
    const run = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { box.hidden = true; return; }
      const st = F.store.state, m = (s) => s.toLowerCase().includes(q);
      items = [
        ...st.subjects.filter((s) => m(s.name)).map((s) => ({ ico: 'book', label: s.name, meta: 'Asignatura', go: () => { F.views.asignaturas.open(s.id); F.go('asignaturas'); } })),
        ...st.tasks.filter((t) => m(t.title)).map((t) => ({ ico: 'tasks', label: t.title, meta: t.done ? 'Tarea hecha' : 'Tarea', go: () => F.taskModal(t) })),
        ...st.events.filter((e) => m(e.title)).map((e) => ({ ico: 'calendar', label: e.title, meta: `${F.relDate(e.date)} · ${e.start}`, go: () => F.eventModal(e) })),
        ...st.files.filter((f) => m(f.name)).map((f) => ({ ico: 'file', label: f.name, meta: 'Archivo', go: () => F.openFile(f.id) })),
      ].slice(0, 12);
      sel = 0;
      box.innerHTML = items.length ? items.map((it, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}">${F.icon(it.ico)}<span>${F.esc(it.label)}</span><span class="t-meta">${F.esc(it.meta)}</span></button>`).join('')
        : `<div class="t-meta" style="padding:12px">Sin resultados para “${F.esc(input.value)}”.</div>`;
      box.hidden = false;
    };
    const pick = (i) => { const it = items[i]; if (!it) return; input.value = ''; box.hidden = true; input.blur(); it.go(); };
    input.addEventListener('input', run);
    input.addEventListener('focus', run);
    input.addEventListener('blur', () => setTimeout(() => (box.hidden = true), 150));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length);
        F.$$('button', box).forEach((b, i) => b.classList.toggle('on', i === sel));
      }
      if (e.key === 'Enter') pick(sel);
      if (e.key === 'Escape') { input.value = ''; input.blur(); }
    });
    box.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); pick(Number(b.dataset.i)); } });
  }

  // ---------- Recordatorios ----------
  function checkReminders() {
    const st = F.store.state;
    if (st.settings.silent && F.timer.running && F.timer.phase === 'focus') return; // esperan al final del bloque
    const now = new Date().toISOString();
    let changed = false;
    st.reminders.filter((r) => !r.done && !r.notified && r.at <= now).forEach((r) => {
      r.notified = true; changed = true;
      if (st.settings.notifications) F.notify('Recordatorio', r.text);
    });
    if (changed) F.store.commit();
  }

  // ---------- Bienvenida (primer uso) ----------
  function onboarding() {
    const ov = document.createElement('div');
    ov.className = 'onboard';
    ov.innerHTML = `<div class="onboard-card">
      <div class="logo">${F.logoMark(76, 'ob')}</div>
      <h1 class="t-title">Te damos la bienvenida a FOKUS</h1>
      <p class="slogan">Study Beautifully</p>
      <p class="t-sub" style="margin:0">Tus asignaturas, tareas, calendario y sesiones de concentración en un solo lugar. Gratis y guardado en tu ${F.DEVICE}.</p>
      <form><input class="input" name="name" maxlength="30" placeholder="¿Cómo te llamas?" autocomplete="given-name">
        <button class="btn btn-primary btn-lg" type="submit">Empezar ${F.icon('arrow')}</button></form>
      <p class="onboard-by"><span class="tessen-tile sm"><img src="assets/tessen-icon.png" alt=""></span>Una app de TESSEN</p></div>`;
    document.body.append(ov);
    ov.querySelector('input').focus();
    ov.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      F.store.state.profile.name = e.target.name.value.trim();
      F.store.state.profile.onboarded = true;
      F.store.commit();
      ov.remove();
    };
  }

  async function boot() {
    await F.store.load();
    F.sound.current = 'none';
    F.timer.init();
    shell();
    F.applyTheme();
    bindNavigation();
    bindDrop();
    F.initUpdates();
    F.store.native?.version().then((v) => { F.VERSION = v; });
    F.store.subscribe(() => F.rerender());
    F.timer.on(paintCta);
    F.go((location.hash || '#inicio').slice(1));
    if (!F.store.state.profile.onboarded) onboarding();
    checkReminders();
    setInterval(checkReminders, 20000);
    // Al cambiar de día, refrescar fechas y agenda
    let day = F.ymd();
    setInterval(() => { if (F.ymd() !== day) { day = F.ymd(); shell(); F.applyTheme(); F.go(current); } }, 60000);

    document.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); F.$('#q')?.focus(); }
      if (typing || F.$('.overlay, .onboard')) return;
      if (e.code === 'Space' && current === 'concentracion') { e.preventDefault(); F.timer.toggle(); }
      if (e.key === 'Escape' && document.body.classList.contains('zen')) { document.body.classList.remove('zen'); F.rerender(); }
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); F.taskModal(); }
    });
    window.addEventListener('beforeunload', () => { F.timer.logPartial(); F.store.flush(); });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
