"use strict";

/*
 * Shared application state.
 * Do not store passwords, tokens, or private user information here.
 */

(function (global) {
  const STORAGE_KEYS = Object.freeze({
    theme: "hamroSansar.theme",
    language: "hamroSansar.language",
    posts: "hamroSansar.posts"
  });

  function safeRead(key, fallback) {
    try {
      const value = global.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function readPosts() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEYS.posts);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const state = {
    theme: safeRead(STORAGE_KEYS.theme, "light"),
    language: safeRead(STORAGE_KEYS.language, "ne"),
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
      throw new TypeError("State listener must be a function.");
    }

    listeners.add(listener);

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function setState(updates, changeName = "state-change") {
    if (!updates || typeof updates !== "object") return;

    Object.assign(state, updates);
    notify(changeName);
  }

  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") return false;

    state.theme = theme;
    safeWrite(STORAGE_KEYS.theme, theme);
    notify("theme-change");
    return true;
  }

  function setLanguage(language) {
    if (language !== "ne" && language !== "en") return false;

    state.language = language;
    safeWrite(STORAGE_KEYS.language, language);
    notify("language-change");
    return true;
  }

  function setPosts(posts) {
    if (!Array.isArray(posts)) return false;

    state.posts = posts;

    const saved = safeWrite(STORAGE_KEYS.posts, JSON.stringify(posts));
    notify("posts-change");
    return saved;
  }

  function addPost(post) {
    if (!post || typeof post !== "object") return false;

    const nextPosts = [post, ...state.posts];
    return setPosts(nextPosts);
  }

  function updatePost(postId, updater) {
    if (typeof updater !== "function") return false;

    const updated = state.posts.map((post) => {
      if (String(post.id) !== String(postId)) return post;
      return updater({ ...post });
    });

    return setPosts(updated);
  }

  function removePost(postId) {
    const updated = state.posts.filter(
      (post) => String(post.id) !== String(postId)
    );

    return setPosts(updated);
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
