const CACHE_PREFIX = "moobi-shell-";
const CACHE_NAME = `${CACHE_PREFIX}2026-10-25-1`;
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/moobi-192.png",
  "/icons/moobi-512.png",
  "/icons/moobi-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/images/logo.webp",
  "/images/wallpaper.webp",
  "/images/lockscreen.webp",
];
const SHELL_ASSET_PATHS = new Set(SHELL_ASSETS);

function findVersionedAssets(html) {
  const assets = new Set();
  const attributePattern = /(?:src|href)=["']([^"']+)["']/g;

  for (const match of html.matchAll(attributePattern)) {
    const url = new URL(match[1], self.location.origin);
    if (
      url.origin === self.location.origin &&
      url.pathname.startsWith("/_next/static/")
    ) {
      assets.add(`${url.pathname}${url.search}`);
    }
  }

  return [...assets];
}

async function installShell() {
  const shellResponse = await fetch(
    new Request("/", {
      cache: "reload",
      headers: { Accept: "text/html" },
    }),
  );
  if (!shellResponse.ok) throw new Error("Moobi shell could not be cached.");

  const cache = await caches.open(CACHE_NAME);
  const html = await shellResponse.clone().text();
  await cache.put("/", shellResponse);
  await cache.addAll([...SHELL_ASSETS, ...findVersionedAssets(html)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    installShell().then(() => {
      self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function useCachedAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function useNetworkNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const shell = await caches.match("/");
    return shell ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(useNetworkNavigation(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    SHELL_ASSET_PATHS.has(url.pathname)
  ) {
    event.respondWith(useCachedAsset(request));
  }
});
