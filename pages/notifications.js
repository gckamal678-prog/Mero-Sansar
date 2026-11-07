"use strict";

/*
 * =========================================================
 * KSK — NOTIFICATIONS PAGE MODULE
 *
 * RESPONSIBILITY:
 * - Render notification list
 * - Show empty notification state
 * - Display notification date
 * - Display read/unread status
 *
 * DATA SOURCE:
 * - KSKData
 *
 * IMPORTANT:
 * - Does not create notifications.
 * - Does not mark notifications as read automatically.
 * - Does not manage navigation.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKNotificationsPage) return;

  /* =======================================================
     HELPERS
  ======================================================= */

  function escapeHTML(value) {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function getNotifications() {
    return global.KSKData?.getNotifications?.() || [];
  }

  function formatNotificationDate(value) {
    if (!value) return "";

    if (global.KSKUtils?.formatDate) {
      return global.KSKUtils.formatDate(
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
          ${isEnglish()
            ? "No notifications"
            : "अहिले कुनै सूचना छैन"}
        </h3>

      </div>
    `;
  }

  /* =======================================================
     SINGLE NOTIFICATION
  ======================================================= */

  function renderNotification(item) {
    const text = escapeHTML(item.text || "");

    const date = escapeHTML(
      formatNotificationDate(item.createdAt || item.time)
    );

    const unreadClass = item.read
      ? ""
      : " notification-unread";

    return `
      <article
        class="card notification-item${unreadClass}"
        data-notification-id="${escapeHTML(item.id || "")}">

        <p>
          ${text}
        </p>

        <small class="post-time">
          ${date}
        </small>

      </article>
    `;
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  function render(options = {}) {
    const notifications = Array.isArray(options.notifications)
      ? options.notifications
      : getNotifications();

    if (!notifications.length) {
      return renderEmptyState();
    }

    return `
      <section>

        <h3 class="section-title">
          ${isEnglish()
            ? "Notifications"
            : "सूचनाहरू"}
        </h3>

        <div class="notifications-list">

          ${notifications.map(renderNotification).join("")}

        </div>

      </section>
    `;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKNotificationsPage = Object.freeze({

    render,

    getNotifications,

    renderNotification

  });

})(window);
