const CACHE_NAME = 'fluxo-shell-v1';
const PRECACHE_URLS = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar nada cross-origin (la API vive en otro origen, ver
  // src/lib/api-origin.ts) ni requests que no sean GET.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // Solo cache-first para el allowlist estático explícito: nunca datos
  // financieros, páginas ni bundles (evita servir un shell viejo tras deploys).
  if (!PRECACHE_URLS.includes(url.pathname)) return;

  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
