
"use strict";

/* =========================================================
   KSK — GLOBAL THEME ENGINE
   Centralized Light / Dark theme management.
   Compatible with KSKSettingsUI.
========================================================= */

(function (global) {

  const THEME_COLORS = Object.freeze({
    light: "#2563eb",
    dark: "#0b1220"
  });


  /* =======================================================
     GET CURRENT THEME
  ======================================================= */

  function getTheme() {

    if (global.KSKSettings) {
      return global.KSKSettings.getSettings().theme;
    }

    if (global.KSKState) {
      return global.KSKState.getState().theme;
    }

    return document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";
  }


  /* =======================================================
     APPLY THEME
  ======================================================= */

  function applyTheme(theme, save = true) {

    const selected = theme === "dark"
      ? "dark"
      : "light";

    const root = document.documentElement;

    root.dataset.theme = selected;
    root.style.colorScheme = selected;

    const meta = document.querySelector(
      'meta[name="theme-color"]'
    );

    if (meta) {
      meta.setAttribute(
        "content",
        THEME_COLORS[selected]
      );
    }

    if (save && global.KSKSettings) {

      const settings =
        global.KSKSettings.getSettings();

      if (settings.theme !== selected) {
        global.KSKSettings.updateSettings({
          theme: selected
        });
      }

    } else if (!global.KSKSettings && global.KSKState) {

      const currentTheme =
        global.KSKState.getState().theme;

      if (currentTheme !== selected) {
        global.KSKState.setTheme(selected);
      }

    }

    global.dispatchEvent(
      new CustomEvent("ksk:theme-change", {
        detail: {
          theme: selected
        }
      })
    );

    return selected;
  }


  /* =======================================================
     SET THEME
     Used by Settings UI.
     Settings UI saves the value separately.
  ======================================================= */

  function setTheme(theme) {
    return applyTheme(theme, false);
  }


  /* =======================================================
     TOGGLE THEME
  ======================================================= */

  function toggleTheme() {

    const nextTheme = getTheme() === "dark"
      ? "light"
      : "dark";

    return applyTheme(nextTheme, true);
  }


  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initializeTheme() {

    const settings = global.KSKSettings
      ? global.KSKSettings.getSettings()
      : null;

    const state = global.KSKState
      ? global.KSKState.getState()
      : null;

    const selected =
      settings?.theme ||
      state?.theme ||
      "light";

    const applied = applyTheme(selected, false);

    if (
      global.KSKState &&
      state?.theme !== applied
    ) {
      global.KSKState.setTheme(applied);
    }

    return applied;
  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKTheme = Object.freeze({

    getTheme,

    applyTheme,

    setTheme,

    toggleTheme,

    initializeTheme,

    THEME_COLORS

  });


  console.info(
    "KSK Theme Engine initialized."
  );

})(window);
