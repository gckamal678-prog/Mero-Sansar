
"use strict";

/*
 * MERO SANSAR — FRIEND REQUEST ACTIONS IN NOTIFICATIONS
 * Version: 1.0.0
 *
 * Uses the verified mapping:
 * user_notifications.entity_id = friend_requests.id
 *
 * Only incoming pending requests belonging to the current
 * user receive Accept / Decline actions.
 */

(function (global) {
  "use strict";

  if (global.KSKNotificationFriendActions) return;

  const CLOUD = () => global.KSKSupabaseNotifications;
  const FRIENDS = () => global.KSKSupabaseFriends;
  const PAGE = () => global.KSKNotificationsPage;
  const TOAST = () => global.KSKToast;

  let observer = null;
  let syncTimer = null;
  let syncing = false;
  let syncAgain = false;
  let initialized = false;

  function t(ne, en) {
    return global.KSKLanguage?.getLanguage?.() === "en"
      ? en
      : ne;
  }

  function toast(message, type = "info") {
    const api = TOAST();

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function escapeHTML(value) {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function validId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(String(value || "").trim());
  }

  function notificationCard(id) {
    return document.querySelector(
      `[data-notification-card="${CSS.escape(id)}"]`
    );
  }

  function renderActions(card, notificationId, requestId) {
    if (!card || card.querySelector("[data-friend-request-actions]")) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "ksk-notif-actions";
    wrapper.dataset.friendRequestActions = "true";

    wrapper.innerHTML = `
      <button
        type="button"
        class="ksk-notif-small-btn"
        data-friend-request-action="accept"
        data-notification-id="${escapeHTML(notificationId)}"
        data-request-id="${escapeHTML(requestId)}">
        ${escapeHTML(t("स्वीकार गर्नुहोस्", "Accept"))}
      </button>

      <button
        type="button"
        class="ksk-notif-small-btn"
        data-friend-request-action="reject"
        data-notification-id="${escapeHTML(notificationId)}"
        data-request-id="${escapeHTML(requestId)}">
        ${escapeHTML(t("अस्वीकार गर्नुहोस्", "Decline"))}
      </button>
    `;

    const existingActions = card.querySelector(".ksk-notif-actions");

    if (existingActions) {
      existingActions.appendChild(wrapper);
    } else {
      card.appendChild(wrapper);
    }
  }

  async function syncActions() {
    if (syncing) {
      syncAgain = true;
      return;
    }

    syncing = true;

    try {
      do {
        syncAgain = false;

        const cloud = CLOUD();
        const friends = FRIENDS();

        if (
          typeof cloud?.getNotifications !== "function" ||
          typeof friends?.getDashboard !== "function"
        ) {
          return;
        }

        const [notificationResult, dashboardResult] =
          await Promise.all([
            cloud.getNotifications({ limit: 200 }),
            friends.getDashboard()
          ]);

        if (
          !notificationResult?.ok ||
          !dashboardResult?.ok
        ) {
          return;
        }

        const notifications = notificationResult.data || [];
        const incoming = dashboardResult.data?.incoming || [];

        /*
         * Dashboard बाट आएका request ID मात्र मान्य हुन्छन्।
         * यसले अरू प्रयोगकर्ताको request मा action देखिन दिँदैन।
         */
        const pendingRequests = new Map();

        incoming.forEach(request => {
          const requestId = String(request?.id || "").trim();
          const senderId = String(request?.person?.id || "").trim();

          if (validId(requestId) && validId(senderId)) {
            pendingRequests.set(requestId, senderId);
          }
        });

        notifications.forEach(item => {
          if (
            item?.type !== "friend_request" ||
            item?.entityType !== "friend_request" ||
            item?.read
          ) {
            return;
          }

          const notificationId = String(item.id || "").trim();
          const requestId = String(item.entityId || "").trim();
          const actorId = String(item.actorId || "").trim();

          if (
            !validId(notificationId) ||
            !validId(requestId) ||
            !validId(actorId)
          ) {
            return;
          }

          const pendingSender = pendingRequests.get(requestId);

          /*
           * Notification को actor र वास्तविक request sender
           * एउटै हुनुपर्छ।
           */
          if (!pendingSender || pendingSender !== actorId) {
            return;
          }

          const card = notificationCard(notificationId);

          if (card) {
            renderActions(card, notificationId, requestId);
          }
        });

      } while (syncAgain);

    } catch (error) {
      console.warn("Friend notification action sync failed:", error);
    } finally {
      syncing = false;
    }
  }

  function scheduleSync() {
    if (syncTimer !== null) {
      global.clearTimeout(syncTimer);
    }

    syncTimer = global.setTimeout(() => {
      syncTimer = null;
      syncActions();
    }, 250);
  }

  async function performAction(button) {
    if (!button || button.disabled) return;

    const action = button.dataset.friendRequestAction;
    const notificationId = String(
      button.dataset.notificationId || ""
    ).trim();

    const requestId = String(
      button.dataset.requestId || ""
    ).trim();

    if (
      !["accept", "reject"].includes(action) ||
      !validId(notificationId) ||
      !validId(requestId)
    ) {
      return;
    }

    const friends = FRIENDS();
    const cloud = CLOUD();

    if (typeof friends?.respondToFriendRequest !== "function") {
      toast(
        t("Friends सेवा उपलब्ध छैन।", "Friends service is unavailable."),
        "error"
      );
      return;
    }

    const wrapper = button.closest("[data-friend-request-actions]");
    const buttons = wrapper?.querySelectorAll("button") || [button];

    buttons.forEach(item => {
      item.disabled = true;
    });

    button.textContent = action === "accept"
      ? t("स्वीकार हुँदैछ...", "Accepting...")
      : t("अस्वीकार हुँदैछ...", "Declining...");

    try {
      const status = action === "accept"
        ? "accepted"
        : "rejected";

      const response = await friends.respondToFriendRequest(
        requestId,
        status
      );

      if (!response?.ok) {
        throw new Error(
          response?.message ||
          t("Request पूरा हुन सकेन।", "Could not update request.")
        );
      }

      if (typeof cloud?.markAsRead === "function") {
        await cloud.markAsRead(notificationId);
      }

      toast(
        action === "accept"
          ? t("Friend Request स्वीकार भयो।", "Friend request accepted.")
          : t("Friend Request अस्वीकार भयो।", "Friend request declined."),
        "success"
      );

      wrapper?.remove();

      /*
       * Notification र Friends दुवै सूची अपडेट गर्ने।
       */
      await PAGE()?.loadCloudNotifications?.();

      if (
        global.KSKNavigation?.getCurrentPage?.() === "friends"
      ) {
        await global.KSKFriendsPage?.refresh?.();
      }

      scheduleSync();

    } catch (error) {
      toast(
        error?.message ||
        t("अनुरोध पूरा हुन सकेन।", "Action could not be completed."),
        "error"
      );

      buttons.forEach(item => {
        item.disabled = false;
      });

      button.textContent = action === "accept"
        ? t("स्वीकार गर्नुहोस्", "Accept")
        : t("अस्वीकार गर्नुहोस्", "Decline");
    }
  }

  function handleClick(event) {
    const button = event.target?.closest?.(
      "[data-friend-request-action]"
    );

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    performAction(button);
  }

  function initialize() {
    if (initialized) return true;
    initialized = true;

    document.addEventListener("click", handleClick);

    const startObserver = () => {
      if (!document.body || observer) return;

      observer = new MutationObserver(() => {
        scheduleSync();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      scheduleSync();
    };

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        startObserver,
        { once: true }
      );
    } else {
      startObserver();
    }

    global.addEventListener(
      "ksk:notification-cloud-change",
      scheduleSync
    );

    global.addEventListener(
      "ksk:friends-cloud-change",
      scheduleSync
    );

    global.addEventListener(
      "ksk:auth-ready",
      scheduleSync
    );

    global.addEventListener(
      "ksk:auth-change",
      scheduleSync
    );

    global.addEventListener(
      "ksk:language-change",
      scheduleSync
    );

    return true;
  }

  global.KSKNotificationFriendActions = Object.freeze({
    initialize,
    refresh: scheduleSync
  });

  initialize();

})(window);
