"use strict";

/* HAMRO SANSAR — GLOBAL APPLICATION STATE */

(function (global) {
  const STORAGE_KEY = "hs_global_state_v1";

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
    }
  };

  function readStorage() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) : {};
    } catch (error) {
      console.error("State storage read failed:", error);
      return {};
    }
  }

  function validTheme(value) {
    return value === "dark" ? "dark" : "light";
  }

  function validLanguage(value) {
    return value === "en" ? "en" : "ne";
  }

  const saved = readStorage();

  let state = {
    ...DEFAULT_STATE,
    ...saved,
    theme: validTheme(saved.theme),
    language: validLanguage(saved.language),
    settings: {
      ...DEFAULT_STATE.settings,
      ...(saved.settings || {})
    }
  };

  const listeners = new Set();

  function getState() {
    return {
      ...state,
      settings: { ...state.settings },
      posts: [...state.posts],
      stories: [...state.stories],
      friends: [...state.friends],
      friendRequests: [...state.friendRequests],
      notifications: [...state.notifications],
      messages: [...state.messages],
      groups: [...state.groups]
    };
  }

  function persist() {
    try {
      const data = {
        theme: state.theme,
        language: state.language,
        currentPage: state.currentPage,
        settings: state.settings
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("State storage write failed:", error);
      return false;
    }
  }

  function notify(changeName) {
    const snapshot = getState();

    listeners.forEach((listener) => {
      try {
        listener(snapshot, changeName);
      } catch (error) {
        console.error("State listener error:", error);
      }
    });

    global.dispatchEvent(
      new CustomEvent("hamro:state-change", {
        detail: {
          state: snapshot,
          change: changeName
        }
      })
    );
  }

  function setState(updates = {}, changeName = "state-change") {
    if (!updates || typeof updates !== "object") {
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

    if (updates.theme !== undefined) {
      state.theme = validTheme(updates.theme);
    }

    if (updates.language !== undefined) {
      state.language = validLanguage(updates.language);
    }

    persist();
    notify(changeName);

    return true;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Listener must be a function.");
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
      { currentPage: page },
      "page-change"
    );
  }

  function setSearchQuery(query) {
    return setState(
      { searchQuery: String(query || "") },
      "search-change"
    );
  }

  function setPosts(posts) {
    return setState(
      { posts: Array.isArray(posts) ? [...posts] : [] },
      "posts-change"
    );
  }

  function setStories(stories) {
    return setState(
      { stories: Array.isArray(stories) ? [...stories] : [] },
      "stories-change"
    );
  }

  function setFriends(friends) {
    return setState(
      { friends: Array.isArray(friends) ? [...friends] : [] },
      "friends-change"
    );
  }

  function setNotifications(notifications) {
    return setState(
      {
        notifications: Array.isArray(notifications)
          ? [...notifications]
          : []
      },
      "notifications-change"
    );
  }

  function setMessages(messages) {
    return setState(
      { messages: Array.isArray(messages) ? [...messages] : [] },
      "messages-change"
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

  const api = {
    get state() {
      return state;
    },

    getState,
    setState,
    subscribe,
    setTheme,
    setLanguage,
    setCurrentPage,
    setSearchQuery,
    setPosts,
    setStories,
    setFriends,
    setNotifications,
    setMessages,
    resetState
  };

  global.HamroState = api;
  global.appState = api;

})(window);
