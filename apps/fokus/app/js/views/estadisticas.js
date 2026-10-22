// FOKUS · Estadísticas (solo datos reales registrados por el temporizador y las tareas)
(function () {
  const F = window.F;

  F.views.estadisticas = {
    title: 'Estadísticas',
    render(el) {
      const st = F.store.state;
      const today = new Date();
      const days = [...Array(7)].map((_, i) => F.addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), i - 6));
      const perDay = days.map((d) => F.store.minutesBetween(d.toISOString(), F.addDays(d, 1).toISOString()));
      const total7 = perDay.reduce((a, b) => a + b, 0);
      const max = Math.max(60, ...perDay);
      const focusSessions = st.sessions.filter((s) => s.kind === 'focus');
      const doneWeek = st.tasks.filter((t) => t.done && t.doneAt && t.doneAt >= days[0].toISOString()).length;

      // Racha: días consecutivos (hasta hoy o ayer) con al menos una sesión
      const daySet = new Set(focusSessions.map((s) => F.ymd(new Date(s.start))));
      let streak = 0, cur = new Date(today);
      if (!daySet.has(F.ymd(cur))) cur = F.addDays(cur, -1);
      while (daySet.has(F.ymd(cur))) { streak++; cur = F.addDays(cur, -1); }

      const bySubject = {};
      focusSessions.filter((s) => s.start >= days[0].toISOString()).forEach((s) => { bySubject[s.subjectId || ''] = (bySubject[s.subjectId || ''] || 0) + s.minutes; });
      const subjRows = Object.entries(bySubject).sort((a, b) => b[1] - a[1]);
      const subjMax = Math.max(1, ...subjRows.map((r) => r[1]));

      const hasData = focusSessions.length > 0;
      el.innerHTML = `
        <div class="page-head"><div><h1 class="t-title">Estadísticas</h1><p class="t-sub">Tu tiempo de enfoque real, registrado con el temporizador.</p></div></div>
        <section class="stats-grid">
          <div class="card stat"><span class="t-eyebrow">Últimos 7 días</span><b class="num">${F.dur(total7)}</b></div>
          <div class="card stat"><span class="t-eyebrow">Media diaria</span><b class="num">${F.dur(total7 / 7)}</b></div>
          <div class="card stat"><span class="t-eyebrow">Racha</span><b class="num">${streak} ${streak === 1 ? 'día' : 'días'}</b></div>
          <div class="card stat"><span class="t-eyebrow">Tareas hechas · 7 días</span><b class="num">${doneWeek}</b></div>
        </section>
        ${hasData ? `<section class="chart-row">
          <div class="card"><div class="card-head"><h2 class="t-h3">Minutos de enfoque por día</h2><span class="t-meta">Pasa el ratón por una barra</span></div>
            <div class="bars" role="img" aria-label="Minutos de enfoque de los últimos 7 días">
              ${perDay.map((m, i) => { const h = (m / max) * 100; return `<div class="col ${i === 6 ? 'today' : ''}" style="--h:${h}%" title="${F.cap(F.dow(days[i]))}: ${F.dur(m)}">
                <span class="val num">${F.dur(m)}</span><i style="height:${h}%"></i></div>`; }).join('')}
            </div>
            <div class="bars-x">${days.map((d, i) => `<span>${i === 6 ? 'Hoy' : F.dowShort(d)}</span>`).join('')}</div>
            <table class="sr-only"><caption>Minutos por día</caption>${days.map((d, i) => `<tr><th>${F.ymd(d)}</th><td>${perDay[i]}</td></tr>`).join('')}</table>
          </div>
          <div class="card"><div class="card-head"><h2 class="t-h3">Por asignatura · 7 días</h2></div>
            ${subjRows.length ? subjRows.map(([id, m]) => { const s = F.store.subject(id); return `<div class="hbar" style="${F.sVars(s?.color)}">
              <span class="name">${s ? '<span class="dot"></span>' : ''}${F.esc(s?.name || 'Estudio libre')}</span>
              <span class="track"><i style="width:${(m / subjMax) * 100}%"></i></span><span class="v">${F.dur(m)}</span></div>`; }).join('') : '<p class="t-meta">Sin sesiones esta semana.</p>'}
          </div>
        </section>` : `
        <div class="card"><div class="empty"><span class="empty-ico">${F.icon('chart')}</span><strong>Aún no hay sesiones registradas</strong>
          <p>Cada bloque que completes con el temporizador aparecerá aquí. Empieza con 25 minutos.</p>
          <button class="btn btn-primary" data-go="concentracion">${F.icon('play')}Empezar sesión</button></div></div>`}`;
    },
  };
})();
