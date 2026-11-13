
"use strict";

/*
 * =========================================================
 * MERO SANSAR — NOTIFICATIONS PAGE
 *
 * PHASE 6 — NOTIFICATION SOUND UPGRADE
 *
 * FEATURES:
 * - Notification type classification
 * - Notification preferences
 * - Five built-in notification tones
 * - Enable / Disable notification sound
 * - Select preferred notification tone
 * - Test selected notification tone
 * - Incoming notification sound
 * - Duplicate sound prevention
 * - Group notifications
 * - All / Unread filtering
 * - Mark one notification as read
 * - Mark all as read
 * - Clear read notifications (local hide)
 *
 * STORAGE:
 * - Existing notifications: KSKData
 * - UI preferences: ksk_notifications_ui_v1
 *
 * NO core/data.js changes.
 * NO backend / SQL / server sync claims.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKNotificationsPage) return;

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const TOAST = () => global.KSKToast || null;

  const STORAGE_KEY = "ksk_notifications_ui_v1";
  const VERSION = 1;

  const TYPES = Object.freeze({
    friend_request: {
      ne: "Friend Request",
      en: "Friend Request",
      icon: "👥"
    },
    friend_accepted: {
      ne: "Request Accepted",
      en: "Request Accepted",
      icon: "🤝"
    },
    follower: {
      ne: "New Follower",
      en: "New Follower",
      icon: "➕"
    },
    post_like: {
      ne: "Post Like",
      en: "Post Like",
      icon: "❤️"
    },
    post_comment: {
      ne: "Post Comment",
      en: "Post Comment",
      icon: "💬"
    },
    post_reaction: {
      ne: "Post Reaction",
      en: "Post Reaction",
      icon: "👍"
    },
    story_reaction: {
      ne: "Story Reaction",
      en: "Story Reaction",
      icon: "✨"
    },
    story_reply: {
      ne: "Story Reply",
      en: "Story Reply",
      icon: "↩️"
    },
    group_activity: {
      ne: "Group Activity",
      en: "Group Activity",
      icon: "👨‍👩‍👧‍👦"
    },
    message: {
      ne: "Message",
      en: "Message",
      icon: "✉️"
    },
    system: {
      ne: "System",
      en: "System",
      icon: "🔔"
    },
    other: {
      ne: "Other",
      en: "Other",
      icon: "📌"
    }
  });

  let initialized = false;

  /* =======================================================
     LANGUAGE / HELPERS
  ======================================================= */

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

  function makeDefaultPreferences() {
    const types = {};

    Object.keys(TYPES).forEach(type => {
      types[type] = true;
    });

    return {
      version: VERSION,
      enabled: true,
      types,
      filter: "all",
      readOverrides: {},
      dismissedIds: [],
      expandedGroups: {},

      soundEnabled: false,
      soundTone: "soft_bell"
    };
  }

  function loadPreferences() {
    const defaults = makeDefaultPreferences();

    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (!raw) return defaults;

      const saved = JSON.parse(raw);

      if (
        !saved ||
        typeof saved !== "object" ||
        saved.version !== VERSION
      ) {
        return defaults;
      }

      return {
        ...defaults,
        ...saved,

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

        soundTone:
          typeof saved.soundTone === "string" &&
          [
            "soft_bell",
            "bright_chime",
            "double_ping",
            "marimba",
            "gentle_alert"
          ].includes(saved.soundTone)
            ? saved.soundTone
            : "soft_bell"
      };

    } catch (error) {
      console.warn(
        "Notification preferences could not be loaded:",
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
        "Notification preferences could not be saved:",
        error
      );

      notify(
        t(
          "सेटिङ सुरक्षित गर्न सकिएन।",
          "Could not save notification settings."
        ),
        "error"
      );

      return false;
    }
  }

  /* =======================================================
     NOTIFICATION SOUND — FIVE BUILT-IN TONES
  ======================================================= */

  let notificationAudioContext = null;

  const playedNotificationIds = new Set();

  const SOUND_TONES = Object.freeze({
    soft_bell: {
      ne: "हल्का घण्टी",
      en: "Soft Bell",
      notes: [
        [660, 0.22],
        [880, 0.38]
      ],
      wave: "sine"
    },

    bright_chime: {
      ne: "चम्किलो धुन",
      en: "Bright Chime",
      notes: [
        [784, 0.16],
        [988, 0.20],
        [1175, 0.34]
      ],
      wave: "triangle"
    },

    double_ping: {
      ne: "दुई पटकको धुन",
      en: "Double Ping",
      notes: [
        [880, 0.16],
        [880, 0.16]
      ],
      wave: "sine"
    },

    marimba: {
      ne: "मधुर धुन",
      en: "Marimba",
      notes: [
        [523, 0.18],
        [659, 0.18],
        [784, 0.32]
      ],
      wave: "triangle"
    },

    gentle_alert: {
      ne: "शान्त सूचना धुन",
      en: "Gentle Alert",
      notes: [
        [587, 0.24],
        [698, 0.30]
      ],
      wave: "sine"
    }
  });

  function getAudioContext() {
    const AudioContextClass =
      global.AudioContext ||
      global.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!notificationAudioContext) {
      notificationAudioContext =
        new AudioContextClass();
    }

    return notificationAudioContext;
  }

  async function unlockNotificationAudio() {
    try {
      const context = getAudioContext();

      if (!context) return false;

      if (context.state === "suspended") {
        await context.resume();
      }

      return context.state === "running";

    } catch (error) {
      console.warn(
        "Notification audio unavailable:",
        error
      );

      return false;
    }
  }

  async function playNotificationTone(toneName) {
    const tone = SOUND_TONES[toneName];

    if (!tone) return false;

    try {
      const context = getAudioContext();

      if (!context) return false;

      if (context.state === "suspended") {
        await context.resume();
      }

      if (context.state !== "running") return false;

      let startAt = context.currentTime + 0.04;

      tone.notes.forEach(([frequency, duration]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = tone.wave;

        oscillator.frequency.setValueAtTime(
          frequency,
          startAt
        );

        gain.gain.setValueAtTime(
          0.0001,
          startAt
        );

        gain.gain.exponentialRampToValueAtTime(
          0.13,
          startAt + 0.025
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startAt + duration
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.02);

        startAt += duration + 0.09;
      });

      return true;

    } catch (error) {
      console.warn(
        "Could not play notification tone:",
        error
      );

      return false;
    }
  }

  function playSelectedNotificationSound() {
    const preferences = loadPreferences();

    if (!preferences.soundEnabled) {
      notify(
        t(
          "पहिले सूचना आवाज खोल्नुहोस्।",
          "Turn notification sound on first."
        ),
        "info"
      );

      return;
    }

    playNotificationTone(
      preferences.soundTone || "soft_bell"
    ).then(success => {
      if (!success) {
        notify(
          t(
            "आवाज चलाउन सकिएन। फेरि प्रयास गर्नुहोस्।",
            "Could not play sound. Please try again."
          ),
          "error"
        );
      }
    });
  }

  function playIncomingNotificationSound(item) {
    if (!item || !item.id) return;

    const id = String(item.id);

    if (playedNotificationIds.has(id)) return;

    const preferences = loadPreferences();

    if (
      !preferences.enabled ||
      !preferences.soundEnabled ||
      preferences.types[classifyNotification(item)] === false ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    playedNotificationIds.add(id);

    if (playedNotificationIds.size > 100) {
      const first = playedNotificationIds.values().next().value;

      playedNotificationIds.delete(first);
    }

    playNotificationTone(
      preferences.soundTone || "soft_bell"
    );
  }

  /* =======================================================
     DATA
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
     READ STATE
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
        const type = classifyNotification(item);

        return preferences.types[type] !== false;
      })
      .filter(item => {
        if (preferences.filter === "unread") {
          return !isRead(item, preferences);
        }

        return true;
      });
  }

  function getCounts() {
    const preferences = loadPreferences();

    const all = getNotifications()
      .filter(item => !isDismissed(item, preferences))
      .filter(item => {
        const type = classifyNotification(item);

        return preferences.types[type] !== false;
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
      return type + ":single:" + getItemId(item || {}) + ":" + index;
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
        return getItemDate(b.items[0]) -
          getItemDate(a.items[0]);
      });
  }

  /* =======================================================
     STYLES
  ======================================================= */

  function ensureStyles() {
    if (document.getElementById("ksk-notifications-v2-style")) {
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

      .ksk-notif-counts {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
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
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 14px;
      }

      .ksk-notif-btn {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 10px;
        padding: 9px 12px;
        background: var(--card-bg, transparent);
        color: inherit;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }

      .ksk-notif-btn.primary {
        background: var(--primary-color, #2563eb);
        color: #fff;
        border-color: transparent;
      }

      .ksk-notif-btn:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .ksk-notif-tabs {
        display: flex;
        gap: 8px;
        margin: 12px 0;
        overflow-x: auto;
      }

      .ksk-notif-tab {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 999px;
        padding: 8px 15px;
        background: transparent;
        color: inherit;
        white-space: nowrap;
        cursor: pointer;
      }

      .ksk-notif-tab.active {
        background: var(--primary-color, #2563eb);
        border-color: var(--primary-color, #2563eb);
        color: #fff;
      }

      .ksk-notif-settings {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        padding: 14px;
        margin: 12px 0 18px;
        background: var(--card-bg, transparent);
      }

      .ksk-notif-settings[hidden] {
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

      .ksk-notif-setting-row select {
        min-width: 0;
        max-width: 155px;
        padding: 8px;
        border-radius: 9px;
        border: 1px solid var(--border-color, #ddd);
        background: var(--card-bg, transparent);
        color: inherit;
        font: inherit;
      }

      .ksk-notif-setting-row select:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .ksk-notif-list {
        display: grid;
        gap: 10px;
      }

      .ksk-notif-card {
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        padding: 13px;
        background: var(--card-bg, transparent);
      }

      .ksk-notif-card.unread {
        border-left: 4px solid var(--primary-color, #2563eb);
        background: var(--secondary-bg, rgba(37,99,235,.06));
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

      .ksk-notif-body p {
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
        border: 1px solid var(--border-color, #ddd);
        border-radius: 14px;
        overflow: hidden;
        background: var(--card-bg, transparent);
      }

      .ksk-notif-group.unread {
        border-left: 4px solid var(--primary-color, #2563eb);
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

      .ksk-notif-group-item p {
        margin: 0;
        line-height: 1.45;
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
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     RENDER HELPERS
  ======================================================= */

  function renderEmpty(message) {
    return `
      <div class="ksk-notif-empty">
        <div class="ksk-notif-empty-icon">🔔</div>
        <strong>${escapeHTML(message)}</strong>
        <p>
          ${escapeHTML(
            t(
              "नयाँ सूचना आएपछि यहाँ देखिनेछन्।",
              "New notifications will appear here."
            )
          )}
        </p>
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
              ${read ? "" : " · " + escapeHTML(t("नयाँ", "New"))}
            </small>
          </div>
        </div>

        <div class="ksk-notif-actions">
          ${
            read
              ? ""
              : `
                <button
                  type="button"
                  class="ksk-notif-small-btn"
                  data-notification-action="read"
                  data-notification-id="${escapeHTML(id)}">
                  ${escapeHTML(t("Read बनाउनुहोस्", "Mark as read"))}
                </button>
              `
          }

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
              : ""
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
              ${isRead(item, preferences) ? "" : " · " + escapeHTML(t("Unread", "Unread"))}
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
              ${unreadCount
                ? " · " + unreadCount + " " + escapeHTML(t("Unread", "Unread"))
                : ""}
            </small>
          </span>

          <span class="ksk-notif-group-count">${count}</span>
          <span aria-hidden="true">${expanded ? "⌃" : "⌄"}</span>
        </button>

        ${
          expanded
            ? `<div class="ksk-notif-group-items">${children}</div>`
            : ""
        }
      </section>
    `;
  }

  /* =======================================================
     SETTINGS RENDER
  ======================================================= */

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

    return `
      <section
        class="ksk-notif-settings"
        id="kskNotificationSettings"
        hidden>

        <h3>
          ${escapeHTML(t("Notification Preferences", "Notification Preferences"))}
        </h3>

        <label class="ksk-notif-setting-row">
          <strong>
            ${escapeHTML(t("सबै Notification", "All notifications"))}
          </strong>

          <input
            type="checkbox"
            data-notification-master
            ${preferences.enabled ? "checked" : ""}>
        </label>

        <h3>
          ${escapeHTML(t("सूचना आवाज", "Notification Sound"))}
        </h3>

        <label class="ksk-notif-setting-row">
          <span>
            🔔 ${escapeHTML(t("सूचना आउँदा आवाज बजाउने", "Play sound for new notifications"))}
          </span>

          <input
            type="checkbox"
            data-notification-sound
            ${preferences.soundEnabled ? "checked" : ""}>
        </label>

        <label class="ksk-notif-setting-row">
          <span>
            ${escapeHTML(t("आफ्नो मनपर्ने धुन", "Choose your tone"))}
          </span>

          <select
            data-notification-tone
            ${preferences.soundEnabled ? "" : "disabled"}
            style="
              max-width: 155px;
              padding: 8px;
              border-radius: 9px;
              border: 1px solid var(--border-color, #ddd);
              background: var(--card-bg, transparent);
              color: inherit;
            ">
            ${Object.keys(SOUND_TONES).map(name => `
              <option
                value="${name}"
                ${(preferences.soundTone || "soft_bell") === name ? "selected" : ""}>
                ${escapeHTML(
                  isEnglish()
                    ? SOUND_TONES[name].en
                    : SOUND_TONES[name].ne
                )}
              </option>
            `).join("")}
          </select>
        </label>

        <div style="padding: 8px 0 14px;">
          <button
            type="button"
            class="ksk-notif-btn"
            data-notification-action="test-sound"
            ${preferences.soundEnabled ? "" : "disabled"}>
            ▶ ${escapeHTML(t("धुन सुनेर जाँच गर्नुहोस्", "Test selected tone"))}
          </button>
        </div>

        <div id="kskNotificationTypeSettings"
          ${preferences.enabled ? "" : "hidden"}>
          ${rows}
        </div>

        <p class="ksk-notif-meta">
          ${escapeHTML(
            t(
              "यी प्राथमिकताले यस डिभाइसमा देखिने सूचना मात्र फिल्टर गर्छन्।",
              "These preferences filter notifications shown on this device only."
            )
          )}
        </p>
      </section>
    `;
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  function render() {
    ensureStyles();

    const preferences = loadPreferences();
    const counts = getCounts();

    const allNotifications = visibleNotifications();
    const groups = buildGroups(allNotifications);

    const renderedGroups = groups.map(group => {
      if (group.items.length > 1) {
        return renderGroup(group, preferences);
      }

      return renderSingle(group.items[0], preferences);
    }).join("");

    let emptyMessage = t(
      "अहिले कुनै सूचना छैन",
      "No notifications yet"
    );

    if (!preferences.enabled) {
      emptyMessage = t(
        "सबै Notification बन्द छन्",
        "Notifications are turned off"
      );
    } else if (preferences.filter === "unread") {
      emptyMessage = t(
        "Unread सूचना छैन",
        "No unread notifications"
      );
    }

    return `
      <section class="ksk-notifications">

        <header class="ksk-notif-heading">
          <h2>${escapeHTML(t("सूचनाहरू", "Notifications"))}</h2>

          <button
            type="button"
            class="ksk-notif-btn"
            data-notification-action="settings">
            ⚙️ ${escapeHTML(t("सेटिङ", "Settings"))}
          </button>
        </header>

        <div class="ksk-notif-counts">
          <div class="ksk-notif-count">
            ${escapeHTML(t("सबै", "All"))}:
            <strong>${counts.all}</strong>
          </div>

          <div class="ksk-notif-count">
            ${escapeHTML(t("Unread", "Unread"))}:
            <strong>${counts.unread}</strong>
          </div>

          <div class="ksk-notif-count">
            ${escapeHTML(t("Read", "Read"))}:
            <strong>${counts.read}</strong>
          </div>
        </div>

        <div class="ksk-notif-toolbar">
          <button
            type="button"
            class="ksk-notif-btn primary"
            data-notification-action="mark-all"
            ${counts.unread ? "" : "disabled"}>
            ✓ ${escapeHTML(t("सबै Read गर्नुहोस्", "Mark all as read"))}
          </button>

          <button
            type="button"
            class="ksk-notif-btn"
            data-notification-action="clear-read"
            ${counts.read ? "" : "disabled"}>
            ${escapeHTML(t("Read सूचना हटाउनुहोस्", "Clear read notifications"))}
          </button>
        </div>

        <nav class="ksk-notif-tabs" aria-label="Notification filters">
          <button
            type="button"
            class="ksk-notif-tab ${preferences.filter === "all" ? "active" : ""}"
            data-notification-filter="all">
            ${escapeHTML(t("सबै", "All"))}
          </button>

          <button
            type="button"
            class="ksk-notif-tab ${preferences.filter === "unread" ? "active" : ""}"
            data-notification-filter="unread">
            ${escapeHTML(t("Unread", "Unread"))}
          </button>
        </nav>

        ${renderSettings(preferences)}

        <div class="ksk-notif-list">
          ${
            renderedGroups ||
            renderEmpty(emptyMessage)
          }
        </div>

      </section>
    `;
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

  function refresh() {
    if (global.KSKApp?.getCurrentPage?.() === "notifications") {
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

    if (typeof api?.markNotificationsRead !== "function") {
      notify(
        t(
          "Read सुविधा उपलब्ध छैन।",
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
          "सूचना Read गर्न सकिएन।",
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
        "सबै सूचना Read भए।",
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
          "Read सूचना यस डिभाइसको सूचीबाट हटाइयो।",
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

    savePreferences(preferences);
    refresh();
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
    const filter = event.target?.closest?.(
      "[data-notification-filter]"
    );

    if (filter) {
      const value = filter.dataset.notificationFilter;

      if (value !== "all" && value !== "unread") return;

      const preferences = loadPreferences();

      preferences.filter = value;

      if (savePreferences(preferences)) refresh();

      return;
    }

    const button = event.target?.closest?.(
      "[data-notification-action]"
    );

    if (!button) return;

    const action = button.dataset.notificationAction;

    switch (action) {
      case "settings":
        toggleSettings();
        break;

      case "test-sound":
        playSelectedNotificationSound();
        break;

      case "mark-all":
        markAllAsRead();
        break;

      case "clear-read":
        clearReadNotifications();
        break;

      case "read":
        markOneAsRead(button.dataset.notificationId);
        break;

      case "hide":
        clearOne(button.dataset.notificationId);
        break;

      case "toggle-group":
        toggleGroup(button.dataset.groupKey || "");
        break;

      default:
        break;
    }
  }

  function handleChange(event) {

    const soundToggle = event.target?.closest?.(
      "[data-notification-sound]"
    );

    if (soundToggle) {
      const preferences = loadPreferences();

      preferences.soundEnabled = Boolean(soundToggle.checked);

      if (preferences.soundEnabled) {
        unlockNotificationAudio();
      }

      savePreferences(preferences);
      refresh();

      return;
    }

    const soundSelector = event.target?.closest?.(
      "[data-notification-tone]"
    );

    if (soundSelector) {
      const tone = soundSelector.value;

      if (!SOUND_TONES[tone]) return;

      const preferences = loadPreferences();

      preferences.soundTone = tone;

      savePreferences(preferences);
      refresh();

      return;
    }

    const master = event.target?.closest?.(
      "[data-notification-master]"
    );

    if (master) {
      const preferences = loadPreferences();

      preferences.enabled = Boolean(master.checked);

      savePreferences(preferences);
      refresh();

      return;
    }

    const typeInput = event.target?.closest?.(
      "[data-notification-type]"
    );

    if (!typeInput) return;

    const type = typeInput.dataset.notificationType;

    if (!TYPES[type]) return;

    const preferences = loadPreferences();

    preferences.types[type] = Boolean(typeInput.checked);

    savePreferences(preferences);
    refresh();
  }

  function handleExternalChange(event) {
    const detail = event?.detail;

    if (
      detail?.collection === "notifications" &&
      detail?.action === "add" &&
      detail?.item
    ) {
      playIncomingNotificationSound(detail.item);
    }

    if (global.KSKApp?.getCurrentPage?.() === "notifications") {
      refresh();
    }
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return true;

    initialized = true;

    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);

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
      event => {
        if (
          event.key === STORAGE_KEY ||
          event.key === "ksk_notifications_v1"
        ) {
          handleExternalChange();
        }
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
