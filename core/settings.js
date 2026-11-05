"use strict";

/* =========================================================
   KSK — CENTRAL SETTINGS MANAGER
   Shared settings for theme, language and app preferences.
========================================================= */

(function (global) {
  const STORAGE_KEY = "ksk_app_settings";
  const LEGACY_STORAGE_KEY = "ksk_app_settings_old"; // hs_ को सट्टा ksk_ प्रयोग गरिएको

  const DEFAULT_SETTINGS = Object.freeze({
    theme: "light",
    language: "ne",
    notifications: true,
    compactMode: false
  });

  const listeners = new Set();

  function normalizeSettings(input = {}) {
    return {
      theme: input.theme === "dark" ? "dark" : "light",
      language: input.language === "en" ? "en" : "ne",
      notifications: input.notifications !== false,
      compactMode: input.compactMode === true
    };
  }

  function readStorage() {
    try {
      let saved = global.localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        saved = global.localStorage.getItem(LEGACY_STORAGE_KEY);

        if (saved) {
          global.localStorage.setItem(STORAGE_KEY, saved);
        }
      }

      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn("KSKSettings: Unable to load settings.", error);
      return {};
    }
  }

  let settings = normalizeSettings(readStorage());

  function getSettings() {
    return { ...settings };
  }

  function persist() {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );

      return true;
    } catch (error) {
      console.warn("KSKSettings: Unable to save settings.", error);
      return false;
    }
  }

  function notify(changeName = "settings-change") {
    const snapshot = getSettings();

    listeners.forEach(listener => {
      try {
        listener(snapshot, changeName);
      } catch (error) {
        console.error("KSKSettings listener error:", error);
      }
    });

    global.dispatchEvent(
      new CustomEvent("ksk:settings-change", {
        detail: {
          settings: snapshot,
          change: changeName
        }
      })
    );
  }

  function syncGlobalState(changeName) {
    if (!global.KSKState) return;

    global.KSKState.setState({
      theme: settings.theme,
      language: settings.language,
      settings: {
        notifications: settings.notifications,
        compactMode: settings.compactMode
      }
    }, changeName);
  }

  function updateSettings(values = {}) {
    if (
      !values ||
      typeof values !== "object" ||
      Array.isArray(values)
    ) {
      return getSettings();
    }

    const next = { ...settings };

    if (Object.prototype.hasOwnProperty.call(values, "theme")) {
      next.theme = values.theme === "dark" ? "dark" : "light";
    }

    if (Object.prototype.hasOwnProperty.call(values, "language")) {
      next.language = values.language === "en" ? "en" : "ne";
    }

    if (Object.prototype.hasOwnProperty.call(values, "notifications")) {
      next.notifications = Boolean(values.notifications);
    }

    if (Object.prototype.hasOwnProperty.call(values, "compactMode")) {
      next.compactMode = Boolean(values.compactMode);
    }

    settings = normalizeSettings(next);

    persist();
    syncGlobalState("settings-change");
    notify("settings-change");

    return getSettings();
  }

  function resetSettings() {
    settings = { ...DEFAULT_SETTINGS };

    persist();
    syncGlobalState("settings-reset");
    notify("settings-reset");

    return getSettings();
  }

  function subscribeSettings(listener) {
    if (typeof listener !== "function") {
      throw new TypeError(
        "KSKSettings.subscribeSettings requires a function."
      );
    }

    listeners.add(listener);

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function initialize() {
    syncGlobalState("settings-initialize");
    return getSettings();
  }

  global.KSKSettings = Object.freeze({
    getSettings,
    updateSettings,
    resetSettings,
    subscribeSettings,
    initialize,
    DEFAULT_SETTINGS
  });

})(window);
