"use strict";

/*
 * =========================================================
 * KSK — MESSAGES PAGE MODULE
 *
 * RESPONSIBILITY:
 * - Render conversation list
 * - Render individual chat view
 * - Display messages and timestamps
 *
 * DATA SOURCE:
 * - KSKData
 *
 * COMPONENTS:
 * - KSKMessageItem
 * - KSKUserCard
 *
 * IMPORTANT:
 * - Does not send messages.
 * - Does not manage navigation.
 * - Does not modify application state.
 * - Existing app.js continues handling chat actions.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKMessagesPage) return;

  /* =======================================================
     SHARED HELPERS
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

  function getLanguage() {
    return global.KSKLanguage?.getLanguage?.() || "ne";
  }

  function isEnglish() {
    return getLanguage() === "en";
  }

  function getChats() {
    return global.KSKData?.getChats?.() || [];
  }

  function formatTime(value) {
    if (global.KSKUtils?.formatTime) {
      return global.KSKUtils.formatTime(
        value,
        getLanguage()
      );
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  function renderAvatar(chat = {}) {
    if (global.KSKUserCard?.renderAvatar) {
      return global.KSKUserCard.renderAvatar({
        name: chat.name || "साथी",
        avatar: chat.avatar || "",
        avatarMediaId: chat.avatarMediaId || ""
      });
    }

    const name = String(chat.name || "").trim();
    const avatar = String(chat.avatar || "").trim();

    if (
      /^(https?:\/\/|data:image\/|blob:)/i.test(avatar)
    ) {
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

  /* =======================================================
     EMPTY MESSAGE LIST
  ======================================================= */

  function renderEmptyMessages() {
    return `
      <section>
        <div class="empty-state">

          <div class="empty-state-icon">💬</div>

          <h3 class="empty-state-title">
            ${isEnglish()
              ? "No conversations yet"
              : "अहिलेसम्म सन्देश छैन"}
          </h3>

          <p>
            ${isEnglish()
              ? "Add friends to start a conversation."
              : "कुरा सुरु गर्न साथी थप्नुहोस्।"}
          </p>

        </div>
      </section>
    `;
  }

  /* =======================================================
     CONVERSATION LIST
  ======================================================= */

  function renderConversationList(chats) {
    const messageItem = global.KSKMessageItem;

    if (!messageItem?.render) {
      return `
        <div class="empty-state">
          ${isEnglish()
            ? "Messages are unavailable. Please reload the app."
            : "सन्देश सुविधा उपलब्ध छैन। कृपया एप पुनः खोल्नुहोस्।"}
        </div>
      `;
    }

    return `
      <section>

        <h3 class="section-title">
          ${isEnglish() ? "Messages" : "सन्देशहरू"}
        </h3>

        <div class="chat-list">

          ${chats.map(chat =>
            messageItem.render(chat, {
              isEnglish: isEnglish()
            })
          ).join("")}

        </div>

      </section>
    `;
  }

  /* =======================================================
     SINGLE CHAT VIEW
  ======================================================= */

  function renderChat(chat) {
    const messages = Array.isArray(chat.messages)
      ? chat.messages
      : [];

    const messageContent = messages.length
      ? messages.map(message => `
          <div class="chat-message ${
            message.fromMe
              ? "chat-message-mine"
              : ""
          }">

            <p>
              ${escapeHTML(message.text || "")}
            </p>

            <small class="post-time">
              ${escapeHTML(
                formatTime(
                  message.time || message.createdAt
                )
              )}
            </small>

          </div>
        `).join("")
      : `
          <div class="empty-state">
            ${isEnglish()
              ? "Start the conversation."
              : "कुराकानी सुरु गर्नुहोस्।"}
          </div>
        `;

    return `
      <section class="chat-view">

        <div class="chat-heading flex align-center gap-3">

          <button
            class="btn btn-secondary btn-sm"
            type="button"
            data-back-messages
            aria-label="${isEnglish()
              ? "Back to messages"
              : "सन्देश सूचीमा फर्कनुहोस्"}">

            ←

          </button>

          ${renderAvatar(chat)}

          <strong>
            ${escapeHTML(chat.name || "साथी")}
          </strong>

        </div>

        <div class="chat-messages">

          ${messageContent}

        </div>

        <form
          id="kskMessageForm"
          class="chat-form">

          <input
            id="kskMessageInput"
            class="form-input"
            maxlength="2000"
            placeholder="${isEnglish()
              ? "Write a message..."
              : "सन्देश लेख्नुहोस्..."}"
            autocomplete="off"
            required>

          <button
            class="btn btn-primary"
            type="submit">

            ${isEnglish()
              ? "Send"
              : "पठाउनुहोस्"}

          </button>

        </form>

      </section>
    `;
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  function render(options = {}) {
    const chats = getChats();

    const activeChatId = options.activeChatId || null;

    if (activeChatId) {
      const chat = chats.find(item =>
        String(item.id) === String(activeChatId)
      );

      if (chat) {
        return renderChat(chat);
      }
    }

    if (!chats.length) {
      return renderEmptyMessages();
    }

    return renderConversationList(chats);
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKMessagesPage = Object.freeze({

    render,

    renderChat,

    renderConversationList

  });

})(window);
