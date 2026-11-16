
"use strict";

/*
 * =========================================================
 * KSK — MAIN APPLICATION CONTROLLER
 * Single Data Layer Architecture
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKApp) return;

  const DATA = () => global.KSKData;
  const SETTINGS_PAGE = () => global.KSKSettingsPage;
  const PROFILE_PAGE = () => global.KSKProfilePage;
  const THEME = () => global.KSKTheme;
  const LANG = () => global.KSKLanguage;
  const NAV = () => global.KSKNavigation;
  const TOAST = () => global.KSKToast;
  const MEDIA_UI = () => global.KSKMediaUI;
  const PROFILE_MEDIA = () => global.KSKProfileMediaUI;
  const COMMENTS = () => global.KSKComments;
  const KSKPostActions = () => global.KSKPostActions;
  const DATA_REFRESH = () => global.KSKDataRefresh;
  const SEARCH = () => global.KSKSearch;
  const UI_ACTIONS = () => global.KSKUIActions;

  let initialized = false;
  const els = {};

  function cacheElements() {
    const ids = [
      "quickPhoto",
      "quickVideo",
      "searchPanel",
      "searchInput",
      "searchToggle",
      "searchResults",
      "notificationsToggle",
      "settingsModal",
      "closeSettings"
    ];

    ids.forEach(id => {
      els[id] = document.getElementById(id);
    });
  }

  function language() {
    return LANG()?.getLanguage?.() || "ne";
  }

  function isEnglish() {
    return language() === "en";
  }

  function translate(key, fallback = "") {
    return LANG()?.translate?.(key) || fallback || key;
  }

  function toast(message, type = "info", duration) {
    const api = TOAST();

    if (typeof api?.show !== "function") {
      console.error(
        "KSKToast is unavailable. Check index.html script order."
      );
      return null;
    }

    return api.show(message, type, duration);
  }

  function getProfile() {
    return PROFILE_PAGE()?.getProfile?.() || {};
  }

  function getFriends() {
    return DATA()?.getFriends?.() || [];
  }

  function getChats() {
    return DATA()?.getChats?.() || [];
  }

  function refreshNavigation() {
    return NAV()?.refreshNavigation?.() ?? false;
  }

  function refreshCurrentPage() {
    return NAV()?.refreshCurrentPage?.() ?? false;
  }

  function navigate(page, options = {}) {
    return NAV()?.navigate?.(page, options) ?? false;
  }

  function renderStories() {
    return global.KSKHomePage?.renderStories?.() || false;
  }

  function renderFeed() {
    return global.KSKHomePage?.renderFeed?.() || false;
  }

  function openPostComposer() {
    const mediaUI = MEDIA_UI();

    if (typeof mediaUI?.openPostComposer === "function") {
      mediaUI.openPostComposer();
      return true;
    }

    toast(
      isEnglish()
        ? "Post creation is temporarily unavailable."
        : "पोस्ट बनाउने सुविधा अहिले उपलब्ध छैन।",
      "warning"
    );

    return false;
  }

  function openStoryCreator() {
    const mediaUI = MEDIA_UI();

    if (typeof mediaUI?.openStoryCreator === "function") {
      mediaUI.openStoryCreator();
      return true;
    }

    toast(
      isEnglish()
        ? "Story creation is temporarily unavailable."
        : "Story बनाउने सुविधा अहिले उपलब्ध छैन।",
      "warning"
    );

    return false;
  }

  function sharePost(id) {
    const share = global.KSKShare;

    if (share?.sharePost) {
      share.sharePost(id);
      return;
    }

    toast(
      isEnglish()
        ? "Sharing is temporarily unavailable."
        : "Share सुविधा अहिले उपलब्ध छैन।",
      "warning"
    );
  }

  function handlePostAction(action, id) {
    if (action === "share") {
      sharePost(id);
      return;
    }

    if (action === "comment") {
      if (COMMENTS()?.open) {
        COMMENTS().open(id);
      } else {
        toast(
          isEnglish()
            ? "Comments are unavailable."
            : "टिप्पणी सुविधा उपलब्ध छैन।",
          "warning"
        );
      }
    }
  }

  function openAddFriend() {
    const page = global.KSKFriendsPage;

    if (typeof page?.openAddFriend === "function") {
      return page.openAddFriend();
    }

    toast(
      isEnglish()
        ? "Friends feature is unavailable. Please reload the app."
        : "साथी सुविधा उपलब्ध छैन। कृपया एप पुनः खोल्नुहोस्।",
      "error"
    );

    return false;
  }

  function openSettings() {
    const settingsPage = SETTINGS_PAGE();

    if (typeof settingsPage?.open === "function") {
      return settingsPage.open();
    }

    toast(
      isEnglish()
        ? "Settings are not ready. Please reload the app."
        : "सेटिङ तयार भएको छैन। कृपया एप पुनः खोल्नुहोस्।",
      "error"
    );

    return false;
  }

  function closeSettings() {
    const settingsPage = SETTINGS_PAGE();

    if (typeof settingsPage?.close === "function") {
      return settingsPage.close();
    }

    console.error("KSKSettingsPage is unavailable. Check script order.");
    return false;
  }

  function search(value) {
    return SEARCH()?.search?.(value) || false;
  }

  /* =======================================================
     GLOBAL MESSENGER NOTIFICATIONS
  ======================================================= */

  const MESSAGE_NOTIFICATION_SETTINGS = "ksk_notifications_ui_v1";
  const recentIncomingMessageIds = new Set();

  let incomingMessagePopup = null;
  let incomingMessagePopupTimer = null;
  let messageRealtimeListenersAttached = false;

  function startMessageRealtime() {
    const auth = global.KSKSupabaseAuth;
    const messages = global.KSKSupabaseMessages;

    if (!auth || !messages?.startRealtime) return false;

    Promise.resolve(auth.initialize?.())
      .then(ready => {
        if (ready === false || !auth.isAuthenticated?.()) return false;
        return messages.startRealtime();
      })
      .catch(error => {
        console.warn(
          "Messenger background realtime could not start:",
          error
        );
      });

    return true;
  }

  function attachMessageNotificationListeners() {
    if (messageRealtimeListenersAttached) return;

    messageRealtimeListenersAttached = true;

    global.addEventListener("ksk:messages-cloud-change", event => {
      const detail = event.detail || {};

      if (detail.action !== "realtime-message") return;

      const message = detail.message || {};

      if (String(detail.eventType || "").toUpperCase() !== "INSERT") {
        return;
      }

      if (!message.id || !message.conversation_id) return;

      const senderId = String(message.sender_id || "");

      const currentUserId = String(
        global.KSKSupabaseAuth?.getUser?.()?.id || ""
      );

      if (!currentUserId || !senderId || senderId === currentUserId) {
        return;
      }

      if (document.visibilityState !== "visible") return;

      const messageId = String(message.id);

      if (recentIncomingMessageIds.has(messageId)) return;

      recentIncomingMessageIds.add(messageId);

      if (recentIncomingMessageIds.size > 300) {
        recentIncomingMessageIds.delete(
          recentIncomingMessageIds.values().next().value
        );
      }

      const conversationId = String(message.conversation_id);

      if (
        NAV()?.getCurrentPage?.() === "messages" &&
        String(
          global.KSKMessagesPage?.getActiveChatId?.() || ""
        ) === conversationId
      ) {
        return;
      }

      showIncomingMessagePopup(message, conversationId);
      playIncomingMessageSound();
    });

    global.addEventListener("ksk:auth-ready", event => {
      if (event.detail?.user) startMessageRealtime();
    });

    global.addEventListener("ksk:auth-change", event => {
      if (event.detail?.user) startMessageRealtime();
    });

    startMessageRealtime();
  }

  function getIncomingMessagePreview(message = {}) {
    const content = String(
      message.content || message.text || ""
    ).trim();

    if (content) {
      return content.length > 96
        ? content.slice(0, 93) + "…"
        : content;
    }

    const type = String(
      message.message_type ||
      message.media_type ||
      message.type ||
      ""
    ).toLowerCase();

    if (type.includes("image") || type.includes("photo")) {
      return "📷 फोटो";
    }

    if (type.includes("video")) {
      return "🎬 भिडियो";
    }

    if (type.includes("file") || type.includes("document")) {
      return "📎 फाइल";
    }

    return "तपाईंलाई नयाँ सन्देश आएको छ।";
  }

  function playIncomingMessageSound() {
    if (document.visibilityState !== "visible") return false;

    let preferences;

    try {
      preferences = JSON.parse(
        global.localStorage.getItem(
          MESSAGE_NOTIFICATION_SETTINGS
        ) || "null"
      );
    } catch (_) {
      return false;
    }

    if (
      !preferences ||
      preferences.enabled === false ||
      preferences.soundEnabled !== true ||
      preferences.types?.message === false ||
      !preferences.soundTone
    ) {
      return false;
    }

    try {
      return global.KSKTone?.play?.(
        preferences.soundTone
      ) ?? false;
    } catch (error) {
      console.warn(
        "Incoming message tone could not play:",
        error
      );

      return false;
    }
  }

  function ensureIncomingMessagePopupStyles() {
    if (
      document.getElementById(
        "ksk-incoming-message-style"
      )
    ) {
      return;
    }

    const style = document.createElement("style");
    style.id = "ksk-incoming-message-style";

    style.textContent = `
      .ksk-incoming-message-popup {
        position:fixed;
        z-index:99999;
        top:calc(env(safe-area-inset-top, 0px) + 14px);
        right:14px;
        width:min(370px, calc(100vw - 28px));
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:12px;
        padding:14px;
        border:1px solid var(--color-border, #dbe3ee);
        border-radius:16px;
        background:var(--color-surface, #fff);
        color:var(--color-text, #172033);
        box-shadow:0 12px 36px rgba(15,23,42,.2);
        font:inherit;
        animation:ksk-message-popup-in .18s ease-out;
      }

      .ksk-incoming-message-popup-main {
        min-width:0;
        padding:0;
        border:0;
        background:transparent;
        color:inherit;
        text-align:left;
        font:inherit;
        cursor:pointer;
      }

      .ksk-incoming-message-popup-name {
        display:block;
        margin-bottom:4px;
        font-weight:700;
        overflow-wrap:anywhere;
      }

      .ksk-incoming-message-popup-preview {
        display:block;
        color:var(--color-text-secondary, #64748b);
        font-size:13px;
        line-height:1.4;
        overflow-wrap:anywhere;
      }

      .ksk-incoming-message-popup-close {
        align-self:start;
        width:30px;
        height:30px;
        border:0;
        border-radius:9px;
        background:var(--color-surface-secondary, #f1f5f9);
        color:inherit;
        font-size:19px;
        cursor:pointer;
      }

      @keyframes ksk-message-popup-in {
        from {
          opacity:0;
          transform:translateY(-8px);
        }
        to {
          opacity:1;
          transform:translateY(0);
        }
      }

      @media (max-width:520px) {
        .ksk-incoming-message-popup {
          top:calc(env(safe-area-inset-top, 0px) + 8px);
          right:8px;
          width:calc(100vw - 16px);
        }
      }

      @media (prefers-reduced-motion:reduce) {
        .ksk-incoming-message-popup {
          animation:none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function dismissIncomingMessagePopup() {
    if (incomingMessagePopupTimer) {
      global.clearTimeout(incomingMessagePopupTimer);
      incomingMessagePopupTimer = null;
    }

    incomingMessagePopup?.remove();
    incomingMessagePopup = null;
  }

  async function showIncomingMessagePopup(
    message,
    conversationId
  ) {
    ensureIncomingMessagePopupStyles();
    dismissIncomingMessagePopup();

    let conversations =
      global.KSKMessagesPage?.getConversations?.() || [];

    if (!conversations.length) {
      try {
        const result =
          await global.KSKSupabaseMessages?.getConversations?.();

        if (result?.ok && Array.isArray(result.data)) {
          conversations = result.data;
        }
      } catch (error) {
        console.warn(
          "Could not resolve incoming conversation title:",
          error
        );
      }
    }

    const conversation = conversations.find(
      item => String(item.id) === String(conversationId)
    );

    const name = String(
      conversation?.name ||
      conversation?.title ||
      "नयाँ सन्देश"
    );

    const popup = document.createElement("div");
    popup.className = "ksk-incoming-message-popup";
    popup.setAttribute("role", "status");
    popup.setAttribute("aria-live", "polite");

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className =
      "ksk-incoming-message-popup-main";

    const nameElement = document.createElement("span");
    nameElement.className =
      "ksk-incoming-message-popup-name";
    nameElement.textContent = name;

    const previewElement = document.createElement("span");
    previewElement.className =
      "ksk-incoming-message-popup-preview";
    previewElement.textContent =
      getIncomingMessagePreview(message);

    openButton.append(nameElement, previewElement);

    openButton.addEventListener("click", async () => {
      dismissIncomingMessagePopup();

      if (!navigate("messages")) {
        toast("Messenger खोल्न सकिएन।", "warning");
        return;
      }

      try {
        const page = global.KSKMessagesPage;

        await page?.initialize?.();
        await page?.refresh?.();

        const opened = await page?.openChat?.(
          conversationId
        );

        if (!opened) {
          toast("यो कुराकानी खोल्न सकिएन।", "warning");
        }
      } catch (error) {
        console.error(
          "Incoming conversation could not open:",
          error
        );

        toast("कुराकानी खोल्न सकिएन।", "warning");
      }
    });

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className =
      "ksk-incoming-message-popup-close";
    closeButton.setAttribute(
      "aria-label",
      "बन्द गर्नुहोस्"
    );
    closeButton.textContent = "×";
    closeButton.addEventListener(
      "click",
      dismissIncomingMessagePopup
    );

    popup.append(openButton, closeButton);
    document.body.appendChild(popup);

    incomingMessagePopup = popup;

    incomingMessagePopupTimer = global.setTimeout(
      dismissIncomingMessagePopup,
      9000
    );
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return;

    if (
      typeof global.KSKAppEvents?.initialize !== "function"
    ) {
      console.error(
        "KSKAppEvents is unavailable. Check index.html script order."
      );
      return;
    }

    initialized = true;

    attachMessageNotificationListeners();

    cacheElements();

    SEARCH()?.initialize?.({
      elements: els,
      navigation: NAV(),
      homePage: global.KSKHomePage
    });

    TOAST()?.initialize?.();

    THEME()?.initializeTheme?.();

    KSKPostActions()?.initialize?.({
      isEnglish,
      translate,
      toast,
      refreshCurrentPage
    });

    DATA_REFRESH()?.initialize?.({
      refreshCurrentPage,
      renderFeed,
      renderStories,
      refreshMedia: () => MEDIA_UI()?.refresh?.(),
      refreshProfileMedia: () => PROFILE_MEDIA()?.refresh?.()
    });

    global.KSKAppEvents.initialize({
      navigation: NAV(),
      elements: els,

      onOpenComposer: openPostComposer,

      onLanguageChange: () => {
        refreshCurrentPage();
        renderStories();
        renderFeed();
      },

      onSettingsChange: event => {
        const changedSettings = event.detail?.settings;

        document.body.classList.toggle(
          "ksk-compact-mode",
          Boolean(changedSettings?.compactMode)
        );
      },

      onDataChange: event =>
        DATA_REFRESH()?.handleDataChange?.(event),

      onQuickPhoto: event => {
        event.preventDefault();
        openPostComposer();
      },

      onQuickVideo: () => {
        toast(
          isEnglish()
            ? "Video sharing is not available yet."
            : "भिडियो सुविधा अहिले उपलब्ध छैन।",
          "info"
        );
      },

      onNotifications: () => {
        navigate("notifications");
      },

      onCloseSettings: closeSettings
    });

    UI_ACTIONS()?.initialize?.({
      onPostAction: handlePostAction,

      onPostActionsClick: target =>
        global.KSKPostActions?.handleClick(target),

      onAddFriend: openAddFriend
    });

    renderStories();
    renderFeed();

    refreshNavigation();
    refreshCurrentPage();

    MEDIA_UI()?.initialize?.();
    PROFILE_MEDIA()?.initialize?.();

    console.info(
      "KSK application initialized successfully."
    );
  }

  /* =======================================================
     PUBLIC APPLICATION API
  ======================================================= */

  global.KSKApp = Object.freeze({

    initialize,

    refreshCurrentPage,

    openPostComposer,

    openStoryCreator,

    openSettings,

    closeSettings,

    renderFeed,

    renderStories,

    getCurrentPage() {
      return NAV()?.getCurrentPage?.() || "home";
    },

    getPosts() {
      return global.KSKHomePage?.getPosts?.() || [];
    },

    getStories() {
      return global.KSKHomePage?.getStories?.() || [];
    },

    getFriends,

    getChats,

    getProfile,

    navigate,

    search,

    refresh() {
      renderStories();
      refreshCurrentPage();

      MEDIA_UI()?.refresh?.();
      PROFILE_MEDIA()?.refresh?.();
    }

  });

  /* =======================================================
     START APPLICATION
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
