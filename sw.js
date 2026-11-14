
"use strict";

/*
 * MERO SANSAR — AUTOMATIC PWA UPDATE
 *
 * No manual version numbers.
 * Network-first for online updates.
 * Cache fallback for offline use.
 * Staging cache protects the previous app shell.
 */

const CACHE_PREFIX = "hamro-sansar-";
const CACHE_NAME = "hamro-sansar-shell";
const STAGING_CACHE = "hamro-sansar-staging";

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
  "./core/content-safety.js",
  "./core/data-saver.js",
  "./core/navigation.js",
  "./core/accessibility.js",

  "./core/post-actions.js",
  "./core/comments.js",
  "./core/reactions.js",
  "./core/share.js",

  "./core/settings-ui.js",
  "./core/media-ui.js",
  "./core/supabase-auth.js",
  "./core/supabase-profile.js",
  "./core/profile-media.js",
  "./core/avatar-ui.js",

  "./components/user-card.js",
  "./components/message-item.js",
  "./components/post-card.js",

  "./pages/home.js",
  "./pages/story-ui-upgrade.js",
  "./pages/friends.js",
  "./pages/messages.js",
  "./pages/profile.js",
  "./pages/profile-extras.js",
  "./pages/drafts.js",
  "./pages/insights.js",
  "./pages/notifications.js",
  "./pages/saved.js",
  "./pages/settings.js",

  "./core/app-events.js",
  "./core/search.js",
  "./core/ui-actions.js",
  "./core/data-refresh.js",

  "./core/pwa-install.js",
  "./core/network-status.js",
  "./core/pwa-update.js",
  "./core/tone.js",

  "./sounds/Eagle.mp3",
  "./sounds/Oh No.mp3",
  "./sounds/Water Drop.mp3",
  "./sounds/Whistle.mp3",
  "./sounds/anthem.mp3",

  "./core/design-system.css"
];

/* =====================================================
   URL HELPERS
===================================================== */

function getAppURL(path) {
  return new URL(path, self.registration.scope);
}

function isAppURL(url) {
  const scope = new URL(self.registration.scope);

  return (
    url.origin === scope.origin &&
    url.pathname.startsWith(scope.pathname)
  );
}

/* =====================================================
   ASSET DISCOVERY
===================================================== */

function discoverAssets(html) {
  const discovered = new Set();

  const pattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

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
      const url = new URL(value, self.registration.scope);

      if (
        isAppURL(url) &&
        !url.pathname.endsWith("/")
      ) {
        discovered.add(url.href);
      }
    } catch (error) {
      console.warn("Invalid asset:", value, error);
    }
  }

  return Array.from(discovered);
}

/* =====================================================
   FETCH AND CACHE
===================================================== */

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
      "Required asset failed: " +
      url +
      " HTTP " +
      response.status
    );
  }

  await cache.put(url, response.clone());

  return response;
}

/* =====================================================
   INSTALL
===================================================== */

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await caches.delete(STAGING_CACHE);

    const staging = await caches.open(STAGING_CACHE);

    try {
      const indexURL = getAppURL("./index.html").href;

      const indexResponse = await fetchAndCache(
        staging,
        indexURL
      );

      const html = await indexResponse.clone().text();

      const allFiles = new Set([
        ...APP_FILES.map(path => getAppURL(path).href),
        ...discoverAssets(html)
      ]);

      allFiles.delete(indexURL);

      const failures = (
        await Promise.all(
          Array.from(allFiles).map(async url => {
            try {
              await fetchAndCache(staging, url);
              return null;
            } catch (error) {
              return { url, reason: error };
            }
          })
        )
      ).filter(Boolean);

      if (failures.length) {
        console.error("Incomplete app shell:", failures);

        throw new Error(
          "Installation cancelled: " +
          failures.length +
          " required file(s) failed."
        );
      }

      console.info(
        "Mero Sansar app shell prepared:",
        allFiles.size + 1,
        "files"
      );

    } catch (error) {
      await caches.delete(STAGING_CACHE);
      throw error;
    }
  })());
});

/* =====================================================
   ACTIVATE
===================================================== */

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const staging = await caches.open(STAGING_CACHE);
    const finalCache = await caches.open(CACHE_NAME);

    const stagedRequests = await staging.keys();

    if (!stagedRequests.length) {
      throw new Error(
        "Staging cache is empty. Previous cache preserved."
      );
    }

    /*
     * Promote successfully downloaded files.
     * Old cache is not deleted until promotion finishes.
     */

    for (const request of stagedRequests) {
      const response = await staging.match(request);

      if (response) {
        await finalCache.put(request, response);
      }
    }

    await caches.delete(STAGING_CACHE);

    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map(async name => {
        if (
          name.startsWith(CACHE_PREFIX) &&
          name !== CACHE_NAME
        ) {
          await caches.delete(name);

          console.info("Old cache removed:", name);
        }
      })
    );

    await self.clients.claim();

    console.info("Mero Sansar Service Worker activated.");

  })());
});

/* =====================================================
   NAVIGATION — NETWORK FIRST
===================================================== */

async function handleNavigationRequest(request, cache) {
  try {
    const response = await fetch(
      new Request(request, {
        cache: "no-cache"
      })
    );

    if (
      response.ok &&
      response.type === "basic" &&
      response.status === 200
    ) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn("Navigation cache update failed:", error);
      }
    }

    return response;

  } catch (error) {
    const exactMatch = await cache.match(request);

    if (exactMatch) return exactMatch;

    const indexMatch = await cache.match(
      getAppURL("./index.html").href
    );

    if (indexMatch) return indexMatch;

    return offlineResponse();
  }
}

/* =====================================================
   ASSETS — NETWORK FIRST
===================================================== */

async function handleAssetRequest(request, cache) {
  try {
    /*
     * Always check the network first.
     * This allows updated JS and CSS files to load
     * without manually changing a cache version.
     */

    const response = await fetch(
      new Request(request, {
        cache: "no-cache"
      })
    );

    if (
      response.ok &&
      response.type === "basic" &&
      response.status === 200
    ) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn("Asset cache update failed:", error);
      }
    }

    return response;

  } catch (error) {
    const cached = await cache.match(request);

    if (cached) return cached;

    return offlineResponse();
  }
}

/* =====================================================
   OFFLINE RESPONSE
===================================================== */

function offlineResponse() {
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

/* =====================================================
   FETCH
===================================================== */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!isAppURL(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (request.mode === "navigate") {
      return handleNavigationRequest(request, cache);
    }

    return handleAssetRequest(request, cache);
  })());
});

/* =====================================================
   UPDATE ACTIVATION
===================================================== */

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});
