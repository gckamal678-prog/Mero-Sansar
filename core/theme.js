"use strict";

/* HAMRO SANSAR — GLOBAL THEME ENGINE */

(function (global) {
  function getTheme() {
    if (global.HamroState) {
      return global.HamroState.state.theme;
    }

    return document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";
  }

  function applyTheme(theme, save = true) {
    const selected = theme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme = selected;
    document.documentElement.style.colorScheme = selected;

    const meta = document.querySelector(
      'meta[name="theme-color"]'
    );

    if (meta) {
      meta.setAttribute(
        "content",
        selected === "dark" ? "#0b1220" : "#2563eb"
      );
    }

    if (save && global.HamroSettings) {
      const settings = global.HamroSettings.getSettings();

      if (settings.theme !== selected) {
        global.HamroSettings.updateSettings({
          theme: selected
        });
      }
    } else if (global.HamroState &&
               global.HamroState.state.theme !== selected) {
      global.HamroState.setTheme(selected);
    }

    global.dispatchEvent(
      new CustomEvent("hamro:theme-change", {
        detail: { theme: selected }
      })
    );

    return selected;
  }

  function toggleTheme() {
    return applyTheme(
      getTheme() === "dark" ? "light" : "dark"
    );
  }

  function initializeTheme() {
    const settings = global.HamroSettings
      ? global.HamroSettings.getSettings()
      : null;

    const theme = settings?.theme ||
      global.HamroState?.state?.theme ||
      "light";

    return applyTheme(theme, false);
  }

  global.HamroTheme = Object.freeze({
    getTheme,
    applyTheme,
    toggleTheme,
    initializeTheme
  });

})(window);
