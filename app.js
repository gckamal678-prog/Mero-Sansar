
"use strict";

/*
 * =========================================================
 * KSK — MAIN APPLICATION CONTROLLER
 * Single Data Layer Architecture
 *
 * DATA          : KSKData
 * SETTINGS      : KSKSettings / KSKSettingsPage
 * THEME         : KSKTheme
 * LANGUAGE      : KSKLanguage
 * NAVIGATION    : KSKNavigation
 * HOME          : KSKHomePage
 * MEDIA         : KSKMediaUI
 * PROFILE MEDIA : KSKProfileMediaUI
 * COMMENTS      : KSKComments
 * TOAST         : KSKToast
 *
 * This file integrates the application.
 * Feature modules own their own interfaces.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKApp) return;

  /* =======================================================
     SELECTORS AND SHARED MODULES
  ======================================================= */

  const DATA = () => global.KSKData;
  const SETTINGS = () => global.KSKSettings;
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

  /* =======================================================
     ELEMENT CACHE
  ======================================================= */

  function cacheElements() {
    const ids = [
      "quickPhoto",
      "quickVideo",
      "searchPanel",
      "searchInput",
      "searchToggle",
      "notificationsToggle",
      "settingsModal",
      "closeSettings"
    ];

    ids.forEach(id => {
      els[id] = document.getElementById(id);
    });
  }

  /* =======================================================
     LANGUAGE HELPERS
  ======================================================= */

  function language() {
    return LANG()?.getLanguage?.() || "ne";
  }

  function isEnglish() {
    return language() === "en";
  }

  function translate(key, fallback = "") {
    return LANG()?.translate?.(key) || fallback || key;
  }

  /* =======================================================
     TOAST
  ======================================================= */

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

  /* =======================================================
     PROFILE ACCESS
  ======================================================= */

  function getProfile() {
    return PROFILE_PAGE()?.getProfile?.() || {};
  }

  /* =======================================================
     DATA ACCESS
  ======================================================= */

  function getFriends() {
    return DATA()?.getFriends?.() || [];
  }

  function getChats() {
    return DATA()?.getChats?.() || [];
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function refreshNavigation() {
    return NAV()?.refreshNavigation?.() ?? false;
  }

  function refreshCurrentPage() {
    return NAV()?.refreshCurrentPage?.() ?? false;
  }

  function navigate(page, options = {}) {
    return NAV()?.navigate?.(page, options) ?? false;
  }

  /* =======================================================
     HOME PAGE DELEGATES
  ======================================================= */

  function renderStories() {
    return global.KSKHomePage?.renderStories?.() || false;
  }

  function renderFeed() {
    return global.KSKHomePage?.renderFeed?.() || false;
  }

  /* =======================================================
     POST COMPOSER AND STORY CREATOR
  ======================================================= */

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

  /* =======================================================
     SHARE POST
  ======================================================= */

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

  /* =======================================================
     POST ACTION HANDLERS
  ======================================================= */

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

  /* =======================================================
     FRIENDS
  ======================================================= */

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

  /* =======================================================
     SETTINGS DELEGATES
  ======================================================= */

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

  /* =======================================================
     SEARCH DELEGATE
  ======================================================= */

  function search(value) {
    return SEARCH()?.search?.(value) || false;
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return;

    if (typeof global.KSKAppEvents?.initialize !== "function") {
      console.error(
        "KSKAppEvents is unavailable. Check index.html script order."
      );
      return;
    }

    initialized = true;

    cacheElements();

    SEARCH()?.initialize?.({
      elements: els,
      navigation: NAV(),
      homePage: global.KSKHomePage
    });

    TOAST()?.initialize?.();

    DATA()?.initialize?.();
    SETTINGS()?.initialize?.();
    THEME()?.initializeTheme?.();
    LANG()?.initialize?.();
    SETTINGS_PAGE()?.initialize?.();

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
