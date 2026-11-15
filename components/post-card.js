
"use strict";

/*
 * KSK — POST CARD COMPONENT
 * Mero-Sansar
 *
 * Shared Action Menu:
 * - Own posts: Edit / Delete
 * - Other posts: no duplicate menu actions
 * - Save / Like / Comment / Share remain in footer
 */

(function (global) {
  "use strict";

  if (global.KSKPostCard) return;

  const DATA = () => global.KSKData || null;
  const UTILS = () => global.KSKUtils || null;
  const LANG = () => global.KSKLanguage || null;
  const POST_ACTIONS = () => global.KSKPostActions || null;
  const AUTH = () => global.KSKSupabaseAuth || null;

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

  /*
   * Ownership जाँचका लागि profile ID होइन,
   * Post Actions कै जस्तै Supabase Auth ID प्रयोग हुन्छ।
   */
  function getCurrentUserId() {
    return String(AUTH()?.getUser?.()?.id || "").trim();
  }

  function isOwnPost(post) {
    const userId = getCurrentUserId();
    const authorId = String(post?.authorId || "").trim();

    return Boolean(userId && authorId && userId === authorId);
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
    if (typeof value !== "string") return false;

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
    const content = isImageSource(avatar)
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

  /* SAVED POSTS */

  function isPostSaved(postId) {
    const actions = POST_ACTIONS();

    if (typeof actions?.isPostSaved === "function") {
      return Boolean(actions.isPostSaved(postId));
    }

    return false;
  }

  function updateSaveButton(button, saved, english) {
    if (!button) return;

    button.textContent = saved
      ? `🔖 ${english ? "Saved" : "सेभ भयो"}`
      : `☆ ${english ? "Save" : "सेभ"}`;

    button.classList.toggle("is-active", Boolean(saved));
    button.setAttribute("aria-pressed", String(Boolean(saved)));
    button.dataset.postSaved = String(Boolean(saved));
  }

  function handleSavedPostsChange(event) {
    const detail = event?.detail || {};
    const action = String(detail.action || "");
    const english = LANG()?.getLanguage?.() === "en";

    if (action === "loaded") {
      const postIds = new Set(
        Array.isArray(detail.postIds)
          ? detail.postIds.map(String)
          : []
      );

      document
        .querySelectorAll(
          '[data-post-action="save"][data-post-id]'
        )
        .forEach(button => {
          const postId = String(button.dataset.postId || "");

          updateSaveButton(
            button,
            postIds.has(postId),
            english
          );
        });

      return;
    }

    const postId = String(detail.postId || "").trim();

    if (!postId) return;

    const saved = typeof detail.saved === "boolean"
      ? detail.saved
      : action === "saved";

    document
      .querySelectorAll(
        '[data-post-action="save"][data-post-id]'
      )
      .forEach(button => {
        if (String(button.dataset.postId || "") !== postId) {
          return;
        }

        updateSaveButton(button, saved, english);
      });
  }

  global.addEventListener(
    "ksk:saved-posts-change",
    handleSavedPostsChange
  );

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
      .querySelectorAll("[data-share-count-post-id]")
      .forEach(node => {
        if (
          String(node.dataset.shareCountPostId || "") === postId
        ) {
          node.textContent = String(count);
        }
      });
  }

  global.addEventListener(
    "ksk:post-share-change",
    handleShareCountChange
  );

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

  /* SHARED ACTION MENU */

  function getPostMenuId(postId) {
    const safeId = String(postId || "").replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );

    return `ksk-post-menu-${safeId}`;
  }

  function renderPostMenu(post, options = {}) {
    /*
     * अरूको पोस्टमा Menu नदेखाउने।
     * Save/Share/Like/Comment footer मै उपलब्ध छन्।
     */
    if (!isOwnPost(post)) {
      return "";
    }

    const english = isEnglish(options);
    const postId = String(post.id || "");
    const menuId = getPostMenuId(postId);

    return `
      <div class="ksk-action-menu">

        <button
          class="icon-button"
          type="button"
          data-ksk-menu-trigger
          data-post-menu="${escapeHTML(postId)}"
          aria-controls="${escapeHTML(menuId)}"
          aria-expanded="false"
          aria-haspopup="menu"
          aria-label="${english
            ? "Post options"
            : "पोस्टका विकल्प"}"
          title="${english
            ? "More options"
            : "थप विकल्प"}">

          ⋯

        </button>

        <div
          id="${escapeHTML(menuId)}"
          data-ksk-menu
          role="menu"
          hidden>

          <button
            type="button"
            role="menuitem"
            data-menu-action="post-edit"
            data-menu-value="${escapeHTML(postId)}">

            <span aria-hidden="true">✏️</span>

            ${english
              ? "Edit post"
              : "पोस्ट सम्पादन"}

          </button>

          <button
            type="button"
            role="menuitem"
            class="is-danger"
            data-menu-action="post-delete"
            data-menu-value="${escapeHTML(postId)}">

            <span aria-hidden="true">🗑️</span>

            ${english
              ? "Delete post"
              : "पोस्ट मेटाउनुहोस्"}

          </button>

        </div>

      </div>
    `;
  }

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

    const commentCount = getCommentCount(post);
    const shareCount = getShareCount(post);

    const mediaUrl = isImageSource(post.mediaUrl)
      ? escapeHTML(post.mediaUrl.trim())
      : "";

    const menuMarkup = renderPostMenu(post, options);

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

          ${menuMarkup}

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
            class="post-action ${saved ? "is-active" : ""}"
            type="button"
            data-post-action="save"
            data-post-id="${id}"
            data-post-saved="${String(saved)}"
            aria-pressed="${String(saved)}">

            ${saved
              ? `🔖 ${english ? "Saved" : "सेभ भयो"}`
              : `☆ ${english ? "Save" : "सेभ"}`}

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
    getCommentCount,
    getShareCount,
    isPostSaved
  });

})(window);
