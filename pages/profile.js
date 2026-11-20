"use strict";

/*
 * MERO SANSAR — SUPABASE CONNECTED PROFILE PAGE
 */

(function (global) {
  "use strict";

  if (global.KSKProfilePage) return;

  const VALID_TABS = new Set(["posts", "photos", "about"]);
  const STYLE_ID = "ksk-profile-upgrade-styles";

  let remoteProfile = null;
  let remoteLoadPromise = null;
  let viewingUserId = "";
  let profilePosts = [];
  let profilePostsPromise = null;
  let profileRequestToken = 0;
  let profileLoadState = "idle";

  /* BIRTHDAY + WORK/STUDY STATE */

  let birthdaySettings = null;
  let profileBirthday = null;
  let profileExperiences = [];
  let profileDetailsPromise = null;
  let profileDetailsRequestToken = 0;

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

  /* STYLES */

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

      .profile-section.is-public-profile .profile-main-actions,
      .profile-section.is-public-profile .profile-tools-card {
        display:none !important;
      }

      .profile-section.is-public-profile .profile-avatar,
      .profile-section.is-public-profile .ksk-profile-cover {
        pointer-events:none;
        cursor:default;
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
        display:block;
      }

      .profile-section .profile-card .profile-avatar {
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
        padding:0 !important;
        background:transparent !important;
        border:0 !important;
        border-radius:0 !important;
        box-shadow:none !important;
        outline-offset:4px;
      }

      .profile-section .profile-avatar .avatar {
        width:104px !important;
        height:104px !important;
        min-width:104px;
        min-height:104px;
        flex:0 0 104px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:50% !important;
        font-size:34px;
        border:4px solid var(--color-surface);
        box-shadow:0 0 0 2px var(--color-primary-soft);
        box-sizing:border-box;
      }

      .profile-section .profile-avatar .avatar img,
      .profile-section .profile-avatar img {
        width:100%;
        height:100%;
        display:block;
        object-fit:cover;
        border-radius:50% !important;
      }

      /* Hide camera icons and the photo-change hint.
         The photo click handlers remain active. */

      .profile-section .ksk-profile-photo-hint,
      .profile-section .ksk-profile-avatar-hint,
      .profile-section .profile-avatar-label {
        display:none !important;
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

      .profile-section .profile-post-count {
        color:var(--color-muted);
        font-size:12px;
        font-weight:750;
      }

      /* EDIT PROFILE + SETTINGS */

      .profile-section .profile-main-actions {
        width:min(100%,480px);
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        margin-top:7px;
      }

      .profile-section .profile-action-btn {
        min-width:0;
        min-height:50px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        padding:11px 12px;
        border:1px solid var(--color-border);
        border-radius:14px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
        transition:transform .18s ease, border-color .18s ease;
      }

      .profile-section .profile-action-btn:active,
      .profile-section .profile-tool-grid button:active {
        transform:scale(.98);
      }

      .profile-section .profile-action-btn.primary {
        border-color:transparent;
        background:var(--color-primary);
        color:#fff;
        box-shadow:0 5px 14px rgba(37,99,235,.18);
      }

      .profile-section .profile-action-btn span:first-child {
        font-size:16px;
      }

      /* PROFILE TOOLS */

      .profile-section .profile-tools-card {
        min-width:0;
        padding:16px;
        border:1px solid var(--color-border);
        border-radius:17px;
        background:var(--color-surface);
      }

      .profile-section .profile-tools-heading {
        display:flex;
        align-items:flex-start;
        gap:10px;
        margin:0 0 14px;
      }

      .profile-section .profile-tools-heading::before {
        content:"🧰";
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:grid;
        place-items:center;
        border-radius:11px;
        background:var(--color-surface-secondary);
        font-size:17px;
      }

      .profile-section .profile-tools-heading h3 {
        margin:0;
        color:var(--color-text);
        font-size:15px;
        font-weight:850;
      }

      .profile-section .profile-tools-heading p {
        margin:4px 0 0;
        color:var(--color-muted);
        font-size:11px;
        line-height:1.5;
      }

      .profile-section .profile-tool-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
      }

      .profile-section .profile-tool-grid button {
        min-width:0;
        min-height:58px;
        display:flex;
        align-items:center;
        gap:9px;
        padding:11px 12px;
        border:1px solid var(--color-border);
        border-radius:13px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:12px;
        font-weight:750;
        line-height:1.4;
        text-align:left;
        overflow-wrap:anywhere;
        cursor:pointer;
        transition:transform .18s ease, border-color .18s ease, background .18s ease;
      }

      .profile-section .profile-tool-grid button:hover {
        border-color:var(--color-primary);
        background:var(--color-primary-soft);
      }

      .profile-section .profile-tool-grid button:focus-visible,
      .profile-section .profile-action-btn:focus-visible {
        outline:2px solid var(--color-primary);
        outline-offset:3px;
      }

      .profile-section .profile-tool-note {
        margin:12px 2px 0;
        color:var(--color-muted);
        font-size:10px;
        line-height:1.5;
      }

      /* PROFILE TABS */

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

      /* ABOUT */

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
          width:88px !important;
          height:88px !important;
          min-width:88px;
          min-height:88px;
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

  /* BIRTHDAY API */

  async function getMyBirthdaySettings() {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.getMyBirthdaySettings !== "function") {
      throw new Error("Birthday settings API उपलब्ध छैन।");
    }

    const result = await api.getMyBirthdaySettings();
    birthdaySettings = result || null;

    return birthdaySettings;
  }

  async function updateMyBirthdaySettings(settings) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.updateMyBirthdaySettings !== "function") {
      throw new Error("Birthday update API उपलब्ध छैन।");
    }

    const result = await api.updateMyBirthdaySettings(settings);

    birthdaySettings = await getMyBirthdaySettings();

    refreshProfilePage();

    return result;
  }

  async function getProfileBirthday(userId) {
    const id = String(userId || "").trim();

    if (!id) return null;

    const api = global.KSKSupabaseProfile;

    if (typeof api?.getProfileBirthday !== "function") {
      throw new Error("Profile birthday API उपलब्ध छैन।");
    }

    profileBirthday = await api.getProfileBirthday(id);

    return profileBirthday;
  }

  /* WORK / STUDY EXPERIENCE API */

  async function getMyExperiences() {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.getMyExperiences !== "function") {
      throw new Error("Experience API उपलब्ध छैन।");
    }

    const result = await api.getMyExperiences();

    profileExperiences = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];

    return profileExperiences;
  }

  async function getProfileExperiences(userId) {
    const id = String(userId || "").trim();

    if (!id) return [];

    const api = global.KSKSupabaseProfile;

    if (typeof api?.getProfileExperiences !== "function") {
      throw new Error("Profile experience API उपलब्ध छैन।");
    }

    const result = await api.getProfileExperiences(id);

    profileExperiences = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];

    return profileExperiences;
  }

  async function addMyExperience(values) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.addMyExperience !== "function") {
      throw new Error("Add experience API उपलब्ध छैन।");
    }

    const result = await api.addMyExperience(values);

    await getMyExperiences();
    refreshProfilePage();

    return result;
  }

  async function updateMyExperience(id, values) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.updateMyExperience !== "function") {
      throw new Error("Update experience API उपलब्ध छैन।");
    }

    const result = await api.updateMyExperience(id, values);

    await getMyExperiences();
    refreshProfilePage();

    return result;
  }

  async function deleteMyExperience(id) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.deleteMyExperience !== "function") {
      throw new Error("Delete experience API उपलब्ध छैन।");
    }

    const result = await api.deleteMyExperience(id);

    await getMyExperiences();
    refreshProfilePage();

    return result;
  }

  /* LOAD BIRTHDAY + WORK/STUDY DETAILS */

  async function loadProfileDetails(userId, ownProfile) {
    const requestToken = ++profileDetailsRequestToken;

    if (profileDetailsPromise) {
      profileDetailsPromise = null;
    }

    profileDetailsPromise = (async () => {
      try {
        if (ownProfile) {
          const results = await Promise.allSettled([
            getMyBirthdaySettings(),
            getMyExperiences()
          ]);

          if (requestToken !== profileDetailsRequestToken) return;

          results.forEach((result, index) => {
            if (result.status === "rejected") {
              console.warn(
                index === 0
                  ? "Birthday settings could not load."
                  : "My experiences could not load.",
                result.reason
              );
            }
          });
        } else {
          const results = await Promise.allSettled([
            getProfileBirthday(userId),
            getProfileExperiences(userId)
          ]);

          if (requestToken !== profileDetailsRequestToken) return;

          results.forEach((result, index) => {
            if (result.status === "rejected") {
              console.warn(
                index === 0
                  ? "Profile birthday could not load."
                  : "Profile experiences could not load.",
                result.reason
              );
            }
          });
        }
      } finally {
        if (requestToken === profileDetailsRequestToken) {
          profileDetailsPromise = null;
          refreshProfilePage();
        }
      }
    })();

    return profileDetailsPromise;
  }

  /* PROFILE DATA */

  function getLocalProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getProfile() {
    if (remoteProfile) return remoteProfile;
    return viewingUserId ? {} : getLocalProfile();
  }

  function getCurrentUserId() {
    return String(
      global.KSKSupabaseAuth?.getUser?.()?.id || ""
    ).trim();
  }

  function isOwnProfile(user = getProfile()) {
    const currentId = getCurrentUserId();
    const profileId = String(user?.id || user?.userId || "").trim();

    if (!currentId) return !viewingUserId;

    return !viewingUserId ||
      viewingUserId === currentId ||
      (profileId && profileId === currentId);
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
    if (global.KSKNavigation?.getCurrentPage?.() === "profile") {
      global.KSKNavigation?.refreshCurrentPage?.();
    }

    global.KSKProfileMediaUI?.refresh?.();
  }

  /* LOAD PROFILE FROM SUPABASE */

  function loadSupabaseProfile() {
    if (remoteLoadPromise) return remoteLoadPromise;

    const api = global.KSKSupabaseProfile;
    if (!api) return Promise.resolve(null);

    const requestedId = String(viewingUserId || "").trim();
    const currentId = getCurrentUserId();

    const requestToken = ++profileRequestToken;

    const isOtherUser = Boolean(
      requestedId && requestedId !== currentId
    );

    const loader = isOtherUser
      ? api.getProfileById
      : api.getMyProfile;

    if (typeof loader !== "function") {
      return Promise.resolve(null);
    }

    profileLoadState = "loading";

    remoteLoadPromise = Promise.resolve(
      isOtherUser
        ? loader.call(api, requestedId)
        : loader.call(api)
    )
      .then(async result => {
        if (requestToken !== profileRequestToken) return null;

        if (!result) {
          remoteProfile = null;
          profilePosts = [];
          profileLoadState = "not-found";
          remoteLoadPromise = null;
          refreshProfilePage();
          return null;
        }

        remoteProfile = normalizeRemoteProfile(result);
        profileLoadState = "loaded";

        if (isOtherUser) {
          await loadProfilePosts(requestedId, requestToken);
        } else {
          saveRemoteProfileToCache(remoteProfile);
        }

        if (requestToken === profileRequestToken) {
          refreshProfilePage();
        }

        console.info("KSK Profile: Supabase profile loaded.");

        return remoteProfile;
      })
      .catch(error => {
        if (requestToken === profileRequestToken) {
          remoteLoadPromise = null;
          profileLoadState = "error";
          refreshProfilePage();
        }

        console.warn(
          "KSK Profile: Supabase profile could not be loaded.",
          error
        );

        return null;
      });

    return remoteLoadPromise;
  }

  /* LOAD SELECTED USER'S POSTS */

  async function loadProfilePosts(userId, requestToken) {
    const api = global.KSKSupabasePosts;

    if (!api?.getFeed || !userId) {
      profilePosts = [];
      return [];
    }

    if (profilePostsPromise) {
      return profilePostsPromise;
    }

    profilePostsPromise = api.getFeed({ limit: 100 })
      .then(response => {
        if (requestToken !== profileRequestToken) return [];

        if (!response?.ok) {
          throw new Error(
            response?.message || "प्रोफाइलका पोस्ट लोड भएनन्।"
          );
        }

        const rows = Array.isArray(response.data)
          ? response.data
          : [];

        profilePosts = rows.filter(post =>
          String(post?.authorId || "") === String(userId)
        );

        return profilePosts;
      })
      .catch(error => {
        console.warn(
          "Profile posts could not be loaded.",
          error
        );

        profilePosts = [];
        return [];
      })
      .finally(() => {
        profilePostsPromise = null;
      });

    return profilePostsPromise;
  }

  /* NAVIGATION PROFILE ID */

  function handleProfileNavigation(event) {
    const detail = event?.detail || {};

    if (detail.page !== "profile") return;

    const nextId = String(
      detail.options?.profileUserId || ""
    ).trim();

    if (nextId === viewingUserId) return;

    viewingUserId = nextId;
    remoteProfile = null;
    remoteLoadPromise = null;
    profilePosts = [];
    profilePostsPromise = null;
    profileLoadState = "idle";
    profileRequestToken += 1;
  }

  /* POSTS AND FRIENDS */

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

  /* PROFILE LINK */

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

  /* ABOUT */

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
        "अहिलेसम्म About जानकारी थपिएको छैन।",
        "No About information yet."
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

  /* MAIN RENDER */

  function render(options = {}) {
    options = options && typeof options === "object"
      ? options
      : {};

    ensureStyles();

    const requestedId = String(
      options.profileUserId || viewingUserId || ""
    ).trim();

    if (requestedId !== viewingUserId) {
      viewingUserId = requestedId;
      remoteProfile = null;
      remoteLoadPromise = null;
      profilePosts = [];
      profilePostsPromise = null;
      profileLoadState = "idle";
      profileRequestToken += 1;
    }

    loadSupabaseProfile();

    const currentUserId = getCurrentUserId();
    const viewingAnotherUser = Boolean(
      viewingUserId && viewingUserId !== currentUserId
    );

    if (viewingAnotherUser && !remoteProfile) {
      const message = profileLoadState === "loading" || profileLoadState === "idle"
        ? t("प्रोफाइल लोड हुँदैछ…", "Loading profile…")
        : profileLoadState === "not-found"
          ? t("यो प्रोफाइल उपलब्ध छैन वा हेर्ने अनुमति छैन।", "This profile is unavailable or you do not have permission to view it.")
          : t("प्रोफाइल लोड हुन सकेन। कृपया फेरि प्रयास गर्नुहोस्।", "Could not load this profile. Please try again.");

      return `
        <section class="profile-section is-public-profile" data-profile-section>
          <div class="card empty-state" role="status" aria-live="polite">
            ${escapeHTML(message)}
            ${profileLoadState === "error" ? `
              <button type="button" data-retry-public-profile>
                ${t("फेरि प्रयास गर्नुहोस्", "Try again")}
              </button>
            ` : ""}
          </div>
        </section>
      `;
    }

    const user = options.user && typeof options.user === "object"
      ? options.user
      : getProfile();

    const ownProfile = isOwnProfile(user);

    const allPosts = Array.isArray(options.posts)
      ? options.posts
      : (ownProfile ? getPosts() : profilePosts);

    const posts = getProfilePosts(user, allPosts);
    const photos = posts.filter(isPhotoPost);

    const activeTab = VALID_TABS.has(options.activeTab)
      ? options.activeTab
      : "posts";

    return `
      <section class="profile-section${ownProfile ? "" : " is-public-profile"}" data-profile-section>

        <section class="card profile-card" aria-label="${t(
          ownProfile ? "मेरो प्रोफाइल" : "प्रोफाइल",
          ownProfile ? "My profile" : "Profile"
        )}">

          <div
            class="ksk-profile-cover"
            role="${ownProfile ? "button" : "img"}"
            ${ownProfile ? 'tabindex="0"' : ""}
            aria-label="${t("Cover फोटो", "Cover photo")}"
          >
            <div class="ksk-profile-cover-empty">
              <span class="ksk-profile-cover-icon">🌄</span>
              <span class="ksk-profile-cover-label">
                ${ownProfile
                  ? t("Cover फोटो राख्नुहोस्", "Add cover photo")
                  : t("Cover फोटो", "Cover photo")
                }
              </span>
            </div>
          </div>

          <div
            class="profile-avatar"
            role="${ownProfile ? "button" : "img"}"
            ${ownProfile ? 'tabindex="0"' : ""}
            aria-label="${escapeHTML(getDisplayName(user))}"
          >
            ${renderAvatar(user)}
          </div>

          <h2>${escapeHTML(getDisplayName(user))}</h2>

          ${user.bio ? `<p>${escapeHTML(user.bio)}</p>` : ""}

          ${user.location
            ? `<p>📍 ${escapeHTML(user.location)}</p>`
            : ""
          }

          <div class="profile-post-count">
            ${posts.length} ${t("पोस्ट", "Posts")}
          </div>

          ${ownProfile ? `
            <div class="profile-main-actions">
              <button class="profile-action-btn primary" type="button" data-edit-profile>
                <span>✏️</span>
                <span>${t("प्रोफाइल सम्पादन", "Edit Profile")}</span>
              </button>

              <button class="profile-action-btn" type="button" data-open-settings>
                <span>⚙️</span>
                <span>${t("सेटिङ", "Settings")}</span>
              </button>
            </div>
          ` : ""}

        </section>

        ${ownProfile ? `
          <section class="card profile-tools-card">
            <div class="profile-tools-heading">
              <div>
                <h3>${t("प्रोफाइलका सुविधा", "Profile Tools")}</h3>
                <p>${t(
                  "आफ्नो प्रोफाइल र सामग्री व्यवस्थापन गर्नुहोस्।",
                  "Manage your profile and saved content."
                )}</p>
              </div>
            </div>

            <div class="profile-tool-grid" data-profile-extras>
              <button type="button" data-copy-profile-link>
                🔗 ${t("प्रोफाइल लिंक कपी", "Copy Profile Link")}
              </button>

              <button type="button" data-page="saved">
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
        ` : ""}

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

  /* TABS AND CLICK HANDLERS */

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

    const retryButton = target.closest("[data-retry-public-profile]");

    if (retryButton) {
      event.preventDefault();
      remoteLoadPromise = null;
      profileLoadState = "idle";
      loadSupabaseProfile();
      refreshProfilePage();
      return;
    }

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
  global.addEventListener("ksk:navigate", handleProfileNavigation);

  /* PUBLIC API */

  global.KSKProfilePage = Object.freeze({
    render,
    getProfile,
    getProfilePosts,
    getProfileLink,
    isPhotoPost,

    getMyBirthdaySettings,
    updateMyBirthdaySettings,
    getProfileBirthday,

    getMyExperiences,
    getProfileExperiences,
    addMyExperience,
    updateMyExperience,
    deleteMyExperience,

    refreshFromSupabase() {
      remoteLoadPromise = null;
      profilePostsPromise = null;
      return loadSupabaseProfile();
    },

    openUserProfile(userId) {
      const id = String(userId || "").trim();
      if (!id) return false;

      const navigation = global.KSKNavigation;

      if (typeof navigation?.navigate === "function") {
        return navigation.navigate("profile", {
          profileUserId: id,
          source: "comment-author"
        });
      }

      global.dispatchEvent(new CustomEvent("ksk:navigate-request", {
        detail: {
          page: "profile",
          options: {
            profileUserId: id,
            source: "comment-author"
          }
        }
      }));

      return true;
    },

    getViewingUserId() {
      return viewingUserId;
    }
  });

})(window);
