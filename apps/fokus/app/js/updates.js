// FOKUS · Aviso de actualización: preguntar → descargar → verificar → instalar y reiniciar.
(function () {
  const F = window.F;
  const api = window.fokusNative?.updates;
  const state = { dismissed: null, manual: false, el: null, version: null };

  const close = () => { state.el?.remove(); state.el = null; };

  function dialog(html) {
    if (!state.el) {
      state.el = document.createElement('div');
      state.el.className = 'overlay';
      state.el.innerHTML = '<div class="modal upd" role="dialog" aria-modal="true" aria-live="polite"></div>';
      document.body.append(state.el);
    }
    state.el.querySelector('.upd').innerHTML = html;
    return state.el.querySelector('.upd');
  }

  const head = (title, sub) => `<div class="upd-head"><span class="upd-logo">${F.logoMark(44, 'up')}</span>
    <div><h2 class="t-h2" style="margin:0">${title}</h2>${sub ? `<p class="t-sub" style="margin:2px 0 0">${sub}</p>` : ''}</div></div>`;

  function offer({ version, notes }) {
    if (state.dismissed === version && !state.manual) return;
    state.version = version;
    const box = dialog(`${head(`Nueva versión de FOKUS: ${F.esc(version)}`, 'Hay una actualización lista para ti.')}
      ${notes ? `<div class="upd-notes">${F.esc(notes)}</div>` : ''}
      <p class="t-meta upd-safe">${F.icon('shield')}${F.WEB ? 'Tus datos se conservan. La app se recargará ya actualizada.' : 'Solo se instalará si supera la verificación de seguridad. Tus datos se conservan.'}</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-u="later">Más tarde</button>
        <button class="btn btn-primary" data-u="go">${F.icon('download')}Actualizar ahora</button></div>`);
    box.querySelector('[data-u=later]').onclick = () => { state.dismissed = version; close(); };
    box.querySelector('[data-u=go]').onclick = () => { progress(0); api.download(); };
    setTimeout(() => box.querySelector('[data-u=go]')?.focus(), 30);
  }

  function progress(pct) {
    dialog(`${head(`Actualizando a la versión ${F.esc(state.version || '')}`, 'Descargando la actualización…')}
      <div class="bar upd-bar"><i style="width:${pct}%"></i></div><p class="t-meta num" style="margin:8px 0 0">${pct} %</p>`);
  }

  function step(title, sub, icon) {
    dialog(`${head(title, sub)}<div class="upd-step">${F.icon(icon)}</div>`);
  }

  function failed(reason) {
    const sec = reason === 'firma';
    const box = dialog(`${head(sec ? 'Actualización descartada por seguridad' : 'No se pudo actualizar',
      sec ? 'La descarga no ha superado la verificación de autenticidad, así que se ha borrado sin instalarse. Tu versión actual sigue funcionando con normalidad.'
          : 'Revisa tu conexión a internet. Lo volveremos a intentar más tarde.')}
      <div class="modal-actions"><button class="btn btn-primary" data-u="ok">Entendido</button></div>`);
    box.classList.toggle('upd-danger', sec);
    box.querySelector('[data-u=ok]').onclick = close;
  }

  async function install() {
    step('Instalando la actualización', 'Guardando tus datos… FOKUS se cerrará y volverá a abrirse en unos segundos.', 'sparkle');
    F.timer.logPartial();
    await F.store.flush();
    const ok = await api.install();
    if (!ok) failed('red');
  }

  F.checkUpdates = async (manual = false) => {
    if (!api) return { enabled: false };
    state.manual = manual;
    const r = await api.check();
    return r;
  };

  F.initUpdates = () => {
    if (!api) return;
    api.on((ev, data) => {
      if (ev === 'available') offer(data || {});
      if (ev === 'none' && state.manual) { F.toast('Tienes la última versión de FOKUS', { icon: 'check' }); state.manual = false; }
      if (ev === 'progress') { const i = state.el?.querySelector('.upd-bar i'); if (i) { i.style.width = data.percent + '%'; i.parentElement.nextElementSibling.textContent = data.percent + ' %'; } else progress(data.percent); }
      if (ev === 'verifying') step('Comprobando la actualización', 'Verificando que es auténtica y no ha sido modificada…', 'shield');
      if (ev === 'ready') install();
      if (ev === 'verified-dry-run') { step('Actualización verificada', 'Firma correcta (modo de prueba: no se instala).', 'check'); state.el.dataset.result = 'ok'; }
      if (ev === 'error') { if (state.el || state.manual) failed(data?.reason); state.manual = false; }
    });
  };
})();
