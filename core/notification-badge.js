
"use strict";

/*
 * MERO SANSAR — NOTIFICATION BELL BADGE
 * Version: 2.0.0
 *
 * - Supabase unread notification count
 * - Realtime badge updates
 * - Mark only the opened conversation's message notifications as read
 * - Keep notification page cache in sync
 * - Safe account switching
 */

(function (global) {
  "use strict";

  if (global.KSKNotificationBadge) return;

  const TABLE = "user_notifications";
  const API = () => global.KSKSupabaseNotifications;
  const AUTH = () => global.KSKSupabaseAuth;

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

  let notifications = [];
  let initialized = false;
  let loading = false;
  let loadToken = 0;

  const processedConversations = new Set();

  function getButton() {
    return document.getElementById("notificationsToggle");
  }

  function addStyles() {
    if (document.getElementById("kskNotificationBadgeStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "kskNotificationBadgeStyles";

    style.textContent = `
      #notificationsToggle {
        position: relative;
        overflow: visible;
      }

      #notificationsToggle .ksk-bell-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--color-surface, #fff);
        border-radius: 999px;
        background: #e53935;
        color: #fff;
        font-family: Arial, sans-serif;
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
        pointer-events: none;
        z-index: 5;
      }

      #notificationsToggle .ksk-bell-badge.visible {
        display: inline-flex;
      }
    `;

    document.head.appendChild(style);
  }

  function getUnreadCount() {
    return notifications.filter(item => !item.read).length;
  }

  function render() {
    const button = getButton();
    if (!button) return;

    let badge = button.querySelector(".ksk-bell-badge");

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "ksk-bell-badge";
      badge.setAttribute("aria-hidden", "true");
      button.appendChild(badge);
    }

    const count = getUnreadCount();

    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.toggle("visible", count > 0);

    button.setAttribute(
      "aria-label",
      count > 0
        ? `सूचनाहरू, ${count} नपढिएका सूचना`
        : "सूचनाहरू"
    );

    button.setAttribute(
      "title",
      count > 0
        ? `${count} नपढिएका सूचना`
        : "सूचनाहरू"
    );
  }

  function upsert(item) {
    if (!item?.id) return;

    const index = notifications.findIndex(
      row => String(row.id) === String(item.id)
    );

    if (index >= 0) {
      notifications[index] = item;
    } else {
      notifications.push(item);
    }
  }

  function remove(id) {
    if (!id) return;

    notifications = notifications.filter(
      item => String(item.id) !== String(id)
    );
  }

  async function load() {
    if (loading) return false;

    const api = API();

    if (typeof api?.getNotifications !== "function") {
      render();
      return false;
    }

    const token = ++loadToken;
    loading = true;

    try {
      const response = await api.getNotifications({
        limit: 200
      });

      if (token !== loadToken) return false;

      if (!response?.ok) {
        console.warn(
          "Notification badge load failed:",
          response?.message
        );
        return false;
      }

      notifications = Array.isArray(response.data)
        ? response.data.slice()
        : [];

      render();
      return true;

    } catch (error) {
      console.error("Notification badge:", error);
      return false;

    } finally {
      if (token === loadToken) {
        loading = false;
      }
    }
  }

  function handleCloudChange(event) {
    const detail = event?.detail || {};

    if (detail.collection !== TABLE) return;

    switch (detail.action) {
      case "add":
      case "update":
      case "read":
        if (detail.item) {
          upsert(detail.item);
        }
        break;

      case "delete":
        remove(detail.item?.id);
        break;

      case "mark-all-read":
        notifications = notifications.map(item => ({
          ...item,
          read: true
        }));
        break;

      default:
        break;
    }

    render();
  }

  function handleAuthChange(event) {
    loadToken += 1;
    loading = false;
    notifications = [];
    processedConversations.clear();

    render();

    if (event?.detail?.user?.id) {
      load();
    }
  }

  /*
   * MARK MESSAGE NOTIFICATIONS FOR ONE CONVERSATION
   *
   * केवल:
   * - हाल लगइन भएको प्रयोगकर्ताको सूचना
   * - type = message
   * - entity_id = खुलेको conversation ID
   * - is_read = false
   *
   * अरू notification परिवर्तन हुँदैनन्।
   */

  async function markConversationNotificationsRead(conversationId) {
    const id = String(conversationId || "").trim();

    if (!id) return false;

    const auth = AUTH();

    if (
      typeof auth?.getClient !== "function" ||
      typeof auth?.getUser !== "function"
    ) {
      return false;
    }

    const client = auth.getClient();
    const user = auth.getUser();

    if (!client || !user?.id) return false;

    const requestKey = String(user.id) + ":" + id;

    if (processedConversations.has(requestKey)) {
      /*
       * एउटै खुला कुराकानीका लागि बारम्बार
       * database update नगर्नुहोस्।
       */
      return true;
    }

    try {
      const { data, error } = await client
        .from(TABLE)
        .update({
          is_read: true
        })
        .eq("recipient_id", user.id)
        .eq("type", "message")
        .eq("entity_id", id)
        .eq("is_read", false)
        .select(SELECT_FIELDS);

      if (error) {
        console.warn(
          "Conversation notification read failed:",
          error
        );
        return false;
      }

      processedConversations.add(requestKey);

      const rows = Array.isArray(data) ? data : [];

      rows.forEach(row => {
        const item = {
          id: row.id,
          recipientId: row.recipient_id,
          actorId: row.actor_id || "",
          type: row.type || "message",
          text: row.text || "",
          entityType: row.entity_type || "",
          entityId: row.entity_id || "",
          read: Boolean(row.is_read),
          createdAt: row.created_at,
          time: row.created_at
        };

        /*
         * Badge र Notifications Page दुवैलाई
         * एउटै सफल DB परिणाम पठाउनुहोस्।
         */
        global.dispatchEvent(
          new CustomEvent("ksk:notification-cloud-change", {
            detail: {
              collection: TABLE,
              action: "read",
              item
            }
          })
        );
      });

      render();
      return true;

    } catch (error) {
      console.error(
        "Conversation notification read error:",
        error
      );

      return false;
    }
  }

  /*
   * PATCH MESSENGER OPEN CHAT
   *
   * कुराकानी वास्तवमै सफलतापूर्वक खुलेपछि मात्र
   * सोही conversation का message notifications पढेको बनाइन्छ।
   */

  function patchMessenger() {
    const messenger = global.KSKMessagesPage;

    if (
      !messenger ||
      typeof messenger.openChat !== "function" ||
      messenger.openChat.__kskNotificationReadWrapped
    ) {
      return false;
    }

    const originalOpenChat = messenger.openChat;

    async function openChatWithNotificationRead(conversationId) {
      const opened = await originalOpenChat.apply(
        this,
        arguments
      );

      if (opened === true) {
        await markConversationNotificationsRead(
          conversationId
        );
      }

      return opened;
    }

    openChatWithNotificationRead.__kskNotificationReadWrapped = true;

    /*
     * पुरानो Messenger API का अरू सबै method सुरक्षित राख्नुहोस्।
     */
    global.KSKMessagesPage = Object.freeze({
      ...messenger,
      openChat: openChatWithNotificationRead
    });

    return true;
  }

  function initialize() {
    if (initialized) return true;

    initialized = true;

    addStyles();
    render();

    global.addEventListener(
      "ksk:notification-cloud-change",
      handleCloudChange
    );

    global.addEventListener(
      "ksk:auth-ready",
      load
    );

    global.addEventListener(
      "ksk:auth-change",
      handleAuthChange
    );

    global.addEventListener("pageshow", () => {
      if (!document.hidden) {
        load();
        patchMessenger();
      }
    });

    /*
     * index.html मा Messenger यस फाइलभन्दा पहिले
     * लोड हुने भएकाले यहाँ API उपलब्ध हुन्छ।
     */
    patchMessenger();

    load();

    return true;
  }

  global.KSKNotificationBadge = Object.freeze({
    initialize,
    refresh: load,
    getUnreadCount,
    markConversationNotificationsRead
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})(window);
