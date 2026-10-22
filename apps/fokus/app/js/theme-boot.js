// Se carga en <head> antes de pintar: aplica el tema guardado y evita el destello blanco al abrir en modo noche.
(function () {
  var t = (window.fokusNative && window.fokusNative.initialTheme) || null;
  if (!t) {
    try {
      var s = JSON.parse(localStorage.getItem('fokus-data') || '{}').settings || {};
      var pref = s.theme || 'system';
      t = pref === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref;
    } catch (e) { t = 'light'; }
  }
  document.documentElement.dataset.theme = t;
})();
