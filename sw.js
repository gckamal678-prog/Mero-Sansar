
"use strict";

/* =========================================================
   HAMRO SANSAR — SERVICE WORKER
   Version: v7

   Features:
   - Complete application precache
   - Offline application support
   - Network-first strategy
   - Offline navigation fallback
   - Automatic cache version cleanup
   - GitHub Pages subdirectory support
========================================================= */

const CACHE_NAME = "hamro-sansar-v7";
const CACHE_PREFIX = "hamro-sansar-";

/* =========================================================
   APPLICATION FILES
   Only existing project files are included.
========================================================= */

const APP_FILES = [

    /* Main files */
  "./index.html",
  "./app.css",
  "./app.js",
  "./core/comments.ccs",
  "./core/app-events.js",
  "./core/search.js",
  "./core/ui-actions.js",
  "./core/data-refresh.js",
  "./manifest.json",
  "./Nepal.jpg",

  /* Design system */
  "./core/design-system.css",

  /* Core systems */
  "./core/state.js",
  "./core/settings.js",
  "./core/theme.js",
  "./core/language.js",
  "./core/toast.js",
  "./core/utils.js",
  "./core/media.js",
  "./core/modal.js",
  "./core/data.js",
  "./core/navigation.js",

  /* Post features */
  "./core/post-actions.js",
  "./core/comments.js",
  "./core/reactions.js",
  "./core/share.js",

  /* UI modules */
  "./core/settings-ui.js",
  "./core/media-ui.js",
  "./core/profile-media.js",
  "./core/avatar-ui.js",

  /* Components */
  "./components/user-card.js",
  "./components/message-item.js",
  "./components/post-card.js",

  /* Pages */
  /* Pages */
"./pages/home.js",
"./pages/friends.js",
"./pages/messages.js",
  "./pages/profile.js",
  "./pages/notifications.js",
  "./pages/saved.js",
  "./pages/settings.js"

];

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    (async () => {

      const cache = await caches.open(CACHE_NAME);

      /*
       * Download all required application files.
       * Installation fails if a required file is missing.
       */

      await cache.addAll(APP_FILES);

      /*
       * Activate the new version without waiting
       * for all old tabs to close.
       */

      await self.skipWaiting();

      console.info(
        "Hamro Sansar: Application files cached."
      );

    })()

  );

});

/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    (async () => {

      const cacheNames = await caches.keys();

      await Promise.all(

        cacheNames.map(cacheName => {

          /*
           * Delete only old Hamro Sansar caches.
           * Do not delete other applications' caches.
           */

          if (
            cacheName.startsWith(CACHE_PREFIX) &&
            cacheName !== CACHE_NAME
          ) {

            return caches.delete(cacheName);

          }

          return Promise.resolve(false);

        })

      );

      /*
       * Take control of already-open application tabs.
       */

      await self.clients.claim();

      console.info(
        "Hamro Sansar: Service Worker activated."
      );

    })()

  );

});

/* =========================================================
   FETCH
   NETWORK FIRST + CACHE FALLBACK
========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  /* Only handle GET requests. */

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  const appScope = new URL(self.registration.scope);

  /*
   * Do not intercept external websites.
   */

  if (
    url.origin !== appScope.origin ||
    !url.pathname.startsWith(appScope.pathname)
  ) {

    return;

  }

  event.respondWith(

    (async () => {

      const cache = await caches.open(CACHE_NAME);

      try {

        /*
         * Try the latest online version first.
         */

        const response = await fetch(request);

        if (response && response.ok) {

          /*
           * Cache successful same-origin responses.
           */

          const responseType = response.type;

          if (
            responseType === "basic" ||
            responseType === "default"
          ) {

            await cache.put(
              request,
              response.clone()
            );

          }

        }

        return response;

      } catch (error) {

        /*
         * Internet unavailable:
         * Use the previously cached file.
         */

        console.warn(
          "Offline: Loading cached resource.",
          request.url
        );

        const cachedResponse = await cache.match(request);

        if (cachedResponse) {

          return cachedResponse;

        }

        /*
         * If a page is requested while offline,
         * return the cached application shell.
         */

        if (request.mode === "navigate") {

          const offlinePage = await cache.match(
            new URL(
              "./index.html",
              self.registration.scope
            ).href
          );

          if (offlinePage) {

            return offlinePage;

          }

        }

        /*
         * Resource is not available online or offline.
         */

        return new Response(

          "यो सामग्री अहिले उपलब्ध छैन। इन्टरनेट जडान जाँच गर्नुहोस्।",

          {
            status: 503,
            statusText: "Service Unavailable",

            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store"
            }

          }

        );

      }

    })()

  );

});

/* =========================================================
   MESSAGE
   Allows the application to request immediate activation.
========================================================= */

self.addEventListener("message", event => {

  if (event.data?.type === "SKIP_WAITING") {

    self.skipWaiting();

  }

});
