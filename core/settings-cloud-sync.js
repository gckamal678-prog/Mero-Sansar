"use strict";

/* =========================================================
   MERO SANSAR — SETTINGS CLOUD SYNC

   Connects:
   - KSKSettings
   - KSKSupabaseAuth
   - KSKSupabaseSettings

   Features:
   - Load settings after authentication
   - Migrate existing local settings
   - Save changes to Supabase
   - Keep different users' settings isolated
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSettingsCloudSync) return;

  const OWNER_KEY = "ksk_settings_owner";
  const SAVE_DELAY = 900;

  let activeUserId = null;
  let syncing = false;
  let saveTimer = null;
  let syncVersion = 0;
  let initialized = false;

  function getAuth() {
    return global.KSKSupabaseAuth;
  }

  function getAdapter() {
    return global.KSKSupabaseSettings;
  }

  function getSettingsManager() {
    return global.KSKSettings;
  }

  function getCurrentUser() {
    return getAuth()?.getUser?.() || null;
  }

  function clearSaveTimer() {
    if (saveTimer !== null) {
      global.clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  function getStoredOwner() {
    try {
      return global.localStorage.getItem(OWNER_KEY);
    } catch (error) {
      console.warn(
        "Settings Sync: Could not read owner.",
        error
      );

      return null;
    }
  }

  function setStoredOwner(userId) {
    try {
      global.localStorage.setItem(
        OWNER_KEY,
        userId
      );

      return true;
    } catch (error) {
      console.error(
        "Settings Sync: Could not save owner.",
        error
      );

      return false;
    }
  }

  function notifyError(error) {
    console.error(
      "Settings Cloud Sync failed:",
      error
    );

    global.KSKToast?.error?.(
      "सेटिङ Cloud मा सुरक्षित गर्न सकिएन। इन्टरनेट जाँच गर्नुहोस्।"
    );
  }

  function isCurrentUser(userId, version) {
    return (
      activeUserId === userId &&
      syncVersion === version &&
      getCurrentUser()?.id === userId
    );
  }

  /* =======================================================
     LOAD OR MIGRATE SETTINGS
  ======================================================= */

  async function syncForUser(userId) {
    if (!userId) return false;

    if (
      activeUserId === userId &&
      syncing
    ) {
      return false;
    }

    clearSaveTimer();

    activeUserId = userId;

    const version = ++syncVersion;

    syncing = true;

    try {
      const adapter = getAdapter();
      const manager = getSettingsManager();

      if (!adapter || !manager) {
        throw new Error(
          "Settings modules are not loaded."
        );
      }

      await adapter.initialize();

      const cloud = await adapter.loadMySettings();

      if (!isCurrentUser(userId, version)) {
        return false;
      }

      if (cloud.exists) {
        manager.updateSettings(cloud.settings);

        setStoredOwner(userId);

        console.info(
          "Settings loaded from Supabase."
        );

        return true;
      }

      /*
       * No cloud row exists.
       *
       * If this browser previously belonged to
       * another account, never migrate that account's
       * local settings into the new account.
       */

      const previousOwner = getStoredOwner();

      if (
        previousOwner &&
        previousOwner !== userId
      ) {
        manager.updateSettings(
          manager.DEFAULT_SETTINGS
        );
      }

      const localSettings = manager.getSettings();

      if (!isCurrentUser(userId, version)) {
        return false;
      }

      await adapter.saveMySettings(localSettings);

      if (!isCurrentUser(userId, version)) {
        return false;
      }

      setStoredOwner(userId);

      console.info(
        "Existing local settings migrated to Supabase."
      );

      return true;

    } catch (error) {
      if (isCurrentUser(userId, version)) {
        notifyError(error);
      }

      return false;

    } finally {
      if (syncVersion === version) {
        syncing = false;
      }
    }
  }

  /* =======================================================
     SAVE SETTINGS TO CLOUD
  ======================================================= */

  async function saveToCloud(userId) {
    if (
      !userId ||
      activeUserId !== userId ||
      syncing
    ) {
      return false;
    }

    const version = syncVersion;

    try {
      const manager = getSettingsManager();
      const adapter = getAdapter();

      if (!manager || !adapter) {
        return false;
      }

      const settings = manager.getSettings();

      await adapter.saveMySettings(settings);

      if (!isCurrentUser(userId, version)) {
        return false;
      }

      setStoredOwner(userId);

      console.info(
        "Settings saved to Supabase."
      );

      return true;

    } catch (error) {
      if (isCurrentUser(userId, version)) {
        notifyError(error);
      }

      return false;
    }
  }

  /* =======================================================
     DEBOUNCED SAVE
  ======================================================= */

  function scheduleSave() {
    if (
      syncing ||
      !activeUserId ||
      !getCurrentUser()
    ) {
      return;
    }

    clearSaveTimer();

    const userId = activeUserId;

    saveTimer = global.setTimeout(() => {
      saveTimer = null;

      if (
        activeUserId !== userId ||
        getCurrentUser()?.id !== userId
      ) {
        return;
      }

      saveToCloud(userId);

    }, SAVE_DELAY);
  }

  /* =======================================================
     AUTHENTICATION EVENTS
  ======================================================= */

  function handleAuthReady(event) {
    const user = event.detail?.user;

    if (user?.id) {
      syncForUser(user.id);
    } else {
      activeUserId = null;
      syncing = false;
      syncVersion++;

      clearSaveTimer();
    }
  }

  function handleAuthChange(event) {
    const user = event.detail?.user;

    if (user?.id) {
      if (activeUserId !== user.id) {
        syncForUser(user.id);
      }

      return;
    }

    activeUserId = null;
    syncing = false;
    syncVersion++;

    clearSaveTimer();
  }

  /* =======================================================
     SETTINGS CHANGE EVENTS
  ======================================================= */

  function handleSettingsChange(event) {
    const change = event.detail?.change;

    if (
      change === "settings-cloud-load"
    ) {
      return;
    }

    scheduleSave();
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initialize() {
    if (initialized) return true;

    initialized = true;

    global.addEventListener(
      "ksk:auth-ready",
      handleAuthReady
    );

    global.addEventListener(
      "ksk:auth-change",
      handleAuthChange
    );

    global.addEventListener(
      "ksk:settings-change",
      handleSettingsChange
    );

    /*
     * If authentication already initialized
     * before this module started, sync immediately.
     */

    const user = getCurrentUser();

    if (user?.id) {
      syncForUser(user.id);
    }

    console.info(
      "KSK Settings Cloud Sync initialized."
    );

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKSettingsCloudSync = Object.freeze({
    initialize,

    sync() {
      const user = getCurrentUser();

      return user?.id
        ? syncForUser(user.id)
        : Promise.resolve(false);
    },

    save() {
      return activeUserId
        ? saveToCloud(activeUserId)
        : Promise.resolve(false);
    },

    getStatus() {
      return {
        initialized,
        syncing,
        authenticated: Boolean(activeUserId),
        userId: activeUserId
      };
    }
  });

  initialize();

})(window);
