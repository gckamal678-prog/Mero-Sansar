"use strict";

/*
 * =========================================================
 * KSK — AVATAR DISPLAY SYSTEM
 *
 * Responsibility:
 * - Post author profile photos
 * - Comment author profile photos
 * - Resolve KSK Media IDs into image URLs
 * - Support existing and new posts/comments
 *
 * Data source : KSKData
 * Media source: KSKMedia
 *
 * Does not own:
 * - Profile photo upload/crop
 * - Post creation
 * - Comment creation
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKAvatarUI) return;

  let initialized = false;
  let observer = null;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];


  /* =======================================================
     DATA
  ======================================================= */

  function getProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getPosts() {
    return global.KSKData?.getPosts?.() || [];
  }

  function getFriends() {
    return global.KSKData?.getFriends?.() || [];
  }


  /* =======================================================
     HELPERS
  ======================================================= */

  function isMediaId(value) {
    const source = String(value || "").trim();

    return (
      source.startsWith("ksk_media_") ||
      source.startsWith("media_")
    );
  }

  function isImageURL(value) {
    return /^(https?:\/\/|data:image\/|blob:)/i.test(
      String(value || "").trim()
    );
  }

  function isValidSource(value) {
    return isMediaId(value) || isImageURL(value);
  }

  function getProfileAvatar(user = getProfile()) {
    return (
      user.avatarMediaId ||
      user.avatar ||
      ""
    );
  }

  function sameUser(authorId, authorName, user) {
    const currentId = String(
      user.id || user.userId || ""
    );

    const currentName = String(
      user.name || ""
    ).trim().toLowerCase();

    const id = String(authorId || "");

    const name = String(
      authorName || ""
    ).trim().toLowerCase();

    if (id && currentId && id === currentId) {
      return true;
    }

    return Boolean(
      name &&
      currentName &&
      name === currentName
    );
  }

  function getFriendAvatar(authorId, authorName) {
    const friends = getFriends();

    const friend = friends.find(item => {
      const sameId =
        authorId &&
        item.id &&
        String(item.id) === String(authorId);

      const sameName =
        authorName &&
        item.name &&
        String(item.name).trim().toLowerCase() ===
        String(authorName).trim().toLowerCase();

      return sameId || sameName;
    });

    if (!friend) return "";

    return (
      friend.avatarMediaId ||
      friend.avatar ||
      friend.photo ||
      ""
    );
  }


  /* =======================================================
     MEDIA URL RESOLUTION
  ======================================================= */

  async function resolveImage(source) {
    if (!source) return "";

    const value = String(source).trim();

    if (isImageURL(value)) {
      return value;
    }

    if (!isMediaId(value)) {
      return "";
    }

    try {
      return await global.KSKMedia?.getImageURL?.(value) || "";
    } catch (error) {
      console.warn(
        "KSK Avatar: Could not load image.",
        error
      );

      return "";
    }
  }


  /* =======================================================
     POST AUTHOR PHOTO
  ======================================================= */

  function getPostAvatarSource(post) {
    if (!post) return "";

    const user = getProfile();

    // Use the photo saved with the post first.
    if (isValidSource(post.authorAvatar)) {
      return post.authorAvatar;
    }

    // Existing posts may not contain authorAvatar.
    if (
      sameUser(
        post.authorId,
        post.author,
        user
      )
    ) {
      return getProfileAvatar(user);
    }

    return getFriendAvatar(
      post.authorId,
      post.author
    );
  }

  function findPost(postId) {
    return getPosts().find(
      post => String(post.id) === String(postId)
    );
  }


  /* =======================================================
     COMMENT AUTHOR PHOTO
  ======================================================= */

  function findComment(commentId) {
    const posts = getPosts();

    for (const post of posts) {
      const comments = Array.isArray(post.comments)
        ? post.comments
        : [];

      const comment = comments.find(
        item => String(item.id) === String(commentId)
      );

      if (comment) {
        return comment;
      }
    }

    return null;
  }

  function getCommentAvatarSource(comment) {
    if (!comment) return "";

    const user = getProfile();

    if (isValidSource(comment.avatar)) {
      return comment.avatar;
    }

    // Older comments may not have stored an avatar.
    if (
      sameUser(
        comment.authorId,
        comment.author,
        user
      )
    ) {
      return getProfileAvatar(user);
    }

    return getFriendAvatar(
      comment.authorId,
      comment.author
    );
  }


  /* =======================================================
     IMAGE DISPLAY
  ======================================================= */

  function getFallbackText(element) {
    if (!element) return "स";

    return (
      element.dataset.avatarFallback ||
      element.textContent.trim() ||
      "स"
    );
  }

  function createImage(url, className, author) {
    const image = document.createElement("img");

    if (className) {
      image.className = className;
    }

    image.src = url;
    image.alt = author || "Profile Photo";
    image.loading = "lazy";
    image.decoding = "async";

    return image;
  }

  async function updateAvatar(
    element,
    source,
    author,
    imageClass = ""
  ) {
    if (!element || !source) return;

    const value = String(source);

    if (
      element.dataset.kskAvatarSource === value &&
      (
        element.dataset.kskAvatarReady === "true" ||
        element.dataset.kskAvatarReady === "loading"
      )
    ) {
      return;
    }

    element.dataset.kskAvatarSource = value;
    element.dataset.kskAvatarReady = "loading";

    const url = await resolveImage(value);

    // Ignore old asynchronous results.
    if (
      !element.isConnected ||
      element.dataset.kskAvatarSource !== value
    ) {
      return;
    }

    if (!url) {
      element.dataset.kskAvatarReady = "false";
      return;
    }

    const currentImage = $("img", element);

    if (currentImage?.src === url) {
      element.dataset.kskAvatarReady = "true";
      return;
    }

    const image = createImage(
      url,
      imageClass,
      author
    );

    image.addEventListener("error", () => {
      if (!element.isConnected) return;

      element.dataset.kskAvatarReady = "false";

      const fallback = document.createElement("span");

      fallback.className = imageClass.includes("ksk-comment")
        ? "ksk-comment-avatar-fallback"
        : "";

      fallback.textContent = getFallbackText(element);

      element.replaceChildren(fallback);
    }, { once: true });

    element.replaceChildren(image);

    element.dataset.kskAvatarReady = "true";
  }


  /* =======================================================
     POST AVATAR RENDERING
  ======================================================= */

  async function renderPostAvatar(card) {
    if (!card) return;

    const postId = card.dataset.postId;

    if (!postId) return;

    const post = findPost(postId);

    if (!post) return;

    const avatar = $(
      ".post-header .avatar",
      card
    );

    if (!avatar) return;

    const source = getPostAvatarSource(post);

    if (!source) return;

    await updateAvatar(
      avatar,
      source,
      post.author || "सदस्य"
    );
  }


  /* =======================================================
     COMMENT AVATAR RENDERING
  ======================================================= */

  async function renderCommentAvatar(element) {
    if (!element) return;

    const commentId = element.dataset.commentId;

    if (!commentId) return;

    const comment = findComment(commentId);

    if (!comment) return;

    const avatar = $(
      ".ksk-comment-avatar",
      element
    );

    if (!avatar) return;

    const source = getCommentAvatarSource(comment);

    if (!source) return;

    if (avatar.tagName === "IMG") {
      await updateAvatar(
        avatar.parentElement || element,
        source,
        comment.author,
        "ksk-comment-avatar"
      );

      return;
    }

    await updateAvatar(
      avatar,
      source,
      comment.author,
      "ksk-comment-avatar"
    );
  }


  /* =======================================================
     RENDER ALL
  ======================================================= */

  function renderPostAvatars() {
    $$(".post-card[data-post-id]").forEach(card => {
      renderPostAvatar(card);
    });
  }

  function renderCommentAvatars() {
    $$(".ksk-comment[data-comment-id]").forEach(item => {
      renderCommentAvatar(item);
    });
  }

  function refresh() {
    renderPostAvatars();
    renderCommentAvatars();
  }


  /* =======================================================
     DOM OBSERVER
  ======================================================= */

  function observeDOM() {
    if (observer) return;

    observer = new MutationObserver(records => {
      let shouldRefresh = false;

      for (const record of records) {
        if (
          record.type === "childList" &&
          (
            record.addedNodes.length ||
            record.removedNodes.length
          )
        ) {
          shouldRefresh = true;
          break;
        }
      }

      if (shouldRefresh) {
        refresh();
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
      "ksk:data-change",
      refresh
    );

    refresh();

    console.info(
      "KSK Avatar UI initialized."
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
