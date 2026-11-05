/* Hamro Sansar — Post Card Component */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatPostTime(timestamp) {
  if (!timestamp) return "भर्खरै";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "भर्खरै";
  }

  return new Intl.DateTimeFormat("ne-NP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function renderPostMedia(post) {
  if (!post.mediaUrl) return "";

  const mediaUrl = escapeHTML(post.mediaUrl);
  const mediaType = String(post.mediaType || "").toLowerCase();

  if (mediaType.startsWith("video")) {
    return `
      <video
        class="post-media"
        src="${mediaUrl}"
        controls
        preload="metadata"
        playsinline
      ></video>
    `;
  }

  return `
    <img
      class="post-media"
      src="${mediaUrl}"
      alt="पोस्टको फोटो"
      loading="lazy"
    />
  `;
}

export function renderPostCard(post = {}) {
  const postId = escapeHTML(post.id || "");
  const authorName = escapeHTML(post.authorName || "हाम्रो संसार सदस्य");
  const authorAvatar = escapeHTML(post.authorAvatar || "");
  const text = escapeHTML(post.text || "");
  const createdAt = escapeHTML(formatPostTime(post.createdAt));
  const likes = Number(post.likes || 0);
  const comments = Number(post.comments || 0);
  const shares = Number(post.shares || 0);
  const isLiked = Boolean(post.isLiked);

  const avatarContent = authorAvatar
    ? `<img src="${authorAvatar}" alt="${authorName}" loading="lazy">`
    : escapeHTML(authorName.charAt(0) || "ह");

  return `
    <article class="post-card" data-post-id="${postId}">
      <header class="post-header">
        <div class="avatar">${avatarContent}</div>

        <div class="post-author">
          <p class="post-author-name">${authorName}</p>
          <p class="post-time">${createdAt}</p>
        </div>

        <button
          class="icon-button"
          type="button"
          data-post-menu="${postId}"
          aria-label="पोस्ट विकल्प"
        >⋯</button>
      </header>

      ${
        text
          ? `<div class="post-content">${text}</div>`
          : ""
      }

      ${renderPostMedia(post)}

      <div class="post-actions">
        <button
          class="post-action ${isLiked ? "is-active" : ""}"
          type="button"
          data-post-action="like"
          data-post-id="${postId}"
          aria-pressed="${isLiked}"
        >
          ${isLiked ? "❤️" : "♡"} मन पर्‍यो ${likes}
        </button>

        <button
          class="post-action"
          type="button"
          data-post-action="comment"
          data-post-id="${postId}"
        >
          💬 टिप्पणी ${comments}
        </button>

        <button
          class="post-action"
          type="button"
          data-post-action="share"
          data-post-id="${postId}"
        >
          ↗️ साझा ${shares}
        </button>
      </div>
    </article>
  `;
}

export function renderPostList(posts = []) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3 class="empty-state-title">अहिलेसम्म पोस्ट छैन</h3>
        <p>पहिलो पोस्ट गरेर साथीहरूसँग कुरा सुरु गर्नुहोस्।</p>
      </div>
    `;
  }

  return posts.map((post) => renderPostCard(post)).join("");
}
