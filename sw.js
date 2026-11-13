
"use strict";

/* =========================================================
   MERO SANSAR — SERVICE WORKER
   Version: v60
========================================================= */

const CACHE_NAME = "hamro-sansar-v60";
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

  "./core/design-system.css",
];

/* URL HELPERS */

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

/* ASSET DISCOVERY */

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
      console.warn("Invalid asset reference:", value, error);
    }
  }

  return Array.from(discovered);
}

/* FETCH AND CACHE */

async function fetchAndCache(cache, url) {
  const response = await fetch(new Request(url, {
    method: "GET",
    cache: "reload",
    credentials: "same-origin"
  }));

  if (
    !response.ok ||
    response.type !== "basic" ||
    response.status !== 200
  ) {
    throw new Error(
      "Required asset could not be cached: " +
      url + " (HTTP " + response.status + ")"
    );
  }

  await cache.put(url, response.clone());

  return response;
}

/* INSTALL */

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const indexURL = getAppURL("./index.html").href;

      const indexResponse = await fetchAndCache(
        cache,
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
              await fetchAndCache(cache, url);
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
          "PWA installation cancelled because " +
          failures.length +
          " asset(s) could not be cached."
        );
      }

      console.info(
        "Mero Sansar v60 cached:",
        allFiles.size + 1,
        "files"
      );

    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

/* ACTIVATE */

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map(async name => {
        if (
          name.startsWith(CACHE_PREFIX) &&
          name !== CACHE_NAME
        ) {
          await caches.delete(name);
        }
      })
    );

    await self.clients.claim();

    console.info("Mero Sansar Service Worker v60 activated.");
  })());
});

/* NAVIGATION REQUEST */

async function handleNavigationRequest(request, cache) {
  try {
    const response = await fetch(request);

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

/* ASSET REQUEST */

async function handleAssetRequest(request, cache) {
  const cached = await cache.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);

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
    return offlineResponse();
  }
}

/* OFFLINE RESPONSE */

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

/* FETCH */

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

/* UPDATE ACTIVATION */

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});
