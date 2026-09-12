const STATIC_CACHE = 'poubelles-static-v2';
const DYNAMIC_CACHE = 'poubelles-dynamic-v1';

// Fichiers de base de l'application (shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // On ne traite que les requêtes GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Stratégie pour les ressources statiques du même domaine (HTML, JS, CSS, images)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then(response => {
            // On met en cache les réponses OK pour les futures requêtes
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, copy);
              });
            }
            return response;
          })
          .catch(() => {
            // Si la requête est une navigation et que le réseau est indisponible,
            // on renvoie index.html pour permettre à l'app de se charger.
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
            return caches.match(request);
          });
      })
    );
  }
});
