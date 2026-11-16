"use strict";

/*
 * MERO SANSAR — COMPLETE SUPABASE MESSENGER PAGE
 *
 * Requires:
 *   core/supabase-auth.js
 *   core/supabase-friends.js
 *   core/supabase-messages.js
 *   pages/profile.js
 *
 * Features:
 *   Direct chat, group chat, group members
 *   Realtime messages, history, older messages
 *   Edit, delete, copy, reply, forward
 *   Delivery/read receipts
 *   Typing, presence, last seen
 *   Image, video, file and voice messages
 *   Search, pin, archive, mute, block
 *   Supabase-backed preferences
 *   Friend profile navigation
 */

(function (global) {
  "use strict";

  if (global.KSKMessagesPage) return;

  const PAGE_SIZE = 50;
  const MAX_GROUP_NAME = 60;
  const MAX_MESSAGE = 5000;

  let initialized = false;
  let initializing = false;
  let listenersAttached = false;
  let loading = false;
  let sending = false;
  let loadingOlder = false;

  let conversations = [];
  let friends = [];
  let activeChatId = null;
  let activeChat = null;
  let activeMessages = [];

  let activeTab = "all";
  let searchQuery = "";
  let messageSearchQuery = "";
  let messageSearchResults = [];

  let groupFormOpen = false;
  let groupMembersOpen = false;
  let replyTarget = null;
  let typingTimer = null;
  let typingUsers = new Set();
  let presenceUsers = new Set();
  let mediaUrls = new Map();

  let currentUserId = "";
  let oldestCursor = null;
  let hasOlderMessages = false;

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

  function getCurrentPage() {
    return global.KSKNavigation?.getCurrentPage?.() || "";
  }

  function isPageVisible() {
    return getCurrentPage() === "messages";
  }

  function refreshPage() {
    if (isPageVisible() &&
        typeof global.KSKApp?.refreshCurrentPage === "function") {
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
      {
        dateStyle: "short",
        timeStyle: "short"
      }
    );
  }

  function formatLastSeen(value) {
    if (!value) {
      return t("अहिले Offline", "Offline");
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return t("अन्तिम पटक: ", "Last seen: ") + formatTime(value);
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

  function getFriendAvatar(friend = {}) {
    return friend.avatarUrl || friend.avatar || "";
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

  function ensureStyles() {
    if (document.getElementById("kskSupabaseMessagesStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "kskSupabaseMessagesStyles";

    style.textContent = `
      .ksk-msg-page {
        width:100%;
        min-width:0;
        color:var(--text-color,inherit);
      }

      .ksk-msg-toolbar {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin:12px 0;
      }

      .ksk-msg-search,
      .ksk-msg-compose,
      .ksk-msg-input {
        box-sizing:border-box;
        width:100%;
        min-width:0;
        padding:12px;
        border:1px solid var(--border-color,#ddd);
        border-radius:12px;
        background:var(--card-bg,#fff);
        color:var(--text-color,inherit);
        font:inherit;
      }

      .ksk-msg-tabs {
        display:flex;
        gap:7px;
        overflow-x:auto;
        padding:3px 0 8px;
        margin:8px 0;
      }

      .ksk-msg-tab {
        flex-shrink:0;
        border:1px solid var(--border-color,#ddd);
        border-radius:30px;
        padding:8px 13px;
        background:var(--card-bg,#fff);
        color:inherit;
        cursor:pointer;
      }

      .ksk-msg-tab.is-active {
        background:#2563eb;
        border-color:#2563eb;
        color:white;
      }

      .ksk-msg-list {
        display:grid;
        gap:9px;
      }

      .ksk-msg-row {
        display:flex;
        align-items:center;
        gap:10px;
        padding:11px;
        border:1px solid var(--border-color,#ddd);
        border-radius:13px;
        background:var(--card-bg,#fff);
        min-width:0;
      }

      .ksk-msg-row-main {
        flex:1;
        min-width:0;
        cursor:pointer;
        overflow-wrap:anywhere;
      }

      .ksk-msg-row-title {
        font-weight:700;
      }

      .ksk-msg-row-subtitle {
        margin-top:4px;
        font-size:13px;
        color:var(--muted-color,#777);
        overflow-wrap:anywhere;
      }

      .ksk-msg-avatar {
        width:45px;
        height:45px;
        min-width:45px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:50%;
        background:var(--surface-color,#eee);
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

      .ksk-msg-action,
      .ksk-msg-secondary {
        border:1px solid var(--border-color,#ddd);
        border-radius:9px;
        padding:8px 10px;
        background:transparent;
        color:inherit;
        cursor:pointer;
        font:inherit;
        font-size:12px;
      }

      .ksk-msg-primary {
        border:0;
        border-radius:10px;
        padding:11px 15px;
        background:#2563eb;
        color:white;
        cursor:pointer;
        font:inherit;
      }

      .ksk-msg-primary:disabled {
        opacity:.55;
        cursor:wait;
      }

      .ksk-msg-empty,
      .ksk-msg-note {
        padding:18px;
        margin:12px 0;
        border:1px dashed var(--border-color,#ddd);
        border-radius:13px;
        text-align:center;
        color:var(--muted-color,#777);
      }

      .ksk-msg-detail,
      .ksk-msg-form {
        padding:12px;
        margin-top:12px;
        border:1px solid var(--border-color,#ddd);
        border-radius:14px;
        background:var(--card-bg,#fff);
      }

      .ksk-msg-chat-header {
        display:flex;
        align-items:center;
        gap:10px;
        padding-bottom:12px;
        border-bottom:1px solid var(--border-color,#ddd);
      }

      .ksk-msg-chat-header-main {
        flex:1;
        min-width:0;
      }

      .ksk-msg-chat-status {
        font-size:12px;
        color:var(--muted-color,#777);
        margin-top:3px;
      }

      .ksk-msg-history {
        display:flex;
        flex-direction:column;
        gap:9px;
        margin:14px 0;
        min-height:120px;
      }

      .ksk-msg-history-item {
        max-width:88%;
        min-width:80px;
        padding:10px 12px;
        border-radius:13px;
        background:var(--surface-color,#eee);
        overflow-wrap:anywhere;
      }

      .ksk-msg-history-item.from-me {
        align-self:flex-end;
        background:#dbeafe;
        color:#172554;
      }

      .ksk-msg-history-item.from-them {
        align-self:flex-start;
      }

      .ksk-msg-history-item.deleted {
        opacity:.7;
        font-style:italic;
      }

      .ksk-msg-history-time {
        display:block;
        margin-top:5px;
        font-size:10px;
        opacity:.7;
      }

      .ksk-msg-send-form {
        display:grid;
        gap:8px;
        margin-top:12px;
      }

      .ksk-msg-compose {
        min-height:48px;
        resize:vertical;
      }

      .ksk-msg-compose-actions {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        align-items:center;
      }

      .ksk-msg-compose-actions label,
      .ksk-msg-compose-actions button {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:38px;
        padding:8px 11px;
        border:1px solid var(--border-color,#ddd);
        border-radius:9px;
        background:transparent;
        color:inherit;
        font:inherit;
        font-size:12px;
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
        padding:9px;
        border-radius:9px;
        background:var(--surface-color,rgba(127,127,127,.08));
      }

      .ksk-msg-friend-option input {
        width:18px;
        height:18px;
      }

      .ksk-msg-reply-preview {
        padding:9px;
        margin:8px 0;
        border-left:3px solid #2563eb;
        background:var(--surface-color,#eee);
        border-radius:7px;
        font-size:12px;
      }

      .ksk-msg-media {
        display:block;
        max-width:100%;
        max-height:300px;
        border-radius:9px;
        margin-top:5px;
      }

      .ksk-msg-unread {
        display:inline-flex;
        min-width:20px;
        height:20px;
        padding:0 5px;
        align-items:center;
        justify-content:center;
        border-radius:20px;
        background:#2563eb;
        color:white;
        font-size:11px;
      }

      .ksk-msg-search-results {
        display:grid;
        gap:8px;
        margin:10px 0;
      }

      .ksk-msg-search-result {
        padding:10px;
        border:1px solid var(--border-color,#ddd);
        border-radius:10px;
        overflow-wrap:anywhere;
      }

      .ksk-msg-status {
        font-size:10px;
        opacity:.75;
      }

      .ksk-msg-hidden {
        display:none !important;
      }

      @media(max-width:520px) {
        .ksk-msg-row {
          flex-wrap:wrap;
        }

        .ksk-msg-row-main {
          flex-basis:calc(100% - 60px);
        }

        .ksk-msg-actions {
          width:100%;
        }

        .ksk-msg-action {
          flex:1;
        }

        .ksk-msg-history-item {
          max-width:94%;
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

  function getConversationPreference(chat, key) {
    const map = {
      pinned: "isPinned",
      archived: "isArchived",
      muted: "isMuted"
    };

    return Boolean(chat?.[map[key]]);
  }

  async function loadFriends() {
    const api = friendsAPI();

    if (!api?.getDashboard) {
      friends = [];
      return false;
    }

    const result = await api.getDashboard();

    if (!result?.ok) {
      friends = [];
      console.warn("Messenger friends:", result?.message);
      return false;
    }

    friends = result.data?.friends || [];
    return true;
  }

  async function loadConversations() {
    if (loading) return false;

    loading = true;

    try {
      const api = service();

      if (!api?.getConversations) {
        throw new Error("Supabase Messenger सेवा उपलब्ध छैन।");
      }

      const result = await api.getConversations();

      if (!result?.ok) {
        throw new Error(result.message || "कुराकानी लोड गर्न सकिएन।");
      }

      conversations = Array.isArray(result.data)
        ? result.data
        : [];

      if (activeChatId) {
        activeChat = conversations.find(
          item => String(item.id) === String(activeChatId)
        ) || null;

        if (!activeChat) {
          activeChatId = null;
          activeMessages = [];
        }
      }

      return true;
    } catch (error) {
      console.error("Messenger conversations:", error);
      toast(error.message, "error");
      return false;
    } finally {
      loading = false;
    }
  }

  async function loadMessages(conversationId, options = {}) {
    const result = await service().getMessages(
      conversationId,
      {
        limit: options.limit || PAGE_SIZE,
        before: options.before || undefined
      }
    );

    if (!result?.ok) {
      throw new Error(result.message || "सन्देश लोड गर्न सकिएन।");
    }

    const rows = Array.isArray(result.data) ? result.data : [];

    if (options.append) {
      const existing = new Set(activeMessages.map(x => x.id));

      activeMessages = [
        ...rows.filter(x => !existing.has(x.id)),
        ...activeMessages
      ];
    } else {
      activeMessages = rows;
    }

    oldestCursor = activeMessages[0]?.createdAt || null;
    hasOlderMessages = rows.length >= (options.limit || PAGE_SIZE);

    return true;
  }

  async function loadOlderMessages() {
    if (!activeChatId || !oldestCursor ||
        !hasOlderMessages || loadingOlder) {
      return false;
    }

    loadingOlder = true;

    try {
      const beforeCount = activeMessages.length;

      const ok = await loadMessages(activeChatId, {
        limit: PAGE_SIZE,
        before: oldestCursor,
        append: true
      });

      if (ok && activeMessages.length === beforeCount) {
        hasOlderMessages = false;
      }

      refreshPage();
      return ok;
    } catch (error) {
      toast(error.message, "error");
      return false;
    } finally {
      loadingOlder = false;
    }
  }

  function getVisibleChats() {
    const query = searchQuery.trim().toLowerCase();

    return conversations
      .filter(chat => {
        const archived = getConversationPreference(chat, "archived");

        if (activeTab === "archived" && !archived) return false;
        if (activeTab !== "archived" && archived) return false;

        if (activeTab === "groups" && chat.type !== "group") {
          return false;
        }

        if (activeTab === "pinned" &&
            !getConversationPreference(chat, "pinned")) {
          return false;
        }

        if (query && !getChatName(chat).toLowerCase().includes(query)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const ap = getConversationPreference(a, "pinned") ? 1 : 0;
        const bp = getConversationPreference(b, "pinned") ? 1 : 0;

        if (activeTab !== "archived" && ap !== bp) {
          return bp - ap;
        }

        return new Date(b.lastMessageAt || b.createdAt || 0) -
          new Date(a.lastMessageAt || a.createdAt || 0);
      });
  }

  function getUnreadCount(chat) {
    if (!chat?.lastMessage || chat.lastMessage.fromMe) return 0;

    const lastRead = chat.lastReadAt
      ? new Date(chat.lastReadAt).getTime()
      : 0;

    const messageTime = new Date(
      chat.lastMessage.createdAt || 0
    ).getTime();

    return messageTime > lastRead ? 1 : 0;
  }

  function renderChatRow(chat) {
    const id = String(chat.id);
    const name = getChatName(chat);
    const last = chat.lastMessage?.text ||
      (chat.lastMessage?.type
        ? "📎 " + chat.lastMessage.type
        : t("कुराकानी खोल्नुहोस्", "Open conversation"));

    const unread = getUnreadCount(chat);

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
            ${getConversationPreference(chat, "pinned") ? " 📌" : ""}
            ${getConversationPreference(chat, "muted") ? " 🔕" : ""}
            ${unread ? `<span class="ksk-msg-unread">${unread}</span>` : ""}
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
            ${getConversationPreference(chat, "pinned") ? "Unpin" : "Pin"}
          </button>

          <button class="ksk-msg-action"
                  type="button"
                  data-action="toggle-archive"
                  data-id="${escapeHTML(id)}">
            ${getConversationPreference(chat, "archived") ? "Restore" : "Archive"}
          </button>

          <button class="ksk-msg-action"
                  type="button"
                  data-action="toggle-mute"
                  data-id="${escapeHTML(id)}">
            ${getConversationPreference(chat, "muted") ? "Unmute" : "Mute"}
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
            ? `<div class="ksk-msg-list">
                ${chats.map(renderChatRow).join("")}
               </div>`
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
        t("Group बनाउन पहिले साथी हुनुपर्छ।", "Add friends before creating a group.")
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

  function getMessageStatus(message) {
    if (!message.fromMe) return "";

    const receipts = Array.isArray(message.receipts)
      ? message.receipts
      : [];

    if (receipts.some(x => x.read_at || x.readAt)) return "✓✓";
    if (receipts.some(x => x.delivered_at || x.deliveredAt)) return "✓✓";

    return "✓";
  }

  async function getMediaUrl(path) {
    if (!path) return "";

    if (mediaUrls.has(path)) {
      return mediaUrls.get(path);
    }

    const result = await service().getMediaUrl(path);

    if (!result?.ok || !result.data) return "";

    mediaUrls.set(path, result.data);
    return result.data;
  }

  function renderMessageMedia(message) {
    if (!message.mediaPath) return "";

    const url = mediaUrls.get(message.mediaPath);

    if (!url) {
      getMediaUrl(message.mediaPath).then(() => refreshPage());
      return `<div class="ksk-msg-note">${escapeHTML(t("Media लोड हुँदैछ...", "Loading media..."))}</div>`;
    }

    if (message.type === "image") {
      return `
        <a href="${escapeHTML(url)}" target="_blank" rel="noopener">
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
         rel="noopener"
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

        ${deleted ? escapeHTML(content) : escapeHTML(content)}

        ${!deleted ? renderMessageMedia(message) : ""}

        <small class="ksk-msg-history-time">
          ${escapeHTML(formatTime(message.createdAt))}
          ${message.editedAt ? " · Edited" : ""}
          ${mine ? `<span class="ksk-msg-status">${getMessageStatus(message)}</span>` : ""}
        </small>

        ${!deleted ? `
          <div class="ksk-msg-bubble-actions">
            ${mine ? `
              <button type="button"
                      data-action="edit-message"
                      data-id="${escapeHTML(message.id)}">
                Edit
              </button>
              <button type="button"
                      data-action="delete-message"
                      data-id="${escapeHTML(message.id)}">
                Delete
              </button>
            ` : ""}

            <button type="button"
                    data-action="reply-message"
                    data-id="${escapeHTML(message.id)}">
              Reply
            </button>

            <button type="button"
                    data-action="copy-message"
                    data-id="${escapeHTML(message.id)}">
              Copy
            </button>

            <button type="button"
                    data-action="forward-message"
                    data-id="${escapeHTML(message.id)}">
              Forward
            </button>
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
                <div class="ksk-msg-row-subtitle">${escapeHTML(member.role || "member")}</div>
              </div>

              ${canManage && member.id !== currentUserId &&
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
                style="float:right">
          ✕
        </button>
      </div>
    `;
  }

  function renderChat(chat = activeChat) {
    if (!chat) return renderConversationList();

    const person = chat.members?.find(
      member => member.id !== currentUserId
    );

    const online = person && presenceUsers.has(person.id);

    return `
      <section class="ksk-msg-page">
        <button class="ksk-msg-secondary"
                type="button"
                data-action="back">
          ← ${escapeHTML(t("सन्देश सूची", "Conversations"))}
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
                    : escapeHTML(formatLastSeen(person?.lastSeenAt))
                }
                <span data-typing-indicator></span>
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
                   placeholder="${escapeHTML(t("यो कुराकानीमा सन्देश खोज्नुहोस्", "Search messages in this chat"))}">

            <button class="ksk-msg-secondary"
                    type="button"
                    data-action="search-messages">
              ${escapeHTML(t("खोज्नुहोस्", "Search"))}
            </button>
          </div>

          ${renderSearchResults()}

          <button class="ksk-msg-secondary"
                  type="button"
                  data-action="load-older"
                  ${!hasOlderMessages || loadingOlder ? "disabled" : ""}>
            ${loadingOlder
              ? escapeHTML(t("लोड हुँदैछ...", "Loading..."))
              : escapeHTML(t("पुराना सन्देश", "Older messages"))}
          </button>

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
                      placeholder="${escapeHTML(t("सन्देश लेख्नुहोस्...", "Write a message..."))}"></textarea>

            <div class="ksk-msg-compose-actions">
              <label>
                📎 ${escapeHTML(t("फाइल", "File"))}
                <input type="file"
                       data-media-file
                       accept="image/*,video/*,audio/*,.pdf,.doc,.docx">
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

  async function openChat(chatId) {
    const id = String(chatId || "");

    const chat = conversations.find(
      item => String(item.id) === id
    );

    if (!chat) {
      toast(t("कुराकानी भेटिएन।", "Conversation not found."), "warning");
      return false;
    }

    activeChatId = id;
    activeChat = chat;
    activeMessages = [];
    replyTarget = null;
    messageSearchResults = [];
    oldestCursor = null;
    hasOlderMessages = false;
    presenceUsers.clear();
    typingUsers.clear();

    refreshPage();

    try {
      await loadMessages(id);

      await service().markRead(id);

      await service().startPresence(id);

      const incoming = activeMessages.filter(
        message => !message.fromMe
      );

      for (const message of incoming) {
        service().markDelivered(message.id);
      }

      refreshPage();
      return true;
    } catch (error) {
      toast(error.message, "error");
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
    return openChat(result.data);
  }

  function closeChat() {
    activeChatId = null;
    activeChat = null;
    activeMessages = [];
    replyTarget = null;
    messageSearchResults = [];
    presenceUsers.clear();
    typingUsers.clear();

    service().stopPresence();
    refreshPage();

    return true;
  }

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
      toast(result.message || "सेटिङ परिवर्तन गर्न सकिएन।", "error");
      return false;
    }

    await loadConversations();
    refreshPage();

    return true;
  }

  async function createGroup(form) {
    const name = String(
      form.querySelector('[name="groupName"]')?.value || ""
    ).trim();

    const selected = Array.from(
      form.querySelectorAll('input[name="memberIds"]:checked')
    ).map(input => input.value);

    if (!name || selected.length < 2) {
      toast(
        t(
          "Group को नाम लेखेर कम्तीमा दुई साथी छान्नुहोस्।",
          "Enter a group name and select at least two friends."
        ),
        "warning"
      );
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

  async function sendTextMessage(form) {
    if (sending || !activeChatId) return false;

    const input = form.querySelector('[name="message"]');
    const content = String(input?.value || "").trim();

    if (!content) return false;

    sending = true;
    refreshPage();

    try {
      const result = replyTarget
        ? await service().replyMessage(
            activeChatId,
            content,
            replyTarget.id
          )
        : await service().sendMessage(activeChatId, content);

      if (!result?.ok) {
        throw new Error(result.message || "सन्देश पठाउन सकिएन।");
      }

      replyTarget = null;

      await loadMessages(activeChatId);
      await service().markRead(activeChatId);
      await loadConversations();

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

    const result = await service().uploadMedia(
      activeChatId,
      file
    );

    if (!result?.ok) {
      toast(result.message || "फाइल पठाउन सकिएन।", "error");
      return false;
    }

    await loadMessages(activeChatId);
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
    const accepted = global.confirm(
      t("यो सन्देश सबैका लागि हटाउने?", "Delete this message for everyone?")
    );

    if (!accepted) return false;

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
    const result = await service().copyMessage(id);

    if (!result?.ok) {
      const message = activeMessages.find(item => item.id === id);

      if (message?.text && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(message.text);
          toast(t("Copy भयो।", "Copied."), "success");
          return true;
        } catch (_) {}
      }

      toast(result.message || "Copy गर्न सकिएन।", "error");
      return false;
    }

    toast(t("Copy भयो।", "Copied."), "success");
    return true;
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
    const options = conversations
      .filter(chat => String(chat.id) !== String(activeChatId));

    if (!options.length) {
      toast(t("Forward गर्ने अर्को कुराकानी छैन।", "No other conversation available."), "warning");
      return false;
    }

    const labels = options.map((chat, index) =>
      `${index + 1}. ${getChatName(chat)}`
    ).join("\n");

    const answer = global.prompt(
      t("कुन कुराकानीमा Forward गर्ने? नम्बर लेख्नुहोस्:\n", "Forward to which conversation? Enter number:\n") + labels
    );

    if (answer === null) return false;

    const index = Number(answer) - 1;
    const target = options[index];

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

  async function searchMessages() {
    if (!activeChatId) return false;

    const input = document.querySelector(
      "[data-message-content-search]"
    );

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

    messageSearchResults = result.data || [];
    refreshPage();

    return true;
  }

  async function addGroupMembers() {
    if (!activeChat || activeChat.type !== "group") return false;

    const available = friends.filter(friend =>
      !activeChat.members?.some(member => member.id === friend.id)
    );

    if (!available.length) {
      toast(t("थप्न मिल्ने साथी छैनन्।", "No friends available to add."), "warning");
      return false;
    }

    const names = available.map((friend, index) =>
      `${index + 1}. ${getFriendName(friend)}`
    ).join("\n");

    const answer = global.prompt(
      t("थप्ने साथीको नम्बर लेख्नुहोस्:\n", "Enter the number of the friend to add:\n") + names
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
      activeChatId = null;
      activeChat = null;
      activeMessages = [];
      groupFormOpen = false;
      service().stopPresence();
      refreshPage();
      return;
    }

    if (action === "toggle-pin") {
      const chat = conversations.find(x => x.id === id);
      updatePreference(id, "pinned", !getConversationPreference(chat, "pinned"));
      return;
    }

    if (action === "toggle-archive") {
      const chat = conversations.find(x => x.id === id);
      updatePreference(id, "archived", !getConversationPreference(chat, "archived"));
      return;
    }

    if (action === "toggle-mute") {
      const chat = conversations.find(x => x.id === id);
      updatePreference(id, "muted", !getConversationPreference(chat, "muted"));
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

    if (action === "edit-message") {
      editMessage(id);
      return;
    }

    if (action === "delete-message") {
      deleteMessage(id);
      return;
    }

    if (action === "copy-message") {
      copyMessage(id);
      return;
    }

    if (action === "reply-message") {
      replyMessage(id);
      return;
    }

    if (action === "forward-message") {
      forwardMessage(id);
      return;
    }

    if (action === "cancel-reply") {
      replyTarget = null;
      refreshPage();
      return;
    }

    if (action === "search-messages") {
      searchMessages();
      return;
    }

    if (action === "load-older") {
      loadOlderMessages();
      return;
    }

    if (action === "toggle-group-members") {
      groupMembersOpen = !groupMembersOpen;
      refreshPage();
      return;
    }

    if (action === "add-group-members") {
      addGroupMembers();
      return;
    }

    if (action === "remove-group-member") {
      removeGroupMember(id);
      return;
    }

    if (action === "open-chat-profile") {
      openProfile(id);
      return;
    }

    if (action === "block-user") {
      blockUser(id);
      return;
    }

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
          input.setSelectionRange(
            input.value.length,
            input.value.length
          );
        }
      }

      return;
    }

    if (target.matches('[name="message"]') && activeChatId) {
      service().sendTyping(activeChatId, true);

      global.clearTimeout(typingTimer);

      typingTimer = global.setTimeout(() => {
        service().sendTyping(activeChatId, false);
      }, 1200);
    }
  }

  async function handleChange(event) {
    const target = event.target;

    if (target.matches("[data-media-file]")) {
      const file = target.files?.[0];

      if (file) {
        await uploadSelectedMedia(file);
      }

      target.value = "";
    }
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
    if (detail.action === "typing-change" && String(detail.conversationId || "") === String(activeChatId || "")) {
      if (detail.typing) typingUsers.add(detail.userId); else typingUsers.delete(detail.userId);
      const indicator = document.querySelector("[data-typing-indicator]");
      if (indicator) indicator.textContent = typingUsers.size ? t(" · लेख्दै हुनुहुन्छ...", " · typing...") : "";
      return;
    }
    if (detail.action === "presence-sync" && String(detail.conversationId || "") === String(activeChatId || "")) {
      presenceUsers = new Set(Object.keys(detail.state || {})); refreshPage(); return;
    }
    const relevant = ["realtime-message","message-sent","message-edited","message-deleted","realtime-receipt","message-delivered","conversation-read","realtime-members","group-members-changed","chat-preferences-changed","conversation-created","group-created"];
    if (!relevant.includes(detail.action)) return;
    const eventMessage = detail.message || detail.data?.message || null;
    const eventConversationId = String(detail.conversationId || eventMessage?.conversationId || eventMessage?.conversation_id || "");
    await loadConversations();
    if (activeChatId && (!eventConversationId || eventConversationId === String(activeChatId))) {
      try {
        await loadMessages(activeChatId);
        const isIncomingInsert = detail.action === "realtime-message" &&
          (detail.eventType === "INSERT" || detail.type === "INSERT") &&
          eventMessage &&
          String(eventMessage.sender_id || eventMessage.senderId || "") !== String(currentUserId) &&
          String(eventMessage.conversation_id || eventMessage.conversationId || "") === String(activeChatId);
        if (isIncomingInsert && eventMessage.id) await service().markDelivered(eventMessage.id);
        if (isPageVisible()) await service().markRead(activeChatId);
      } catch (error) { console.warn("Realtime refresh:", error); }
    }
    if (isPageVisible()) refreshPage();
  }

  function handleNavigation(event) {
    if (event.detail?.page !== "messages") {
      service()?.stopPresence?.();
      return;
    }

    if (event.detail?.options?.keepChat) return;

    if (!activeChatId) {
      loadConversations().then(refreshPage);
    }
  }

  async function initialize() {
    if (initialized) return true;
    if (initializing) return false;
    initializing = true; ensureStyles();
    try {
      const authReady = await auth()?.initialize?.();
      if (!authReady || !auth()?.isAuthenticated?.()) throw new Error(t("पहिले आफ्नो खातामा लगइन गर्नुहोस्।","Please sign in first."));
      currentUserId = auth()?.getUser?.()?.id || "";
      if (!currentUserId) throw new Error(t("प्रयोगकर्ता विवरण प्राप्त भएन।","Could not load the signed-in user."));
      const ready = await service()?.initialize?.();
      if (!ready?.ok) throw new Error(ready?.message || "Messenger सुरु हुन सकेन।");
      const [, conversationsReady] = await Promise.all([loadFriends(),loadConversations()]);
      if (!conversationsReady) throw new Error(t("कुराकानी लोड गर्न सकिएन। पुनः प्रयास गर्नुहोस्।","Could not load conversations. Please retry."));
      if (!listenersAttached) {
        document.addEventListener("click",handleClick); document.addEventListener("keydown",handleKeyboard);
        document.addEventListener("input",handleInput); document.addEventListener("change",handleChange);
        document.addEventListener("submit",handleSubmit);
        global.addEventListener("ksk:messages-cloud-change",handleCloudChange);
        global.addEventListener("ksk:navigate",handleNavigation); listenersAttached=true;
      }
      const realtimeReady = await service().startRealtime();
      if (realtimeReady === false || realtimeReady?.ok === false) throw new Error(realtimeReady?.message || t("Realtime जडान हुन सकेन। पुनः प्रयास गर्नुहोस्।","Realtime connection failed. Please retry."));
      initialized=true; refreshPage(); return true;
    } catch(error) {
      console.error("Messenger initialization:",error);
      toast(error.message || t("Messenger सुरु गर्न सकिएन।","Messenger could not initialize."),"error");
      return false;
    } finally { initializing=false; }
  }

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
        await loadMessages(activeChatId);
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
