// FOKUS · Capa web (iPhone / Android).
// Implementa el mismo puente que la app de escritorio (window.fokusNative) con tecnología del navegador:
// datos y archivos en IndexedDB del dispositivo, notificaciones con el service worker,
// actualizaciones con el service worker y pantalla encendida durante el enfoque (Wake Lock).
// Nada sale del dispositivo: no hay servidores ni cuentas.
(function () {
  'use strict';
  const VERSION = '1.0.0';
  const MAX_FILE = 100 * 1024 * 1024;   // 100 MB por archivo
  const MAX_DATA = 25 * 1024 * 1024;

  // ---------- IndexedDB ----------
  let dbp = null;
  const db = () => (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('fokus', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode); const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };
  const kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k));
  const kvSet = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
  const fileGet = (k) => tx('files', 'readonly', (s) => s.get(k));
  const fileSet = (k, v) => tx('files', 'readwrite', (s) => s.put(v, k));
  const fileDel = (k) => tx('files', 'readwrite', (s) => s.delete(k));

  // ---------- Utilidades ----------
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const extOf = (name) => (String(name).split('.').length > 1 ? String(name).split('.').pop() : '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const STORED_RE = /^[0-9a-f-]{36}(\.[a-z0-9_-]{1,16})?$/i;
  const settings = () => window.F?.store?.state?.settings || {};
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function pick({ accept = '', multiple = false } = {}) {
    return new Promise((resolve) => {
      const i = document.createElement('input');
      i.type = 'file'; i.accept = accept; i.multiple = multiple; i.style.display = 'none';
      i.onchange = () => { resolve([...(i.files || [])]); i.remove(); };
      // Si se cancela no llega evento en todos los navegadores: se resuelve vacío al volver el foco.
      window.addEventListener('focus', () => setTimeout(() => { if (!i.files?.length) { resolve([]); i.remove(); } }, 800), { once: true });
      document.body.append(i); i.click();
    });
  }

  async function saveBlob(blob, name) {
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      try { await navigator.share({ files: [file], title: name }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    return true;
  }

  async function storeFiles(list) {
    const added = [], skipped = [];
    for (const f of list.slice(0, 100)) {
      if (!(f instanceof File) || f.size > MAX_FILE) { skipped.push(f?.name || 'archivo'); continue; }
      try {
        const id = uuid(), ext = extOf(f.name), stored = ext ? `${id}.${ext}` : id;
        await fileSet(stored, f);
        added.push({ id, name: f.name.slice(0, 200), stored, size: f.size, ext });
      } catch { skipped.push(f.name); }
    }
    return { added, skipped };
  }

  // Archivos soltados en la ventana: el puente de escritorio usa rutas; aquí, fichas temporales.
  const dropped = new Map();

  // ---------- Temporizador ----------
  let dueCb = null, dueT = null;

  // ---------- Actualizaciones (service worker) ----------
  let reg = null, updCb = null, waitingSeen = false;
  const emit = (ev, data) => updCb?.(ev, data);
  async function announce() {
    if (waitingSeen || !reg?.waiting) return;
    waitingSeen = true;
    let info = { version: 'nueva', notes: '' };
    try { const r = await fetch('version.json', { cache: 'no-store' }); if (r.ok) { const v = await r.json(); info = { version: String(v.version || 'nueva').slice(0, 32), notes: String(v.notes || '').slice(0, 1000) }; } } catch {}
    emit('available', info);
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
        if (reg.waiting && navigator.serviceWorker.controller) announce();
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) announce(); });
        });
        // Comprobar al volver a la app y cada 6 horas
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
        setInterval(() => reg.update().catch(() => {}), 6 * 3600e3);
      } catch { /* sin service worker: la app funciona igual, pero sin modo sin conexión */ }
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  }

  // ---------- Tema: color de la barra del sistema ----------
  function themeColor(dark) {
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.append(m); }
    m.content = dark ? '#121119' : '#F7F7F4';
  }

  const initialTheme = (() => {
    try { const t = localStorage.getItem('fokus-theme'); if (t === 'dark' || t === 'light') return t; } catch {}
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })();
  themeColor(initialTheme === 'dark');

  window.fokusNative = {
    web: true,
    platform: 'web',
    initialTheme,
    load: async () => { try { return (await kvGet('data')) ?? null; } catch { return null; } },
    save: async (data) => {
      if (!data || typeof data !== 'object') throw new Error('Datos no válidos');
      if (JSON.stringify(data).length > MAX_DATA) throw new Error('Datos demasiado grandes');
      await kvSet('data', data);
      return true;
    },
    exportData: async (data) => saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `fokus-copia-${new Date().toISOString().slice(0, 10)}.json`),
    importData: async () => {
      const [f] = await pick({ accept: '.json,application/json' });
      if (!f) return null;
      if (f.size > MAX_DATA) throw new Error('Archivo no válido');
      return JSON.parse(await f.text()); // la interfaz lo sanea antes de usarlo
    },
    addFiles: async () => {
      if (settings().fileAccess !== 'granted') return { error: 'sin-permiso' };
      return storeFiles(await pick({ multiple: true }));
    },
    addPaths: async (tokens) => {
      if (settings().fileAccess !== 'granted') return { error: 'sin-permiso' };
      const files = (Array.isArray(tokens) ? tokens : []).map((t) => dropped.get(t)).filter(Boolean);
      tokens?.forEach?.((t) => dropped.delete(t));
      return storeFiles(files);
    },
    pathForFile: (file) => { const t = 'drop:' + uuid(); dropped.set(t, file); return t; },
    openFile: async (stored) => {
      if (typeof stored !== 'string' || !STORED_RE.test(stored)) return 'Ruta no válida';
      const blob = await fileGet(stored); if (!blob) return 'No encontrado';
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'noopener');
      if (!w) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove(); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return '';
    },
    // En el móvil "mostrar en carpeta" = compartir/guardar el archivo
    revealFile: async (stored) => {
      if (typeof stored !== 'string' || !STORED_RE.test(stored)) return;
      const f = window.F?.store?.state?.files?.find((x) => x.stored === stored);
      const blob = await fileGet(stored); if (blob) saveBlob(blob, f?.name || stored);
    },
    removeFile: async (stored) => { if (typeof stored === 'string' && STORED_RE.test(stored)) await fileDel(stored); return true; },
    notify: async (title, body) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try { const r = await navigator.serviceWorker?.ready; await r?.showNotification(String(title).slice(0, 120), { body: String(body || '').slice(0, 300), icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'fokus' }); }
      catch { try { new Notification(title, { body }); } catch {} }
    },
    setTheme: (pref) => {
      const dark = pref === 'dark' || (pref !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      themeColor(dark);
      try { localStorage.setItem('fokus-theme', dark ? 'dark' : 'light'); } catch {}
    },
    scheduleTimer: (endsAt) => {
      clearTimeout(dueT); dueT = null;
      const ms = Number(endsAt) - Date.now();
      if (Number.isFinite(ms) && ms > 0 && ms < 24 * 3600e3) dueT = setTimeout(() => dueCb?.(), ms + 50);
    },
    onTimerDue: (cb) => { dueCb = cb; },
    version: async () => VERSION,
    updates: {
      status: async () => ({ enabled: 'serviceWorker' in navigator, version: VERSION, web: true }),
      check: async () => {
        if (!reg) return { enabled: false };
        try { await reg.update(); } catch {}
        setTimeout(() => { if (reg.waiting) announce(); else emit('none'); }, 2500);
        return { enabled: true };
      },
      download: async () => { emit('ready', {}); return true; }, // el service worker ya la tiene descargada
      install: async () => { if (!reg?.waiting) return false; reg.waiting.postMessage('skipWaiting'); return true; },
      on: (cb) => { updCb = cb; },
    },
  };

  // ---------- Integración con la app una vez arrancada ----------
  window.addEventListener('load', () => {
    const ready = setInterval(() => {
      const F = window.F;
      if (!F?.timer || !F?.store || !document.querySelector('[data-install-tip]')) return;
      clearInterval(ready);

      // Pantalla encendida mientras el temporizador está en marcha (así el aviso suena también en iPhone).
      let lock = null;
      const syncLock = async () => {
        const want = F.timer.running && !document.hidden;
        if (want && !lock && 'wakeLock' in navigator) { try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch {} }
        if (!want && lock) { try { await lock.release(); } catch {} lock = null; }
      };
      F.timer.on(syncLock);
      document.addEventListener('visibilitychange', syncLock);

      // Permiso de notificaciones: se pide al empezar el primer bloque (requiere un toque del usuario).
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.play-btn, [data-cta-btn], .kpi-focus')) return;
        if ('Notification' in window && Notification.permission === 'default' && settings().notifications !== false) Notification.requestPermission().catch(() => {});
      }, true);

      // Pedir almacenamiento persistente (evita que el navegador borre los datos por falta de espacio).
      navigator.storage?.persist?.().catch(() => {});

      // Consejo para instalar la app
      const tip = document.querySelector('[data-install-tip]');
      let deferred = null;
      const dismissed = () => { try { return localStorage.getItem('fokus-install-tip') === 'no'; } catch { return false; } };
      const show = (html) => {
        if (standalone() || dismissed()) return;
        tip.innerHTML = html + `<button class="icon-btn x" aria-label="Cerrar">${F.icon('x')}</button>`;
        tip.classList.add('show');
        tip.querySelector('.x').onclick = () => { tip.classList.remove('show'); try { localStorage.setItem('fokus-install-tip', 'no'); } catch {} };
        const b = tip.querySelector('[data-install]');
        if (b) b.onclick = async () => { deferred?.prompt(); const r = await deferred?.userChoice; if (r?.outcome === 'accepted') tip.classList.remove('show'); };
      };
      const shareIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;display:inline;vertical-align:-3px"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M6.5 11H5.5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-1"/></svg>';
      if (isIOS()) show(`${F.icon('download')}<span><b>Instala FOKUS</b><br>Pulsa ${shareIco} <b>Compartir</b> y luego «Añadir a pantalla de inicio». Así tus datos quedan a salvo.</span>`);
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferred = e;
        show(`${F.icon('download')}<span><b>Instala FOKUS</b> en tu móvil: se abre como una app y funciona sin conexión.</span><button class="btn btn-primary btn-sm" data-install>Instalar</button>`);
      });
      window.addEventListener('appinstalled', () => tip.classList.remove('show'));
    }, 100);
  });
})();
