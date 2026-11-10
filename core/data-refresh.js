
"use strict";

/*
 * =========================================================
 * KSK — DATA CHANGE & REFRESH CONTROLLER
 * Mero-Sansar
 *
 * RESPONSIBILITY:
 * - Refresh only the affected page or component.
 * - Avoid unnecessary Home Feed rendering.
 * - Update only the affected post comment count.
 * - Refresh comment and reply avatars after rendering.
 *
 * DEPENDENCIES:
 * - KSKState
 * - KSKData
 * - KSKAvatarUI
 *
 * PAGE RENDERING:
 * - Owned by app.js and pages/*.js
 *
 * DATA STORAGE:
 * - Owned by core/data.js
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
     AVATAR REFRESH

     Comment modal renders synchronously after data change.
     requestAnimationFrame ensures that the new comment DOM
     exists before KSKAvatarUI tries to resolve its avatar.
  ======================================================= */

  function refreshAvatarUI() {
    try {
      if (
        typeof global.KSKAvatarUI?.refresh === "function"
      ) {
        global.KSKAvatarUI.refresh();
        return true;
      }
    } catch (error) {
      console.warn(
        "KSKDataRefresh: Avatar refresh failed.",
        error
      );
    }

    return false;
  }

  function queueAvatarRefresh() {
    const run = () => {
      refreshAvatarUI();
    };

    if (
      typeof global.requestAnimationFrame === "function"
    ) {
      global.requestAnimationFrame(run);
    } else {
      Promise.resolve().then(run);
    }
  }

  /* =======================================================
     COMMENT COUNT UPDATE

     Update only the affected post card.
     Do not render the complete Home Feed.
  ======================================================= */

  function refreshPostCommentCount(postId) {
    const id = String(postId || "");

    if (!id) return false;

    const document = global.document;

    if (!document) return false;

    const cards = document.querySelectorAll(
      ".post-card[data-post-id]"
    );

    let card = null;

    for (const item of cards) {
      if (
        String(item.getAttribute("data-post-id")) === id
      ) {
        card = item;
        break;
      }
    }

    if (!card) return false;

    const button = card.querySelector(
      '[data-post-action="comment"]'
    );

    if (!button) return false;

    const post = global.KSKData?.getPost?.(id);

    if (!post) return false;

    const count = Array.isArray(post.comments)
      ? post.comments.length
      : 0;

    /*
     * Keep the original icon and language label.
     * Replace only the trailing count.
     */

    const currentText = button.textContent || "";

    const label = currentText
      .replace(/\s*\(\d+\)\s*$/, "")
      .trim();

    button.textContent = count
      ? `${label} (${count})`
      : label;

    return true;
  }

  /* =======================================================
     FIND POST ID FROM COMMENT DOM

     The current delete event contains:
       item.id
       item.deletedIds

     It does not contain postId.

     The comment DOM still exists when the data-change
     event fires. Each rendered comment has a reaction
     button containing data-post-id.

     Use that information before the modal is re-rendered.
  ======================================================= */

  function findPostIdFromCommentDOM(item = {}) {
    const document = global.document;

    if (!document) return "";

    /*
     * Future-compatible direct postId support.
     */

    if (item.postId) {
      return String(item.postId);
    }

    const ids = new Set();

    if (item.id) {
      ids.add(String(item.id));
    }

    if (Array.isArray(item.deletedIds)) {
      item.deletedIds.forEach(id => {
        if (id !== null && id !== undefined) {
          ids.add(String(id));
        }
      });
    }

    if (!ids.size) return "";

    const comments = document.querySelectorAll(
      ".ksk-comment[data-comment-id]"
    );

    for (const comment of comments) {
      const commentId = String(
        comment.dataset.commentId || ""
      );

      if (!ids.has(commentId)) continue;

      /*
       * Each comment has a reaction button carrying
       * the post ID.
       */

      const postElement = comment.querySelector(
        "[data-post-id]"
      );

      if (postElement?.dataset?.postId) {
        return String(postElement.dataset.postId);
      }

      /*
       * Fallback: look inside the comments panel.
       */

      const panel = comment.closest(
        ".ksk-comments-panel"
      );

      const panelPost = panel?.querySelector(
        "[data-post-id]"
      );

      if (panelPost?.dataset?.postId) {
        return String(panelPost.dataset.postId);
      }
    }

    return "";
  }

  /* =======================================================
     UPDATE VISIBLE COMMENT COUNTS

     Last-resort fallback when a deleted comment's
     post ID cannot be identified.

     This updates existing cards only.
     It does not re-render the feed.
  ======================================================= */

  function refreshVisiblePostCommentCounts() {
    const document = global.document;

    if (!document) return false;

    const cards = document.querySelectorAll(
      ".post-card[data-post-id]"
    );

    let updated = false;

    cards.forEach(card => {
      const id = String(
        card.getAttribute("data-post-id") || ""
      );

      if (!id) return;

      if (refreshPostCommentCount(id)) {
        updated = true;
      }
    });

    return updated;
  }

  /* =======================================================
     COMMENT ACTION HELPERS
  ======================================================= */

  function isCommentAction(action) {
    return (
      action === "comment-add" ||
      action === "reply-add" ||
      action === "comment-update" ||
      action === "comment-delete" ||
      action === "comment-like" ||
      action === "comment-reaction"
    );
  }

  /* =======================================================
     DATA CHANGE HANDLER
  ======================================================= */

  function handleDataChange(event) {
    const detail = event?.detail || {};

    const collection = detail.collection || "";
    const action = String(detail.action || "");
    const item = detail.item || {};

    const name = getCollectionName(collection);

    if (!shouldRefreshForCollection(name)) {
      return false;
    }

    const currentPage = getCurrentPage();

    /* ---------------------------------------------------
       POSTS
    --------------------------------------------------- */

    if (isPostsCollection(name)) {

      /*
       * Comment and reply changes:
       * Refresh avatar UI after the modal has rendered.
       */

      if (isCommentAction(action)) {
        queueAvatarRefresh();
      }

      /* -----------------------------------------------
         HOME PAGE
      ----------------------------------------------- */

      if (currentPage === "home") {

        /*
         * COMMENT ADD / REPLY ADD
         *
         * Only update the related post count.
         */

        if (
          action === "comment-add" ||
          action === "reply-add"
        ) {
          const postId = item.postId || "";

          const updated = refreshPostCommentCount(
            postId
          );

          /*
           * If the card is not mounted, use the
           * safe full feed refresh.
           */

          return updated
            ? true
            : refreshHomeFeed();
        }

        /*
         * COMMENT DELETE
         *
         * Find the affected post ID from the existing
         * comment DOM before the modal is re-rendered.
         */

        if (action === "comment-delete") {

          const postId = findPostIdFromCommentDOM(
            item
          );

          if (postId) {
            const updated = refreshPostCommentCount(
              postId
            );

            if (updated) {
              return true;
            }

            /*
             * A valid post ID exists, but its card
             * is not currently mounted.
             */

            return refreshHomeFeed();
          }

          /*
           * No post ID found:
           * Update visible counts without rendering
           * the complete Home Feed.
           */

          const updated =
            refreshVisiblePostCommentCounts();

          return updated
            ? true
            : refreshHomeFeed();
        }

        /*
         * COMMENT UPDATE / LIKE / REACTION
         *
         * The comment modal owns its own rendering.
         * No Home Feed rendering is required.
         */

        if (
          action === "comment-update" ||
          action === "comment-like" ||
          action === "comment-reaction"
        ) {
          return true;
        }

        /*
         * Other post changes:
         * Keep existing behavior.
         */

        return refreshHomeFeed();
      }

      /* -----------------------------------------------
         PROFILE / SAVED PAGE
      ----------------------------------------------- */

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

      /*
       * Friend avatars may have changed.
       */

      queueAvatarRefresh();

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

      /*
       * Profile photo may have changed.
       */

      queueAvatarRefresh();

      if (currentPage === "profile") {
        return refreshOtherPage();
      }

      return true;
    }

    /* ---------------------------------------------------
       SAVED POSTS
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
        /*
         * Navigation dispatches "ksk:navigate" before it renders
         * the destination page. The notifications page handles that
         * event by marking notifications as read, which emits this
         * "mark-read" data-change event synchronously.
         *
         * Do not render here: navigate() will render the notifications
         * page immediately after all navigation listeners return.
         * Rendering here as well causes the page to render twice.
         *
         * Other notification changes must still refresh the visible
         * notifications page as before.
         */
        if (action === "mark-read") {
          return true;
        }

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
        options.renderStories,

      refreshMedia:
        options.refreshMedia,

      refreshProfileMedia:
        options.refreshProfileMedia
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
    shouldRefreshForCollection,

    refreshPostCommentCount,
    refreshVisiblePostCommentCounts,

    refreshAvatarUI
  });

})(window);
