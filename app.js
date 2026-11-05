"use strict";

/* Hamro Sansar — Integrated Frontend App */

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const STORAGE_POSTS = "hs_posts_v1";
  const STORAGE_THEME = "hs_theme_v1";

  const els = {
    searchPanel: $("#searchPanel"),
    searchInput: $("#searchInput"),
    searchToggle: $("#searchToggle"),
    themeToggle: $("#themeToggle"),
    settingsToggle: $("#settingsToggle"),
    settingsModal: $("#settingsModal"),
    closeSettings: $("#closeSettings"),
    settingsThemeToggle: $("#settingsThemeToggle"),
    clearPosts: $("#clearPosts"),

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
    removeMedia: $("#removeMedia"),

    toastContainer: $("#toastContainer")
  };

  let posts = loadPosts();
  let selectedMedia = null;
  let currentPage = "home";
  let searchQuery = "";
  let activeChatId = null;

  function loadPosts() {
    try {
      const saved = localStorage.getItem(STORAGE_POSTS);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Could not load posts:", error);
      return [];
    }
  }

  function savePosts() {
    try {
      localStorage.setItem(STORAGE_POSTS, JSON.stringify(posts));

      if (window.HamroState) {
        window.HamroState.setPosts(posts);
      }
    } catch (error) {
      console.error("Could not save posts:", error);
      showToast("डाटा सुरक्षित गर्न सकिएन। केही पोस्ट वा media हटाउनुहोस्।");
    }
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showToast(message, type = "info") {
    if (window.HamroToast) {
      window.HamroToast.show(message, type);
      return;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2800);
  }

  function applyTheme(theme) {
    const safeTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme = safeTheme;
    document.documentElement.style.colorScheme = safeTheme;

    try {
      localStorage.setItem(STORAGE_THEME, safeTheme);
    } catch {}

    if (window.HamroState &&
        window.HamroState.state.theme !== safeTheme) {
      window.HamroState.setTheme(safeTheme);
    }

    els.themeToggle.textContent = safeTheme === "dark" ? "☀️" : "🌙";
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme || "light";
    const next = current === "dark" ? "light" : "dark";

    if (window.HamroTheme) {
      window.HamroTheme.toggleTheme();
      applyTheme(window.HamroState?.state?.theme || next);
    } else {
      applyTheme(next);
    }
  }

  function renderStories() {
    const stories = [
      { name: "तपाईंको स्टोरी", initial: "+" },
      { name: "साथी १", initial: "स" },
      { name: "साथी २", initial: "क" },
      { name: "साथी ३", initial: "र" },
      { name: "साथी ४", initial: "म" }
    ];

    els.storiesList.innerHTML = stories.map((story, index) => `
      <button class="story-card" type="button"
        ${index === 0 ? 'data-create-story="true"' : ""}>
        <span class="story-avatar">${escapeHTML(story.initial)}</span>
        <span class="story-name">${escapeHTML(story.name)}</span>
      </button>
    `).join("");
  }

  function renderPost(post) {
    if (window.HamroPostCard) {
      return window.HamroPostCard.renderPostCard(post);
    }

    return "";
  }

  function renderFeed() {
    const filtered = posts.filter((post) => {
      const content = `${post.author || ""} ${post.text || ""}`.toLowerCase();
      return content.includes(searchQuery.toLowerCase());
    });

    if (!filtered.length) {
      els.feedList.innerHTML = "";
      els.emptyFeed.classList.remove("hidden");
      return;
    }

    els.emptyFeed.classList.add("hidden");
    els.feedList.innerHTML = filtered.map(renderPost).join("");
  }

  function openComposer() {
    els.composerModal.classList.remove("hidden");
    els.composerModal.setAttribute("aria-hidden", "false");
    els.postText.focus();
  }

  function closeComposer() {
    els.composerModal.classList.add("hidden");
    els.composerModal.setAttribute("aria-hidden", "true");
  }

  function openSettings() {
    els.settingsModal.classList.remove("hidden");
    els.settingsModal.setAttribute("aria-hidden", "false");
  }

  function closeSettings() {
    els.settingsModal.classList.add("hidden");
    els.settingsModal.setAttribute("aria-hidden", "true");
  }

  function chooseMedia(type) {
    els.mediaInput.accept = type === "image" ? "image/*" : "video/*";
    els.mediaInput.click();
  }

  function resetMedia() {
    selectedMedia = null;
    els.mediaInput.value = "";

    els.mediaPreview.classList.add("hidden");
    els.imagePreview.classList.add("hidden");
    els.videoPreview.classList.add("hidden");

    els.imagePreview.removeAttribute("src");
    els.videoPreview.removeAttribute("src");
    els.videoPreview.load();
  }

  function handleMedia(file) {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      showToast("फोटो वा भिडियो फाइल छान्नुहोस्।");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast("फाइल ८ MB भन्दा सानो हुनुपर्छ।");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      selectedMedia = {
        data: String(reader.result),
        type: file.type
      };

      els.mediaPreview.classList.remove("hidden");

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

    reader.onerror = () => showToast("फाइल पढ्न सकिएन।");
    reader.readAsDataURL(file);
  }

  function publishPost() {
    const text = els.postText.value.trim();

    if (!text && !selectedMedia) {
      showToast("पोस्ट लेख्नुहोस् वा फोटो/भिडियो छान्नुहोस्।");
      return;
    }

    const post = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
    savePosts();
    renderFeed();

    els.postText.value = "";
    resetMedia();
    closeComposer();
    showPage("home");
    showToast("पोस्ट प्रकाशित भयो।", "success");
  }

  function updatePost(id, changes) {
    posts = posts.map((post) =>
      String(post.id) === String(id)
        ? { ...post, ...changes }
        : post
    );

    savePosts();
    renderFeed();
  }

  function handlePostAction(action, id) {
    const post = posts.find((item) => String(item.id) === String(id));
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
      showToast("टिप्पणी सुविधा अर्को चरणमा जोडिनेछ।");
      return;
    }

    if (action === "share") {
      const shareText = `${post.author || "तपाईं"}: ${post.text || "पोस्ट"}`;

      if (navigator.share) {
        navigator.share({ text: shareText }).catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareText)
          .then(() => showToast("पोस्टको विवरण copy भयो।", "success"))
          .catch(() => showToast("Copy गर्न सकिएन।"));
      } else {
        showToast("Share सुविधा उपलब्ध छैन।");
      }
    }
  }

  function deletePost(id) {
    if (!window.confirm("यो पोस्ट हटाउने हो?")) return;

    posts = posts.filter((post) => String(post.id) !== String(id));
    savePosts();
    renderFeed();
    showToast("पोस्ट हटाइयो।", "success");
  }

  function setActiveNavigation(page) {
    $$(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });
  }

  function showPage(page, options = {}) {
    currentPage = page;

    if (page === "create") {
      openComposer();
      return;
    }

    if (page !== "messages" || !options.keepChat) {
      activeChatId = null;
    }

    const isHome = page === "home" || page === "posts";

    els.homePage.classList.toggle("hidden", !isHome);
    els.otherPage.classList.toggle("hidden", isHome);

    setActiveNavigation(page);

    if (window.HamroState) {
      window.HamroState.setCurrentPage(page);
    }

    if (isHome) {
      renderFeed();
      return;
    }

    const titles = {
      friends: "साथीहरू",
      messages: activeChatId ? "Chat" : "सन्देश",
      notifications: "सूचनाहरू",
      profile: "प्रोफाइल",
      settings: "सेटिङ",
      saved: "सेभ गरिएका पोस्टहरू"
    };

    els.otherPageTitle.textContent = titles[page] || "पृष्ठ";

    if (page === "messages" && activeChatId && window.HamroChatPage) {
      els.otherPageText.innerHTML = window.HamroChatPage.renderChat(activeChatId);
      return;
    }

    if (window.HamroPages && window.HamroPages.has(page)) {
      els.otherPageText.innerHTML = window.HamroPages.render(page) || "";
    } else {
      els.otherPageText.innerHTML = `
        <div class="card">
          <h3>यो पृष्ठ उपलब्ध छैन</h3>
          <p>यस पृष्ठको module load भएको छैन।</p>
        </div>
      `;
    }
  }

  function navigate(page) {
    if (window.HamroNavigation) {
      window.HamroNavigation.navigate(page);
    } else {
      showPage(page);
    }
  }

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
      showPage("settings");
      return;
    }

    if (window.HamroPages) {
      window.HamroPages.handle(action, data, els.otherPageText);
    }
  }

  function bindEvents() {
    els.searchToggle.addEventListener("click", () => {
      els.searchPanel.classList.toggle("hidden");

      if (!els.searchPanel.classList.contains("hidden")) {
        els.searchInput.focus();
      }
    });

    els.searchInput.addEventListener("input", () => {
      searchQuery = els.searchInput.value.trim();

      if (window.HamroState) {
        window.HamroState.setSearchQuery(searchQuery);
      }

      renderFeed();
    });

    els.themeToggle.addEventListener("click", toggleTheme);
    els.settingsThemeToggle.addEventListener("click", toggleTheme);
    els.settingsToggle.addEventListener("click", openSettings);
    els.closeSettings.addEventListener("click", closeSettings);

    els.settingsModal.addEventListener("click", (event) => {
      if (event.target === els.settingsModal) closeSettings();
    });

    els.clearPosts.addEventListener("click", () => {
      if (!window.confirm("यस उपकरणमा सुरक्षित सबै पोस्ट मेटाउने हो?")) return;

      posts = [];
      savePosts();
      renderFeed();
      closeSettings();
      showToast("स्थानीय पोस्टहरू मेटाइयो।", "success");
    });

    els.openComposer.addEventListener("click", openComposer);
    els.quickText.addEventListener("click", openComposer);

    els.quickPhoto.addEventListener("click", () => {
      openComposer();
      chooseMedia("image");
    });

    els.quickVideo.addEventListener("click", () => {
      openComposer();
      chooseMedia("video");
    });

    els.closeComposer.addEventListener("click", closeComposer);
    els.cancelComposer.addEventListener("click", closeComposer);

    els.composerModal.addEventListener("click", (event) => {
      if (event.target === els.composerModal) closeComposer();
    });

    els.choosePhoto.addEventListener("click", () => chooseMedia("image"));
    els.chooseVideo.addEventListener("click", () => chooseMedia("video"));

    els.mediaInput.addEventListener("change", (event) => {
      handleMedia(event.target.files?.[0]);
    });

    els.removeMedia.addEventListener("click", resetMedia);
    els.publishButton.addEventListener("click", publishPost);

    els.feedList.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-post-action]");

      if (actionButton) {
        handlePostAction(
          actionButton.dataset.postAction,
          actionButton.dataset.postId
        );
        return;
      }

      const menuButton = event.target.closest("[data-post-menu]");
      if (menuButton) deletePost(menuButton.dataset.postMenu);
    });

    els.storiesList.addEventListener("click", (event) => {
      if (event.target.closest("[data-create-story]")) {
        showToast("Story सुविधा अर्को चरणमा जोडिनेछ।");
      }
    });

    els.bottomNav.addEventListener("click", (event) => {
      const item = event.target.closest("[data-page]");
      if (item) navigate(item.dataset.page);
    });

    els.otherPageText.addEventListener("click", (event) => {
      const pageButton = event.target.closest("[data-page]");
      if (pageButton) {
        navigate(pageButton.dataset.page);
        return;
      }

      const actionButton = event.target.closest("[data-hs-action]");
      if (actionButton) handlePageAction(actionButton);
    });

    window.addEventListener("hamro:navigate", (event) => {
      const page = event.detail?.page;
      if (page) showPage(page);
    });

    window.addEventListener("hamro:open-composer", openComposer);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeComposer();
        closeSettings();
      }
    });
  }

  function initialize() {
    let savedTheme = "light";

    try {
      savedTheme = localStorage.getItem(STORAGE_THEME) || "light";
    } catch {}

    if (window.HamroState) {
      window.HamroState.setPosts(posts);
      window.HamroState.setCurrentPage("home");
    }

    applyTheme(savedTheme);
    renderStories();
    renderFeed();
    bindEvents();
    showPage("home");

    window.HamroApp = Object.freeze({
      showPage,

      refreshPage() {
        showPage(currentPage, { keepChat: Boolean(activeChatId) });
      },

      openChat(chatId) {
        activeChatId = chatId;
        showPage("messages", { keepChat: true });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
    });
  }
})();
