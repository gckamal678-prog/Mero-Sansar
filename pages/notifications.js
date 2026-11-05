"use strict";

(function (global) {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  global.HamroPages.register("notifications", {
    render() {
      const items = global.HamroData.getNotifications();

      return `
        <section class="hs-page">
          <div class="hs-page-heading">
            <h2>सूचनाहरू</h2>
            <p>तपाईंका नयाँ गतिविधिहरू।</p>
          </div>

          <div class="hs-notification-list">
            ${items.map((item) => `
              <article class="hs-notification ${item.read ? "" : "unread"}">
                <div class="hs-notification-icon">🔔</div>
                <div>
                  <p>${esc(item.text)}</p>
                  <small>${new Date(item.time).toLocaleString("ne-NP")}</small>
                </div>
              </article>
            `).join("") || `<div class="empty-state"><p>नयाँ सूचना छैन।</p></div>`}
          </div>

          <button class="btn btn-secondary" data-hs-action="mark-notifications-read">
            सबै पढिएको बनाउनुहोस्
          </button>
        </section>
      `;
    },

    handle(action) {
      if (action === "mark-notifications-read") {
        global.HamroData.markNotificationsRead();
        global.HamroApp?.refreshPage();
      }
    }
  });
})(window);
