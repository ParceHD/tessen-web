// FOKUS · Tareas
(function () {
  const F = window.F;
  const ui = { filter: 'pendientes', subject: '' };
  const PRIO = { alta: 0, media: 1, baja: 2 };

  F.views.tareas = {
    title: 'Tareas',
    render(el) {
      const st = F.store.state;
      const today = F.ymd();
      let list = st.tasks.filter((t) => !ui.subject || t.subjectId === ui.subject);
      const counts = {
        todas: list.length,
        hoy: list.filter((t) => t.due === today).length,
        pendientes: list.filter((t) => !t.done).length,
        completadas: list.filter((t) => t.done).length,
      };
      if (ui.filter === 'hoy') list = list.filter((t) => t.due === today);
      if (ui.filter === 'pendientes') list = list.filter((t) => !t.done);
      if (ui.filter === 'completadas') list = list.filter((t) => t.done);
      list.sort((a, b) => (a.done - b.done) || (a.due || '9999').localeCompare(b.due || '9999') || PRIO[a.priority] - PRIO[b.priority]);

      // Agrupar por momento
      const groups = [];
      const g = (label, items) => items.length && groups.push({ label, items });
      if (ui.filter === 'completadas') g('Completadas', list);
      else {
        const open = list.filter((t) => !t.done);
        g('Vencidas', open.filter((t) => t.due && t.due < today));
        g('Hoy', open.filter((t) => t.due === today));
        g('Próximamente', open.filter((t) => t.due && t.due > today));
        g('Sin fecha', open.filter((t) => !t.due));
        g('Completadas', list.filter((t) => t.done));
      }

      el.innerHTML = `
        <div class="page-head"><div><h1 class="t-title">Tareas</h1><p class="t-sub">${counts.pendientes} pendientes${counts.hoy ? ` · ${counts.hoy} para hoy` : ''}</p></div>
          <div class="page-actions"><button class="btn btn-primary" data-act="new">${F.icon('plus')}Nueva tarea</button></div></div>
        <div class="toolbar">
          <div class="seg" role="tablist">${['todas', 'hoy', 'pendientes', 'completadas'].map((f) =>
            `<button class="${ui.filter === f ? 'on' : ''}" data-filter="${f}">${F.cap(f)} <span class="num" style="opacity:.6">${counts[f]}</span></button>`).join('')}</div>
          <select class="select" data-act="subject" aria-label="Filtrar por asignatura"><option value="">Todas las asignaturas</option>${F.subjectOptions(ui.subject, false)}</select>
        </div>
        <div class="card" style="padding:16px">
          <form class="quick-add">${F.icon('plus')}<input name="q" placeholder="${F.isMobile?.() ? 'Tarea rápida para hoy…' : 'Añadir tarea rápida para hoy y pulsar Intro…'}" enterkeyhint="done" maxlength="140" autocomplete="off"></form>
          <div class="task-list">${groups.length ? groups.map((gr) => `<div class="t-eyebrow group-label">${gr.label} · ${gr.items.length}</div>${gr.items.map(F.taskRow).join('')}`).join('') : `
            <div class="empty"><span class="empty-ico">${F.icon('tasks')}</span><strong>${ui.filter === 'completadas' ? 'Aún no has completado tareas' : 'Nada pendiente por aquí'}</strong>
            <p>${ui.filter === 'completadas' ? 'Cuando marques una tarea como hecha aparecerá aquí.' : 'Escribe arriba tu siguiente tarea o crea una con todos los detalles.'}</p></div>`}</div>
        </div>`;

      F.bindTasks(el.querySelector('.task-list'));
      el.querySelector('.quick-add').onsubmit = (e) => {
        e.preventDefault();
        const title = e.target.q.value.trim(); if (!title) return;
        F.store.add('tasks', { title, subjectId: ui.subject, priority: 'media', estimate: 0, due: F.ymd(), done: false, doneAt: null });
        setTimeout(() => F.$('.quick-add input')?.focus(), 0);
      };
      el.addEventListener('click', (e) => {
        const f = e.target.closest('[data-filter]');
        if (f) { ui.filter = f.dataset.filter; F.rerender(); }
        if (e.target.closest('[data-act=new]')) F.taskModal(null, { subjectId: ui.subject });
      });
      el.querySelector('[data-act=subject]').onchange = (e) => { ui.subject = e.target.value; F.rerender(); };
    },
  };
})();
