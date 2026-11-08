"use strict";

/*
 * =========================================================
 * KSK — DATA CHANGE & REFRESH CONTROLLER
 *
 * RESPONSIBILITY:
 * - Listen to data-change notifications through KSKApp.
 * - Determine which page needs refreshing.
 * - Avoid unnecessary page and media re-rendering.
 *
 * DATA STORAGE:
 * - Owned by core/data.js
 *
 * PAGE RENDERING:
 * - Owned by core/navigation.js and pages/*.js
 *
 * FEED / STORIES:
 * - Owned by pages/home.js
 *
 * MEDIA:
 * - Owned by core/media-ui.js and core/profile-media.js
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKDataRefresh) return;

  let initialized = false;
  let actions = {};

  /* =======================================================
     CURRENT PAGE
  ======================================================= */

  function getCurrentPage() {
    const state = global.KSKState?.getState?.();

    return String(
      state?.currentPage || "home"
    ).toLowerCase();
  }

  /* =======================================================
     COLLECTION CHECKS
  ======================================================= */

  function getCollectionName(collection) {
    return String(collection || "").toLowerCase();
  }

  function isPostsCollection(name) {
    return name.includes("posts");
  }

  function isStoriesCollection(name) {
    return name.includes("stories");
  }

  function isFriendsCollection(name) {
    return name.includes("friends");
  }

  function isMessagesCollection(name) {
    return (
      name.includes("messages") ||
      name.includes("chats")
    );
  }

  function isProfileCollection(name) {
    return name.includes("profile");
  }

  function isSavedCollection(name) {
    return name.includes("saved");
  }

  function isNotificationsCollection(name) {
    return name.includes("notifications");
  }

  function shouldRefreshForCollection(collection) {
    const name = getCollectionName(collection);

    return (
      isPostsCollection(name) ||
      isStoriesCollection(name) ||
      isFriendsCollection(name) ||
      isMessagesCollection(name) ||
      isProfileCollection(name) ||
      isSavedCollection(name) ||
      isNotificationsCollection(name)
    );
  }

  /* =======================================================
     REFRESH HELPERS
  ======================================================= */

  function refreshHomeFeed() {
    actions.renderFeed?.();

    /*
     * Home page is not rendered through
     * navigation.refreshCurrentPage().
     *
     * Therefore media refresh is handled here.
     */

    actions.refreshMedia?.();

    return true;
  }

  function refreshHomeStories() {
    actions.renderStories?.();

    actions.refreshMedia?.();

    return true;
  }

  function refreshOtherPage() {
    actions.refreshCurrentPage?.();

    /*
     * Navigation already refreshes:
     * - KSKMediaUI
     * - KSKProfileMediaUI
     *
     * Do not refresh them again here.
     */

    return true;
  }

  /* =======================================================
     DATA CHANGE HANDLER
  ======================================================= */

  function handleDataChange(event) {
    const collection = event?.detail?.collection || "";
    const name = getCollectionName(collection);

    if (!shouldRefreshForCollection(name)) {
      return false;
    }

    const currentPage = getCurrentPage();

    /* POSTS */

    if (isPostsCollection(name)) {
      if (currentPage === "home") {
        return refreshHomeFeed();
      }

      if (
        currentPage === "profile" ||
        currentPage === "saved"
      ) {
        return refreshOtherPage();
      }

      return true;
    }

    /* STORIES */

    if (isStoriesCollection(name)) {
      if (currentPage === "home") {
        return refreshHomeStories();
      }

      return true;
    }

    /* FRIENDS */

    if (isFriendsCollection(name)) {
      if (currentPage === "friends") {
        return refreshOtherPage();
      }

      return true;
    }

    /* MESSAGES AND CHATS */

    if (isMessagesCollection(name)) {
      if (currentPage === "messages") {
        return refreshOtherPage();
      }

      return true;
    }

    /* PROFILE */

    if (isProfileCollection(name)) {
      if (currentPage === "profile") {
        return refreshOtherPage();
      }

      return true;
    }

    /* SAVED POSTS */

    if (isSavedCollection(name)) {
      if (currentPage === "saved") {
        return refreshOtherPage();
      }

      return true;
    }

    /* NOTIFICATIONS */

    if (isNotificationsCollection(name)) {
      if (currentPage === "notifications") {
        return refreshOtherPage();
      }

      return true;
    }

    return false;
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize(options = {}) {
    if (initialized) return true;

    if (!options || typeof options !== "object") {
      return false;
    }

    actions = {
      refreshCurrentPage:
        options.refreshCurrentPage,

      renderFeed:
        options.renderFeed,

      renderStories:
        options.renderStories,

      refreshMedia:
        options.refreshMedia
    };

    initialized = true;

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKDataRefresh = Object.freeze({
    initialize,
    handleDataChange,
    shouldRefreshForCollection
  });

})(window);
