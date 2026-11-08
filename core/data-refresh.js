
"use strict";

/*
 * =========================================================
 * KSK — DATA CHANGE & REFRESH CONTROLLER
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
 * - Home render functions refresh their own media.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKDataRefresh) return;

  let initialized = false;
  let actions = {};

  function getCurrentPage() {
    const state = global.KSKState?.getState?.();

    return String(
      state?.currentPage || "home"
    ).toLowerCase();
  }

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

  function refreshHomeFeed() {
    actions.renderFeed?.();
    return true;
  }

  function refreshHomeStories() {
    actions.renderStories?.();
    return true;
  }

  function refreshOtherPage() {
    actions.refreshCurrentPage?.();
    return true;
  }

  function handleDataChange(event) {
    const collection = event?.detail?.collection || "";
    const name = getCollectionName(collection);

    if (!shouldRefreshForCollection(name)) {
      return false;
    }

    const currentPage = getCurrentPage();

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

    if (isStoriesCollection(name)) {
      if (currentPage === "home") {
        return refreshHomeStories();
      }

      return true;
    }

    if (isFriendsCollection(name)) {
      if (currentPage === "friends") {
        return refreshOtherPage();
      }

      return true;
    }

    if (isMessagesCollection(name)) {
      if (currentPage === "messages") {
        return refreshOtherPage();
      }

      return true;
    }

    if (isProfileCollection(name)) {
      if (currentPage === "profile") {
        return refreshOtherPage();
      }

      return true;
    }

    if (isSavedCollection(name)) {
      if (currentPage === "saved") {
        return refreshOtherPage();
      }

      return true;
    }

    if (isNotificationsCollection(name)) {
      if (currentPage === "notifications") {
        return refreshOtherPage();
      }

      return true;
    }

    return false;
  }

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

  global.KSKDataRefresh = Object.freeze({
    initialize,
    handleDataChange,
    shouldRefreshForCollection
  });

})(window);
