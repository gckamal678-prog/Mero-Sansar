
"use strict";

/*
 * =========================================================
 * KSK — DATA CHANGE & REFRESH CONTROLLER
 * Mero-Sansar
 *
 * RESPONSIBILITY:
 * - Refresh only the page affected by data changes.
 *
 * DATA STORAGE:
 * - Owned by core/data.js
 *
 * PAGE RENDERING:
 * - Owned by core/navigation.js and pages/*.js
 *
 * HOME FEED / STORIES:
 * - Owned by pages/home.js
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
     COLLECTION HELPERS
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
     REFRESH ACTIONS
  ======================================================= */

  function refreshHomeFeed() {
    if (typeof actions.renderFeed !== "function") {
      return false;
    }

    return actions.renderFeed() !== false;
  }

  function refreshHomeStories() {
    if (typeof actions.renderStories !== "function") {
      return false;
    }

    return actions.renderStories() !== false;
  }

  function refreshOtherPage() {
    if (
      typeof actions.refreshCurrentPage !== "function"
    ) {
      return false;
    }

    return actions.refreshCurrentPage() !== false;
  }

  /* =======================================================
     DATA CHANGE HANDLER
  ======================================================= */

  function handleDataChange(event) {
    const collection =
      event?.detail?.collection || "";

    const name = getCollectionName(collection);

    if (!shouldRefreshForCollection(name)) {
      return false;
    }

    const currentPage = getCurrentPage();

    /* ---------------------------------------------------
       POSTS
       Home     : Feed only
       Profile  : Current page
       Saved    : Current page
    --------------------------------------------------- */

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

    /* ---------------------------------------------------
       STORIES
       Home only : Stories only
    --------------------------------------------------- */

    if (isStoriesCollection(name)) {
      if (currentPage === "home") {
        return refreshHomeStories();
      }

      return true;
    }

    /* ---------------------------------------------------
       FRIENDS
    --------------------------------------------------- */

    if (isFriendsCollection(name)) {
      if (currentPage === "friends") {
        return refreshOtherPage();
      }

      return true;
    }

    /* ---------------------------------------------------
       MESSAGES / CHATS
    --------------------------------------------------- */

    if (isMessagesCollection(name)) {
      if (currentPage === "messages") {
        return refreshOtherPage();
      }

      return true;
    }

    /* ---------------------------------------------------
       PROFILE
    --------------------------------------------------- */

    if (isProfileCollection(name)) {
      if (currentPage === "profile") {
        return refreshOtherPage();
      }

      return true;
    }

    /* ---------------------------------------------------
       SAVED POSTS
       Home     : Feed refresh updates Save button
       Profile  : Profile refresh updates Save button
       Saved    : Saved list refreshes
    --------------------------------------------------- */

    if (isSavedCollection(name)) {
      if (
        currentPage === "home" ||
        currentPage === "profile"
      ) {
        return refreshHomeFeedOrCurrentPage(
          currentPage
        );
      }

      if (currentPage === "saved") {
        return refreshOtherPage();
      }

      return true;
    }

    /* ---------------------------------------------------
       NOTIFICATIONS
    --------------------------------------------------- */

    if (isNotificationsCollection(name)) {
      if (currentPage === "notifications") {
        return refreshOtherPage();
      }

      return true;
    }

    return false;
  }

  /* =======================================================
     SAVED POST REFRESH
  ======================================================= */

  function refreshHomeFeedOrCurrentPage(page) {
    if (page === "home") {
      return refreshHomeFeed();
    }

    if (page === "profile") {
      return refreshOtherPage();
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
        options.renderStories
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
