
"use strict";
/*
 * =========================================================
 * KSK AVATAR UI — POST & COMMENT PROFILE PHOTOS
 *
 * RESPONSIBILITY:
 * - Post author avatars
 * - Comment and reply author avatars
 * - Resolve KSK Media IDs into image URLs
 * - Support existing posts and comments
 *
 * DEPENDENCIES:
 * - KSKData
 * - KSKMedia
 *
 * Does NOT own:
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
     SOURCE HELPERS
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

    const source =
      friend.avatarMediaId ||
      friend.avatar ||
      friend.photo ||
      "";

    return isValidSource(source) ? source : "";
  }


  /* =======================================================
     MEDIA RESOLUTION
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
        "KSK Avatar: Image loading failed.",
        error
      );

      return "";
    }
  }


  /* =======================================================
     AUTHOR AVATAR SOURCE
  ======================================================= */

  function getPostAvatarSource(post) {
    if (!post) return "";

    const user = getProfile();

    if (isValidSource(post.authorAvatar)) {
      return post.authorAvatar;
    }

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

  function getCommentAvatarSource(comment) {
    if (!comment) return "";

    const user = getProfile();

    if (isValidSource(comment.avatar)) {
      return comment.avatar;
    }

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
     DATA LOOKUP
  ======================================================= */

  function findPost(postId) {
    return getPosts().find(
      post => String(post.id) === String(postId)
    );
  }

  function findComment(commentId) {
    const posts = getPosts();

    for (const post of posts) {
      const comments = Array.isArray(post.comments)
        ? post.comments
        : [];

      const comment = comments.find(
        item => String(item.id) === String(commentId)
      );

      if (comment) return comment;
    }

    return null;
  }


  /* =======================================================
     FALLBACK
  ======================================================= */

  function getInitial(name) {
    const value = String(name || "").trim();

    return value.charAt(0) || "स";
  }

  function getFallbackText(element, author) {
    return (
      element?.dataset?.avatarFallback ||
      getInitial(author) ||
      "स"
    );
  }

  function createFallback(author, className = "") {
    const span = document.createElement("span");

    if (className) {
      span.className = className;
    }

    span.textContent = getInitial(author);
    span.setAttribute("aria-label", author || "सदस्य");

    return span;
  }


  /* =======================================================
     IMAGE ELEMENT
  ======================================================= */

  function createImage(url, author, className = "") {
    const image = document.createElement("img");

    image.src = url;
    image.alt = author || "Profile Photo";
    image.loading = "lazy";
    image.decoding = "async";

    if (className) {
      image.className = className;
    }

    return image;
  }


  /* =======================================================
     POST AVATAR
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

    const value = String(source);

    if (
      avatar.dataset.kskAvatarSource === value &&
      (
        avatar.dataset.kskAvatarReady === "true" ||
        avatar.dataset.kskAvatarReady === "loading"
      )
    ) {
      return;
    }

    avatar.dataset.kskAvatarSource = value;
    avatar.dataset.kskAvatarReady = "loading";

    const url = await resolveImage(value);

    if (
      !avatar.isConnected ||
      avatar.dataset.kskAvatarSource !== value
    ) {
      return;
    }

    if (!url) {
      avatar.dataset.kskAvatarReady = "false";
      return;
    }

    const image = createImage(
      url,
      post.author || "सदस्य"
    );

    image.addEventListener("error", () => {
      if (!avatar.isConnected) return;

      if (avatar.dataset.kskAvatarSource !== value) {
        return;
      }

      avatar.dataset.kskAvatarReady = "false";

      avatar.replaceChildren(
        createFallback(post.author)
      );
    }, { once: true });

    avatar.replaceChildren(image);

    avatar.dataset.kskAvatarReady = "true";
  }


  /* =======================================================
     COMMENT & REPLY AVATAR
     Preserve the original comment structure.
  ======================================================= */

  async function renderCommentAvatar(commentElement) {
    if (!commentElement) return;

    const commentId = commentElement.dataset.commentId;

    if (!commentId) return;

    const comment = findComment(commentId);

    if (!comment) return;

    const avatar = $(
      ".ksk-comment-avatar",
      commentElement
    );

    if (!avatar) return;

    const source = getCommentAvatarSource(comment);

    if (!source) return;

    const value = String(source);

    if (
      avatar.dataset.kskAvatarSource === value &&
      (
        avatar.dataset.kskAvatarReady === "true" ||
        avatar.dataset.kskAvatarReady === "loading"
      )
    ) {
      return;
    }

    avatar.dataset.kskAvatarSource = value;
    avatar.dataset.kskAvatarReady = "loading";

    const url = await resolveImage(value);

    if (
      !avatar.isConnected ||
      avatar.dataset.kskAvatarSource !== value
    ) {
      return;
    }

    if (!url) {
      avatar.dataset.kskAvatarReady = "false";
      return;
    }

    const image = createImage(
      url,
      comment.author || "सदस्य",
      "ksk-comment-avatar"
    );

    image.dataset.kskAvatarSource = value;
    image.dataset.kskAvatarReady = "true";
    image.dataset.avatarFallback = getInitial(
      comment.authorInitial || comment.author
    );

    image.addEventListener("error", () => {
      if (!image.isConnected) return;

      const fallback = createFallback(
        comment.authorInitial || comment.author,
        "ksk-comment-avatar ksk-comment-avatar-fallback"
      );

      fallback.dataset.avatarFallback = getInitial(
        comment.authorInitial || comment.author
      );

      image.replaceWith(fallback);
    }, { once: true });

    // Replace only the avatar element.
    // Never replace the comment body or its parent.
    avatar.replaceWith(image);
  }


  /* =======================================================
     RENDER ALL POSTS
  ======================================================= */

  function renderPostAvatars() {
    $$(".post-card[data-post-id]").forEach(card => {
      renderPostAvatar(card);
    });
  }


  /* =======================================================
     RENDER ALL COMMENTS & REPLIES
  ======================================================= */

  function renderCommentAvatars() {
    $$(".ksk-comment[data-comment-id]").forEach(item => {
      renderCommentAvatar(item);
    });
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

  function observeDOM() {
    if (observer || !document.body) return;

    observer = new MutationObserver(records => {
      for (const record of records) {
        if (
          record.type === "childList" &&
          (
            record.addedNodes.length ||
            record.removedNodes.length
          )
        ) {
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
      "ksk:data-change",
      refresh
    );

    global.addEventListener(
      "ksk:data-ready",
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
