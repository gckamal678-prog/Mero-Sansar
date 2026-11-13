
"use strict";

/*
 * MERO SANSAR — NOTIFICATIONS PAGE
 *
 * Notifications:
 * - All / Unread filters
 * - Mark one / all as read
 * - Clear read notifications locally
 * - Group related notifications
 * - Notification type preferences
 *
 * Sounds:
 * - Only five MP3 files from KSKTone
 * - Individual sound buttons
 * - Tap a sound to save and preview immediately
 * - No select dropdown
 * - No page refresh after choosing a sound
 *
 * Storage:
 * - Notifications: KSKData
 * - UI preferences: ksk_notifications_ui_v1
 *
 * No backend or core/data.js changes.
 */

(function (global) {
  "use strict";

  if (global.KSKNotificationsPage) return;

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const TOAST = () => global.KSKToast || null;
  const TONE = () => global.KSKTone || null;

  const STORAGE_KEY = "ksk_notifications_ui_v1";
  const VERSION = 2;

  const TYPES = Object.freeze({
    friend_request: {
      ne: "मित्र अनुरोध",
      en: "Friend Request",
      icon: "👥"
    },
    friend_accepted: {
      ne: "अनुरोध स्वीकार",
      en: "Request Accepted",
      icon: "🤝"
    },
    follower: {
      ne: "नयाँ फलोअर",
      en: "New Follower",
      icon: "➕"
    },
    post_like: {
      ne: "पोस्ट लाइक",
      en: "Post Like",
      icon: "❤️"
    },
    post_comment: {
      ne: "पोस्ट टिप्पणी",
      en: "Post Comment",
      icon: "💬"
    },
    post_reaction: {
      ne: "पोस्ट प्रतिक्रिया",
      en: "Post Reaction",
      icon: "👍"
    },
    story_reaction: {
      ne: "स्टोरी प्रतिक्रिया",
      en: "Story Reaction",
      icon: "✨"
    },
    story_reply: {
      ne: "स्टोरी जवाफ",
      en: "Story Reply",
      icon: "↩️"
    },
    group_activity: {
      ne: "समूह गतिविधि",
      en: "Group Activity",
      icon: "👨‍👩‍👧‍👦"
    },
    message: {
      ne: "सन्देश",
      en: "Message",
      icon: "✉️"
    },
    system: {
      ne: "प्रणाली",
      en: "System",
      icon: "🔔"
    },
    other: {
      ne: "अन्य",
      en: "Other",
      icon: "📌"
    }
  });

  let initialized = false;

  function isEnglish() {
    return LANG()?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
  }

  function escapeHTML(value = "") {
    const text = String(value ?? "");

    if (typeof global.KSKUtils?.escapeHTML === "function") {
      return global.KSKUtils.escapeHTML(text);
    }

    return text.replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function notify(message, type = "info") {
    if (typeof TOAST()?.show === "function") {
      TOAST().show(message, type);
    }
  }

  /* =======================================================
     MP3 SOUND OPTIONS
  ======================================================= */

  function getToneOptions() {
    const tones = TONE()?.getTones?.();

    if (!Array.isArray(tones)) return [];

    return tones.filter(tone => {
      return (
        tone &&
        typeof tone.id === "string" &&
        tone.id.trim() &&
        typeof tone.src === "string" &&
        /\.mp3(?:[?#].*)?$/i.test(tone.src)
      );
    });
  }

  function isValidTone(id) {
    const key = String(id || "");

    return getToneOptions().some(tone => {
      return tone.id === key;
    });
  }

  /* =======================================================
     PREFERENCES
  ======================================================= */

  function makeDefaultPreferences() {
    const types = {};

    Object.keys(TYPES).forEach(type => {
      types[type] = true;
    });

    const tones = getToneOptions();
    const firstTone = tones[0]?.id || "";

    return {
      version: VERSION,
      enabled: true,
      types,
      filter: "all",
      readOverrides: {},
      dismissedIds: [],
      expandedGroups: {},
      soundEnabled: false,
      soundTone: firstTone
    };
  }

  function loadPreferences() {
    const defaults = makeDefaultPreferences();

    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (!raw) return defaults;

      const saved = JSON.parse(raw);

      if (!saved || typeof saved !== "object") {
        return defaults;
      }

      const savedTone = String(saved.soundTone || "");

      const selectedTone = isValidTone(savedTone)
        ? savedTone
        : defaults.soundTone;

      return {
        ...defaults,
        ...saved,

        version: VERSION,

        types: {
          ...defaults.types,
          ...(saved.types || {})
        },

        readOverrides:
          saved.readOverrides &&
          typeof saved.readOverrides === "object"
            ? saved.readOverrides
            : {},

        dismissedIds: Array.isArray(saved.dismissedIds)
          ? saved.dismissedIds.map(String)
          : [],

        expandedGroups:
          saved.expandedGroups &&
          typeof saved.expandedGroups === "object"
            ? saved.expandedGroups
            : {},

        soundEnabled: Boolean(saved.soundEnabled),

        soundTone: selectedTone
      };

    } catch (error) {
      console.warn(
        "Notification preferences load failed:",
        error
      );

      return defaults;
    }
  }

  function savePreferences(preferences) {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(preferences)
      );

      return true;

    } catch (error) {
      console.error(
        "Notification preferences save failed:",
        error
      );

      notify(
        t(
          "सेटिङ सुरक्षित गर्न सकिएन।",
          "Could not save settings."
        ),
        "error"
      );

      return false;
    }
  }

  /* =======================================================
     SOUND PLAYBACK
  ======================================================= */

  function playTone(id, purpose = "preview") {
    const engine = TONE();

    if (
      typeof engine?.play !== "function" ||
      !isValidTone(id)
    ) {
      if (purpose === "preview") {
        notify(
          t(
            "ध्वनि उपलब्ध छैन। MP3 फाइलको नाम र स्थान जाँच गर्नुहोस्।",
            "Sound is unavailable. Check the MP3 file name and path."
          ),
          "error"
        );
      }

      return Promise.resolve(false);
    }

    let result;

    try {
      result = engine.play(id);

    } catch (error) {
      console.warn("Tone playback failed:", error);
      return Promise.resolve(false);
    }

    return Promise.resolve(result)
      .then(success => {
        if (success === false && purpose === "preview") {
          notify(
            t(
              "यो MP3 बजाउन सकिएन। फाइलको नाम र स्थान जाँच गर्नुहोस्।",
              "This MP3 could not be played. Check the file name and path."
            ),
            "error"
          );
        }

        return success !== false;
      })
      .catch(error => {
        console.warn("Tone playback failed:", error);

        if (purpose === "preview") {
          notify(
            t(
              "यो ध्वनि अहिले बजाउन सकिएन।",
              "This sound could not be played."
            ),
            "error"
          );
        }

        return false;
      });
  }

  function updateToneSelectionUI(selectedId) {
    document.querySelectorAll(
      "[data-notification-tone]"
    ).forEach(button => {
      const selected =
        button.dataset.notificationTone === selectedId;

      button.classList.toggle("selected", selected);

      button.setAttribute(
        "aria-pressed",
        String(selected)
      );

      const tone = getToneOptions().find(item => {
        return item.id === selectedId;
      });

      const label = tone
        ? escapeHTML(isEnglish() ? tone.en : tone.ne)
        : "";

      button.textContent = selected
        ? "✓ " + label
        : label;
    });
  }

  const playedNotificationIds = new Set();

  function playIncomingNotification(item) {
    if (
      !item ||
      document.visibilityState !== "visible"
    ) {
      return false;
    }

    const preferences = loadPreferences();
    const type = classifyNotification(item);

    if (
      !preferences.enabled ||
      !preferences.soundEnabled ||
      preferences.types[type] === false
    ) {
      return false;
    }

    const id = getItemId(item);

    if (id && playedNotificationIds.has(id)) {
      return false;
    }

    if (id) {
      playedNotificationIds.add(id);

      if (playedNotificationIds.size > 500) {
        playedNotificationIds.delete(
          playedNotificationIds.values().next().value
        );
      }
    }

    playTone(preferences.soundTone, "incoming");

    return true;
  }

  /* =======================================================
     NOTIFICATION DATA
  ======================================================= */

  function getNotifications() {
    const list = DATA()?.getNotifications?.();

    return Array.isArray(list) ? list : [];
  }

  function getItemId(item) {
    return String(item?.id || "").trim();
  }

  function getItemDate(item) {
    const value = item?.createdAt || item?.time || 0;
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 0
      : date.getTime();
  }

  function formatDate(item) {
    const value = item?.createdAt || item?.time;

    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }

  /* =======================================================
     TYPE CLASSIFICATION
  ======================================================= */

  function normalizeType(value) {
    const type = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

    const aliases = {
      friend: "friend_request",
      request: "friend_request",
      friend_request_received: "friend_request",
      request_accepted: "friend_accepted",
      accepted: "friend_accepted",
      follow: "follower",
      new_follower: "follower",
      like: "post_like",
      post_liked: "post_like",
      comment: "post_comment",
      post_commented: "post_comment",
      reaction: "post_reaction",
      story_like: "story_reaction",
      story_reply_received: "story_reply",
      group: "group_activity",
      chat: "message",
      notification: "system"
    };

    const normalized = aliases[type] || type;

    return TYPES[normalized] ? normalized : "";
  }

  function classifyNotification(item = {}) {
    const explicit =
      normalizeType(item.type) ||
      normalizeType(item.category) ||
      normalizeType(item.action) ||
      normalizeType(item.event);

    if (explicit) return explicit;

    const text = String(item.text || "").toLowerCase();

    const rules = [
      ["friend_accepted", /accepted your|request accepted|स्वीकार/],
      ["friend_request", /friend request|sent you a request|मित्र अनुरोध|साथी अनुरोध/],
      ["follower", /started following|new follower|followed you|फलो/],
      ["post_comment", /commented|comment on|comment|टिप्पणी/],
      ["post_like", /liked your post|likes your post|पोस्ट मन परा|like/],
      ["story_reaction", /reacted to your story|story reaction|स्टोरी.*प्रतिक्रिया/],
      ["story_reply", /replied to your story|story reply|स्टोरी.*जवाफ/],
      ["group_activity", /group|समूह/],
      ["message", /message|सन्देश/],
      ["system", /system|security|सुरक्षा/]
    ];

    for (const [type, pattern] of rules) {
      if (pattern.test(text)) return type;
    }

    return "other";
  }

  function getTypeLabel(type) {
    const item = TYPES[type] || TYPES.other;

    return isEnglish() ? item.en : item.ne;
  }

  function getTypeIcon(type) {
    return (TYPES[type] || TYPES.other).icon;
  }

  /* =======================================================
     READ / HIDDEN STATE
  ======================================================= */

  function isRead(item, preferences) {
    const id = getItemId(item);

    if (
      id &&
      Object.prototype.hasOwnProperty.call(
        preferences.readOverrides,
        id
      )
    ) {
      return Boolean(preferences.readOverrides[id]);
    }

    return Boolean(item.read);
  }

  function isDismissed(item, preferences) {
    const id = getItemId(item);

    return Boolean(
      id && preferences.dismissedIds.includes(id)
    );
  }

  function visibleNotifications() {
    const preferences = loadPreferences();

    if (!preferences.enabled) return [];

    return getNotifications()
      .filter(item => !isDismissed(item, preferences))
      .filter(item => {
        return preferences.types[
          classifyNotification(item)
        ] !== false;
      })
      .filter(item => {
        return (
          preferences.filter !== "unread" ||
          !isRead(item, preferences)
        );
      });
  }

  function getCounts() {
    const preferences = loadPreferences();

    const all = getNotifications()
      .filter(item => !isDismissed(item, preferences))
      .filter(item => {
        return preferences.types[
          classifyNotification(item)
        ] !== false;
      });

    const unread = all.filter(
      item => !isRead(item, preferences)
    );

    return {
      all: all.length,
      unread: unread.length,
      read: all.length - unread.length
    };
  }

  /* =======================================================
     GROUPING
  ======================================================= */

  function getGroupKey(item, index) {
    const type = classifyNotification(item);

    const target =
      item.postId ||
      item.storyId ||
      item.groupId ||
      item.targetId ||
      item.entityId ||
      item.conversationId ||
      "";

    if (!target) {
      return (
        type +
        ":single:" +
        getItemId(item) +
        ":" +
        index
      );
    }

    return type + ":" + String(target);
  }

  function buildGroups(items) {
    const groups = new Map();

    items.forEach((item, index) => {
      const key = getGroupKey(item, index);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          type: classifyNotification(item),
          items: []
        });
      }

      groups.get(key).items.push(item);
    });

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        items: group.items.sort(
          (a, b) => getItemDate(b) - getItemDate(a)
        )
      }))
      .sort((a, b) => {
        return (
          getItemDate(b.items[0]) -
          getItemDate(a.items[0])
        );
      });
  }

  /* =======================================================
     STYLES
  ======================================================= */

  function ensureStyles() {
    if (
      document.getElementById(
        "ksk-notifications-v2-style"
      )
    ) {
      return;
    }

    const style = document.createElement("style");

    style.id = "ksk-notifications-v2-style";

    style.textContent = `
      .ksk-notifications {
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        padding: 4px 0 28px;
        color: var(--text-color, inherit);
      }

      .ksk-notif-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin: 4px 0 16px;
      }

      .ksk-notif-heading h2 {
        margin: 0;
        font-size: 21px;
      }

      .ksk-notif-counts,
      .ksk-notif-toolbar,
      .ksk-notif-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .ksk-notif-counts {
        margin-bottom: 14px;
      }

      .ksk-notif-count {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 12px;
        padding: 9px 12px;
        background: var(--card-bg, transparent);
        font-size: 13px;
      }

      .ksk-notif-toolbar {
        margin-bottom: 14px;
      }

      .ksk-notif-btn,
      .ksk-notif-tab {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 10px;
        padding: 9px 12px;
        background: var(--card-bg, transparent);
        color: inherit;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }

      .ksk-notif-btn.primary,
      .ksk-notif-tab.active {
        background: var(--primary-color, #2563eb);
        color: #fff;
        border-color: transparent;
      }

      .ksk-notif-btn:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .ksk-notif-tabs {
        margin: 12px 0;
        overflow-x: auto;
      }

      .ksk-notif-tab {
        border-radius: 999px;
        white-space: nowrap;
      }

      .ksk-notif-settings {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        padding: 14px;
        margin: 12px 0 18px;
        background: var(--card-bg, transparent);
      }

      .ksk-notif-settings[hidden],
      .ksk-notif-settings [hidden] {
        display: none !important;
      }

      .ksk-notif-settings h3 {
        margin: 0 0 12px;
        font-size: 16px;
      }

      .ksk-notif-setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid var(--border-color, #ddd);
        font-size: 14px;
      }

      .ksk-notif-setting-row:last-child {
        border-bottom: 0;
      }

      .ksk-notif-setting-row input {
        width: 18px;
        height: 18px;
        accent-color: var(--primary-color, #2563eb);
      }

      .ksk-notif-sound-note {
        margin: 8px 0 12px;
        font-size: 12px;
        line-height: 1.5;
        opacity: .72;
      }

      .ksk-notif-tone-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
      }

      .ksk-notif-tone-button {
        min-width: 0;
        min-height: 43px;
        padding: 9px 11px;
        border: 1px solid var(--border-color, #64748b);
        border-radius: 11px;
        background: var(--card-bg, transparent);
        color: inherit;
        font: inherit;
        font-size: 13px;
        text-align: left;
        cursor: pointer;
        transition:
          border-color .15s ease,
          background .15s ease;
      }

      .ksk-notif-tone-button.selected {
        border: 2px solid var(--primary-color, #3b82f6);
        background: var(--secondary-bg, rgba(59,130,246,.12));
        font-weight: 750;
      }

      .ksk-notif-tone-button:focus-visible,
      .ksk-notif-btn:focus-visible,
      .ksk-notif-tab:focus-visible,
      .ksk-notif-small-btn:focus-visible,
      .ksk-notif-group-toggle:focus-visible {
        outline: 2px solid var(--primary-color, #3b82f6);
        outline-offset: 2px;
      }

      .ksk-notif-list {
        display: grid;
        gap: 10px;
      }

      .ksk-notif-card,
      .ksk-notif-group {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        background: var(--card-bg, transparent);
      }

      .ksk-notif-card {
        padding: 13px;
      }

      .ksk-notif-card.unread,
      .ksk-notif-group.unread {
        border-left: 4px solid var(--primary-color, #2563eb);
      }

      .ksk-notif-card-head {
        display: flex;
        align-items: flex-start;
        gap: 11px;
      }

      .ksk-notif-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--secondary-bg, rgba(127,127,127,.12));
        font-size: 19px;
      }

      .ksk-notif-body {
        min-width: 0;
        flex: 1;
      }

      .ksk-notif-body p,
      .ksk-notif-group-item p {
        margin: 0;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .ksk-notif-meta {
        display: block;
        margin-top: 5px;
        opacity: .7;
        font-size: 12px;
      }

      .ksk-notif-actions {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        margin: 10px 0 0 51px;
      }

      .ksk-notif-small-btn {
        border: 0;
        background: transparent;
        color: var(--primary-color, #2563eb);
        padding: 5px 3px;
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }

      .ksk-notif-group {
        overflow: hidden;
      }

      .ksk-notif-group-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 13px;
        text-align: left;
        color: inherit;
        background: transparent;
        border: 0;
        font: inherit;
        cursor: pointer;
      }

      .ksk-notif-group-summary {
        min-width: 0;
        flex: 1;
      }

      .ksk-notif-group-summary strong {
        display: block;
        font-size: 14px;
      }

      .ksk-notif-group-summary small {
        display: block;
        opacity: .72;
        margin-top: 4px;
        font-size: 12px;
      }

      .ksk-notif-group-count {
        min-width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        border-radius: 20px;
        background: var(--secondary-bg, rgba(127,127,127,.12));
        font-size: 12px;
      }

      .ksk-notif-group-items {
        display: grid;
        gap: 8px;
        padding: 0 12px 12px 62px;
      }

      .ksk-notif-group-item {
        padding-top: 9px;
        border-top: 1px solid var(--border-color, #ddd);
        font-size: 13px;
      }

      .ksk-notif-empty {
        padding: 32px 16px;
        text-align: center;
        border: 1px dashed var(--border-color, #ddd);
        border-radius: 14px;
        opacity: .8;
      }

      .ksk-notif-empty-icon {
        font-size: 34px;
        margin-bottom: 8px;
      }

      @media (max-width: 480px) {
        .ksk-notif-heading h2 {
          font-size: 19px;
        }

        .ksk-notif-toolbar .ksk-notif-btn {
          flex: 1 1 auto;
        }

        .ksk-notif-card {
          padding: 11px;
        }

        .ksk-notif-actions {
          margin-left: 0;
        }

        .ksk-notif-group-items {
          padding-left: 14px;
        }

        .ksk-notif-tone-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ksk-notif-tone-button {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  function renderEmpty(message) {
    return `
      <div class="ksk-notif-empty">
        <div class="ksk-notif-empty-icon">🔔</div>

        <strong>${escapeHTML(message)}</strong>

        <p>${escapeHTML(t(
          "नयाँ सूचना आएपछि यहाँ देखिनेछन्।",
          "New notifications will appear here."
        ))}</p>
      </div>
    `;
  }

  function renderSingle(item, preferences) {
    const id = getItemId(item);
    const type = classifyNotification(item);
    const read = isRead(item, preferences);
    const text = escapeHTML(item.text || "");
    const date = escapeHTML(formatDate(item));

    return `
      <article
        class="ksk-notif-card ${read ? "" : "unread"}"
        data-notification-card="${escapeHTML(id)}">

        <div class="ksk-notif-card-head">
          <div class="ksk-notif-icon">
            ${getTypeIcon(type)}
          </div>

          <div class="ksk-notif-body">
            <p>${text}</p>

            <small class="ksk-notif-meta">
              ${escapeHTML(getTypeLabel(type))}
              ${date ? " · " + date : ""}
              ${
                read
                  ? ""
                  : " · " + escapeHTML(t("नयाँ", "New"))
              }
            </small>
          </div>
        </div>

        <div class="ksk-notif-actions">
          ${
            read
              ? `
                <button
                  type="button"
                  class="ksk-notif-small-btn"
                  data-notification-action="hide"
                  data-notification-id="${escapeHTML(id)}">
                  ${escapeHTML(t("हटाउनुहोस्", "Clear"))}
                </button>
              `
              : `
                <button
                  type="button"
                  class="ksk-notif-small-btn"
                  data-notification-action="read"
                  data-notification-id="${escapeHTML(id)}">
                  ${escapeHTML(t("पढेको बनाउनुहोस्", "Mark as read"))}
                </button>
              `
          }
        </div>
      </article>
    `;
  }

  function renderGroup(group, preferences) {
    const items = group.items;

    const unreadCount = items.filter(
      item => !isRead(item, preferences)
    ).length;

    const expanded = Boolean(
      preferences.expandedGroups[group.key]
    );

    const first = items[0] || {};
    const title = getTypeLabel(group.type);
    const count = items.length;

    const summary = count > 1
      ? t(
          `${count} वटा ${title} सूचनाहरू`,
          `${count} ${title} notifications`
        )
      : String(first.text || "");

    const children = expanded
      ? items.map(item => `
          <div class="ksk-notif-group-item">
            <p>${escapeHTML(item.text || "")}</p>

            <small class="ksk-notif-meta">
              ${escapeHTML(formatDate(item))}
              ${
                isRead(item, preferences)
                  ? ""
                  : " · " + escapeHTML(t("नपढेको", "Unread"))
              }
            </small>
          </div>
        `).join("")
      : "";

    return `
      <section class="ksk-notif-group ${unreadCount ? "unread" : ""}">
        <button
          type="button"
          class="ksk-notif-group-toggle"
          data-notification-action="toggle-group"
          data-group-key="${escapeHTML(group.key)}">

          <span class="ksk-notif-icon">
            ${getTypeIcon(group.type)}
          </span>

          <span class="ksk-notif-group-summary">
            <strong>${escapeHTML(summary)}</strong>

            <small>
              ${escapeHTML(title)}
              · ${escapeHTML(formatDate(first))}
              ${
                unreadCount
                  ? " · " + unreadCount + " " +
                    escapeHTML(t("नपढेको", "Unread"))
                  : ""
              }
            </small>
          </span>

          <span class="ksk-notif-group-count">${count}</span>

          <span aria-hidden="true">
            ${expanded ? "⌃" : "⌄"}
          </span>
        </button>

        ${
          expanded
            ? `<div class="ksk-notif-group-items">${children}</div>`
            : ""
        }
      </section>
    `;
  }

  function renderSettings(preferences) {
    const rows = Object.keys(TYPES).map(type => `
      <label class="ksk-notif-setting-row">
        <span>
          ${getTypeIcon(type)}
          ${escapeHTML(getTypeLabel(type))}
        </span>

        <input
          type="checkbox"
          data-notification-type="${escapeHTML(type)}"
          ${preferences.types[type] !== false ? "checked" : ""}>
      </label>
    `).join("");

    const tones = getToneOptions();

    const toneButtons = tones.map(tone => {
      const selected = preferences.soundTone === tone.id;

      return `
        <button
          type="button"
          class="ksk-notif-tone-button ${selected ? "selected" : ""}"
          data-notification-tone="${escapeHTML(tone.id)}"
          aria-pressed="${selected ? "true" : "false"}">

          ${selected ? "✓ " : ""}

          ${escapeHTML(
            isEnglish() ? tone.en : tone.ne
          )}
        </button>
      `;
    }).join("");

    return `
      <section
        class="ksk-notif-settings"
        id="kskNotificationSettings"
        hidden>

        <h3>
          ${escapeHTML(t("सूचना सेटिङ", "Notification Settings"))}
        </h3>

        <label class="ksk-notif-setting-row">
          <strong>
            ${escapeHTML(t("सबै सूचनाहरू", "All notifications"))}
          </strong>

          <input
            type="checkbox"
            data-notification-master
            ${preferences.enabled ? "checked" : ""}>
        </label>

        <div class="ksk-notif-sound-settings">
          <label class="ksk-notif-setting-row">
            <strong>
              🔊
              ${escapeHTML(t("सूचनाको ध्वनि", "Notification sound"))}
            </strong>

            <input
              type="checkbox"
              data-notification-sound-master
              ${preferences.soundEnabled ? "checked" : ""}>
          </label>

          <strong>
            ${escapeHTML(
              t("आफ्नो ध्वनि छान्नुहोस्", "Choose your sound")
            )}
          </strong>

          <div class="ksk-notif-tone-grid">
            ${
              toneButtons ||
              `<p class="ksk-notif-sound-note">${
                escapeHTML(t(
                  "ध्वनि फाइल उपलब्ध छैन।",
                  "No sound files are available."
                ))
              }</p>`
            }
          </div>

          <p class="ksk-notif-sound-note">
            ${escapeHTML(t(
              "कुनै ध्वनि थिच्दा तुरुन्तै बज्छ र छनोट सुरक्षित हुन्छ। नयाँ सूचना आउँदा बजाउन माथिको ध्वनि विकल्प खोल्नुहोस्।",
              "Tap a sound to play its preview and save your choice. Turn on notification sound above to use it for new notifications."
            ))}
          </p>
        </div>

        <div
          id="kskNotificationTypeSettings"
          ${preferences.enabled ? "" : "hidden"}>
          ${rows}
        </div>

        <p class="ksk-notif-meta">
          ${escapeHTML(t(
            "यी प्राथमिकताले यस डिभाइसमा देखिने सूचना मात्र नियन्त्रण गर्छन्।",
            "These preferences control notifications on this device only."
          ))}
        </p>
      </section>
    `;
  }

  function render() {
    ensureStyles();

    const preferences = loadPreferences();
    const counts = getCounts();
    const allNotifications = visibleNotifications();
    const groups = buildGroups(allNotifications);

    const renderedGroups = groups.map(group => {
      return group.items.length > 1
        ? renderGroup(group, preferences)
        : renderSingle(group.items[0], preferences);
    }).join("");

    let emptyMessage = t(
      "अहिले कुनै सूचना छैन",
      "No notifications yet"
    );

    if (!preferences.enabled) {
      emptyMessage = t(
        "सबै सूचनाहरू बन्द छन्",
        "Notifications are turned off"
      );
    } else if (preferences.filter === "unread") {
      emptyMessage = t(
        "नपढेका सूचना छैनन्",
        "No unread notifications"
      );
    }

    return `
      <section class="ksk-notifications">

        <header class="ksk-notif-heading">
          <h2>
            ${escapeHTML(t("सूचनाहरू", "Notifications"))}
          </h2>

          <button
            type="button"
            class="ksk-notif-btn"
            data-notification-action="settings">
            ⚙️
            ${escapeHTML(t("सेटिङ", "Settings"))}
          </button>
        </header>

        <div class="ksk-notif-counts">
          <div class="ksk-notif-count">
            ${escapeHTML(t("सबै", "All"))}:
            <strong>${counts.all}</strong>
          </div>

          <div class="ksk-notif-count">
            ${escapeHTML(t("नपढेका", "Unread"))}:
            <strong>${counts.unread}</strong>
          </div>

          <div class="ksk-notif-count">
            ${escapeHTML(t("पढेका", "Read"))}:
            <strong>${counts.read}</strong>
          </div>
        </div>

        <div class="ksk-notif-toolbar">
          <button
            type="button"
            class="ksk-notif-btn primary"
            data-notification-action="mark-all"
            ${counts.unread ? "" : "disabled"}>
            ✓
            ${escapeHTML(t(
              "सबै पढेको बनाउनुहोस्",
              "Mark all as read"
            ))}
          </button>

          <button
            type="button"
            class="ksk-notif-btn"
            data-notification-action="clear-read"
            ${counts.read ? "" : "disabled"}>
            ${escapeHTML(t(
              "पढेका सूचना हटाउनुहोस्",
              "Clear read notifications"
            ))}
          </button>
        </div>

        <nav
          class="ksk-notif-tabs"
          aria-label="Notification filters">

          <button
            type="button"
            class="ksk-notif-tab ${
              preferences.filter === "all" ? "active" : ""
            }"
            data-notification-filter="all">
            ${escapeHTML(t("सबै", "All"))}
          </button>

          <button
            type="button"
            class="ksk-notif-tab ${
              preferences.filter === "unread" ? "active" : ""
            }"
            data-notification-filter="unread">
            ${escapeHTML(t("नपढेका", "Unread"))}
          </button>
        </nav>

        ${renderSettings(preferences)}

        <div class="ksk-notif-list">
          ${renderedGroups || renderEmpty(emptyMessage)}
        </div>

      </section>
    `;
  }

  /* =======================================================
     PAGE ACTIONS
  ======================================================= */

  function refresh() {
    if (
      global.KSKApp?.getCurrentPage?.() === "notifications"
    ) {
      global.KSKApp.refreshCurrentPage?.();
    }
  }

  function markOneAsRead(id) {
    const key = String(id || "").trim();

    if (!key) return false;

    const preferences = loadPreferences();

    preferences.readOverrides[key] = true;

    const saved = savePreferences(preferences);

    if (saved) refresh();

    return saved;
  }

  function clearOne(id) {
    const key = String(id || "").trim();

    if (!key) return false;

    const preferences = loadPreferences();

    if (!preferences.dismissedIds.includes(key)) {
      preferences.dismissedIds.push(key);
    }

    const saved = savePreferences(preferences);

    if (saved) refresh();

    return saved;
  }

  function markAllAsRead() {
    const api = DATA();

    if (
      typeof api?.markNotificationsRead !== "function"
    ) {
      notify(
        t(
          "पढेको बनाउने सुविधा उपलब्ध छैन।",
          "Mark as read is unavailable."
        ),
        "error"
      );

      return false;
    }

    const result = api.markNotificationsRead();

    if (result === false) {
      notify(
        t(
          "सूचना पढेको बनाउन सकिएन।",
          "Could not mark notifications as read."
        ),
        "error"
      );

      return false;
    }

    const preferences = loadPreferences();

    preferences.readOverrides = {};

    savePreferences(preferences);
    refresh();

    notify(
      t(
        "सबै सूचना पढेको बनाइयो।",
        "All notifications marked as read."
      ),
      "success"
    );

    return true;
  }

  function clearReadNotifications() {
    const preferences = loadPreferences();

    const readItems = getNotifications().filter(item => {
      return (
        !isDismissed(item, preferences) &&
        isRead(item, preferences)
      );
    });

    if (!readItems.length) return false;

    const ids = readItems
      .map(getItemId)
      .filter(Boolean);

    preferences.dismissedIds = Array.from(
      new Set([
        ...preferences.dismissedIds,
        ...ids
      ])
    );

    const saved = savePreferences(preferences);

    if (saved) {
      refresh();

      notify(
        t(
          "पढेका सूचना यस डिभाइसको सूचीबाट हटाइयो।",
          "Read notifications cleared from this device's list."
        ),
        "success"
      );
    }

    return saved;
  }

  function toggleGroup(key) {
    const preferences = loadPreferences();

    preferences.expandedGroups[key] =
      !preferences.expandedGroups[key];

    if (savePreferences(preferences)) {
      refresh();
    }
  }

  function toggleSettings() {
    const panel = document.getElementById(
      "kskNotificationSettings"
    );

    if (!panel) return;

    panel.hidden = !panel.hidden;
  }

  /* =======================================================
     EVENT HANDLERS
  ======================================================= */

  function handleClick(event) {
    const target = event.target;

    /*
     * Sound button handling comes first.
     * No refresh, navigation or page redraw here.
     */
    const toneButton = target?.closest?.(
      "[data-notification-tone]"
    );

    if (toneButton) {
      const selectedTone = String(
        toneButton.dataset.notificationTone || ""
      );

      if (!isValidTone(selectedTone)) return;

      const preferences = loadPreferences();

      preferences.soundTone = selectedTone;

      if (savePreferences(preferences)) {
        updateToneSelectionUI(selectedTone);

        /*
         * Preview is started directly from the user's tap.
         * The current page remains open.
         */
        playTone(selectedTone, "preview");
      }

      return;
    }

    const filter = target?.closest?.(
      "[data-notification-filter]"
    );

    if (filter) {
      const value = filter.dataset.notificationFilter;

      if (value !== "all" && value !== "unread") {
        return;
      }

      const preferences = loadPreferences();

      preferences.filter = value;

      if (savePreferences(preferences)) {
        refresh();
      }

      return;
    }

    const button = target?.closest?.(
      "[data-notification-action]"
    );

    if (!button) return;

    switch (button.dataset.notificationAction) {
      case "settings":
        toggleSettings();
        break;

      case "mark-all":
        markAllAsRead();
        break;

      case "clear-read":
        clearReadNotifications();
        break;

      case "read":
        markOneAsRead(
          button.dataset.notificationId
        );
        break;

      case "hide":
        clearOne(
          button.dataset.notificationId
        );
        break;

      case "toggle-group":
        toggleGroup(
          button.dataset.groupKey || ""
        );
        break;

      default:
        break;
    }
  }

  function handleChange(event) {
    const target = event.target;

    const master = target?.closest?.(
      "[data-notification-master]"
    );

    if (master) {
      const preferences = loadPreferences();

      preferences.enabled = Boolean(master.checked);

      savePreferences(preferences);
      refresh();

      return;
    }

    const soundMaster = target?.closest?.(
      "[data-notification-sound-master]"
    );

    if (soundMaster) {
      const preferences = loadPreferences();

      preferences.soundEnabled = Boolean(
        soundMaster.checked
      );

      savePreferences(preferences);

      return;
    }

    const typeInput = target?.closest?.(
      "[data-notification-type]"
    );

    if (!typeInput) return;

    const type = typeInput.dataset.notificationType;

    if (!TYPES[type]) return;

    const preferences = loadPreferences();

    preferences.types[type] = Boolean(
      typeInput.checked
    );

    savePreferences(preferences);
    refresh();
  }

  function handleExternalChange(event) {
    const detail = event?.detail;

    if (
      detail?.collection === "ksk_notifications_v1" &&
      detail?.action === "add"
    ) {
      playIncomingNotification(detail.item);
    }

    if (
      global.KSKApp?.getCurrentPage?.() === "notifications"
    ) {
      refresh();
    }
  }

  function handleStorage(event) {
    if (
      event.key === STORAGE_KEY ||
      event.key === "ksk_notifications_v1"
    ) {
      if (
        global.KSKApp?.getCurrentPage?.() === "notifications"
      ) {
        refresh();
      }
    }
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return true;

    initialized = true;

    document.addEventListener(
      "click",
      handleClick
    );

    document.addEventListener(
      "change",
      handleChange
    );

    global.addEventListener(
      "ksk:data-change",
      handleExternalChange
    );

    global.addEventListener(
      "ksk:social-change",
      handleExternalChange
    );

    global.addEventListener(
      "storage",
      handleStorage
    );

    global.addEventListener(
      "ksk:language-change",
      function () {
        refresh();
      }
    );

    ensureStyles();

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKNotificationsPage = Object.freeze({
    initialize,
    render,
    refresh,
    getNotifications,
    getCounts,
    classifyNotification,
    markAllAsRead,
    clearReadNotifications
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
