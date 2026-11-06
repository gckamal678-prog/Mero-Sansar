"use strict";

/*
 * =========================================================
 * KSK — MAIN APPLICATION CONTROLLER
 * Single Data Layer Architecture
 *
 * DATA          : KSKData
 * STATE         : KSKState
 * SETTINGS      : KSKSettings / KSKSettingsUI
 * THEME         : KSKTheme
 * LANGUAGE      : KSKLanguage
 * NAVIGATION    : KSKNavigation
 * MEDIA         : KSKMediaUI
 * PROFILE MEDIA : KSKProfileMediaUI
 * COMMENTS      : KSKComments
 * MODAL         : KSKModal
 * TOAST         : KSKToast
 *
 * This file integrates the application.
 * Feature modules own their own interfaces.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKApp) return;

  /* =======================================================
     SELECTORS AND SHARED MODULES
  ======================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const DATA = () => global.KSKData;
  const STATE = () => global.KSKState;
  const SETTINGS = () => global.KSKSettings;
  const SETTINGS_UI = () => global.KSKSettingsUI;
  const THEME = () => global.KSKTheme;
  const LANG = () => global.KSKLanguage;
  const NAV = () => global.KSKNavigation;
  const MODAL = () => global.KSKModal;
  const TOAST = () => global.KSKToast;
  const MEDIA_UI = () => global.KSKMediaUI;
  const PROFILE_MEDIA = () => global.KSKProfileMediaUI;
  const COMMENTS = () => global.KSKComments;

  let currentPage = "home";
  let activeChatId = null;
  let searchQuery = "";
  let initialized = false;

  const els = {};

  /* =======================================================
     ELEMENT CACHE
  ======================================================= */

  function cacheElements() {
    const ids = [
      "homePage",
      "otherPage",
      "otherPageTitle",
      "otherPageText",
      "bottomNav",
      "storiesList",
      "feedList",
      "emptyFeed",
      "openComposer",
      "quickText",
      "quickPhoto",
      "quickVideo",
      "searchPanel",
      "searchInput",
      "searchToggle",
      "notificationsToggle",
      "settingsModal",
      "closeSettings",
      "toastContainer"
    ];

    ids.forEach(id => {
      els[id] = document.getElementById(id);
    });
  }

  /* =======================================================
     COMMON HELPERS
  ======================================================= */

  function escapeHTML(value = "") {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function language() {
    return LANG()?.getLanguage?.() || "ne";
  }

  function isEnglish() {
    return language() === "en";
  }

  function translate(key, fallback = "") {
    return LANG()?.translate?.(key) || fallback || key;
  }

  function toast(message, type = "info") {
    const api = TOAST();

    if (api?.[type]) {
      api[type](message);
      return;
    }

    api?.show?.(message, type);
  }

  function confirmAction(message) {
    return global.confirm(message);
  }

  function formatDate(value) {
    if (global.KSKUtils?.formatDateTime) {
      return global.KSKUtils.formatDateTime(value);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }

  function formatTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  function profile() {
    return DATA()?.getProfile?.() || {
      id: "",
      name: "",
      bio: "",
      location: "",
      avatar: "",
      cover: "",
      avatarMediaId: "",
      coverMediaId: ""
    };
  }

  function displayName() {
    return profile().name ||
      (isEnglish() ? "You" : "तपाईं");
  }

  function initial(value) {
    return String(value || "").trim().charAt(0) ||
      (isEnglish() ? "U" : "स");
  }

  /*
   * Friend avatars may contain only an initial letter.
   * Never treat that letter as an image URL.
   */

  function isImageSource(value) {
    if (typeof value !== "string") return false;

    const source = value.trim();

    return (
      /^https?:\/\//i.test(source) ||
      /^data:image\//i.test(source) ||
      /^blob:/i.test(source)
    );
  }

  function avatarHTML(name, avatar = "", size = "") {
    const image = isImageSource(avatar);

    const content = image
      ? `<img src="${escapeHTML(avatar)}" alt="" loading="lazy">`
      : escapeHTML(initial(name));

    return `
      <div class="avatar ${escapeHTML(size)}">
        ${content}
      </div>
    `;
  }

  function openModal(options) {
    if (!MODAL()?.openModal) {
      toast(
        isEnglish()
          ? "This feature is unavailable."
          : "यो सुविधा अहिले उपलब्ध छैन।",
        "error"
      );

      return null;
    }

    return MODAL().openModal(options);
  }

  function closeModal() {
    MODAL()?.closeModal?.();
  }

  /* =======================================================
     DATA ACCESS
  ======================================================= */

  function getPosts() {
    return DATA()?.getPosts?.() || [];
  }

  function getStories() {
    return DATA()?.getStories?.() || [];
  }

  function getFriends() {
    return DATA()?.getFriends?.() || [];
  }

  function getChats() {
    return DATA()?.getChats?.() || [];
  }

  /* =======================================================
     PAGE LAYOUT
  ======================================================= */

  function showHomeLayout() {
    els.homePage?.classList.remove("hidden");
    els.otherPage?.classList.add("hidden");
  }

  function showOtherLayout() {
    els.homePage?.classList.add("hidden");
    els.otherPage?.classList.remove("hidden");
  }

  function setPageTitle(title) {
    if (els.otherPageTitle) {
      els.otherPageTitle.textContent = title;
    }
  }

  function setPageContent(html) {
    if (els.otherPageText) {
      els.otherPageText.innerHTML = html;
    }
  }

  /*
   * Navigation active state belongs to KSKNavigation.
   * app.js does not update active classes independently.
   */

  function refreshNavigation() {
    NAV()?.refreshNavigation?.();
  }

  /* =======================================================
     STORIES — RENDERING ONLY
     Creation and viewing belong to KSKMediaUI.
  ======================================================= */

  function renderStories() {
    if (!els.storiesList) return;

    const stories = getStories();

    const addLabel = isEnglish()
      ? "Add Story"
      : "स्टोरी थप्नुहोस्";

    const addStory = `
      <button
        class="story-card"
        type="button"
        data-story-create
        aria-label="${escapeHTML(addLabel)}">

        <span class="story-avatar">＋</span>

        <span class="story-name">
          ${escapeHTML(addLabel)}
        </span>

      </button>
    `;

    const storyItems = stories.map(story => `
      <button
        class="story-card"
        type="button"
        data-story-view="${escapeHTML(story.id)}">

        <span class="story-avatar">
          ${escapeHTML(initial(story.author))}
        </span>

        <span class="story-name">
          ${escapeHTML(story.author || "सदस्य")}
        </span>

      </button>
    `).join("");

    els.storiesList.innerHTML = addStory + storyItems;

    MEDIA_UI()?.refresh?.();
  }

  /* =======================================================
     POST RENDERING
  ======================================================= */

  function renderPost(post) {
    const id = escapeHTML(post.id);
    const author = escapeHTML(post.author || "सदस्य");
    const text = escapeHTML(post.text || "");
    const date = escapeHTML(formatDate(post.createdAt));

    const liked = Boolean(post.liked);
    const likes = Math.max(0, Number(post.likes || 0));
    const myReaction = post.myReaction || "";

    const validReactions = ["🌹", "😘", "😢", "😠", "🤓"];

    const reactionCounts = post.reactionCounts &&
      typeof post.reactionCounts === "object"
        ? post.reactionCounts
        : {};

    const reactionSummary = validReactions
      .filter(emoji => Number(reactionCounts[emoji] || 0) > 0)
      .sort((a, b) =>
        Number(reactionCounts[b] || 0) -
        Number(reactionCounts[a] || 0)
      )
      .slice(0, 5)
      .join("");

    const reactionIcon = reactionSummary ||
      myReaction ||
      (liked ? "❤️" : "♡");

    const saved = (DATA()?.getSavedPosts?.() || [])
      .some(item => String(item) === String(post.id));

    const commentCount = Array.isArray(post.comments)
      ? post.comments.length
      : 0;

    return `
      <article
        class="post-card"
        data-post-id="${id}">

        <header class="post-header">

          ${avatarHTML(
            post.author,
            post.authorAvatar || "",
            ""
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
            aria-label="${isEnglish()
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
            aria-label="${isEnglish()
              ? "React to post"
              : "पोस्टमा Reaction दिनुहोस्"}"
            title="${myReaction || (liked ? "❤️" : "Reaction")}">

            ${reactionIcon}
            ${likes}

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="comment"
            data-post-id="${id}">

            💬
            ${isEnglish() ? "Comment" : "टिप्पणी"}
            ${commentCount ? `(${commentCount})` : ""}

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="save"
            data-post-id="${id}">

            ${saved ? "🔖" : "☆"}
            ${isEnglish() ? "Save" : "सेभ"}

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="share"
            data-post-id="${id}">

            ↗
            ${isEnglish() ? "Share" : "साझा"}

          </button>

        </footer>

      </article>
    `;
  }

  /* =======================================================
     POST COMPOSER
     KSKMediaUI owns the photo/text composer.
     Fallback is used only if the module is unavailable.
  ======================================================= */

  function openPostComposer() {
    if (MEDIA_UI()?.openPostComposer) {
      MEDIA_UI().openPostComposer();
      return true;
    }

    const modal = openModal({
      title: isEnglish() ? "Create Post" : "नयाँ पोस्ट",

      content: `
        <form id="kskFallbackPostForm">

          <textarea
            id="kskFallbackPostText"
            class="form-textarea"
            rows="5"
            maxlength="10000"
            placeholder="${isEnglish()
              ? "What is on your mind?"
              : "के सोच्दै हुनुहुन्छ?"}"
            required></textarea>

        </form>
      `,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${translate("cancel", "रद्द")}
        </button>

        <button
          type="submit"
          form="kskFallbackPostForm"
          class="btn btn-primary">
          ${translate("publish", "प्रकाशित गर्नुहोस्")}
        </button>
      `
    });

    if (!modal) return false;

    $("#kskFallbackPostText", modal.element)?.focus();

    $("#kskFallbackPostForm", modal.element)?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const text = $("#kskFallbackPostText", modal.element)
          ?.value.trim();

        if (!text) {
          toast(
            isEnglish()
              ? "Please write something."
              : "पोस्ट लेख्नुहोस्।",
            "warning"
          );
          return;
        }

        const user = profile();

        const result = DATA()?.addPost?.({
          author: user.name || displayName(),
          authorId: user.id || "",
          authorInitial: initial(user.name),
          text,
          likes: 0,
          liked: false
        });

        if (!result) {
          toast(
            isEnglish()
              ? "Post could not be published."
              : "पोस्ट प्रकाशित गर्न सकिएन।",
            "error"
          );
          return;
        }

        closeModal();
        refreshCurrentPage();

        toast(
          isEnglish()
            ? "Post published successfully."
            : "पोस्ट प्रकाशित भयो।",
          "success"
        );
      }
    );

    return true;
  }

  /* =======================================================
     STORY CREATOR
     KSKMediaUI owns the photo/story composer.
  ======================================================= */

  function openStoryCreator() {
    if (MEDIA_UI()?.openStoryCreator) {
      MEDIA_UI().openStoryCreator();
      return true;
    }

    const modal = openModal({
      title: isEnglish() ? "Create Story" : "नयाँ Story",

      content: `
        <form id="kskFallbackStoryForm">

          <textarea
            id="kskFallbackStoryText"
            class="form-textarea"
            rows="4"
            maxlength="1000"
            placeholder="${isEnglish()
              ? "Write your story..."
              : "आफ्नो Story लेख्नुहोस्..."}"
            required></textarea>

        </form>
      `,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${translate("cancel", "रद्द")}
        </button>

        <button
          type="submit"
          form="kskFallbackStoryForm"
          class="btn btn-primary">
          ${isEnglish()
            ? "Publish Story"
            : "Story प्रकाशित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal) return false;

    $("#kskFallbackStoryForm", modal.element)?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const text = $("#kskFallbackStoryText", modal.element)
          ?.value.trim();

        if (!text) return;

        const result = DATA()?.addStory?.({
          author: displayName(),
          authorId: profile().id || "",
          text
        });

        if (!result) {
          toast(
            isEnglish()
              ? "Could not publish story."
              : "Story प्रकाशित गर्न सकिएन।",
            "error"
          );
          return;
        }

        closeModal();
        renderStories();

        toast(
          isEnglish()
            ? "Story published."
            : "Story प्रकाशित भयो।",
          "success"
        );
      }
    );

    return true;
  }

  /*
   * Legacy viewer fallback.
   * Normally KSKMediaUI handles Story clicks.
   */

  function viewStory(id) {
    const stories = DATA()?.getStories?.(true) || [];

    const story = stories.find(
      item => String(item.id) === String(id)
    );

    if (!story) return;

    const content = `
      <div class="story-view-content">

        ${avatarHTML(story.author)}

        <h3>
          ${escapeHTML(story.author || "सदस्य")}
        </h3>

        <p class="post-time">
          ${escapeHTML(formatDate(story.createdAt))}
        </p>

        <div class="post-content">
          ${escapeHTML(story.text || "")}
        </div>

      </div>
    `;

    openModal({
      title: "Story",
      content,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${translate("close", "बन्द गर्नुहोस्")}
        </button>
      `
    });
  }

  /* =======================================================
     POST EDITING
  ======================================================= */

  function editPost(id) {
    const post = DATA()?.getPost?.(id);

    if (!post) return;

    const modal = openModal({
      title: isEnglish() ? "Edit Post" : "पोस्ट सम्पादन",

      content: `
        <form id="kskEditPostForm">

          <textarea
            id="kskEditPostText"
            class="form-textarea"
            rows="5"
            maxlength="10000"
            required>${escapeHTML(post.text || "")}</textarea>

        </form>
      `,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${translate("cancel", "रद्द")}
        </button>

        <button
          type="submit"
          form="kskEditPostForm"
          class="btn btn-primary">
          ${isEnglish()
            ? "Save Changes"
            : "परिवर्तन सुरक्षित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal) return;

    $("#kskEditPostForm", modal.element)?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const text = $("#kskEditPostText", modal.element)
          ?.value.trim();

        if (!text) return;

        const success = DATA()?.updatePost?.(id, { text });

        if (!success) {
          toast(
            isEnglish()
              ? "Could not update post."
              : "पोस्ट परिवर्तन गर्न सकिएन।",
            "error"
          );
          return;
        }

        closeModal();
        refreshCurrentPage();

        toast(
          isEnglish()
            ? "Post updated."
            : "पोस्ट परिवर्तन भयो।",
          "success"
        );
      }
    );
  }

  /* =======================================================
     POST MENU
  ======================================================= */

  function openPostMenu(id) {
    const post = DATA()?.getPost?.(id);

    if (!post) return;

    openModal({
      title: isEnglish() ? "Post options" : "पोस्ट विकल्प",

      content: `
        <div class="post-menu-actions">

          <button
            class="dropdown-item"
            type="button"
            data-edit-post="${escapeHTML(id)}">

            ✏️
            ${isEnglish()
              ? "Edit post"
              : "पोस्ट सम्पादन"}

          </button>

          <button
            class="dropdown-item"
            type="button"
            data-delete-post="${escapeHTML(id)}">

            🗑️
            ${isEnglish()
              ? "Delete post"
              : "पोस्ट मेटाउनुहोस्"}

          </button>

        </div>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${translate("close", "बन्द")}
        </button>
      `
    });
  }

  /* =======================================================
     POST DELETE
  ======================================================= */

  function deletePost(id) {
    const message = isEnglish()
      ? "Are you sure you want to delete this post?"
      : "के तपाईं यो पोस्ट मेटाउन चाहनुहुन्छ?";

    if (!confirmAction(message)) return;

    const success = DATA()?.deletePost?.(id);

    if (!success) {
      toast(
        isEnglish()
          ? "Could not delete post."
          : "पोस्ट मेटाउन सकिएन।",
        "error"
      );
      return;
    }

    closeModal();
    refreshCurrentPage();

    toast(
      isEnglish()
        ? "Post deleted."
        : "पोस्ट मेटाइयो।",
      "success"
    );
  }

  /* =======================================================
     POST LIKE
  ======================================================= */

  function toggleLike(id) {
    const post = DATA()?.getPost?.(id);

    if (!post) return;

    const liked = !Boolean(post.liked);

    const likes = Math.max(
      0,
      Number(post.likes || 0) + (liked ? 1 : -1)
    );

    const success = DATA()?.updatePost?.(id, {
      liked,
      likes
    });

    if (success) {
      refreshCurrentPage();
    }
  }

  /* =======================================================
     SAVE POST
  ======================================================= */

  function toggleSave(id) {
    const result = DATA()?.toggleSavedPost?.(id);

    if (result === false) {
      toast(
        isEnglish()
          ? "Post removed from saved."
          : "सेभबाट हटाइयो।",
        "success"
      );
    } else if (result) {
      toast(
        isEnglish()
          ? "Post saved."
          : "पोस्ट सेभ भयो।",
        "success"
      );
    } else {
      toast(
        isEnglish()
          ? "Could not save post."
          : "पोस्ट सेभ गर्न सकिएन।",
        "error"
      );
    }

    refreshCurrentPage();
  }

  /* =======================================================
     SHARE POST
     KSKShare owns all sharing functionality.
  ======================================================= */

  function sharePost(id) {

    const share = global.KSKShare;

    if (share?.sharePost) {
      share.sharePost(id);
      return;
    }

    toast(
      isEnglish()
        ? "Sharing is temporarily unavailable."
        : "Share सुविधा अहिले उपलब्ध छैन।",
      "warning"
    );
  }

  /* =======================================================
     POST ACTION ROUTER
  ======================================================= */

  function handlePostAction(action, id) {
    if (action === "like") {
      toggleLike(id);
      return;
    }

    if (action === "save") {
      toggleSave(id);
      return;
    }

    if (action === "share") {
      sharePost(id);
      return;
    }

    if (action === "comment") {
      if (COMMENTS()?.open) {
        COMMENTS().open(id);
      } else {
        toast(
          isEnglish()
            ? "Comments are unavailable."
            : "टिप्पणी सुविधा अहिले उपलब्ध छैन।",
          "warning"
        );
      }
    }
  }

  /* =======================================================
     FRIENDS
  ======================================================= */

  function renderFriends() {
    const friends = getFriends();

    const list = friends.length
      ? friends.map(friend => `
          <article class="card friend-card">

            <div class="flex align-center gap-3">

              ${avatarHTML(
                friend.name,
                friend.avatar
              )}

              <div class="flex-column">

                <strong>
                  ${escapeHTML(friend.name || "साथी")}
                </strong>

                <span class="text-muted text-small">
                  ${escapeHTML(friend.location || "")}
                </span>

              </div>

              <button
                class="icon-button"
                type="button"
                data-message-friend="${escapeHTML(friend.id)}"
                aria-label="${isEnglish()
                  ? "Message"
                  : "सन्देश"}">

                💬

              </button>

            </div>

          </article>
        `).join("")
      : `
        <div class="empty-state">

          <div class="empty-state-icon">👥</div>

          <h3 class="empty-state-title">
            ${isEnglish()
              ? "No friends added yet"
              : "अहिलेसम्म साथी थपिएको छैन"}
          </h3>

          <p>
            ${isEnglish()
              ? "Add a friend by entering their name."
              : "नाम लेखेर साथी थप्न सक्नुहुन्छ।"}
          </p>

        </div>
      `;

    return `
      <section class="page-section">

        <div class="flex-between">

          <h3 class="section-title">
            ${isEnglish()
              ? "My Friends"
              : "मेरा साथीहरू"}
          </h3>

          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-add-friend-open>

            +
            ${isEnglish()
              ? "Add Friend"
              : "साथी थप्नुहोस्"}

          </button>

        </div>

        <div class="friends-list">
          ${list}
        </div>

      </section>
    `;
  }

  /* =======================================================
     ADD FRIEND
  ======================================================= */

  function openAddFriend() {
    const modal = openModal({
      title: isEnglish()
        ? "Add Friend"
        : "साथी थप्नुहोस्",

      content: `
        <form id="kskAddFriendForm">

          <label
            class="form-label"
            for="kskFriendName">

            ${isEnglish()
              ? "Friend's name"
              : "साथीको नाम"}

          </label>

          <input
            id="kskFriendName"
            class="form-input"
            maxlength="60"
            placeholder="${isEnglish()
              ? "Enter friend's name"
              : "साथीको नाम लेख्नुहोस्"}"
            required>

        </form>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${translate("cancel", "रद्द")}
        </button>

        <button
          class="btn btn-primary"
          type="submit"
          form="kskAddFriendForm">
          ${translate("addFriend", "साथी थप्नुहोस्")}
        </button>
      `
    });

    if (!modal) return;

    $("#kskFriendName", modal.element)?.focus();

    $("#kskAddFriendForm", modal.element)?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const name = $("#kskFriendName", modal.element)
          ?.value.trim();

        if (!name) return;

        const friend = DATA()?.addFriend?.({ name });

        if (!friend) {
          toast(
            isEnglish()
              ? "Friend already exists or could not be added."
              : "यो साथी पहिल्यै छ वा थप्न सकिएन।",
            "warning"
          );
          return;
        }

        closeModal();
        refreshCurrentPage();

        toast(
          isEnglish()
            ? "Friend added."
            : "साथी थपियो।",
          "success"
        );
      }
    );
  }

  /* =======================================================
     MESSAGES — CHAT LIST
  ======================================================= */

  function renderMessages() {
    const chats = getChats();

    if (activeChatId) {
      return renderChat(activeChatId);
    }

    if (!chats.length) {
      return `
        <section>

          <div class="empty-state">

            <div class="empty-state-icon">💬</div>

            <h3 class="empty-state-title">
              ${isEnglish()
                ? "No conversations yet"
                : "अहिलेसम्म सन्देश छैन"}
            </h3>

            <p>
              ${isEnglish()
                ? "Add friends to start a conversation."
                : "कुरा सुरु गर्न साथी थप्नुहोस्।"}
            </p>

          </div>

        </section>
      `;
    }

    return `
      <section>

        <h3 class="section-title">
          ${isEnglish()
            ? "Messages"
            : "सन्देशहरू"}
        </h3>

        <div class="chat-list">

          ${chats.map(chat => {
            const last = chat.messages?.[
              chat.messages.length - 1
            ];

            return `
              <button
                class="card chat-item"
                type="button"
                data-open-chat="${escapeHTML(chat.id)}">

                <div class="flex align-center gap-3">

                  ${avatarHTML(
                    chat.name,
                    chat.avatar
                  )}

                  <div class="flex-column">

                    <strong>
                      ${escapeHTML(chat.name || "साथी")}
                    </strong>

                    <span class="text-muted text-small">
                      ${escapeHTML(last?.text || "")}
                    </span>

                  </div>

                </div>

              </button>
            `;
          }).join("")}

        </div>

      </section>
    `;
  }

  /* =======================================================
     CHAT VIEW
  ======================================================= */

  function renderChat(chatId) {
    const chat = getChats().find(
      item => String(item.id) === String(chatId)
    );

    if (!chat) {
      activeChatId = null;
      return renderMessages();
    }

    const messages = chat.messages || [];

    return `
      <section class="chat-view">

        <div class="chat-heading flex align-center gap-3">

          <button
            class="btn btn-secondary btn-sm"
            type="button"
            data-back-messages>
            ←
          </button>

          ${avatarHTML(
            chat.name,
            chat.avatar
          )}

          <strong>
            ${escapeHTML(chat.name || "साथी")}
          </strong>

        </div>

        <div class="chat-messages">

          ${
            messages.length
              ? messages.map(message => `
                  <div class="chat-message ${
                    message.fromMe
                      ? "chat-message-mine"
                      : ""
                  }">

                    <p>
                      ${escapeHTML(message.text || "")}
                    </p>

                    <small class="post-time">
                      ${escapeHTML(formatTime(
                        message.time || message.createdAt
                      ))}
                    </small>

                  </div>
                `).join("")
              : `
                  <div class="empty-state">
                    ${isEnglish()
                      ? "Start the conversation."
                      : "कुराकानी सुरु गर्नुहोस्।"}
                  </div>
                `
          }

        </div>

        <form
          id="kskMessageForm"
          class="chat-form">

          <input
            id="kskMessageInput"
            class="form-input"
            maxlength="2000"
            placeholder="${isEnglish()
              ? "Write a message..."
              : "सन्देश लेख्नुहोस्..."}"
            required>

          <button
            class="btn btn-primary"
            type="submit">

            ${isEnglish()
              ? "Send"
              : "पठाउनुहोस्"}

          </button>

        </form>

      </section>
    `;
  }

  /* =======================================================
     OPEN FRIEND CHAT
  ======================================================= */

  function openFriendChat(friendId) {
    const friend = getFriends().find(
      item => String(item.id) === String(friendId)
    );

    if (!friend) return;

    const chatId = DATA()?.createChat?.(friend);

    if (!chatId) {
      toast(
        isEnglish()
          ? "Could not open conversation."
          : "कुराकानी खोल्न सकिएन।",
        "error"
      );
      return;
    }

    activeChatId = chatId;
    navigate("messages", { keepChat: true });
  }

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  function sendChatMessage(event) {
    event.preventDefault();

    if (!activeChatId) return;

    const input = $("#kskMessageInput");
    const text = input?.value.trim();

    if (!text) return;

    const result = DATA()?.sendMessage?.(
      activeChatId,
      text,
      {
        sender: displayName(),
        fromMe: true
      }
    );

    if (!result) {
      toast(
        isEnglish()
          ? "Message could not be sent."
          : "सन्देश पठाउन सकिएन।",
        "error"
      );
      return;
    }

    refreshCurrentPage();
    $("#kskMessageInput")?.focus();
  }

  /* =======================================================
     PROFILE — DISPLAY ONLY
     Avatar/Cover and editing belong to Profile Media UI.
  ======================================================= */

  function renderProfile() {
    const user = profile();

    const userName = String(user.name || "").trim();
    const userId = String(user.id || "");

    const posts = getPosts().filter(post => {
      if (
        userId &&
        post.authorId &&
        String(post.authorId) === userId
      ) {
        return true;
      }

      const author = String(post.author || "").trim();

      return author === userName ||
        author === displayName();
    });

    return `
      <section class="profile-section">

        <div class="card profile-card">

          <div class="profile-avatar">
            ${avatarHTML(
              user.name,
              user.avatar,
              "avatar-xl"
            )}
          </div>

          <h2 class="text-center">
            ${escapeHTML(user.name || (
              isEnglish()
                ? "Your Profile"
                : "तपाईंको प्रोफाइल"
            ))}
          </h2>

          ${
            user.bio
              ? `<p class="text-center">${escapeHTML(user.bio)}</p>`
              : ""
          }

          ${
            user.location
              ? `
                <p class="text-center text-muted">
                  📍 ${escapeHTML(user.location)}
                </p>
              `
              : ""
          }

          <div class="text-center">

            <span class="badge badge-primary">
              ${posts.length}
              ${isEnglish()
                ? "Posts"
                : "पोस्ट"}
            </span>

          </div>

          <div
            class="flex-center"
            style="margin-top:16px">

            <button
              class="btn btn-primary"
              type="button"
              data-edit-profile>

              ✏️
              ${isEnglish()
                ? "Edit Profile"
                : "प्रोफाइल सम्पादन"}

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

          ${
            posts.length
              ? posts.map(renderPost).join("")
              : `
                <div class="empty-state">
                  ${isEnglish()
                    ? "You have not published any posts."
                    : "तपाईंले अहिलेसम्म पोस्ट गर्नुभएको छैन।"}
                </div>
              `
          }

        </div>

        <div
          class="flex-center"
          style="margin-top:18px">

          <button
            class="btn btn-secondary"
            type="button"
            data-open-settings>

            ⚙️
            ${isEnglish()
              ? "Settings"
              : "सेटिङ"}

          </button>

        </div>

      </section>
    `;
  }

  /*
   * Profile editing is delegated to KSKProfileMediaUI.
   * This fallback is only for safe operation if that module
   * is temporarily unavailable.
   */

  function openProfileEditor() {
    if (PROFILE_MEDIA()?.openEditor) {
      PROFILE_MEDIA().openEditor();
      return true;
    }

    toast(
      isEnglish()
        ? "Profile editor is unavailable."
        : "प्रोफाइल सम्पादन सुविधा उपलब्ध छैन।",
      "warning"
    );

    return false;
  }

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  function renderNotifications() {
    const notifications =
      DATA()?.getNotifications?.() || [];

    if (!notifications.length) {
      return `
        <div class="empty-state">

          <div class="empty-state-icon">🔔</div>

          <h3 class="empty-state-title">
            ${isEnglish()
              ? "No notifications"
              : "अहिले कुनै सूचना छैन"}
          </h3>

        </div>
      `;
    }

    return `
      <section>

        <h3 class="section-title">
          ${isEnglish()
            ? "Notifications"
            : "सूचनाहरू"}
        </h3>

        ${notifications.map(item => `
          <article class="card notification-item">

            <p>
              ${escapeHTML(item.text || "")}
            </p>

            <small class="post-time">
              ${escapeHTML(formatDate(item.createdAt))}
            </small>

          </article>
        `).join("")}

      </section>
    `;
  }

  /* =======================================================
     SAVED POSTS
  ======================================================= */

  function renderSaved() {
    const ids = DATA()?.getSavedPosts?.() || [];

    const posts = ids
      .map(id => DATA()?.getPost?.(id))
      .filter(Boolean);

    return `
      <section>

        <h3 class="section-title">
          ${isEnglish()
            ? "Saved Posts"
            : "सेभ गरिएका पोस्ट"}
        </h3>

        ${
          posts.length
            ? posts.map(renderPost).join("")
            : `
              <div class="empty-state">

                <div class="empty-state-icon">🔖</div>

                <p>
                  ${isEnglish()
                    ? "No saved posts yet."
                    : "अहिलेसम्म पोस्ट सेभ गरिएको छैन।"}
                </p>

              </div>
            `
        }

      </section>
    `;
  }

  /* =======================================================
     SETTINGS — SINGLE SETTINGS UI
  ======================================================= */

  function openSettings() {
    const settingsUI = SETTINGS_UI();

    if (!settingsUI?.open) {
      toast(
        isEnglish()
          ? "Settings are not ready. Please reload the app."
          : "सेटिङ तयार भएको छैन। कृपया एप पुनः खोल्नुहोस्।",
        "error"
      );

      return false;
    }

    return settingsUI.open();
  }

  function closeSettings() {
    if (SETTINGS_UI()?.close) {
      SETTINGS_UI().close();
      return;
    }

    els.settingsModal?.classList.add("hidden");

    els.settingsModal?.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  function applySettingsTheme() {
    const settings = SETTINGS()?.getSettings?.();

    if (!settings?.theme) return;

    const selected = settings.theme === "dark"
      ? "dark"
      : "light";

    const current =
      document.documentElement.dataset.theme || "light";

    if (current !== selected) {
      THEME()?.applyTheme?.(selected, false);
    }
  }

  function changeLanguage(value) {
    const selected = value === "en" ? "en" : "ne";

    LANG()?.setLanguage?.(selected);

    refreshCurrentPage();

    toast(
      selected === "en"
        ? "Language updated."
        : "भाषा परिवर्तन भयो।",
      "success"
    );
  }

  /* =======================================================
     NAVIGATION
     KSKNavigation owns shared page state and active menu.
  ======================================================= */

  function navigate(page, options = {}) {
    if (!NAV()?.isValidPage?.(page)) {
      toast(
        isEnglish()
          ? "This page is unavailable."
          : "यो पृष्ठ उपलब्ध छैन।",
        "warning"
      );

      return false;
    }

    if (page === "create") {
      return openPostComposer();
    }

    if (page === "settings") {
      return openSettings();
    }

    if (typeof NAV()?.navigate === "function") {
      return NAV().navigate(page, options);
    }

    /*
     * Safe fallback for environments where navigation
     * module is unavailable.
     */

    handleNavigation({
      detail: {
        page,
        options
      }
    });

    return true;
  }

  function handleNavigation(event) {
    const page = event.detail?.page;

    if (!page) return;

    if (page === "settings") {
      openSettings();
      return;
    }

    if (page === "create") {
      openPostComposer();
      return;
    }

    if (!NAV()?.isValidPage?.(page)) {
      return;
    }

    currentPage = page;

    const options = event.detail?.options || {};

    if (page !== "messages" || !options.keepChat) {
      activeChatId = null;
    }

    refreshNavigation();
    refreshCurrentPage();
  }

  /* =======================================================
     PAGE RENDER ROUTER
  ======================================================= */

  function refreshCurrentPage() {
    if (
      currentPage === "home" ||
      currentPage === "posts"
    ) {
      currentPage = "home";

      showHomeLayout();

      renderStories();
      renderFeed();

      return;
    }

    showOtherLayout();

    const pages = {
      friends: {
        title: isEnglish()
          ? "Friends"
          : "साथीहरू",
        render: renderFriends
      },

      messages: {
        title: isEnglish()
          ? "Messages"
          : "सन्देशहरू",
        render: renderMessages
      },

      profile: {
        title: isEnglish()
          ? "Profile"
          : "प्रोफाइल",
        render: renderProfile
      },

      notifications: {
        title: isEnglish()
          ? "Notifications"
          : "सूचनाहरू",
        render: renderNotifications
      },

      saved: {
        title: isEnglish()
          ? "Saved Posts"
          : "सेभ गरिएका पोस्ट",
        render: renderSaved
      }
    };

    const selected = pages[currentPage];

    if (!selected) {
      setPageTitle(
        isEnglish()
          ? "Page unavailable"
          : "पृष्ठ उपलब्ध छैन"
      );

      setPageContent(`
        <div class="empty-state">
          ${isEnglish()
            ? "This page is not available."
            : "यो पृष्ठ उपलब्ध छैन।"}
        </div>
      `);

      return;
    }

    setPageTitle(selected.title);
    setPageContent(selected.render());

    /*
     * Feature modules refresh their own media.
     */

    MEDIA_UI()?.refresh?.();
    PROFILE_MEDIA()?.refresh?.();
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  function toggleSearch() {
    if (!els.searchPanel) return;

    els.searchPanel.classList.toggle("hidden");

    if (!els.searchPanel.classList.contains("hidden")) {
      els.searchInput?.focus();
      return;
    }

    searchQuery = "";

    if (els.searchInput) {
      els.searchInput.value = "";
    }

    renderFeed();
  }

  function search(value) {
    searchQuery = String(value || "").trim();

    STATE()?.setSearchQuery?.(searchQuery);

    if (currentPage !== "home") {
      navigate("home");
    } else {
      renderFeed();
    }
  }

  /* =======================================================
     GLOBAL CLICK EVENTS
  ======================================================= */

  function bindGlobalClickEvents() {
    document.addEventListener("click", event => {
      const target = event.target;

      if (!target?.closest) return;

      /*
       * Media UI and Profile Media UI use capture phase.
       * Their controls are intercepted before this handler.
       */

      const createStory = target.closest(
        "[data-story-create]"
      );

      if (createStory) {
        openStoryCreator();
        return;
      }

      const viewStoryButton = target.closest(
        "[data-story-view]"
      );

      if (viewStoryButton) {
        viewStory(viewStoryButton.dataset.storyView);
        return;
      }

      const postMenu = target.closest("[data-post-menu]");

      if (postMenu) {
        openPostMenu(postMenu.dataset.postMenu);
        return;
      }

      const postAction = target.closest(
        "[data-post-action]"
      );

      if (postAction) {
        handlePostAction(
          postAction.dataset.postAction,
          postAction.dataset.postId
        );

        return;
      }

      const editPostButton = target.closest(
        "[data-edit-post]"
      );

      if (editPostButton) {
        const id = editPostButton.dataset.editPost;

        closeModal();
        editPost(id);

        return;
      }

      const deletePostButton = target.closest(
        "[data-delete-post]"
      );

      if (deletePostButton) {
        deletePost(deletePostButton.dataset.deletePost);
        return;
      }

      if (target.closest("[data-add-friend-open]")) {
        openAddFriend();
        return;
      }

      const messageFriend = target.closest(
        "[data-message-friend]"
      );

      if (messageFriend) {
        openFriendChat(
          messageFriend.dataset.messageFriend
        );

        return;
      }

      const openChat = target.closest("[data-open-chat]");

      if (openChat) {
        activeChatId = openChat.dataset.openChat;
        refreshCurrentPage();
        return;
      }

      if (target.closest("[data-back-messages]")) {
        activeChatId = null;
        refreshCurrentPage();
        return;
      }

      if (target.closest("[data-edit-profile]")) {
        openProfileEditor();
        return;
      }

      if (target.closest("[data-open-settings]")) {
        openSettings();
      }
    });
  }

  /* =======================================================
     DATA CHANGE HANDLING
  ======================================================= */

  function shouldRefreshForCollection(collection) {
    const name = String(collection || "").toLowerCase();

    return [
      "posts",
      "stories",
      "friends",
      "messages",
      "chats",
      "profile",
      "saved",
      "notifications"
    ].some(part => name.includes(part));
  }

  function handleDataChange(event) {
    const collection = event.detail?.collection || "";

    if (!shouldRefreshForCollection(collection)) {
      return;
    }

    /*
     * Data Layer is the source of truth.
     * Refresh the currently visible page.
     */

    refreshCurrentPage();

    /*
     * Stories can change while another page is visible.
     */

    if (String(collection).toLowerCase().includes("stories")) {
      renderStories();
    }

    /*
     * Feature modules manage their own media rendering.
     */

    MEDIA_UI()?.refresh?.();
    PROFILE_MEDIA()?.refresh?.();
  }

  /* =======================================================
     EVENT BINDING
  ======================================================= */

  function bindEvents() {
    /*
     * Navigation module handles data-page clicks.
     */

    NAV()?.initializeNavigation?.(document);

    global.addEventListener(
      "ksk:navigate",
      handleNavigation
    );

    /*
     * Composer event is routed to the media feature.
     */

    global.addEventListener(
      "ksk:open-composer",
      openPostComposer
    );

    global.addEventListener(
      "ksk:language-change",
      () => {
        refreshCurrentPage();
        renderStories();
      }
    );

    global.addEventListener(
      "ksk:theme-change",
      () => {
        // KSKTheme owns theme presentation.
      }
    );

    global.addEventListener(
      "ksk:settings-change",
      event => {
        const changedSettings = event.detail?.settings;

        if (changedSettings?.theme) {
          applySettingsTheme();
        }

        document.body.classList.toggle(
          "ksk-compact-mode",
          Boolean(changedSettings?.compactMode)
        );
      }
    );

    global.addEventListener(
      "ksk:data-change",
      handleDataChange
    );

    /*
     * Media UI captures these composer controls first.
     * These listeners are only safe fallbacks.
     */

    els.openComposer?.addEventListener(
      "click",
      event => {
        if (MEDIA_UI()?.openPostComposer) return;

        event.preventDefault();
        openPostComposer();
      }
    );

    els.quickText?.addEventListener(
      "click",
      event => {
        if (MEDIA_UI()?.openPostComposer) return;

        event.preventDefault();
        openPostComposer();
      }
    );

    els.quickPhoto?.addEventListener(
      "click",
      event => {
        event.preventDefault();
        openPostComposer();
      }
    );

    els.quickVideo?.addEventListener(
      "click",
      () => {
        toast(
          isEnglish()
            ? "Video sharing is not available yet."
            : "भिडियो सुविधा अहिले उपलब्ध छैन।",
          "info"
        );
      }
    );

    els.searchToggle?.addEventListener(
      "click",
      toggleSearch
    );

    els.searchInput?.addEventListener(
      "input",
      event => {
        search(event.target.value);
      }
    );

    els.notificationsToggle?.addEventListener(
      "click",
      () => {
        DATA()?.markNotificationsRead?.();
        navigate("notifications");
      }
    );

    els.closeSettings?.addEventListener(
      "click",
      closeSettings
    );

    els.settingsModal?.addEventListener(
      "click",
      event => {
        if (event.target === els.settingsModal) {
          closeSettings();
        }
      }
    );

    document.addEventListener(
      "submit",
      event => {
        if (event.target.id === "kskMessageForm") {
          sendChatMessage(event);
        }
      }
    );

    bindGlobalClickEvents();
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return;

    initialized = true;

    cacheElements();

    /*
     * Initialize shared systems.
     */

    DATA()?.initialize?.();
    SETTINGS()?.initialize?.();
    THEME()?.initializeTheme?.();
    LANG()?.initialize?.();
    SETTINGS_UI()?.initialize?.();

    /*
     * Restore saved appearance settings.
     */

    applySettingsTheme();

    const savedSettings = SETTINGS()?.getSettings?.();

    document.body.classList.toggle(
      "ksk-compact-mode",
      Boolean(savedSettings?.compactMode)
    );

    /*
     * Restore shared page state.
     */

    currentPage =
      STATE()?.getState?.()?.currentPage || "home";

    if (
      currentPage === "create" ||
      currentPage === "settings"
    ) {
      currentPage = "home";
    }

    /*
     * Bind application events after shared systems
     * have been initialized.
     */

    bindEvents();

    /*
     * Initial page render.
     */

    renderStories();
    renderFeed();

    refreshNavigation();
    refreshCurrentPage();

    /*
     * Feature modules initialize themselves.
     * Their own initialization guards prevent duplicates.
     */

    MEDIA_UI()?.initialize?.();
    PROFILE_MEDIA()?.initialize?.();

    console.info(
      "KSK application initialized successfully."
    );
  }

  /* =======================================================
     PUBLIC APPLICATION API
  ======================================================= */

  global.KSKApp = Object.freeze({

    initialize,

    navigate,

    refreshCurrentPage,

    openPostComposer,

    openStoryCreator,

    openSettings,

    closeSettings,

    renderFeed,

    renderStories,

    getCurrentPage() {
      return currentPage;
    },

    getPosts,

    getStories,

    getFriends,

    getChats,

    getProfile: profile,

    search,

    refresh() {
      renderStories();
      refreshCurrentPage();

      MEDIA_UI()?.refresh?.();
      PROFILE_MEDIA()?.refresh?.();
    }

  });

  /* =======================================================
     START APPLICATION
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
