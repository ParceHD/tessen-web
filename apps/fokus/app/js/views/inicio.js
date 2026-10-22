// FOKUS · Inicio: agenda inteligente del día.
(function () {
  const F = window.F;
  const QUOTES = [
    'Un pequeño progreso cada día se convierte en grandes resultados.',
    'La concentración es un superpoder.',
    'No hace falta ir rápido. Hace falta no parar.',
    'Hoy, una cosa bien hecha.',
    'Estudia con calma. Avanza con constancia.',
    'Lo que haces cada día importa más que lo que haces de vez en cuando.',
    'El foco es decir que no a todo lo demás, durante 25 minutos.',
  ];
  F.quoteOfDay = () => QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];

  F.taskRow = (t) => {
    const s = F.store.subject(t.subjectId);
    const late = !t.done && t.due && t.due < F.ymd();
    return `<div class="task ${t.done ? 'done' : ''}" data-id="${t.id}" style="${F.sVars(s?.color)}">
      <button class="check ${t.done ? 'on' : ''}" data-act="toggle" aria-label="${t.done ? 'Marcar como pendiente' : 'Completar tarea'}">${F.icon('check')}</button>
      <div><div class="task-title">${F.esc(t.title)}</div>
        <div class="task-sub">${s ? `<span class="dot"></span>${F.esc(s.name)}` : 'Sin asignatura'}${t.due ? ` · <span class="${late ? 'due-late' : ''}">${late ? 'Vencida · ' : ''}${F.relDate(t.due)}</span>` : ''}</div></div>
      <span class="prio ${t.priority}"><i></i>${F.cap(t.priority)}</span>
      <span class="est num">${t.estimate ? F.dur(t.estimate) : ''}</span>
      <button class="icon-btn" data-act="edit" aria-label="Editar">${F.icon('edit')}</button>
    </div>`;
  };

  // Comportamiento compartido de filas de tarea (Inicio y Tareas)
  F.bindTasks = (root) => root.addEventListener('click', (e) => {
    const row = e.target.closest('.task[data-id]'); if (!row) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    const t = F.store.state.tasks.find((x) => x.id === row.dataset.id);
    if (!t) return;
    if (act === 'toggle') {
      F.store.update('tasks', t.id, { done: !t.done, doneAt: !t.done ? new Date().toISOString() : null });
      if (t.done) F.toast('Tarea completada', { icon: 'sparkle' });
    } else if (act === 'edit' || !act) F.taskModal(t);
  });

  F.taskModal = (t = null, defaults = {}) => {
    const v = t || { title: '', subjectId: '', priority: 'media', estimate: 30, due: F.ymd(), ...defaults };
    F.modal({
      title: t ? 'Editar tarea' : 'Nueva tarea',
      submit: t ? 'Guardar cambios' : 'Añadir tarea',
      danger: t ? 'Eliminar' : null,
      body: `
        <label class="field"><span>¿Qué tienes que hacer?</span><input class="input" name="title" required maxlength="140" value="${F.esc(v.title)}" placeholder="Ej. Repasar tema 4"></label>
        <div class="row">
          <label class="field"><span>Asignatura</span><select class="select" name="subjectId">${F.subjectOptions(v.subjectId)}</select></label>
          <label class="field"><span>Fecha límite</span><input class="input" type="date" name="due" value="${v.due || ''}"></label>
        </div>
        <div class="row">
          <label class="field"><span>Prioridad</span><select class="select" name="priority">
            ${['alta', 'media', 'baja'].map((p) => `<option value="${p}" ${p === v.priority ? 'selected' : ''}>${F.cap(p)}</option>`).join('')}</select></label>
          <label class="field"><span>Tiempo estimado (min)</span><input class="input" type="number" min="0" max="600" step="5" name="estimate" value="${v.estimate || ''}"></label>
        </div>`,
      onSubmit: (d, el) => {
        if (!d.title.trim()) { el.querySelector('[name=title]').focus(); return false; }
        const data = { title: d.title.trim(), subjectId: d.subjectId, due: d.due, priority: d.priority, estimate: Number(d.estimate) || 0 };
        if (t) F.store.update('tasks', t.id, data);
        else { F.store.add('tasks', { ...data, done: false, doneAt: null }); F.toast('Tarea añadida'); }
      },
      onDanger: () => {
        const removed = F.store.remove('tasks', t.id);
        F.toast('Tarea eliminada', { icon: 'trash', action: 'Deshacer', onAction: () => F.store.restore('tasks', removed) });
      },
    });
  };

  F.reminderModal = () => {
    const d = new Date(Date.now() + 3600e3);
    F.modal({
      title: 'Nuevo recordatorio', sub: 'Te avisaremos con una notificación a la hora indicada.', submit: 'Crear recordatorio',
      body: `<label class="field"><span>Recordatorio</span><input class="input" name="text" maxlength="120" placeholder="Ej. Llevar la calculadora"></label>
        <div class="row"><label class="field"><span>Día</span><input class="input" type="date" name="date" value="${F.ymd(d)}"></label>
        <label class="field"><span>Hora</span><input class="input" type="time" name="time" value="${F.hhmm(d.getHours() * 60)}"></label></div>`,
      onSubmit: (v, el) => {
        if (!v.text.trim()) { el.querySelector('[name=text]').focus(); return false; }
        const at = new Date(`${v.date}T${v.time || '09:00'}`);
        F.store.add('reminders', { text: v.text.trim(), at: at.toISOString(), done: false, notified: false });
        F.toast('Recordatorio creado', { icon: 'bell' });
      },
    });
  };

  F.views = F.views || {};
  F.views.inicio = {
    title: 'Inicio',
    render(el) {
      const st = F.store.state;
      const today = F.ymd();
      const todays = st.tasks.filter((t) => t.due === today || (!t.done && t.due && t.due < today));
      const doneToday = todays.filter((t) => t.done).length;
      const pending = st.tasks.filter((t) => !t.done).sort((a, b) => (a.due || '9') .localeCompare(b.due || '9'));
      const dayTasks = [...todays.filter((t) => !t.done), ...todays.filter((t) => t.done)];
      const listTasks = (dayTasks.length ? dayTasks : pending).slice(0, 6);
      const events = st.events.filter((e) => e.date === today).sort((a, b) => a.start.localeCompare(b.start));
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const upcoming = st.events.filter((e) => (e.type === 'examen' || e.type === 'entrega') && (e.date > today || (e.date === today && F.toMin(e.end) > nowMin)))
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
      const wk = F.startOfWeek(new Date());
      const weekMin = F.store.minutesBetween(wk.toISOString(), F.addDays(wk, 7).toISOString());
      const reminders = st.reminders.filter((r) => !r.done).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 4);
      const name = st.profile.name || 'estudiante';

      let agendaHtml = '';
      let nowPlaced = false;
      for (const e of events) {
        if (!nowPlaced && F.toMin(e.start) > nowMin) { agendaHtml += `<div class="agenda-now"><span>AHORA</span><i></i></div>`; nowPlaced = true; }
        const s = F.store.subject(e.subjectId);
        agendaHtml += `<div class="agenda-item"><div class="agenda-time num">${e.start}</div>
          <div class="agenda-card" style="${F.sVars(s?.color)}"><b>${F.esc(e.title)}</b><span class="num">${e.start} – ${e.end}${e.type !== 'clase' ? ` · ${F.cap(e.type)}` : ''}</span></div></div>`;
      }
      if (events.length && !nowPlaced) agendaHtml += `<div class="agenda-now"><span>AHORA</span><i></i></div>`;

      const us = upcoming && F.store.subject(upcoming.subjectId);
      const ud = upcoming && F.parseYmd(upcoming.date);

      el.innerHTML = `
        <section class="hello">
          <div><h1 class="t-display">${F.greeting()}, <em>${F.esc(name)}</em></h1>
          <p>${F.longDate()} · Disciplina de hoy, resultados de mañana.</p></div>
          <p class="t-quote">“${F.quoteOfDay()}”</p>
        </section>

        <section class="kpis">
          <button class="card kpi kpi-focus" data-go="concentracion">
            <span class="ico">${F.icon('timer')}</span>
            <span><b>Sesión de enfoque</b><span class="t-meta">${F.timer.running ? `En curso · ${F.timer.fmt()}` : `${F.timer.minutesFor('focus')} min · Empieza ahora`}</span></span>
            <span class="play">${F.icon('play')}</span>
          </button>
          <div class="card kpi"><span class="ico">${F.icon('tasks')}</span>
            <span><b class="num">${doneToday} de ${todays.length}</b><span class="t-meta">Tareas de hoy</span>
            <div class="bar"><i style="width:${todays.length ? (doneToday / todays.length) * 100 : 0}%"></i></div></span></div>
          <div class="card kpi"><span class="ico">${F.icon('exam')}</span>
            <span><b>${upcoming ? F.esc(upcoming.title) : 'Nada a la vista'}</b><span class="t-meta">${upcoming ? `${F.relDate(upcoming.date)} · ${upcoming.start}` : 'Próximo examen o entrega'}</span></span></div>
          <div class="card kpi"><span class="ico">${F.icon('clock')}</span>
            <span><b class="num">${F.dur(weekMin)}</b><span class="t-meta">Enfocado esta semana</span></span></div>
        </section>

        <section class="home-grid">
          <div class="home-col">
            <div class="card">
              <div class="card-head"><h2 class="t-h3">${dayTasks.length ? 'Mi día' : 'Próximas tareas'}</h2>
                <button class="btn btn-soft btn-sm" data-act="new-task">${F.icon('plus')}Añadir tarea</button></div>
              <div class="task-list">${listTasks.length ? listTasks.map(F.taskRow).join('') : `
                <div class="empty"><span class="empty-ico">${F.icon('sparkle')}</span><strong>Día despejado</strong>
                <p>Añade lo que quieras sacar adelante hoy. Lo verás aquí, ordenado.</p></div>`}</div>
              ${pending.length > listTasks.length ? `<button class="card-link" data-go="tareas" style="margin-top:8px">Ver todas las tareas ${F.icon('arrow')}</button>` : ''}
            </div>
            <div class="card">
              <div class="card-head"><h2 class="t-h3">Recordatorios</h2>
                <button class="icon-btn" data-act="new-rem" aria-label="Nuevo recordatorio">${F.icon('plus')}</button></div>
              ${reminders.length ? reminders.map((r) => {
                const at = new Date(r.at); const late = at < new Date();
                return `<div class="reminder" data-id="${r.id}"><button class="check" data-act="rem-done" aria-label="Hecho">${F.icon('check')}</button>
                  <span>${F.esc(r.text)}</span><span class="when num ${late ? 'late' : ''}">${F.relDate(F.ymd(at))} · ${F.hhmm(at.getHours() * 60 + at.getMinutes())}</span></div>`;
              }).join('') : `<p class="t-meta" style="margin:0">Sin recordatorios pendientes.</p>`}
            </div>
          </div>
          <div class="home-col">
            <div class="card">
              <div class="card-head"><h2 class="t-h3">Agenda de hoy</h2><button class="card-link" data-go="calendario">Ver calendario ${F.icon('arrow')}</button></div>
              ${events.length ? `<div class="agenda">${agendaHtml}</div>` : `
                <div class="empty"><span class="empty-ico">${F.icon('calendar')}</span><strong>Sin clases ni eventos hoy</strong>
                <p>Organiza tu semana en el calendario: clases, exámenes y bloques de estudio.</p>
                <button class="btn btn-outline btn-sm" data-go="calendario">Abrir calendario</button></div>`}
            </div>
            ${upcoming ? `<div class="card"><div class="card-head"><h2 class="t-h3">Lo próximo importante</h2></div>
              <div class="next-up" style="${F.sVars(us?.color)}"><div class="date-tile"><b class="num">${ud.getDate()}</b><small>${F.monthShort(ud.getMonth())}</small></div>
              <div><b>${F.esc(upcoming.title)}</b><div class="num" style="font-size:13px">${F.cap(upcoming.type)} · ${F.relDate(upcoming.date)} · ${upcoming.start}</div></div></div></div>` : ''}
          </div>
        </section>`;

      F.bindTasks(el.querySelector('.task-list'));
      el.addEventListener('click', (e) => {
        const a = e.target.closest('[data-act]')?.dataset.act;
        if (a === 'new-task') F.taskModal();
        if (a === 'new-rem') F.reminderModal();
        if (a === 'rem-done') { const id = e.target.closest('[data-id]').dataset.id; F.store.update('reminders', id, { done: true }); F.toast('Recordatorio completado'); }
      });
    },
  };
})();
