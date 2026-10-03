// Service worker Lingora : coque applicative et pages visitées ou téléchargées.
// Jamais de cache pour l'API (/api/*) ni les médias audio : données toujours fraîches et privées.
const VERSION = "lingora-v2"; // identique à SW_VERSION dans lib/offline/pages.ts
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    // Réseau d'abord ; les pages vues (HTML sans donnée personnelle) servent de secours hors ligne.
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(req, res.clone());
          }
          return res;
        } catch {
          const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
          return hit ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
        }
      })(),
    );
  }
});
