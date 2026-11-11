"use strict";

/* =========================================================
   HAMRO SANSAR — SERVICE WORKER
   Version: v18

   RELEASE SAFETY:
   - New cache contains only current-version files.
   - Old cache files are never copied into new cache.
   - Missing required assets cancel installation.
   - Old cache stays until new worker activates.
   - Updates activate only after user approval.
========================================================= */

const CACHE_NAME = "hamro-sansar-v18";
const CACHE_PREFIX = "hamro-sansar-";

const APP_FILES = [
  "./index.html",
  "./app.css",
  "./core/comments.css",
  "./app.js",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./Nepal.jpg",

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

  "./core/post-actions.js",
  "./core/comments.js",
  "./core/reactions.js",
  "./core/share.js",

  "./core/settings-ui.js",
  "./core/media-ui.js",
  "./core/profile-media.js",
  "./core/avatar-ui.js",

  "./components/user-card.js",
  "./components/message-item.js",
  "./components/post-card.js",

  "./pages/home.js",
  "./pages/friends.js",
  "./pages/messages.js",
  "./pages/profile.js",
  "./pages/notifications.js",
  "./pages/saved.js",
  "./pages/settings.js",

  /* CORE APP EVENTS */
  "./core/app-events.js",
  "./core/search.js",
  "./core/ui-actions.js",
  "./core/data-refresh.js",

  /* PWA + OFFLINE STATUS */
  "./core/pwa-install.js",
  "./core/network-status.js",
  "./core/pwa-update.js",

  "./core/design-system.css"
];

/* =========================================================
   URL HELPERS
========================================================= */

function getAppURL(path) {
  return new URL(
    path,
    self.registration.scope
  );
}

function isAppURL(url) {
  const scope = new URL(
    self.registration.scope
  );

  return (
    url.origin === scope.origin &&
    url.pathname.startsWith(scope.pathname)
  );
}

/* =========================================================
   AUTOMATIC ASSET DISCOVERY
========================================================= */

function discoverAssets(html) {
  const discovered = new Set();

  const pattern =
    /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

  let match;

  while ((match = pattern.exec(html)) !== null) {
    const value = match[1].trim();

    if (
      !value ||
      value.startsWith("#") ||
      /^(data:|blob:|javascript:|mailto:|tel:)/i.test(value)
    ) {
      continue;
    }

    try {
      const url = new URL(
        value,
        self.registration.scope
      );

      if (
        isAppURL(url) &&
        !url.pathname.endsWith("/")
      ) {
        discovered.add(url.href);
      }

    } catch (error) {
      console.warn(
        "Invalid application asset reference:",
        value,
        error
      );
    }
  }

  return Array.from(discovered);
}

/* =========================================================
   FETCH AND CACHE
========================================================= */

async function fetchAndCache(cache, url) {
  const response = await fetch(
    new Request(url, {
      method: "GET",
      cache: "reload",
      credentials: "same-origin"
    })
  );

  if (
    !response.ok ||
    response.type !== "basic" ||
    response.status !== 200
  ) {
    throw new Error(
      "Required asset could not be cached: " +
      url +
      " (HTTP " +
      response.status +
      ")"
    );
  }

  await cache.put(
    url,
    response.clone()
  );

  return response;
}

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    (async () => {

      const cache = await caches.open(
        CACHE_NAME
      );

      try {

        const indexURL = getAppURL(
          "./index.html"
        ).href;

        const indexResponse = await fetchAndCache(
          cache,
          indexURL
        );

        const html = await indexResponse
          .clone()
          .text();

        const allFiles = new Set([

          ...APP_FILES.map(
            path => getAppURL(path).href
          ),

          ...discoverAssets(html)

        ]);

        allFiles.delete(indexURL);

        const failures = (await Promise.all(

          Array.from(allFiles).map(
            async url => {

              try {

                await fetchAndCache(
                  cache,
                  url
                );

                return null;

              } catch (error) {

                return {
                  url,
                  reason: error
                };

              }

            }
          )

        )).filter(Boolean);

        if (failures.length) {

          console.error(
            "PWA installation cancelled; incomplete app shell:",
            failures
          );

          throw new Error(
            "PWA installation cancelled because " +
            failures.length +
            " app asset(s) could not be cached."
          );

        }

        console.info(
          "Hamro Sansar v18 app shell cached:",
          allFiles.size + 1,
          "files"
        );

        /*
         * Do not call skipWaiting here.
         * The page will request activation after approval.
         */

      } catch (error) {

        try {

          await caches.delete(
            CACHE_NAME
          );

        } catch (cleanupError) {

          console.error(
            "Failed to remove incomplete app cache:",
            cleanupError
          );

        }

        throw error;

      }

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

        cacheNames.map(async name => {

          if (
            name.startsWith(CACHE_PREFIX) &&
            name !== CACHE_NAME
          ) {

            await caches.delete(
              name
            );

          }

        })

      );

      await self.clients.claim();

      console.info(
        "Hamro Sansar Service Worker v18 activated."
      );

    })()

  );

});

/* =========================================================
   NAVIGATION REQUEST
   NETWORK FIRST + OFFLINE INDEX FALLBACK
========================================================= */

async function handleNavigationRequest(
  request,
  cache
) {

  try {

    const response = await fetch(
      request
    );

    if (
      response.ok &&
      response.type === "basic" &&
      response.status === 200
    ) {

      try {

        await cache.put(
          request,
          response.clone()
        );

      } catch (cacheError) {

        console.warn(
          "Navigation cache update failed:",
          cacheError
        );

      }

    }

    return response;

  } catch (error) {

    const exactMatch = await cache.match(
      request
    );

    if (exactMatch) {
      return exactMatch;
    }

    const indexMatch = await cache.match(
      getAppURL("./index.html").href
    );

    if (indexMatch) {
      return indexMatch;
    }

    return offlineResponse();

  }

}

/* =========================================================
   STATIC ASSET REQUEST
   CACHE FIRST + NETWORK FALLBACK
========================================================= */

async function handleAssetRequest(
  request,
  cache
) {

  const cached = await cache.match(
    request
  );

  if (cached) {
    return cached;
  }

  try {

    const response = await fetch(
      request
    );

    if (
      response.ok &&
      response.type === "basic" &&
      response.status === 200
    ) {

      try {

        await cache.put(
          request,
          response.clone()
        );

      } catch (cacheError) {

        console.warn(
          "Asset cache update failed:",
          request.url,
          cacheError
        );

      }

    }

    return response;

  } catch (error) {

    return offlineResponse();

  }

}

/* =========================================================
   OFFLINE RESPONSE
========================================================= */

function offlineResponse() {

  return new Response(

    "यो सामग्री अहिले उपलब्ध छैन। इन्टरनेट जडान जाँच गर्नुहोस्।",

    {
      status: 503,
      statusText: "Service Unavailable",

      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }

  );

}

/* =========================================================
   FETCH HANDLER
========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(
    request.url
  );

  if (!isAppURL(url)) {
    return;
  }

  event.respondWith(

    (async () => {

      const cache = await caches.open(
        CACHE_NAME
      );

      if (request.mode === "navigate") {

        return handleNavigationRequest(
          request,
          cache
        );

      }

      return handleAssetRequest(
        request,
        cache
      );

    })()

  );

});

/* =========================================================
   MESSAGE HANDLER
   Explicit update activation only.
========================================================= */

self.addEventListener("message", event => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {

    event.waitUntil(
      self.skipWaiting()
    );

  }

});

/* =========================================================
   END — HAMRO SANSAR SERVICE WORKER v18
========================================================= */
