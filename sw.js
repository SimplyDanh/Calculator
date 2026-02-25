// Service Worker — Percentage & Math Calculator PWA
const CACHE_NAME = 'calc-v10';
const MAX_CACHE_ITEMS = 50;

// App shell + critical CDN dependencies to pre-cache on install
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.svg',
    './frame.png',
    './screenshot-wide.png',
    // 3-Tier Architecture files
    './services/app.js',
    './ui/ui.js',
    './ui/styles.css',
    // CDN dependencies (pinned for offline)
    'https://unpkg.com/mathlive@0.108.3',
    'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.js',
    // Google Fonts CSS
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap'
];

// Helper to limit cache size (SW-M2)
const limitCacheSize = (name, maxItems) => {
    caches.open(name).then((cache) => {
        cache.keys().then((keys) => {
            if (keys.length > maxItems) {
                cache.delete(keys[0]).then(limitCacheSize(name, maxItems));
            }
        });
    });
};

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

// Fetch: hybrid strategy
//  - Same-origin (your files): NETWORK-FIRST → always get latest, cache as offline fallback
//  - CDN (fonts, mathlive, mathjs): CACHE-FIRST → they're version-pinned, no need to re-fetch
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // SW-L2 FIX: HTTPS enforcement (except for local dev)
    if (!url.startsWith('https://') && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
        return;
    }

    const isOwnOrigin = url.startsWith(self.location.origin);

    if (isOwnOrigin) {
        // ── Network-first for own files ──
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Update cache with fresh copy
                    if (event.request.method === 'GET' && networkResponse.ok) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clone);
                            limitCacheSize(CACHE_NAME, MAX_CACHE_ITEMS);
                        }).catch(err => console.warn('SW: Cache write failed', err));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Offline: serve from cache
                    return caches.match(event.request).then((cached) => {
                        if (cached) return cached;
                        // Last resort: serve index.html for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return new Response('Network error occurred', { status: 408, statusText: 'Network error occurred' });
                    });
                })
        );
    } else {
        // ── Cache-first for CDN resources ──
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;

                return fetch(event.request).then((networkResponse) => {
                    if (event.request.method === 'GET' && networkResponse.ok) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clone);
                            limitCacheSize(CACHE_NAME, MAX_CACHE_ITEMS);
                        }).catch(err => console.warn('SW: Cache write failed', err));
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback for CDN resources if both cache and network fail
                    return new Response('Offline and resource not in cache', { status: 503 });
                });
            })
        );
    }
});
