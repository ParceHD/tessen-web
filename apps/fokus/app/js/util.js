// FOKUS · Utilidades: fechas en español, DOM, modales y avisos.
(function () {
  const F = window.F;

  // Plataforma: app de escritorio (Electron) o app web instalada en el móvil.
  F.WEB = !!window.fokusNative?.web;
  F.DEVICE = F.WEB ? 'dispositivo' : 'ordenador';
  F.uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  F.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  F.$ = (sel, root = document) => root.querySelector(sel);
  F.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---------- Fechas (siempre en hora local) ----------
  const pad = (n) => String(n).padStart(2, '0');
  F.ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  F.parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  F.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  F.startOfWeek = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; return F.addDays(x, -wd); };
  F.toMin = (hhmm) => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + m; };
  F.hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  F.isToday = (s) => s === F.ymd();

  const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DOW_S = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MON_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  F.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  F.dow = (d) => DOW[d.getDay()];
  F.dowShort = (d) => DOW_S[d.getDay()];
  F.month = (i) => MON[i];
  F.monthShort = (i) => MON_S[i];
  F.longDate = (d = new Date()) => `${F.cap(DOW[d.getDay()])}, ${d.getDate()} de ${MON[d.getMonth()]}`;
  F.shortDate = (s) => { const d = F.parseYmd(s); return `${d.getDate()} ${MON_S[d.getMonth()]}`; };
  F.relDate = (s) => {
    if (!s) return '';
    const diff = Math.round((F.parseYmd(s) - F.parseYmd(F.ymd())) / 864e5);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff === -1) return 'Ayer';
    if (diff > 1 && diff < 7) return F.cap(DOW[F.parseYmd(s).getDay()]);
    return F.shortDate(s);
  };
  F.dur = (min) => {
    min = Math.round(min);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  };
  F.plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  F.size = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
  F.greeting = () => { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'; };

  // Estilo de asignatura como variables CSS (--sbg, --sink, --sdot)
  F.sVars = (color) => { const c = color || 'lavanda'; return `--sbg:var(--s-${c}-bg);--sink:var(--s-${c}-ink);--sdot:var(--s-${c}-dot)`; };
  F.PALETTE = ['lavanda', 'melocoton', 'menta', 'cielo', 'rosa', 'mantequilla', 'salvia', 'lila'];
  F.PALETTE_NAMES = { lavanda: 'Lavanda', melocoton: 'Melocotón', menta: 'Menta', cielo: 'Cielo', rosa: 'Rosa', mantequilla: 'Mantequilla', salvia: 'Salvia', lila: 'Lila' };

  // ---------- Avisos ----------
  F.toast = (msg, opts = {}) => {
    let host = F.$('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; document.body.append(host); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${F.icon(opts.icon || 'check')}<span>${F.esc(msg)}</span>${opts.action ? `<button>${F.esc(opts.action)}</button>` : ''}`;
    if (opts.action) t.querySelector('button').onclick = () => { opts.onAction?.(); t.remove(); };
    host.append(t);
    setTimeout(() => t.remove(), opts.ms || 3200);
  };

  // ---------- Modal ----------
  // F.modal({ title, sub, body (html), submit, danger, onSubmit(formData, el) -> false para no cerrar, onMount(el) })
  F.modal = (o) => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h2 class="t-h2">${F.esc(o.title)}</h2>${o.sub ? `<p class="t-sub">${F.esc(o.sub)}</p>` : '<div style="height:16px"></div>'}
      <form novalidate>${o.body || ''}
        <div class="modal-actions">
          ${o.danger ? `<button type="button" class="btn btn-danger" data-act="danger">${F.icon('trash')}${F.esc(o.danger)}</button><span class="spacer"></span>` : ''}
          <button type="button" class="btn btn-ghost" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${F.esc(o.submit || 'Guardar')}</button>
        </div></form></div>`;
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    const form = ov.querySelector('form');
    form.querySelector('[data-act=cancel]').onclick = close;
    const dz = form.querySelector('[data-act=danger]');
    if (dz) dz.onclick = () => { o.onDanger?.(); close(); };
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (o.onSubmit?.(data, ov) !== false) close();
    };
    document.body.append(ov);
    o.onMount?.(ov);
    setTimeout(() => form.querySelector('input:not([type=hidden]),select,textarea')?.focus(), 30);
    return { close, el: ov };
  };

  F.confirm = (title, sub, label = 'Eliminar') =>
    new Promise((res) => {
      let ok = false;
      const m = F.modal({ title, sub, submit: label, onSubmit: () => { ok = true; } });
      const btn = m.el.querySelector('[type=submit]');
      btn.classList.replace('btn-primary', 'btn-danger');
      new MutationObserver((_, obs) => { if (!m.el.isConnected) { obs.disconnect(); res(ok); } }).observe(document.body, { childList: true });
    });

  // Selector de color de asignatura reutilizable
  F.colorPicker = (name, value) => `<div class="color-pick" role="radiogroup">${F.PALETTE.map((c) =>
    `<button type="button" style="${F.sVars(c)}" class="${c === value ? 'on' : ''}" data-color="${c}" title="${F.PALETTE_NAMES[c]}" aria-label="${F.PALETTE_NAMES[c]}"></button>`).join('')}
    <input type="hidden" name="${name}" value="${value}"></div>`;
  F.bindColorPicker = (root) => F.$$('.color-pick', root).forEach((cp) => cp.addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]'); if (!b) return;
    F.$$('[data-color]', cp).forEach((x) => x.classList.toggle('on', x === b));
    cp.querySelector('input').value = b.dataset.color;
  }));

  F.subjectOptions = (selected, withNone = true) =>
    (withNone ? `<option value="">Sin asignatura</option>` : '') +
    F.store.state.subjects.map((s) => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${F.esc(s.name)}</option>`).join('');
})();
