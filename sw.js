
"use strict";

/* =========================================================
   HAMRO SANSAR — SERVICE WORKER
   Version: v8

   FEATURES:
   - Individual file caching
   - Automatic asset discovery from index.html
   - Offline application support
   - Network-first strategy
   - Old cache fallback during installation
   - Safe cache migration
   - Automatic old cache cleanup
   - GitHub Pages subdirectory support
   - Runtime caching
========================================================= */

const CACHE_NAME = "hamro-sansar-v8";
const CACHE_PREFIX = "hamro-sansar-";

/* =========================================================
   KNOWN APPLICATION FILES

   These are supplementary files.
   Files referenced by index.html are discovered
   automatically during installation.
========================================================= */

const APP_FILES = [

  "./index.html",
  "./app.css",
  "./core/comments.css",
  "./app.js",
  "./manifest.json",
  "./Nepal.jpg",

  /* Core */
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

  /* Features */
  "./core/post-actions.js",
  "./core/comments.js",
  "./core/reactions.js",
  "./core/share.js",

  /* UI */
  "./core/settings-ui.js",
  "./core/media-ui.js",
  "./core/profile-media.js",
  "./core/avatar-ui.js",

  /* Components */
  "./components/user-card.js",
  "./components/message-item.js",
  "./components/post-card.js",

  /* Pages */
  "./pages/home.js",
  "./pages/friends.js",
  "./pages/messages.js",
  "./pages/profile.js",
  "./pages/notifications.js",
  "./pages/saved.js",
  "./pages/settings.js",

  /* Application systems */
  "./core/app-events.js",
  "./core/search.js",
  "./core/ui-actions.js",
  "./core/data-refresh.js",

  /* Design */
  "./core/design-system.css"

];

/* =========================================================
   HELPERS
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

   Read local CSS, JS, image and manifest references
   directly from index.html.

   Newly added script/link files in index.html
   do not need manual addition to APP_FILES.
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
        "Invalid application asset:",
        value
      );

    }

  }

  return Array.from(discovered);

}

/* =========================================================
   OLD CACHE FALLBACK

   If a new file cannot be downloaded,
   try retrieving it from an older application cache.
========================================================= */

async function getOldCachedFile(url, oldCacheNames) {

  for (const name of oldCacheNames) {

    try {

      const oldCache = await caches.open(name);

      const response = await oldCache.match(url);

      if (response) {

        return response;

      }

    } catch (error) {

      console.warn(
        "Old cache lookup failed:",
        name,
        error
      );

    }

  }

  return null;

}

/* =========================================================
   CACHE SINGLE FILE

   Each file is handled independently.

   One missing optional file will not cancel
   the complete installation.
========================================================= */

async function cacheSingleFile(
  cache,
  url,
  oldCacheNames
) {

  try {

    const response = await fetch(
      new Request(url, {
        method: "GET",
        cache: "reload",
        credentials: "same-origin"
      })
    );

    if (
      !response.ok ||
      response.type !== "basic"
    ) {

      throw new Error(
        "Invalid response: " + response.status
      );

    }

    await cache.put(
      url,
      response.clone()
    );

    return true;

  } catch (networkError) {

    console.warn(
      "Network caching failed:",
      url
    );

    /* Try old cache */

    const oldResponse = await getOldCachedFile(
      url,
      oldCacheNames
    );

    if (oldResponse) {

      try {

        await cache.put(
          url,
          oldResponse.clone()
        );

        console.info(
          "Restored from old cache:",
          url
        );

        return true;

      } catch (cacheError) {

        console.error(
          "Old cache restoration failed:",
          url,
          cacheError
        );

      }

    }

    console.warn(
      "File unavailable for offline use:",
      url
    );

    return false;

  }

}

/* =========================================================
   INSTALL

   1. Read old cache names.
   2. Download index.html first.
   3. Discover referenced application files.
   4. Cache files individually.
   5. Preserve old cache as fallback.
   6. Activate only when index.html is available.
========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    (async () => {

      const cache = await caches.open(
        CACHE_NAME
      );

      const cacheNames = await caches.keys();

      const oldCacheNames = cacheNames.filter(
        name =>
          name.startsWith(CACHE_PREFIX) &&
          name !== CACHE_NAME
      );

      const indexURL = getAppURL(
        "./index.html"
      ).href;

      /* Cache main application first */

      const indexReady = await cacheSingleFile(
        cache,
        indexURL,
        oldCacheNames
      );

      if (!indexReady) {

        throw new Error(
          "Installation stopped: index.html is unavailable."
        );

      }

      /* Read cached HTML */

      const indexResponse = await cache.match(
        indexURL
      );

      const html = await indexResponse.text();

      /* Discover new assets automatically */

      const discoveredFiles = discoverAssets(
        html
      );

      /* Combine known and discovered files */

      const allFiles = new Set([

        ...APP_FILES.map(
          path => getAppURL(path).href
        ),

        ...discoveredFiles

      ]);

      /* index.html is already cached */

      allFiles.delete(indexURL);

      let successCount = 1;
      let failedCount = 0;

      /* Cache every file independently */

      const results = await Promise.all(

        Array.from(allFiles).map(async url => {

          const success = await cacheSingleFile(
            cache,
            url,
            oldCacheNames
          );

          if (success) {

            successCount++;

          } else {

            failedCount++;

          }

          return success;

        })

      );

      console.info(
        "Hamro Sansar: Installation completed.",
        {
          total: allFiles.size + 1,
          cached: successCount,
          failed: failedCount
        }
      );

      /*
       * Do not delete old cache here.
       * Old cache is needed until activation.
       */

      await self.skipWaiting();

    })()

  );

});

/* =========================================================
   ACTIVATE

   Remove old application caches only after
   the new installation has completed.
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

            const deleted = await caches.delete(
              name
            );

            console.info(
              "Old application cache removed:",
              name,
              deleted
            );

          }

        })

      );

      await self.clients.claim();

      console.info(
        "Hamro Sansar: Service Worker v8 activated."
      );

    })()

  );

});

/* =========================================================
   FETCH

   NETWORK FIRST + CACHE FALLBACK

   - Online: Get latest resource.
   - Offline: Use cached resource.
   - Navigation: Use cached index.html as fallback.
   - External websites: Do not intercept.
========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  /* Only GET requests */

  if (request.method !== "GET") {

    return;

  }

  const url = new URL(request.url);

  /* Ignore external websites */

  if (!isAppURL(url)) {

    return;

  }

  event.respondWith(

    (async () => {

      const cache = await caches.open(
        CACHE_NAME
      );

      try {

        /* Try network first */

        const response = await fetch(
          request
        );

        /* Cache successful same-origin responses */

        if (
          response.ok &&
          response.type === "basic"
        ) {

          try {

            await cache.put(
              request,
              response.clone()
            );

          } catch (cacheError) {

            console.warn(
              "Runtime cache update failed:",
              request.url,
              cacheError
            );

          }

        }

        return response;

      } catch (networkError) {

        console.warn(
          "Offline: Network unavailable.",
          request.url
        );

        /* Exact cached request */

        const cachedResponse = await cache.match(
          request
        );

        if (cachedResponse) {

          return cachedResponse;

        }

        /* Offline navigation fallback */

        if (request.mode === "navigate") {

          const indexURL = getAppURL(
            "./index.html"
          ).href;

          const offlinePage = await cache.match(
            indexURL
          );

          if (offlinePage) {

            return offlinePage;

          }

        }

        /* Resource unavailable */

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

    })()

  );

});

/* =========================================================
   MESSAGE

   Allow application to request immediate activation.
========================================================= */

self.addEventListener("message", event => {

  if (
    event.data?.type === "SKIP_WAITING"
  ) {

    event.waitUntil(
      self.skipWaiting()
    );

  }

});

/* =========================================================
   END SERVICE WORKER
========================================================= */
