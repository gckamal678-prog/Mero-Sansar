
"use strict";

/*
 * KSK — PROFILE PAGE MODULE
 * Own-profile presentation, social statistics, Posts / Photos / About tabs,
 * and a shareable profile deep link.
 *
 * Data ownership remains in KSKData. This module only reads and presents it.
 */

(function (global) {
  "use strict";

  if (global.KSKProfilePage) return;

  const VALID_TABS = new Set(["posts", "photos", "about"]);

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

  function t(nepali, english) {
    return isEnglish() ? english : nepali;
  }

  function getProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getPosts() {
    const posts = global.KSKData?.getPosts?.();
    return Array.isArray(posts) ? posts : [];
  }

  function getFriends() {
    const friends = global.KSKData?.getFriends?.();
    return Array.isArray(friends) ? friends : [];
  }

  function getDisplayName(user) {
    return String(user?.name || t("तपाईंको प्रोफाइल", "Your Profile"));
  }

  function renderAvatar(user) {
    if (global.KSKUserCard?.renderAvatar) {
      return global.KSKUserCard.renderAvatar({
        name: user?.name || "",
        avatar: user?.avatar || "",
        avatarMediaId: user?.avatarMediaId || ""
      });
    }

    const name = String(user?.name || "").trim();
    const avatar = String(user?.avatar || "").trim();

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(avatar)) {
      return `<div class="avatar avatar-xl"><img src="${escapeHTML(avatar)}" alt="${escapeHTML(name)}" loading="lazy"></div>`;
    }

    return `<div class="avatar avatar-xl">${escapeHTML(name.charAt(0) || "स")}</div>`;
  }

  function getProfilePosts(user, posts) {
    const safePosts = Array.isArray(posts) ? posts : [];
    const userId = String(user?.id || "");
    const userName = String(user?.name || "").trim();
    const displayName = getDisplayName(user);

    return safePosts.filter(post => {
      if (!post || typeof post !== "object") return false;

      const authorId = String(post.authorId || "");
      if (userId && authorId) return authorId === userId;

      const author = String(post.author || "").trim();
      if (userName && author === userName) return true;
      if (author === displayName) return true;

      return !userId && !userName && author === "तपाईं";
    });
  }

  function isPhotoPost(post) {
    if (!post || typeof post !== "object") return false;

    const mediaType = String(post.mediaType || post.media?.type || "").trim().toLowerCase();
    if (["video", "audio", "voice", "music"].includes(mediaType)) return false;
    if (post.video || post.videoUrl || post.audio || post.audioUrl) return false;

    return Boolean(
      post.mediaId ||
      post.mediaData ||
      post.image ||
      post.imageUrl ||
      post.mediaUrl ||
      post.photo ||
      post.media
    );
  }

  function renderPostList(posts, options = {}) {
    if (!posts.length) {
      return `<div class="empty-state">${t("तपाईंले अहिलेसम्म पोस्ट गर्नुभएको छैन।", "You have not published any posts.")}</div>`;
    }

    if (typeof options.renderPost === "function") {
      return posts.map(post => options.renderPost(post)).join("");
    }

    return posts.map(post => `
      <article class="card post-card">
        <div class="post-header"><strong>${escapeHTML(post.author || "")}</strong></div>
        ${post.text ? `<div class="post-content">${escapeHTML(post.text)}</div>` : ""}
        <small class="post-time">${escapeHTML(global.KSKUtils?.formatDateTime?.(post.createdAt, isEnglish() ? "en" : "ne") || "")}</small>
      </article>
    `).join("");
  }

  function safeCount(value) {
    const count = Array.isArray(value) ? value.length : Number(value);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  }

  function getSocialCounts(user) {
    const followers = Array.isArray(user?.followers)
      ? user.followers.length
      : safeCount(user?.followersCount ?? user?.followers);

    const following = Array.isArray(user?.following)
      ? user.following.length
      : safeCount(user?.followingCount ?? user?.following);

    return {
      followers,
      following,
      friends: getFriends().length
    };
  }

  function renderStat(value, label) {
    return `
      <div class="profile-stat">
        <strong>${escapeHTML(value)}</strong>
        <span>${escapeHTML(label)}</span>
      </div>
    `;
  }

  function getProfileLink() {
    try {
      const currentURL = new URL(global.location.href);
      currentURL.hash = "profile";
      return currentURL.toString();
    } catch (error) {
      console.error("KSKProfilePage: profile URL could not be created.", error);
      return "";
    }
  }

  function renderAbout(user) {
    const joinedAt = user?.joinedAt
      ? global.KSKUtils?.formatDateTime?.(user.joinedAt, isEnglish() ? "en" : "ne") || user.joinedAt
      : "";

    const rows = [
      user?.bio ? { icon: "📝", label: t("परिचय", "Bio"), value: user.bio } : null,
      user?.location ? { icon: "📍", label: t("स्थान", "Location"), value: user.location } : null,
      user?.website ? { icon: "🔗", label: t("वेबसाइट", "Website"), value: user.website } : null,
      joinedAt ? { icon: "📅", label: t("सदस्य बनेको मिति", "Joined"), value: joinedAt } : null
    ].filter(Boolean);

    if (!rows.length) {
      return `<div class="empty-state">${t("अहिलेसम्म About जानकारी थपिएको छैन। Edit Profile बाट उपलब्ध जानकारी थप्न सक्नुहुन्छ।", "No About information yet. Add available details from Edit Profile.")}</div>`;
    }

    return `<div class="profile-about-list">${rows.map(row => `
      <div class="profile-about-item">
        <span class="profile-about-icon" aria-hidden="true">${row.icon}</span>
        <div><small>${escapeHTML(row.label)}</small><p>${escapeHTML(row.value)}</p></div>
      </div>
    `).join("")}</div>`;
  }

  function render(options = {}) {
    options = options && typeof options === "object" ? options : {};

    const user = options.user && typeof options.user === "object"
      ? options.user
      : getProfile();

    const allPosts = Array.isArray(options.posts) ? options.posts : getPosts();
    const posts = getProfilePosts(user, allPosts);
    const photos = posts.filter(isPhotoPost);
    const counts = getSocialCounts(user);
    const activeTab = VALID_TABS.has(options.activeTab) ? options.activeTab : "posts";

    return `
      <section class="profile-section" data-profile-section>
        <div class="card profile-card">
          <div class="profile-avatar">${renderAvatar(user)}</div>
          <h2 class="text-center">${escapeHTML(getDisplayName(user))}</h2>
          ${user.bio ? `<p class="text-center">${escapeHTML(user.bio)}</p>` : ""}
          ${user.location ? `<p class="text-center text-muted">📍 ${escapeHTML(user.location)}</p>` : ""}

          <div class="profile-stats" aria-label="${t("प्रोफाइल तथ्याङ्क", "Profile statistics")}">
            ${renderStat(counts.followers, t("फलोअर्स", "Followers"))}
            ${renderStat(counts.following, t("फलोइङ", "Following"))}
            ${renderStat(counts.friends, t("साथीहरू", "Friends"))}
          </div>

          <div class="profile-post-count">${posts.length} ${t("पोस्ट", "Posts")}</div>

          <div class="flex-center profile-actions">
            <button class="btn btn-primary" type="button" data-edit-profile>✏️ ${t("प्रोफाइल सम्पादन", "Edit Profile")}</button>
            <button class="btn btn-secondary" type="button" data-open-settings>⚙️ ${t("व्यवस्थापन", "Manage")}</button>
          </div>

          <div class="flex-center profile-secondary-actions">
            <button class="btn btn-secondary" type="button" data-copy-profile-link>🔗 ${t("प्रोफाइल लिंक कपी", "Copy Profile Link")}</button>
            <button class="btn btn-secondary" type="button" data-page="saved">🔖 ${t("सेभ गरिएका पोस्ट", "Saved Posts")}</button>
          </div>
        </div>

        <div class="profile-tabs" role="tablist" aria-label="${t("प्रोफाइल सामग्री", "Profile content")}">
          <button class="profile-tab${activeTab === "posts" ? " is-active" : ""}" type="button" role="tab" aria-selected="${activeTab === "posts"}" aria-controls="profile-posts-panel" data-profile-tab="posts">${t("पोस्टहरू", "Posts")}</button>

          <button class="profile-tab${activeTab === "photos" ? " is-active" : ""}" type="button" role="tab" aria-selected="${activeTab === "photos"}" aria-controls="profile-photos-panel" data-profile-tab="photos">${t("फोटोहरू", "Photos")}</button>

          <button class="profile-tab${activeTab === "about" ? " is-active" : ""}" type="button" role="tab" aria-selected="${activeTab === "about"}" aria-controls="profile-about-panel" data-profile-tab="about">${t("परिचय", "About")}</button>
        </div>

        <div class="profile-tab-panel${activeTab === "posts" ? "" : " hidden"}" id="profile-posts-panel" data-profile-panel="posts" role="tabpanel">
          <div class="profile-posts">${renderPostList(posts, options)}</div>
        </div>

        <div class="profile-tab-panel${activeTab === "photos" ? "" : " hidden"}" id="profile-photos-panel" data-profile-panel="photos" role="tabpanel">
          <div class="profile-posts">${photos.length ? renderPostList(photos, options) : `<div class="empty-state">${t("अहिलेसम्म कुनै फोटो पोस्ट गरिएको छैन।", "No photos shared yet.")}</div>`}</div>
        </div>

        <div class="profile-tab-panel${activeTab === "about" ? "" : " hidden"}" id="profile-about-panel" data-profile-panel="about" role="tabpanel">
          <div class="card profile-about-card">${renderAbout(user)}</div>
        </div>
      </section>
    `;
  }

  function showToast(message, type = "success") {
    const toast = global.KSKToast;

    if (typeof toast?.[type] === "function") {
      toast[type](message);
    } else if (typeof toast?.show === "function") {
      toast.show(message, type);
    }
  }

  function switchTab(button) {
    const section = button.closest("[data-profile-section]");
    const selected = button.dataset.profileTab;

    if (!section || !VALID_TABS.has(selected)) return false;

    section.querySelectorAll("[data-profile-tab]").forEach(tab => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    section.querySelectorAll("[data-profile-panel]").forEach(panel => {
      const active = panel.dataset.profilePanel === selected;
      panel.classList.toggle("hidden", !active);
    });

    return true;
  }

  async function copyProfileLink(button) {
    const link = getProfileLink();

    if (!link) {
      showToast(t("प्रोफाइल लिंक उपलब्ध भएन।", "Profile link is unavailable."), "error");
      return false;
    }

    let copied = false;

    try {
      if (global.isSecureContext && global.navigator?.clipboard?.writeText) {
        await global.navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch (error) {
      console.warn("KSKProfilePage: Clipboard API unavailable.", error);
    }

    if (!copied && global.document?.body) {
      const field = global.document.createElement("textarea");

      field.value = link;
      field.setAttribute("readonly", "");
      field.setAttribute("aria-hidden", "true");
      field.style.position = "fixed";
      field.style.opacity = "0";
      field.style.pointerEvents = "none";

      global.document.body.appendChild(field);
      field.select();

      try {
        copied = Boolean(global.document.execCommand("copy"));
      } catch (error) {
        copied = false;
      }

      field.remove();
    }

    if (copied) {
      showToast(t("प्रोफाइल लिंक कपी भयो।", "Profile link copied."));
    } else {
      showToast(t("प्रोफाइल लिंक कपी गर्न सकिएन।", "Could not copy the profile link."), "error");
    }

    if (button) button.blur();

    return copied;
  }

  function handleClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const tab = target.closest("[data-profile-tab]");

    if (tab) {
      switchTab(tab);
      return;
    }

    const copyButton = target.closest("[data-copy-profile-link]");

    if (copyButton) {
      event.preventDefault();
      copyProfileLink(copyButton);
    }
  }

  document.addEventListener("click", handleClick);

  global.KSKProfilePage = Object.freeze({
    render,
    getProfile,
    getProfilePosts,
    getSocialCounts,
    getProfileLink,
    isPhotoPost
  });

})(window);
