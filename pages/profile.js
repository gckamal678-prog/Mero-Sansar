
"use strict";

/*
 * KSK — PROFILE PAGE MODULE
 * Responsibility:
 * - Render profile information
 * - Render profile posts
 * - Provide profile actions
 * - Provide access to saved posts
 */

(function (global) {
  "use strict";

  if (global.KSKProfilePage) return;

  function escapeHTML(value) {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function getProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getPosts() {
    return global.KSKData?.getPosts?.() || [];
  }

  function getDisplayName(user) {
    return String(
      user.name ||
      (isEnglish() ? "Your Profile" : "तपाईंको प्रोफाइल")
    );
  }

  function renderAvatar(user) {
    if (global.KSKUserCard?.renderAvatar) {
      return global.KSKUserCard.renderAvatar({
        name: user.name || "",
        avatar: user.avatar || "",
        avatarMediaId: user.avatarMediaId || ""
      });
    }

    const name = String(user.name || "").trim();
    const avatar = String(user.avatar || "").trim();

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(avatar)) {
      return `
        <div class="avatar avatar-xl">
          <img
            src="${escapeHTML(avatar)}"
            alt="${escapeHTML(name)}"
            loading="lazy">
        </div>
      `;
    }

    return `
      <div class="avatar avatar-xl">
        ${escapeHTML(name.charAt(0) || "स")}
      </div>
    `;
  }

  function getProfilePosts(user, posts) {
    const userId = String(user.id || "");
    const userName = String(user.name || "").trim();

    return posts.filter(post => {
      if (
        userId &&
        post.authorId &&
        String(post.authorId) === userId
      ) {
        return true;
      }

      const author = String(post.author || "").trim();

      return (
        author === userName ||
        author === getDisplayName(user)
      );
    });
  }

  function renderPostList(posts, options = {}) {
    if (!posts.length) {
      return `
        <div class="empty-state">
          ${isEnglish()
            ? "You have not published any posts."
            : "तपाईंले अहिलेसम्म पोस्ट गर्नुभएको छैन।"}
        </div>
      `;
    }

    if (typeof options.renderPost === "function") {
      return posts.map(post =>
        options.renderPost(post)
      ).join("");
    }

    return posts.map(post => `
      <article class="card post-card">

        <div class="post-header">
          <strong>
            ${escapeHTML(post.author || "")}
          </strong>
        </div>

        ${post.text ? `
          <div class="post-content">
            ${escapeHTML(post.text)}
          </div>
        ` : ""}

        <small class="post-time">
          ${escapeHTML(
            global.KSKUtils?.formatDateTime
              ? global.KSKUtils.formatDateTime(
                  post.createdAt,
                  isEnglish() ? "en" : "ne"
                )
              : ""
          )}
        </small>

      </article>
    `).join("");
  }

  function render(options = {}) {
    const user = options.user || getProfile();

    const allPosts = Array.isArray(options.posts)
      ? options.posts
      : getPosts();

    const posts = getProfilePosts(user, allPosts);
    const postCount = posts.length;

    return `
      <section class="profile-section">

        <div class="card profile-card">

          <div class="profile-avatar">
            ${renderAvatar(user)}
          </div>

          <h2 class="text-center">
            ${escapeHTML(getDisplayName(user))}
          </h2>

          ${user.bio ? `
            <p class="text-center">
              ${escapeHTML(user.bio)}
            </p>
          ` : ""}

          ${user.location ? `
            <p class="text-center text-muted">
              📍 ${escapeHTML(user.location)}
            </p>
          ` : ""}

          <div class="text-center">
            <span class="badge badge-primary">
              ${postCount}
              ${isEnglish() ? "Posts" : "पोस्ट"}
            </span>
          </div>

          <div
            class="flex-center"
            style="margin-top:16px; gap:10px; flex-wrap:wrap;">

            <button
              class="btn btn-primary"
              type="button"
              data-edit-profile>

              ✏️
              ${isEnglish()
                ? "Edit Profile"
                : "प्रोफाइल सम्पादन"}

            </button>

            <button
              class="btn btn-secondary"
              type="button"
              data-open-settings>

              ⚙️
              ${isEnglish()
                ? "Manage"
                : "व्यवस्थापन"}

            </button>

          </div>

          <div
            class="flex-center"
            style="margin-top:12px;">

            <button
              class="btn btn-secondary"
              type="button"
              data-page="saved"
              style="width:100%;">

              🔖
              ${isEnglish()
                ? "Saved Posts"
                : "सेभ गरिएका पोस्ट"}

            </button>

          </div>

        </div>

        <h3
          class="section-title"
          style="margin-top:20px">

          ${isEnglish()
            ? "My Posts"
            : "मेरा पोस्टहरू"}

        </h3>

        <div class="profile-posts">
          ${renderPostList(posts, options)}
        </div>

      </section>
    `;
  }

  global.KSKProfilePage = Object.freeze({
    render,
    getProfile,
    getProfilePosts
  });

})(window);
