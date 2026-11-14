
"use strict";

/*
 * MERO SANSAR — SUPABASE CONNECTED PROFILE PAGE
 * Profile data: Supabase
 * Posts and social counts: Existing KSKData modules
 */

(function (global) {
  "use strict";

  if (global.KSKProfilePage) return;

  const VALID_TABS = new Set(["posts", "photos", "about"]);
  const STYLE_ID = "ksk-profile-upgrade-styles";

  let remoteProfile = null;
  let remoteLoadPromise = null;

  /* =====================================================
     LANGUAGE
  ===================================================== */

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function t(nepali, english) {
    return isEnglish() ? english : nepali;
  }

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

  /* =====================================================
     STYLES
  ===================================================== */

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .profile-section {
        width:100%;
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:14px;
      }

      .profile-section .profile-card {
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:11px;
        min-width:0;
        padding:22px 16px 18px;
        text-align:center;
        overflow:hidden;
      }

      .profile-section .ksk-profile-cover {
        width:100%;
        height:150px;
        position:relative;
        overflow:hidden;
        border-radius:14px;
        background:linear-gradient(135deg,#243b55,#141e30);
        cursor:pointer;
        margin-bottom:2px;
        display:block;
        outline-offset:3px;
      }

      .profile-section .ksk-profile-cover:focus-visible,
      .profile-section .profile-avatar:focus-visible {
        outline:3px solid var(--color-primary);
      }

      .profile-section .ksk-profile-cover-empty {
        width:100%;
        height:100%;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        color:#fff;
        font-size:30px;
      }

      .profile-section .ksk-profile-cover-label {
        font-size:12px;
        font-weight:750;
        letter-spacing:.2px;
      }

      .profile-section .ksk-profile-cover img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .profile-section .ksk-profile-photo-hint {
        position:absolute;
        right:10px;
        bottom:10px;
        padding:6px;
        border-radius:50%;
        background:var(--color-surface);
      }

      .profile-section .profile-avatar {
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        cursor:pointer;
        position:relative;
        width:max-content;
        max-width:100%;
        margin:0 auto 4px;
        outline-offset:4px;
      }

      .profile-section .profile-avatar-label {
        display:block;
        color:var(--color-muted);
        font-size:11px;
        font-weight:650;
        line-height:1.4;
      }

      .profile-section .ksk-profile-avatar-hint {
        position:absolute;
        top:76px;
        right:2px;
        z-index:3;
        width:28px;
        height:28px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        color:#fff;
        background:var(--color-primary);
        border:2px solid var(--color-surface);
        font-size:12px;
        pointer-events:none;
      }

      .profile-section .profile-avatar .avatar {
        width:104px;
        height:104px;
        flex-basis:104px;
        font-size:34px;
        border:4px solid var(--color-surface);
        box-shadow:0 0 0 2px var(--color-primary-soft);
      }

      .profile-section .profile-avatar img {
        width:100%;
        height:100%;
        object-fit:cover;
        border-radius:inherit;
      }

      .profile-section .profile-card h2 {
        max-width:100%;
        margin:2px 0 0;
        color:var(--color-text);
        font-size:22px;
        font-weight:850;
        line-height:1.3;
        overflow-wrap:anywhere;
      }

      .profile-section .profile-card > p {
        max-width:560px;
        margin:0;
        color:var(--color-text-secondary);
        font-size:13px;
        line-height:1.55;
        overflow-wrap:anywhere;
      }

      .profile-section .profile-stats {
        width:min(100%,460px);
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        margin-top:5px;
      }

      .profile-section .profile-stat {
        min-width:0;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:3px;
        padding:11px 5px;
        border:1px solid var(--color-border);
        border-radius:13px;
        background:var(--color-surface-secondary);
      }

      .profile-section .profile-stat strong {
        color:var(--color-text);
        font-size:19px;
        font-weight:850;
      }

      .profile-section .profile-stat span {
        color:var(--color-muted);
        font-size:11px;
        font-weight:700;
      }

      .profile-section .profile-post-count {
        color:var(--color-muted);
        font-size:12px;
        font-weight:750;
      }

      .profile-section .profile-main-actions {
        width:min(100%,460px);
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
        margin-top:3px;
      }

      .profile-section .profile-action-btn {
        min-width:0;
        min-height:46px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        padding:10px 9px;
        border:1px solid var(--color-border);
        border-radius:12px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:12px;
        font-weight:800;
        cursor:pointer;
      }

      .profile-section .profile-action-btn.primary {
        border-color:var(--color-primary);
        background:var(--color-primary);
        color:#fff;
      }

      .profile-section .profile-tools-card {
        min-width:0;
        padding:15px;
      }

      .profile-section .profile-tools-heading {
        margin:0 0 12px;
      }

      .profile-section .profile-tools-heading h3 {
        margin:0;
        color:var(--color-text);
        font-size:15px;
        font-weight:850;
      }

      .profile-section .profile-tools-heading p {
        margin:3px 0 0;
        color:var(--color-muted);
        font-size:11px;
      }

      .profile-section .profile-tool-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
      }

      .profile-section .profile-tool-grid button {
        min-width:0;
        min-height:54px;
        padding:10px;
        border:1px solid var(--color-border);
        border-radius:12px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:12px;
        font-weight:750;
        text-align:left;
        cursor:pointer;
      }

      .profile-section .profile-tool-note {
        margin:11px 2px 0;
        color:var(--color-muted);
        font-size:10px;
      }

      .profile-section .profile-tabs {
        width:100%;
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:5px;
        padding:5px;
        border:1px solid var(--color-border);
        border-radius:13px;
        background:var(--color-surface);
      }

      .profile-section .profile-tab {
        min-width:0;
        min-height:42px;
        padding:8px 5px;
        border:1px solid transparent;
        border-radius:10px;
        background:transparent;
        color:var(--color-muted);
        font-size:12px;
        font-weight:750;
        cursor:pointer;
      }

      .profile-section .profile-tab.is-active {
        border-color:var(--color-primary);
        background:var(--color-primary-soft);
        color:var(--color-primary);
      }

      .profile-section .profile-tab-panel {
        width:100%;
        min-width:0;
      }

      .profile-section .profile-posts {
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      .profile-section .profile-about-card {
        min-width:0;
        padding:15px;
      }

      .profile-section .profile-about-list {
        display:flex;
        flex-direction:column;
      }

      .profile-section .profile-about-item {
        display:flex;
        align-items:flex-start;
        gap:12px;
        padding:13px 2px;
        border-bottom:1px solid var(--color-border);
      }

      .profile-section .profile-about-item:last-child {
        border-bottom:0;
      }

      .profile-section .profile-about-icon {
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:grid;
        place-items:center;
        border-radius:11px;
        background:var(--color-surface-secondary);
      }

      .profile-section .profile-about-item > div {
        min-width:0;
        flex:1;
      }

      .profile-section .profile-about-item small {
        display:block;
        margin-bottom:3px;
        color:var(--color-muted);
        font-size:11px;
        font-weight:750;
      }

      .profile-section .profile-about-item p {
        margin:0;
        color:var(--color-text);
        font-size:14px;
        overflow-wrap:anywhere;
        white-space:pre-wrap;
      }

      @media(max-width:480px) {
        .profile-section {
          gap:11px;
        }

        .profile-section .profile-card {
          padding:18px 12px 15px;
        }

        .profile-section .profile-avatar .avatar {
          width:88px;
          height:88px;
          flex-basis:88px;
        }

        .profile-section .profile-card h2 {
          font-size:19px;
        }

        .profile-section .profile-tools-card {
          padding:12px;
        }
      }

      @media(max-width:340px) {
        .profile-section .profile-tool-grid {
          grid-template-columns:1fr;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  /* =====================================================
     PROFILE DATA
  ===================================================== */

  function getLocalProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getProfile() {
    return remoteProfile || getLocalProfile();
  }

  function normalizeRemoteProfile(profile) {
    if (!profile) return null;

    const firstName = String(profile.firstName || "").trim();
    const lastName = String(profile.lastName || "").trim();

    const fullName = [firstName, lastName]
      .filter(Boolean)
      .join(" ");

    return {
      ...profile,
      name: String(profile.name || fullName || "").trim(),
      bio: profile.bio || "",
      location: profile.location || "",
      avatar: profile.avatar || "",
      cover: profile.cover || "",
      joinedAt: profile.createdAt || ""
    };
  }

  function saveRemoteProfileToCache(profile) {
    const current = getLocalProfile();

    const values = {
      name: profile.name || "",
      bio: profile.bio || "",
      location: profile.location || "",
      avatar: profile.avatar || "",
      cover: profile.cover || ""
    };

    const changed = Object.keys(values).some(
      key => String(current[key] || "") !== String(values[key] || "")
    );

    if (!changed) return false;

    global.KSKData?.saveProfile?.(values);

    return true;
  }

  function refreshProfilePage() {
    if (
      global.KSKNavigation?.getCurrentPage?.() === "profile"
    ) {
      global.KSKNavigation?.refreshCurrentPage?.();
    }

    global.KSKProfileMediaUI?.refresh?.();
  }

  /*
   * The page renderer is synchronous.
   * This background request updates the local UI cache
   * after Supabase returns the authenticated user's profile.
   */

  function loadSupabaseProfile() {
    if (remoteLoadPromise) return remoteLoadPromise;

    const api = global.KSKSupabaseProfile;

    if (!api?.getMyProfile) return Promise.resolve(null);

    remoteLoadPromise = api.getMyProfile()
      .then(result => {
        if (!result) return null;

        remoteProfile = normalizeRemoteProfile(result);

        saveRemoteProfileToCache(remoteProfile);

        refreshProfilePage();

        console.info("KSK Profile: Supabase profile loaded.");

        return remoteProfile;
      })
      .catch(error => {
        console.warn(
          "KSK Profile: Supabase profile could not be loaded.",
          error
        );

        remoteLoadPromise = null;

        return null;
      });

    return remoteLoadPromise;
  }

  /* =====================================================
     POSTS AND FRIENDS
  ===================================================== */

  function getPosts() {
    const posts = global.KSKData?.getPosts?.();
    return Array.isArray(posts) ? posts : [];
  }

  function getFriends() {
    const friends = global.KSKData?.getFriends?.();
    return Array.isArray(friends) ? friends : [];
  }

  function getDisplayName(user) {
    return String(
      user?.name || t("तपाईंको प्रोफाइल", "Your Profile")
    );
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
    const safePosts = Array.isArray(posts) ? posts : [];
    const userId = String(user?.id || "");
    const userName = String(user?.name || "").trim();

    return safePosts.filter(post => {
      if (!post || typeof post !== "object") return false;

      const authorId = String(post.authorId || "");

      if (userId && authorId) {
        return authorId === userId;
      }

      const author = String(post.author || "").trim();

      if (userName && author === userName) return true;

      return !userId && !userName && author === "तपाईं";
    });
  }

  function isPhotoPost(post) {
    if (!post || typeof post !== "object") return false;

    const mediaType = String(
      post.mediaType || post.media?.type || ""
    ).trim().toLowerCase();

    if (["video", "audio", "voice", "music"].includes(mediaType)) {
      return false;
    }

    if (post.video || post.videoUrl || post.audio || post.audioUrl) {
      return false;
    }

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
      return `<div class="empty-state">${t(
        "तपाईंले अहिलेसम्म पोस्ट गर्नुभएको छैन।",
        "You have not published any posts."
      )}</div>`;
    }

    if (typeof options.renderPost === "function") {
      return posts.map(post => options.renderPost(post)).join("");
    }

    return posts.map(post => `
      <article class="card post-card">
        <div class="post-header">
          <strong>${escapeHTML(post.author || "")}</strong>
        </div>

        ${post.text
          ? `<div class="post-content">${escapeHTML(post.text)}</div>`
          : ""
        }

        <small class="post-time">
          ${escapeHTML(
            global.KSKUtils?.formatDateTime?.(
              post.createdAt,
              isEnglish() ? "en" : "ne"
            ) || ""
          )}
        </small>
      </article>
    `).join("");
  }

  function safeCount(value) {
    const count = Array.isArray(value) ? value.length : Number(value);

    return Number.isFinite(count) && count > 0
      ? Math.floor(count)
      : 0;
  }

  function getSocialCounts(user) {
    const social = global.KSKSocialData;
    let localCounts = null;

    try {
      const localUserId = social?.getLocalUserId?.();

      if (localUserId && typeof social?.getCounts === "function") {
        localCounts = social.getCounts(localUserId);
      }
    } catch (error) {
      localCounts = null;
    }

    if (localCounts && typeof localCounts === "object") {
      return {
        followers: safeCount(localCounts.followers),
        following: safeCount(localCounts.following),
        friends: safeCount(localCounts.friends)
      };
    }

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

  /* =====================================================
     PROFILE LINK
  ===================================================== */

  function getProfileLink() {
    try {
      const currentURL = new URL(global.location.href);
      currentURL.hash = "profile";
      return currentURL.toString();
    } catch (error) {
      return "";
    }
  }

  function showToast(message, type = "success") {
    const toast = global.KSKToast;

    if (typeof toast?.[type] === "function") {
      toast[type](message);
    } else if (typeof toast?.show === "function") {
      toast.show(message, type);
    }
  }

  async function copyProfileLink(button) {
    const link = getProfileLink();

    if (!link) {
      showToast(
        t("प्रोफाइल लिंक उपलब्ध भएन।", "Profile link is unavailable."),
        "error"
      );
      return false;
    }

    let copied = false;

    try {
      if (
        global.isSecureContext &&
        global.navigator?.clipboard?.writeText
      ) {
        await global.navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch (error) {
      copied = false;
    }

    if (!copied && document.body) {
      const field = document.createElement("textarea");

      field.value = link;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";

      document.body.appendChild(field);
      field.select();

      try {
        copied = Boolean(document.execCommand("copy"));
      } catch (error) {
        copied = false;
      }

      field.remove();
    }

    showToast(
      copied
        ? t("प्रोफाइल लिंक कपी भयो।", "Profile link copied.")
        : t("प्रोफाइल लिंक कपी गर्न सकिएन।", "Could not copy profile link."),
      copied ? "success" : "error"
    );

    button?.blur();

    return copied;
  }

  /* =====================================================
     ABOUT
  ===================================================== */

  function renderAbout(user) {
    const joinedAt = user?.joinedAt
      ? global.KSKUtils?.formatDateTime?.(
          user.joinedAt,
          isEnglish() ? "en" : "ne"
        ) || user.joinedAt
      : "";

    const rows = [
      user?.bio
        ? {
            icon: "📝",
            label: t("परिचय", "Bio"),
            value: user.bio
          }
        : null,

      user?.location
        ? {
            icon: "📍",
            label: t("स्थान", "Location"),
            value: user.location
          }
        : null,

      joinedAt
        ? {
            icon: "📅",
            label: t("सदस्य बनेको मिति", "Joined"),
            value: joinedAt
          }
        : null
    ].filter(Boolean);

    if (!rows.length) {
      return `<div class="empty-state">${t(
        "अहिलेसम्म About जानकारी थपिएको छैन। Edit Profile बाट जानकारी थप्न सक्नुहुन्छ।",
        "No About information yet. Add details from Edit Profile."
      )}</div>`;
    }

    return `
      <div class="profile-about-list">
        ${rows.map(row => `
          <div class="profile-about-item">
            <span class="profile-about-icon" aria-hidden="true">
              ${row.icon}
            </span>

            <div>
              <small>${escapeHTML(row.label)}</small>
              <p>${escapeHTML(row.value)}</p>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* =====================================================
     MAIN RENDER
  ===================================================== */

  function render(options = {}) {
    options = options && typeof options === "object"
      ? options
      : {};

    ensureStyles();

    // Start loading Supabase profile without blocking synchronous render.
    loadSupabaseProfile();

    const user = options.user && typeof options.user === "object"
      ? options.user
      : getProfile();

    const allPosts = Array.isArray(options.posts)
      ? options.posts
      : getPosts();

    const posts = getProfilePosts(user, allPosts);
    const photos = posts.filter(isPhotoPost);
    const counts = getSocialCounts(user);

    const activeTab = VALID_TABS.has(options.activeTab)
      ? options.activeTab
      : "posts";

    return `
      <section class="profile-section" data-profile-section>

        <section class="card profile-card" aria-label="${t(
          "मेरो प्रोफाइल",
          "My profile"
        )}">

          <div
            class="ksk-profile-cover"
            role="button"
            tabindex="0"
            aria-label="${t("Cover फोटो परिवर्तन गर्नुहोस्", "Change cover photo")}"
            title="${t("Cover फोटो राख्न ट्याप गर्नुहोस्", "Tap to add a cover photo")}"
          >
            <div class="ksk-profile-cover-empty">
              <span class="ksk-profile-cover-icon">🌄</span>
              <span class="ksk-profile-cover-label">
                ${t("Cover फोटो राख्नुहोस्", "Add cover photo")}
              </span>
            </div>
            <span class="ksk-profile-photo-hint" aria-hidden="true">📷</span>
          </div>

          <div
            class="profile-avatar"
            role="button"
            tabindex="0"
            aria-label="${t("प्रोफाइल फोटो परिवर्तन गर्नुहोस्", "Change profile photo")}"
            title="${t("प्रोफाइल फोटो राख्न ट्याप गर्नुहोस्", "Tap to add a profile photo")}"
          >
            ${renderAvatar(user)}
            <span class="profile-avatar-label">
              ${t("प्रोफाइल फोटो परिवर्तन गर्न ट्याप गर्नुहोस्", "Tap to change profile photo")}
            </span>
            <span class="ksk-profile-avatar-hint" aria-hidden="true">📷</span>
          </div>

          <h2>${escapeHTML(getDisplayName(user))}</h2>

          ${user.bio
            ? `<p>${escapeHTML(user.bio)}</p>`
            : ""
          }

          ${user.location
            ? `<p>📍 ${escapeHTML(user.location)}</p>`
            : ""
          }

          <div class="profile-stats">
            ${renderStat(counts.followers, t("फलोअर्स", "Followers"))}
            ${renderStat(counts.following, t("फलोइङ", "Following"))}
            ${renderStat(counts.friends, t("साथीहरू", "Friends"))}
          </div>

          <div class="profile-post-count">
            ${posts.length} ${t("पोस्ट", "Posts")}
          </div>

          <div class="profile-main-actions">
            <button
              class="profile-action-btn primary"
              type="button"
              data-edit-profile>
              <span>✏️</span>
              <span>${t("प्रोफाइल सम्पादन", "Edit Profile")}</span>
            </button>

            <button
              class="profile-action-btn"
              type="button"
              data-open-settings>
              <span>⚙️</span>
              <span>${t("सेटिङ", "Settings")}</span>
            </button>
          </div>

        </section>

        <section class="card profile-tools-card">

          <div class="profile-tools-heading">
            <h3>${t("प्रोफाइलका सुविधा", "Profile Tools")}</h3>
            <p>${t(
              "आफ्नो प्रोफाइल र सामग्री व्यवस्थापन गर्नुहोस्।",
              "Manage your profile and saved content."
            )}</p>
          </div>

          <div class="profile-tool-grid" data-profile-extras>

            <button
              type="button"
              data-copy-profile-link>
              🔗 ${t("प्रोफाइल लिंक कपी", "Copy Profile Link")}
            </button>

            <button
              type="button"
              data-page="saved">
              🔖 ${t("सेभ गरिएका पोस्ट", "Saved Posts")}
            </button>

          </div>

          <p class="profile-tool-note">
            ${t(
              "QR, उपलब्धि र Insights का विकल्पहरू यही सेक्सनमा देखिन्छन्।",
              "QR, achievements and insights appear in this section."
            )}
          </p>

        </section>

        <div class="profile-tabs" role="tablist">

          <button
            class="profile-tab${activeTab === "posts" ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${activeTab === "posts"}"
            data-profile-tab="posts">
            ${t("पोस्टहरू", "Posts")}
          </button>

          <button
            class="profile-tab${activeTab === "photos" ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${activeTab === "photos"}"
            data-profile-tab="photos">
            ${t("फोटोहरू", "Photos")}
          </button>

          <button
            class="profile-tab${activeTab === "about" ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${activeTab === "about"}"
            data-profile-tab="about">
            ${t("परिचय", "About")}
          </button>

        </div>

        <div
          class="profile-tab-panel${activeTab === "posts" ? "" : " hidden"}"
          data-profile-panel="posts"
          role="tabpanel">

          <div class="profile-posts">
            ${renderPostList(posts, options)}
          </div>

        </div>

        <div
          class="profile-tab-panel${activeTab === "photos" ? "" : " hidden"}"
          data-profile-panel="photos"
          role="tabpanel">

          <div class="profile-posts">
            ${photos.length
              ? renderPostList(photos, options)
              : `<div class="empty-state">${t(
                  "अहिलेसम्म कुनै फोटो पोस्ट गरिएको छैन।",
                  "No photos shared yet."
                )}</div>`
            }
          </div>

        </div>

        <div
          class="profile-tab-panel${activeTab === "about" ? "" : " hidden"}"
          data-profile-panel="about"
          role="tabpanel">

          <div class="card profile-about-card">
            ${renderAbout(user)}
          </div>

        </div>

      </section>
    `;
  }

  /* =====================================================
     TABS AND CLICK HANDLERS
  ===================================================== */

  function switchTab(button) {
    const section = button.closest("[data-profile-section]");
    const selected = button.dataset.profileTab;

    if (!section || !VALID_TABS.has(selected)) {
      return false;
    }

    section.querySelectorAll("[data-profile-tab]").forEach(tab => {
      const active = tab === button;

      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    section.querySelectorAll("[data-profile-panel]").forEach(panel => {
      panel.classList.toggle(
        "hidden",
        panel.dataset.profilePanel !== selected
      );
    });

    return true;
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

  /* =====================================================
     PUBLIC API
  ===================================================== */

  global.KSKProfilePage = Object.freeze({
    render,
    getProfile,
    getProfilePosts,
    getSocialCounts,
    getProfileLink,
    isPhotoPost,

    refreshFromSupabase() {
      remoteLoadPromise = null;
      return loadSupabaseProfile();
    }
  });

})(window);
