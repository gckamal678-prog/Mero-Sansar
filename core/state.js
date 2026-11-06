
"use strict";

/* =========================================================
   KSK — GLOBAL APPLICATION STATE
   Version: 2.0

   RESPONSIBILITY:
   - Current page
   - Search query
   - Theme state
   - Language state
   - UI preferences mirror
   - Last data-change information

   IMPORTANT:
   Persistent application data belongs ONLY to KSKData.

   KSKState does NOT own:
   - Posts
   - Stories
   - Friends
   - Messages
   - Notifications
   - Profile data
========================================================= */

(function (global) {

  if (global.KSKState) return;


  /* =====================================================
     CONFIGURATION
  ===================================================== */

  const STORAGE_KEY = "ksk_global_state_v1";


  /* =====================================================
     DEFAULT STATE
  ===================================================== */

  const DEFAULT_STATE = Object.freeze({

    theme: "light",

    language: "ne",

    currentPage: "home",

    searchQuery: "",

    settings: {
      notifications: true,
      compactMode: false
    },

    lastDataChange: null

  });


  const listeners = new Set();


  /* =====================================================
     VALIDATION HELPERS
  ===================================================== */

  function isObject(value) {

    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );

  }


  function validTheme(value) {

    return value === "dark"
      ? "dark"
      : "light";

  }


  function validLanguage(value) {

    return value === "en"
      ? "en"
      : "ne";

  }


  function validPage(value) {

    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      return "home";
    }

    return value.trim();

  }


  function validSearchQuery(value) {

    return String(value ?? "")
      .slice(0, 500);

  }


  function cloneObject(value) {

    if (!isObject(value)) {
      return {};
    }

    try {

      return JSON.parse(
        JSON.stringify(value)
      );

    } catch (error) {

      return {};

    }

  }


  /* =====================================================
     STORAGE
  ===================================================== */

  function readStorage() {

    try {

      const raw = global.localStorage.getItem(
        STORAGE_KEY
      );

      if (!raw) return {};

      const parsed = JSON.parse(raw);

      return isObject(parsed)
        ? parsed
        : {};

    } catch (error) {

      console.warn(
        "KSKState: Unable to read saved state.",
        error
      );

      return {};

    }

  }


  function persist() {

    try {

      const persistentState = {

        theme: state.theme,

        language: state.language,

        currentPage: state.currentPage,

        settings: {
          ...state.settings
        }

      };


      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(persistentState)
      );

      return true;

    } catch (error) {

      console.warn(
        "KSKState: Unable to save state.",
        error
      );

      return false;

    }

  }


  /* =====================================================
     INITIAL STATE
  ===================================================== */

  const saved = readStorage();


  let state = {

    theme: validTheme(saved.theme),

    language: validLanguage(saved.language),

    currentPage: validPage(saved.currentPage),

    searchQuery: "",

    settings: {

      ...DEFAULT_STATE.settings,

      ...(isObject(saved.settings)
        ? saved.settings
        : {})

    },

    lastDataChange: null

  };


  /* =====================================================
     STATE SNAPSHOT
  ===================================================== */

  function getState() {

    return {

      theme: state.theme,

      language: state.language,

      currentPage: state.currentPage,

      searchQuery: state.searchQuery,

      settings: {
        ...state.settings
      },

      lastDataChange: state.lastDataChange
        ? cloneObject(state.lastDataChange)
        : null

    };

  }


  /* =====================================================
     NOTIFICATION
  ===================================================== */

  function notify(changeName) {

    const snapshot = getState();


    listeners.forEach(listener => {

      try {

        listener(
          snapshot,
          changeName
        );

      } catch (error) {

        console.error(
          "KSKState listener error:",
          error
        );

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


  /* =====================================================
     UPDATE STATE
  ===================================================== */

  function setState(
    updates = {},
    changeName = "state-change"
  ) {

    if (!isObject(updates)) {
      return false;
    }


    /*
      Only UI/application state is accepted.

      Entity data such as posts, stories,
      friends and messages must use KSKData.
    */

    const next = {};


    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "theme"
      )
    ) {

      next.theme = validTheme(
        updates.theme
      );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "language"
      )
    ) {

      next.language = validLanguage(
        updates.language
      );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "currentPage"
      )
    ) {

      next.currentPage = validPage(
        updates.currentPage
      );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "searchQuery"
      )
    ) {

      next.searchQuery = validSearchQuery(
        updates.searchQuery
      );

    }


    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "settings"
      ) &&
      isObject(updates.settings)
    ) {

      next.settings = {

        ...state.settings,

        ...updates.settings

      };

    }


    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "lastDataChange"
      )
    ) {

      next.lastDataChange =
        isObject(updates.lastDataChange)
          ? cloneObject(updates.lastDataChange)
          : null;

    }


    if (Object.keys(next).length === 0) {
      return false;
    }


    state = {

      ...state,

      ...next

    };


    persist();

    notify(changeName);

    return true;

  }


  /* =====================================================
     SUBSCRIBE
  ===================================================== */

  function subscribe(listener) {

    if (typeof listener !== "function") {

      throw new TypeError(
        "KSKState.subscribe requires a function."
      );

    }


    listeners.add(listener);


    return function unsubscribe() {

      listeners.delete(listener);

    };

  }


  /* =====================================================
     THEME
  ===================================================== */

  function setTheme(value) {

    return setState(

      {
        theme: validTheme(value)
      },

      "theme-change"

    );

  }


  /* =====================================================
     LANGUAGE
  ===================================================== */

  function setLanguage(value) {

    return setState(

      {
        language: validLanguage(value)
      },

      "language-change"

    );

  }


  /* =====================================================
     NAVIGATION
  ===================================================== */

  function setCurrentPage(page) {

    if (
      typeof page !== "string" ||
      !page.trim()
    ) {
      return false;
    }


    return setState(

      {
        currentPage: page.trim()
      },

      "page-change"

    );

  }


  /* =====================================================
     SEARCH
  ===================================================== */

  function setSearchQuery(query) {

    return setState(

      {
        searchQuery: validSearchQuery(query)
      },

      "search-change"

    );

  }


  /* =====================================================
     RESET
  ===================================================== */

  function resetState() {

    state = {

      theme: DEFAULT_STATE.theme,

      language: DEFAULT_STATE.language,

      currentPage: DEFAULT_STATE.currentPage,

      searchQuery: "",

      settings: {
        ...DEFAULT_STATE.settings
      },

      lastDataChange: null

    };


    persist();

    notify("state-reset");

    return getState();

  }


  /* =====================================================
     PUBLIC API
  ===================================================== */

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


    resetState

  });


  /* =====================================================
     REGISTER GLOBAL API
  ===================================================== */

  global.KSKState = KSKState;


  console.info(
    "KSKState initialized successfully."
  );


})(window);
