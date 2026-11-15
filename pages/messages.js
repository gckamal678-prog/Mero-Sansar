
"use strict";

/*
 * MERO SANSAR — SUPABASE MESSAGES PAGE
 * Data: KSKSupabaseMessages
 * Friends: KSKSupabaseFriends
 */

(function (global) {
  "use strict";

  if (global.KSKMessagesPage) return;

  const STORAGE_KEY = "ksk_messages_ui_v1";
  const MAX_GROUP_NAME = 60;

  let initialized = false;
  let loading = false;
  let sending = false;

  let conversations = [];
  let friends = [];
  let activeChatId = null;
  let activeChat = null;
  let activeMessages = [];

  let activeTab = "all";
  let searchQuery = "";
  let groupFormOpen = false;

  const service = () => global.KSKSupabaseMessages;
  const friendsAPI = () => global.KSKSupabaseFriends;
  const LANG = () => global.KSKLanguage;

  function isEnglish() {
    return (LANG()?.getLanguage?.() || "ne") === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
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
      return;
    }

    api?.show?.(message, type);
  }

  function readPreferences() {
    try {
      const data = JSON.parse(
        global.localStorage.getItem(STORAGE_KEY) || "{}"
      );

      return {
        pinned: Array.isArray(data.pinned) ? data.pinned : [],
        archived: Array.isArray(data.archived) ? data.archived : []
      };
    } catch (_) {
      return { pinned: [], archived: [] };
    }
  }

  function savePreferences(data) {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );
      return true;
    } catch (_) {
      toast(
        t("सेटिङ सुरक्षित गर्न सकिएन।", "Could not save preferences."),
        "error"
      );
      return false;
    }
  }

  function isPinned(id) {
    return readPreferences().pinned.includes(String(id));
  }

  function isArchived(id) {
    return readPreferences().archived.includes(String(id));
  }

  function getChatName(chat = {}) {
    return String(
      chat.name ||
      chat.title ||
      t("कुराकानी", "Conversation")
    );
  }

  function getAvatar(person = {}) {
    const avatar = String(person.avatar || "").trim();

    if (/^https?:\/\//i.test(avatar)) {
      return `
        <span class="ksk-msg-avatar">
          <img src="${escapeHTML(avatar)}"
               alt="${escapeHTML(getChatName(person))}"
               loading="lazy">
        </span>
      `;
    }

    return `
      <span class="ksk-msg-avatar ksk-msg-avatar-fallback">
        ${escapeHTML(getChatName(person).charAt(0) || "M")}
      </span>
    `;
  }

  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        dateStyle: "short",
        timeStyle: "short"
      }
    );
  }

  function ensureStyles() {
    if (document.getElementById("kskSupabaseMessagesStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "kskSupabaseMessagesStyles";

    style.textContent = `
      .ksk-msg-page {
        width: 100%;
        min-width: 0;
      }

      .ksk-msg-toolbar {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
        margin: 12px 0;
      }

      .ksk-msg-search,
      .ksk-msg-compose {
        width: 100%;
        box-sizing: border-box;
        padding: 12px;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 12px;
        background: var(--card-bg, #fff);
        color: var(--text-color, inherit);
        font: inherit;
      }

      .ksk-msg-tabs {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        margin: 12px 0;
      }

      .ksk-msg-tab {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 30px;
        padding: 8px 13px;
        background: var(--card-bg, #fff);
        color: var(--text-color, inherit);
        white-space: nowrap;
        cursor: pointer;
      }

      .ksk-msg-tab.is-active {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }

      .ksk-msg-list {
        display: grid;
        gap: 9px;
      }

      .ksk-msg-row {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 13px;
        background: var(--card-bg, #fff);
        min-width: 0;
      }

      .ksk-msg-row-main {
        flex: 1;
        min-width: 0;
        cursor: pointer;
        overflow-wrap: anywhere;
      }

      .ksk-msg-row-title {
        font-weight: 700;
      }

      .ksk-msg-row-subtitle {
        margin-top: 4px;
        font-size: 13px;
        color: var(--muted-color, #777);
        overflow-wrap: anywhere;
      }

      .ksk-msg-avatar {
        width: 46px;
        height: 46px;
        min-width: 46px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 50%;
        background: var(--surface-color, #eee);
        font-weight: 700;
      }

      .ksk-msg-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ksk-msg-actions {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }

      .ksk-msg-action,
      .ksk-msg-secondary {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 9px;
        padding: 8px 10px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
      }

      .ksk-msg-primary {
        border: 0;
        border-radius: 10px;
        padding: 11px 15px;
        background: #2563eb;
        color: white;
        cursor: pointer;
        font: inherit;
      }

      .ksk-msg-empty,
      .ksk-msg-note {
        padding: 18px;
        margin: 12px 0;
        border: 1px dashed var(--border-color, #ddd);
        border-radius: 13px;
        text-align: center;
        color: var(--muted-color, #777);
      }

      .ksk-msg-form,
      .ksk-msg-detail {
        padding: 14px;
        margin-top: 12px;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        background: var(--card-bg, #fff);
      }

      .ksk-msg-friend-options {
        display: grid;
        gap: 9px;
        max-height: 260px;
        overflow: auto;
        margin: 12px 0;
      }

      .ksk-msg-friend-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px;
        border-radius: 9px;
        background: var(--surface-color, rgba(127,127,127,.08));
      }

      .ksk-msg-friend-option input {
        width: 18px;
        height: 18px;
      }

      .ksk-msg-history {
        display: grid;
        gap: 9px;
        margin: 14px 0;
      }

      .ksk-msg-history-item {
        max-width: 85%;
        padding: 10px 13px;
        border-radius: 12px;
        background: var(--surface-color, #eee);
        overflow-wrap: anywhere;
      }

      .ksk-msg-history-item.from-me {
        justify-self: end;
        background: #dbeafe;
        color: #172554;
      }

      .ksk-msg-history-time {
        display: block;
        margin-top: 5px;
        font-size: 11px;
        opacity: .7;
      }

      .ksk-msg-send-form {
        display: grid;
        gap: 9px;
        margin-top: 12px;
      }

      .ksk-msg-compose {
        min-height: 48px;
        resize: vertical;
      }

      @media(max-width:480px) {
        .ksk-msg-row {
          flex-wrap: wrap;
        }

        .ksk-msg-row-main {
          flex-basis: calc(100% - 65px);
        }

        .ksk-msg-actions {
          width: 100%;
        }

        .ksk-msg-action {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function emptyMessage(title, description = "") {
    return `
      <div class="ksk-msg-empty">
        <div style="font-size:28px">💬</div>
        <strong>${escapeHTML(title)}</strong>
        ${description ? `<p>${escapeHTML(description)}</p>` : ""}
      </div>
    `;
  }

  async function loadFriends() {
    const api = friendsAPI();

    if (!api?.getDashboard) {
      friends = [];
      return false;
    }

    const result = await api.getDashboard();

    if (!result?.ok) {
      console.warn("Messages friends load:", result?.message);
      friends = [];
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
        throw new Error("Supabase Messages सेवा उपलब्ध छैन।");
      }

      const result = await api.getConversations();

      if (!result?.ok) {
        throw new Error(
          result?.message ||
          "कुराकानी लोड गर्न सकिएन।"
        );
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
      console.error("Messages load:", error);

      toast(
        error.message || "Messages लोड गर्न सकिएन।",
        "error"
      );

      return false;

    } finally {
      loading = false;
    }
  }

  async function loadMessages(conversationId) {
    const result = await service().getMessages(
      conversationId,
      { limit: 100 }
    );

    if (!result?.ok) {
      throw new Error(
        result?.message || "सन्देश लोड गर्न सकिएन।"
      );
    }

    activeMessages = Array.isArray(result.data)
      ? result.data
      : [];

    return true;
  }

  function getVisibleChats() {
    const prefs = readPreferences();
    const query = searchQuery.trim().toLowerCase();

    return conversations
      .filter(chat => {
        const id = String(chat.id);

        if (activeTab === "archived") {
          if (!prefs.archived.includes(id)) return false;
        } else if (prefs.archived.includes(id)) {
          return false;
        }

        if (
          activeTab === "pinned" &&
          !prefs.pinned.includes(id)
        ) {
          return false;
        }

        if (activeTab === "groups" && chat.type !== "group") {
          return false;
        }

        if (
          activeTab !== "groups" &&
          activeTab !== "all" &&
          activeTab !== "pinned" &&
          activeTab !== "archived"
        ) {
          return false;
        }

        if (query) {
          const name = getChatName(chat).toLowerCase();

          if (!name.includes(query)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const ap = prefs.pinned.includes(String(a.id)) ? 1 : 0;
        const bp = prefs.pinned.includes(String(b.id)) ? 1 : 0;

        if (activeTab !== "archived" && ap !== bp) {
          return bp - ap;
        }

        return new Date(b.lastMessageAt || b.createdAt || 0) -
          new Date(a.lastMessageAt || a.createdAt || 0);
      });
  }

  function renderChatRow(chat) {
    const id = String(chat.id);
    const name = getChatName(chat);
    const pinned = isPinned(id);

    const last = chat.lastMessage?.text ||
      t("कुराकानी खोल्नुहोस्", "Open conversation");

    return `
      <article class="ksk-msg-row">
        ${getAvatar(chat)}

        <div class="ksk-msg-row-main"
             role="button"
             tabindex="0"
             data-action="open-chat"
             data-id="${escapeHTML(id)}">

          <div class="ksk-msg-row-title">
            ${escapeHTML(name)} ${pinned ? "📌" : ""}
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
            ${pinned ? "Unpin" : "Pin"}
          </button>

          <button class="ksk-msg-action"
                  type="button"
                  data-action="toggle-archive"
                  data-id="${escapeHTML(id)}">
            ${isArchived(id) ? "Restore" : "Archive"}
          </button>
        </div>
      </article>
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
        <h3 class="section-title">${escapeHTML(title)}</h3>

        <div class="ksk-msg-toolbar">
          <input class="ksk-msg-search"
                 type="search"
                 data-message-search
                 value="${escapeHTML(searchQuery)}"
                 placeholder="${escapeHTML(t(
                   "कुराकानी खोज्नुहोस्...",
                   "Search conversations..."
                 ))}">
        </div>

        <div class="ksk-msg-tabs">
          ${renderTab("all", t("सबै", "All"))}
          ${renderTab("pinned", "📌 Pin")}
          ${renderTab("archived", "Archive")}
          ${renderTab("groups", "Groups")}
        </div>

        ${loading
          ? emptyMessage(
              t("लोड हुँदैछ...", "Loading...")
            )
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

        <div class="ksk-msg-note">
          ${escapeHTML(t(
            "तपाईंका कुराकानीहरू Supabase बाट लोड हुन्छन्।",
            "Your conversations are loaded from Supabase."
          ))}
        </div>
      </section>
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

  function renderGroupForm() {
    if (!friends.length) {
      return emptyMessage(
        t("साथी भेटिएनन्", "No friends found"),
        t(
          "Group बनाउन पहिले Supabase मा साथी हुनुपर्छ।",
          "Add friends before creating a group."
        )
      );
    }

    return `
      <form class="ksk-msg-form" data-group-form>
        <strong>${escapeHTML(t("नयाँ Group", "New group"))}</strong>

        <input class="ksk-msg-search"
               type="text"
               name="groupName"
               maxlength="${MAX_GROUP_NAME}"
               required
               placeholder="${escapeHTML(t(
                 "Group को नाम",
                 "Group name"
               ))}">

        <div class="ksk-msg-friend-options">
          ${friends.map(friend => `
            <label class="ksk-msg-friend-option">
              <input type="checkbox"
                     name="memberIds"
                     value="${escapeHTML(friend.id)}">
              <span>${escapeHTML(friend.name || "साथी")}</span>
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

  function renderGroups() {
    return `
      <section class="ksk-msg-page">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <h3>${escapeHTML(t("Group कुराकानी", "Group chats"))}</h3>

          <button class="ksk-msg-primary"
                  type="button"
                  data-action="open-group-form">
            + Group
          </button>
        </div>

        ${groupFormOpen ? renderGroupForm() : ""}

        <div class="ksk-msg-list">
          ${getVisibleChats().length
            ? getVisibleChats().map(renderChatRow).join("")
            : emptyMessage(
                t("Group छैन", "No groups yet")
              )}
        </div>
      </section>
    `;
  }

  function renderChatMessage(message) {
    const mine = Boolean(message.fromMe);

    return `
      <div class="ksk-msg-history-item ${mine ? "from-me" : ""}">
        ${escapeHTML(message.text || "")}

        <small class="ksk-msg-history-time">
          ${escapeHTML(formatTime(message.createdAt))}
        </small>
      </div>
    `;
  }

  function renderChat(chat = activeChat) {
    if (!chat) return renderConversationList();

    return `
      <section class="ksk-msg-page">
        <button class="ksk-msg-secondary"
                type="button"
                data-action="back">
          ← ${escapeHTML(t("सन्देश सूची", "Conversations"))}
        </button>

        <div class="ksk-msg-detail">
          <div style="display:flex;align-items:center;gap:10px">
            ${getAvatar(chat)}
            <strong>${escapeHTML(getChatName(chat))}</strong>
          </div>

          <div class="ksk-msg-history">
            ${activeMessages.length
              ? activeMessages.map(renderChatMessage).join("")
              : emptyMessage(
                  t("सन्देश छैन", "No messages yet")
                )}
          </div>

          <form class="ksk-msg-send-form" data-send-form>
            <textarea class="ksk-msg-compose"
                      name="message"
                      maxlength="5000"
                      required
                      placeholder="${escapeHTML(t(
                        "सन्देश लेख्नुहोस्...",
                        "Write a message..."
                      ))}"></textarea>

            <button class="ksk-msg-primary"
                    type="submit"
                    ${sending ? "disabled" : ""}>
              ${sending
                ? escapeHTML(t("पठाउँदै...", "Sending..."))
                : escapeHTML(t("पठाउनुहोस्", "Send"))}
            </button>
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

    if (activeTab === "groups") {
      return renderGroups();
    }

    return renderConversationList();
  }

  function refreshPage() {
    if (global.KSKApp?.refreshCurrentPage) {
      global.KSKApp.refreshCurrentPage();
      return true;
    }

    global.dispatchEvent(
      new CustomEvent("ksk:messages-updated")
    );

    return false;
  }

  function navigateToMessages() {
    if (global.KSKNavigation?.navigate) {
      return global.KSKNavigation.navigate("messages", {
        keepChat: true
      });
    }

    global.dispatchEvent(new CustomEvent("ksk:navigate", {
      detail: {
        page: "messages",
        options: { keepChat: true }
      }
    }));

    return true;
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

    refreshPage();

    try {
      await loadMessages(id);
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

    if (existing) {
      return openChat(existing.id);
    }

    const result = await service().createDirectChat(id);

    if (!result?.ok) {
      toast(
        result?.message || t(
          "कुराकानी सुरु गर्न सकिएन।",
          "Could not start conversation."
        ),
        "error"
      );
      return false;
    }

    await loadConversations();

    return openChat(result.data);
  }

  function closeChat() {
    activeChatId = null;
    activeChat = null;
    activeMessages = [];
    refreshPage();
    return true;
  }

  function togglePreference(type, id) {
    const state = readPreferences();
    const list = state[type];

    if (list.includes(id)) {
      state[type] = list.filter(item => item !== id);
    } else {
      state[type].unshift(id);
    }

    if (!savePreferences(state)) return false;

    refreshPage();
    return true;
  }

  async function createGroup(form) {
    const name = String(
      form.querySelector('[name="groupName"]')?.value || ""
    ).trim();

    const selected = Array.from(
      form.querySelectorAll(
        'input[name="memberIds"]:checked'
      )
    ).map(input => input.value);

    if (!name) {
      toast(t("Group को नाम लेख्नुहोस्।", "Enter a group name."), "warning");
      return false;
    }

    if (selected.length < 2) {
      toast(
        t(
          "Group बनाउन कम्तीमा दुई जना साथी छान्नुहोस्।",
          "Select at least two friends for a group."
        ),
        "warning"
      );
      return false;
    }

    const result = await service().createGroup(
      selected,
      name
    );

    if (!result?.ok) {
      toast(
        result?.message || t(
          "Group बनाउन सकिएन।",
          "Could not create group."
        ),
        "error"
      );
      return false;
    }

    groupFormOpen = false;
    activeTab = "groups";

    await loadConversations();
    refreshPage();

    toast(
      t("Group सफलतापूर्वक बन्यो।", "Group created successfully."),
      "success"
    );

    return true;
  }

  async function sendMessage(form) {
    if (sending || !activeChatId) return false;

    const input = form.querySelector('[name="message"]');
    const content = String(input?.value || "").trim();

    if (!content) return false;

    sending = true;
    refreshPage();

    try {
      const result = await service().sendMessage(
        activeChatId,
        content
      );

      if (!result?.ok) {
        throw new Error(
          result?.message || "सन्देश पठाउन सकिएन।"
        );
      }

      await loadMessages(activeChatId);
      await loadConversations();

      toast(
        t("सन्देश पठाइयो।", "Message sent."),
        "success"
      );

      return true;

    } catch (error) {
      toast(error.message, "error");
      return false;

    } finally {
      sending = false;
      refreshPage();
    }
  }

  function handleClick(event) {
    const target = event.target?.closest?.("[data-action]");

    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id || "";

    if (action === "open-chat") {
      event.preventDefault();
      openChat(id);
      return;
    }

    if (action === "back") {
      event.preventDefault();
      closeChat();
      return;
    }

    if (action === "set-tab") {
      activeTab = target.dataset.tab || "all";
      activeChatId = null;
      activeChat = null;
      activeMessages = [];
      groupFormOpen = false;
      refreshPage();
      return;
    }

    if (action === "toggle-pin") {
      togglePreference("pinned", id);
      return;
    }

    if (action === "toggle-archive") {
      togglePreference("archived", id);
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
    if (!event.target?.matches?.("[data-message-search]")) {
      return;
    }

    searchQuery = event.target.value || "";

    const wrapper = event.target.closest(".ksk-msg-page");
    if (!wrapper) return;

    const temporary = document.createElement("div");
    temporary.innerHTML = render();

    const replacement = temporary.firstElementChild;

    if (replacement) {
      wrapper.replaceWith(replacement);

      const input = replacement.querySelector(
        "[data-message-search]"
      );

      input?.focus();
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
      await sendMessage(event.target);
    }
  }

  function handleCloudChange(event) {
    const detail = event.detail || {};

    if (
      detail.action === "realtime-message" ||
      detail.action === "message-sent" ||
      detail.action === "conversation-created" ||
      detail.action === "group-created"
    ) {
      loadConversations().then(async () => {
        if (activeChatId) {
          try {
            await loadMessages(activeChatId);
          } catch (error) {
            console.warn(error);
          }
        }

        if (
          global.KSKNavigation?.getCurrentPage?.() === "messages"
        ) {
          refreshPage();
        }
      });
    }
  }

  function handleNavigation(event) {
    if (event.detail?.page !== "messages") {
      activeChatId = null;
      activeChat = null;
      activeMessages = [];
    }
  }

  async function initialize() {
    if (initialized) return true;

    initialized = true;

    ensureStyles();

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("input", handleInput);
    document.addEventListener("submit", handleSubmit);

    global.addEventListener(
      "ksk:messages-cloud-change",
      handleCloudChange
    );

    global.addEventListener(
      "ksk:navigate",
      handleNavigation
    );

    try {
      await service().initialize();

      await Promise.all([
        loadFriends(),
        loadConversations()
      ]);

      await service().startRealtime();

      refreshPage();

      return true;

    } catch (error) {
      console.error("Messages initialization:", error);

      toast(
        error.message || t(
          "Messages सुरु गर्न सकिएन।",
          "Messages could not initialize."
        ),
        "error"
      );

      return false;
    }
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
    sendMessage,

    async refresh() {
      await loadConversations();
      refreshPage();
      return true;
    },

    loadOlderMessages() {
      return false;
    },

    getActiveChatId() {
      return activeChatId;
    }
  });

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
