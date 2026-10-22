// FOKUS · Archivos: cualquier documento del ordenador, organizado por asignatura.
// Antes de leer nada del ordenador, FOKUS pide permiso (y el proceso principal lo vuelve a comprobar).
(function () {
  const F = window.F;
  const ui = { subject: '', q: '' };
  const KIND = {
    pdf: 'pdf',
    doc: 'doc', docx: 'doc', odt: 'doc', pages: 'doc', rtf: 'doc', txt: 'doc', md: 'doc', epub: 'doc',
    png: 'img', jpg: 'img', jpeg: 'img', webp: 'img', gif: 'img', heic: 'img', svg: 'img', bmp: 'img',
    xls: 'sheet', xlsx: 'sheet', ods: 'sheet', numbers: 'sheet', csv: 'sheet',
    ppt: 'slide', pptx: 'slide', odp: 'slide', key: 'slide',
  };
  const KIND_LABEL = { pdf: 'PDF', doc: 'Documento', img: 'Imagen', sheet: 'Hoja de cálculo', slide: 'Presentación', other: 'Archivo' };
  F.fileKind = (ext) => KIND[ext] || 'other';

  // ---------- Permiso de acceso a archivos ----------
  F.requestFileAccess = () => new Promise((resolve) => {
    const s = F.store.state.settings;
    if (s.fileAccess === 'granted') return resolve(true);
    let answered = false;
    const m = F.modal({
      title: 'Permitir que FOKUS acceda a tus archivos',
      sub: 'Para añadir apuntes, PDFs, presentaciones o cualquier otro documento, FOKUS necesita tu permiso.',
      submit: 'Permitir acceso',
      body: `<div style="display:grid;gap:12px;font-size:14px">
        <div style="display:flex;gap:12px;align-items:flex-start"><span class="perm-ico">${F.icon('check')}</span><span>Solo abre los archivos que <b>tú eliges</b> o arrastras a la ventana. Nunca explora tus carpetas por su cuenta.</span></div>
        <div style="display:flex;gap:12px;align-items:flex-start"><span class="perm-ico">${F.icon('check')}</span><span>Guarda una <b>copia</b> dentro de FOKUS para que no se pierda si mueves o borras el original.</span></div>
        <div style="display:flex;gap:12px;align-items:flex-start"><span class="perm-ico">${F.icon('lock')}</span><span>Todo se queda <b>en este ${F.DEVICE}</b>. No se envía nada a internet.</span></div>
        <p class="t-meta" style="margin:4px 0 0">Puedes retirar el permiso cuando quieras en Ajustes.</p></div>`,
      onSubmit: () => { answered = true; s.fileAccess = 'granted'; F.store.commit(); F.toast('Acceso a archivos permitido', { icon: 'shield' }); resolve(true); },
    });
    m.el.querySelector('[data-act=cancel]').textContent = 'Ahora no';
    new MutationObserver((_, obs) => {
      if (m.el.isConnected) return;
      obs.disconnect();
      if (!answered) { s.fileAccess = 'denied'; F.store.commit(); resolve(false); }
    }).observe(document.body, { childList: true });
  });

  // Añade archivos (rutas arrastradas o, sin rutas, el selector del sistema).
  F.importFiles = async (paths = null) => {
    const native = F.store.native;
    if (!native) return;
    if (!(await F.requestFileAccess())) return;
    const res = paths ? await native.addPaths(paths) : await native.addFiles();
    if (res?.error === 'sin-permiso') { F.toast('FOKUS no tiene permiso para acceder a tus archivos', { icon: 'lock' }); return; }
    const subjectId = ui.subject;
    res.added.forEach((x) => F.store.state.files.push({ ...x, subjectId, addedAt: new Date().toISOString() }));
    if (res.added.length) {
      F.store.commit();
      F.toast(res.added.length === 1 ? `“${res.added[0].name}” añadido` : `${res.added.length} archivos añadidos`, { icon: 'upload' });
      if (paths) F.go('archivos');
    }
    if (res.skipped.length) F.toast(`No se pudo añadir: ${res.skipped.slice(0, 3).join(', ')}${res.skipped.length > 3 ? '…' : ''} (las carpetas no se admiten)`, { icon: 'x', ms: 5000 });
  };

  F.openFile = async (id) => {
    const f = F.store.state.files.find((x) => x.id === id);
    if (!f || !F.store.native) return;
    const err = await F.store.native.openFile(f.stored);
    if (err === 'peligroso') F.toast('Por seguridad, FOKUS no ejecuta programas. Te mostramos el archivo en su carpeta.', { icon: 'shield', ms: 6000 });
    else if (err) F.toast('No se ha podido abrir el archivo', { icon: 'x' });
  };

  F.views.archivos = {
    title: 'Archivos',
    filterBy(id) { ui.subject = id; },
    render(el) {
      const native = F.store.native;
      const access = F.store.state.settings.fileAccess;
      const q = ui.q.toLowerCase();
      const files = F.store.state.files
        .filter((f) => (!ui.subject || f.subjectId === ui.subject) && (!q || f.name.toLowerCase().includes(q)))
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      const subj = F.store.subject(ui.subject);

      el.innerHTML = `
        <div class="page-head"><div><h1 class="t-title">${subj ? `Archivos de ${F.esc(subj.name)}` : 'Archivos'}</h1>
          <p class="t-sub">Cualquier documento de tu ${F.DEVICE}: ${F.WEB ? 'elígelo y quedará guardado en FOKUS' : 'elígelo o arrástralo a la ventana'}.</p></div>
          <div class="page-actions"><button class="btn btn-primary" data-act="add" ${native ? '' : 'disabled'}>${F.icon('upload')}Añadir documentos</button></div></div>
        ${native && access === 'denied' ? `<div class="card perm-banner">${F.icon('lock')}<div><b>El acceso a tus archivos está desactivado</b>
          <span class="t-meta">Tus archivos ya guardados se pueden seguir abriendo. Para añadir nuevos, FOKUS necesita permiso.</span></div>
          <button class="btn btn-soft btn-sm" data-act="grant">Permitir acceso</button></div>` : ''}
        <div class="toolbar">
          <select class="select" data-act="subject" aria-label="Asignatura"><option value="">Todas las asignaturas</option>${F.subjectOptions(ui.subject, false)}</select>
          <div class="search" style="width:280px">${F.icon('search')}<input class="input" data-act="q" placeholder="Buscar por nombre" value="${F.esc(ui.q)}"></div>
        </div>
        <div class="card files">
          ${files.length ? `<div class="file-row head"><span></span><span>Nombre</span><span>Asignatura</span><span>Tamaño</span><span>Añadido</span><span></span></div>
            ${files.map((f) => { const k = F.fileKind(f.ext); return `
            <div class="file-row" data-id="${f.id}">
              <span class="file-ico ${k}" title="${KIND_LABEL[k]}">${F.esc((f.ext || '?').toUpperCase().slice(0, 4))}</span>
              <span class="file-name" data-act="open" title="Abrir">${F.esc(f.name)}</span>
              <select class="select" data-act="assign" style="height:34px;font-size:13px">${F.subjectOptions(f.subjectId)}</select>
              <span class="t-meta num">${F.size(f.size)}</span>
              <span class="t-meta">${F.relDate(f.addedAt.slice(0, 10))}</span>
              <span class="actions">
                <button class="icon-btn" data-act="reveal" title="Mostrar en carpeta">${F.icon('folder')}</button>
                <button class="icon-btn danger" data-act="del" title="Eliminar">${F.icon('trash')}</button></span>
            </div>`; }).join('')}` : `
            <div class="empty"><span class="empty-ico">${F.icon('folder')}</span>
              <strong>${q || ui.subject ? 'No hay archivos que coincidan' : 'Todo tu material, en un solo sitio'}</strong>
              <p>${native ? 'Añade PDFs, apuntes, presentaciones, fotos de la pizarra o cualquier otro documento, y asígnalos a cada asignatura.' : 'La gestión de archivos solo está disponible en la app de escritorio de FOKUS.'}</p>
              ${native ? `<button class="btn btn-soft btn-sm" data-act="add">${F.icon('upload')}Elegir documentos</button>` : ''}</div>`}
        </div>
        ${native && !F.WEB ? `<div class="drop-hint">${F.icon('upload')} También puedes arrastrar archivos desde el Explorador a cualquier parte de la ventana.</div>` : ''}`;

      el.querySelector('[data-act=subject]').onchange = (e) => { ui.subject = e.target.value; F.rerender(); };
      const qi = el.querySelector('[data-act=q]');
      qi.oninput = () => { ui.q = qi.value; clearTimeout(qi._t); qi._t = setTimeout(() => { F.rerender(); const n = F.$('[data-act=q]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 180); };
      el.addEventListener('change', (e) => {
        if (e.target.dataset.act === 'assign') F.store.update('files', e.target.closest('[data-id]').dataset.id, { subjectId: e.target.value });
      });
      el.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-act]')?.dataset.act;
        const id = e.target.closest('[data-id]')?.dataset.id;
        const f = id && F.store.state.files.find((x) => x.id === id);
        if (a === 'add') F.importFiles();
        if (a === 'grant') { F.store.state.settings.fileAccess = null; F.requestFileAccess(); }
        if (a === 'open' && f) F.openFile(f.id);
        if (a === 'reveal' && f) native?.revealFile(f.stored);
        if (a === 'del' && f) {
          const ok = await F.confirm(`¿Eliminar “${f.name}”?`, 'Se borrará la copia guardada en FOKUS. El archivo original (si aún existe) no se toca.');
          if (ok) { await native.removeFile(f.stored); F.store.remove('files', f.id); F.toast('Archivo eliminado', { icon: 'trash' }); }
        }
      });
    },
  };
})();
