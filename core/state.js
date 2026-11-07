"use strict";

/*
 * KSK GLOBAL APPLICATION STATE
 *
 * OWNER:
 * - Current page
 * - Search query
 * - Last data change
 *
 * PERSISTENT SETTINGS:
 * - Owned exclusively by KSKSettings
 *
 * No localStorage persistence in this module.
 */

(function (global) {
  "use strict";

  if (global.KSKState) return;

  const listeners = new Set();

  const state = {
    currentPage: "home",
    searchQuery: "",
    lastDataChange: null
  };

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function getSettings() {
    return global.KSKSettings?.getSettings?.() || {
      theme: "light",
      language: "ne",
      notifications: true,
      compactMode: false
    };
  }

  function getState() {
    const settings = getSettings();

    return {
      theme: settings.theme,
      language: settings.language,

      currentPage: state.currentPage,
      searchQuery: state.searchQuery,

      settings: {
        notifications: settings.notifications,
        compactMode: settings.compactMode
      },

      lastDataChange: clone(state.lastDataChange)
    };
  }

  function notify(changeName) {
    const snapshot = getState();

    listeners.forEach(listener => {
      try {
        listener(snapshot, changeName);
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

  /*
   * Update application state.
   * Preference changes are forwarded to KSKSettings.
   */

  function setState(updates = {}, changeName = "state-change") {
    if (!isObject(updates)) return false;

    let changed = false;

    const preferenceUpdates = {};

    if (Object.prototype.hasOwnProperty.call(updates, "theme")) {
      preferenceUpdates.theme =
        updates.theme === "dark" ? "dark" : "light";
    }

    if (Object.prototype.hasOwnProperty.call(updates, "language")) {
      preferenceUpdates.language =
        updates.language === "en" ? "en" : "ne";
    }

    if (isObject(updates.settings)) {
      if (
        Object.prototype.hasOwnProperty.call(
          updates.settings,
          "notifications"
        )
      ) {
        preferenceUpdates.notifications =
          updates.settings.notifications !== false;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updates.settings,
          "compactMode"
        )
      ) {
        preferenceUpdates.compactMode =
          updates.settings.compactMode === true;
      }
    }

    if (Object.keys(preferenceUpdates).length) {
      if (!global.KSKSettings?.updateSettings) {
        console.error(
          "KSKState: KSKSettings is not available."
        );

        return false;
      }

      global.KSKSettings.updateSettings(
        preferenceUpdates
      );

      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "currentPage"
      )
    ) {
      const page = String(
        updates.currentPage || "home"
      ).trim();

      if (page) {
        state.currentPage = page;
        changed = true;
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "searchQuery"
      )
    ) {
      state.searchQuery = String(
        updates.searchQuery ?? ""
      ).slice(0, 500);

      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "lastDataChange"
      )
    ) {
      state.lastDataChange = isObject(
        updates.lastDataChange
      )
        ? clone(updates.lastDataChange)
        : null;

      changed = true;
    }

    if (!changed) return false;

    notify(changeName);

    return true;
  }

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

  function setTheme(value) {
    if (!global.KSKSettings?.updateSetting) return false;

    return global.KSKSettings.updateSetting(
      "theme",
      value === "dark" ? "dark" : "light"
    );
  }

  function setLanguage(value) {
    if (!global.KSKSettings?.updateSetting) return false;

    return global.KSKSettings.updateSetting(
      "language",
      value === "en" ? "en" : "ne"
    );
  }

  function setCurrentPage(page) {
    return setState({
      currentPage: page
    }, "page-change");
  }

  function setSearchQuery(query) {
    return setState({
      searchQuery: query
    }, "search-change");
  }

  /*
   * Resets temporary application state only.
   * Saved user preferences remain unchanged.
   */

  function resetState() {
    state.currentPage = "home";
    state.searchQuery = "";
    state.lastDataChange = null;

    notify("state-reset");

    return getState();
  }

  global.KSKState = Object.freeze({
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

  console.info(
    "KSKState initialized successfully."
  );

})(window);
