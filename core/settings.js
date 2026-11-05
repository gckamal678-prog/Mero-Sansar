"use strict";

/* Hamro Sansar — Shared Settings */
(function (global) {
  const STORAGE_KEY = "hs_app_settings";

  const DEFAULT_SETTINGS = {
    theme: "light",
    language: "ne",
    notifications: true,
    compactMode: false
  };
  

  let settings = loadSettings();
  const listeners = new Set();

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return { ...DEFAULT_SETTINGS };

      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  function notify() {
    listeners.forEach((listener) => {
      try {
        listener({ ...settings });
      } catch (error) {
        console.error("Settings listener error:", error);
      }
    });
  }

  function getSettings() {
    return { ...settings };
  }

  function updateSettings(values = {}) {
    const allowedKeys = Object.keys(DEFAULT_SETTINGS);
    const updates = {};

    allowedKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        updates[key] = values[key];
      }
    });

    settings = { ...settings, ...updates };
    saveSettings();

    if (global.HamroState) {
      if (updates.theme) global.HamroState.setTheme(updates.theme);
      if (updates.language) global.HamroState.setLanguage(updates.language);
    }

    notify();
    return getSettings();
  }

  function resetSettings() {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    notify();
    return getSettings();
  }

  function subscribeSettings(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Settings listener must be a function.");
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  global.HamroSettings = Object.freeze({
    getSettings,
    updateSettings,
    resetSettings,
    subscribeSettings
  });
})(window);
