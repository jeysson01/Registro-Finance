const CACHE = "control-gastos-v2";
const SHELL = ["/", "/login", "/manifest.json", "/favicon.ico", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/icon-maskable-512.png", "/icons/cf.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("control-gastos", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("share-queue")) {
        request.result.createObjectStore("share-queue", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/api/share") {
    event.respondWith(handleShare(event.request));
    return;
  }
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (event.request.mode === "navigate" || url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons"))) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const home = await caches.match("/");
          if (home) return home;
        }
        return new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      })
  );
});

async function handleShare(request) {
  try {
    return await fetch(request.clone());
  } catch {
    const form = await request.formData();
    const file = form.get("voucher");
    if (file) {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction("share-queue", "readwrite");
        tx.objectStore("share-queue").put({
          id: crypto.randomUUID(),
          blob: file,
          name: file.name || "voucher.jpg",
          createdAt: Date.now(),
        });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      if (self.registration.sync) await self.registration.sync.register("share-queue");
    }
    return Response.redirect(`${self.location.origin}/?offline=1`, 303);
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "share-queue") event.waitUntil(flushQueue());
});

async function flushQueue() {
  const db = await openDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction("share-queue", "readonly");
    const request = tx.objectStore("share-queue").getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  for (const item of items) {
    const body = new FormData();
    body.append("voucher", item.blob, item.name || "voucher.jpg");
    try {
      const response = await fetch("/api/share", { method: "POST", body, credentials: "include" });
      if (response.ok || response.redirected) {
        await new Promise((resolve) => {
          const tx = db.transaction("share-queue", "readwrite");
          tx.objectStore("share-queue").delete(item.id);
          tx.oncomplete = resolve;
        });
      }
    } catch {
      /* se reintenta en el próximo sync */
    }
  }
}
