
"use strict";

/*
 * MERO SANSAR — SUPABASE WEB PUSH
 *
 * Handles:
 * - Browser notification permission
 * - Push subscription creation
 * - Subscription storage in Supabase
 * - Subscription removal
 *
 * VAPID PRIVATE KEY NEVER BELONGS IN THIS FILE.
 */

(function (global) {
  "use strict";

  if (global.KSKSupabasePush) return;

  const TABLE = "push_subscriptions";

  const VAPID_PUBLIC_KEY =
    "BGEZozsFObXqv7EuYO-n-p4PPhy24bQ1MMAONbHQvm4Rz7cEGZzBuS60PveHr_c_FfDR5iP08_4eAPor5M3hkCk";

  function result(ok, code, data = null, message = "") {
    return { ok, code, data, message };
  }

  function fail(code, message) {
    return result(false, code, null, message);
  }

  function getAuth() {
    return global.KSKSupabaseAuth || null;
  }

  async function getSession() {
    const auth = getAuth();

    if (!auth) {
      return fail("AUTH_MODULE_MISSING",
        "Supabase Auth उपलब्ध छैन।");
    }

    await auth.initialize();

    if (!auth.isAuthenticated?.()) {
      return fail("NOT_AUTHENTICATED",
        "पहिले लगइन गर्नुहोस्।");
    }

    const client = auth.getClient?.();
    const user = auth.getUser?.();

    if (!client || !user?.id) {
      return fail("USER_NOT_AVAILABLE",
        "प्रयोगकर्ता विवरण उपलब्ध छैन।");
    }

    return result(true, "READY", {
      client,
      user
    });
  }

  function base64UrlToUint8Array(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const raw = global.atob(base64);
    const output = new Uint8Array(raw.length);

    for (let i = 0; i < raw.length; i++) {
      output[i] = raw.charCodeAt(i);
    }

    return output;
  }

  function getApplicationKey() {
    return base64UrlToUint8Array(VAPID_PUBLIC_KEY);
  }

  async function getRegistration() {
    if (!global.isSecureContext ||
        !global.navigator?.serviceWorker ||
        !global.PushManager) {
      throw new Error(
        "यो ब्राउजरमा Web Push उपलब्ध छैन।"
      );
    }

    const registration = await global.navigator
      .serviceWorker.ready;

    if (!registration?.pushManager) {
      throw new Error(
        "Push Manager उपलब्ध छैन।"
      );
    }

    return registration;
  }

  function subscriptionPayload(subscription, userId) {
    const json = subscription.toJSON();

    if (!json.endpoint ||
        !json.keys?.p256dh ||
        !json.keys?.auth) {
      throw new Error(
        "Push Subscription विवरण अपूर्ण छ।"
      );
    }

    return {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      expiration_time: subscription.expirationTime
        ? Math.floor(subscription.expirationTime)
        : null,
      updated_at: new Date().toISOString()
    };
  }

  async function getStatus() {
    try {
      const session = await getSession();

      if (!session.ok) return session;

      if (!global.Notification ||
          !global.navigator?.serviceWorker) {
        return fail("UNSUPPORTED",
          "यो ब्राउजरमा Push Notification उपलब्ध छैन।");
      }

      const permission = global.Notification.permission;

      const registration = await getRegistration();
      const subscription = await registration
        .pushManager.getSubscription();

      return result(true, "PUSH_STATUS", {
        permission,
        subscribed: Boolean(subscription),
        endpoint: subscription?.endpoint || ""
      });

    } catch (error) {
      return fail("STATUS_ERROR",
        error?.message || "Push स्थिति जाँच गर्न सकिएन।");
    }
  }

  async function enable() {
    try {
      const session = await getSession();

      if (!session.ok) return session;

      if (!global.Notification ||
          !global.navigator?.serviceWorker ||
          !global.PushManager) {
        return fail("UNSUPPORTED",
          "यो ब्राउजरमा Push Notification उपलब्ध छैन।");
      }

      let permission = global.Notification.permission;

      if (permission === "default") {
        permission = await global.Notification.requestPermission();
      }

      if (permission !== "granted") {
        return fail("PERMISSION_DENIED",
          "Notification अनुमति प्राप्त भएन।");
      }

      const registration = await getRegistration();

      let subscription = await registration
        .pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: getApplicationKey()
        });
      }

      const payload = subscriptionPayload(
        subscription,
        session.data.user.id
      );

      const { error } = await session.data.client
        .from(TABLE)
        .upsert(payload, {
          onConflict: "endpoint"
        });

      if (error) throw error;

      global.dispatchEvent(new CustomEvent(
        "ksk:push-subscription-change",
        {
          detail: {
            subscribed: true
          }
        }
      ));

      return result(true, "PUSH_ENABLED", {
        subscribed: true
      });

    } catch (error) {
      console.error("Push enable failed:", error);

      return fail("PUSH_ENABLE_FAILED",
        error?.message || "Push Notification सक्रिय गर्न सकिएन।");
    }
  }

  async function disable() {
    try {
      const session = await getSession();

      if (!session.ok) return session;

      const registration = await getRegistration();

      const subscription = await registration
        .pushManager.getSubscription();

      if (!subscription) {
        return result(true, "ALREADY_DISABLED", {
          subscribed: false
        });
      }

      const endpoint = subscription.endpoint;

      const { error } = await session.data.client
        .from(TABLE)
        .delete()
        .eq("user_id", session.data.user.id)
        .eq("endpoint", endpoint);

      if (error) throw error;

      await subscription.unsubscribe();

      global.dispatchEvent(new CustomEvent(
        "ksk:push-subscription-change",
        {
          detail: {
            subscribed: false
          }
        }
      ));

      return result(true, "PUSH_DISABLED", {
        subscribed: false
      });

    } catch (error) {
      console.error("Push disable failed:", error);

      return fail("PUSH_DISABLE_FAILED",
        error?.message || "Push Notification बन्द गर्न सकिएन।");
    }
  }

  global.KSKSupabasePush = Object.freeze({
    getStatus,
    enable,
    disable
  });

})(window);
