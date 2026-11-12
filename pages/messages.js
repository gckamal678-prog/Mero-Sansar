"use strict";

/*
 * =========================================================
 * MERO SANSAR — MESSAGES PAGE
 *
 * UI UPGRADE
 * - Search existing conversations
 * - Pin / Unpin conversations
 * - Archive / Unarchive conversations
 * - Local group setup (name + existing friends)
 * - Rename / Delete local groups
 * - Read-only existing conversation history
 *
 * IMPORTANT:
 * - Does not create chats.
 * - Does not send or post messages.
 * - Does not modify core/data.js data.
 * - Does not claim online/server synchronization.
 * - UI preferences are stored locally only.
 *
 * FUTURE ONLINE INTEGRATION:
 * Replace the local preference adapter with authenticated
 * server APIs and database policies when Supabase is added.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKMessagesPage) return;

  const STORAGE_KEY = "ksk_messages_ui_v1";
  const MAX_GROUP_NAME = 60;

  let initialized = false;
  let activeChatId = null;
  let activeGroupId = null;
  let activeTab = "all";
  let searchQuery = "";
  let groupFormOpen = false;

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;

  /* =======================================================
     HELPERS
  ======================================================= */

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

  function makeId(prefix = "item") {
    let id = "";

    try {
      id = global.crypto?.randomUUID?.() || "";
    } catch (_) {}

    if (!id) {
      id = Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10);
    }

    return prefix + "_" + id;
  }

  function toast(message, type = "info") {
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](message);
      return;
    }

    api?.show?.(message, type);
  }

  function getChats() {
    try {
      const value = DATA()?.getChats?.();
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error("Messages: could not read chats.", error);
      return [];
    }
  }

  function getFriends() {
    try {
      const value = DATA()?.getFriends?.();
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error("Messages: could not read friends.", error);
      return [];
    }
  }

  function getProfile() {
    try {
      return DATA()?.getProfile?.() || {};
    } catch (_) {
      return {};
    }
  }

  function getFriendName(friend) {
    return String(
      friend?.name ||
      friend?.fullName ||
      friend?.username ||
      t("साथी", "Friend")
    );
  }

  function getChatName(chat) {
    return String(
      chat?.name ||
      chat?.title ||
      chat?.username ||
      t("कुराकानी", "Conversation")
    );
  }

  function safeAvatar(value) {
    const avatar = String(value || "").trim();

    if (
      /^(https?:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,|blob:)/i.test(avatar)
    ) {
      return avatar;
    }

    return "";
  }

  function renderAvatar(person = {}) {
    const name = getChatName(person);
    const avatar = safeAvatar(person.avatar);

    if (avatar) {
      return `
        <span class="ksk-msg-avatar">
          <img
            src="${escapeHTML(avatar)}"
            alt="${escapeHTML(name)}"
            loading="lazy">
        </span>
      `;
    }

    return `
      <span class="ksk-msg-avatar ksk-msg-avatar-fallback">
        ${escapeHTML(name.trim().charAt(0) || "M")}
      </span>
    `;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );
  }

  function getLastMessage(chat) {
    const messages = Array.isArray(chat?.messages)
      ? chat.messages
      : [];

    if (!messages.length) return "";

    const last = messages[messages.length - 1];

    return String(last?.text || last?.message || "");
  }

  /* =======================================================
     LOCAL UI PREFERENCES
  ======================================================= */

  function emptyState() {
    return {
      version: 1,
      pinned: [],
      archived: [],
      groups: []
    };
  }

  function cleanIdList(value) {
    if (!Array.isArray(value)) return [];

    return [...new Set(
      value
        .map(item => String(item || "").trim())
        .filter(Boolean)
    )];
  }

  function readState() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (!raw) return emptyState();

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        return emptyState();
      }

      const groups = Array.isArray(parsed.groups)
        ? parsed.groups
            .filter(group =>
              group &&
              typeof group === "object" &&
              String(group.id || "").trim() &&
              String(group.name || "").trim()
            )
            .map(group => ({
              id: String(group.id),
              name: String(group.name).slice(0, MAX_GROUP_NAME),
              memberIds: cleanIdList(group.memberIds),
              createdAt: group.createdAt || ""
            }))
        : [];

      return {
        version: 1,
        pinned: cleanIdList(parsed.pinned),
        archived: cleanIdList(parsed.archived),
        groups
      };

    } catch (error) {
      console.warn("Messages UI preferences unavailable:", error);
      return emptyState();
    }
  }

  function writeState(nextState) {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextState)
      );

      return true;

    } catch (error) {
      console.error("Could not save Messages preferences:", error);

      toast(
        t(
          "स्थानीय भण्डारणमा सुरक्षित गर्न सकिएन। Storage खाली गर्नुहोस् वा ब्राउजर अनुमति जाँच गर्नुहोस्।",
          "Could not save locally. Check browser storage and permissions."
        ),
        "error"
      );

      return false;
    }
  }

  function updateState(mutator) {
    const state = readState();

    mutator(state);

    if (!writeState(state)) return false;

    refreshPage();
    return true;
  }

  function isPinned(chatId, state = readState()) {
    return state.pinned.includes(String(chatId));
  }

  function isArchived(chatId, state = readState()) {
    return state.archived.includes(String(chatId));
  }

  /* =======================================================
     STYLES
  ======================================================= */

  function ensureStyles() {
    if (document.getElementById("kskMessagesUpgradeStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "kskMessagesUpgradeStyles";

    style.textContent = `
      .ksk-msg-page {
        width: 100%;
        min-width: 0;
      }

      .ksk-msg-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin: 12px 0 16px;
      }

      .ksk-msg-search {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        padding: 12px 14px;
        border: 1px solid var(--border-color, #d8dce3);
        border-radius: 12px;
        background: var(--card-bg, #fff);
        color: var(--text-color, inherit);
        font: inherit;
      }

      .ksk-msg-tabs {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 2px 0 8px;
        scrollbar-width: thin;
      }

      /* ===================================================
         MESSAGE TABS — DARK / LIGHT THEME SUPPORT
      =================================================== */

      .ksk-msg-tab {
        flex: 0 0 auto;
        border: 1px solid var(--color-border-strong, #3b4c64);
        background: var(--color-surface-secondary, #172438);
        color: var(--color-text, #e5edf8);
        border-radius: 999px;
        padding: 8px 13px;
        white-space: nowrap;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
        opacity: 1;
        -webkit-text-fill-color: currentColor;
        transition: background-color .18s ease,
          color .18s ease,
          border-color .18s ease;
      }

      .ksk-msg-tab:hover {
        background: var(--color-surface-hover, #1e2d43);
        border-color: var(--color-primary, #60a5fa);
        color: var(--color-text, #e5edf8);
      }

      .ksk-msg-tab.is-active,
      .ksk-msg-tab.is-active:hover {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
        -webkit-text-fill-color: #ffffff;
      }

      html[data-theme="light"] .ksk-msg-tab {
        border-color: var(--color-border-strong, #cbd5e1);
        background: var(--color-surface-secondary, #f8fafc);
        color: var(--color-text, #172033);
        -webkit-text-fill-color: var(--color-text, #172033);
      }

      html[data-theme="light"] .ksk-msg-tab:hover {
        background: var(--color-surface-hover, #f1f5f9);
        color: var(--color-text, #172033);
        -webkit-text-fill-color: var(--color-text, #172033);
      }

      html[data-theme="light"] .ksk-msg-tab.is-active,
      html[data-theme="light"] .ksk-msg-tab.is-active:hover {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
        -webkit-text-fill-color: #ffffff;
      }

      .ksk-msg-list {
        display: grid;
        gap: 10px;
      }

      .ksk-msg-row {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px;
        border: 1px solid var(--border-color, #e1e5eb);
        border-radius: 14px;
        background: var(--card-bg, #fff);
        min-width: 0;
      }

      .ksk-msg-row-main {
        flex: 1;
        min-width: 0;
        color: inherit;
        text-decoration: none;
        cursor: pointer;
      }

      .ksk-msg-row-title {
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .ksk-msg-row-subtitle {
        color: var(--muted-color, #777);
        font-size: 13px;
        margin-top: 4px;
        overflow-wrap: anywhere;
      }

      .ksk-msg-avatar {
        width: 46px;
        height: 46px;
        min-width: 46px;
        border-radius: 50%;
        overflow: hidden;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-color, #e9edf3);
        font-weight: 700;
      }

      .ksk-msg-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ksk-msg-avatar-fallback {
        color: var(--text-color, #333);
      }

      .ksk-msg-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        justify-content: flex-end;
      }

      .ksk-msg-action {
        border: 1px solid var(--border-color, #ddd);
        background: transparent;
        color: inherit;
        border-radius: 9px;
        padding: 7px 9px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
      }

      .ksk-msg-action:focus-visible,
      .ksk-msg-tab:focus-visible,
      .ksk-msg-search:focus-visible,
      .ksk-msg-primary:focus-visible {
        outline: 2px solid var(--primary-color, #2563eb);
        outline-offset: 2px;
      }

      .ksk-msg-primary {
        border: 0;
        border-radius: 10px;
        padding: 10px 14px;
        background: var(--primary-color, #2563eb);
        color: #fff;
        cursor: pointer;
        font: inherit;
      }

      .ksk-msg-secondary {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 10px;
        padding: 9px 13px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
      }

      .ksk-msg-empty {
        padding: 28px 16px;
        text-align: center;
        border: 1px dashed var(--border-color, #ccc);
        border-radius: 14px;
        color: var(--muted-color, #777);
      }

      .ksk-msg-note {
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--surface-color, rgba(127,127,127,.09));
        color: var(--text-color, inherit);
        font-size: 13px;
        line-height: 1.55;
        margin: 12px 0;
      }

      .ksk-msg-form {
        display: grid;
        gap: 12px;
        padding: 14px;
        margin: 12px 0;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        background: var(--card-bg, #fff);
      }

      .ksk-msg-form input[type="text"] {
        width: 100%;
        box-sizing: border-box;
        padding: 11px 12px;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 10px;
        background: transparent;
        color: inherit;
        font: inherit;
      }

      .ksk-msg-friend-options {
        display: grid;
        gap: 8px;
        max-height: 230px;
        overflow: auto;
        padding: 4px;
      }

      .ksk-msg-friend-option {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px;
        border-radius: 9px;
        background: var(--surface-color, rgba(127,127,127,.06));
      }

      .ksk-msg-friend-option input {
        width: 18px;
        height: 18px;
      }

      .ksk-msg-detail {
        padding: 15px;
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        background: var(--card-bg, #fff);
      }

      .ksk-msg-detail-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .ksk-msg-history {
        display: grid;
        gap: 9px;
        margin-top: 14px;
      }

      .ksk-msg-history-item {
        padding: 10px 12px;
        border-radius: 11px;
        background: var(--surface-color, rgba(127,127,127,.08));
        overflow-wrap: anywhere;
      }

      .ksk-msg-history-time {
        display: block;
        color: var(--muted-color, #777);
        font-size: 11px;
        margin-top: 5px;
      }

      @media (max-width: 480px) {
        .ksk-msg-row {
          flex-wrap: wrap;
        }

        .ksk-msg-row-main {
          flex-basis: calc(100% - 65px);
        }

        .ksk-msg-actions {
          width: 100%;
          justify-content: flex-end;
        }

        .ksk-msg-action {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  function emptyMessage(title, description = "") {
    return `
      <div class="ksk-msg-empty">
        <div style="font-size:30px;margin-bottom:8px">💬</div>
        <strong>${escapeHTML(title)}</strong>
        ${description
          ? `<p>${escapeHTML(description)}</p>`
          : ""}
      </div>
    `;
  }

  /* =======================================================
     CONVERSATION LIST
  ======================================================= */

  function getVisibleChats() {
    const chats = getChats();
    const state = readState();
    const query = searchQuery.trim().toLocaleLowerCase();

    return chats
      .filter(chat => {
        const id = String(chat?.id || "");
        if (!id) return false;

        if (activeTab === "archived") {
          if (!isArchived(id, state)) return false;
        } else {
          if (isArchived(id, state)) return false;
        }

        if (activeTab === "pinned" && !isPinned(id, state)) {
          return false;
        }

        if (activeTab === "groups") return false;

        if (query) {
          const name = getChatName(chat).toLocaleLowerCase();

          if (!name.includes(query)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aPinned = isPinned(a.id, state) ? 1 : 0;
        const bPinned = isPinned(b.id, state) ? 1 : 0;

        if (activeTab !== "archived" && aPinned !== bPinned) {
          return bPinned - aPinned;
        }

        return 0;
      });
  }

  function renderChatRow(chat, state) {
    const id = String(chat.id);
    const name = getChatName(chat);
    const pinned = isPinned(id, state);
    const archived = isArchived(id, state);
    const lastMessage = getLastMessage(chat);

    return `
      <article class="ksk-msg-row">
        ${renderAvatar({
          name,
          avatar: chat.avatar
        })}

        <div
          class="ksk-msg-row-main"
          role="button"
          tabindex="0"
          data-action="open-chat"
          data-id="${escapeHTML(id)}"
          aria-label="${escapeHTML(name)}">

          <div class="ksk-msg-row-title">
            ${escapeHTML(name)}
            ${pinned ? " 📌" : ""}
          </div>

          <div class="ksk-msg-row-subtitle">
            ${lastMessage
              ? escapeHTML(lastMessage.slice(0, 90))
              : escapeHTML(t(
                  "कुराकानी खोल्नुहोस्",
                  "Open conversation"
                ))}
          </div>
        </div>

        <div class="ksk-msg-actions">
          <button
            class="ksk-msg-action"
            type="button"
            data-action="toggle-pin"
            data-id="${escapeHTML(id)}">
            ${pinned
              ? escapeHTML(t("Unpin", "Unpin"))
              : escapeHTML(t("Pin", "Pin"))}
          </button>

          <button
            class="ksk-msg-action"
            type="button"
            data-action="toggle-archive"
            data-id="${escapeHTML(id)}">
            ${archived
              ? escapeHTML(t("फिर्ता", "Restore"))
              : escapeHTML(t("Archive", "Archive"))}
          </button>
        </div>
      </article>
    `;
  }

  function renderConversationList() {
    const state = readState();
    const chats = getVisibleChats();

    const title = activeTab === "archived"
      ? t("Archive गरिएका कुराकानी", "Archived conversations")
      : activeTab === "pinned"
        ? t("Pin गरिएका कुराकानी", "Pinned conversations")
        : t("कुराकानीहरू", "Conversations");

    return `
      <section class="ksk-msg-page">
        <h3 class="section-title">${escapeHTML(title)}</h3>

        <div class="ksk-msg-toolbar">
          <input
            class="ksk-msg-search"
            type="search"
            data-message-search
            value="${escapeHTML(searchQuery)}"
            placeholder="${escapeHTML(t(
              "कुराकानी खोज्नुहोस्...",
              "Search conversations..."
            ))}"
            aria-label="${escapeHTML(t(
              "कुराकानी खोज्नुहोस्",
              "Search conversations"
            ))}">
        </div>

        <div class="ksk-msg-tabs" role="tablist">
          ${renderTab("all", t("सबै", "All"))}
          ${renderTab("pinned", t("Pin", "Pinned"))}
          ${renderTab("archived", t("Archive", "Archived"))}
          ${renderTab("groups", t("Groups", "Groups"))}
        </div>

        <div class="ksk-msg-list">
          ${chats.length
            ? chats.map(chat => renderChatRow(chat, state)).join("")
            : emptyMessage(
                t("कुराकानी भेटिएन", "No conversations found"),
                t(
                  "अहिले देखाउन मिल्ने कुराकानी छैन।",
                  "There are no conversations to show here."
                )
              )}
        </div>

        <div class="ksk-msg-note">
          ${escapeHTML(t(
            "सन्देश पठाउने र अनलाइन कुराकानी सुविधा SQL/Supabase जडान भएपछि सक्रिय हुनेछ।",
            "Sending messages and online chat will be enabled after SQL/Supabase integration."
          ))}
        </div>
      </section>
    `;
  }

  function renderTab(id, label) {
    return `
      <button
        type="button"
        role="tab"
        aria-selected="${activeTab === id ? "true" : "false"}"
        class="ksk-msg-tab ${activeTab === id ? "is-active" : ""}"
        data-action="set-tab"
        data-tab="${id}">
        ${escapeHTML(label)}
      </button>
    `;
  }

  /* =======================================================
     GROUP SETUP
  ======================================================= */

  function renderGroupForm() {
    const friends = getFriends();

    if (!friends.length) {
      return `
        <div class="ksk-msg-note">
          ${escapeHTML(t(
            "Group बनाउन पहिले Friends सूचीमा साथी हुनुपर्छ।",
            "Add friends to your Friends list before creating a group."
          ))}
        </div>
      `;
    }

    return `
      <form class="ksk-msg-form" data-group-form>
        <strong>${escapeHTML(t(
          "नयाँ Group Setup",
          "Set up a new group"
        ))}</strong>

        <input
          type="text"
          name="groupName"
          maxlength="${MAX_GROUP_NAME}"
          required
          placeholder="${escapeHTML(t(
            "Group को नाम",
            "Group name"
          ))}">

        <div class="ksk-msg-friend-options">
          ${friends.map(friend => {
            const id = String(friend.id || "");
            if (!id) return "";

            const name = getFriendName(friend);

            return `
              <label class="ksk-msg-friend-option">
                <input
                  type="checkbox"
                  name="memberIds"
                  value="${escapeHTML(id)}">
                <span>${escapeHTML(name)}</span>
              </label>
            `;
          }).join("")}
        </div>

        <div class="ksk-msg-note">
          ${escapeHTML(t(
            "यो Group को नाम र सदस्य सूची मात्र यस ब्राउजरमा सुरक्षित हुनेछ। Group Messaging अहिले उपलब्ध छैन।",
            "Only the group name and member list are stored in this browser. Group messaging is not available yet."
          ))}
        </div>

        <div class="ksk-msg-actions">
          <button class="ksk-msg-primary" type="submit">
            ${escapeHTML(t("Group सुरक्षित गर्नुहोस्", "Save group"))}
          </button>
          <button
            class="ksk-msg-secondary"
            type="button"
            data-action="close-group-form">
            ${escapeHTML(t("बन्द", "Close"))}
          </button>
        </div>
      </form>
    `;
  }

  function renderGroupRow(group) {
    const members = Array.isArray(group.memberIds)
      ? group.memberIds.length
      : 0;

    return `
      <article class="ksk-msg-row">
        <span class="ksk-msg-avatar ksk-msg-avatar-fallback">👥</span>

        <div
          class="ksk-msg-row-main"
          role="button"
          tabindex="0"
          data-action="open-group"
          data-id="${escapeHTML(group.id)}">

          <div class="ksk-msg-row-title">
            ${escapeHTML(group.name)}
          </div>

          <div class="ksk-msg-row-subtitle">
            ${members} ${escapeHTML(t("साथी", "members"))}
          </div>
        </div>

        <div class="ksk-msg-actions">
          <button
            class="ksk-msg-action"
            type="button"
            data-action="rename-group"
            data-id="${escapeHTML(group.id)}">
            ${escapeHTML(t("नाम बदल्नुहोस्", "Rename"))}
          </button>

          <button
            class="ksk-msg-action"
            type="button"
            data-action="delete-group"
            data-id="${escapeHTML(group.id)}">
            ${escapeHTML(t("हटाउनुहोस्", "Delete"))}
          </button>
        </div>
      </article>
    `;
  }

  function renderGroups() {
    const state = readState();

    const query = searchQuery.trim().toLocaleLowerCase();

    const groups = state.groups.filter(group =>
      !query || group.name.toLocaleLowerCase().includes(query)
    );

    return `
      <section class="ksk-msg-page">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <h3 class="section-title">
            ${escapeHTML(t("मेरो Groups", "My groups"))}
          </h3>

          <button
            class="ksk-msg-primary"
            type="button"
            data-action="open-group-form">
            + ${escapeHTML(t("Group Setup", "Set up group"))}
          </button>
        </div>

        <div class="ksk-msg-toolbar">
          <input
            class="ksk-msg-search"
            type="search"
            data-message-search
            value="${escapeHTML(searchQuery)}"
            placeholder="${escapeHTML(t(
              "Group खोज्नुहोस्...",
              "Search groups..."
            ))}">
        </div>

        ${groupFormOpen ? renderGroupForm() : ""}

        <div class="ksk-msg-list">
          ${groups.length
            ? groups.map(renderGroupRow).join("")
            : emptyMessage(
                t("Group छैन", "No groups yet"),
                t(
                  "साथीहरू छानेर आफ्नो Group Setup गर्न सक्नुहुन्छ।",
                  "You can set up a group by selecting friends."
                )
              )}
        </div>

        <div class="ksk-msg-note">
          ${escapeHTML(t(
            "यो Group Setup मात्र हो। वास्तविक Group Chat र अनलाइन सन्देश SQL/Supabase पछि जोडिनेछ।",
            "This is group setup only. Real group chat and online messaging will be added with SQL/Supabase."
          ))}
        </div>
      </section>
    `;
  }

  function renderGroupDetail(group) {
    const friends = getFriends();
    const members = group.memberIds
      .map(id => friends.find(friend =>
        String(friend.id) === String(id)
      ))
      .filter(Boolean);

    return `
      <section class="ksk-msg-page">
        <button
          class="ksk-msg-secondary"
          type="button"
          data-action="back">
          ← ${escapeHTML(t("फर्कनुहोस्", "Back"))}
        </button>

        <div class="ksk-msg-detail" style="margin-top:12px">
          <div class="ksk-msg-detail-header">
            <span class="ksk-msg-avatar ksk-msg-avatar-fallback">👥</span>
            <div>
              <h3 style="margin:0">${escapeHTML(group.name)}</h3>
              <small>${members.length} ${escapeHTML(t("साथी", "members"))}</small>
            </div>
          </div>

          <h4>${escapeHTML(t("सदस्यहरू", "Members"))}</h4>

          <div class="ksk-msg-list">
            ${members.length
              ? members.map(friend => `
                  <div class="ksk-msg-row">
                    ${renderAvatar({
                      name: getFriendName(friend),
                      avatar: friend.avatar
                    })}
                    <strong>${escapeHTML(getFriendName(friend))}</strong>
                  </div>
                `).join("")
              : emptyMessage(
                  t("सदस्य भेटिएनन्", "No members found")
                )}
          </div>

          <div class="ksk-msg-note">
            ${escapeHTML(t(
              "Group संरचना सुरक्षित छ। सन्देश पठाउने सुविधा अनलाइन Backend जडान भएपछि मात्र उपलब्ध हुनेछ।",
              "The group setup is saved locally. Messaging will be available after the online backend is connected."
            ))}
          </div>
        </div>
      </section>
    `;
  }

  /* =======================================================
     READ-ONLY EXISTING CHAT
  ======================================================= */

  function renderChatMessage(message) {
    const text = String(
      message?.text || message?.message || ""
    );

    const time = message?.time || message?.createdAt || "";

    return `
      <div class="ksk-msg-history-item">
        ${escapeHTML(text)}
        <small class="ksk-msg-history-time">
          ${escapeHTML(formatDate(time))}
        </small>
      </div>
    `;
  }

  function renderChat(chat) {
    const messages = Array.isArray(chat?.messages)
      ? chat.messages
      : [];

    return `
      <section class="ksk-msg-page">
        <button
          class="ksk-msg-secondary"
          type="button"
          data-action="back">
          ← ${escapeHTML(t("सन्देश सूची", "Conversations"))}
        </button>

        <div class="ksk-msg-detail" style="margin-top:12px">
          <div class="ksk-msg-detail-header">
            ${renderAvatar({
              name: getChatName(chat),
              avatar: chat.avatar
            })}
            <strong>${escapeHTML(getChatName(chat))}</strong>
          </div>

          <div class="ksk-msg-note">
            ${escapeHTML(t(
              "यो पुरानो कुराकानी पढ्न मात्र उपलब्ध छ। नयाँ सन्देश पठाउने सुविधा SQL/Supabase जडान भएपछि सक्रिय हुनेछ।",
              "This conversation is read-only. Sending new messages will be enabled after SQL/Supabase integration."
            ))}
          </div>

          <div class="ksk-msg-history">
            ${messages.length
              ? messages.map(renderChatMessage).join("")
              : emptyMessage(
                  t("सन्देश छैन", "No messages"),
                  t(
                    "यो कुराकानीमा देखाउन पुरानो सन्देश छैन।",
                    "There are no existing messages to display."
                  )
                )}
          </div>
        </div>
      </section>
    `;
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  function render() {
    ensureStyles();

    if (activeChatId) {
      const chat = getChats().find(item =>
        String(item.id) === String(activeChatId)
      );

      if (chat) return renderChat(chat);

      activeChatId = null;
    }

    if (activeGroupId) {
      const group = readState().groups.find(item =>
        String(item.id) === String(activeGroupId)
      );

      if (group) return renderGroupDetail(group);

      activeGroupId = null;
    }

    if (activeTab === "groups") {
      return renderGroups();
    }

    return renderConversationList();
  }

  /* =======================================================
     NAVIGATION / REFRESH
  ======================================================= */

  function refreshPage() {
    if (
      typeof global.KSKApp?.refreshCurrentPage === "function"
    ) {
      global.KSKApp.refreshCurrentPage();
      return true;
    }

    global.dispatchEvent(new CustomEvent("ksk:messages-updated"));
    return false;
  }

  function navigateToMessages() {
    const navigation = global.KSKNavigation;

    if (typeof navigation?.navigate === "function") {
      return navigation.navigate("messages", {
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

  function openChat(chatId) {
    const id = String(chatId || "");

    if (!id) return false;

    const exists = getChats().some(chat =>
      String(chat.id) === id
    );

    if (!exists) {
      toast(t("कुराकानी भेटिएन।", "Conversation not found."), "warning");
      return false;
    }

    activeChatId = id;
    activeGroupId = null;

    return navigateToMessages();
  }

  /*
   * Compatibility method:
   * It opens an already existing conversation only.
   * It never creates a new chat.
   */
  function openFriendChat(friendId) {
    const id = String(friendId || "");

    const chat = getChats().find(item =>
      String(item.userId || "") === id
    );

    if (!chat) {
      toast(
        t(
          "यो साथीसँग अझै कुराकानी छैन। अनलाइन Chat सुविधा Backend पछि सक्रिय हुनेछ।",
          "No existing conversation with this friend. Online chat will be enabled after backend integration."
        ),
        "info"
      );
      return false;
    }

    return openChat(chat.id);
  }

  function closeChat() {
    activeChatId = null;
    activeGroupId = null;
    refreshPage();
    return true;
  }

  /* =======================================================
     PIN / ARCHIVE ACTIONS
  ======================================================= */

  function togglePin(chatId) {
    const id = String(chatId || "");

    if (!id) return false;

    return updateState(state => {
      if (state.pinned.includes(id)) {
        state.pinned = state.pinned.filter(item => item !== id);
        toast(t("Pin हटाइयो।", "Conversation unpinned."));
      } else {
        state.pinned.unshift(id);
        toast(t("कुराकानी Pin गरियो।", "Conversation pinned."));
      }
    });
  }

  function toggleArchive(chatId) {
    const id = String(chatId || "");

    if (!id) return false;

    return updateState(state => {
      if (state.archived.includes(id)) {
        state.archived = state.archived.filter(item => item !== id);
        toast(t("कुराकानी फिर्ता ल्याइयो।", "Conversation restored."));
      } else {
        state.archived.push(id);
        toast(t("कुराकानी Archive गरियो।", "Conversation archived."));
      }
    });
  }

  /* =======================================================
     GROUP ACTIONS
  ======================================================= */

  function createGroup(form) {
    const nameInput = form.querySelector('[name="groupName"]');
    const name = String(nameInput?.value || "").trim();

    const selected = Array.from(
      form.querySelectorAll(
        'input[name="memberIds"]:checked'
      )
    ).map(input => String(input.value));

    if (!name) {
      toast(t("Group को नाम लेख्नुहोस्।", "Enter a group name."), "warning");
      nameInput?.focus();
      return false;
    }

    if (!selected.length) {
      toast(
        t("कम्तीमा एक जना साथी छान्नुहोस्।", "Select at least one friend."),
        "warning"
      );
      return false;
    }

    const friends = getFriends();
    const validIds = new Set(
      friends.map(friend => String(friend.id || ""))
    );

    const memberIds = cleanIdList(selected)
      .filter(id => validIds.has(id));

    if (!memberIds.length) {
      toast(t("मान्य साथी छान्नुहोस्।", "Select valid friends."), "warning");
      return false;
    }

    const state = readState();

    const duplicate = state.groups.some(group =>
      group.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );

    if (duplicate) {
      toast(
        t("यो नामको Group पहिले नै छ।", "A group with this name already exists."),
        "warning"
      );
      return false;
    }

    state.groups.unshift({
      id: makeId("group"),
      name: name.slice(0, MAX_GROUP_NAME),
      memberIds,
      createdAt: new Date().toISOString()
    });

    if (!writeState(state)) return false;

    groupFormOpen = false;
    searchQuery = "";

    toast(
      t("Group Setup सुरक्षित भयो।", "Group setup saved."),
      "success"
    );

    refreshPage();
    return true;
  }

  function renameGroup(groupId) {
    const id = String(groupId || "");
    const state = readState();

    const group = state.groups.find(item =>
      String(item.id) === id
    );

    if (!group) return false;

    const nextName = global.prompt(
      t("नयाँ Group नाम लेख्नुहोस्:", "Enter the new group name:"),
      group.name
    );

    if (nextName === null) return false;

    const name = String(nextName).trim();

    if (!name || name.length > MAX_GROUP_NAME) {
      toast(
        t(
          "Group नाम १ देखि ६० अक्षरसम्म हुनुपर्छ।",
          "Group name must be between 1 and 60 characters."
        ),
        "warning"
      );
      return false;
    }

    const duplicate = state.groups.some(item =>
      item.id !== id &&
      item.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );

    if (duplicate) {
      toast(t("यो Group नाम पहिले नै छ।", "That group name already exists."), "warning");
      return false;
    }

    group.name = name;

    if (!writeState(state)) return false;

    toast(t("Group नाम परिवर्तन भयो।", "Group renamed."), "success");
    refreshPage();
    return true;
  }

  function deleteGroup(groupId) {
    const id = String(groupId || "");

    const confirmed = global.confirm(
      t(
        "यो Group Setup हटाउने हो? यो काम फिर्ता गर्न सकिँदैन।",
        "Delete this group setup? This cannot be undone."
      )
    );

    if (!confirmed) return false;

    const state = readState();
    const before = state.groups.length;

    state.groups = state.groups.filter(group =>
      String(group.id) !== id
    );

    if (state.groups.length === before) return false;

    if (!writeState(state)) return false;

    if (activeGroupId === id) activeGroupId = null;

    toast(t("Group हटाइयो।", "Group deleted."), "success");
    refreshPage();
    return true;
  }

  /* =======================================================
     EVENT HANDLERS
  ======================================================= */

  function handleClick(event) {
    const target = event.target?.closest?.("[data-action]");

    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id || "";

    if (action === "open-chat" || action === "open-group") {
      event.preventDefault();

      if (action === "open-chat") {
        openChat(id);
      } else {
        activeGroupId = id;
        activeChatId = null;
        refreshPage();
      }

      return;
    }

    if (action === "toggle-pin") {
      event.preventDefault();
      togglePin(id);
      return;
    }

    if (action === "toggle-archive") {
      event.preventDefault();
      toggleArchive(id);
      return;
    }

    if (action === "set-tab") {
      event.preventDefault();

      activeTab = target.dataset.tab || "all";
      activeChatId = null;
      activeGroupId = null;
      searchQuery = "";
      groupFormOpen = false;

      refreshPage();
      return;
    }

    if (action === "open-group-form") {
      event.preventDefault();
      groupFormOpen = true;
      refreshPage();
      return;
    }

    if (action === "close-group-form") {
      event.preventDefault();
      groupFormOpen = false;
      refreshPage();
      return;
    }

    if (action === "rename-group") {
      event.preventDefault();
      renameGroup(id);
      return;
    }

    if (action === "delete-group") {
      event.preventDefault();
      deleteGroup(id);
      return;
    }

    if (action === "back") {
      event.preventDefault();
      closeChat();
    }
  }

  function handleKeyboard(event) {
    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    const target = event.target?.closest?.(
      '[data-action="open-chat"], [data-action="open-group"]'
    );

    if (!target) return;

    event.preventDefault();

    if (target.dataset.action === "open-chat") {
      openChat(target.dataset.id);
    } else {
      activeGroupId = target.dataset.id;
      activeChatId = null;
      refreshPage();
    }
  }

  function handleInput(event) {
    if (!event.target?.matches?.("[data-message-search]")) {
      return;
    }

    const input = event.target;
    const position = input.selectionStart;

    searchQuery = input.value || "";

    const page = render();
    const root = document.querySelector("#pageContent") ||
      document.querySelector("main") ||
      document.querySelector("#app");

    if (!root) return;

    /*
     * App navigation normally owns page rendering.
     * For search, update only the Messages page container.
     */
    const wrapper = input.closest(".ksk-msg-page");

    if (wrapper) {
      const temporary = document.createElement("div");
      temporary.innerHTML = page;

      const replacement = temporary.firstElementChild;

      if (replacement) {
        wrapper.replaceWith(replacement);

        const nextInput = replacement.querySelector(
          "[data-message-search]"
        );

        nextInput?.focus();

        try {
          nextInput?.setSelectionRange(position, position);
        } catch (_) {}
      }
    }
  }

  function handleSubmit(event) {
    if (!event.target?.matches?.("[data-group-form]")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    createGroup(event.target);
  }

  function handleNavigation(event) {
    const page = event.detail?.page;
    const options = event.detail?.options || {};

    if (page !== "messages") {
      activeChatId = null;
      activeGroupId = null;
      return;
    }

    if (!options.keepChat) {
      activeChatId = null;
      activeGroupId = null;
    }
  }

  function handleStorage(event) {
    if (event.key !== STORAGE_KEY) return;

    if (
      global.KSKApp?.refreshCurrentPage &&
      global.KSKNavigation?.getCurrentPage?.() === "messages"
    ) {
      refreshPage();
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

    ensureStyles();

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("input", handleInput);
    document.addEventListener("submit", handleSubmit);

    global.addEventListener("ksk:navigate", handleNavigation);
    global.addEventListener("storage", handleStorage);

    return true;
  }

  /* =======================================================
     PUBLIC API
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

    /*
     * Kept for compatibility with older callers.
     * Message posting is intentionally disabled until backend.
     */
    sendMessage() {
      toast(
        t(
          "सन्देश पठाउन SQL/Supabase जडान आवश्यक छ।",
          "Sending messages requires SQL/Supabase integration."
        ),
        "info"
      );
      return false;
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
