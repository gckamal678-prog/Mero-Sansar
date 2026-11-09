"use strict";

/*
 * =========================================================
 * KSK — MESSAGES PAGE MODULE
 *
 * OWNER:
 * - Conversation list
 * - Individual chat view
 * - Opening conversations
 * - Opening friend conversations
 * - Sending messages
 * - Returning to conversation list
 * - Message page state
 *
 * DEPENDENCIES:
 * - KSKData
 * - KSKLanguage
 * - KSKUtils
 * - KSKUserCard
 * - KSKMessageItem
 * - KSKNavigation
 * - KSKToast
 * - KSKApp
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKMessagesPage) return;

  /* =======================================================
     MODULE STATE
  ======================================================= */

  let activeChatId = null;
  let initialized = false;

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const UTILS = () => global.KSKUtils || null;

  /* =======================================================
     COMMON HELPERS
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

  function getLanguage() {
    return LANG()?.getLanguage?.() || "ne";
  }

  function isEnglish() {
    return getLanguage() === "en";
  }

  function getChats() {
    const chats = DATA()?.getChats?.();

    return Array.isArray(chats) ? chats : [];
  }

  function getFriends() {
    const friends = DATA()?.getFriends?.();

    return Array.isArray(friends) ? friends : [];
  }

  function getProfile() {
    return DATA()?.getProfile?.() || {
      id: "",
      name: ""
    };
  }

  function displayName() {
    return getProfile().name ||
      (isEnglish() ? "You" : "तपाईं");
  }

  function showToast(message, type = "info") {
    const toast = global.KSKToast;

    if (typeof toast?.[type] === "function") {
      toast[type](message);
      return;
    }

    toast?.show?.(message, type);
  }

  function formatTime(value) {
    if (typeof UTILS()?.formatTime === "function") {
      return UTILS().formatTime(value, getLanguage());
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

  /* =======================================================
     AVATAR
  ======================================================= */

  function renderAvatar(chat = {}) {
    if (
      typeof global.KSKUserCard?.renderAvatar === "function"
    ) {
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

  /* =======================================================
     EMPTY STATE
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

    if (typeof messageItem?.render !== "function") {
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

    if (options.activeChatId && !activeChatId) {
      activeChatId = String(options.activeChatId);
    }

    const chats = getChats();

    if (activeChatId) {
      const chat = chats.find(item =>
        String(item.id) === String(activeChatId)
      );

      if (chat) {
        return renderChat(chat);
      }

      activeChatId = null;
    }

    if (!chats.length) {
      return renderEmptyMessages();
    }

    return renderConversationList(chats);
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigateToMessages() {
    const navigation = global.KSKNavigation;

    if (typeof navigation?.navigate === "function") {
      return navigation.navigate("messages", {
        keepChat: true
      });
    }

    global.dispatchEvent(
      new CustomEvent("ksk:navigate", {
        detail: {
          page: "messages",
          options: {
            keepChat: true
          }
        }
      })
    );

    return true;
  }

  function refreshPage() {
    if (
      typeof global.KSKApp?.refreshCurrentPage === "function"
    ) {
      return global.KSKApp.refreshCurrentPage();
    }

    return false;
  }

  /* =======================================================
     OPEN EXISTING CHAT
  ======================================================= */

  function openChat(chatId) {
    const id = String(chatId || "");

    if (!id) return false;

    const chat = getChats().find(item =>
      String(item.id) === id
    );

    if (!chat) {
      showToast(
        isEnglish()
          ? "Conversation not found."
          : "कुराकानी भेटिएन।",
        "warning"
      );

      return false;
    }

    activeChatId = id;

    return navigateToMessages();
  }

  /* =======================================================
     OPEN FRIEND CHAT

     FIX:
     Previously this function was missing.
     It is now properly defined and exported.
  ======================================================= */

  function openFriendChat(friendId) {
    const id = String(friendId || "").trim();

    if (!id) {
      showToast(
        isEnglish()
          ? "Invalid friend."
          : "अमान्य साथी।",
        "warning"
      );

      return false;
    }

    const friend = getFriends().find(item =>
      String(item.id || "") === id
    );

    if (!friend) {
      showToast(
        isEnglish()
          ? "Friend not found."
          : "साथी भेटिएन।",
        "warning"
      );

      return false;
    }

    const data = DATA();

    if (typeof data?.createChat !== "function") {
      showToast(
        isEnglish()
          ? "Chat service is unavailable."
          : "Chat सेवा उपलब्ध छैन।",
        "error"
      );

      return false;
    }

    /*
     * createChat() returns:
     * - Existing chat ID if chat already exists.
     * - New chat ID if a chat is created.
     * - false if creation fails.
     */

    const chatId = data.createChat(friend);

    if (!chatId) {
      showToast(
        isEnglish()
          ? "Could not open this conversation."
          : "कुराकानी खोल्न सकिएन।",
        "error"
      );

      return false;
    }

    activeChatId = String(chatId);

    const navigated = navigateToMessages();

    if (!navigated) {
      activeChatId = null;

      showToast(
        isEnglish()
          ? "Could not open Messages page."
          : "सन्देश पेज खोल्न सकिएन।",
        "error"
      );

      return false;
    }

    return true;
  }

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  function sendMessage(event) {
    event?.preventDefault?.();

    if (!activeChatId) return false;

    const form = event?.target ||
      document.getElementById("kskMessageForm");

    const input = form?.querySelector(
      "#kskMessageInput"
    );

    const message = input?.value.trim();

    if (!message) return false;

    const result = DATA()?.sendMessage?.(
      activeChatId,
      message,
      {
        sender: displayName(),
        fromMe: true
      }
    );

    if (!result) {
      showToast(
        isEnglish()
          ? "Message could not be sent."
          : "सन्देश पठाउन सकिएन।",
        "error"
      );

      return false;
    }

    document
      .getElementById("kskMessageInput")
      ?.focus();

    return true;
  }

  /* =======================================================
     CLOSE CHAT
  ======================================================= */

  function closeChat() {
    activeChatId = null;

    refreshPage();

    return true;
  }

  /* =======================================================
     EVENT HELPERS
  ======================================================= */

  function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  /* =======================================================
     CLICK EVENTS
  ======================================================= */

  function handleClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const openChatButton = target.closest(
      "[data-open-chat]"
    );

    if (openChatButton) {
      stopEvent(event);

      openChat(openChatButton.dataset.openChat);

      return;
    }

    const backButton = target.closest(
      "[data-back-messages]"
    );

    if (backButton) {
      stopEvent(event);

      closeChat();

      return;
    }

    const friendButton = target.closest(
      "[data-message-friend]"
    );

    if (friendButton) {
      stopEvent(event);

      openFriendChat(
        friendButton.dataset.messageFriend
      );
    }
  }

  /* =======================================================
     SUBMIT EVENTS
  ======================================================= */

  function handleSubmit(event) {
    if (event.target?.id !== "kskMessageForm") {
      return;
    }

    stopEvent(event);

    sendMessage(event);
  }

  /* =======================================================
     NAVIGATION STATE
  ======================================================= */

  function handleNavigation(event) {
    const page = event.detail?.page;

    const options = event.detail?.options || {};

    if (page !== "messages") {
      activeChatId = null;
      return;
    }

    if (!options.keepChat) {
      activeChatId = null;
    }
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return true;

    if (!global.document?.addEventListener) {
      return false;
    }

    initialized = true;

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    document.addEventListener(
      "submit",
      handleSubmit,
      true
    );

    global.addEventListener(
      "ksk:navigate",
      handleNavigation
    );

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKMessagesPage = Object.freeze({

    initialize,

    render,

    renderChat,

    renderConversationList,

    openChat,

    openFriendChat,

    closeChat,

    sendMessage,

    getActiveChatId() {
      return activeChatId;
    }

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
