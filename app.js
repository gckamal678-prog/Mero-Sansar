
"use strict";

/* =========================================================
   KSK — MAIN APPLICATION CONTROLLER
   Single Data Layer Architecture

   DATA         : KSKData
   STATE        : KSKState
   SETTINGS     : KSKSettings
   SETTINGS UI  : KSKSettingsUI
   THEME        : KSKTheme
   LANGUAGE     : KSKLanguage
   NAVIGATION   : KSKNavigation
   MODAL        : KSKModal
   TOAST        : KSKToast
========================================================= */

(function (global) {
  if (global.KSKApp) return;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const DATA = () => global.KSKData;
  const STATE = () => global.KSKState;
  const SETTINGS = () => global.KSKSettings;
  const SETTINGS_UI = () => global.KSKSettingsUI;
  const MODAL = () => global.KSKModal;
  const TOAST = () => global.KSKToast;
  const LANG = () => global.KSKLanguage;
  const THEME = () => global.KSKTheme;
  const NAV = () => global.KSKNavigation;

  let currentPage = "home";
  let activeChatId = null;
  let searchQuery = "";
  let initialized = false;

  const els = {};

  /* =========================================================
     ELEMENT CACHE
  ========================================================= */

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

  /* =========================================================
     HELPERS
  ========================================================= */

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

    if (Number.isNaN(date.getTime())) return "";

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

    if (Number.isNaN(date.getTime())) return "";

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
      name: "",
      bio: "",
      location: "",
      avatar: "",
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

  function avatarHTML(name, avatar = "", size = "") {
    const content = avatar
      ? `<img src="${escapeHTML(avatar)}" alt="">`
      : escapeHTML(initial(name));

    return `
      <div class="avatar ${size}">
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

  /* =========================================================
     PAGE LAYOUT
  ========================================================= */

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

  function refreshNavigation(page = currentPage) {
    NAV()?.refreshNavigation?.();

    $$(".nav-item").forEach(button => {
      const active = button.dataset.page === page;

      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  /* =========================================================
     STORIES
  ========================================================= */

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
        data-story-create>

        <span class="story-avatar">＋</span>
        <span class="story-name">${addLabel}</span>

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
  }

  function openStoryCreator() {
    const content = `
      <form id="kskStoryForm">

        <label class="form-label" for="kskStoryText">
          ${isEnglish()
            ? "Write your story"
            : "आफ्नो Story लेख्नुहोस्"}
        </label>

        <textarea
          id="kskStoryText"
          class="form-textarea"
          rows="4"
          maxlength="1000"
          placeholder="${isEnglish()
            ? "Share something..."
            : "केही कुरा साझा गर्नुहोस्..."}"
          required></textarea>

      </form>
    `;

    const modal = openModal({
      title: isEnglish() ? "Create Story" : "नयाँ Story",

      content,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${translate("cancel", "रद्द")}
        </button>

        <button
          type="submit"
          form="kskStoryForm"
          class="btn btn-primary">
          ${isEnglish()
            ? "Publish Story"
            : "Story प्रकाशित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal) return;

    $("#kskStoryText", modal.element)?.focus();

    $("#kskStoryForm", modal.element)?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const text = $("#kskStoryText", modal.element)
          ?.value.trim();

        if (!text) return;

        const result = DATA()?.addStory?.({
          author: displayName(),
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
  }

  function viewStory(id) {
    const story = getStories().find(
      item => String(item.id) === String(id)
    );

    if (!story) return;

    const content = `
      <div class="story-view-content">

        ${avatarHTML(story.author)}

        <h3>${escapeHTML(story.author || "सदस्य")}</h3>

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

  /* =========================================================
     POSTS
  ========================================================= */

  function renderPost(post) {
    const id = escapeHTML(post.id);
    const author = escapeHTML(post.author || "सदस्य");
    const text = escapeHTML(post.text || "");
    const date = escapeHTML(formatDate(post.createdAt));

    const liked = Boolean(post.liked);
    const likes = Number(post.likes || 0);

    const saved = (DATA()?.getSavedPosts?.() || [])
      .some(item => String(item) === String(post.id));

    return `
      <article
        class="post-card"
        data-post-id="${id}">

        <header class="post-header">

          ${avatarHTML(author)}

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

        ${text
          ? `<div class="post-content">${text}</div>`
          : ""
        }

        <footer class="post-actions">

          <button
            class="post-action ${liked ? "is-active" : ""}"
            type="button"
            data-post-action="like"
            data-post-id="${id}">

            ${liked ? "❤️" : "♡"}
            ${likes}

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="comment"
            data-post-id="${id}">

            💬 ${isEnglish() ? "Comment" : "टिप्पणी"}

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

            ↗ ${isEnglish() ? "Share" : "साझा"}

          </button>

        </footer>

      </article>
    `;
  }

  function renderFeed() {
    if (!els.feedList) return;

    const posts = getPosts();

    const filtered = posts.filter(post => {
      const text = [
        post.author || "",
        post.text || ""
      ].join(" ").toLowerCase();

      return text.includes(searchQuery.toLowerCase());
    });

    els.feedList.innerHTML = filtered
      .map(renderPost)
      .join("");

    els.emptyFeed?.classList.toggle(
      "hidden",
      filtered.length > 0
    );
  }

  function openPostComposer() {
    const content = `
      <form id="kskPostForm">

        <textarea
          id="kskPostText"
          class="form-textarea"
          rows="5"
          maxlength="10000"
          placeholder="${isEnglish()
            ? "What is on your mind?"
            : "के सोच्दै हुनुहुन्छ?"}"
          required></textarea>

      </form>
    `;

    const modal = openModal({
      title: isEnglish() ? "Create Post" : "नयाँ पोस्ट",

      content,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${translate("cancel", "रद्द")}
        </button>

        <button
          type="submit"
          form="kskPostForm"
          class="btn btn-primary">
          ${translate("publish", "प्रकाशित गर्नुहोस्")}
        </button>
      `
    });

    if (!modal) return;

    $("#kskPostText", modal.element)?.focus();

    $("#kskPostForm", modal.element)?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const text = $("#kskPostText", modal.element)
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
        renderFeed();

        toast(
          isEnglish()
            ? "Post published successfully."
            : "पोस्ट प्रकाशित भयो।",
          "success"
        );
      }
    );
  }

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
          isEnglish() ? "Post updated." : "पोस्ट परिवर्तन भयो।",
          "success"
        );
      }
    );
  }

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
            ✏️ ${isEnglish()
              ? "Edit post"
              : "पोस्ट सम्पादन"}
          </button>

          <button
            class="dropdown-item"
            type="button"
            data-delete-post="${escapeHTML(id)}">
            🗑️ ${isEnglish()
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
      isEnglish() ? "Post deleted." : "पोस्ट मेटाइयो।",
      "success"
    );
  }

  function toggleLike(id) {
    const post = DATA()?.getPost?.(id);

    if (!post) return;

    const liked = !post.liked;

    const likes = Math.max(
      0,
      Number(post.likes || 0) + (liked ? 1 : -1)
    );

    DATA()?.updatePost?.(id, {
      liked,
      likes
    });

    renderFeed();

    if (currentPage === "profile") {
      refreshCurrentPage();
    }
  }

  function toggleSave(id) {
    const result = DATA()?.toggleSavedPost?.(id);

    if (result === false) {
      toast(
        isEnglish()
          ? "Post removed from saved."
          : "सेभबाट हटाइयो।",
        "success"
      );
    } else {
      toast(
        isEnglish()
          ? "Post saved."
          : "पोस्ट सेभ भयो।",
        "success"
      );
    }

    refreshCurrentPage();
  }

  async function sharePost(id) {
    const post = DATA()?.getPost?.(id);

    if (!post) return;

    const text = `${post.author || ""}\n${post.text || ""}`.trim();

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);

        toast(
          isEnglish() ? "Post copied." : "पोस्ट कपी भयो।",
          "success"
        );
      } else {
        toast(
          isEnglish()
            ? "Sharing is unavailable."
            : "साझा गर्ने सुविधा उपलब्ध छैन।",
          "warning"
        );
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        toast(
          isEnglish()
            ? "Could not share post."
            : "पोस्ट साझा गर्न सकिएन।",
          "error"
        );
      }
    }
  }

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
      if (global.KSKComments?.open) {
        global.KSKComments.open(id);
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

  /* =========================================================
     FRIENDS
  ========================================================= */

  function renderFriends() {
    const friends = getFriends();

    const list = friends.length
      ? friends.map(friend => `
          <article class="card friend-card">

            <div class="flex align-center gap-3">

              ${avatarHTML(friend.name, friend.avatar)}

              <div class="flex-column">
                <strong>${escapeHTML(friend.name)}</strong>

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
            ${isEnglish() ? "My Friends" : "मेरा साथीहरू"}
          </h3>

          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-add-friend-open>
            + ${isEnglish()
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

  function openAddFriend() {
    const modal = openModal({
      title: isEnglish() ? "Add Friend" : "साथी थप्नुहोस्",

      content: `
        <form id="kskAddFriendForm">

          <label class="form-label" for="kskFriendName">
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
          isEnglish() ? "Friend added." : "साथी थपियो।",
          "success"
        );
      }
    );
  }

  /* =========================================================
     MESSAGES
  ========================================================= */

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
          ${isEnglish() ? "Messages" : "सन्देशहरू"}
        </h3>

        <div class="chat-list">

          ${chats.map(chat => {
            const last = chat.messages?.at(-1);

            return `
              <button
                class="card chat-item"
                type="button"
                data-open-chat="${escapeHTML(chat.id)}">

                <div class="flex align-center gap-3">

                  ${avatarHTML(chat.name, chat.avatar)}

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

          ${avatarHTML(chat.name, chat.avatar)}

          <strong>
            ${escapeHTML(chat.name || "साथी")}
          </strong>

        </div>

        <div class="chat-messages">

          ${messages.length
            ? messages.map(message => `
                <div class="chat-message ${
                  message.fromMe ? "chat-message-mine" : ""
                }">

                  <p>${escapeHTML(message.text || "")}</p>

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

        <form id="kskMessageForm" class="chat-form">

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
            ${isEnglish() ? "Send" : "पठाउनुहोस्"}
          </button>

        </form>

      </section>
    `;
  }

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

  /* =========================================================
     PROFILE
  ========================================================= */

  function renderProfile() {
    const user = profile();

    const posts = getPosts().filter(post => {
      return post.author === user.name;
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

          ${user.bio
            ? `<p class="text-center">${escapeHTML(user.bio)}</p>`
            : ""
          }

          ${user.location
            ? `<p class="text-center text-muted">
                📍 ${escapeHTML(user.location)}
              </p>`
            : ""
          }

          <div class="text-center">
            <span class="badge badge-primary">
              ${posts.length}
              ${isEnglish() ? "Posts" : "पोस्ट"}
            </span>
          </div>

          <div class="flex-center" style="margin-top:16px">

            <button
              class="btn btn-primary"
              type="button"
              data-edit-profile>
              ✏️ ${isEnglish()
                ? "Edit Profile"
                : "प्रोफाइल सम्पादन"}
            </button>

          </div>

        </div>

        <h3 class="section-title" style="margin-top:20px">
          ${isEnglish() ? "My Posts" : "मेरा पोस्टहरू"}
        </h3>

        <div class="profile-posts">

          ${posts.length
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

        <div class="flex-center" style="margin-top:18px">

          <button
            class="btn btn-secondary"
            type="button"
            data-open-settings>
            ⚙️ ${isEnglish() ? "Settings" : "सेटिङ"}
          </button>

        </div>

      </section>
    `;
  }

  function openProfileEditor() {
    const user = profile();

    const modal = openModal({
      title: isEnglish()
        ? "Edit Profile"
        : "प्रोफाइल सम्पादन",

      content: `
        <form id="kskProfileForm">

          <div class="form-group">

            <label class="form-label" for="kskProfileName">
              ${isEnglish() ? "Name" : "नाम"}
            </label>

            <input
              id="kskProfileName"
              class="form-input"
              maxlength="60"
              value="${escapeHTML(user.name || "")}">

          </div>

          <div class="form-group">

            <label class="form-label" for="kskProfileBio">
              ${isEnglish() ? "About me" : "मेरो परिचय"}
            </label>

            <textarea
              id="kskProfileBio"
              class="form-textarea"
              maxlength="240"
              rows="3">${escapeHTML(user.bio || "")}</textarea>

          </div>

          <div class="form-group">

            <label class="form-label" for="kskProfileLocation">
              ${isEnglish() ? "Location" : "ठेगाना"}
            </label>

            <input
              id="kskProfileLocation"
              class="form-input"
              maxlength="100"
              value="${escapeHTML(user.location || "")}">

          </div>

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
          form="kskProfileForm">
          ${isEnglish()
            ? "Save Profile"
            : "सुरक्षित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal) return;

    $("#kskProfileForm", modal.element)?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const updated = DATA()?.saveProfile?.({
          name: $("#kskProfileName", modal.element)
            ?.value.trim() || "",

          bio: $("#kskProfileBio", modal.element)
            ?.value.trim() || "",

          location: $("#kskProfileLocation", modal.element)
            ?.value.trim() || ""
        });

        if (!updated) {
          toast(
            isEnglish()
              ? "Profile could not be saved."
              : "प्रोफाइल सुरक्षित गर्न सकिएन।",
            "error"
          );
          return;
        }

        closeModal();
        refreshCurrentPage();

        toast(
          isEnglish()
            ? "Profile saved."
            : "प्रोफाइल सुरक्षित भयो।",
          "success"
        );
      }
    );
  }

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

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
          ${isEnglish() ? "Notifications" : "सूचनाहरू"}
        </h3>

        ${notifications.map(item => `
          <article class="card notification-item">

            <p>${escapeHTML(item.text)}</p>

            <small class="post-time">
              ${escapeHTML(formatDate(item.createdAt))}
            </small>

          </article>
        `).join("")}

      </section>
    `;
  }

  /* =========================================================
     SAVED POSTS
  ========================================================= */

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

        ${posts.length
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

  /* =========================================================
     SETTINGS — SINGLE SETTINGS UI CONTROLLER
  ========================================================= */

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
    els.settingsModal?.setAttribute("aria-hidden", "true");
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

  /* =========================================================
     NAVIGATION
  ========================================================= */

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
      openPostComposer();
      return true;
    }

    if (page === "settings") {
      openSettings();
      return true;
    }

    currentPage = page;

    if (page !== "messages" || !options.keepChat) {
      activeChatId = null;
    }

    STATE()?.setCurrentPage?.(page);

    refreshNavigation(page);
    refreshCurrentPage();

    return true;
  }

  function refreshCurrentPage() {
    if (currentPage === "home" || currentPage === "posts") {
      currentPage = "home";

      showHomeLayout();
      renderStories();
      renderFeed();

      return;
    }

    showOtherLayout();

    const pages = {
      friends: {
        title: isEnglish() ? "Friends" : "साथीहरू",
        html: renderFriends
      },

      messages: {
        title: isEnglish() ? "Messages" : "सन्देशहरू",
        html: renderMessages
      },

      profile: {
        title: isEnglish() ? "Profile" : "प्रोफाइल",
        html: renderProfile
      },

      notifications: {
        title: isEnglish() ? "Notifications" : "सूचनाहरू",
        html: renderNotifications
      },

      saved: {
        title: isEnglish() ? "Saved Posts" : "सेभ गरिएका पोस्ट",
        html: renderSaved
      }
    };

    const selected = pages[currentPage];

    if (!selected) {
      setPageTitle(
        isEnglish() ? "Page unavailable" : "पृष्ठ उपलब्ध छैन"
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
    setPageContent(selected.html());
  }

  /* =========================================================
     SEARCH
  ========================================================= */

  function toggleSearch() {
    if (!els.searchPanel) return;

    els.searchPanel.classList.toggle("hidden");

    if (!els.searchPanel.classList.contains("hidden")) {
      els.searchInput?.focus();
    } else {
      searchQuery = "";

      if (els.searchInput) {
        els.searchInput.value = "";
      }

      renderFeed();
    }
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

  /* =========================================================
     GLOBAL CLICK EVENTS
  ========================================================= */

  function bindGlobalClickEvents() {
    document.addEventListener("click", event => {
      const target = event.target;

      if (!target?.closest) return;

      const createStory = target.closest("[data-story-create]");

      if (createStory) {
        openStoryCreator();
        return;
      }

      const viewStoryButton = target.closest("[data-story-view]");

      if (viewStoryButton) {
        viewStory(viewStoryButton.dataset.storyView);
        return;
      }

      const postMenu = target.closest("[data-post-menu]");

      if (postMenu) {
        openPostMenu(postMenu.dataset.postMenu);
        return;
      }

      const postAction = target.closest("[data-post-action]");

      if (postAction) {
        handlePostAction(
          postAction.dataset.postAction,
          postAction.dataset.postId
        );
        return;
      }

      const editPostButton = target.closest("[data-edit-post]");

      if (editPostButton) {
        const id = editPostButton.dataset.editPost;

        closeModal();
        editPost(id);

        return;
      }

      const deletePostButton = target.closest("[data-delete-post]");

      if (deletePostButton) {
        deletePost(deletePostButton.dataset.deletePost);
        return;
      }

      if (target.closest("[data-add-friend-open]")) {
        openAddFriend();
        return;
      }

      const messageFriend = target.closest("[data-message-friend]");

      if (messageFriend) {
        openFriendChat(messageFriend.dataset.messageFriend);
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

  /* =========================================================
     EVENT BINDING
  ========================================================= */

  function bindEvents() {
    NAV()?.initializeNavigation?.(document);

    global.addEventListener("ksk:navigate", event => {
      const page = event.detail?.page;

      if (page) {
        navigate(page, event.detail?.options || {});
      }
    });

    global.addEventListener(
      "ksk:open-composer",
      openPostComposer
    );

    global.addEventListener("ksk:language-change", () => {
      refreshCurrentPage();
      renderStories();
    });

    global.addEventListener("ksk:theme-change", () => {
      // Theme engine owns the visual theme.
    });

    global.addEventListener("ksk:settings-change", event => {
      const changedSettings = event.detail?.settings;

      if (changedSettings?.theme) {
        applySettingsTheme();
      }

      document.body.classList.toggle(
        "ksk-compact-mode",
        Boolean(changedSettings?.compactMode)
      );
    });

    global.addEventListener("ksk:data-change", event => {
      const collection = event.detail?.collection || "";

      if (
        collection.includes("posts") ||
        collection === "profile" ||
        collection.includes("stories") ||
        collection.includes("friends") ||
        collection.includes("messages") ||
        collection.includes("saved") ||
        collection.includes("notifications")
      ) {
        refreshCurrentPage();
        renderStories();
      }
    });

    els.openComposer?.addEventListener(
      "click",
      openPostComposer
    );

    els.quickText?.addEventListener(
      "click",
      openPostComposer
    );

    els.quickPhoto?.addEventListener("click", () => {
      toast(
        isEnglish()
          ? "Use the post composer to add a photo."
          : "फोटो थप्न पोस्ट Composer प्रयोग गर्नुहोस्।",
        "info"
      );
    });

    els.quickVideo?.addEventListener("click", () => {
      toast(
        isEnglish()
          ? "Video sharing is not available yet."
          : "भिडियो सुविधा अहिले उपलब्ध छैन।",
        "info"
      );
    });

    els.searchToggle?.addEventListener(
      "click",
      toggleSearch
    );

    els.searchInput?.addEventListener("input", event => {
      search(event.target.value);
    });

    els.notificationsToggle?.addEventListener("click", () => {
      DATA()?.markNotificationsRead?.();
      navigate("notifications");
    });

    els.closeSettings?.addEventListener(
      "click",
      closeSettings
    );

    els.settingsModal?.addEventListener("click", event => {
      if (event.target === els.settingsModal) {
        closeSettings();
      }
    });

    document.addEventListener("submit", event => {
      if (event.target.id === "kskMessageForm") {
        sendChatMessage(event);
      }
    });

    bindGlobalClickEvents();
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  function initialize() {
    if (initialized) return;

    initialized = true;

    cacheElements();

    // Initialize shared systems.
    DATA()?.initialize?.();
    SETTINGS()?.initialize?.();
    THEME()?.initializeTheme?.();
    LANG()?.initialize?.();
    SETTINGS_UI()?.initialize?.();

    // Restore settings theme and compact mode.
    applySettingsTheme();

    const savedSettings = SETTINGS()?.getSettings?.();

    document.body.classList.toggle(
      "ksk-compact-mode",
      Boolean(savedSettings?.compactMode)
    );

    currentPage =
      STATE()?.getState?.()?.currentPage || "home";

    if (
      currentPage === "create" ||
      currentPage === "settings"
    ) {
      currentPage = "home";
    }

    bindEvents();

    renderStories();
    renderFeed();

    refreshNavigation(currentPage);
    refreshCurrentPage();

    console.info("KSK application initialized.");
  }

  /* =========================================================
     PUBLIC APPLICATION API
  ========================================================= */

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
    }

  });

  /* =========================================================
     START APPLICATION
  ========================================================= */

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
