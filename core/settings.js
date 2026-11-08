"use strict";

/* =========================================================
   KSK — CENTRAL SETTINGS MANAGER
   Single Source of Truth for Persistent Settings

   Responsibilities:
   - Store and retrieve application settings
   - Validate and normalize settings
   - Import and export settings
   - Notify subscribers about changes
   - Keep settings isolated from external mutation

   Theme UI    : core/theme.js
   Language UI : core/language.js
   Settings UI : core/settings-ui.js
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSettings) return;

  const STORAGE_KEY = "ksk_app_settings";
  const LEGACY_STORAGE_KEY = "ksk_app_settings_old";
  const SETTINGS_VERSION = 2;

  const DEFAULT_SETTINGS = Object.freeze({
    version: SETTINGS_VERSION,

    theme: "light",
    language: "ne",
    compactMode: false,
    notifications: true,

    notificationPreferences: {
      messages: true,
      friends: true,
      comments: true,
      likes: true,
      stories: true,
      sound: true,
      vibration: true
    },

    privacy: {
      profileVisibility: "everyone",
      lastSeen: "everyone",
      onlineStatus: "everyone",
      readReceipts: true,
      showProfilePhoto: "everyone",
      showAbout: "everyone",
      allowFriendRequests: true
    },

    profilePreferences: {
      showBio: true,
      showLocation: true,
      showPostCount: true
    },

    chat: {
      fontSize: "medium",
      enterToSend: false,
      wallpaper: "default",
      linkPreviews: true
    },

    data: {
      autoDownloadImages: false,
      autoDownloadVideos: false,
      saveMediaToDevice: false
    }
  });

  /* =======================================================
     HELPERS
  ======================================================= */

  const listeners = new Set();

  const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeObjects(base, incoming) {
    const result = { ...base };

    if (!isObject(incoming)) {
      return result;
    }

    Object.keys(incoming).forEach(key => {
      if (
        isObject(base[key]) &&
        isObject(incoming[key])
      ) {
        result[key] = mergeObjects(
          base[key],
          incoming[key]
        );
      } else if (
        hasOwn(base, key) &&
        !isObject(incoming[key]) &&
        !Array.isArray(incoming[key])
      ) {
        result[key] = incoming[key];
      }
    });

    return result;
  }

  /* =======================================================
     NORMALIZATION
  ======================================================= */

  function normalizeSettings(input = {}) {
    const source = isObject(input) ? input : {};

    const result = mergeObjects(
      clone(DEFAULT_SETTINGS),
      source
    );

    result.theme =
      source.theme === "dark" ? "dark" : "light";

    result.language =
      source.language === "en" ? "en" : "ne";

    result.notifications =
      source.notifications !== false;

    result.compactMode =
      source.compactMode === true;

    /* PRIVACY */

    const visibilityOptions = [
      "everyone",
      "friends",
      "nobody"
    ];

    [
      "profileVisibility",
      "lastSeen",
      "onlineStatus",
      "showProfilePhoto",
      "showAbout"
    ].forEach(key => {
      if (!visibilityOptions.includes(result.privacy[key])) {
        result.privacy[key] =
          DEFAULT_SETTINGS.privacy[key];
      }
    });

    result.privacy.readReceipts =
      result.privacy.readReceipts !== false;

    result.privacy.allowFriendRequests =
      result.privacy.allowFriendRequests !== false;

    /* NOTIFICATION PREFERENCES */

    Object.keys(DEFAULT_SETTINGS.notificationPreferences)
      .forEach(key => {
        result.notificationPreferences[key] =
          result.notificationPreferences[key] !== false;
      });

    /* PROFILE PREFERENCES */

    Object.keys(DEFAULT_SETTINGS.profilePreferences)
      .forEach(key => {
        result.profilePreferences[key] =
          result.profilePreferences[key] !== false;
      });

    /* CHAT */

    if (!["small", "medium", "large"].includes(result.chat.fontSize)) {
      result.chat.fontSize = "medium";
    }

    if (!["default", "light", "dark", "custom"].includes(result.chat.wallpaper)) {
      result.chat.wallpaper = "default";
    }

    result.chat.enterToSend =
      result.chat.enterToSend === true;

    result.chat.linkPreviews =
      result.chat.linkPreviews !== false;

    /* DATA */

    Object.keys(DEFAULT_SETTINGS.data).forEach(key => {
      result.data[key] =
        result.data[key] === true;
    });

    result.version = SETTINGS_VERSION;

    return result;
  }

  /* =======================================================
     STORAGE
  ======================================================= */

  function readStorage() {
    try {
      let saved = global.localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        saved = global.localStorage.getItem(
          LEGACY_STORAGE_KEY
        );

        if (saved) {
          try {
            global.localStorage.setItem(
              STORAGE_KEY,
              saved
            );
          } catch (migrationError) {
            console.warn(
              "KSKSettings: Legacy migration could not be saved.",
              migrationError
            );
          }
        }
      }

      if (!saved) return {};

      const parsed = JSON.parse(saved);

      return isObject(parsed) ? parsed : {};
    } catch (error) {
      console.warn(
        "KSKSettings: Unable to load settings.",
        error
      );

      return {};
    }
  }

  let settings = normalizeSettings(readStorage());

  function persist(value = settings) {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn(
        "KSKSettings: Unable to save settings.",
        error
      );

      return false;
    }
  }

  /* =======================================================
     GET SETTINGS
  ======================================================= */

  function getSettings() {
    return clone(settings);
  }

  function getSetting(path) {
    if (
      typeof path !== "string" ||
      !path.trim()
    ) {
      return undefined;
    }

    const value = path
      .split(".")
      .filter(Boolean)
      .reduce((current, key) => {
        if (
          !isObject(current) &&
          !Array.isArray(current)
        ) {
          return undefined;
        }

        return current[key];
      }, settings);

    if (value === undefined) return undefined;

    return (
      value !== null && typeof value === "object"
        ? clone(value)
        : value
    );
  }

  /* =======================================================
     EVENTS
  ======================================================= */

  function notify(changeName = "settings-change") {
    const snapshot = getSettings();

    listeners.forEach(listener => {
      try {
        listener(snapshot, changeName);
      } catch (error) {
        console.error(
          "KSKSettings listener error:",
          error
        );
      }
    });

    global.dispatchEvent(
      new CustomEvent("ksk:settings-change", {
        detail: {
          settings: snapshot,
          change: changeName
        }
      })
    );
  }

  /* =======================================================
     UPDATE SETTINGS
     Changes are accepted only after successful persistence.
  ======================================================= */

  function updateSettings(values = {}) {
    if (!isObject(values)) {
      return false;
    }

    const next = normalizeSettings(
      mergeObjects(settings, values)
    );

    if (!persist(next)) {
      return false;
    }

    settings = next;

    notify("settings-change");

    return getSettings();
  }

  /* =======================================================
     UPDATE SINGLE SETTING
  ======================================================= */

  function updateSetting(path, value) {
    if (
      typeof path !== "string" ||
      !path.trim()
    ) {
      return false;
    }

    const keys = path.split(".").filter(Boolean);

    if (!keys.length) return false;

    const allowedRoot = [
      "theme",
      "language",
      "notifications",
      "compactMode",
      "notificationPreferences",
      "privacy",
      "profilePreferences",
      "chat",
      "data"
    ];

    if (!allowedRoot.includes(keys[0])) {
      return false;
    }

    const patch = {};
    let current = patch;

    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        current[key] = value;
      } else {
        current[key] = {};
        current = current[key];
      }
    });

    const result = updateSettings(patch);

    return result !== false;
  }

  /* =======================================================
     RESET SETTINGS
  ======================================================= */

  function resetSettings() {
    const next = clone(DEFAULT_SETTINGS);

    if (!persist(next)) {
      return false;
    }

    settings = next;

    notify("settings-reset");

    return getSettings();
  }

  /* =======================================================
     EXPORT SETTINGS
  ======================================================= */

  function exportSettings() {
    try {
      return JSON.stringify({
        application: "KSK",
        version: SETTINGS_VERSION,
        exportedAt: new Date().toISOString(),
        settings: getSettings()
      }, null, 2);
    } catch (error) {
      console.error(
        "KSKSettings: Export failed.",
        error
      );

      return false;
    }
  }

  /* =======================================================
     IMPORT SETTINGS
  ======================================================= */

  function importSettings(data) {
    try {
      const parsed =
        typeof data === "string"
          ? JSON.parse(data)
          : data;

      if (!isObject(parsed)) {
        return false;
      }

      const imported = isObject(parsed.settings)
        ? parsed.settings
        : parsed;

      const next = normalizeSettings(
        mergeObjects(
          clone(DEFAULT_SETTINGS),
          imported
        )
      );

      if (!persist(next)) {
        return false;
      }

      settings = next;

      notify("settings-import");

      return true;
    } catch (error) {
      console.error(
        "KSKSettings: Import failed.",
        error
      );

      return false;
    }
  }

  /* =======================================================
     SUBSCRIBE
  ======================================================= */

  function subscribeSettings(listener) {
    if (typeof listener !== "function") {
      throw new TypeError(
        "KSKSettings.subscribeSettings requires a function."
      );
    }

    listeners.add(listener);

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKSettings = Object.freeze({
    getSettings,
    getSetting,
    updateSettings,
    updateSetting,
    resetSettings,
    exportSettings,
    importSettings,
    subscribeSettings,
    DEFAULT_SETTINGS: clone(DEFAULT_SETTINGS)
  });

  console.info(
    "KSK Settings Manager initialized."
  );

})(window);
