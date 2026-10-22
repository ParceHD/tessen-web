// FOKUS · service worker (generado por scripts/build-pwa.js — no editar a mano)
// Guarda la app para usarla sin conexión. Cada versión usa su propia caché; la nueva espera a que el usuario
// pulse "Actualizar" (mensaje 'skipWaiting') para no cambiar la app mientras se está usando.
const CACHE = 'fokus-1.0.0-7049042add';
const ASSETS = ["./","assets/tessen-icon.png","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","js/app.js","js/icons.js","js/pwa-native.js","js/store.js","js/theme-boot.js","js/timer.js","js/updates.js","js/util.js","js/views/ajustes.js","js/views/archivos.js","js/views/asignaturas.js","js/views/calendario.js","js/views/concentracion.js","js/views/estadisticas.js","js/views/inicio.js","js/views/tareas.js","manifest.webmanifest","styles/components.css","styles/mobile.css","styles/tokens.css","styles/views.css","vendor/fonts/fraunces-latin-wght-italic.woff2","vendor/fonts/fraunces-latin-wght-normal.woff2","vendor/fonts/inter-latin-ext-wght-normal.woff2","vendor/fonts/inter-latin-wght-normal.woff2"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('fokus-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location).pathname)) return;
  if (url.pathname.endsWith('/version.json')) return; // siempre de la red: sirve para detectar versiones nuevas
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') return (await cache.match('./')) || fetch(req);
    return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all[0]) return all[0].focus();
    return self.clients.openWindow('./');
  })());
});
