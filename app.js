
"use strict";

/* =====================================================
   HAMRO SANSAR — MAIN APPLICATION CONTROLLER
   Shared State + Settings + Theme + Language + Navigation
   ===================================================== */

(() => {
  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const STORAGE_POSTS = "hs_posts_v1";

  const els = {
    searchPanel: $("#searchPanel"),
    searchInput: $("#searchInput"),
    searchToggle: $("#searchToggle"),
    notificationsToggle: $("#notificationsToggle"),

    settingsToggle: $("#settingsToggle"),
    settingsModal: $("#settingsModal"),
    closeSettings: $("#closeSettings"),
    settingsThemeToggle: $("#settingsThemeToggle"),
    clearPosts: $("#clearPosts"),

    languageSelect: $("#languageSelect"),

    homePage: $("#homePage"),
    otherPage: $("#otherPage"),
    otherPageTitle: $("#otherPageTitle"),
    otherPageText: $("#otherPageText"),

    storiesList: $("#storiesList"),
    feedList: $("#feedList"),
    emptyFeed: $("#emptyFeed"),
    bottomNav: $("#bottomNav"),

    composerModal: $("#composerModal"),
    openComposer: $("#openComposer"),
    closeComposer: $("#closeComposer"),
    cancelComposer: $("#cancelComposer"),
    postText: $("#postText"),
    publishButton: $("#publishButton"),

    mediaInput: $("#mediaInput"),
    choosePhoto: $("#choosePhoto"),
    chooseVideo: $("#chooseVideo"),
    quickPhoto: $("#quickPhoto"),
    quickVideo: $("#quickVideo"),
    quickText: $("#quickText"),

    mediaPreview: $("#mediaPreview"),
    imagePreview: $("#imagePreview"),
    videoPreview: $("#videoPreview"),
    removeMedia: $("#removeMedia")
  };

  let posts = loadPosts();
  let selectedMedia = null;
  let currentPage = "home";
  let searchQuery = "";
  let activeChatId = null;

  let initialized = false;


  /* =====================================================
     UTILITIES
     ===================================================== */

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function translate(key, fallback = "") {
    if (window.HamroLanguage) {
      return window.HamroLanguage.translate(key);
    }

    return fallback || key;
  }

  function showToast(message, type = "info") {
    if (window.HamroToast) {
      window.HamroToast.show(message, type);
      return;
    }

    let container = $("#toastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    window.setTimeout(() => toast.remove(), 3000);
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const language =
      window.HamroLanguage?.getLanguage() || "ne";

    return date.toLocaleString(
      language === "en" ? "en-US" : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }


  /* =====================================================
     GLOBAL STATE
     ===================================================== */

  function syncPostsToState() {
    if (window.HamroState) {
      window.HamroState.setPosts(posts);
    }
  }

  function syncCurrentPage(page) {
    if (window.HamroState) {
      window.HamroState.setCurrentPage(page);
    }
  }


  /* =====================================================
     POST STORAGE
     ===================================================== */

  function loadPosts() {
    try {
      const saved = localStorage.getItem(STORAGE_POSTS);
      const parsed = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.sort((a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );

    } catch (error) {
      console.error("Post loading failed:", error);
      return [];
    }
  }

  function savePosts() {
    try {
      localStorage.setItem(
        STORAGE_POSTS,
        JSON.stringify(posts)
      );

      syncPostsToState();
      return true;

    } catch (error) {
      console.error("Post saving failed:", error);

      showToast(
        "डाटा सुरक्षित गर्न सकिएन। केही फोटो वा भिडियो हटाएर प्रयास गर्नुहोस्।",
        "error"
      );

      return false;
    }
  }


  /* =====================================================
     THEME MANAGEMENT
     ===================================================== */

  function getCurrentTheme() {
    if (window.HamroTheme) {
      return window.HamroTheme.getTheme();
    }

    if (window.HamroSettings) {
      return window.HamroSettings.getSettings().theme;
    }

    return document.documentElement.dataset.theme || "light";
  }

  function applyTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";

    if (window.HamroTheme) {
      window.HamroTheme.applyTheme(selected);
    } else {
      document.documentElement.dataset.theme = selected;
      document.documentElement.style.colorScheme = selected;
    }

    const meta = $('meta[name="theme-color"]');

    if (meta) {
      meta.content =
        selected === "dark" ? "#0b1220" : "#2563eb";
    }

    if (window.HamroSettings) {
      const settings = window.HamroSettings.getSettings();

      if (settings.theme !== selected) {
        window.HamroSettings.updateSettings({
          theme: selected
        });
      }
    }

    document.dispatchEvent(
      new CustomEvent("hamro:theme-updated", {
        detail: { theme: selected }
      })
    );
  }

  function toggleTheme() {
    const next =
      getCurrentTheme() === "dark" ? "light" : "dark";

    applyTheme(next);

    showToast(
      next === "dark"
        ? "Dark mode सक्रिय भयो।"
        : "Light mode सक्रिय भयो।",
      "success"
    );
  }


  /* =====================================================
     LANGUAGE MANAGEMENT
     ===================================================== */

  function initializeLanguageControl() {
    if (!els.languageSelect) return;

    const currentLanguage =
      window.HamroLanguage?.getLanguage() ||
      window.HamroSettings?.getSettings().language ||
      "ne";

    els.languageSelect.value = currentLanguage;

    // Language change is connected in index.html.
    // Do not add a duplicate change listener here.
  }


  /* =====================================================
     STORIES
     ===================================================== */

  function renderStories() {
    if (!els.storiesList) return;

    const stories = [
      { name: "तपाईंको स्टोरी", initial: "+" },
      { name: "साथी १", initial: "स" },
      { name: "साथी २", initial: "क" },
      { name: "साथी ३", initial: "र" },
      { name: "साथी ४", initial: "म" }
    ];

    els.storiesList.innerHTML = stories.map(
      (story, index) => `
        <button
          class="story-card"
          type="button"
          ${index === 0 ? 'data-create-story="true"' : ""}>

          <span class="story-avatar">
            ${escapeHTML(story.initial)}
          </span>

          <span class="story-name">
            ${escapeHTML(story.name)}
          </span>

        </button>
      `
    ).join("");
  }


  /* =====================================================
     POST RENDERING
     ===================================================== */

  function renderPost(post) {
    // Use an existing post-card module if one is loaded.
    if (window.HamroPostCard?.renderPostCard) {
      return window.HamroPostCard.renderPostCard(post);
    }

    const id = escapeHTML(post.id || "");
    const author = escapeHTML(post.author || "सदस्य");
    const initial = escapeHTML(post.authorInitial || "स");
    const content = escapeHTML(post.text || "");
    const date = escapeHTML(formatDate(post.createdAt));

    let mediaHTML = "";

    if (post.mediaData && post.mediaType) {
      const mediaURL = escapeHTML(post.mediaData);

      if (post.mediaType.startsWith("image/")) {
        mediaHTML = `
          <img
            class="post-media"
            src="${mediaURL}"
            alt="पोस्ट फोटो"
            loading="lazy">
        `;
      } else if (post.mediaType.startsWith("video/")) {
        mediaHTML = `
          <video
            class="post-media"
            src="${mediaURL}"
            controls
            playsinline>
          </video>
        `;
      }
    }

    return `
      <article class="post-card" data-post-id="${id}">

        <header class="post-header">

          <div class="avatar">
            ${initial}
          </div>

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
            aria-label="पोस्ट हटाउनुहोस्">

            ⋯

          </button>

        </header>

        ${
          content
            ? `<div class="post-content">${content}</div>`
            : ""
        }

        ${mediaHTML}

        <footer class="post-actions">

          <button
            class="post-action ${post.liked ? "is-active" : ""}"
            type="button"
            data-post-action="like"
            data-post-id="${id}">

            ${post.liked ? "❤️" : "♡"}
            ${Number(post.likes || 0)}

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="comment"
            data-post-id="${id}">

            💬 टिप्पणी

          </button>

          <button
            class="post-action"
            type="button"
            data-post-action="share"
            data-post-id="${id}">

            ↗ Share

          </button>

        </footer>

      </article>
    `;
  }


  function renderFeed() {
    if (!els.feedList || !els.emptyFeed) return;

    const filteredPosts = posts.filter(post => {
      const content = [
        post.author || "",
        post.text || ""
      ].join(" ").toLowerCase();

      return content.includes(searchQuery.toLowerCase());
    });

    if (!filteredPosts.length) {
      els.feedList.innerHTML = "";
      els.emptyFeed.classList.remove("hidden");
      return;
    }

    els.emptyFeed.classList.add("hidden");

    els.feedList.innerHTML = filteredPosts
      .map(renderPost)
      .join("");
  }


  /* =====================================================
     COMPOSER
     ===================================================== */

  function openComposer() {
    if (!els.composerModal) return;

    els.composerModal.classList.remove("hidden");
    els.composerModal.setAttribute("aria-hidden", "false");

    window.setTimeout(() => {
      els.postText?.focus();
    }, 50);
  }

  function closeComposer() {
    if (!els.composerModal) return;

    els.composerModal.classList.add("hidden");
    els.composerModal.setAttribute("aria-hidden", "true");
  }


  /* =====================================================
     MEDIA HANDLING
     ===================================================== */

  function chooseMedia(type) {
    if (!els.mediaInput) return;

    els.mediaInput.accept =
      type === "image" ? "image/*" : "video/*";

    els.mediaInput.click();
  }

  function resetMedia() {
    selectedMedia = null;

    if (els.mediaInput) {
      els.mediaInput.value = "";
    }

    els.mediaPreview?.classList.add("hidden");
    els.imagePreview?.classList.add("hidden");
    els.videoPreview?.classList.add("hidden");

    els.imagePreview?.removeAttribute("src");
    els.videoPreview?.removeAttribute("src");
    els.videoPreview?.load();
  }

  function handleMedia(file) {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      showToast("फोटो वा भिडियो फाइल छान्नुहोस्।", "warning");
      return;
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast(
        "फाइल ८ MB भन्दा सानो हुनुपर्छ।",
        "warning"
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      selectedMedia = {
        data: String(reader.result),
        type: file.type
      };

      els.mediaPreview?.classList.remove("hidden");

      if (isImage) {
        els.imagePreview.src = selectedMedia.data;
        els.imagePreview.classList.remove("hidden");
        els.videoPreview.classList.add("hidden");
      } else {
        els.videoPreview.src = selectedMedia.data;
        els.videoPreview.classList.remove("hidden");
        els.imagePreview.classList.add("hidden");
      }
    };

    reader.onerror = () => {
      showToast("फाइल पढ्न सकिएन।", "error");
    };

    reader.readAsDataURL(file);
  }


  /* =====================================================
     PUBLISH POST
     ===================================================== */

  function publishPost() {
    const text = els.postText?.value.trim() || "";

    if (!text && !selectedMedia) {
      showToast(
        "पोस्ट लेख्नुहोस् वा फोटो/भिडियो छान्नुहोस्।",
        "warning"
      );
      return;
    }

    const post = {
      id: `post_${Date.now()}_${Math.random()
        .toString(36).slice(2, 8)}`,

      author: "तपाईं",
      authorInitial: "त",

      text,

      mediaData: selectedMedia?.data || "",
      mediaType: selectedMedia?.type || "",

      createdAt: new Date().toISOString(),

      likes: 0,
      liked: false,
      comments: 0,
      shares: 0
    };

    posts.unshift(post);

    if (!savePosts()) {
      posts.shift();
      return;
    }

    renderFeed();

    if (els.postText) {
      els.postText.value = "";
    }

    resetMedia();
    closeComposer();
    showPage("home");

    showToast("पोस्ट प्रकाशित भयो।", "success");
  }


  /* =====================================================
     POST ACTIONS
     ===================================================== */

  function updatePost(id, changes) {
    const previousPosts = posts;

    posts = posts.map(post =>
      String(post.id) === String(id)
        ? { ...post, ...changes }
        : post
    );

    if (!savePosts()) {
      posts = previousPosts;
      return;
    }

    renderFeed();
  }

  function handlePostAction(action, id) {
    const post = posts.find(
      item => String(item.id) === String(id)
    );

    if (!post) return;

    if (action === "like") {
      const liked = !post.liked;

      updatePost(id, {
        liked,
        likes: Math.max(
          0,
          Number(post.likes || 0) + (liked ? 1 : -1)
        )
      });

      return;
    }

    if (action === "comment") {
      showToast(
        "टिप्पणी सुविधा अर्को चरणमा जोडिनेछ।",
        "info"
      );
      return;
    }

    if (action === "share") {
      const shareText =
        `${post.author || "सदस्य"}: ${post.text || "पोस्ट"}`;

      if (navigator.share) {
        navigator.share({
          title: "हाम्रो संसार",
          text: shareText
        }).catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareText)
          .then(() => {
            showToast("पोस्टको विवरण Copy भयो।", "success");
          })
          .catch(() => {
            showToast("Copy गर्न सकिएन।", "error");
          });
      } else {
        showToast("Share सुविधा उपलब्ध छैन।");
      }
    }
  }

  function deletePost(id) {
    const confirmed = window.confirm(
      "यो पोस्ट हटाउने हो?"
    );

    if (!confirmed) return;

    const previousPosts = posts;

    posts = posts.filter(
      post => String(post.id) !== String(id)
    );

    if (!savePosts()) {
      posts = previousPosts;
      return;
    }

    renderFeed();
    showToast("पोस्ट हटाइयो।", "success");
  }


  /* =====================================================
     SETTINGS
     ===================================================== */

  function openSettings() {
    if (!els.settingsModal) return;

    els.settingsModal.classList.remove("hidden");
    els.settingsModal.setAttribute("aria-hidden", "false");

    initializeLanguageControl();
  }

  function closeSettings() {
    if (!els.settingsModal) return;

    els.settingsModal.classList.add("hidden");
    els.settingsModal.setAttribute("aria-hidden", "true");
  }

  function clearLocalPosts() {
    const confirmed = window.confirm(
      "यस उपकरणमा सुरक्षित सबै स्थानीय पोस्ट मेटाउने हो?"
    );

    if (!confirmed) return;

    const previousPosts = posts;
    posts = [];

    if (!savePosts()) {
      posts = previousPosts;
      return;
    }

    renderFeed();
    closeSettings();

    showToast("स्थानीय पोस्टहरू मेटाइयो।", "success");
  }


  /* =====================================================
     PAGE CONTENT
     ===================================================== */

  function renderFallbackPage(page) {
    const language =
      window.HamroLanguage?.getLanguage() || "ne";

    const content = {
      friends: {
        ne: `
          <div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <h3 class="empty-state-title">साथीहरू</h3>
            <p>साथी खोज्ने र जोड्ने सुविधा क्रमशः थपिनेछ।</p>
          </div>
        `,
        en: `
          <div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <h3 class="empty-state-title">Friends</h3>
            <p>Finding and connecting with friends will be added gradually.</p>
          </div>
        `
      },

      messages: {
        ne: `
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <h3 class="empty-state-title">सन्देश</h3>
            <p>सन्देश र Chat सुविधा क्रमशः थपिनेछ।</p>
          </div>
        `,
        en: `
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <h3 class="empty-state-title">Messages</h3>
            <p>Messaging and chat features will be added gradually.</p>
          </div>
        `
      },

      profile: {
        ne: `
          <div class="empty-state">
            <div class="empty-state-icon">👤</div>
            <h3 class="empty-state-title">तपाईंको प्रोफाइल</h3>
            <p>प्रोफाइल विवरण र फोटो व्यवस्थापन सुविधा थपिँदैछ।</p>
          </div>
        `,
        en: `
          <div class="empty-state">
            <div class="empty-state-icon">👤</div>
            <h3 class="empty-state-title">Your Profile</h3>
            <p>Profile details and photo management are coming.</p>
          </div>
        `
      },

      notifications: {
        ne: `
          <div class="empty-state">
            <div class="empty-state-icon">🔔</div>
            <h3 class="empty-state-title">सूचनाहरू</h3>
            <p>अहिले नयाँ सूचना छैन।</p>
          </div>
        `,
        en: `
          <div class="empty-state">
            <div class="empty-state-icon">🔔</div>
            <h3 class="empty-state-title">Notifications</h3>
            <p>There are no new notifications.</p>
          </div>
        `
      },

      saved: {
        ne: `
          <div class="empty-state">
            <div class="empty-state-icon">🔖</div>
            <h3 class="empty-state-title">सेभ गरिएका पोस्ट</h3>
            <p>सेभ गरिएको पोस्ट अहिले छैन।</p>
          </div>
        `,
        en: `
          <div class="empty-state">
            <div class="empty-state-icon">🔖</div>
            <h3 class="empty-state-title">Saved Posts</h3>
            <p>There are no saved posts yet.</p>
          </div>
        `
      }
    };

    return content[page]?.[language] ||
      content[page]?.ne ||
      "";
  }

  function renderPageContent(page) {
    if (!els.otherPageText) return;

    // Use feature modules if they exist.
    if (
      window.HamroPages &&
      typeof window.HamroPages.render === "function" &&
      typeof window.HamroPages.has === "function" &&
      window.HamroPages.has(page)
    ) {
      try {
        els.otherPageText.innerHTML =
          window.HamroPages.render(page) || "";
        return;
      } catch (error) {
        console.error("Page module error:", error);
      }
    }

    if (
      page === "messages" &&
      activeChatId &&
      window.HamroChatPage
    ) {
      els.otherPageText.innerHTML =
        window.HamroChatPage.renderChat(activeChatId);
      return;
    }

    els.otherPageText.innerHTML =
      renderFallbackPage(page);
  }


  /* =====================================================
     NAVIGATION
     ===================================================== */

  function setActiveNavigation(page) {
    const activePage =
      page === "posts" ? "home" : page;

    $$(".nav-item").forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.page === activePage
      );
    });
  }

  function showPage(page, options = {}) {
    // Home and Posts are the same feed.
    if (page === "posts") {
      page = "home";
    }

    if (page === "create") {
      openComposer();
      return;
    }

    const allowedPages = [
      "home",
      "friends",
      "messages",
      "notifications",
      "profile",
      "saved",
      "settings"
    ];

    if (!allowedPages.includes(page)) {
      showToast("यो पृष्ठ उपलब्ध छैन।", "warning");
      return;
    }

    currentPage = page;

    if (page !== "messages" || !options.keepChat) {
      activeChatId = null;
    }

    const isHome = page === "home";

    els.homePage?.classList.toggle("hidden", !isHome);
    els.otherPage?.classList.toggle("hidden", isHome);

    setActiveNavigation(page);

    syncCurrentPage(page);

    if (isHome) {
      renderFeed();
      return;
    }

    if (page === "settings") {
      showPage("profile");
      openSettings();
      return;
    }

    const titles = {
      friends: translate("friends", "साथीहरू"),
      messages: translate("messages", "सन्देश"),
      notifications: translate("notifications", "सूचनाहरू"),
      profile: translate("profile", "प्रोफाइल"),
      saved: translate("saved", "सेभ गरिएका पोस्टहरू")
    };

    if (els.otherPageTitle) {
      els.otherPageTitle.textContent =
        activeChatId && page === "messages"
          ? "Chat"
          : titles[page] || "पृष्ठ";
    }

    renderPageContent(page);
  }

  function navigate(page) {
    if (window.HamroNavigation) {
      window.HamroNavigation.navigate(page);
    } else {
      showPage(page);
    }
  }


  /* =====================================================
     FEATURE MODULE ACTIONS
     ===================================================== */

  function handlePageAction(button) {
    const action = button.dataset.hsAction;

    const data = {
      userId: button.dataset.userId,
      chatId: button.dataset.chatId,
      postId: button.dataset.postId
    };

    if (action === "back-to-messages") {
      activeChatId = null;
      showPage("messages");
      return;
    }

    if (action === "toggle-theme") {
      toggleTheme();
      return;
    }

    if (action === "open-settings") {
      openSettings();
      return;
    }

    if (window.HamroPages?.handle) {
      window.HamroPages.handle(
        action,
        data,
        els.otherPageText
      );
    }
  }


  /* =====================================================
     EVENT LISTENERS
     ===================================================== */

  function bindSearchEvents() {
    els.searchToggle?.addEventListener("click", () => {
      els.searchPanel?.classList.toggle("hidden");

      if (!els.searchPanel?.classList.contains("hidden")) {
        els.searchInput?.focus();
      }
    });

    els.searchInput?.addEventListener("input", () => {
      searchQuery = els.searchInput.value.trim();

      if (window.HamroState) {
        window.HamroState.setSearchQuery(searchQuery);
      }

      renderFeed();
    });
  }

  function bindSettingsEvents() {
    els.settingsToggle?.addEventListener(
      "click",
      openSettings
    );

    els.closeSettings?.addEventListener(
      "click",
      closeSettings
    );

    els.settingsThemeToggle?.addEventListener(
      "click",
      toggleTheme
    );

    els.settingsModal?.addEventListener("click", event => {
      if (event.target === els.settingsModal) {
        closeSettings();
      }
    });

    els.clearPosts?.addEventListener(
      "click",
      clearLocalPosts
    );
  }

  function bindComposerEvents() {
    els.openComposer?.addEventListener(
      "click",
      openComposer
    );

    els.quickText?.addEventListener(
      "click",
      openComposer
    );

    els.quickPhoto?.addEventListener("click", () => {
      openComposer();
      chooseMedia("image");
    });

    els.quickVideo?.addEventListener("click", () => {
      openComposer();
      chooseMedia("video");
    });

    els.closeComposer?.addEventListener(
      "click",
      closeComposer
    );

    els.cancelComposer?.addEventListener(
      "click",
      closeComposer
    );

    els.composerModal?.addEventListener("click", event => {
      if (event.target === els.composerModal) {
        closeComposer();
      }
    });

    els.choosePhoto?.addEventListener("click", () => {
      chooseMedia("image");
    });

    els.chooseVideo?.addEventListener("click", () => {
      chooseMedia("video");
    });

    els.mediaInput?.addEventListener("change", event => {
      handleMedia(event.target.files?.[0]);
    });

    els.removeMedia?.addEventListener(
      "click",
      resetMedia
    );

    els.publishButton?.addEventListener(
      "click",
      publishPost
    );
  }

  function bindFeedEvents() {
    els.feedList?.addEventListener("click", event => {
      const actionButton =
        event.target.closest("[data-post-action]");

      if (actionButton) {
        handlePostAction(
          actionButton.dataset.postAction,
          actionButton.dataset.postId
        );
        return;
      }

      const menuButton =
        event.target.closest("[data-post-menu]");

      if (menuButton) {
        deletePost(menuButton.dataset.postMenu);
      }
    });
  }

  function bindStoryEvents() {
    els.storiesList?.addEventListener("click", event => {
      if (event.target.closest("[data-create-story]")) {
        showToast(
          "Story सुविधा अर्को चरणमा जोडिनेछ।"
        );
      }
    });
  }

  function bindNavigationEvents() {
    els.bottomNav?.addEventListener("click", event => {
      const item = event.target.closest("[data-page]");

      if (!item || !els.bottomNav.contains(item)) {
        return;
      }

      navigate(item.dataset.page);
    });

    els.notificationsToggle?.addEventListener(
      "click",
      () => navigate("notifications")
    );

    window.addEventListener("hamro:navigate", event => {
      const page = event.detail?.page;

      if (page) {
        showPage(page, event.detail?.options || {});
      }
    });

    window.addEventListener(
      "hamro:open-composer",
      openComposer
    );

    els.otherPageText?.addEventListener("click", event => {
      const pageButton =
        event.target.closest("[data-page]");

      if (pageButton) {
        navigate(pageButton.dataset.page);
        return;
      }

      const actionButton =
        event.target.closest("[data-hs-action]");

      if (actionButton) {
        handlePageAction(actionButton);
      }
    });
  }

  function bindKeyboardEvents() {
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeComposer();
        closeSettings();
      }
    });
  }


  /* =====================================================
     INITIALIZATION
     ===================================================== */

  function initialize() {
    if (initialized) return;
    initialized = true;

    // Load shared preferences.
    if (window.HamroSettings) {
      const settings =
        window.HamroSettings.getSettings();

      if (window.HamroTheme) {
        window.HamroTheme.applyTheme(
          settings.theme,
          false
        );
      }
    } else if (window.HamroTheme) {
      window.HamroTheme.initializeTheme();
    }

    initializeLanguageControl();

    // Sync initial data.
    syncPostsToState();
    syncCurrentPage("home");

    // Render initial UI.
    renderStories();
    renderFeed();

    // Bind events.
    bindSearchEvents();
    bindSettingsEvents();
    bindComposerEvents();
    bindFeedEvents();
    bindStoryEvents();
    bindNavigationEvents();
    bindKeyboardEvents();

    showPage("home");

    // Public application API.
    window.HamroApp = Object.freeze({

      showPage,

      navigate,

      openComposer,

      openSettings,

      closeSettings,

      toggleTheme,

      refreshPage() {
        showPage(
          currentPage,
          { keepChat: Boolean(activeChatId) }
        );
      },

      openChat(chatId) {
        activeChatId = chatId;
        showPage("messages", { keepChat: true });
      },

      getCurrentPage() {
        return currentPage;
      },

      getPosts() {
        return [...posts];
      },

      refreshFeed() {
        posts = loadPosts();
        syncPostsToState();
        renderFeed();
      }

    });

    window.dispatchEvent(
      new CustomEvent("hamro:app-ready")
    );
  }


  /* =====================================================
     START APP
     ===================================================== */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }


  /* =====================================================
     SERVICE WORKER
     ===================================================== */

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .catch(error => {
          console.error(
            "Service Worker registration failed:",
            error
          );
        });
    });
  }

})();
