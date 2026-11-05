"use strict";

/* Hamro Sansar — Working Settings Page */
(function (global) {
  const SETTINGS_KEY = "hs_app_settings";

  const DEFAULT_SETTINGS = {
    theme: "light",
    language: "ne",
    notifications: true,
    compactMode: false
  };

  function getSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(values) {
    const current = getSettings();
    const next = { ...current, ...values };

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Could not save settings:", error);
    }

    if (global.HamroSettings?.updateSettings) {
      global.HamroSettings.updateSettings(values);
    }

    if (values.language && global.HamroLanguage) {
      global.HamroLanguage.setLanguage(values.language);
    }

    if (values.theme && global.HamroTheme) {
      global.HamroTheme.applyTheme(values.theme);
    }

    document.documentElement.dataset.compact =
      next.compactMode ? "true" : "false";

    return next;
  }

  function t(key) {
    return global.HamroLanguage
      ? global.HamroLanguage.translate(key)
      : key;
  }

  function render() {
    const settings = getSettings();
    const language = global.HamroLanguage?.getLanguage() ||
      settings.language || "ne";

    const theme = document.documentElement.dataset.theme ||
      settings.theme || "light";

    return `
      <section class="hs-page hs-settings-page">
        <div class="hs-page-heading">
          <h2>${t("settings")}</h2>
          <p>${t("appPreferences")}</p>
        </div>

        <div class="card hs-settings-card">

          <div class="settings-row">
            <div>
              <div class="settings-label">${t("theme")}</div>
              <div class="settings-description">${t("themeDescription")}</div>
            </div>

            <button class="btn btn-secondary"
              type="button"
              data-hs-action="settings-toggle-theme">
              ${theme === "dark" ? t("dark") : t("light")} · ${t("change")}
            </button>
          </div>

          <div class="settings-row">
            <div>
              <div class="settings-label">${t("language")}</div>
              <div class="settings-description">${t("languageDescription")}</div>
            </div>

            <select class="form-input hs-language-select"
              data-hs-setting="language"
              aria-label="${t("language")}">
              <option value="ne" ${language === "ne" ? "selected" : ""}>
                नेपाली
              </option>
              <option value="en" ${language === "en" ? "selected" : ""}>
                English
              </option>
            </select>
          </div>

          <div class="settings-row">
            <div>
              <div class="settings-label">${t("notificationSettings")}</div>
              <div class="settings-description">
                ${t("notificationDescription")}
              </div>
            </div>

            <input type="checkbox"
              data-hs-setting="notifications"
              aria-label="${t("notificationSettings")}"
              ${settings.notifications ? "checked" : ""}>
          </div>

          <div class="settings-row">
            <div>
              <div class="settings-label">${t("compactMode")}</div>
              <div class="settings-description">${t("compactDescription")}</div>
            </div>

            <input type="checkbox"
              data-hs-setting="compactMode"
              aria-label="${t("compactMode")}"
              ${settings.compactMode ? "checked" : ""}>
          </div>

          <div class="settings-row">
            <div>
              <div class="settings-label">${t("localData")}</div>
              <div class="settings-description">
                ${t("localDataDescription")}
              </div>
            </div>

            <button class="btn btn-danger"
              type="button"
              data-hs-action="settings-clear-demo">
              ${t("clearDemoData")}
            </button>
          </div>

          <div class="settings-row">
            <div>
              <div class="settings-label">${t("resetSettings")}</div>
              <div class="settings-description">
                ${t("resetSettingsConfirm")}
              </div>
            </div>

            <button class="btn btn-secondary"
              type="button"
              data-hs-action="settings-reset">
              ${t("resetSettings")}
            </button>
          </div>

        </div>
      </section>
    `;
  }

  function handle(action) {
    if (action === "settings-toggle-theme") {
      const current = document.documentElement.dataset.theme || "light";
      const next = current === "dark" ? "light" : "dark";

      saveSettings({ theme: next });

      if (global.HamroState) {
        global.HamroState.setTheme(next);
      }

      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;

      global.HamroApp?.refreshPage();
      return;
    }

    if (action === "settings-clear-demo") {
      if (!global.confirm(t("clearDemoConfirm"))) return;

      [
        "hs_feature_friends",
        "hs_feature_chats",
        "hs_feature_notifications",
        "hs_feature_profile",
        "hs_feature_savedPosts"
      ].forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {}
      });

      global.HamroApp?.refreshPage();
      global.HamroToast?.show(t("demoDataCleared"), "success");
      return;
    }

    if (action === "settings-reset") {
      if (!global.confirm(t("resetSettingsConfirm"))) return;

      saveSettings({ ...DEFAULT_SETTINGS });

      if (global.HamroLanguage) {
        global.HamroLanguage.setLanguage("ne");
      }

      if (global.HamroTheme) {
        global.HamroTheme.applyTheme("light");
      }

      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
      document.documentElement.dataset.compact = "false";

      global.HamroState?.setTheme("light");
      global.HamroState?.setLanguage("ne");

      global.HamroApp?.refreshPage();
      global.HamroToast?.show(t("settingsReset"), "success");
    }
  }

  global.HamroPages.register("settings", {
    render,
    handle
  });

  /*
   * Settings controls use delegated change handling because
   * this page is dynamically rendered.
   */
  document.addEventListener("change", (event) => {
    const control = event.target.closest("[data-hs-setting]");
    if (!control) return;

    const setting = control.dataset.hsSetting;

    if (setting === "language") {
      const language = control.value === "en" ? "en" : "ne";

      saveSettings({ language });

      global.HamroLanguage?.setLanguage(language);
      global.HamroApp?.refreshPage();

      global.HamroToast?.show(
        global.HamroLanguage?.translate("settingsSaved") ||
          "Settings saved.",
        "success"
      );
      return;
    }

    if (setting === "notifications" || setting === "compactMode") {
      saveSettings({ [setting]: control.checked });

      if (setting === "compactMode") {
        document.documentElement.dataset.compact =
          control.checked ? "true" : "false";
      }

      global.HamroToast?.show(
        global.HamroLanguage?.translate("settingsSaved") ||
          "Settings saved.",
        "success"
      );
    }
  });
})(window);
