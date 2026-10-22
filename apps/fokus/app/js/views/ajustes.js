// FOKUS · Ajustes: perfil, temporizador, notificaciones y copias de seguridad.
(function () {
  const F = window.F;

  F.views.ajustes = {
    title: 'Ajustes',
    render(el) {
      const st = F.store.state, s = st.settings, native = F.store.native;
      const num = (key, min, max, label, hint) => `<div class="set-row"><div><b>${label}</b><span class="t-meta">${hint}</span></div>
        <input class="input num" type="number" min="${min}" max="${max}" data-num="${key}" value="${s[key]}"></div>`;
      const sw = (key, label, hint) => `<div class="set-row"><div><b>${label}</b><span class="t-meta">${hint}</span></div>
        <button class="switch ${s[key] ? 'on' : ''}" data-sw="${key}" aria-pressed="${!!s[key]}" aria-label="${label}"></button></div>`;

      el.innerHTML = `
        <div class="page-head"><div><h1 class="t-title">Ajustes</h1><p class="t-sub">Todo se guarda en este ${F.DEVICE}. Sin cuentas, sin anuncios.</p></div></div>
        <div class="settings">
          <div class="card"><h2 class="t-h3" style="margin:0 0 4px">Perfil</h2>
            <div class="set-row"><div><b>Tu nombre</b><span class="t-meta">Para saludarte en Inicio.</span></div>
              <input class="input" style="width:220px;text-align:left" data-name maxlength="30" value="${F.esc(st.profile.name)}"></div></div>
          <div class="card"><h2 class="t-h3" style="margin:0 0 4px">Apariencia</h2>
            <div class="set-row"><div><b>Tema</b><span class="t-meta">“Sistema” sigue el modo claro u oscuro de Windows.</span></div>
              <div class="seg" role="radiogroup" aria-label="Tema" style="flex:none">${[['light', 'Día', 'sun'], ['dark', 'Noche', 'moon'], ['system', 'Sistema', 'settings']].map(([v, l, i]) =>
                `<button class="${(s.theme || 'system') === v ? 'on' : ''}" data-theme-opt="${v}" role="radio" aria-checked="${(s.theme || 'system') === v}">${F.icon(i).replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-3px;margin-right:6px"')}${l}</button>`).join('')}</div></div>
            ${native && !F.WEB ? `<div class="set-row"><div><b>Modo ahorro de energía</b><span class="t-meta">Dibuja la app sin usar la tarjeta gráfica: gasta menos memoria y batería. Se aplica la próxima vez que abras FOKUS.</span></div>
              <button class="switch ${s.lowPower !== false ? 'on' : ''}" data-act="low-power" aria-pressed="${s.lowPower !== false}" aria-label="Modo ahorro de energía"></button></div>` : ''}</div>
          ${native ? `<div class="card"><h2 class="t-h3" style="margin:0 0 4px">Privacidad</h2>
            <div class="set-row"><div><b>Acceso a tus archivos</b><span class="t-meta">${s.fileAccess === 'granted'
              ? 'Permitido. FOKUS solo abre los documentos que eliges o arrastras, y guarda una copia aquí.'
              : 'Desactivado. Los archivos ya guardados se siguen pudiendo abrir.'}</span></div>
              <button class="switch ${s.fileAccess === 'granted' ? 'on' : ''}" data-act="file-access" aria-pressed="${s.fileAccess === 'granted'}" aria-label="Acceso a tus archivos"></button></div></div>` : ''}
          <div class="card"><h2 class="t-h3" style="margin:0 0 4px">Temporizador Pomodoro</h2>
            ${num('focus', 1, 180, 'Bloque de enfoque', 'Minutos de cada bloque.')}
            ${num('short', 1, 60, 'Descanso corto', 'Minutos entre bloques.')}
            ${num('long', 1, 90, 'Descanso largo', 'Minutos tras varios bloques seguidos.')}
            ${num('cyclesBeforeLong', 2, 8, 'Bloques antes del descanso largo', 'Normalmente 4.')}
            ${sw('autoStartBreaks', 'Empezar descansos automáticamente', 'Al terminar un bloque, el descanso arranca solo.')}</div>
          <div class="card"><h2 class="t-h3" style="margin:0 0 4px">Avisos</h2>
            ${sw('notifications', 'Notificaciones', 'Fin de bloque, fin de descanso y recordatorios.')}
            ${sw('silent', 'Modo silencio durante el enfoque', 'Los recordatorios esperan a que termines el bloque.')}</div>
          <div class="card"><h2 class="t-h3" style="margin:0 0 4px">Tus datos</h2>
            <div class="set-row"><div><b>Copia de seguridad</b><span class="t-meta">Exporta o importa todo (tareas, calendario, asignaturas, sesiones).</span></div>
              <button class="btn btn-outline btn-sm" data-act="export" ${native ? '' : 'disabled'}>${F.icon('download')}Exportar</button>
              <button class="btn btn-outline btn-sm" data-act="import" ${native ? '' : 'disabled'}>${F.icon('upload')}Importar</button></div>
            <div class="set-row"><div><b>Datos de ejemplo</b><span class="t-meta">Rellena la app con asignaturas, tareas y sesiones de muestra. Sustituye tus datos actuales.</span></div>
              <button class="btn btn-outline btn-sm" data-act="demo">${F.icon('sparkle')}Cargar ejemplo</button></div>
            <div class="set-row"><div><b>Empezar de cero</b><span class="t-meta">Borra todos los datos de FOKUS.</span></div>
              <button class="btn btn-danger btn-sm" data-act="wipe">${F.icon('trash')}Borrar todo</button></div></div>
          ${native ? `<div class="card"><h2 class="t-h3" style="margin:0 0 4px">Actualizaciones</h2>
            <div class="set-row"><div><b>Versión ${F.esc(F.VERSION)}</b><span class="t-meta" data-upd-status>${F.WEB ? 'FOKUS se actualiza desde tessenconsulting.com y te avisa cuando hay una versión nueva.' : 'FOKUS comprueba si hay versiones nuevas y te pregunta antes de instalarlas. Cada actualización se verifica con firma digital.'}</span></div>
              <button class="btn btn-outline btn-sm" data-act="check-updates">${F.icon('reset')}Buscar actualizaciones</button></div></div>` : ''}
          <div class="card about-card">
            <div class="about-brand">${F.logoMark(44, 'ab')}<div><b>FOKUS</b><span class="t-meta">Study Beautifully · versión ${F.esc(F.VERSION)}</span></div></div>
            <a class="tessen-credit" href="https://tessenconsulting.com" target="_blank" rel="noopener noreferrer">
              <span class="tessen-tile"><img src="assets/tessen-icon.png" alt=""></span>
              <span><span class="t-meta">Diseñada y desarrollada por</span><b>TESSEN</b></span>${F.icon('open')}</a>
          </div>
          <p class="t-meta" style="text-align:center">© ${new Date().getFullYear()} TESSEN · <a href="https://tessenconsulting.com/apps/fokus/" target="_blank" rel="noopener noreferrer">tessenconsulting.com/apps/fokus</a></p>
        </div>`;

      el.addEventListener('change', (e) => {
        const k = e.target.dataset.num;
        if (k) {
          s[k] = Math.max(Number(e.target.min), Math.min(Number(e.target.max), Math.round(Number(e.target.value)) || Number(e.target.min)));
          F.store.commit();
          if (!F.timer.running) F.timer.setPhase(F.timer.phase);
        }
        if (e.target.dataset.name !== undefined) { st.profile.name = e.target.value.trim(); F.store.commit(); F.toast('Nombre actualizado'); }
      });
      el.addEventListener('click', async (e) => {
        const k = e.target.closest('[data-sw]')?.dataset.sw;
        if (k) { s[k] = !s[k]; if (k === 'notifications' && s[k] && !native && 'Notification' in window) Notification.requestPermission(); F.store.commit(); }
        const th = e.target.closest("[data-theme-opt]")?.dataset.themeOpt;
        if (th) F.setTheme(th);
        const a = e.target.closest('[data-act]')?.dataset.act;
        if (a === 'check-updates') {
          const st = await native.updates.status();
          if (!st.enabled) F.toast(st.reason === 'sin-servidor' ? 'Las actualizaciones se activarán cuando haya un servidor de descargas configurado' : 'Las actualizaciones solo funcionan en la app instalada', { icon: 'bell', ms: 5000 });
          else { F.toast('Buscando actualizaciones…', { icon: 'reset' }); F.checkUpdates(true); }
        }
        if (a === 'low-power') { s.lowPower = s.lowPower === false; F.store.commit(); F.toast('Se aplicará la próxima vez que abras FOKUS', { icon: 'sparkle' }); }
        if (a === 'file-access') {
          if (s.fileAccess === 'granted') { s.fileAccess = 'denied'; F.store.commit(); F.toast('FOKUS ya no podrá leer archivos nuevos de tu ${F.DEVICE}', { icon: 'lock' }); }
          else { s.fileAccess = null; await F.requestFileAccess(); }
        }
        if (a === 'export') { await F.store.flush(); if (await native.exportData(F.store.state)) F.toast('Copia exportada', { icon: 'download' }); }
        if (a === 'import') {
          try {
            const data = await native.importData(); if (!data) return;
            if (await F.confirm('¿Importar esta copia?', 'Sustituirá todos los datos actuales de FOKUS.', 'Importar')) { F.store.replace(data); F.toast('Copia importada'); }
          } catch { F.toast('Ese archivo no es una copia válida de FOKUS', { icon: 'x' }); }
        }
        if (a === 'demo' && await F.confirm('¿Cargar datos de ejemplo?', 'Se sustituirán tus asignaturas, tareas, eventos y sesiones actuales.', 'Cargar ejemplo')) { F.store.loadDemo(); F.toast('Datos de ejemplo cargados', { icon: 'sparkle' }); }
        if (a === 'wipe' && await F.confirm('¿Borrar todos los datos?', 'No se puede deshacer. Exporta una copia antes si la necesitas.', 'Borrar todo')) {
          if (native) for (const f of F.store.state.files) await native.removeFile(f.stored);
          // Se conservan el perfil, el tema y el permiso de archivos: solo se borra el contenido.
          F.store.replace({ profile: st.profile, settings: { theme: s.theme, fileAccess: s.fileAccess } });
          F.toast('Datos borrados', { icon: 'trash' });
        }
      });
    },
  };
})();
