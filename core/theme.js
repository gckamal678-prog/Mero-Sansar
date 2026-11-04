"use strict";

/* Shared light / dark theme controller */

(function (global) {
  function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme = selectedTheme;
    document.documentElement.style.colorScheme = selectedTheme;

    return selectedTheme;
  }

  function getTheme() {
    return global.HamroState?.state?.theme === "dark" ? "dark" : "light";
  }

  function toggleTheme() {
    const nextTheme = getTheme() === "dark" ? "light" : "dark";

    if (global.HamroState) {
      global.HamroState.setTheme(nextTheme);
    } else {
      applyTheme(nextTheme);
    }

    return nextTheme;
  }

  function initializeTheme() {
    applyTheme(getTheme());
  }

  global.HamroTheme = Object.freeze({
    applyTheme,
    getTheme,
    toggleTheme,
    initializeTheme
  });
})(window);
