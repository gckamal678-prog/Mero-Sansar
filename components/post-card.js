
"use strict";

/*
 * =========================================================
 * KSK — POST CARD COMPONENT
 * Mero-Sansar
 *
 * - Render reusable post card
 * - Display author, avatar, date and post text
 * - Display reaction, comment, save and share actions
 * - Display live Supabase comment and share counts
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPostCard) {
    return;
  }

  const DATA = () => global.KSKData || null;
  const UTILS = () => global.KSKUtils || null;
  const LANG = () => global.KSKLanguage || null;

  function escapeHTML(value = "") {
    if (typeof UTILS()?.escapeHTML === "function") {
      return UTILS().escapeHTML(String(value));
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function isEnglish(options = {}) {
    if (typeof options.isEnglish === "boolean") {
      return options.isEnglish;
    }

    return LANG()?.getLanguage?.() === "en";
  }

  function getProfile() {
    return DATA()?.getProfile?.() || {
      id: "",
      name: ""
    };
  }

  function formatDate(value, options = {}) {
    if (typeof options.formatDate === "function") {
      return options.formatDate(value);
    }

    if (typeof UTILS()?.formatDateTime === "function") {
      return UTILS().formatDateTime(value);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      isEnglish(options) ? "en-US" : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }

  function isImageSource(value) {
    if (typeof value !== "string") {
      return false;
    }

    const source = value.trim();

    return (
      /^https?:\/\//i.test(source) ||
      /^data:image\//i.test(source) ||
      /^blob:/i.test(source)
    );
  }

  function getInitial(value, english) {
    return String(value || "").trim().charAt(0) ||
      (english ? "U" : "स");
  }

  /* AUTHOR AVATAR */

  function renderAvatar(
    name,
    avatar = "",
    size = "",
    english = false
  ) {
    const image = isImageSource(avatar);

    const content = image
      ? `
        <img
          src="${escapeHTML(avatar)}"
          alt=""
          loading="lazy">
      `
      : escapeHTML(getInitial(name, english));

    return `
      <div class="avatar ${escapeHTML(size)}">
        ${content}
      </div>
    `;
  }

  /* SAVED STATUS */

  function isPostSaved(postId) {
    const savedPosts = DATA()?.getSavedPosts?.() || [];

    return Array.isArray(savedPosts) &&
      savedPosts.some(item =>
        String(item) === String(postId)
      );
  }

  /* REACTION SUMMARY */

  function getReactionSummary(post) {
    const validReactions = [
      "🌹",
      "😘",
      "😢",
      "😠",
      "🤓"
    ];

    const reactionCounts =
      post.reactionCounts &&
      typeof post.reactionCounts === "object"
        ? post.reactionCounts
        : {};

    return validReactions
      .filter(emoji =>
        Number(reactionCounts[emoji] || 0) > 0
      )
      .sort((a, b) =>
        Number(reactionCounts[b] || 0) -
        Number(reactionCounts[a] || 0)
      )
      .slice(0, 5)
      .join("");
  }

  /* COMMENT COUNT */

  function getCommentCount(post) {
    const cloudCount = Number(post?.commentCount || 0);

    const localCount = Array.isArray(post?.comments)
      ? post.comments.length
      : 0;

    return Math.max(
      0,
      Number.isFinite(cloudCount) ? cloudCount : 0,
      localCount
    );
  }

  /* SHARE COUNT */

  function getShareCount(post) {
    const count = Number(post?.shareCount ?? 0);

    return Number.isFinite(count)
      ? Math.max(0, count)
      : 0;
  }

  /*
   * Share सफल भएपछि core/share.js ले
   * ksk:post-share-change event पठाउँछ।
   */

  function handleShareCountChange(event) {
    const detail = event.detail || {};

    const postId = String(detail.postId || "").trim();
    const count = Number(detail.shareCount);

    if (
      !postId ||
      !Number.isFinite(count) ||
      count < 0
    ) {
      return;
    }

    document
      .querySelectorAll(
        `[data-share-count-post-id="${postId}"]`
      )
      .forEach(node => {
        node.textContent = String(count);
      });
  }

  global.addEventListener(
    "ksk:post-share-change",
    handleShareCountChange
  );

  /* LIVE COMMENT COUNT UPDATE */

  function handleCommentCountChange(event) {
    const detail = event.detail || {};

    const postId = String(detail.postId || "").trim();

    if (!postId) return;

    /*
     * Feed refresh हुँदा Supabase बाट
     * नयाँ commentCount पुनः प्राप्त हुन्छ।
     */
  }

  global.addEventListener(
    "ksk:posts-cloud-change",
    handleCommentCountChange
  );

  /* RENDER POST CARD */

  function render(post, options = {}) {
    if (!post || typeof post !== "object") {
      return "";
    }

    const english = isEnglish(options);
    const currentUser = getProfile();

    const id = escapeHTML(post.id);

    const savedAuthor = String(
      post.author || ""
    ).trim();

    const isPlaceholderAuthor = [
      "तपाईं",
      "you"
    ].includes(savedAuthor.toLowerCase());

    const author = escapeHTML(
      isPlaceholderAuthor && currentUser.name
        ? currentUser.name
        : savedAuthor || "सदस्य"
    );

    const text = escapeHTML(post.text || "");

    const date = escapeHTML(
      formatDate(post.createdAt, options)
    );

    const liked = Boolean(post.liked);

    const likes = Math.max(
      0,
      Number(post.likes || 0)
    );

    const myReaction = post.myReaction || "";

    const reactionSummary = getReactionSummary(post);

    const reactionIcon = reactionSummary ||
      myReaction ||
      (liked ? "❤️" : "♡");

    const saved = isPostSaved(post.id);

    /*
     * अब Supabase commentCount लाई
     * comments array भन्दा प्राथमिकता दिइन्छ।
     */

    const commentCount = getCommentCount(post);

    const shareCount = getShareCount(post);

    const mediaUrl = isImageSource(post.mediaUrl)
      ? escapeHTML(post.mediaUrl.trim())
      : "";

    return `
      <article
        class="post-card"
        data-post-id="${id}"
        ${mediaUrl
          ? `data-post-media-url="${mediaUrl}"`
          : ""}>

        <header class="post-header">

          ${renderAvatar(
            post.author,
            post.authorAvatar || "",
            "",
            english
          )}

          <div class="post-author">

            <p class="post-author-name">
              ${author}
            </p>

            <p class="post-time">
              ${date}
            </p>

          </div>

          <button
            class="icon-button"
            type="button"
            data-post-menu="${id}"
            aria-label="${english
              ? "Post options"
              : "पोस्ट विकल्प"}">

            ⋯

          </button>

        </header>

        ${
          text
            ? `<div class="post-content">${text}</div>`
            : ""
        }

        <footer class="post-actions">

          <button
            class="post-action ${liked ? "is-active" : ""}"
            type="button"
            data-post-action="like"
            data-post-id="${id}"
            aria-label="${english
              ? "React to post"
              : "पोस्टमा Reaction दिनुहोस्"}"
            title="${escapeHTML(
              myReaction || (liked ? "❤️" : "Reaction")
            )}">

            ${reactionIcon}
            ${likes}

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="comment"
            data-post-id="${id}"
            aria-label="${english
              ? `Comments, ${commentCount}`
              : `टिप्पणीहरू, ${commentCount}`}">

            💬
            ${english ? "Comment" : "टिप्पणी"}
            <span
              class="post-comment-count"
              data-comment-count-post-id="${id}">${commentCount}</span>

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="save"
            data-post-id="${id}">

            ${saved ? "🔖" : "☆"}
            ${english ? "Save" : "सेभ"}

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="share"
            data-post-id="${id}"
            aria-label="${english
              ? `Share post, ${shareCount} shares`
              : `पोस्ट साझा गर्नुहोस्, ${shareCount} पटक साझा भयो`}">

            ↗
            ${english ? "Share" : "साझा"}
            (<span
              class="post-share-count"
              data-share-count-post-id="${id}">${shareCount}</span>)

          </button>

        </footer>

      </article>
    `;
  }

  /* PUBLIC API */

  global.KSKPostCard = Object.freeze({
    render,
    renderAvatar,
    getCommentCount
  });

})(window);
