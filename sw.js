// Service Worker — Percentage & Math Calculator PWA
const CACHE_NAME = 'calc-v6';

// App shell + critical CDN dependencies to pre-cache on install
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    './frame.png',
    // 3-Tier Architecture files
    './services/app.js',
    './ui/ui.js',
    './ui/styles.css',
    // CDN dependencies (pinned for offline)
    'https://unpkg.com/mathlive',
    'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.js',
    // Google Fonts CSS
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap'
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: cache-first, fall back to network, cache new requests on the fly
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // Only cache GET requests from our origin or trusted CDNs
                if (
                    event.request.method === 'GET' &&
                    (event.request.url.startsWith(self.location.origin) ||
                        event.request.url.includes('fonts.googleapis.com') ||
                        event.request.url.includes('fonts.gstatic.com') ||
                        event.request.url.includes('unpkg.com') ||
                        event.request.url.includes('cdnjs.cloudflare.com'))
                ) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Offline fallback: if it's a navigation request, serve index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
