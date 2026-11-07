
/* =========================================================
   HAMRO SANSAR — SERVICE WORKER
   Cache version: v2
   Fresh files online + offline fallback
========================================================= */

"use strict";

const CACHE_NAME = "hamro-sansar-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.json"
];

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* =========================================================
   FETCH — NETWORK FIRST
========================================================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // बाहिरी वेबसाइटका अनुरोध Service Worker ले नसम्हाल्ने
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .catch(error => {
              console.warn(
                "Cache update failed:",
                error
              );
            });
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        // Offline अवस्थामा पृष्ठ खोल्न नसकिए index.html प्रयोग गर्ने
        if (request.mode === "navigate") {
          const fallback = await caches.match("./index.html");

          if (fallback) {
            return fallback;
          }
        }

        return new Response(
          "यो सामग्री अहिले उपलब्ध छैन। इन्टरनेट जडान जाँच गर्नुहोस्।",
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      })
  );
});
