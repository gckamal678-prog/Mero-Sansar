
"use strict";

/* =========================================================
   KSK — SUPABASE SETTINGS ADAPTER

   Responsibilities:
   - Load authenticated user's settings
   - Save settings to public.user_settings
   - Enforce current-user ownership
   - Keep database errors visible to caller

   Requires:
   - core/supabase-auth.js
   - public.user_settings
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSupabaseSettings) return;

  const TABLE = "user_settings";

  let initialized = false;

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function normalizeSettings(value) {
    return isObject(value) ? value : {};
  }

  async function getContext() {
    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      throw new Error(
        "Supabase Auth module is not loaded."
      );
    }

    await auth.initialize();

    const client = auth.getClient();
    const user = auth.getUser();

    if (!client) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    if (!user?.id) {
      throw new Error(
        "Please sign in to access your settings."
      );
    }

    return { client, user };
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  async function initialize() {
    await getContext();

    initialized = true;

    return true;
  }

  /* =======================================================
     LOAD CURRENT USER SETTINGS
  ======================================================= */

  async function loadMySettings() {
    const { client, user } = await getContext();

    const { data, error } = await client
      .from(TABLE)
      .select("settings, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        settings: null,
        updatedAt: null,
        exists: false
      };
    }

    return {
      settings: normalizeSettings(data.settings),
      updatedAt: data.updated_at || null,
      exists: true
    };
  }

  /* =======================================================
     SAVE CURRENT USER SETTINGS
  ======================================================= */

  async function saveMySettings(settings) {
    if (!isObject(settings)) {
      throw new TypeError(
        "Settings must be a valid object."
      );
    }

    const { client, user } = await getContext();

    const payload = {
      user_id: user.id,
      settings: normalizeSettings(settings),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from(TABLE)
      .upsert(payload, {
        onConflict: "user_id"
      })
      .select("settings, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return {
      settings: normalizeSettings(data.settings),
      updatedAt: data.updated_at || null,
      exists: true
    };
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKSupabaseSettings = Object.freeze({
    initialize,
    loadMySettings,
    saveMySettings,

    isInitialized() {
      return initialized;
    }
  });

  console.info(
    "KSK Supabase Settings Adapter initialized."
  );

})(window);
