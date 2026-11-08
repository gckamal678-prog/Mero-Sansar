"use strict";

/*
 * =========================================================
 * KSK — DATA CHANGE & REFRESH CONTROLLER
 *
 * Owns the decision of which application views should
 * refresh after KSKData emits a data-change event.
 *
 * DATA STORAGE remains inside core/data.js.
 * DOM events remain routed by core/app-events.js.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKDataRefresh) return;

  let initialized = false;
  let actions = {};

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
    const collection = event?.detail?.collection || "";

    if (!shouldRefreshForCollection(collection)) {
      return false;
    }

    actions.refreshCurrentPage?.();

    const changed = String(collection).toLowerCase();

    if (changed.includes("posts")) {
      actions.renderFeed?.();
    }

    if (changed.includes("stories")) {
      actions.renderStories?.();
    }

    actions.refreshMedia?.();
    actions.refreshProfileMedia?.();

    return true;
  }

  function initialize(options = {}) {
    if (initialized) return true;

    actions = {
      refreshCurrentPage: options.refreshCurrentPage,
      renderFeed: options.renderFeed,
      renderStories: options.renderStories,
      refreshMedia: options.refreshMedia,
      refreshProfileMedia: options.refreshProfileMedia
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
