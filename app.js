"use strict";

/*
 * =========================================================
 * KSK — MAIN APPLICATION CONTROLLER
 * Single Data Layer Architecture
 *
 * DATA          : KSKData
 * SETTINGS      : KSKSettings / KSKSettingsUI
 * THEME         : KSKTheme
 * LANGUAGE      : KSKLanguage
 * NAVIGATION    : KSKNavigation
 * HOME          : KSKHomePage
 * MEDIA         : KSKMediaUI
 * PROFILE MEDIA : KSKProfileMediaUI
 * COMMENTS      : KSKComments
 * MODAL         : KSKModal
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

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const DATA = () => global.KSKData;
  const SETTINGS = () => global.KSKSettings;
  const SETTINGS_UI = () => global.KSKSettingsUI;
  const THEME = () => global.KSKTheme;
  const LANG = () => global.KSKLanguage;
  const NAV = () => global.KSKNavigation;
  const MODAL = () => global.KSKModal;
  const TOAST = () => global.KSKToast;
  const MEDIA_UI = () => global.KSKMediaUI;
  const PROFILE_MEDIA = () => global.KSKProfileMediaUI;
  const COMMENTS = () => global.KSKComments;
  const KSKPostActions = () => global.KSKPostActions;

  let initialized = false;

  const els = {};

  /* =======================================================
     ELEMENT CACHE
  ======================================================= */

  function cacheElements() {
    const ids = [
      "homePage",
      "otherPage",
      "otherPageTitle",
      "otherPageText",
      "bottomNav",
      "storiesList",
      "feedList",
      "emptyFeed",
      "openComposer",
      "quickText",
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
     COMMON HELPERS
  ======================================================= */

  function escapeHTML(value = "") {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
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

  function confirmAction(message) {
    return global.confirm(message);
  }

  /* =======================================================
     DATE AND PROFILE HELPERS
  ======================================================= */

  function formatDate(value) {
    if (global.KSKUtils?.formatDateTime) {
      return global.KSKUtils.formatDateTime(value);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }

  function formatTime(value) {
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

  function profile() {
    return DATA()?.getProfile?.() || {
      id: "",
      name: "",
      bio: "",
      location: "",
      avatar: "",
      cover: "",
      avatarMediaId: "",
      coverMediaId: ""
    };
  }

  function displayName() {
    return profile().name ||
      (isEnglish() ? "You" : "तपाईं");
  }

  function initial(value) {
    return String(value || "").trim().charAt(0) ||
      (isEnglish() ? "U" : "स");
  }

  function isImageSource(value) {
    if (typeof value !== "string") return false;

    const source = value.trim();

    return (
      /^https?:\/\//i.test(source) ||
      /^data:image\//i.test(source) ||
      /^blob:/i.test(source)
    );
  }

  function avatarHTML(name, avatar = "", size = "") {
    const image = isImageSource(avatar);

    const content = image
      ? `<img src="${escapeHTML(avatar)}" alt="" loading="lazy">`
      : escapeHTML(initial(name));

    return `
      <div class="avatar ${escapeHTML(size)}">
        ${content}
      </div>
    `;
  }

  /* =======================================================
     MODAL
  ======================================================= */

  function openModal(options) {
    if (!MODAL()?.openModal) {
      toast(
        isEnglish()
          ? "This feature is unavailable."
          : "यो सुविधा अहिले उपलब्ध छैन।",
        "error"
      );

      return null;
    }

    return MODAL().openModal(options);
  }

  function closeModal() {
    MODAL()?.closeModal?.();
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
    NAV()?.refreshNavigation?.();
  }

  function refreshCurrentPage() {
    NAV()?.refreshCurrentPage?.();
  }

  /* =======================================================
     HOME PAGE DELEGATES
     Home UI belongs to pages/home.js.
  ======================================================= */

  function renderStories() {
    return global.KSKHomePage?.renderStories?.() || false;
  }

  function renderPost(post) {
    return global.KSKHomePage?.renderPost?.(post) || "";
  }

  function renderFeed() {
    return global.KSKHomePage?.renderFeed?.() || false;
  }

  /* =======================================================
     POST COMPOSER AND STORY CREATOR
     KSKMediaUI owns both creation workflows.
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

  /*
   * Legacy viewer fallback.
   * Normally KSKMediaUI handles Story clicks.
   */

  function viewStory(id) {
    const stories = DATA()?.getStories?.(true) || [];

    const story = stories.find(
      item => String(item.id) === String(id)
    );

    if (!story) return;

    const content = `
      <div class="story-view-content">

        ${avatarHTML(story.author)}

        <h3>
          ${escapeHTML(story.author || "सदस्य")}
        </h3>

        <p class="post-time">
          ${escapeHTML(formatDate(story.createdAt))}
        </p>

        <div class="post-content">
          ${escapeHTML(story.text || "")}
        </div>

      </div>
    `;

    openModal({
      title: "Story",
      content,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${translate("close", "बन्द गर्नुहोस्")}
        </button>
      `
    });
  }

  /* =======================================================
     SHARE POST
     KSKShare owns all sharing functionality.
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
     POST ACTION ROUTER
     Like / Reaction : core/reactions.js
     Save / Unsave   : core/post-actions.js
     Comment         : KSKComments
     Share           : KSKShare
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

  function renderFriends() {
    const friendsPage = global.KSKFriendsPage;

    if (!friendsPage?.render) {
      return `
        <div class="empty-state">
          ${isEnglish()
            ? "Friends page is unavailable. Please reload the app."
            : "साथीहरूको पृष्ठ उपलब्ध छैन। कृपया एप पुनः खोल्नुहोस्।"}
        </div>
      `;
    }

    return friendsPage.render({
      friends: getFriends(),
      isEnglish: isEnglish()
    });
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

  /* =======================================================
     MESSAGES
  ======================================================= */

  function renderMessages() {
    const page = global.KSKMessagesPage;

    if (typeof page?.render === "function") {
      return page.render();
    }

    return `
      <div class="empty-state">
        ${isEnglish()
          ? "Messages are unavailable. Please reload the app."
          : "सन्देश सुविधा उपलब्ध छैन। कृपया एप पुनः खोल्नुहोस्।"}
      </div>
    `;
  }

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  function renderNotifications() {
    const page = global.KSKNotificationsPage;

    if (typeof page?.render === "function") {
      return page.render();
    }

    return `
      <div class="empty-state">
        ${isEnglish()
          ? "Notifications are unavailable. Please reload the app."
          : "सूचना सुविधा अहिले उपलब्ध छैन। कृपया एप पुनः खोल्नुहोस्।"}
      </div>
    `;
  }

  /* =======================================================
     SAVED POSTS
  ======================================================= */

  function renderSaved() {
    const page = global.KSKSavedPage;

    if (typeof page?.render === "function") {
      return page.render({
        isEnglish: isEnglish(),
        renderPost: renderPost
      });
    }

    const ids = DATA()?.getSavedPosts?.() || [];

    const posts = ids
      .map(id => DATA()?.getPost?.(id))
      .filter(Boolean);

    return `
      <section>

        <h3 class="section-title">
          ${isEnglish()
            ? "Saved Posts"
            : "सेभ गरिएका पोस्ट"}
        </h3>

        ${
          posts.length
            ? posts.map(renderPost).join("")
            : `
              <div class="empty-state">

                <div class="empty-state-icon">🔖</div>

                <p>
                  ${isEnglish()
                    ? "No saved posts yet."
                    : "अहिलेसम्म पोस्ट सेभ गरिएको छैन।"}
                </p>

              </div>
            `
        }

      </section>
    `;
  }

  /* =======================================================
     SETTINGS
  ======================================================= */

  function openSettings() {
    const settingsPage = global.KSKSettingsPage;

    if (typeof settingsPage?.open === "function") {
      return settingsPage.open();
    }

    const settingsUI = SETTINGS_UI();

    if (!settingsUI?.open) {
      toast(
        isEnglish()
          ? "Settings are not ready. Please reload the app."
          : "सेटिङ तयार भएको छैन। कृपया एप पुनः खोल्नुहोस्।",
        "error"
      );

      return false;
    }

    return settingsUI.open();
  }

  function closeSettings() {
    if (SETTINGS_UI()?.close) {
      SETTINGS_UI().close();
      return;
    }

    els.settingsModal?.classList.add("hidden");

    els.settingsModal?.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  /* =======================================================
     SEARCH
     Search filtering belongs to KSKHomePage.
  ======================================================= */

  function toggleSearch() {
    if (!els.searchPanel) return;

    els.searchPanel.classList.toggle("hidden");

    if (!els.searchPanel.classList.contains("hidden")) {
      els.searchInput?.focus();
      return;
    }

    global.KSKHomePage?.clearSearch?.();

    if (els.searchInput) {
      els.searchInput.value = "";
    }

    renderFeed();
  }

  function search(value) {
    global.KSKHomePage?.setSearchQuery?.(value);

    if (NAV()?.getCurrentPage?.() !== "home") {
      NAV()?.navigate?.("home");
    }

    renderFeed();
  }

  /* =======================================================
     GLOBAL CLICK EVENTS
  ======================================================= */

  function bindGlobalClickEvents() {
    document.addEventListener("click", event => {
      const target = event.target;

      if (!target?.closest) return;

      /*
       * Media UI and Profile Media UI use capture phase.
       * Their controls are intercepted before this handler.
       */

      const viewStoryButton = target.closest(
        "[data-story-view]"
      );

      if (viewStoryButton) {
        viewStory(viewStoryButton.dataset.storyView);
        return;
      }

      const postAction = target.closest(
        "[data-post-action]"
      );

      if (postAction) {
        const action = postAction.dataset.postAction;

        /*
         * Like / Reaction is intercepted in capture phase
         * by core/reactions.js.
         *
         * Save / Unsave is intercepted in capture phase
         * by core/post-actions.js.
         *
         * The app controller handles only Comment and Share.
         */
        if (action === "comment" || action === "share") {
          handlePostAction(
            action,
            postAction.dataset.postId
          );
        }

        return;
      }

      if (global.KSKPostActions?.handleClick(target)) {
        return;
      }

      if (target.closest("[data-add-friend-open]")) {
        openAddFriend();
        return;
      }

      if (target.closest("[data-edit-profile]")) {
        PROFILE_MEDIA()?.openEditor?.();
        return;
      }

      if (target.closest("[data-open-settings]")) {
        openSettings();
      }
    });
  }

  /* =======================================================
     DATA CHANGE HANDLING
  ======================================================= */

  function shouldRefreshForCollection(collection) {
    const name = String(collection || "").toLowerCase();

    return [
      "posts",
      "stories",
      "friends",
      "messages",
      "chats",
      "profile",
      "saved",
      "notifications"
    ].some(part => name.includes(part));
  }

  function handleDataChange(event) {
    const collection = event.detail?.collection || "";

    if (!shouldRefreshForCollection(collection)) {
      return;
    }

    refreshCurrentPage();

    const changed = String(collection).toLowerCase();

    if (changed.includes("posts")) {
      renderFeed();
    }

    if (changed.includes("stories")) {
      renderStories();
    }

    MEDIA_UI()?.refresh?.();
    PROFILE_MEDIA()?.refresh?.();
  }

  /* =======================================================
     EVENT BINDING
  ======================================================= */

  function bindEvents() {
    NAV()?.initializeNavigation?.(document);

    global.addEventListener(
      "ksk:open-composer",
      openPostComposer
    );

    global.addEventListener(
      "ksk:language-change",
      () => {
        refreshCurrentPage();
        renderStories();
        renderFeed();
      }
    );

    global.addEventListener(
      "ksk:settings-change",
      event => {
        const changedSettings = event.detail?.settings;

        document.body.classList.toggle(
          "ksk-compact-mode",
          Boolean(changedSettings?.compactMode)
        );
      }
    );

    global.addEventListener(
      "ksk:data-change",
      handleDataChange
    );

    /*
     * KSKMediaUI captures #openComposer and #quickText
     * in the document capture phase.
     * Keep the optional legacy quick-photo delegate.
     */

    els.quickPhoto?.addEventListener(
      "click",
      event => {
        event.preventDefault();
        openPostComposer();
      }
    );

    els.quickVideo?.addEventListener(
      "click",
      () => {
        toast(
          isEnglish()
            ? "Video sharing is not available yet."
            : "भिडियो सुविधा अहिले उपलब्ध छैन।",
          "info"
        );
      }
    );

    els.searchToggle?.addEventListener(
      "click",
      toggleSearch
    );

    els.searchInput?.addEventListener(
      "input",
      event => {
        search(event.target.value);
      }
    );

    els.notificationsToggle?.addEventListener(
      "click",
      () => {
        NAV()?.navigate?.("notifications");
      }
    );

    els.closeSettings?.addEventListener(
      "click",
      closeSettings
    );

    els.settingsModal?.addEventListener(
      "click",
      event => {
        if (event.target === els.settingsModal) {
          closeSettings();
        }
      }
    );

    bindGlobalClickEvents();
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return;

    initialized = true;

    cacheElements();

    TOAST()?.initialize?.();

    DATA()?.initialize?.();
    SETTINGS()?.initialize?.();
    THEME()?.initializeTheme?.();
    LANG()?.initialize?.();
    SETTINGS_UI()?.initialize?.();

    KSKPostActions()?.initialize?.({
      isEnglish,
      translate,
      toast,
      refreshCurrentPage
    });

    bindEvents();

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

    getProfile: profile,

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
