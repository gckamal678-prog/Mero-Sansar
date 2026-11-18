
"use strict";

/* MERO SANSAR — WEB PUSH FIX */

(function (global) {
  if (global.KSKSupabasePush) return;

  const TABLE = "push_subscriptions";

  const VAPID_PUBLIC_KEY =
    "BGEZozsFObXqv7EuYO-n-p4PPhy24bQ1MMAONbHQvm4Rz7cEGZzBuS60PveHr_c_FfDR5iP08_4eAPor5M3hkCk";

  function ok(code, data = null, message = "") {
    return { ok: true, code, data, message };
  }

  function fail(code, message) {
    return { ok: false, code, data: null, message };
  }

  function base64UrlToUint8Array(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const raw = global.atob(base64);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  function supported() {
    return Boolean(
      global.isSecureContext &&
      global.Notification &&
      global.navigator?.serviceWorker &&
      global.PushManager
    );
  }

  async function getSession() {
    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      throw new Error("Supabase Auth Module उपलब्ध छैन।");
    }

    const initialized = await auth.initialize();

    if (initialized !== true) {
      throw new Error("Supabase Auth सुरु हुन सकेन। पेज Reload गर्नुहोस्।");
    }

    const client = auth.getClient?.();

    if (!client?.auth) {
      throw new Error("Supabase Client उपलब्ध छैन।");
    }

    const sessionResult = await client.auth.getSession();

    if (!sessionResult || typeof sessionResult !== "object") {
      throw new Error("Supabase Session बाट खाली उत्तर आयो।");
    }

    if (sessionResult.error) {
      throw sessionResult.error;
    }

    const session = sessionResult.data?.session;
    const user = session?.user;

    if (!user?.id) {
      throw new Error("पहिले आफ्नो खातामा Login गर्नुहोस्।");
    }

    if (!(user.email_confirmed_at || user.confirmed_at)) {
      throw new Error("कृपया आफ्नो Email Verify गर्नुहोस्।");
    }

    return { client, user };
  }

  async function getRegistration() {
    if (!supported()) {
      throw new Error("यो ब्राउजरमा Web Push उपलब्ध छैन।");
    }

    const registration =
      await global.navigator.serviceWorker.ready;

    if (!registration?.pushManager) {
      throw new Error("Service Worker Push Manager उपलब्ध छैन।");
    }

    return registration;
  }

  function makePayload(subscription, userId) {
    const json = subscription.toJSON();

    if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error("Push Subscription विवरण अपूर्ण छ।");
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
      if (!supported()) {
        return fail("UNSUPPORTED", "यो ब्राउजरमा Push उपलब्ध छैन।");
      }

      const { client, user } = await getSession();
      const registration = await getRegistration();
      const subscription =
        await registration.pushManager.getSubscription();

      return ok("PUSH_STATUS", {
        permission: global.Notification.permission,
        subscribed: Boolean(subscription),
        endpoint: subscription?.endpoint || "",
        userId: user.id
      });
    } catch (error) {
      return fail(
        "STATUS_ERROR",
        error?.message || "Push स्थिति जाँच गर्न सकिएन।"
      );
    }
  }

  async function enable() {
    let stage = "permission";

    try {
      if (!supported()) {
        return fail("UNSUPPORTED", "यो ब्राउजरमा Push उपलब्ध छैन।");
      }

      let permission = global.Notification.permission;

      if (permission === "default") {
        permission = await global.Notification.requestPermission();
      }

      if (permission !== "granted") {
        return fail(
          "PERMISSION_DENIED",
          "Notification अनुमति प्राप्त भएन।"
        );
      }

      stage = "authentication";
      const { client, user } = await getSession();

      stage = "service-worker";
      const registration = await getRegistration();

      stage = "subscription";
      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            base64UrlToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      stage = "database-save";
      const payload = makePayload(subscription, user.id);

      const saveResult = await client
        .from(TABLE)
        .upsert(payload, { onConflict: "endpoint" });

      if (!saveResult || typeof saveResult !== "object") {
        throw new Error("Database बाट खाली उत्तर आयो।");
      }

      if (saveResult.error) {
        throw saveResult.error;
      }

      global.dispatchEvent(new CustomEvent(
        "ksk:push-subscription-change",
        { detail: { subscribed: true } }
      ));

      return ok("PUSH_ENABLED", {
        subscribed: true,
        endpoint: subscription.endpoint
      });

    } catch (error) {
      console.error("Push enable failed at:", stage, error);

      return fail(
        "PUSH_ENABLE_FAILED",
        "[" + stage + "] " +
        (error?.message || "Push सक्रिय गर्न सकिएन।")
      );
    }
  }

  async function disable() {
    try {
      const { client, user } = await getSession();
      const registration = await getRegistration();

      const subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        return ok("ALREADY_DISABLED", { subscribed: false });
      }

      const deleteResult = await client
        .from(TABLE)
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", subscription.endpoint);

      if (!deleteResult || deleteResult.error) {
        throw deleteResult?.error ||
          new Error("Database बाट Subscription हटाउन सकिएन।");
      }

      await subscription.unsubscribe();

      global.dispatchEvent(new CustomEvent(
        "ksk:push-subscription-change",
        { detail: { subscribed: false } }
      ));

      return ok("PUSH_DISABLED", { subscribed: false });

    } catch (error) {
      return fail(
        "PUSH_DISABLE_FAILED",
        error?.message || "Push बन्द गर्न सकिएन।"
      );
    }
  }

  global.KSKSupabasePush = Object.freeze({
    getStatus,
    enable,
    disable
  });

})(window);
 
