"use strict";

/* Hamro Sansar — Shared App State */
(function (global) {
  const STORAGE_KEYS = Object.freeze({
    theme: "hs_theme_v1",
    language: "hs_language_v1",
    posts: "hs_posts_v1"
  });

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error("Storage write failed:", error);
      return false;
    }
  }

  function readPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.posts);
      const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  const state = {
    theme: readStorage(STORAGE_KEYS.theme, "light") === "dark"
      ? "dark"
      : "light",
    language: readStorage(STORAGE_KEYS.language, "ne") === "en"
      ? "en"
      : "ne",
    currentPage: "home",
    searchQuery: "",
    posts: readPosts(),
    selectedMedia: null
  };

  const listeners = new Set();

  function notify(changeName) {
    listeners.forEach((listener) => {
      try {
        listener(state, changeName);
      } catch (error) {
        console.error("State listener error:", error);
      }
    });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Listener must be a function.");
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setState(updates, changeName = "state-change") {
    if (!updates || typeof updates !== "object") return false;
    Object.assign(state, updates);
    notify(changeName);
    return true;
  }

  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") return false;

    state.theme = theme;
    writeStorage(STORAGE_KEYS.theme, theme);
    notify("theme-change");
    return true;
  }

  function setLanguage(language) {
    if (language !== "ne" && language !== "en") return false;

    state.language = language;
    writeStorage(STORAGE_KEYS.language, language);
    notify("language-change");
    return true;
  }

  function setPosts(posts) {
    if (!Array.isArray(posts)) return false;

    state.posts = posts;
    const saved = writeStorage(
      STORAGE_KEYS.posts,
      JSON.stringify(posts)
    );

    notify("posts-change");
    return saved;
  }

  function addPost(post) {
    if (!post || typeof post !== "object") return false;
    return setPosts([post, ...state.posts]);
  }

  function updatePost(postId, updater) {
    if (typeof updater !== "function") return false;

    const next = state.posts.map((post) =>
      String(post.id) === String(postId)
        ? updater({ ...post })
        : post
    );

    return setPosts(next);
  }

  function removePost(postId) {
    return setPosts(
      state.posts.filter(
        (post) => String(post.id) !== String(postId)
      )
    );
  }

  function setCurrentPage(page) {
    if (typeof page !== "string" || !page.trim()) return false;

    state.currentPage = page;
    notify("navigation-change");
    return true;
  }

  function setSearchQuery(query) {
    state.searchQuery = String(query || "");
    notify("search-change");
  }

  function setSelectedMedia(media) {
    state.selectedMedia = media || null;
    notify("media-change");
  }

  global.HamroState = Object.freeze({
    state,
    subscribe,
    setState,
    setTheme,
    setLanguage,
    setPosts,
    addPost,
    updatePost,
    removePost,
    setCurrentPage,
    setSearchQuery,
    setSelectedMedia,
    storageKeys: STORAGE_KEYS
  });
})(window);
