"use strict";

/* HAMRO SANSAR — APP-WIDE INTEGRATION LAYER */

(function (global) {
  let initialized = false;

  function getElement(id) {
    return document.getElementById(id);
  }

  function syncThemeButton() {
    const theme = global.HamroTheme
      ? global.HamroTheme.getTheme()
      : "light";

    const mainButton = getElement("themeToggle");

    if (mainButton) {
      mainButton.textContent = theme === "dark" ? "☀️" : "🌙";
      mainButton.setAttribute(
        "aria-label",
        theme === "dark" ? "Light theme" : "Dark theme"
      );
    }
  }

  function syncSettingsControls() {
    if (!global.HamroSettings) return;

    const settings = global.HamroSettings.getSettings();

    const languageSelect = getElement("languageSelect");

    if (languageSelect) {
      languageSelect.value = settings.language;
    }

    syncThemeButton();
  }

  function applySavedPreferences() {
    if (!global.HamroSettings) return;

    const settings = global.HamroSettings.getSettings();

    if (global.HamroTheme) {
      global.HamroTheme.applyTheme(settings.theme, false);
    }

    if (global.HamroLanguage) {
      global.HamroLanguage.setLanguage(settings.language);
    }

    syncSettingsControls();
  }

  function bindThemeControls() {
    const themeButton = getElement("themeToggle");
    const settingsThemeButton = getElement("settingsThemeToggle");

    function toggle() {
      if (global.HamroTheme) {
        global.HamroTheme.toggleTheme();
      }

      syncThemeButton();
    }

    if (themeButton) {
      themeButton.addEventListener("click", toggle);
    }

    if (settingsThemeButton) {
      settingsThemeButton.addEventListener("click", toggle);
    }
  }

  function bindLanguageControl() {
    const languageSelect = getElement("languageSelect");

    if (!languageSelect) return;

    languageSelect.addEventListener("change", () => {
      const selected = languageSelect.value === "en" ? "en" : "ne";

      if (global.HamroSettings) {
        global.HamroSettings.updateSettings({
          language: selected
        });
      }

      if (global.HamroLanguage) {
        global.HamroLanguage.setLanguage(selected);
      }

      if (global.HamroToast) {
        global.HamroToast.success(
          selected === "en"
            ? "Language updated."
            : "भाषा परिवर्तन भयो।"
        );
      }
    });
  }

  function bindSettingsSynchronization() {
    if (!global.HamroSettings) return;

    global.HamroSettings.subscribeSettings((settings) => {
      if (global.HamroTheme) {
        global.HamroTheme.applyTheme(settings.theme, false);
      }

      if (global.HamroLanguage &&
          global.HamroLanguage.getLanguage() !== settings.language) {
        global.HamroLanguage.setLanguage(settings.language);
      }

      syncSettingsControls();
    });
  }

  function bindNavigation() {
    if (!global.HamroNavigation) return;

    const nav = getElement("bottomNav");

    if (!nav) return;

    nav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");

      if (!button || !nav.contains(button)) return;

      event.preventDefault();

      global.HamroNavigation.navigate(button.dataset.page);
    });
  }

  function bindNotificationButton() {
    const button = getElement("notificationsToggle");

    if (!button) return;

    button.addEventListener("click", () => {
      if (global.HamroNavigation) {
        global.HamroNavigation.navigate("notifications");
      }
    });
  }

  function initialize() {
    if (initialized) return;

    initialized = true;

    applySavedPreferences();

    bindThemeControls();
    bindLanguageControl();
    bindSettingsSynchronization();
    bindNavigation();
    bindNotificationButton();

    global.addEventListener("hamro:theme-change", syncThemeButton);

    global.addEventListener("hamro:language-change", syncSettingsControls);

    global.addEventListener("hamro:state-change", (event) => {
      const change = event.detail?.change;

      if (change === "theme-change" || change === "language-change") {
        syncSettingsControls();
      }
    });

    syncSettingsControls();

    global.dispatchEvent(
      new CustomEvent("hamro:integration-ready")
    );
  }

  global.HamroIntegration = Object.freeze({
    initialize,
    syncSettingsControls,
    syncThemeButton
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

})(window);
