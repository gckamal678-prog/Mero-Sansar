
"use strict";

/*
 * =========================================================
 * MERO SANSAR — CLOUD AVATAR UI
 *
 * RESPONSIBILITY:
 * - Cloud Post author avatar fallback
 * - Cloud Comment and Reply avatar fallback
 * - Handle broken or unavailable avatar images
 * - Refresh avatars when new content enters the DOM
 *
 * IMPORTANT:
 * - Does not read KSKData / Local Storage.
 * - Does not upload or modify profile photos.
 * - Does not replace post or comment content.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKAvatarUI) return;

  let initialized = false;
  let observer = null;

  const handledImages = new WeakSet();

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  /* =======================================================
     HELPERS
  ======================================================= */

  function getInitial(name) {
    const value = String(name || "").trim();

    return value.charAt(0) || "स";
  }

  function getPostAuthor(card) {
    return $(
      ".post-author-name",
      card
    )?.textContent?.trim() || "सदस्य";
  }

  function getCommentAuthor(comment) {
    return $(
      ".ksk-comment-author",
      comment
    )?.textContent?.trim() || "सदस्य";
  }

  function isAvatarImage(image) {
    if (!image || image.tagName !== "IMG") {
      return false;
    }

    return Boolean(
      image.closest(".post-header .avatar") ||
      image.classList.contains("ksk-comment-avatar")
    );
  }

  /* =======================================================
     FALLBACK
  ======================================================= */

  function createCommentFallback(author) {
    const span = document.createElement("span");

    span.className =
      "ksk-comment-avatar ksk-comment-avatar-fallback";

    span.textContent = getInitial(author);

    span.setAttribute(
      "aria-label",
      author || "सदस्य"
    );

    return span;
  }

  function showFallback(image) {
    if (!image?.isConnected) return;

    const comment = image.closest(
      ".ksk-comment"
    );

    if (comment) {
      const author = getCommentAuthor(comment);

      image.replaceWith(
        createCommentFallback(author)
      );

      return;
    }

    const card = image.closest(".post-card");

    if (!card) return;

    const avatar = image.closest(
      ".post-header .avatar"
    );

    if (!avatar) return;

    const author = getPostAuthor(card);

    avatar.textContent = getInitial(author);

    avatar.setAttribute(
      "aria-label",
      author
    );

    avatar.dataset.kskAvatarFallback = "true";
  }

  /* =======================================================
     IMAGE ERROR HANDLING
  ======================================================= */

  function watchImage(image) {
    if (!isAvatarImage(image)) return;

    if (handledImages.has(image)) return;

    handledImages.add(image);

    image.addEventListener(
      "error",
      () => showFallback(image),
      { once: true }
    );

    /*
     * Image पहिले नै fail भएको अवस्थामा पनि
     * fallback देखाउने।
     */

    if (image.complete && image.naturalWidth === 0) {
      showFallback(image);
    }
  }

  /* =======================================================
     POST AVATARS
  ======================================================= */

  function renderPostAvatars() {
    $$(".post-card .post-header .avatar img")
      .forEach(watchImage);
  }

  /* =======================================================
     COMMENT & REPLY AVATARS
  ======================================================= */

  function renderCommentAvatars() {
    $$(".ksk-comment img.ksk-comment-avatar")
      .forEach(watchImage);
  }

  /* =======================================================
     REFRESH
  ======================================================= */

  function refresh() {
    renderPostAvatars();
    renderCommentAvatars();
  }

  /* =======================================================
     DOM OBSERVER
  ======================================================= */

  function containsAvatarImage(node) {
    if (!node || node.nodeType !== 1) {
      return false;
    }

    if (isAvatarImage(node)) {
      return true;
    }

    return Boolean(
      node.querySelector(
        ".post-header .avatar img, " +
        ".ksk-comment img.ksk-comment-avatar"
      )
    );
  }

  function observeDOM() {
    if (observer || !document.body) return;

    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type !== "childList") continue;

        const found = [
          ...record.addedNodes
        ].some(containsAvatarImage);

        if (found) {
          refresh();
          return;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initialize() {
    if (initialized) return;

    initialized = true;

    observeDOM();

    global.addEventListener(
      "ksk:navigate",
      refresh
    );

    global.addEventListener(
      "ksk:data-ready",
      refresh
    );

    global.addEventListener(
      "ksk:data-change",
      refresh
    );

    global.addEventListener(
      "ksk:profile-updated",
      refresh
    );

    global.addEventListener(
      "ksk:friends-cloud-change",
      refresh
    );

    refresh();

    console.info(
      "KSK Cloud Avatar UI initialized."
    );
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKAvatarUI = Object.freeze({
    initialize,
    refresh,
    renderPostAvatars,
    renderCommentAvatars
  });

  /* =======================================================
     AUTO START
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
