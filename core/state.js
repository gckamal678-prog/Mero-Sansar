
"use strict";

/* =========================================================
   KSK — GLOBAL APPLICATION STATE
   Single shared state for the entire application.
   Persistent data belongs to KSKData, not this state layer.
========================================================= */

(function (global) {
  const STORAGE_KEY = "ksk_global_state_v1";

  const DEFAULT_STATE = {
    user: null,
    theme: "light",
    language: "ne",
    currentPage: "home",
    searchQuery: "",

    posts: [],
    stories: [],
    friends: [],
    friendRequests: [],
    notifications: [],
    messages: [],
    groups: [],

    settings: {
      notifications: true,
      compactMode: false
    },

    lastDataChange: null
  };

  const listeners = new Set();

  function readStorage() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("KSKState: Unable to read saved settings.", error);
      return {};
    }
  }

  function validTheme(value) {
    return value === "dark" ? "dark" : "light";
  }

  function validLanguage(value) {
    return value === "en" ? "en" : "ne";
  }

  function validPage(value) {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : "home";
  }

  function copyArray(value) {
    return Array.isArray(value)
      ? value.map(item =>
          item && typeof item === "object"
            ? { ...item }
            : item
        )
      : [];
  }

  const saved = readStorage();

  let state = {
    ...DEFAULT_STATE,
    theme: validTheme(saved.theme),
    language: validLanguage(saved.language),
    currentPage: validPage(saved.currentPage),

    settings: {
      ...DEFAULT_STATE.settings,
      ...(saved.settings || {})
    }
  };

  function getState() {
    return {
      ...state,

      posts: copyArray(state.posts),
      stories: copyArray(state.stories),
      friends: copyArray(state.friends),
      friendRequests: copyArray(state.friendRequests),
      notifications: copyArray(state.notifications),
      messages: copyArray(state.messages),
      groups: copyArray(state.groups),

      settings: { ...state.settings }
    };
  }

  function persist() {
    try {
      const persistentState = {
        theme: state.theme,
        language: state.language,
        currentPage: state.currentPage,
        settings: { ...state.settings }
      };

      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(persistentState)
      );

      return true;
    } catch (error) {
      console.warn("KSKState: Unable to save settings.", error);
      return false;
    }
  }

  function notify(changeName) {
    const snapshot = getState();

    listeners.forEach(listener => {
      try {
        listener(snapshot, changeName);
      } catch (error) {
        console.error("KSKState listener error:", error);
      }
    });

    global.dispatchEvent(
      new CustomEvent("ksk:state-change", {
        detail: {
          state: snapshot,
          change: changeName
        }
      })
    );
  }

  function setState(updates = {}, changeName = "state-change") {
    if (
      !updates ||
      typeof updates !== "object" ||
      Array.isArray(updates)
    ) {
      return false;
    }

    state = {
      ...state,
      ...updates,

      settings: {
        ...state.settings,
        ...(updates.settings || {})
      }
    };

    state.theme = validTheme(state.theme);
    state.language = validLanguage(state.language);
    state.currentPage = validPage(state.currentPage);

    if (!Array.isArray(state.posts)) state.posts = [];
    if (!Array.isArray(state.stories)) state.stories = [];
    if (!Array.isArray(state.friends)) state.friends = [];
    if (!Array.isArray(state.friendRequests)) {
      state.friendRequests = [];
    }
    if (!Array.isArray(state.notifications)) {
      state.notifications = [];
    }
    if (!Array.isArray(state.messages)) state.messages = [];
    if (!Array.isArray(state.groups)) state.groups = [];

    persist();
    notify(changeName);

    return true;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("KSKState.subscribe requires a function.");
    }

    listeners.add(listener);

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function setTheme(value) {
    return setState(
      { theme: validTheme(value) },
      "theme-change"
    );
  }

  function setLanguage(value) {
    return setState(
      { language: validLanguage(value) },
      "language-change"
    );
  }

  function setCurrentPage(page) {
    if (typeof page !== "string" || !page.trim()) {
      return false;
    }

    return setState(
      { currentPage: page.trim() },
      "page-change"
    );
  }

  function setSearchQuery(query) {
    return setState(
      { searchQuery: String(query ?? "") },
      "search-change"
    );
  }

  function setPosts(posts) {
    return setState(
      { posts: copyArray(posts) },
      "posts-change"
    );
  }

  function setStories(stories) {
    return setState(
      { stories: copyArray(stories) },
      "stories-change"
    );
  }

  function setFriends(friends) {
    return setState(
      { friends: copyArray(friends) },
      "friends-change"
    );
  }

  function setFriendRequests(requests) {
    return setState(
      { friendRequests: copyArray(requests) },
      "friend-requests-change"
    );
  }

  function setNotifications(notifications) {
    return setState(
      { notifications: copyArray(notifications) },
      "notifications-change"
    );
  }

  function setMessages(messages) {
    return setState(
      { messages: copyArray(messages) },
      "messages-change"
    );
  }

  function setGroups(groups) {
    return setState(
      { groups: copyArray(groups) },
      "groups-change"
    );
  }

  function setUser(user) {
    return setState(
      { user: user && typeof user === "object" ? { ...user } : null },
      "user-change"
    );
  }

  function resetState() {
    state = {
      ...DEFAULT_STATE,
      settings: { ...DEFAULT_STATE.settings }
    };

    persist();
    notify("state-reset");

    return getState();
  }

  const KSKState = Object.freeze({
    get state() {
      return getState();
    },

    getState,
    setState,
    subscribe,

    setTheme,
    setLanguage,
    setCurrentPage,
    setSearchQuery,
    setUser,

    setPosts,
    setStories,
    setFriends,
    setFriendRequests,
    setNotifications,
    setMessages,
    setGroups,

    resetState
  });

  global.KSKState = KSKState;

})(window);
