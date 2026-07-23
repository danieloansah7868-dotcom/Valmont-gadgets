const CACHE_NAME = 'valmont-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/logo.png',
  '/favicon.svg',
  '/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Navigation request (main page shell): network-first to bypass Safari's redirect bugs, with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => cleanResponse(response))
        .catch(() => {
          return caches.match('/index.html').then(cachedResponse => {
            if (cachedResponse) {
              return cleanResponse(cachedResponse);
            }
          });
        })
    );
    return;
  }

  // Non-navigation request (assets, images, scripts): cache-first
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cleanResponse(cachedResponse);
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          return cleanResponse(networkResponse);
        }
        return networkResponse;
      });
    })
  );
});

// Rebuilds response object to completely strip Safari's internal redirect flags
function cleanResponse(response) {
  if (response && response.redirected) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
  return response;
}
