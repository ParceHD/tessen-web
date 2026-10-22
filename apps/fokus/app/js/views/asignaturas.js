// FOKUS · Asignaturas (cuadrícula + ficha de cada asignatura)
(function () {
  const F = window.F;
  const ui = { open: null };

  F.subjectModal = (s = null) => {
    const used = new Set(F.store.state.subjects.map((x) => x.color));
    const color = s?.color || F.PALETTE.find((c) => !used.has(c)) || 'lavanda';
    F.modal({
      title: s ? 'Editar asignatura' : 'Nueva asignatura',
      sub: s ? null : 'Cada asignatura tiene su color: lo verás en tareas, calendario y archivos.',
      submit: s ? 'Guardar cambios' : 'Crear asignatura',
      danger: s ? 'Eliminar' : null,
      body: `<label class="field"><span>Nombre</span><input class="input" name="name" maxlength="40" value="${F.esc(s?.name || '')}" placeholder="Ej. Matemáticas"></label>
        <div class="field"><span>Color</span>${F.colorPicker('color', color)}</div>`,
      onMount: F.bindColorPicker,
      onSubmit: (d, el) => {
        if (!d.name.trim()) { el.querySelector('[name=name]').focus(); return false; }
        if (s) F.store.update('subjects', s.id, { name: d.name.trim(), color: d.color });
        else { F.store.add('subjects', { name: d.name.trim(), color: d.color }); F.toast('Asignatura creada'); }
      },
      onDanger: async () => {
        const ok = await F.confirm(`¿Eliminar ${s.name}?`, 'Sus tareas, eventos y archivos no se borran: quedarán como “Sin asignatura”.');
        if (ok) { await F.store.removeSubject(s.id); ui.open = null; F.toast('Asignatura eliminada', { icon: 'trash' }); }
      },
    });
  };

  const statsFor = (id) => {
    const st = F.store.state;
    const tasks = st.tasks.filter((t) => t.subjectId === id);
    const done = tasks.filter((t) => t.done).length;
    const files = st.files.filter((f) => f.subjectId === id).length;
    const minutes = st.sessions.filter((x) => x.subjectId === id && x.kind === 'focus').reduce((a, x) => a + x.minutes, 0);
    return { tasks: tasks.length, done, files, minutes, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
  };

  function grid(el) {
    const subs = F.store.state.subjects;
    el.innerHTML = `
      <div class="page-head"><div><h1 class="t-title">Mis asignaturas</h1><p class="t-sub">Tareas, archivos, horas de estudio y progreso de cada asignatura.</p></div>
        <div class="page-actions"><button class="btn btn-primary" data-act="new">${F.icon('plus')}Añadir asignatura</button></div></div>
      <div class="subjects">
        ${subs.map((s) => { const k = statsFor(s.id); return `
          <article class="card subject-card" data-open="${s.id}" style="${F.sVars(s.color)}" tabindex="0">
            <div class="subject-art"><span class="initial">${F.esc(s.name.charAt(0).toUpperCase())}</span></div>
            <div class="subject-body"><h3 class="t-h3">${F.esc(s.name)}</h3>
              <div class="t-meta">${F.plural(k.files, "archivo")} · ${F.plural(k.tasks, "tarea")} · ${F.dur(k.minutes)}</div>
              <div class="bar"><i style="width:${k.pct}%"></i></div>
              <div class="subject-stats"><span>Progreso de tareas</span><span class="num">${k.pct}%</span></div></div>
          </article>`; }).join('')}
        <button class="card subject-new" data-act="new">${F.icon('plus')}Nueva asignatura</button>
      </div>`;
  }

  function detail(el, s) {
    const st = F.store.state;
    const k = statsFor(s.id);
    const tasks = st.tasks.filter((t) => t.subjectId === s.id).sort((a, b) => (a.done - b.done) || (a.due || '9').localeCompare(b.due || '9'));
    const today = F.ymd();
    const events = st.events.filter((e) => e.subjectId === s.id && e.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 5);
    const files = st.files.filter((f) => f.subjectId === s.id).slice(-5).reverse();
    el.innerHTML = `
      <div class="page-head" style="${F.sVars(s.color)}"><div>
        <button class="card-link" data-act="back" style="margin-left:-6px">${F.icon('left')}Asignaturas</button>
        <h1 class="t-title" style="display:flex;align-items:center;gap:12px;margin-top:6px"><span style="width:14px;height:14px;border-radius:50%;background:var(--sdot)"></span>${F.esc(s.name)}</h1>
        <p class="t-sub">${k.done} de ${k.tasks} tareas hechas · ${F.dur(k.minutes)} de enfoque</p></div>
        <div class="page-actions">
          <button class="btn btn-outline" data-act="edit">${F.icon('edit')}Editar</button>
          <button class="btn btn-primary" data-act="focus">${F.icon('timer')}Estudiar ahora</button></div></div>
      <div class="home-grid">
        <div class="card"><div class="card-head"><h2 class="t-h3">Tareas</h2><button class="btn btn-soft btn-sm" data-act="task">${F.icon('plus')}Añadir</button></div>
          <div class="task-list">${tasks.length ? tasks.map(F.taskRow).join('') : '<p class="t-meta">Sin tareas todavía.</p>'}</div></div>
        <div class="home-col">
          <div class="card"><div class="card-head"><h2 class="t-h3">Próximos eventos</h2><button class="icon-btn" data-act="event" aria-label="Añadir evento">${F.icon('plus')}</button></div>
            ${events.length ? events.map((e) => `<div class="reminder"><span class="chip subject-chip" style="${F.sVars(s.color)}">${F.cap(e.type)}</span><span>${F.esc(e.title)}</span><span class="when num">${F.relDate(e.date)} · ${e.start}</span></div>`).join('') : '<p class="t-meta" style="margin:0">Nada programado.</p>'}</div>
          <div class="card"><div class="card-head"><h2 class="t-h3">Archivos recientes</h2><button class="card-link" data-act="files">Ver todos ${F.icon('arrow')}</button></div>
            ${files.length ? files.map((f) => `<div class="reminder"><span class="file-ico ${F.fileKind(f.ext)}" style="width:32px;height:32px">${F.esc(f.ext.toUpperCase().slice(0, 4))}</span><span class="file-name" data-file="${f.id}">${F.esc(f.name)}</span></div>`).join('') : '<p class="t-meta" style="margin:0">Sin archivos.</p>'}</div>
        </div>
      </div>`;
    F.bindTasks(el.querySelector('.task-list'));
  }

  F.views.asignaturas = {
    title: 'Asignaturas',
    open(id) { ui.open = id; },
    render(el) {
      const s = ui.open && F.store.subject(ui.open);
      if (s) detail(el, s); else { ui.open = null; grid(el); }
      el.addEventListener('click', (e) => {
        const o = e.target.closest('[data-open]');
        if (o) { ui.open = o.dataset.open; return F.rerender(); }
        const f = e.target.closest('[data-file]');
        if (f) return F.openFile(f.dataset.file);
        const a = e.target.closest('[data-act]')?.dataset.act;
        const cur = ui.open && F.store.subject(ui.open);
        if (a === 'new') F.subjectModal();
        if (a === 'back') { ui.open = null; F.rerender(); }
        if (a === 'edit') F.subjectModal(cur);
        if (a === 'task') F.taskModal(null, { subjectId: cur.id });
        if (a === 'event') F.eventModal(null, { subjectId: cur.id, type: 'estudio' });
        if (a === 'files') { F.views.archivos.filterBy(cur.id); F.go('archivos'); }
        if (a === 'focus') { F.timer.subjectId = cur.id; F.go('concentracion'); }
      });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.open) { ui.open = e.target.dataset.open; F.rerender(); } });
    },
  };
})();
