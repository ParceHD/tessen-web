// FOKUS · Calendario (semana y mes)
(function () {
  const F = window.F;
  const H0 = 7, H1 = 23, ROW = 56; // franja visible 07:00–23:00
  const ui = { mode: 'semana', anchor: new Date() };
  const TYPES = { clase: 'Clase', estudio: 'Bloque de estudio', examen: 'Examen', entrega: 'Entrega', otro: 'Otro' };

  F.eventModal = (ev = null, defaults = {}) => {
    const v = ev || { title: '', subjectId: '', type: 'clase', date: F.ymd(), start: '09:00', end: '10:00', notes: '', ...defaults };
    F.modal({
      title: ev ? 'Editar evento' : 'Nuevo evento',
      submit: ev ? 'Guardar cambios' : 'Añadir al calendario',
      danger: ev ? 'Eliminar' : null,
      body: `
        <label class="field"><span>Título</span><input class="input" name="title" maxlength="80" value="${F.esc(v.title)}" placeholder="Ej. Examen de Física"></label>
        <div class="row">
          <label class="field"><span>Tipo</span><select class="select" name="type">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}" ${k === v.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Asignatura</span><select class="select" name="subjectId">${F.subjectOptions(v.subjectId)}</select></label>
        </div>
        <div class="row-3">
          <label class="field"><span>Día</span><input class="input" type="date" name="date" value="${v.date}"></label>
          <label class="field"><span>Empieza</span><input class="input" type="time" name="start" value="${v.start}"></label>
          <label class="field"><span>Termina</span><input class="input" type="time" name="end" value="${v.end}"></label>
        </div>
        <label class="field"><span>Notas</span><textarea class="textarea" name="notes" maxlength="500" placeholder="Aula, temario, material…">${F.esc(v.notes || '')}</textarea></label>`,
      onSubmit: (d, el) => {
        const subj = F.store.subject(d.subjectId);
        const title = d.title.trim() || (subj ? (d.type === 'clase' ? subj.name : `${TYPES[d.type]} de ${subj.name}`) : '');
        if (!title) { el.querySelector('[name=title]').focus(); return false; }
        if (!d.date) { el.querySelector('[name=date]').focus(); return false; }
        if (F.toMin(d.end) <= F.toMin(d.start)) d.end = F.hhmm(Math.min(F.toMin(d.start) + 60, 23 * 60 + 59));
        const data = { title, subjectId: d.subjectId, type: d.type, date: d.date, start: d.start, end: d.end, notes: d.notes.trim() };
        if (ev) F.store.update('events', ev.id, data); else { F.store.add('events', data); F.toast('Evento añadido', { icon: 'calendar' }); }
      },
      onDanger: () => {
        const removed = F.store.remove('events', ev.id);
        F.toast('Evento eliminado', { icon: 'trash', action: 'Deshacer', onAction: () => F.store.restore('events', removed) });
      },
    });
  };

  function weekView() {
    const st = F.store.state;
    // En el móvil caben 3 días; empiezan en el día elegido en vez de en lunes.
    const n = F.isMobile?.() ? 3 : 7;
    const a = ui.anchor;
    const start = n === 7 ? F.startOfWeek(a) : new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const days = [...Array(n)].map((_, i) => F.addDays(start, i));
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const head = days.map((d) => `<div class="cal-day ${F.isToday(F.ymd(d)) ? 'today' : ''}"><small>${F.dowShort(d)}</small><b class="num">${d.getDate()}</b></div>`).join('');
    const hours = [...Array(H1 - H0)].map((_, i) => `<div class="num">${String(H0 + i).padStart(2, '0')}:00</div>`).join('');
    const cols = days.map((d) => {
      const ds = F.ymd(d);
      const evs = st.events.filter((e) => e.date === ds).sort((a, b) => a.start.localeCompare(b.start));
      const items = evs.map((e) => {
        const s = F.store.subject(e.subjectId);
        const top = Math.max(0, (F.toMin(e.start) - H0 * 60) / 60 * ROW);
        const h = Math.max(24, (F.toMin(e.end) - Math.max(F.toMin(e.start), H0 * 60)) / 60 * ROW - 3);
        return `<div class="cal-ev ${e.type === 'examen' ? 'exam' : ''}" data-ev="${e.id}" style="${F.sVars(s?.color)};top:${top}px;height:${h}px" title="${F.esc(e.title)}">
          <b>${F.esc(e.title)}</b>${h > 40 ? `<span class="num">${e.start} – ${e.end}</span>` : ''}</div>`;
      }).join('');
      const nowLine = F.isToday(ds) && nowMin >= H0 * 60 && nowMin <= H1 * 60 ? `<div class="cal-now" style="top:${(nowMin - H0 * 60) / 60 * ROW}px"></div>` : '';
      return `<div class="cal-col ${F.isToday(ds) ? 'today' : ''}" data-date="${ds}" style="height:${(H1 - H0) * ROW}px">${items}${nowLine}</div>`;
    }).join('');
    const label = `${start.getDate()} ${F.monthShort(start.getMonth())} – ${days[n - 1].getDate()} ${F.monthShort(days[n - 1].getMonth())} ${days[n - 1].getFullYear()}`;
    return { label, html: `<div class="card cal" style="--cal-days:${n}"><div class="cal-head"><div></div>${head}</div>
      <div class="cal-body"><div class="cal-hours">${hours}</div>${cols}</div></div>` };
  }

  function monthView() {
    const st = F.store.state;
    const first = new Date(ui.anchor.getFullYear(), ui.anchor.getMonth(), 1);
    const start = F.startOfWeek(first);
    const cells = [...Array(42)].map((_, i) => {
      const d = F.addDays(start, i), ds = F.ymd(d);
      const evs = st.events.filter((e) => e.date === ds).sort((a, b) => a.start.localeCompare(b.start));
      return `<div class="month-cell ${d.getMonth() !== first.getMonth() ? 'out' : ''} ${F.isToday(ds) ? 'today' : ''}" data-date="${ds}">
        <span class="d num">${d.getDate()}</span>
        ${evs.slice(0, 3).map((e) => `<div class="month-ev" data-ev="${e.id}" style="${F.sVars(F.store.color(e.subjectId))}">${e.start} ${F.esc(e.title)}</div>`).join('')}
        ${evs.length > 3 ? `<span class="t-meta">+${evs.length - 3} más</span>` : ''}</div>`;
    }).join('');
    const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="month-dow">${d}</div>`).join('');
    return { label: `${F.cap(F.month(first.getMonth()))} ${first.getFullYear()}`, html: `<div class="card cal"><div class="month">${dows}${cells}</div></div>` };
  }

  F.views.calendario = {
    title: 'Calendario',
    render(el) {
      const v = ui.mode === 'semana' ? weekView() : monthView();
      el.innerHTML = `
        <div class="page-head"><div><h1 class="t-title">Calendario</h1><p class="t-sub">${F.isMobile?.() ? 'Toca' : 'Haz clic en'} un hueco para añadir una clase, examen o bloque de estudio.</p></div>
          <div class="page-actions"><button class="btn btn-primary" data-act="new">${F.icon('plus')}Añadir evento</button></div></div>
        <div class="toolbar">
          <div class="seg"><button class="${ui.mode === 'semana' ? 'on' : ''}" data-mode="semana">Semana</button><button class="${ui.mode === 'mes' ? 'on' : ''}" data-mode="mes">Mes</button></div>
          <button class="btn btn-outline btn-sm" data-act="today">Hoy</button>
          <button class="icon-btn" data-act="prev" aria-label="Anterior">${F.icon('left')}</button>
          <button class="icon-btn" data-act="next" aria-label="Siguiente">${F.icon('right')}</button>
          <span class="t-h3">${v.label}</span>
        </div>${v.html}`;

      const body = el.querySelector('.cal-body');
      if (body) { const nowMin = new Date().getHours() * 60; body.scrollTop = Math.max(0, (nowMin - (H0 + 1) * 60) / 60 * ROW); }

      el.addEventListener('click', (e) => {
        const ev = e.target.closest('[data-ev]');
        if (ev) return F.eventModal(F.store.state.events.find((x) => x.id === ev.dataset.ev));
        const m = e.target.closest('[data-mode]');
        if (m) { ui.mode = m.dataset.mode; return F.rerender(); }
        const a = e.target.closest('[data-act]')?.dataset.act;
        const step = ui.mode === 'semana' ? (F.isMobile?.() ? 3 : 7) : 0;
        if (a === 'today') { ui.anchor = new Date(); F.rerender(); }
        if (a === 'prev') { ui.anchor = step ? F.addDays(ui.anchor, -step) : new Date(ui.anchor.getFullYear(), ui.anchor.getMonth() - 1, 1); F.rerender(); }
        if (a === 'next') { ui.anchor = step ? F.addDays(ui.anchor, step) : new Date(ui.anchor.getFullYear(), ui.anchor.getMonth() + 1, 1); F.rerender(); }
        if (a === 'new') F.eventModal();
        const col = e.target.closest('.cal-col');
        if (col && e.target === col) {
          const y = e.clientY - col.getBoundingClientRect().top;
          const startMin = Math.min(22 * 60, H0 * 60 + Math.floor(y / ROW * 2) * 30);
          F.eventModal(null, { date: col.dataset.date, start: F.hhmm(startMin), end: F.hhmm(startMin + 60) });
        }
        const cell = e.target.closest('.month-cell');
        if (cell && !e.target.closest('[data-ev]')) F.eventModal(null, { date: cell.dataset.date });
      });
    },
  };
})();
