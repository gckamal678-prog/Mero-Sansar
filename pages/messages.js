"use strict";

/* =========================================================
   MERO SANSAR — MESSENGER PAGE
   Supabase API: core/supabase-messages.js
   Friends API: core/supabase-friends.js
   Theme: core/design-system.css
   No voice recorder / audio-video calling.
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKMessagesPage) return;

  const PAGE_SIZE = 50;
  const MAX_MESSAGE = 5000;
  const MAX_GROUP_NAME = 60;

  let initialized = false;
  let initializing = false;
  let listenersAttached = false;

  let conversations = [];
  let friends = [];
  let activeChat = null;
  let activeChatId = null;
  let activeMessages = [];

  let activeTab = "all";
  let searchQuery = "";
  let messageSearchQuery = "";
  let messageSearchResults = [];

  let replyTarget = null;
  let groupFormOpen = false;
  let groupMembersOpen = false;

  let loading = false;
  let loadingOlder = false;
  let sending = false;

  let oldestCursor = null;
  let hasOlderMessages = false;

  let currentUserId = "";
  let chatRequestToken = 0;
  let conversationRequestToken = 0;
  let messageRequestToken = 0;

  let typingTimer = null;
  let typingUsers = new Set();
  let presenceUsers = new Set();

  const mediaUrls = new Map();
  const receiptCache = new Map();
  const receiptLoading = new Set();

  const service = () => global.KSKSupabaseMessages;
  const friendsAPI = () => global.KSKSupabaseFriends;
  const auth = () => global.KSKSupabaseAuth;
  const language = () => global.KSKLanguage;

  function t(ne, en) {
    return language()?.getLanguage?.() === "en" ? en : ne;
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function toast(message, type = "info") {
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else if (typeof api?.show === "function") {
      api.show(message, type);
    } else {
      console.info(message);
    }
  }

  function isPageVisible() {
    return global.KSKNavigation?.getCurrentPage?.() === "messages";
  }

  function refreshPage() {
    if (
      isPageVisible() &&
      typeof global.KSKApp?.refreshCurrentPage === "function"
    ) {
      global.KSKApp.refreshCurrentPage();
      return true;
    }

    global.dispatchEvent(new CustomEvent("ksk:messages-updated"));
    return false;
  }

  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(
      language()?.getLanguage?.() === "en" ? "en-US" : "ne-NP",
      { dateStyle: "short", timeStyle: "short" }
    );
  }

  function getChatName(chat = {}) {
    return String(
      chat.name ||
      chat.title ||
      t("कुराकानी", "Conversation")
    );
  }

  function getFriendName(friend = {}) {
    return String(friend.name || friend.fullName || "साथी");
  }

  function getAvatar(person = {}) {
    const name = getChatName(person);
    const avatar = String(
      person.avatar || person.avatarUrl || ""
    ).trim();

    if (/^https?:\/\//i.test(avatar)) {
      return `
        <span class="ksk-msg-avatar">
          <img src="${escapeHTML(avatar)}"
               alt="${escapeHTML(name)}"
               loading="lazy">
        </span>
      `;
    }

    return `
      <span class="ksk-msg-avatar ksk-msg-avatar-fallback">
        ${escapeHTML(name.charAt(0) || "M")}
      </span>
    `;
  }

  /* =======================================================
     THEME-SAFE STYLES
  ======================================================= */

  function ensureStyles() {
    if (document.getElementById("kskSupabaseMessagesStyles")) return;

    const style = document.createElement("style");
    style.id = "kskSupabaseMessagesStyles";

    style.textContent = `
      .ksk-msg-page {
        width:100%;
        min-width:0;
        box-sizing:border-box;
        color:var(--color-text,#172033);
        color-scheme:light dark;
      }

      .ksk-msg-page *,
      .ksk-msg-page *::before,
      .ksk-msg-page *::after {
        box-sizing:border-box;
      }

      .ksk-msg-toolbar {
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:8px;
        margin:12px 0;
      }

      .ksk-msg-search,
      .ksk-msg-compose,
      .ksk-msg-input {
        width:100%;
        min-width:0;
        padding:12px 14px;
        border:1px solid var(--color-border,#e2e8f0);
        border-radius:13px;
        background:var(--color-surface,#fff);
        color:var(--color-text,#172033);
        font:inherit;
        outline:none;
      }

      .ksk-msg-search::placeholder,
      .ksk-msg-compose::placeholder,
      .ksk-msg-input::placeholder {
        color:var(--color-placeholder,#94a3b8);
        opacity:1;
      }

      .ksk-msg-search:focus,
      .ksk-msg-compose:focus,
      .ksk-msg-input:focus {
        border-color:var(--color-primary,#2563eb);
        box-shadow:var(--focus-ring,0 0 0 3px rgba(37,99,235,.15));
      }

      .ksk-msg-tabs {
        display:flex;
        gap:7px;
        overflow-x:auto;
        padding:3px 0 9px;
        margin:8px 0;
      }

      .ksk-msg-tab,
      .ksk-msg-action,
      .ksk-msg-secondary {
        flex-shrink:0;
        border:1px solid var(--color-border,#e2e8f0);
        border-radius:10px;
        padding:9px 12px;
        background:var(--color-surface,#fff);
        color:var(--color-text,#172033);
        cursor:pointer;
        font:inherit;
        font-size:13px;
      }

      .ksk-msg-back {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:38px;
        height:38px;
        padding:0;
        border-radius:10px;
        font-size:16px;
        margin-bottom:10px;
      }

      .ksk-msg-tab {
        border-radius:30px;
      }

      .ksk-msg-tab.is-active {
        background:var(--color-primary,#2563eb);
        border-color:var(--color-primary,#2563eb);
        color:#fff;
      }

      .ksk-msg-primary {
        border:0;
        border-radius:11px;
        padding:11px 15px;
        background:var(--color-primary,#2563eb);
        color:#fff;
        cursor:pointer;
        font:inherit;
        font-weight:600;
      }

      .ksk-msg-primary:disabled,
      .ksk-msg-secondary:disabled,
      .ksk-msg-action:disabled {
        opacity:.5;
        cursor:not-allowed;
      }

      .ksk-msg-list {
        display:grid;
        gap:9px;
      }

      .ksk-msg-row {
        display:flex;
        align-items:center;
        gap:10px;
        min-width:0;
        padding:11px;
        border:1px solid var(--color-border,#e2e8f0);
        border-radius:14px;
        background:var(--color-surface,#fff);
        color:var(--color-text,#172033);
      }

      .ksk-msg-row-main {
        flex:1;
        min-width:0;
        overflow-wrap:anywhere;
        cursor:pointer;
      }

      .ksk-msg-row-title {
        font-weight:700;
        color:var(--color-text,#172033);
      }

      .ksk-msg-row-subtitle {
        margin-top:4px;
        font-size:13px;
        color:var(--color-muted,#64748b);
        overflow-wrap:anywhere;
      }

      .ksk-msg-avatar {
        width:46px;
        height:46px;
        min-width:46px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:50%;
        background:var(--color-surface-secondary,#f8fafc);
        color:var(--color-text,#172033);
        font-weight:700;
      }

      .ksk-msg-avatar img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .ksk-msg-actions {
        display:flex;
        flex-wrap:wrap;
        gap:5px;
      }

      .ksk-msg-empty,
      .ksk-msg-note {
        padding:18px;
        margin:12px 0;
        border:1px dashed var(--color-border,#e2e8f0);
        border-radius:13px;
        color:var(--color-muted,#64748b);
        text-align:center;
      }

      .ksk-msg-detail,
      .ksk-msg-form {
        min-width:0;
        padding:14px;
        margin-top:12px;
        border:1px solid var(--color-border,#e2e8f0);
        border-radius:17px;
        background:var(--color-surface,#fff);
        color:var(--color-text,#172033);
      }

      .ksk-msg-chat-header {
        display:flex;
        align-items:center;
        gap:10px;
        min-width:0;
        padding-bottom:13px;
        border-bottom:1px solid var(--color-border,#e2e8f0);
      }

      .ksk-msg-chat-header-main {
        flex:1;
        min-width:0;
        overflow-wrap:anywhere;
      }

      .ksk-msg-chat-status {
        margin-top:4px;
        color:var(--color-muted,#64748b);
        font-size:12px;
      }

      .ksk-msg-history {
        display:flex;
        flex-direction:column;
        gap:10px;
        min-width:0;
        height:380px;
        max-height:60vh;
        overflow-y:auto;
        margin:14px 0;
        padding-right:4px;
      }

      .ksk-msg-history-item {
        max-width:88%;
        min-width:80px;
        padding:11px 13px;
        border:1px solid var(--color-border,#e2e8f0);
        border-radius:15px;
        background:var(--color-surface-secondary,#f8fafc);
        color:var(--color-text,#172033);
        overflow-wrap:anywhere;
      }

      .ksk-msg-history-item.from-me {
        align-self:flex-end;
        border-color:#bfdbfe;
        background:#dbeafe;
        color:#172554;
      }

      .ksk-msg-history-item.from-them {
        align-self:flex-start;
      }

      .ksk-msg-history-item.deleted {
        opacity:.75;
        font-style:italic;
      }

      .ksk-msg-history-time {
        display:block;
        margin-top:7px;
        color:inherit;
        opacity:.72;
        font-size:11px;
      }

      .ksk-msg-bubble-actions {
        display:flex;
        flex-wrap:wrap;
        gap:5px;
        margin-top:8px;
      }

      .ksk-msg-bubble-actions button {
        min-height:34px;
        padding:6px 10px;
        border:1px solid rgba(100,116,139,.35);
        border-radius:8px;
        background:rgba(100,116,139,.12);
        color:inherit;
        font:inherit;
        font-size:12px;
        cursor:pointer;
      }

      .ksk-msg-history-item.from-me .ksk-msg-bubble-actions button {
        border-color:rgba(37,99,235,.25);
        background:rgba(37,99,235,.12);
        color:#172554;
      }

      .ksk-msg-send-form {
        display:grid;
        gap:9px;
        margin-top:12px;
      }

      .ksk-msg-compose {
        min-height:70px;
        resize:vertical;
      }

      .ksk-msg-compose-actions {
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:8px;
      }

      .ksk-msg-compose-actions label {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:40px;
        padding:8px 12px;
        border:1px solid var(--color-border,#e2e8f0);
        border-radius:10px;
        background:var(--color-surface,#fff);
        color:var(--color-text,#172033);
        font-size:13px;
        cursor:pointer;
      }

      .ksk-msg-compose-actions input[type=file] {
        display:none;
      }

      .ksk-msg-friend-options {
        display:grid;
        gap:8px;
        max-height:260px;
        overflow:auto;
        margin:12px 0;
      }

      .ksk-msg-friend-option {
        display:flex;
        align-items:center;
        gap:10px;
        padding:10px;
        border-radius:10px;
        background:var(--color-surface-secondary,#f8fafc);
        color:var(--color-text,#172033);
      }

      .ksk-msg-friend-option input {
        width:18px;
        height:18px;
      }

      .ksk-msg-reply-preview {
        padding:10px;
        margin:8px 0;
        border-left:3px solid var(--color-primary,#2563eb);
        border-radius:8px;
        background:var(--color-surface-secondary,#f8fafc);
        color:var(--color-text,#172033);
        font-size:13px;
        overflow-wrap:anywhere;
      }

      .ksk-msg-media {
        display:block;
        max-width:100%;
        max-height:320px;
        margin-top:7px;
        border-radius:10px;
        object-fit:contain;
      }

      .ksk-msg-unread {
        display:inline-flex;
        min-width:19px;
        height:19px;
        padding:0 5px;
        align-items:center;
        justify-content:center;
        border-radius:20px;
        background:var(--color-primary,#2563eb);
        color:#fff;
        font-size:11px;
      }

      .ksk-msg-search-results {
        display:grid;
        gap:8px;
        margin:10px 0;
      }

      .ksk-msg-search-result {
        padding:11px;
        border:1px solid var(--color-border,#e2e8f0);
        border-radius:11px;
        background:var(--color-surface-secondary,#f8fafc);
        color:var(--color-text,#172033);
        overflow-wrap:anywhere;
      }

      .ksk-msg-status {
        margin-left:4px;
        font-size:11px;
        font-weight:700;
      }

      .ksk-msg-hidden {
        display:none !important;
      }

      @media(max-width:520px) {
        .ksk-msg-detail {
          padding:10px;
        }

        .ksk-msg-row {
          flex-wrap:wrap;
        }

        .ksk-msg-row-main {
          flex-basis:calc(100% - 60px);
        }

        .ksk-msg-actions {
          width:100%;
        }

        .ksk-msg-actions .ksk-msg-action {
          flex:1;
        }

        .ksk-msg-history-item {
          max-width:94%;
        }

        .ksk-msg-bubble-actions button {
          flex:1 1 auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function emptyMessage(title, description = "") {
    return `
      <div class="ksk-msg-empty">
        <div style="font-size:27px">💬</div>
        <strong>${escapeHTML(title)}</strong>
        ${description ? `<p>${escapeHTML(description)}</p>` : ""}
      </div>
    `;
  }

  function preference(chat, key) {
    const map = {
      pinned: "isPinned",
      archived: "isArchived",
      muted: "isMuted"
    };
    return Boolean(chat?.[map[key]]);
  }

  /* =======================================================
     DATA LOADING — REQUEST TOKENS PREVENT CHAT MIXUPS
  ======================================================= */

  async function loadFriends() {
    const api = friendsAPI();

    if (!api?.getDashboard) {
      friends = [];
      return false;
    }

    try {
      const result = await api.getDashboard();

      if (!result?.ok) {
        friends = [];
        console.warn("Messenger friends:", result?.message);
        return false;
      }

      friends = Array.isArray(result.data?.friends)
        ? result.data.friends
        : [];

      return true;
    } catch (error) {
      console.warn("Messenger friends:", error);
      friends = [];
      return false;
    }
  }

  async function loadConversations() {
    const token = ++conversationRequestToken;
    loading = true;

    try {
      const api = service();

      if (!api?.getConversations) {
        throw new Error("Messenger सेवा उपलब्ध छैन।");
      }

      const result = await api.getConversations();

      if (!result?.ok) {
        throw new Error(result.message || "कुराकानी लोड गर्न सकिएन।");
      }

      if (token !== conversationRequestToken) return false;

      conversations = Array.isArray(result.data) ? result.data : [];

      if (activeChatId) {
        activeChat = conversations.find(
          item => String(item.id) === String(activeChatId)
        ) || null;

        if (!activeChat) {
          activeChatId = null;
          activeMessages = [];
          ++chatRequestToken;
        }
      }

      return true;
    } catch (error) {
      if (token === conversationRequestToken) {
        console.error("Messenger conversations:", error);
        toast(error.message, "error");
      }
      return false;
    } finally {
      if (token === conversationRequestToken) loading = false;
    }
  }

  async function loadReceipts(messages) {
    const api = service();
    if (!api?.getMessageReceipts) return;

    const outgoing = messages.filter(
      message => message.fromMe && message.id
    );

    const pending = outgoing.filter(
      message =>
        !receiptCache.has(message.id) &&
        !receiptLoading.has(message.id)
    );

    await Promise.all(pending.map(async message => {
      receiptLoading.add(message.id);

      try {
        const result = await api.getMessageReceipts(message.id);
        if (result?.ok) {
          receiptCache.set(message.id, Array.isArray(result.data) ? result.data : []);
        }
      } catch (error) {
        console.warn("Message receipt:", error);
      } finally {
        receiptLoading.delete(message.id);
      }
    }));
  }

  async function loadMessages(conversationId, options = {}) {
    const id = String(conversationId || "");
    const token = options.token || messageRequestToken;

    const result = await service().getMessages(id, {
      limit: options.limit || PAGE_SIZE,
      before: options.before || undefined
    });

    if (!result?.ok) {
      throw new Error(result.message || "सन्देश लोड गर्न सकिएन।");
    }

    if (
      token !== messageRequestToken ||
      id !== String(activeChatId || "")
    ) {
      return false;
    }

    const rows = Array.isArray(result.data) ? result.data : [];

    if (options.append) {
      const existing = new Set(activeMessages.map(item => item.id));

      activeMessages = [
        ...rows.filter(item => !existing.has(item.id)),
        ...activeMessages
      ];
    } else {
      activeMessages = rows;
    }

    oldestCursor = activeMessages.length
      ? {
          createdAt: activeMessages[0].createdAt,
          id: activeMessages[0].id
        }
      : null;

    hasOlderMessages = rows.length >= (options.limit || PAGE_SIZE);

    await loadReceipts(rows);

    return true;
  }

  async function loadOlderMessages() {
    if (
      !activeChatId ||
      !oldestCursor ||
      !hasOlderMessages ||
      loadingOlder
    ) return false;

    const history = document.querySelector(".ksk-msg-history");

    const previousHeight = history?.scrollHeight || 0;
    const previousTop = history?.scrollTop || 0;

    loadingOlder = true;

    const id = activeChatId;
    const token = messageRequestToken;

    try {
      const beforeCount = activeMessages.length;

      const ok = await loadMessages(id, {
        limit: PAGE_SIZE,
        before: oldestCursor,
        append: true,
        token
      });

      if (!ok) return false;

      if (activeMessages.length === beforeCount) {
        hasOlderMessages = false;
        return false;
      }

      refreshPage();

      requestAnimationFrame(() => {
        const updatedHistory = document.querySelector(
          ".ksk-msg-history"
        );

        if (!updatedHistory) return;

        const addedHeight =
          updatedHistory.scrollHeight - previousHeight;

        updatedHistory.scrollTop = previousTop + addedHeight;
      });

      return true;
    } catch (error) {
      toast(error.message, "error");
      return false;
    } finally {
      loadingOlder = false;
    }
  }

  /* =======================================================
     CONVERSATION LIST
  ======================================================= */

  function getVisibleChats() {
    const query = searchQuery.trim().toLowerCase();

    return conversations
      .filter(chat => {
        const archived = preference(chat, "archived");

        if (activeTab === "archived" && !archived) return false;
        if (activeTab !== "archived" && archived) return false;

        if (activeTab === "groups" && chat.type !== "group") return false;
        if (activeTab === "pinned" && !preference(chat, "pinned")) return false;

        if (
          query &&
          !getChatName(chat).toLowerCase().includes(query)
        ) return false;

        return true;
      })
      .sort((a, b) => {
        const ap = preference(a, "pinned") ? 1 : 0;
        const bp = preference(b, "pinned") ? 1 : 0;

        if (activeTab !== "archived" && ap !== bp) return bp - ap;

        return new Date(b.lastMessageAt || b.createdAt || 0) -
          new Date(a.lastMessageAt || a.createdAt || 0);
      });
  }

  function hasUnread(chat) {
    if (!chat?.lastMessage || chat.lastMessage.fromMe) return false;

    const readAt = chat.lastReadAt
      ? new Date(chat.lastReadAt).getTime()
      : 0;

    const messageAt = new Date(
      chat.lastMessage.createdAt || 0
    ).getTime();

    return Number.isFinite(messageAt) && messageAt > readAt;
  }

  function renderChatRow(chat) {
    const id = String(chat.id);
    const name = getChatName(chat);
    const last = chat.lastMessage?.text ||
      (chat.lastMessage?.type
        ? "📎 " + chat.lastMessage.type
        : t("कुराकानी खोल्नुहोस्", "Open conversation"));

    return `
      <article class="ksk-msg-row">
        ${getAvatar(chat)}

        <div class="ksk-msg-row-main"
             role="button"
             tabindex="0"
             data-action="open-chat"
             data-id="${escapeHTML(id)}">

          <div class="ksk-msg-row-title">
            ${escapeHTML(name)}
            ${chat.type === "group" ? " 👥" : ""}
            ${preference(chat, "pinned") ? " 📌" : ""}
            ${preference(chat, "muted") ? " 🔕" : ""}
            ${hasUnread(chat)
              ? `<span class="ksk-msg-unread" aria-label="Unread message">●</span>`
              : ""}
          </div>

          <div class="ksk-msg-row-subtitle">
            ${escapeHTML(String(last).slice(0, 100))}
          </div>
        </div>

        <div class="ksk-msg-actions">
          <button class="ksk-msg-action"
                  type="button"
                  data-action="toggle-pin"
                  data-id="${escapeHTML(id)}">
            ${preference(chat, "pinned") ? "Unpin" : "Pin"}
          </button>

          <button class="ksk-msg-action"
                  type="button"
                  data-action="toggle-archive"
                  data-id="${escapeHTML(id)}">
            ${preference(chat, "archived") ? "Restore" : "Archive"}
          </button>

          <button class="ksk-msg-action"
                  type="button"
                  data-action="toggle-mute"
                  data-id="${escapeHTML(id)}">
            ${preference(chat, "muted") ? "Unmute" : "Mute"}
          </button>
        </div>
      </article>
    `;
  }

  function renderTab(id, label) {
    return `
      <button type="button"
              class="ksk-msg-tab ${activeTab === id ? "is-active" : ""}"
              data-action="set-tab"
              data-tab="${id}">
        ${escapeHTML(label)}
      </button>
    `;
  }

  function renderConversationList() {
    const chats = getVisibleChats();

    const title = activeTab === "groups"
      ? t("Group कुराकानी", "Group conversations")
      : activeTab === "pinned"
        ? t("Pin गरिएका कुराकानी", "Pinned conversations")
        : activeTab === "archived"
          ? t("Archive गरिएका कुराकानी", "Archived conversations")
          : t("कुराकानीहरू", "Conversations");

    return `
      <section class="ksk-msg-page">
        <h3>${escapeHTML(title)}</h3>

        <div class="ksk-msg-toolbar">
          <input class="ksk-msg-search"
                 type="search"
                 data-message-search
                 value="${escapeHTML(searchQuery)}"
                 placeholder="${escapeHTML(t(
                   "कुराकानी खोज्नुहोस्...",
                   "Search conversations..."
                 ))}">

          <button class="ksk-msg-primary"
                  type="button"
                  data-action="open-group-form">
            + ${escapeHTML(t("Group", "Group"))}
          </button>
        </div>

        <div class="ksk-msg-tabs">
          ${renderTab("all", t("सबै", "All"))}
          ${renderTab("pinned", "📌 Pin")}
          ${renderTab("archived", "Archive")}
          ${renderTab("groups", "Groups")}
        </div>

        ${loading
          ? emptyMessage(t("लोड हुँदैछ...", "Loading..."))
          : chats.length
            ? `<div class="ksk-msg-list">${chats.map(renderChatRow).join("")}</div>`
            : emptyMessage(
                t("कुराकानी छैन", "No conversations"),
                t(
                  "साथीसँग नयाँ कुराकानी सुरु गर्न सक्नुहुन्छ।",
                  "Start a conversation with a friend."
                )
              )}

        ${groupFormOpen ? renderGroupForm() : ""}
      </section>
    `;
  }

  function renderGroupForm() {
    if (!friends.length) {
      return emptyMessage(
        t("साथी भेटिएनन्", "No friends found"),
        t(
          "Group बनाउन पहिले साथी हुनुपर्छ।",
          "Add friends before creating a group."
        )
      );
    }

    return `
      <form class="ksk-msg-form" data-group-form>
        <strong>${escapeHTML(t("नयाँ Group बनाउनुहोस्", "Create a group"))}</strong>

        <input class="ksk-msg-input"
               type="text"
               name="groupName"
               maxlength="${MAX_GROUP_NAME}"
               required
               placeholder="${escapeHTML(t("Group को नाम", "Group name"))}">

        <div class="ksk-msg-friend-options">
          ${friends.map(friend => `
            <label class="ksk-msg-friend-option">
              <input type="checkbox"
                     name="memberIds"
                     value="${escapeHTML(friend.id)}">
              ${escapeHTML(getFriendName(friend))}
            </label>
          `).join("")}
        </div>

        <button class="ksk-msg-primary" type="submit">
          ${escapeHTML(t("Group बनाउनुहोस्", "Create group"))}
        </button>

        <button class="ksk-msg-secondary"
                type="button"
                data-action="close-group">
          ${escapeHTML(t("बन्द गर्नुहोस्", "Close"))}
        </button>
      </form>
    `;
  }

  /* =======================================================
     RECEIPTS AND MEDIA
  ======================================================= */

  function getMessageStatus(message) {
    if (!message.fromMe) return "";

    const receipts = receiptCache.get(message.id) ||
      message.receipts ||
      [];

    if (receipts.some(item => item.read_at || item.readAt)) {
      return "✓✓ Read";
    }

    if (receipts.some(item => item.delivered_at || item.deliveredAt)) {
      return "✓✓ Delivered";
    }

    return "✓ Sent";
  }

  async function getMediaUrl(path) {
    if (!path) return "";
    if (mediaUrls.has(path)) return mediaUrls.get(path);

    const result = await service().getMediaUrl(path);

    if (!result?.ok || !result.data) return "";

    mediaUrls.set(path, result.data);
    return result.data;
  }

  function renderMessageMedia(message) {
    if (!message.mediaPath) return "";

    const url = mediaUrls.get(message.mediaPath);

    if (!url) {
      if (!message._mediaLoading) {
        message._mediaLoading = true;

        getMediaUrl(message.mediaPath)
          .then(() => refreshPage())
          .catch(error => console.warn("Media URL:", error));
      }

      return `
        <div class="ksk-msg-note">
          ${escapeHTML(t("Media लोड हुँदैछ...", "Loading media..."))}
        </div>
      `;
    }

    if (message.type === "image") {
      return `
        <a href="${escapeHTML(url)}"
           target="_blank"
           rel="noopener noreferrer">
          <img class="ksk-msg-media"
               src="${escapeHTML(url)}"
               alt="${escapeHTML(message.mediaName || "Image")}"
               loading="lazy">
        </a>
      `;
    }

    if (message.type === "video") {
      return `
        <video class="ksk-msg-media"
               controls
               preload="metadata"
               src="${escapeHTML(url)}"></video>
      `;
    }

    return `
      <a href="${escapeHTML(url)}"
         target="_blank"
         rel="noopener noreferrer"
         download="${escapeHTML(message.mediaName || "file")}">
        📎 ${escapeHTML(message.mediaName || "Download file")}
      </a>
    `;
  }

  function renderReplyPreview(message) {
    if (!message.replyToId) return "";

    const original = activeMessages.find(
      item => item.id === message.replyToId
    );

    return `
      <div class="ksk-msg-reply-preview">
        ↪ ${escapeHTML(
          original?.text ||
          t("जवाफ दिइएको सन्देश", "Replied message")
        )}
      </div>
    `;
  }

  function renderChatMessage(message) {
    const mine = Boolean(message.fromMe);
    const deleted = Boolean(message.deletedForEveryone);
    const content = deleted
      ? t("यो सन्देश हटाइएको छ।", "This message was deleted.")
      : message.text || "";

    return `
      <div class="ksk-msg-history-item
                  ${mine ? "from-me" : "from-them"}
                  ${deleted ? "deleted" : ""}"
           data-message-id="${escapeHTML(message.id)}">

        ${renderReplyPreview(message)}

        ${escapeHTML(content)}

        ${!deleted ? renderMessageMedia(message) : ""}

        <small class="ksk-msg-history-time">
          ${escapeHTML(formatTime(message.createdAt))}
          ${message.editedAt ? " · Edited" : ""}
          ${mine
            ? `<span class="ksk-msg-status">${escapeHTML(getMessageStatus(message))}</span>`
            : ""}
        </small>

        ${!deleted ? `
          <div class="ksk-msg-bubble-actions">
            ${mine ? `
              <button type="button"
                      data-action="edit-message"
                      data-id="${escapeHTML(message.id)}">Edit</button>
              <button type="button"
                      data-action="delete-message"
                      data-id="${escapeHTML(message.id)}">Delete</button>
            ` : ""}

            <button type="button"
                    data-action="reply-message"
                    data-id="${escapeHTML(message.id)}">Reply</button>

            <button type="button"
                    data-action="copy-message"
                    data-id="${escapeHTML(message.id)}">Copy</button>

            <button type="button"
                    data-action="forward-message"
                    data-id="${escapeHTML(message.id)}">Forward</button>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderSearchResults() {
    if (!messageSearchResults.length) return "";

    return `
      <div class="ksk-msg-search-results">
        ${messageSearchResults.map(message => `
          <div class="ksk-msg-search-result">
            <div>${escapeHTML(message.text || "📎 Media")}</div>
            <small>${escapeHTML(formatTime(message.createdAt))}</small>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* =======================================================
     GROUP MEMBERS
  ======================================================= */

  function renderGroupMemberControls(chat) {
    if (chat.type !== "group") return "";

    const canManage = ["owner", "admin"].includes(chat.role);

    return `
      <div class="ksk-msg-toolbar">
        <button class="ksk-msg-secondary"
                type="button"
                data-action="toggle-group-members">
          ${escapeHTML(t("Group सदस्य", "Group members"))}
        </button>

        ${canManage ? `
          <button class="ksk-msg-secondary"
                  type="button"
                  data-action="add-group-members">
            + ${escapeHTML(t("सदस्य थप्नुहोस्", "Add members"))}
          </button>
        ` : ""}
      </div>

      ${groupMembersOpen ? `
        <div class="ksk-msg-form">
          ${(chat.members || []).map(member => `
            <div class="ksk-msg-row">
              <div class="ksk-msg-row-main">
                <strong>${escapeHTML(member.name || "सदस्य")}</strong>
                <div class="ksk-msg-row-subtitle">
                  ${escapeHTML(member.role || "member")}
                </div>
              </div>

              ${canManage &&
                member.id !== currentUserId &&
                member.role !== "owner" ? `
                <button class="ksk-msg-action"
                        type="button"
                        data-action="remove-group-member"
                        data-id="${escapeHTML(member.id)}">
                  Remove
                </button>
              ` : ""}
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  }

  function renderReplyComposer() {
    if (!replyTarget) return "";

    return `
      <div class="ksk-msg-reply-preview">
        ${escapeHTML(replyTarget.text || "📎 Media")}
        <button type="button"
                data-action="cancel-reply"
                style="float:right">✕</button>
      </div>
    `;
  }

  /* =======================================================
     CHAT VIEW
  ======================================================= */

  function renderChat(chat = activeChat) {
    if (!chat) return renderConversationList();

    const person = chat.members?.find(
      member => member.id !== currentUserId
    );

    const online = person && presenceUsers.has(person.id);

    return `
      <section class="ksk-msg-page">
        <button class="ksk-msg-secondary ksk-msg-back"
                type="button"
                data-action="back"
                aria-label="Back"
                title="Back">
          ←
        </button>

        <div class="ksk-msg-detail">
          <div class="ksk-msg-chat-header">
            <button type="button"
                    class="ksk-msg-secondary"
                    data-action="open-chat-profile"
                    data-id="${escapeHTML(person?.id || "")}">
              ${getAvatar(chat)}
            </button>

            <div class="ksk-msg-chat-header-main">
              <strong>${escapeHTML(getChatName(chat))}</strong>

              <div class="ksk-msg-chat-status">
                ${chat.type === "group"
                  ? `${(chat.members || []).length} ${t("सदस्य", "members")}`
                  : online
                    ? t("Online", "Online")
                    : escapeHTML(person?.lastSeenAt
                      ? t("अन्तिम पटक: ", "Last seen: ") + formatTime(person.lastSeenAt)
                      : t("अहिले Offline", "Offline"))
                }
                <span data-typing-indicator>
                  ${typingUsers.size
                    ? escapeHTML(t(" · लेख्दै हुनुहुन्छ...", " · typing..."))
                    : ""}
                </span>
              </div>
            </div>

            ${chat.type === "direct" ? `
              <button class="ksk-msg-secondary"
                      type="button"
                      data-action="block-user"
                      data-id="${escapeHTML(person?.id || "")}">
                Block
              </button>
            ` : ""}
          </div>

          ${renderGroupMemberControls(chat)}

          <div class="ksk-msg-toolbar">
            <input class="ksk-msg-search"
                   type="search"
                   data-message-content-search
                   value="${escapeHTML(messageSearchQuery)}"
                   placeholder="${escapeHTML(t(
                     "यो कुराकानीमा सन्देश खोज्नुहोस्",
                     "Search messages in this chat"
                   ))}">

            <button class="ksk-msg-secondary"
                    type="button"
                    data-action="search-messages">
              ${escapeHTML(t("खोज्नुहोस्", "Search"))}
            </button>
          </div>

          ${renderSearchResults()}

          <div class="ksk-msg-history" aria-live="polite">
            ${activeMessages.length
              ? activeMessages.map(renderChatMessage).join("")
              : emptyMessage(t("सन्देश छैन", "No messages yet"))}
          </div>

          ${renderReplyComposer()}

          <form class="ksk-msg-send-form" data-send-form>
            <textarea class="ksk-msg-compose"
                      name="message"
                      maxlength="${MAX_MESSAGE}"
                      placeholder="${escapeHTML(t(
                        "सन्देश लेख्नुहोस्...",
                        "Write a message..."
                      ))}"></textarea>

            <div class="ksk-msg-compose-actions">
              <label>
                📎 ${escapeHTML(t("फाइल", "File"))}
                <input type="file"
                       data-media-file
                       accept="image/*,video/*,.pdf,.doc,.docx">
              </label>

              <button class="ksk-msg-primary"
                      type="submit"
                      ${sending ? "disabled" : ""}>
                ${sending
                  ? escapeHTML(t("पठाउँदै...", "Sending..."))
                  : escapeHTML(t("पठाउनुहोस्", "Send"))}
              </button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  function render() {
    ensureStyles();

    if (activeChatId && activeChat) {
      return renderChat(activeChat);
    }

    return renderConversationList();
  }

  /* =======================================================
     OPEN / CLOSE CHAT
  ======================================================= */

  async function openChat(chatId) {
    const id = String(chatId || "");

    const chat = conversations.find(
      item => String(item.id) === id
    );

    if (!chat) {
      toast(t("कुराकानी भेटिएन।", "Conversation not found."), "warning");
      return false;
    }

    const token = ++chatRequestToken;
    ++messageRequestToken;

    activeChatId = id;
    activeChat = chat;
    activeMessages = [];

    replyTarget = null;
    messageSearchResults = [];
    messageSearchQuery = "";

    oldestCursor = null;
    hasOlderMessages = false;

    presenceUsers.clear();
    typingUsers.clear();
    groupMembersOpen = false;

    global.clearTimeout(typingTimer);
    service()?.stopPresence?.();

    refreshPage();

    try {
      const messageToken = messageRequestToken;

      const ok = await loadMessages(id, {
        limit: PAGE_SIZE,
        token: messageToken
      });

      if (!ok || token !== chatRequestToken) return false;

      requestAnimationFrame(() => {
        const history = document.querySelector(".ksk-msg-history");

        if (history) {
          history.scrollTop = history.scrollHeight;
        }
      });

      const readResult = await service().markRead(id);

      if (token !== chatRequestToken) return false;

      if (!readResult?.ok) {
        console.warn("Messenger markRead:", readResult?.message);
      }

      await service().startPresence(id);

      if (token !== chatRequestToken) return false;

      await loadConversations();

      refreshPage();
      return true;
    } catch (error) {
      if (token === chatRequestToken) {
        toast(error.message, "error");
      }
      return false;
    }
  }

  async function openFriendChat(friendId) {
    const id = String(friendId || "").trim();
    if (!id) return false;

    const existing = conversations.find(chat =>
      chat.type === "direct" &&
      chat.members?.some(member => String(member.id) === id)
    );

    if (existing) return openChat(existing.id);

    const result = await service().createDirectChat(id);

    if (!result?.ok) {
      toast(result.message || t(
        "कुराकानी सुरु गर्न सकिएन।",
        "Could not start conversation."
      ), "error");
      return false;
    }

    await loadConversations();

    const created = conversations.find(
      chat => String(chat.id) === String(result.data)
    );

    return created
      ? openChat(created.id)
      : false;
  }

  function closeChat() {
    ++chatRequestToken;
    ++messageRequestToken;

    activeChatId = null;
    activeChat = null;
    activeMessages = [];

    replyTarget = null;
    messageSearchResults = [];
    messageSearchQuery = "";

    presenceUsers.clear();
    typingUsers.clear();

    global.clearTimeout(typingTimer);
    service()?.stopPresence?.();

    refreshPage();
    return true;
  }

  /* =======================================================
     CHAT PREFERENCES
  ======================================================= */

  async function updatePreference(id, key, value) {
    const chat = conversations.find(
      item => String(item.id) === String(id)
    );

    if (!chat) return false;

    const column = {
      pinned: "is_pinned",
      archived: "is_archived",
      muted: "is_muted"
    }[key];

    if (!column) return false;

    const result = await service().updateChatPreferences(id, {
      [column]: Boolean(value)
    });

    if (!result?.ok) {
      toast(result.message || t(
        "सेटिङ परिवर्तन गर्न सकिएन।",
        "Could not update preference."
      ), "error");
      return false;
    }

    await loadConversations();
    refreshPage();
    return true;
  }

  /* =======================================================
     GROUP ACTIONS
  ======================================================= */

  async function createGroup(form) {
    const name = String(
      form.querySelector('[name="groupName"]')?.value || ""
    ).trim();

    const selected = Array.from(
      form.querySelectorAll('input[name="memberIds"]:checked')
    ).map(input => input.value);

    if (!name || selected.length < 2) {
      toast(t(
        "Group को नाम लेखेर कम्तीमा दुई साथी छान्नुहोस्।",
        "Enter a group name and select at least two friends."
      ), "warning");
      return false;
    }

    const result = await service().createGroup(selected, name);

    if (!result?.ok) {
      toast(result.message || "Group बनाउन सकिएन।", "error");
      return false;
    }

    groupFormOpen = false;
    activeTab = "groups";

    await loadConversations();
    refreshPage();

    toast(t("Group सफलतापूर्वक बन्यो।", "Group created."), "success");
    return true;
  }

  async function addGroupMembers() {
    if (!activeChat || activeChat.type !== "group") return false;

    const available = friends.filter(friend =>
      !activeChat.members?.some(
        member => String(member.id) === String(friend.id)
      )
    );

    if (!available.length) {
      toast(t("थप्न मिल्ने साथी छैनन्।", "No friends available to add."), "warning");
      return false;
    }

    const labels = available.map((friend, index) =>
      `${index + 1}. ${getFriendName(friend)}`
    ).join("\n");

    const answer = global.prompt(
      t("थप्ने साथीको नम्बर लेख्नुहोस्:\n", "Enter the friend's number:\n") +
      labels
    );

    if (answer === null) return false;

    const friend = available[Number(answer) - 1];

    if (!friend) {
      toast(t("सही विकल्प छान्नुहोस्।", "Choose a valid option."), "warning");
      return false;
    }

    const result = await service().manageGroupMember(
      activeChatId,
      "add",
      friend.id
    );

    if (!result?.ok) {
      toast(result.message || "सदस्य थप्न सकिएन।", "error");
      return false;
    }

    await loadConversations();
    refreshPage();
    return true;
  }

  async function removeGroupMember(memberId) {
    if (!global.confirm(t(
      "यो सदस्यलाई Group बाट हटाउने?",
      "Remove this member from the group?"
    ))) return false;

    const result = await service().manageGroupMember(
      activeChatId,
      "remove",
      memberId
    );

    if (!result?.ok) {
      toast(result.message || "सदस्य हटाउन सकिएन।", "error");
      return false;
    }

    await loadConversations();
    refreshPage();
    return true;
  }

  /* =======================================================
     SEND / UPLOAD / EDIT / DELETE
  ======================================================= */

  async function sendTextMessage(form) {
    if (sending || !activeChatId) return false;

    const id = activeChatId;
    const token = chatRequestToken;

    const input = form.querySelector('[name="message"]');
    const content = String(input?.value || "").trim();

    if (!content) return false;

    sending = true;
    refreshPage();

    try {
      const result = replyTarget
        ? await service().replyMessage(
            id,
            content,
            replyTarget.id
          )
        : await service().sendMessage(id, content);

      if (!result?.ok) {
        throw new Error(result.message || "सन्देश पठाउन सकिएन।");
      }

      if (token !== chatRequestToken || id !== activeChatId) return true;

      replyTarget = null;

      await loadMessages(id, { token: messageRequestToken });
      await loadConversations();

      requestAnimationFrame(() => {
        const history = document.querySelector(".ksk-msg-history");

        if (history) {
          history.scrollTop = history.scrollHeight;
        }
      });

      return true;
    } catch (error) {
      toast(error.message, "error");
      return false;
    } finally {
      sending = false;
      refreshPage();
    }
  }

  async function uploadSelectedMedia(file) {
    if (!file || !activeChatId) return false;

    const id = activeChatId;
    const token = chatRequestToken;

    const result = await service().uploadMedia(id, file);

    if (!result?.ok) {
      toast(result.message || "फाइल पठाउन सकिएन।", "error");
      return false;
    }

    if (token !== chatRequestToken || id !== activeChatId) return true;

    await loadMessages(id, { token: messageRequestToken });
    await loadConversations();

    refreshPage();
    toast(t("फाइल पठाइयो।", "File sent."), "success");
    return true;
  }

  async function editMessage(id) {
    const message = activeMessages.find(item => item.id === id);
    if (!message || !message.fromMe) return false;

    const next = global.prompt(
      t("सन्देश सम्पादन गर्नुहोस्", "Edit message"),
      message.text || ""
    );

    if (next === null) return false;

    if (!String(next).trim()) {
      toast(t("खाली सन्देश राख्न मिल्दैन।", "Message cannot be empty."), "warning");
      return false;
    }

    const result = await service().editMessage(id, next);

    if (!result?.ok) {
      toast(result.message || "सम्पादन गर्न सकिएन।", "error");
      return false;
    }

    await loadMessages(activeChatId);
    refreshPage();
    return true;
  }

  async function deleteMessage(id) {
    if (!global.confirm(t(
      "यो सन्देश सबैका लागि हटाउने?",
      "Delete this message for everyone?"
    ))) return false;

    const result = await service().deleteMessage(id, true);

    if (!result?.ok) {
      toast(result.message || "हटाउन सकिएन।", "error");
      return false;
    }

    await loadMessages(activeChatId);
    refreshPage();
    return true;
  }

  async function copyMessage(id) {
    const message = activeMessages.find(item => item.id === id);
    const result = await service().copyMessage(id);

    if (result?.ok) {
      toast(t("Copy भयो।", "Copied."), "success");
      return true;
    }

    if (message?.text && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(message.text);
        toast(t("Copy भयो।", "Copied."), "success");
        return true;
      } catch (_) {}
    }

    toast(result?.message || "Copy गर्न सकिएन।", "error");
    return false;
  }

  function replyMessage(id) {
    const message = activeMessages.find(item => item.id === id);
    if (!message) return false;

    replyTarget = message;
    refreshPage();

    document.querySelector('[name="message"]')?.focus();
    return true;
  }

  async function forwardMessage(id) {
    const options = conversations.filter(
      chat => String(chat.id) !== String(activeChatId)
    );

    if (!options.length) {
      toast(t(
        "Forward गर्ने अर्को कुराकानी छैन।",
        "No other conversation available."
      ), "warning");
      return false;
    }

    const labels = options.map((chat, index) =>
      `${index + 1}. ${getChatName(chat)}`
    ).join("\n");

    const answer = global.prompt(
      t(
        "कुन कुराकानीमा Forward गर्ने? नम्बर लेख्नुहोस्:\n",
        "Forward to which conversation? Enter number:\n"
      ) + labels
    );

    if (answer === null) return false;

    const target = options[Number(answer) - 1];

    if (!target) {
      toast(t("सही विकल्प छान्नुहोस्।", "Choose a valid option."), "warning");
      return false;
    }

    const result = await service().forwardMessage(id, target.id);

    if (!result?.ok) {
      toast(result.message || "Forward गर्न सकिएन।", "error");
      return false;
    }

    toast(t("Forward भयो।", "Forwarded."), "success");
    return true;
  }

  /* =======================================================
     SEARCH / BLOCK / PROFILE
  ======================================================= */

  async function searchMessages() {
    if (!activeChatId) return false;

    const input = document.querySelector("[data-message-content-search]");
    messageSearchQuery = String(input?.value || "").trim();

    if (messageSearchQuery.length < 2) {
      toast(t("कम्तीमा दुई अक्षर लेख्नुहोस्।", "Enter at least two characters."), "warning");
      return false;
    }

    const result = await service().searchMessages(
      activeChatId,
      messageSearchQuery
    );

    if (!result?.ok) {
      toast(result.message || "खोज्न सकिएन।", "error");
      return false;
    }

    messageSearchResults = Array.isArray(result.data) ? result.data : [];
    refreshPage();
    return true;
  }

  async function blockUser(id) {
    if (!id || !friendsAPI()?.blockUser) return false;

    if (!global.confirm(t(
      "यो प्रयोगकर्तालाई Block गर्ने?",
      "Block this user?"
    ))) return false;

    const result = await friendsAPI().blockUser(id);

    if (!result?.ok) {
      toast(result.message || "Block गर्न सकिएन।", "error");
      return false;
    }

    toast(t("प्रयोगकर्ता Block भयो।", "User blocked."), "success");

    closeChat();
    await loadConversations();
    return true;
  }

  function openProfile(userId) {
    if (!userId) return false;

    const profile = global.KSKProfilePage;

    if (typeof profile?.openUserProfile === "function") {
      return profile.openUserProfile(userId);
    }

    global.dispatchEvent(new CustomEvent("ksk:navigate-request", {
      detail: {
        page: "profile",
        options: {
          profileUserId: userId,
          source: "messenger"
        }
      }
    }));

    return true;
  }

  /* =======================================================
     EVENT HANDLERS
  ======================================================= */

  function handleHistoryScroll(event) {
    const history = event.target;

    if (!history.matches(".ksk-msg-history")) return;

    if (
      history.scrollTop <= 80 &&
      hasOlderMessages &&
      !loadingOlder
    ) {
      loadOlderMessages();
    }
  }

  function handleClick(event) {
    const target = event.target?.closest?.("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id || "";

    if (action === "open-chat") {
      openChat(id);
      return;
    }

    if (action === "back") {
      closeChat();
      return;
    }

    if (action === "set-tab") {
      activeTab = target.dataset.tab || "all";
      groupFormOpen = false;
      refreshPage();
      return;
    }

    if (action === "toggle-pin") {
      const chat = conversations.find(item => String(item.id) === id);
      updatePreference(id, "pinned", !preference(chat, "pinned"));
      return;
    }

    if (action === "toggle-archive") {
      const chat = conversations.find(item => String(item.id) === id);
      updatePreference(id, "archived", !preference(chat, "archived"));
      return;
    }

    if (action === "toggle-mute") {
      const chat = conversations.find(item => String(item.id) === id);
      updatePreference(id, "muted", !preference(chat, "muted"));
      return;
    }

    if (action === "open-group-form") {
      groupFormOpen = true;
      refreshPage();
      return;
    }

    if (action === "close-group") {
      groupFormOpen = false;
      refreshPage();
      return;
    }

    if (action === "edit-message") return void editMessage(id);
    if (action === "delete-message") return void deleteMessage(id);
    if (action === "copy-message") return void copyMessage(id);
    if (action === "reply-message") return void replyMessage(id);
    if (action === "forward-message") return void forwardMessage(id);

    if (action === "cancel-reply") {
      replyTarget = null;
      refreshPage();
      return;
    }

    if (action === "search-messages") return void searchMessages();

    if (action === "toggle-group-members") {
      groupMembersOpen = !groupMembersOpen;
      refreshPage();
      return;
    }

    if (action === "add-group-members") return void addGroupMembers();
    if (action === "remove-group-member") return void removeGroupMember(id);
    if (action === "open-chat-profile") return void openProfile(id);
    if (action === "block-user") return void blockUser(id);
  }

  function handleKeyboard(event) {
    if (event.key !== "Enter" && event.key !== " ") return;

    const target = event.target?.closest?.(
      '[data-action="open-chat"]'
    );

    if (!target) return;

    event.preventDefault();
    openChat(target.dataset.id);
  }

  function handleInput(event) {
    const target = event.target;

    if (target.matches("[data-message-search]")) {
      searchQuery = target.value || "";

      const wrapper = target.closest(".ksk-msg-page");
      if (!wrapper) return;

      const temporary = document.createElement("div");
      temporary.innerHTML = render();

      const replacement = temporary.firstElementChild;

      if (replacement) {
        wrapper.replaceWith(replacement);

        const input = replacement.querySelector("[data-message-search]");
        input?.focus();

        if (input) {
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }

      return;
    }

    if (target.matches('[name="message"]') && activeChatId) {
      const id = activeChatId;

      service().sendTyping(id, true);

      global.clearTimeout(typingTimer);

      typingTimer = global.setTimeout(() => {
        if (activeChatId === id) {
          service().sendTyping(id, false);
        }
      }, 1200);
    }
  }

  async function handleChange(event) {
    const target = event.target;

    if (!target.matches("[data-media-file]")) return;

    const file = target.files?.[0];

    if (file) {
      try {
        await uploadSelectedMedia(file);
      } catch (error) {
        toast(error.message || "फाइल पठाउन सकिएन।", "error");
      }
    }

    target.value = "";
  }

  async function handleSubmit(event) {
    if (event.target.matches("[data-group-form]")) {
      event.preventDefault();
      await createGroup(event.target);
      return;
    }

    if (event.target.matches("[data-send-form]")) {
      event.preventDefault();
      await sendTextMessage(event.target);
    }
  }

  async function handleCloudChange(event) {
    const detail = event.detail || {};

    if (
      detail.action === "typing-change" &&
      String(detail.conversationId || "") === String(activeChatId || "")
    ) {
      if (detail.typing) {
        typingUsers.add(detail.userId);
      } else {
        typingUsers.delete(detail.userId);
      }

      const indicator = document.querySelector("[data-typing-indicator]");

      if (indicator) {
        indicator.textContent = typingUsers.size
          ? t(" · लेख्दै हुनुहुन्छ...", " · typing...")
          : "";
      }

      return;
    }

    if (
      detail.action === "presence-sync" &&
      String(detail.conversationId || "") === String(activeChatId || "")
    ) {
      presenceUsers = new Set(Object.keys(detail.state || {}));
      refreshPage();
      return;
    }

    const relevant = [
      "realtime-message",
      "message-sent",
      "message-edited",
      "message-deleted",
      "realtime-receipt",
      "message-delivered",
      "conversation-read",
      "realtime-members",
      "group-members-changed",
      "chat-preferences-changed",
      "conversation-created",
      "group-created"
    ];

    if (!relevant.includes(detail.action)) return;

    const eventMessage = detail.message || detail.data?.message || null;
    const eventReceipt = detail.receipt || null;

    const eventConversationId = String(
      detail.conversationId ||
      eventMessage?.conversationId ||
      eventMessage?.conversation_id ||
      ""
    );

    if (
      detail.action === "realtime-receipt" &&
      eventReceipt?.message_id
    ) {
      receiptCache.delete(eventReceipt.message_id);
    }

    await loadConversations();

    if (
      activeChatId &&
      (!eventConversationId ||
        eventConversationId === String(activeChatId))
    ) {
      const id = activeChatId;
      const token = messageRequestToken;

      try {
        await loadMessages(id, { token });

        const isIncomingInsert =
          detail.action === "realtime-message" &&
          detail.eventType === "INSERT" &&
          eventMessage &&
          String(
            eventMessage.sender_id || eventMessage.senderId || ""
          ) !== String(currentUserId) &&
          String(
            eventMessage.conversation_id ||
            eventMessage.conversationId ||
            ""
          ) === String(id);

        if (isIncomingInsert && isPageVisible()) {
          await service().markRead(id);
        }

        if (isPageVisible()) {
          await loadConversations();
        }
      } catch (error) {
        console.warn("Realtime refresh:", error);
      }
    }

    if (isPageVisible()) refreshPage();
  }

  function handleNavigation(event) {
    if (event.detail?.page !== "messages") {
      global.clearTimeout(typingTimer);
      service()?.sendTyping?.(activeChatId, false);
      service()?.stopPresence?.();
      return;
    }

    if (activeChatId) {
      service()?.startPresence?.(activeChatId);
    }

    loadConversations().then(refreshPage);
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  async function initialize() {
    if (initialized) return true;
    if (initializing) return false;

    initializing = true;
    ensureStyles();

    try {
      const authReady = await auth()?.initialize?.();

      if (!authReady || !auth()?.isAuthenticated?.()) {
        throw new Error(t(
          "पहिले आफ्नो खातामा लगइन गर्नुहोस्।",
          "Please sign in first."
        ));
      }

      currentUserId = auth()?.getUser?.()?.id || "";

      if (!currentUserId) {
        throw new Error(t(
          "प्रयोगकर्ता विवरण प्राप्त भएन।",
          "Could not load the signed-in user."
        ));
      }

      const ready = await service()?.initialize?.();

      if (!ready?.ok) {
        throw new Error(ready?.message || "Messenger सुरु हुन सकेन।");
      }

      const [, conversationsReady] = await Promise.all([
        loadFriends(),
        loadConversations()
      ]);

      if (!conversationsReady) {
        throw new Error(t(
          "कुराकानी लोड गर्न सकिएन। पुनः प्रयास गर्नुहोस्।",
          "Could not load conversations. Please retry."
        ));
      }

      if (!listenersAttached) {
        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleKeyboard);
        document.addEventListener("input", handleInput);
        document.addEventListener("change", handleChange);
        document.addEventListener("submit", handleSubmit);
        document.addEventListener("scroll", handleHistoryScroll, {
          passive: true,
          capture: true
        });

        global.addEventListener(
          "ksk:messages-cloud-change",
          handleCloudChange
        );

        global.addEventListener("ksk:navigate", handleNavigation);

        listenersAttached = true;
      }

      const realtimeReady = await service().startRealtime();

      if (
        realtimeReady === false ||
        realtimeReady?.ok === false
      ) {
        throw new Error(
          realtimeReady?.message ||
          t(
            "Realtime जडान हुन सकेन। पुनः प्रयास गर्नुहोस्।",
            "Realtime connection failed. Please retry."
          )
        );
      }

      initialized = true;
      refreshPage();
      return true;
    } catch (error) {
      console.error("Messenger initialization:", error);

      toast(
        error.message ||
        t("Messenger सुरु गर्न सकिएन।", "Messenger could not initialize."),
        "error"
      );

      return false;
    } finally {
      initializing = false;
    }
  }

  /* =======================================================
     PUBLIC API — KEEP EXISTING APP CONNECTIONS
  ======================================================= */

  global.KSKMessagesPage = Object.freeze({
    initialize,
    render,
    renderChat,
    renderChatMessage,
    renderConversationList,

    openChat,
    openFriendChat,
    closeChat,
    sendMessage: sendTextMessage,
    loadOlderMessages,

    async refresh() {
      await loadConversations();
      await loadFriends();

      if (activeChatId) {
        const token = messageRequestToken;
        await loadMessages(activeChatId, { token });
      }

      refreshPage();
      return true;
    },

    getActiveChatId() {
      return activeChatId;
    },

    getConversations() {
      return conversations.slice();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

})(window);
