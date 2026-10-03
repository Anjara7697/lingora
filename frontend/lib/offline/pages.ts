/** Mise en cache des pages et des fichiers nécessaires pour ouvrir une leçon sans réseau.
 *
 * Les noms de caches doivent rester identiques à ceux de `public/sw.js`.
 */
export const SW_VERSION = "lingora-v2";
export const PAGE_CACHE = `${SW_VERSION}-pages`;
export const STATIC_CACHE = `${SW_VERSION}-static`;

const ASSET = /\\?\/_next\\?\/static\\?\/[^"'\s\\)<>]+\.(?:js|css|woff2)/g;

/** Télécharge les pages (HTML, sans donnée personnelle) et les fichiers JS/CSS qu'elles utilisent. */
export async function primePages(urls: string[]): Promise<void> {
  if (typeof caches === "undefined") return;
  const pages = await caches.open(PAGE_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok || res.redirected) continue;
      const html = await res.clone().text();
      await pages.put(url, res);
      const assets = new Set((html.match(ASSET) ?? []).map((a) => a.replaceAll("\\", "")));
      await Promise.all(
        [...assets].map(async (asset) => {
          if (await statics.match(asset)) return;
          const r = await fetch(asset);
          if (r.ok) await statics.put(asset, r);
        }),
      );
    } catch {
      /* hors ligne ou page indisponible : le contenu reste lisible s'il a déjà été visité */
    }
  }
}
