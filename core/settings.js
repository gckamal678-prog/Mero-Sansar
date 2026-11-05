"use strict";

/* HAMRO SANSAR — CENTRAL SETTINGS MANAGER */

(function (global) {
  const STORAGE_KEY = "hs_app_settings";

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

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      return normalizeSettings(saved);
    } catch (error) {
      console.error("Settings could not be loaded:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  let settings = loadSettings();

  function getSettings() {
    return { ...settings };
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );

      return true;
    } catch (error) {
      console.error("Settings could not be saved:", error);
      return false;
    }
  }

  function notify(changeName = "settings-change") {
    const snapshot = getSettings();

    listeners.forEach((listener) => {
      try {
        listener(snapshot, changeName);
      } catch (error) {
        console.error("Settings listener error:", error);
      }
    });

    global.dispatchEvent(
      new CustomEvent("hamro:settings-change", {
        detail: {
          settings: snapshot,
          change: changeName
        }
      })
    );
  }

  function syncGlobalState(changeName) {
    if (!global.HamroState) return;

    global.HamroState.setState({
      theme: settings.theme,
      language: settings.language,
      settings: {
        notifications: settings.notifications,
        compactMode: settings.compactMode
      }
    }, changeName);
  }

  function updateSettings(values = {}) {
    if (!values || typeof values !== "object") {
      return getSettings();
    }

    const next = {
      ...settings
    };

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

    settings = next;

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
      throw new TypeError("Listener must be a function.");
    }

    listeners.add(listener);

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  global.HamroSettings = Object.freeze({
    getSettings,
    updateSettings,
    resetSettings,
    subscribeSettings,
    DEFAULT_SETTINGS
  });

})(window);
