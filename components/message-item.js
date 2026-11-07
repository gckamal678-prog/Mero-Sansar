"use strict";

/*
 * =========================================================
 * KSK — MESSAGE ITEM COMPONENT
 *
 * RESPONSIBILITY:
 * - Render one conversation item
 * - Display chat avatar, name and latest message
 * - Connect with app.js chat navigation
 *
 * DOES NOT:
 * - Fetch chat data
 * - Send messages
 * - Manage application state
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKMessageItem) return;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function getAvatar(chat = {}) {
    if (global.KSKUserCard?.renderAvatar) {
      return global.KSKUserCard.renderAvatar({
        name: chat.name || "साथी",
        avatar: chat.avatar || "",
        avatarMediaId: chat.avatarMediaId || ""
      });
    }

    const name = String(chat.name || "").trim();
    const avatar = String(chat.avatar || "").trim();

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(avatar)) {
      return `
        <div class="avatar">
          <img
            src="${escapeHTML(avatar)}"
            alt="${escapeHTML(name)}"
            loading="lazy">
        </div>
      `;
    }

    return `
      <div class="avatar">
        ${escapeHTML(name.charAt(0) || "स")}
      </div>
    `;
  }

  function getLastMessage(chat = {}, isEnglish = false) {
    const messages = Array.isArray(chat.messages)
      ? chat.messages
      : [];

    if (!messages.length) {
      return isEnglish
        ? "Start a conversation"
        : "कुरा सुरु गर्नुहोस्";
    }

    const lastMessage = messages[messages.length - 1];

    return String(
      lastMessage?.text ||
      lastMessage?.content ||
      ""
    );
  }

  function render(chat = {}, options = {}) {
    const id = String(chat.id || "");
    const name = String(chat.name || "").trim();
    const isEnglish = Boolean(options.isEnglish);

    const lastMessage = getLastMessage(
      chat,
      isEnglish
    );

    return `
      <button
        class="card chat-item"
        type="button"
        data-open-chat="${escapeHTML(id)}"
        aria-label="${escapeHTML(name || "साथी")}">

        <div class="flex align-center gap-3">

          ${getAvatar(chat)}

          <div class="flex-column">

            <strong>
              ${escapeHTML(name || "साथी")}
            </strong>

            <span class="text-muted text-small">
              ${escapeHTML(lastMessage)}
            </span>

          </div>

        </div>

      </button>
    `;
  }

  global.KSKMessageItem = Object.freeze({
    render
  });

})(window);
