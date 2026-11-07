
"use strict";

/* =========================================================
   KSK — GLOBAL THEME ENGINE
   Centralized Light / Dark theme management.
   KSKSettings is the persistent source of truth.
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

      return global.KSKSettings.getSetting("theme");

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

    /* SAVE THROUGH CENTRAL SETTINGS ONLY */

    if (save && global.KSKSettings) {

      const currentTheme =
        global.KSKSettings.getSetting("theme");

      if (currentTheme !== selected) {

        global.KSKSettings.updateSetting(
          "theme",
          selected
        );

      }

    } else if (!global.KSKSettings && global.KSKState) {

      const currentTheme =
        global.KSKState.getState().theme;

      if (currentTheme !== selected) {

        global.KSKState.setTheme(selected);

      }

    }

    /* THEME EVENT */

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
     Applies theme without separately saving.
     Settings UI can save through KSKSettings.
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
     Read persistent theme from KSKSettings.
     Do not copy it into KSKState.
  ======================================================= */

  function initializeTheme() {

    const settings = global.KSKSettings
      ? global.KSKSettings.getSettings()
      : null;

    const selected =
      settings && settings.theme
        ? settings.theme
        : "light";

    return applyTheme(selected, false);
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
