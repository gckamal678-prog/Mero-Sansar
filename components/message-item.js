"use strict";

(function (global) {
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function render(chat) {
    const last = chat.messages?.[chat.messages.length - 1];
    return `
      <button class="hs-message-item" data-hs-action="open-chat"
        data-chat-id="${escape(chat.id)}">
        <div class="avatar">${escape(chat.avatar || chat.name?.charAt(0) || "ह")}</div>
        <div class="hs-message-info">
          <strong>${escape(chat.name || "साथी")}</strong>
          <small>${escape(last?.text || "कुरा सुरु गर्नुहोस्")}</small>
        </div>
        <span class="hs-message-arrow">›</span>
      </button>
    `;
  }

  global.HamroMessageItem = Object.freeze({ render });
})(window);
