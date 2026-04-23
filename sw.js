/* ============================================================
   SERVICE WORKER — Cobrador
   Cache-first para assets estáticos; garante uso offline.
   ============================================================ */

const CACHE = 'cobrador-v1';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
];

// Instalação: pré-cache dos assets principais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, fallback para rede
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e requests externos (ex: wa.me)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request)
    )
  );
});
