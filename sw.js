/* =========================================================
   sw.js — service worker: кэш статики, офлайн-режим.
========================================================= */

const CACHE_NAME = "diary-v1";

/* Что кэшируем при первой загрузке */
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

/* ---------- Установка: кэшируем статику ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE).catch((e) => {
        console.warn("[sw] ошибка precache:", e);
      });
    }),
  );
  self.skipWaiting();
});

/* ---------- Активация: чистим старые версии ---------- */
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

/* ---------- Fetch: стратегия ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* API-запросы (push, pull, backup) — только сеть, без кэша */
  if (url.pathname.startsWith("/api/")) {
    return; /* пропускаем */
  }

  /* Внешние запросы (CDN, Telegram) — не трогаем */
  if (url.origin !== self.location.origin) {
    return;
  }

  /* Только GET */
  if (req.method !== "GET") return;

  /* ---------- Static: cache-first с фоновым обновлением ---------- */
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    }),
  );
});