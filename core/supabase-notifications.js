
"use strict";

/*
 * MERO SANSAR — SUPABASE NOTIFICATIONS
 *
 * DATA SOURCE: SUPABASE ONLY
 * TABLE: public.user_notifications
 *
 * Features:
 * - Load notifications
 * - Create notification
 * - Mark one / all as read
 * - Delete notification
 * - Realtime INSERT / UPDATE / DELETE
 */

(function (global) {
  "use strict";

  if (global.KSKSupabaseNotifications) return;

  const TABLE = "user_notifications";
  const REALTIME_CHANNEL = "ksk-user-notifications-live";

  const SELECT_FIELDS = [
    "id",
    "recipient_id",
    "actor_id",
    "type",
    "text",
    "entity_type",
    "entity_id",
    "is_read",
    "created_at"
  ].join(",");

  let realtimeChannel = null;
  let realtimeClient = null;
  let realtimeUserId = "";
  let realtimeStarting = false;

  function result(ok, code, data = null, message = "") {
    return { ok, code, data, message };
  }

  function fail(code, message) {
    return result(false, code, null, message);
  }

  function normalizeId(value) {
    if (typeof value !== "string") return "";

    const id = value.trim();

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ? id
      : "";
  }

  function normalizeText(value, limit = 500) {
    return String(value || "")
      .trim()
      .slice(0, limit);
  }

  function auth() {
    return global.KSKSupabaseAuth || null;
  }

  function dispatch(action, item = null, extra = {}) {
    global.dispatchEvent(
      new CustomEvent("ksk:notification-cloud-change", {
        detail: {
          collection: TABLE,
          action,
          item,
          ...extra
        }
      })
    );
  }

  async function ready() {
    const api = auth();

    if (!api) {
      return fail(
        "AUTH_MODULE_MISSING",
        "Supabase Auth उपलब्ध छैन।"
      );
    }

    try {
      await api.initialize();
    } catch (error) {
      return fail(
        error?.code || "AUTH_ERROR",
        error?.message || "Authentication सुरु हुन सकेन।"
      );
    }

    if (!api.isAuthenticated?.()) {
      return fail(
        "NOT_AUTHENTICATED",
        "पहिले आफ्नो खातामा लगइन गर्नुहोस्।"
      );
    }

    const client = api.getClient?.();
    const user = api.getUser?.();
    const userId = normalizeId(user?.id);

    if (!client || !userId) {
      return fail(
        "USER_NOT_AVAILABLE",
        "Supabase User उपलब्ध छैन।"
      );
    }

    return result(true, "READY", {
      client,
      user,
      userId
    });
  }

  function handleError(error) {
    const code = error?.code || "SUPABASE_ERROR";

    const messages = {
      "42501": "यो कार्य गर्ने अनुमति छैन।",
      "23503": "सम्बन्धित प्रयोगकर्ता भेटिएन।",
      "PGRST116": "Notification भेटिएन।"
    };

    return fail(
      code,
      messages[code] ||
        error?.message ||
        "Notification अनुरोध पूरा हुन सकेन।"
    );
  }

  /* =========================================
     LOAD NOTIFICATIONS
  ========================================= */

  async function getNotifications(options = {}) {
    const session = await ready();

    if (!session.ok) return session;

    const { client, userId } = session.data;

    const limit = Math.min(
      200,
      Math.max(1, Number(options.limit) || 100)
    );

    try {
      const { data, error } = await client
        .from(TABLE)
        .select(SELECT_FIELDS)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return result(
        true,
        "NOTIFICATIONS_LOADED",
        (data || []).map(normalizeNotification)
      );

    } catch (error) {
      return handleError(error);
    }
  }

  function normalizeNotification(item) {
    return {
      id: item.id,
      recipientId: item.recipient_id,
      actorId: item.actor_id || "",
      type: item.type || "system",
      text: item.text || "",
      entityType: item.entity_type || "",
      entityId: item.entity_id || "",
      read: Boolean(item.is_read),
      createdAt: item.created_at,
      time: item.created_at
    };
  }

  /* =========================================
     CREATE NOTIFICATION
  ========================================= */

  async function createNotification(input = {}) {
    const session = await ready();

    if (!session.ok) return session;

    const { client, userId } = session.data;

    const recipientId = normalizeId(input.recipientId);
    const text = normalizeText(input.text);
    const type = normalizeText(input.type || "system", 60);

    if (!recipientId) {
      return fail(
        "INVALID_RECIPIENT",
        "Notification प्राप्त गर्ने User ID मान्य छैन।"
      );
    }

    if (recipientId === userId) {
      return fail(
        "SELF_NOTIFICATION",
        "आफैँलाई Notification पठाउन मिल्दैन।"
      );
    }

    if (!text) {
      return fail(
        "EMPTY_NOTIFICATION",
        "Notification को Text खाली छ।"
      );
    }

    const entityType = normalizeText(
      input.entityType,
      40
    );

    const entityId = input.entityId
      ? normalizeId(String(input.entityId))
      : null;

    if (input.entityId && !entityId) {
      return fail(
        "INVALID_ENTITY_ID",
        "सम्बन्धित पोस्ट वा वस्तुको ID मान्य छैन।"
      );
    }

    try {
      const payload = {
        recipient_id: recipientId,
        actor_id: userId,
        type,
        text,
        entity_type: entityType || null,
        entity_id: entityId
      };

      const { data, error } = await client
        .from(TABLE)
        .insert(payload)
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;

      const item = normalizeNotification(data);

      dispatch("add", item);

      return result(
        true,
        "NOTIFICATION_CREATED",
        item
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /* =========================================
     MARK ONE AS READ
  ========================================= */

  async function markAsRead(notificationId) {
    const id = normalizeId(notificationId);

    if (!id) {
      return fail(
        "INVALID_NOTIFICATION_ID",
        "Notification ID मान्य छैन।"
      );
    }

    const session = await ready();

    if (!session.ok) return session;

    const { client, userId } = session.data;

    try {
      const { data, error } = await client
        .from(TABLE)
        .update({ is_read: true })
        .eq("id", id)
        .eq("recipient_id", userId)
        .select(SELECT_FIELDS)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return fail(
          "NOTIFICATION_NOT_FOUND",
          "Notification भेटिएन।"
        );
      }

      const item = normalizeNotification(data);

      dispatch("read", item);

      return result(true, "NOTIFICATION_READ", item);

    } catch (error) {
      return handleError(error);
    }
  }

  /* =========================================
     MARK ALL AS READ
  ========================================= */

  async function markAllAsRead() {
    const session = await ready();

    if (!session.ok) return session;

    const { client, userId } = session.data;

    try {
      const { data, error } = await client
        .from(TABLE)
        .update({ is_read: true })
        .eq("recipient_id", userId)
        .eq("is_read", false)
        .select("id");

      if (error) throw error;

      dispatch("mark-all-read", null, {
        count: data?.length || 0
      });

      return result(
        true,
        "ALL_NOTIFICATIONS_READ",
        { count: data?.length || 0 }
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /* =========================================
     DELETE ONE NOTIFICATION
  ========================================= */

  async function deleteNotification(notificationId) {
    const id = normalizeId(notificationId);

    if (!id) {
      return fail(
        "INVALID_NOTIFICATION_ID",
        "Notification ID मान्य छैन।"
      );
    }

    const session = await ready();

    if (!session.ok) return session;

    const { client, userId } = session.data;

    try {
      const { data, error } = await client
        .from(TABLE)
        .delete()
        .eq("id", id)
        .eq("recipient_id", userId)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return fail(
          "NOTIFICATION_NOT_FOUND",
          "Notification भेटिएन।"
        );
      }

      dispatch("delete", { id });

      return result(
        true,
        "NOTIFICATION_DELETED",
        { id }
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /* =========================================
     STOP REALTIME
  ========================================= */

  async function stopRealtime() {
    const channel = realtimeChannel;
    const client = realtimeClient;

    realtimeChannel = null;
    realtimeClient = null;
    realtimeUserId = "";
    realtimeStarting = false;

    if (channel && client) {
      try {
        await client.removeChannel(channel);
      } catch (error) {
        console.warn(
          "Notification Realtime cleanup failed:",
          error
        );
      }
    }

    return true;
  }

  /* =========================================
     START REALTIME
  ========================================= */

  async function startRealtime() {
    if (realtimeStarting) return false;

    const session = await ready();

    if (!session.ok) {
      await stopRealtime();
      return false;
    }

    const { client, userId } = session.data;

    if (
      realtimeChannel &&
      realtimeClient === client &&
      realtimeUserId === userId
    ) {
      return true;
    }

    await stopRealtime();

    realtimeStarting = true;

    try {
      const channel = client
        .channel(REALTIME_CHANNEL + ":" + userId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLE,
            filter: "recipient_id=eq." + userId
          },
          payload => {
            const eventType = String(
              payload?.eventType || ""
            ).toUpperCase();

            if (eventType === "INSERT") {
              dispatch(
                "add",
                normalizeNotification(payload.new)
              );
            } else if (eventType === "UPDATE") {
              dispatch(
                "update",
                normalizeNotification(payload.new)
              );
            } else if (eventType === "DELETE") {
              dispatch(
                "delete",
                { id: payload.old?.id || "" }
              );
            }
          }
        )
        .subscribe(status => {
          dispatch("realtime-status", null, {
            status
          });
        });

      realtimeChannel = channel;
      realtimeClient = client;
      realtimeUserId = userId;

      return true;

    } catch (error) {
      console.error(
        "Notification Realtime error:",
        error
      );

      return false;

    } finally {
      realtimeStarting = false;
    }
  }

  /* =========================================
     AUTH CHANGES
  ========================================= */

  global.addEventListener("ksk:auth-ready", () => {
    startRealtime();
  });

  global.addEventListener("ksk:auth-change", event => {
    const user = event?.detail?.user;

    if (!user?.id) {
      stopRealtime();
      return;
    }

    startRealtime();
  });

  /* =========================================
     PUBLIC API
  ========================================= */

  global.KSKSupabaseNotifications = Object.freeze({
    initialize: ready,
    getNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    startRealtime,
    stopRealtime
  });

})(window);
