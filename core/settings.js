"use strict";

/* HAMRO SANSAR — CENTRAL SETTINGS MANAGER */

(function (global) {
  const STORAGE_KEY = "hs_app_settings";

  const DEFAULT_SETTINGS = {
    theme: "light",
    language: "ne",
    notifications: true,
    compactMode: false
  };

  const listeners = new Set();

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        theme: saved.theme === "dark" ? "dark" : "light",
        language: saved.language === "en" ? "en" : "ne",
        notifications: saved.notifications !== false,
        compactMode: saved.compactMode === true
      };
    } catch {
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
      console.error("Settings storage failed:", error);
      return false;
    }
  }

  function notify() {
    const snapshot = getSettings();

    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Settings listener error:", error);
      }
    });

    global.dispatchEvent(
      new CustomEvent("hamro:settings-change", {
        detail: snapshot
      })
    );
  }

  function updateSettings(values = {}) {
    if (!values || typeof values !== "object") {
      return getSettings();
    }

    const allowed = Object.keys(DEFAULT_SETTINGS);

    allowed.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        return;
      }

      const value = values[key];

      if (key === "theme") {
        settings.theme = value === "dark" ? "dark" : "light";
      } else if (key === "language") {
        settings.language = value === "en" ? "en" : "ne";
      } else if (key === "notifications" || key === "compactMode") {
        settings[key] = Boolean(value);
      }
    });

    persist();

    if (global.HamroState) {
      global.HamroState.setState({
        theme: settings.theme,
        language: settings.language,
        settings: {
          notifications: settings.notifications,
          compactMode: settings.compactMode
        }
      }, "settings-change");
    }

    notify();

    return getSettings();
  }

  function resetSettings() {
    settings = { ...DEFAULT_SETTINGS };
    persist();

    if (global.HamroState) {
      global.HamroState.setState({
        theme: settings.theme,
        language: settings.language,
        settings: {
          notifications: settings.notifications,
          compactMode: settings.compactMode
        }
      }, "settings-reset");
    }

    notify();

    return getSettings();
  }

  function subscribeSettings(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Listener must be a function.");
    }

    listeners.add(listener);

    return () => listeners.delete(listener);
  }

  global.HamroSettings = Object.freeze({
    getSettings,
    updateSettings,
    resetSettings,
    subscribeSettings,
    DEFAULT_SETTINGS: Object.freeze({ ...DEFAULT_SETTINGS })
  });

})(window);
