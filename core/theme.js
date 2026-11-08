
"use strict";

/* =========================================================
   KSK — GLOBAL THEME ENGINE

   Responsibilities:
   - Read the saved theme
   - Apply Light / Dark theme
   - Persist theme changes through KSKSettings
   - React to settings changes
   - Update browser theme color
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKTheme) return;

  const THEME_COLORS = Object.freeze({
    light: "#2563eb",
    dark: "#0b1220"
  });

  let savingTheme = false;

  function normalizeTheme(theme) {
    return theme === "dark" ? "dark" : "light";
  }

  /* =======================================================
     GET CURRENT THEME
  ======================================================= */

  function getTheme() {
    if (global.KSKSettings?.getSetting) {
      const saved = global.KSKSettings.getSetting("theme");

      if (saved === "light" || saved === "dark") {
        return saved;
      }
    }

    if (global.KSKState?.getState) {
      const state = global.KSKState.getState();

      if (state?.theme === "light" || state?.theme === "dark") {
        return state.theme;
      }
    }

    return document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";
  }

  /* =======================================================
     APPLY THEME
  ======================================================= */

  function applyTheme(theme, save = true) {
    const selected = normalizeTheme(theme);

    /*
     * Persist first when requested.
     * If saving fails, do not change the visible theme.
     */

    if (save && global.KSKSettings?.updateSetting) {
      const current = global.KSKSettings.getSetting("theme");

      if (current !== selected) {
        savingTheme = true;

        let saved = false;

        try {
          saved = global.KSKSettings.updateSetting(
            "theme",
            selected
          );
        } catch (error) {
          console.error(
            "KSKTheme: Could not save theme.",
            error
          );
        } finally {
          savingTheme = false;
        }

        if (!saved) {
          return getTheme();
        }
      }
    } else if (
      save &&
      !global.KSKSettings &&
      global.KSKState?.setTheme
    ) {
      try {
        global.KSKState.setTheme(selected);
      } catch (error) {
        console.error(
          "KSKTheme: Could not update fallback state.",
          error
        );
      }
    }

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
     Settings UI saves the selected value through KSKSettings.
     The settings-change listener applies the saved value.
  ======================================================= */

  function setTheme(theme) {
    return applyTheme(theme, false);
  }

  /* =======================================================
     TOGGLE THEME
  ======================================================= */

  function toggleTheme() {
    const next = getTheme() === "dark"
      ? "light"
      : "dark";

    return applyTheme(next, true);
  }

  /* =======================================================
     HANDLE CENTRAL SETTINGS CHANGES
  ======================================================= */

  function handleSettingsChange(event) {
    if (savingTheme) return;

    const settings = event.detail?.settings;

    if (!settings) return;

    if (
      settings.theme !== "light" &&
      settings.theme !== "dark"
    ) {
      return;
    }

    const selected = settings.theme;
    const current = document.documentElement.dataset.theme;

    if (current !== selected) {
      applyTheme(selected, false);
    }
  }

  /* =======================================================
     INITIALIZE THEME
     Called by app.js during application startup.
  ======================================================= */

  function initializeTheme() {
    const selected = getTheme();

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

  /* =======================================================
     REGISTER SETTINGS LISTENER — ONCE
     Registered when this module loads.
  ======================================================= */

  global.addEventListener(
    "ksk:settings-change",
    handleSettingsChange
  );

  console.info("KSK Theme Engine initialized.");

})(window);
