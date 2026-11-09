"use strict";

/*
 * =========================================================
 * KSK — NOTIFICATIONS PAGE MODULE
 *
 * OWNER:
 * - Render notification page
 * - Render notification items
 * - Empty notification state
 * - Read / unread display
 * - Mark notifications as read when page opens
 *
 * DATA SOURCE:
 * - KSKData
 *
 * app.js:
 * - Must not render notification HTML.
 * - Must not directly mark notifications as read.
 * - Only coordinates application navigation and rendering.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKNotificationsPage) return;

  let initialized = false;

  /* =======================================================
     DEPENDENCIES
  ======================================================= */

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const UTILS = () => global.KSKUtils || null;

  /* =======================================================
     LANGUAGE
  ======================================================= */

  function isEnglish() {
    return LANG()?.getLanguage?.() === "en";
  }

  function translate(nepali, english) {
    return isEnglish() ? english : nepali;
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function escapeHTML(value = "") {
    if (typeof UTILS()?.escapeHTML === "function") {
      return UTILS().escapeHTML(String(value));
    }

    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function getNotifications() {
    const notifications = DATA()?.getNotifications?.();

    return Array.isArray(notifications)
      ? notifications
      : [];
  }

  function formatNotificationDate(value) {
    if (!value) return "";

    if (typeof UTILS()?.formatDate === "function") {
      return UTILS().formatDate(
        value,
        isEnglish() ? "en" : "ne"
      );
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString(
      isEnglish() ? "en-US" : "ne-NP"
    );
  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  function renderEmptyState() {
    return `
      <div class="empty-state">

        <div class="empty-state-icon">🔔</div>

        <h3 class="empty-state-title">
          ${translate(
            "अहिले कुनै सूचना छैन",
            "No notifications"
          )}
        </h3>

        <p>
          ${translate(
            "नयाँ सूचना आएपछि यहाँ देखिनेछ।",
            "New notifications will appear here."
          )}
        </p>

      </div>
    `;
  }

  /* =======================================================
     SINGLE NOTIFICATION
  ======================================================= */

  function renderNotification(item = {}) {
    const id = escapeHTML(item.id || "");
    const text = escapeHTML(item.text || "");

    const date = escapeHTML(
      formatNotificationDate(
        item.createdAt || item.time
      )
    );

    const isRead = Boolean(item.read);

    const unreadClass = isRead
      ? ""
      : " notification-unread";

    return `
      <article
        class="card notification-item${unreadClass}"
        data-notification-id="${id}"
        aria-label="${escapeHTML(
          translate("सूचना", "Notification")
        )}">

        <div class="notification-content">

          <p>
            ${text}
          </p>

          <small class="post-time">
            ${date}
          </small>

        </div>

      </article>
    `;
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  function render(options = {}) {
    const notifications = Array.isArray(
      options.notifications
    )
      ? options.notifications
      : getNotifications();

    if (!notifications.length) {
      return renderEmptyState();
    }

    return `
      <section class="notifications-page">

        <h3 class="section-title">
          ${translate("सूचनाहरू", "Notifications")}
        </h3>

        <div class="notifications-list">

          ${notifications
            .map(renderNotification)
            .join("")}

        </div>

      </section>
    `;
  }

  /* =======================================================
     MARK AS READ
  ======================================================= */

  function markAllAsRead(options = {}) {
    if (
      typeof DATA()?.markNotificationsRead !== "function"
    ) {
      return false;
    }

    return DATA().markNotificationsRead(options);
  }

  /* =======================================================
     NAVIGATION HANDLER
  ======================================================= */

  function handleNavigation(event) {
    const page = event.detail?.page;

    if (page !== "notifications") {
      return;
    }

    markAllAsRead({ silent: true });
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) {
      return true;
    }

    initialized = true;

    global.addEventListener(
      "ksk:navigate",
      handleNavigation
    );

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKNotificationsPage = Object.freeze({

    initialize,

    render,

    getNotifications,

    renderNotification,

    markAllAsRead

  });

  /* =======================================================
     AUTO INITIALIZATION
  ======================================================= */

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
