
"use strict";

/* =========================================================
   HAMRO SANSAR — APP CONTROLLER
   Shared State | Navigation | Stories | Posts | Media
   Friends | Messages | Profile | Settings
   ========================================================= */

(() => {
  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const DB_NAME = "hamro_sansar_media";
  const DB_VERSION = 1;
  const MEDIA_STORE = "media";

  const POSTS_KEY = "hs_posts_v2";
  const STORIES_KEY = "hs_stories_v1";
  const FRIENDS_KEY = "hs_friends_v1";
  const MESSAGES_KEY = "hs_messages_v1";
  const PROFILE_KEY = "hs_profile_v1";
  const SAVED_KEY = "hs_saved_v1";

  const STORY_DURATION = 24 * 60 * 60 * 1000;
  const MAX_MEDIA_SIZE = 100 * 1024 * 1024;

  const els = {
    homePage: $("#homePage"),
    otherPage: $("#otherPage"),
    otherPageTitle: $("#otherPageTitle"),
    otherPageText: $("#otherPageText"),

    bottomNav: $("#bottomNav"),

    storiesList: $("#storiesList"),
    feedList: $("#feedList"),
    emptyFeed: $("#emptyFeed"),

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

    searchPanel: $("#searchPanel"),
    searchInput: $("#searchInput"),
    searchToggle: $("#searchToggle"),
    notificationsToggle: $("#notificationsToggle"),

    settingsToggle: $("#settingsToggle"),
    settingsModal: $("#settingsModal"),
    closeSettings: $("#closeSettings"),
    settingsThemeToggle: $("#settingsThemeToggle"),
    languageSelect: $("#languageSelect"),
    clearPosts: $("#clearPosts")
  };

  let db = null;
  let dbReady = false;
  let initialized = false;

  let posts = [];
  let stories = [];
  let friends = [];
  let messages = [];
  let profile = {};

  let selectedMedia = null;
  let currentPage = "home";
  let searchQuery = "";
  let activeChatId = null;

  const objectURLs = new Map();

  /* =========================================================
     HELPERS
     ========================================================= */

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function makeId(prefix = "item") {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36).slice(2, 9)}`;
  }

  function language() {
    return window.HamroLanguage?.getLanguage() || "ne";
  }

  function t(key, fallback = "") {
    return window.HamroLanguage?.translate(key) ||
      fallback || key;
  }

  function toast(message, type = "info") {
    if (window.HamroToast?.show) {
      window.HamroToast.show(message, type);
      return;
    }

    const container = $("#toastContainer");
    if (!container) return;

    const item = document.createElement("div");
    item.className = `toast toast-${type}`;
    item.textContent = message;
    container.appendChild(item);

    setTimeout(() => item.remove(), 3000);
  }

  function readJSON(key, fallback = []) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Data loading failed:", key, error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Data saving failed:", key, error);
      toast("डाटा सुरक्षित गर्न सकिएन।", "error");
      return false;
    }
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(
      language() === "en" ? "en-US" : "ne-NP",
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
      language() === "en" ? "en-US" : "ne-NP",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  function savePosts() {
    const metadata = posts.map(({ mediaData, ...post }) => post);

    if (!writeJSON(POSTS_KEY, metadata)) return false;

    window.HamroState?.setPosts(posts);
    return true;
  }

  function saveStories() {
    if (!writeJSON(STORIES_KEY, stories)) return false;

    window.HamroState?.setStories(stories);
    return true;
  }

  /* =========================================================
     INDEXED DB — PHOTO / VIDEO STORAGE
     ========================================================= */

  function openMediaDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB उपलब्ध छैन।"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(MEDIA_STORE)) {
          database.createObjectStore(MEDIA_STORE, {
            keyPath: "id"
          });
        }
      };

      request.onsuccess = () => {
        db = request.result;
        dbReady = true;
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  function storeMedia(id, blob, type) {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        reject(new Error("Media database तयार छैन।"));
        return;
      }

      const transaction = db.transaction(MEDIA_STORE, "readwrite");

      transaction.objectStore(MEDIA_STORE).put({
        id,
        blob,
        type,
        createdAt: Date.now()
      });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function getMedia(id) {
    return new Promise((resolve, reject) => {
      if (!dbReady || !db) {
        reject(new Error("Media database उपलब्ध छैन।"));
        return;
      }

      const transaction = db.transaction(MEDIA_STORE, "readonly");
      const request = transaction.objectStore(MEDIA_STORE).get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  function deleteMedia(id) {
    if (!dbReady || !db || !id) return;

    try {
      const transaction = db.transaction(MEDIA_STORE, "readwrite");
      transaction.objectStore(MEDIA_STORE).delete(id);
    } catch (error) {
      console.warn("Media deletion failed:", error);
    }

    const url = objectURLs.get(id);

    if (url) {
      URL.revokeObjectURL(url);
      objectURLs.delete(id);
    }
  }

  async function getMediaURL(id) {
    if (objectURLs.has(id)) return objectURLs.get(id);

    const record = await getMedia(id);

    if (!record?.blob) return "";

    const url = URL.createObjectURL(record.blob);
    objectURLs.set(id, url);

    return url;
  }

  async function attachMediaToElements(root) {
    const elements = $$("[data-media-id]", root);

    for (const element of elements) {
      const id = element.dataset.mediaId;

      if (!id || element.dataset.mediaLoaded === "true") continue;

      try {
        const url = await getMediaURL(id);

        if (!url) continue;

        element.src = url;
        element.dataset.mediaLoaded = "true";

        if (element.tagName === "VIDEO") {
          element.load();
        }
      } catch (error) {
        console.warn("Media could not be displayed:", error);
      }
    }
  }

  /* =========================================================
     LOAD DATA
     ========================================================= */

  function loadPosts() {
    let saved = readJSON(POSTS_KEY, null);

    // Old-version compatibility.
    if (!Array.isArray(saved)) {
      const oldPosts = readJSON("hs_posts_v1", []);

      saved = Array.isArray(oldPosts)
        ? oldPosts
        : [];
    }

    return saved.sort((a, b) =>
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
    );
  }

  function loadStories() {
    const now = Date.now();

    return readJSON(STORIES_KEY, [])
      .filter(story =>
        story.expiresAt && story.expiresAt > now
      )
      .sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
  }

  function loadOtherData() {
    friends = readJSON(FRIENDS_KEY, []);
    messages = readJSON(MESSAGES_KEY, []);
    profile = readJSON(PROFILE_KEY, {
      name: "तपाईं",
      bio: "हाम्रो संसारमा स्वागत छ।"
    });
  }

  /* =========================================================
     THEME + SETTINGS
     ========================================================= */

  function getTheme() {
    return window.HamroTheme?.getTheme() ||
      document.documentElement.dataset.theme ||
      "light";
  }

  function applyTheme() {
    const selected =
      getTheme() === "dark" ? "dark" : "light";

    if (window.HamroTheme) {
      window.HamroTheme.applyTheme(selected);
    }

    return selected;
  }

  function toggleTheme() {
    const next = getTheme() === "dark" ? "light" : "dark";

    if (window.HamroTheme) {
      window.HamroTheme.applyTheme(next);
    } else {
      document.documentElement.dataset.theme = next;
    }

    toast(
      next === "dark"
        ? "Dark mode सक्रिय भयो।"
        : "Light mode सक्रिय भयो।",
      "success"
    );
  }

  function initializeLanguageControl() {
    if (!els.languageSelect) return;

    els.languageSelect.value = language();
  }

  /* =========================================================
     STORIES
     ========================================================= */

  function renderStories() {
    if (!els.storiesList) return;

    const addStory = `
      <button
        class="story-card"
        type="button"
        data-story-create="true">

        <span class="story-avatar">＋</span>
        <span class="story-name">${escapeHTML(
          language() === "en" ? "Add Story" : "स्टोरी थप्नुहोस्"
        )}</span>

      </button>
    `;

    const storyHTML = stories.map(story => `
      <button
        class="story-card"
        type="button"
        data-story-view="${escapeHTML(story.id)}">

        <span class="story-avatar">
          ${escapeHTML(story.initial || "स")}
        </span>

        <span class="story-name">
          ${escapeHTML(story.author || "सदस्य")}
        </span>

      </button>
    `).join("");

    els.storiesList.innerHTML = addStory + storyHTML;
  }

  function openStoryPicker() {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*,video/*";
    input.hidden = true;

    document.body.appendChild(input);

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.remove();

      if (!file) return;

      if (!file.type.startsWith("image/") &&
          !file.type.startsWith("video/")) {
        toast("फोटो वा भिडियो छान्नुहोस्।", "warning");
        return;
      }

      if (file.size > MAX_MEDIA_SIZE) {
        toast("फाइल १०० MB भन्दा सानो हुनुपर्छ।", "warning");
        return;
      }

      const id = makeId("story");

      try {
        await storeMedia(id, file, file.type);

        const story = {
          id,
          author: profile.name || "तपाईं",
          initial: (profile.name || "त").charAt(0),
          mediaType: file.type,
          createdAt: new Date().toISOString(),
          expiresAt: Date.now() + STORY_DURATION
        };

        stories.unshift(story);

        if (!saveStories()) {
          stories.shift();
          deleteMedia(id);
          return;
        }

        renderStories();
        toast("तपाईंको Story थपियो।", "success");

      } catch (error) {
        console.error(error);
        toast("Story सुरक्षित गर्न सकिएन।", "error");
      }
    });

    input.click();
  }

  function viewStory(id) {
    const story = stories.find(item => item.id === id);

    if (!story) return;

    let modal = $("#storyViewer");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "storyViewer";
      modal.className = "modal-backdrop";
      document.body.appendChild(modal);
    }

    const mediaTag = story.mediaType?.startsWith("video/")
      ? `<video data-media-id="${escapeHTML(id)}"
           controls autoplay playsinline
           style="width:100%;max-height:70vh"></video>`
      : `<img data-media-id="${escapeHTML(id)}"
           alt="Story"
           style="width:100%;max-height:70vh;object-fit:contain">`;

    modal.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <strong>${escapeHTML(story.author)}</strong>
          <button class="icon-button" type="button"
            data-close-story>×</button>
        </header>
        <div class="modal-body">
          ${mediaTag}
          <p class="post-time">${formatDate(story.createdAt)}</p>
        </div>
      </section>
    `;

    attachMediaToElements(modal);
  }

  /* =========================================================
     POST RENDERING
     ========================================================= */

  function renderPost(post) {
    const id = escapeHTML(post.id);
    const author = escapeHTML(post.author || "सदस्य");
    const initial = escapeHTML(post.authorInitial || "स");
    const content = escapeHTML(post.text || "");
    const date = escapeHTML(formatDate(post.createdAt));

    let mediaHTML = "";

    if (post.mediaId) {
      if (post.mediaType?.startsWith("video/")) {
        mediaHTML = `
          <video
            class="post-media"
            data-media-id="${escapeHTML(post.mediaId)}"
            controls
            playsinline>
          </video>
        `;
      } else {
        mediaHTML = `
          <img
            class="post-media"
            data-media-id="${escapeHTML(post.mediaId)}"
            alt="पोस्ट फोटो"
            loading="lazy">
        `;
      }
    } else if (post.mediaData) {
      const url = escapeHTML(post.mediaData);

      mediaHTML = post.mediaType?.startsWith("video/")
        ? `<video class="post-media" src="${url}" controls playsinline></video>`
        : `<img class="post-media" src="${url}" alt="पोस्ट फोटो" loading="lazy">`;
    }

    return `
      <article class="post-card" data-post-id="${id}">

        <header class="post-header">
          <div class="avatar">${initial}</div>

          <div class="post-author">
            <p class="post-author-name">${author}</p>
            <p class="post-time">${date}</p>
          </div>

          <button
            class="icon-button"
            type="button"
            data-post-menu="${id}"
            aria-label="पोस्ट विकल्प">⋯</button>
        </header>

        ${content
          ? `<div class="post-content">${content}</div>`
          : ""}

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

    const filtered = posts.filter(post => {
      const text = `${post.author || ""} ${post.text || ""}`
        .toLowerCase();

      return text.includes(searchQuery.toLowerCase());
    });

    els.feedList.innerHTML = filtered.map(renderPost).join("");

    els.emptyFeed.classList.toggle("hidden", filtered.length > 0);

    attachMediaToElements(els.feedList);
  }

  /* =========================================================
     POST COMPOSER
     ========================================================= */

  function openComposer() {
    if (!els.composerModal) return;

    els.composerModal.classList.remove("hidden");
    els.composerModal.setAttribute("aria-hidden", "false");

    setTimeout(() => els.postText?.focus(), 50);
  }

  function closeComposer() {
    els.composerModal?.classList.add("hidden");
    els.composerModal?.setAttribute("aria-hidden", "true");
  }

  function resetMedia() {
    selectedMedia = null;

    if (els.mediaInput) els.mediaInput.value = "";

    els.mediaPreview?.classList.add("hidden");
    els.imagePreview?.classList.add("hidden");
    els.videoPreview?.classList.add("hidden");

    if (els.imagePreview) els.imagePreview.removeAttribute("src");

    if (els.videoPreview) {
      els.videoPreview.pause();
      els.videoPreview.removeAttribute("src");
      els.videoPreview.load();
    }
  }

  function chooseMedia(type) {
    if (!els.mediaInput) return;

    els.mediaInput.accept =
      type === "image" ? "image/*" : "video/*";

    els.mediaInput.click();
  }

  function handleMedia(file) {
    if (!file) return;

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      toast("फोटो वा भिडियो छान्नुहोस्।", "warning");
      return;
    }

    if (file.size > MAX_MEDIA_SIZE) {
      toast("फाइल १०० MB भन्दा सानो हुनुपर्छ।", "warning");
      return;
    }

    selectedMedia = file;

    const url = URL.createObjectURL(file);

    els.mediaPreview?.classList.remove("hidden");

    if (file.type.startsWith("image/")) {
      els.imagePreview.src = url;
      els.imagePreview.classList.remove("hidden");
      els.videoPreview?.classList.add("hidden");
    } else {
      els.videoPreview.src = url;
      els.videoPreview.classList.remove("hidden");
      els.imagePreview?.classList.add("hidden");
    }
  }

  async function publishPost() {
    const text = els.postText?.value.trim() || "";

    if (!text && !selectedMedia) {
      toast("पोस्ट लेख्नुहोस् वा फोटो/भिडियो छान्नुहोस्।", "warning");
      return;
    }

    const button = els.publishButton;

    if (button) {
      button.disabled = true;
      button.textContent = "प्रकाशित हुँदैछ...";
    }

    const post = {
      id: makeId("post"),
      author: profile.name || "तपाईं",
      authorInitial: (profile.name || "त").charAt(0),
      text,
      mediaId: "",
      mediaType: "",
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false,
      comments: 0,
      shares: 0
    };

    try {
      if (selectedMedia) {
        post.mediaId = post.id;
        post.mediaType = selectedMedia.type;

        await storeMedia(post.mediaId, selectedMedia);
      }

      posts.unshift(post);

      if (!savePosts()) {
        posts.shift();
        deleteMedia(post.mediaId);
        return;
      }

      renderFeed();

      if (els.postText) els.postText.value = "";

      resetMedia();
      closeComposer();
      showPage("home");

      toast("पोस्ट प्रकाशित भयो।", "success");

    } catch (error) {
      console.error("Post publishing failed:", error);

      posts = posts.filter(item => item.id !== post.id);
      deleteMedia(post.mediaId);

      toast("पोस्ट सुरक्षित गर्न सकिएन। फेरि प्रयास गर्नुहोस्।", "error");

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "प्रकाशित गर्नुहोस्";
      }
    }
  }

  /* =========================================================
     POST ACTIONS
     ========================================================= */

  function updatePost(id, changes) {
    const old = posts;

    posts = posts.map(post =>
      post.id === id ? { ...post, ...changes } : post
    );

    if (!savePosts()) {
      posts = old;
      return;
    }

    renderFeed();
  }

  function handlePostAction(action, id) {
    const post = posts.find(item => item.id === id);
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
      toast("टिप्पणी सुविधा अर्को चरणमा जोडिनेछ।", "info");
      return;
    }

    if (action === "share") {
      const text = `${post.author}: ${post.text || "पोस्ट"}`;

      if (navigator.share) {
        navigator.share({
          title: "हाम्रो संसार",
          text
        }).catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => toast("पोस्ट Copy भयो।", "success"))
          .catch(() => toast("Copy गर्न सकिएन।", "error"));
      } else {
        toast("Share सुविधा उपलब्ध छैन।");
      }
    }
  }

  function postMenu(id) {
    const post = posts.find(item => item.id === id);
    if (!post) return;

    const action = prompt(
      "१ = Edit पोस्ट\n२ = Delete पोस्ट\n\nविकल्प लेख्नुहोस्।"
    );

    if (action === "1") {
      const updated = prompt("पोस्ट सम्पादन गर्नुहोस्:", post.text || "");

      if (updated === null) return;

      updatePost(id, { text: updated.trim() });
      toast("पोस्ट सम्पादन भयो।", "success");
    }

    if (action === "2") {
      if (!confirm("यो पोस्ट हटाउने हो?")) return;

      posts = posts.filter(item => item.id !== id);

      if (savePosts()) {
        deleteMedia(id);
        renderFeed();
        toast("पोस्ट हटाइयो।", "success");
      }
    }
  }

  /* =========================================================
     FRIENDS PAGE
     ========================================================= */

  function renderFriends() {
    const suggestions = [
      { id: "friend_1", name: "साथी १", initial: "स" },
      { id: "friend_2", name: "साथी २", initial: "क" },
      { id: "friend_3", name: "साथी ३", initial: "र" }
    ];

    const list = suggestions.filter(person =>
      !friends.some(friend => friend.id === person.id)
    );

    return `
      <section>
        <h3 class="section-title">तपाईंका साथीहरू</h3>

        ${friends.length ? friends.map(friend => `
          <div class="card" style="padding:12px;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar">${escapeHTML(friend.initial)}</div>
              <strong>${escapeHTML(friend.name)}</strong>
            </div>
          </div>
        `).join("") : `
          <div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <p>अहिलेसम्म साथी थपिएको छैन।</p>
          </div>
        `}

        <h3 class="section-title" style="margin-top:20px">
          साथी सुझाव
        </h3>

        ${list.map(person => `
          <div class="card" style="padding:12px;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar">${person.initial}</div>
              <strong style="flex:1">${person.name}</strong>
              <button class="btn btn-primary"
                type="button"
                data-add-friend="${person.id}">
                + साथी
              </button>
            </div>
          </div>
        `).join("")}
      </section>
    `;
  }

  function addFriend(id) {
    const names = {
      friend_1: { name: "साथी १", initial: "स" },
      friend_2: { name: "साथी २", initial: "क" },
      friend_3: { name: "साथी ३", initial: "र" }
    };

    const person = names[id];
    if (!person || friends.some(item => item.id === id)) return;

    friends.push({ id, ...person });

    if (!writeJSON(FRIENDS_KEY, friends)) {
      friends.pop();
      return;
    }

    renderPageContent("friends");
    toast("साथी थपियो।", "success");
  }

  /* =========================================================
     MESSAGES PAGE
     ========================================================= */

  function renderMessages() {
    if (activeChatId) {
      return renderChat(activeChatId);
    }

    const chatIds = [...new Set(messages.map(item => item.chatId))];

    return `
      <section>
        <h3 class="section-title">तपाईंका सन्देशहरू</h3>

        ${chatIds.length ? chatIds.map(id => {
          const last = messages.filter(item => item.chatId === id).at(-1);

          return `
            <button class="card"
              style="display:flex;width:100%;padding:14px;margin-bottom:10px;text-align:left;align-items:center;gap:12px"
              data-open-chat="${escapeHTML(id)}">

              <div class="avatar">👤</div>

              <div style="flex:1">
                <strong>${escapeHTML(last?.sender || "साथी")}</strong>
                <p class="post-time">${escapeHTML(last?.text || "")}</p>
              </div>

              <span>›</span>
            </button>
          `;
        }).join("") : `
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <p>अहिलेसम्म सन्देश छैन।</p>
          </div>
        `}

        <button class="btn btn-primary"
          type="button" data-demo-chat>
          Demo Chat खोल्नुहोस्
        </button>
      </section>
    `;
  }

  function renderChat(id) {
    const chatMessages = messages.filter(item => item.chatId === id);

    return `
      <section>
        <button class="btn btn-secondary"
          type="button" data-back-messages>
          ← सन्देशमा फर्कनुहोस्
        </button>

        <div style="padding:12px 0;min-height:180px">
          ${chatMessages.map(message => `
            <div class="card"
              style="padding:10px;margin:8px 0;max-width:85%">
              <strong>${escapeHTML(message.sender)}</strong>
              <p>${escapeHTML(message.text)}</p>
              <small class="post-time">${formatTime(message.createdAt)}</small>
            </div>
          `).join("")}
        </div>

        <form id="chatForm" style="display:flex;gap:8px">
          <input class="form-input" id="chatMessageInput"
            placeholder="सन्देश लेख्नुहोस्..." required>
          <button class="btn btn-primary" type="submit">पठाउनुहोस्</button>
        </form>
      </section>
    `;
  }

  function sendMessage(chatId, text) {
    messages.push({
      id: makeId("message"),
      chatId,
      sender: profile.name || "तपाईं",
      text,
      createdAt: new Date().toISOString()
    });

    if (!writeJSON(MESSAGES_KEY, messages)) {
      messages.pop();
      return;
    }

    renderPageContent("messages");
  }

  /* =========================================================
     PROFILE PAGE
     ========================================================= */

  function renderProfile() {
    const name = escapeHTML(profile.name || "तपाईं");
    const bio = escapeHTML(profile.bio || "");

    return `
      <section class="empty-state">
        <div class="avatar"
          style="width:78px;height:78px;font-size:28px;margin:auto">
          ${escapeHTML((profile.name || "त").charAt(0))}
        </div>

        <h2>${name}</h2>
        <p>${bio}</p>

        <p class="post-time">
          ${posts.length} पोस्ट
        </p>

        <button class="btn btn-primary"
          type="button" data-edit-profile>
          ✏️ प्रोफाइल सम्पादन
        </button>

        <div style="margin-top:16px">
          <button class="btn btn-secondary"
            type="button" data-open-settings>
            ⚙️ सेटिङ
          </button>
        </div>
      </section>

      <h3 class="section-title" style="margin-top:20px">
        मेरा पोस्टहरू
      </h3>

      <div>
        ${posts.filter(post => post.author === profile.name)
          .map(renderPost).join("")}
      </div>
    `;
  }

  function editProfile() {
    const name = prompt("तपाईंको नाम:", profile.name || "");
    if (name === null) return;

    const bio = prompt("तपाईंको परिचय:", profile.bio || "");
    if (bio === null) return;

    profile = {
      ...profile,
      name: name.trim() || "तपाईं",
      bio: bio.trim()
    };

    if (writeJSON(PROFILE_KEY, profile)) {
      renderPageContent("profile");
      toast("प्रोफाइल सुरक्षित भयो।", "success");
    }
  }

  /* =========================================================
     OTHER PAGES
     ========================================================= */

  function renderFallbackPage(page) {
    const pages = {
      notifications: `
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <h3>सूचनाहरू</h3>
          <p>अहिले नयाँ सूचना छैन।</p>
        </div>
      `,

      saved: `
        <div class="empty-state">
          <div class="empty-state-icon">🔖</div>
          <h3>सेभ गरिएका पोस्ट</h3>
          <p>अहिलेसम्म पोस्ट सेभ गरिएको छैन।</p>
        </div>
      `
    };

    return pages[page] || `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <p>यो पृष्ठ उपलब्ध छैन।</p>
      </div>
    `;
  }

  function renderPageContent(page) {
    if (!els.otherPageText) return;

    try {
      if (page === "friends") {
        els.otherPageText.innerHTML = renderFriends();
      } else if (page === "messages") {
        els.otherPageText.innerHTML = renderMessages();
      } else if (page === "profile") {
        els.otherPageText.innerHTML = renderProfile();
      } else {
        els.otherPageText.innerHTML = renderFallbackPage(page);
      }

      attachMediaToElements(els.otherPageText);

    } catch (error) {
      console.error("Page rendering failed:", error);

      els.otherPageText.innerHTML = `
        <div class="empty-state">
          <p>पृष्ठ खोल्न समस्या भयो।</p>
        </div>
      `;
    }
  }

  /* =========================================================
     NAVIGATION — SINGLE CONTROLLER
     ========================================================= */

  function setActiveNavigation(page) {
    const activePage = page === "posts" ? "home" : page;

    $$(".nav-item").forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.page === activePage
      );
    });
  }

  function showPage(page, options = {}) {
    if (page === "posts") page = "home";

    if (page === "create") {
      openComposer();
      return;
    }

    const allowed = [
      "home",
      "friends",
      "messages",
      "profile",
      "notifications",
      "saved",
      "settings"
    ];

    if (!allowed.includes(page)) return;

    if (page === "settings") {
      showPage("profile");
      openSettings();
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

    window.HamroState?.setCurrentPage(page);

    if (isHome) {
      renderStories();
      renderFeed();
      return;
    }

    const titles = {
      friends: "साथीहरू",
      messages: "सन्देशहरू",
      profile: "प्रोफाइल",
      notifications: "सूचनाहरू",
      saved: "सेभ गरिएका पोस्ट"
    };

    if (els.otherPageTitle) {
      els.otherPageTitle.textContent = titles[page] || "पृष्ठ";
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

  /* =========================================================
     SETTINGS
     ========================================================= */

  function openSettings() {
    if (!els.settingsModal) return;

    els.settingsModal.classList.remove("hidden");
    els.settingsModal.setAttribute("aria-hidden", "false");

    initializeLanguageControl();
  }

  function closeSettings() {
    els.settingsModal?.classList.add("hidden");
    els.settingsModal?.setAttribute("aria-hidden", "true");
  }

  function clearLocalPosts() {
    if (!confirm("यस उपकरणका सबै स्थानीय पोस्ट हटाउने हो?")) return;

    posts.forEach(post => deleteMedia(post.mediaId));

    posts = [];

    if (savePosts()) {
      renderFeed();
      closeSettings();
      toast("स्थानीय पोस्टहरू हटाइयो।", "success");
    }
  }

  /* =========================================================
     EVENT BINDING
     ========================================================= */

  function bindNavigationEvents() {
    // IMPORTANT:
    // Only the shared Navigation Controller handles button clicks.
    // app.js listens only for its navigation event.

    window.addEventListener("hamro:navigate", event => {
      const page = event.detail?.page;
      if (page) showPage(page, event.detail?.options || {});
    });

    window.addEventListener("hamro:open-composer", openComposer);

    els.notificationsToggle?.addEventListener("click", () => {
      navigate("notifications");
    });
  }

  function bindComposerEvents() {
    els.openComposer?.addEventListener("click", openComposer);
    els.quickText?.addEventListener("click", openComposer);

    els.quickPhoto?.addEventListener("click", () => {
      openComposer();
      chooseMedia("image");
    });

    els.quickVideo?.addEventListener("click", () => {
      openComposer();
      chooseMedia("video");
    });

    els.closeComposer?.addEventListener("click", closeComposer);
    els.cancelComposer?.addEventListener("click", closeComposer);

    els.composerModal?.addEventListener("click", event => {
      if (event.target === els.composerModal) closeComposer();
    });

    els.choosePhoto?.addEventListener("click", () => chooseMedia("image"));
    els.chooseVideo?.addEventListener("click", () => chooseMedia("video"));

    els.mediaInput?.addEventListener("change", event => {
      handleMedia(event.target.files?.[0]);
    });

    els.removeMedia?.addEventListener("click", resetMedia);
    els.publishButton?.addEventListener("click", publishPost);
  }

  function bindFeedEvents() {
    els.feedList?.addEventListener("click", event => {
      const action = event.target.closest("[data-post-action]");

      if (action) {
        handlePostAction(
          action.dataset.postAction,
          action.dataset.postId
        );
        return;
      }

      const menu = event.target.closest("[data-post-menu]");

      if (menu) postMenu(menu.dataset.postMenu);
    });
  }

  function bindStoryEvents() {
    els.storiesList?.addEventListener("click", event => {
      const create = event.target.closest("[data-story-create]");

      if (create) {
        openStoryPicker();
        return;
      }

      const story = event.target.closest("[data-story-view]");

      if (story) viewStory(story.dataset.storyView);
    });

    document.addEventListener("click", event => {
      if (event.target.closest("[data-close-story]")) {
        $("#storyViewer")?.remove();
      }
    });
  }

  function bindSearchEvents() {
    els.searchToggle?.addEventListener("click", () => {
      els.searchPanel?.classList.toggle("hidden");

      if (!els.searchPanel?.classList.contains("hidden")) {
        els.searchInput?.focus();
      }
    });

    els.searchInput?.addEventListener("input", () => {
      searchQuery = els.searchInput.value.trim();
      window.HamroState?.setSearchQuery(searchQuery);
      renderFeed();
    });
  }

  function bindSettingsEvents() {
    els.settingsToggle?.addEventListener("click", openSettings);
    els.closeSettings?.addEventListener("click", closeSettings);

    els.settingsModal?.addEventListener("click", event => {
      if (event.target === els.settingsModal) closeSettings();
    });

    els.settingsThemeToggle?.addEventListener("click", toggleTheme);
    els.clearPosts?.addEventListener("click", clearLocalPosts);

    els.languageSelect?.addEventListener("change", () => {
      const selected = els.languageSelect.value === "en" ? "en" : "ne";

      window.HamroSettings?.updateSettings({
        language: selected
      });

      window.HamroLanguage?.setLanguage(selected);

      toast(
        selected === "en"
          ? "Language updated."
          : "भाषा परिवर्तन भयो।",
        "success"
      );
    });
  }

  function bindOtherPageEvents() {
    els.otherPageText?.addEventListener("click", event => {
      const addButton = event.target.closest("[data-add-friend]");

      if (addButton) {
        addFriend(addButton.dataset.addFriend);
        return;
      }

      if (event.target.closest("[data-edit-profile]")) {
        editProfile();
        return;
      }

      if (event.target.closest("[data-open-settings]")) {
        openSettings();
        return;
      }

      if (event.target.closest("[data-demo-chat]")) {
        activeChatId = "demo_chat";
        showPage("messages", { keepChat: true });
        return;
      }

      const chatButton = event.target.closest("[data-open-chat]");

      if (chatButton) {
        activeChatId = chatButton.dataset.openChat;
        showPage("messages", { keepChat: true });
        return;
      }

      if (event.target.closest("[data-back-messages]")) {
        activeChatId = null;
        showPage("messages");
      }
    });

    els.otherPageText?.addEventListener("submit", event => {
      if (event.target.id !== "chatForm") return;

      event.preventDefault();

      const input = $("#chatMessageInput", event.target);
      const text = input?.value.trim();

      if (!text || !activeChatId) return;

      sendMessage(activeChatId, text);
    });
  }

  function bindKeyboardEvents() {
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeComposer();
        closeSettings();
        $("#storyViewer")?.remove();
      }
    });
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  async function initialize() {
    if (initialized) return;
    initialized = true;

    try {
      await openMediaDatabase();
    } catch (error) {
      console.warn("Media database unavailable:", error);
    }

    posts = loadPosts();
    stories = loadStories();

    loadOtherData();

    if (window.HamroTheme) {
      window.HamroTheme.initializeTheme();
    }

    initializeLanguageControl();

    window.HamroState?.setPosts(posts);
    window.HamroState?.setStories(stories);

    renderStories();
    renderFeed();

    bindNavigationEvents();
    bindComposerEvents();
    bindFeedEvents();
    bindStoryEvents();
    bindSearchEvents();
    bindSettingsEvents();
    bindOtherPageEvents();
    bindKeyboardEvents();

    showPage("home");

    window.addEventListener("hamro:language-change", () => {
      renderStories();
      renderFeed();

      if (currentPage !== "home") {
        renderPageContent(currentPage);
      }
    });

    window.HamroApp = Object.freeze({
      showPage,
      navigate,
      openComposer,
      closeComposer,
      openSettings,
      toggleTheme,

      getCurrentPage() {
        return currentPage;
      },

      getPosts() {
        return [...posts];
      },

      getStories() {
        return [...stories];
      },

      refreshFeed() {
        posts = loadPosts();
        renderFeed();
      }
    });

    console.info("Hamro Sansar initialized successfully.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

})();
