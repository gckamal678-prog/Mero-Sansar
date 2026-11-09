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
   * UPDATE APPLICATION STATE
   *
   * Preference changes are forwarded to KSKSettings.
   *
   * IMPORTANT:
   * State changes are accepted only after
   * successful settings persistence.
   */

  function setState(
    updates = {},
    changeName = "state-change"
  ) {
    if (!isObject(updates)) {
      return false;
    }

    let changed = false;

    const preferenceUpdates = {};

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "theme"
      )
    ) {
      preferenceUpdates.theme =
        updates.theme === "dark" ? "dark" : "light";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "language"
      )
    ) {
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

    /*
     * PERSISTENT SETTINGS UPDATE
     *
     * Do not report success unless KSKSettings
     * confirms that settings were saved.
     */

    if (Object.keys(preferenceUpdates).length) {
      if (
        typeof global.KSKSettings?.updateSettings !==
        "function"
      ) {
        console.error(
          "KSKState: KSKSettings is not available."
        );

        return false;
      }

      let settingsResult;

      try {
        settingsResult =
          global.KSKSettings.updateSettings(
            preferenceUpdates
          );
      } catch (error) {
        console.error(
          "KSKState: Settings update failed.",
          error
        );

        return false;
      }

      /*
       * KSKSettings.updateSettings()
       * returns false when persistence fails.
       * Successful updates return settings object.
       */

      if (
        settingsResult === false ||
        !isObject(settingsResult)
      ) {
        console.error(
          "KSKState: Settings were not saved. State update cancelled."
        );

        return false;
      }

      changed = true;
    }

    /*
     * TEMPORARY APPLICATION STATE
     */

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

    if (!changed) {
      return false;
    }

    notify(changeName);

    return true;
  }

  /*
   * SUBSCRIBE TO STATE CHANGES
   */

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

  /*
   * THEME
   */

  function setTheme(value) {
    if (
      typeof global.KSKSettings?.updateSetting !==
      "function"
    ) {
      return false;
    }

    return global.KSKSettings.updateSetting(
      "theme",
      value === "dark" ? "dark" : "light"
    );
  }

  /*
   * LANGUAGE
   */

  function setLanguage(value) {
    if (
      typeof global.KSKSettings?.updateSetting !==
      "function"
    ) {
      return false;
    }

    return global.KSKSettings.updateSetting(
      "language",
      value === "en" ? "en" : "ne"
    );
  }

  /*
   * PAGE
   */

  function setCurrentPage(page) {
    return setState(
      {
        currentPage: page
      },
      "page-change"
    );
  }

  /*
   * SEARCH
   */

  function setSearchQuery(query) {
    return setState(
      {
        searchQuery: query
      },
      "search-change"
    );
  }

  /*
   * RESET TEMPORARY APPLICATION STATE
   *
   * Saved user preferences remain unchanged.
   */

  function resetState() {
    state.currentPage = "home";
    state.searchQuery = "";
    state.lastDataChange = null;

    notify("state-reset");

    return getState();
  }

  /*
   * PUBLIC API
   */

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
