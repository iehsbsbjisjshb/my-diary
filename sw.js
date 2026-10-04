/* =========================================================
   sw.js — service worker: кэш статики, офлайн-режим.
========================================================= */

const CACHE_NAME = "diary-v3";

const PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./bg.css",
  "./core.js",
  "./i18n.js",
  "./storage.js",
  "./tasks.js",
  "./pomodoro.js",
  "./timeline.js",
  "./analytics.js",
  "./notes.js",
  "./health.js",
  "./ai.js",
  "./sync.js",
  "./ui.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.json",
];

/* ---------- Установка: кэшируем по одному, не падаем если что-то не скачалось ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of PRECACHE) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn("[sw] не удалось кэшировать:", url, e.message);
        }
      }
    }),
  );
  self.skipWaiting();
});

/* ---------- Активация ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ---------- Fetch ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* API — только сеть */
  if (url.pathname.startsWith("/api/")) return;

  /* Внешние CDN — не трогаем */
  if (url.origin !== self.location.origin) return;

  if (req.method !== "GET") return;

  /* Картинки — cache-first */
  const isStatic = /\.(png|jpg|jpeg|svg|ico|webmanifest)$/i.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req)),
    );
    return;
  }

  /* HTML/JS/CSS — network-first, кэш — только если сети нет */
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || Response.error()),
      ),
  );
});
