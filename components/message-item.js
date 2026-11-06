
"use strict";

/* =========================================================
   KSK MESSAGE ITEM COMPONENT

   Responsibility:
   - Render one conversation item
   - Display chat avatar, name and latest message
   - Provide chat ID for the parent page

   Does NOT:
   - Fetch chat data
   - Send messages
   - Open conversations
   - Manage application state
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKMessageItem) return;

  /* =======================================================
     HTML ESCAPE
  ======================================================= */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  /* =======================================================
     AVATAR
  ======================================================= */

  function getAvatar(chat) {
    const avatar = String(chat.avatar || "").trim();

    if (avatar) {
      return escapeHTML(avatar);
    }

    const name = String(chat.name || "").trim();

    return escapeHTML(name.charAt(0) || "ह");
  }

  /* =======================================================
     LAST MESSAGE
  ======================================================= */

  function getLastMessage(chat) {
    if (!Array.isArray(chat.messages) || !chat.messages.length) {
      return "कुरा सुरु गर्नुहोस्";
    }

    const lastMessage = chat.messages[chat.messages.length - 1];

    return String(
      lastMessage?.text ||
      lastMessage?.content ||
      "कुरा सुरु गर्नुहोस्"
    );
  }

  /* =======================================================
     RENDER MESSAGE ITEM
  ======================================================= */

  function render(chat = {}) {
    const chatId = escapeHTML(chat.id);
    const name = escapeHTML(chat.name || "साथी");
    const avatar = getAvatar(chat);
    const lastMessage = escapeHTML(getLastMessage(chat));

    return `
      <button
        class="ksk-message-item"
        type="button"
        data-ksk-action="open-chat"
        data-chat-id="${chatId}"
        aria-label="${name} सँगको कुराकानी खोल्नुहोस्"
      >
        <div class="avatar">
          ${avatar}
        </div>

        <div class="ksk-message-info">
          <strong>${name}</strong>
          <small>${lastMessage}</small>
        </div>

        <span class="ksk-message-arrow" aria-hidden="true">
          ›
        </span>
      </button>
    `;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKMessageItem = Object.freeze({
    render
  });

})(window);
