// Service worker: la app funciona sin conexión. La cáscara se guarda al instalar; las miniaturas, al usarlas.
const VERSION = 'mr-v1';
const CASCARA = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/util.js', 'js/db.js', 'js/sugerida.js', 'data/catalogo.json',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CASCARA)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const mismo = url.origin === location.origin;
  const fuente = url.hostname.includes('fonts.g');
  if (!mismo && !fuente) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const red = fetch(e.request).then((r) => {
        if (r && r.status === 200) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
        return r;
      }).catch(() => hit);
      // Archivos de la app: primero lo guardado (rápido y sin conexión); se refresca en segundo plano.
      return hit || red;
    })
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs.length ? cs[0].focus() : self.clients.openWindow('./'))));
});
