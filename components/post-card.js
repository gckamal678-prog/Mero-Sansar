"use strict";

/* Hamro Sansar — Post Card Component */
(function (global) {
  const escapeHTML = global.HamroUtils
    ? global.HamroUtils.escapeHTML
    : (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
      })[char]);

  function formatPostTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "भर्खरै";

    try {
      return new Intl.DateTimeFormat("ne-NP", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
  }

  function renderMedia(post) {
    const mediaUrl = post.mediaUrl || post.mediaData || "";
    if (!mediaUrl) return "";

    const safeUrl = escapeHTML(mediaUrl);
    const type = String(post.mediaType || "").toLowerCase();

    if (type.startsWith("video")) {
      return `<video class="post-media" src="${safeUrl}"
        controls preload="metadata" playsinline></video>`;
    }

    return `<img class="post-media" src="${safeUrl}"
      alt="पोस्टको फोटो" loading="lazy">`;
  }

  function renderPostCard(post = {}) {
    const id = escapeHTML(post.id || "");
    const author = escapeHTML(post.authorName || post.author || "हाम्रो संसार सदस्य");
    const initial = escapeHTML(post.authorAvatar || post.authorInitial || author.charAt(0) || "ह");
    const text = escapeHTML(post.text || "");
    const time = escapeHTML(formatPostTime(post.createdAt));
    const likes = Number(post.likes || 0);
    const comments = Number(post.comments || 0);
    const shares = Number(post.shares || 0);
    const liked = Boolean(post.isLiked || post.liked);

    return `
      <article class="post-card" data-post-id="${id}">
        <header class="post-header">
          <div class="avatar">${initial}</div>
          <div class="post-author">
            <p class="post-author-name">${author}</p>
            <p class="post-time">${time}</p>
          </div>
          <button class="icon-button" type="button"
            data-post-menu="${id}" aria-label="पोस्ट विकल्प">⋯</button>
        </header>

        ${text ? `<div class="post-content">${text}</div>` : ""}
        ${renderMedia(post)}

        <div class="post-actions">
          <button class="post-action ${liked ? "is-active" : ""}"
            type="button" data-post-action="like"
            data-post-id="${id}" aria-pressed="${liked}">
            ${liked ? "❤️" : "♡"} मन पर्‍यो ${likes}
          </button>
          <button class="post-action" type="button"
            data-post-action="comment" data-post-id="${id}">
            💬 टिप्पणी ${comments}
          </button>
          <button class="post-action" type="button"
            data-post-action="share" data-post-id="${id}">
            ↗️ साझा ${shares}
          </button>
        </div>
      </article>
    `;
  }

  function renderPostList(posts = []) {
    if (!Array.isArray(posts) || posts.length === 0) return "";
    return posts.map(renderPostCard).join("");
  }

  global.HamroPostCard = Object.freeze({
    renderPostCard,
    renderPostList
  });
})(window);
