"use strict";

/*
 * MERO SANSAR — SUPABASE CLIENT FOUNDATION
 *
 * Responsibilities:
 * - Create one Supabase client
 * - Expose safe Auth and profile methods
 * - Publish auth state changes to the application
 *
 * This module does not render UI or migrate local data.
 */

(function (global) {
  "use strict";

  if (global.KSKSupabase) return;

  const SUPABASE_URL =
    "https://sacyjxnobzunrwzxhwjs.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_IikjX5V1uUuhVuCUt569nw_ORYE5cQH";

  let client = null;
  let initializationError = null;
  let authSubscription = null;
  let initialized = false;

  function createError(message, code) {
    const error = new Error(message);

    if (code) {
      error.code = code;
    }

    return error;
  }

  function getClient() {
    if (client) return client;

    if (initializationError) {
      throw initializationError;
    }

    const library = global.supabase;

    if (
      !library ||
      typeof library.createClient !== "function"
    ) {
      initializationError = createError(
        "Supabase library is not loaded. Check the script order in index.html.",
        "SUPABASE_LIBRARY_MISSING"
      );

      throw initializationError;
    }

    try {
      client = library.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        }
      );

      return client;

    } catch (error) {
      initializationError = error instanceof Error
        ? error
        : createError(
            "Supabase client initialization failed."
          );

      throw initializationError;
    }
  }

  function normalizeAuthError(error) {
    if (!error) {
      return createError("Authentication failed.");
    }

    const message = String(
      error.message || ""
    ).trim();

    const code =
      error.code ||
      error.status ||
      "";

    return createError(
      message ||
      "Authentication failed. Please try again.",
      code ? String(code) : "AUTH_ERROR"
    );
  }

  function validateEmail(email) {
    const value = String(email || "")
      .trim()
      .toLowerCase();

    if (
      !value ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      throw createError(
        "कृपया सही इमेल ठेगाना राख्नुहोस्।",
        "INVALID_EMAIL"
      );
    }

    return value;
  }

  function validatePassword(password) {
    const value = String(password || "");

    if (value.length < 8) {
      throw createError(
        "पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।",
        "WEAK_PASSWORD"
      );
    }

    return value;
  }

  /* =====================================================
     SIGN UP
  ===================================================== */

  async function signUp({
    name,
    email,
    password
  } = {}) {

    const safeEmail = validateEmail(email);
    const safePassword = validatePassword(password);

    const safeName = String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 60);

    if (!safeName) {
      throw createError(
        "कृपया आफ्नो नाम राख्नुहोस्।",
        "INVALID_NAME"
      );
    }

    try {
      const { data, error } =
        await getClient().auth.signUp({
          email: safeEmail,
          password: safePassword,
          options: {
            data: {
              name: safeName
            }
          }
        });

      if (error) {
        throw normalizeAuthError(error);
      }

      return data;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     SIGN IN
  ===================================================== */

  async function signIn({
    email,
    password
  } = {}) {

    const safeEmail = validateEmail(email);
    const safePassword = String(password || "");

    if (!safePassword) {
      throw createError(
        "कृपया पासवर्ड राख्नुहोस्।",
        "INVALID_PASSWORD"
      );
    }

    try {
      const { data, error } =
        await getClient().auth.signInWithPassword({
          email: safeEmail,
          password: safePassword
        });

      if (error) {
        throw normalizeAuthError(error);
      }

      return data;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     SIGN OUT
  ===================================================== */

  async function signOut() {
    try {
      const { error } =
        await getClient().auth.signOut();

      if (error) {
        throw normalizeAuthError(error);
      }

      return true;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     PASSWORD RESET
  ===================================================== */

  async function sendPasswordReset(
    email,
    redirectTo
  ) {

    const safeEmail = validateEmail(email);

    const options = {};

    if (redirectTo) {
      options.redirectTo = String(redirectTo);
    }

    try {
      const { data, error } =
        await getClient().auth.resetPasswordForEmail(
          safeEmail,
          options
        );

      if (error) {
        throw normalizeAuthError(error);
      }

      return data;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     SESSION
  ===================================================== */

  async function getSession() {
    try {
      const { data, error } =
        await getClient().auth.getSession();

      if (error) {
        throw normalizeAuthError(error);
      }

      return data.session || null;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     CURRENT USER
  ===================================================== */

  async function getUser() {
    try {
      const { data, error } =
        await getClient().auth.getUser();

      if (error) {
        throw normalizeAuthError(error);
      }

      return data.user || null;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     GET PROFILE
  ===================================================== */

  async function getProfile(userId) {
    const id = String(userId || "").trim();

    if (!id) {
      throw createError(
        "प्रयोगकर्ता पहिचान उपलब्ध छैन।",
        "USER_ID_REQUIRED"
      );
    }

    try {
      const { data, error } =
        await getClient()
          .from("profiles")
          .select(
            "id,name,bio,location,avatar_url,cover_url,created_at,updated_at"
          )
          .eq("id", id)
          .single();

      if (error) {
        throw normalizeAuthError(error);
      }

      return data;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     UPDATE PROFILE
  ===================================================== */

  async function updateProfile(changes = {}) {
    const user = await getUser();

    if (!user) {
      throw createError(
        "प्रोफाइल सम्पादन गर्न पहिले लगइन गर्नुहोस्।",
        "NOT_AUTHENTICATED"
      );
    }

    const allowed = [
      "name",
      "bio",
      "location",
      "avatar_url",
      "cover_url"
    ];

    const update = {};

    allowed.forEach(key => {
      if (
        Object.prototype.hasOwnProperty.call(
          changes,
          key
        )
      ) {
        update[key] = changes[key];
      }
    });

    if (Object.keys(update).length === 0) {
      throw createError(
        "अपडेट गर्न कुनै परिवर्तन दिइएको छैन।",
        "EMPTY_PROFILE_UPDATE"
      );
    }

    if ("name" in update) {
      update.name = String(update.name || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60);

      if (!update.name) {
        throw createError(
          "नाम खाली राख्न मिल्दैन।",
          "INVALID_NAME"
        );
      }
    }

    if ("bio" in update) {
      update.bio = String(update.bio || "")
        .trim()
        .slice(0, 240);
    }

    if ("location" in update) {
      update.location = String(update.location || "")
        .trim()
        .slice(0, 100);
    }

    try {
      const { data, error } =
        await getClient()
          .from("profiles")
          .update(update)
          .eq("id", user.id)
          .select(
            "id,name,bio,location,avatar_url,cover_url,created_at,updated_at"
          )
          .single();

      if (error) {
        throw normalizeAuthError(error);
      }

      return data;

    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     AUTH STATE LISTENER
  ===================================================== */

  function onAuthStateChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "onAuthStateChange requires a callback function."
      );
    }

    const { data, error } =
      getClient().auth.onAuthStateChange(
        (event, session) => {

          try {
            callback(event, session || null);

          } catch (callbackError) {
            console.error(
              "KSKSupabase auth callback failed:",
              callbackError
            );
          }

          global.dispatchEvent(
            new CustomEvent(
              "ksk:auth-state-change",
              {
                detail: {
                  event,
                  session: session || null,
                  user: session?.user || null
                }
              }
            )
          );
        }
      );

    if (error) {
      throw normalizeAuthError(error);
    }

    authSubscription =
      data?.subscription || null;

    return authSubscription;
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  function initialize() {
    if (initialized) return true;

    getClient();

    initialized = true;

    return true;
  }

  /* =====================================================
     DESTROY
  ===================================================== */

  function destroy() {
    if (authSubscription?.unsubscribe) {
      authSubscription.unsubscribe();
    }

    authSubscription = null;

    return true;
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  global.KSKSupabase = Object.freeze({

    initialize,
    getClient,

    signUp,
    signIn,
    signOut,

    sendPasswordReset,

    getSession,
    getUser,

    getProfile,
    updateProfile,

    onAuthStateChange,

    destroy

  });

})(window);
