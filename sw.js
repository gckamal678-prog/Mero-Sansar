
/* =====================================================
   MERO SANSAR — WEB PUSH NOTIFICATIONS
===================================================== */

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload = {};

    try {
      payload = event.data
        ? event.data.json()
        : {};
    } catch (error) {
      console.warn("Invalid push payload:", error);
    }

    const title = String(
      payload.title || "मेरो संसार"
    ).slice(0, 100);

    const body = String(
      payload.body || "तपाईंलाई नयाँ सूचना आएको छ।"
    ).slice(0, 250);

    const scopeURL = new URL(self.registration.scope);

    let targetURL = scopeURL.href;

    try {
      const requestedURL = new URL(
        payload.url || "./",
        scopeURL
      );

      if (
        requestedURL.origin === scopeURL.origin &&
        requestedURL.pathname.startsWith(scopeURL.pathname)
      ) {
        targetURL = requestedURL.href;
      }
    } catch (_) {
      targetURL = scopeURL.href;
    }

    const notificationId = String(
      payload.notificationId || ""
    ).slice(0, 100);

    await self.registration.showNotification(title, {
      body,
      icon: new URL("./icon-192.png", scopeURL).href,
      badge: new URL("./icon-192.png", scopeURL).href,
      tag: notificationId
        ? "ksk-notification-" + notificationId
        : "ksk-notification",
      renotify: false,
      data: {
        url: targetURL,
        notificationId
      }
    });
  })());
});

/* =====================================================
   NOTIFICATION CLICK
===================================================== */

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil((async () => {
    const scopeURL = new URL(self.registration.scope);

    let targetURL = scopeURL.href;

    try {
      const requestedURL = new URL(
        event.notification.data?.url || "./",
        scopeURL
      );

      if (
        requestedURL.origin === scopeURL.origin &&
        requestedURL.pathname.startsWith(scopeURL.pathname)
      ) {
        targetURL = requestedURL.href;
      }
    } catch (_) {
      targetURL = scopeURL.href;
    }

    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of windows) {
      if (new URL(client.url).origin === scopeURL.origin) {
        if ("navigate" in client) {
          await client.navigate(targetURL);
        }

        if ("focus" in client) {
          return client.focus();
        }
      }
    }

    return self.clients.openWindow(targetURL);
  })());
});
