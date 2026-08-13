const CACHE_NAME = "sarahbakery-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable.png",
  "/icons/apple-touch-icon.png",
];

// Install Event - Pre-cache core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching static app shell");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle caching strategies
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests or browser extension URLs
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Network-first for API requests (/api/*, /query, /auth, /rpc, /storage or backend requests)
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/query") || url.pathname.startsWith("/auth") || url.pathname.startsWith("/rpc") || url.pathname.startsWith("/storage") || url.port === "3000" || url.port === "8000") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-While-Revalidate for HTML pages, static assets & images
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an HTML navigation page, return cached index.html
          if (request.mode === "navigate") {
            return caches.match("/");
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
