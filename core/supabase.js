
"use strict";

/*
 * MERO SANSAR — SUPABASE CLIENT
 * Authentication, public profile and private member details.
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
    if (code) error.code = code;
    return error;
  }

  function getClient() {
    if (client) return client;
    if (initializationError) throw initializationError;

    const library = global.supabase;

    if (!library || typeof library.createClient !== "function") {
      initializationError = createError(
        "Supabase library is not loaded.",
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
        : createError("Supabase client initialization failed.");

      throw initializationError;
    }
  }

  function normalizeAuthError(error) {
    if (!error) return createError("Authentication failed.");

    const message = String(error.message || "").trim();
    const code = error.code || error.status || "";

    return createError(
      message || "Authentication failed. Please try again.",
      code ? String(code) : "AUTH_ERROR"
    );
  }

  function validateEmail(email) {
    const value = String(email || "").trim().toLowerCase();

    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
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

  function cleanText(value, maxLength) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, maxLength);
  }

  function validateSignupDetails(details = {}) {
    const firstName = cleanText(details.firstName, 60);
    const lastName = cleanText(details.lastName, 60);
    const location = cleanText(details.location, 100);
    const birthDate = String(details.birthDate || "").trim();
    const gender = String(details.gender || "").trim();

    if (!firstName) {
      throw createError("कृपया आफ्नो नाम लेख्नुहोस्।", "INVALID_FIRST_NAME");
    }

    if (!lastName) {
      throw createError("कृपया आफ्नो थर लेख्नुहोस्।", "INVALID_LAST_NAME");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      throw createError("कृपया सही जन्ममिति छान्नुहोस्।", "INVALID_BIRTH_DATE");
    }

    const parsedDate = new Date(`${birthDate}T00:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== birthDate ||
      birthDate > new Date().toISOString().slice(0, 10)
    ) {
      throw createError("जन्ममिति सही राख्नुहोस्।", "INVALID_BIRTH_DATE");
    }

    if (!["पुरुष", "महिला", "अन्य"].includes(gender)) {
      throw createError("कृपया लिङ्ग छान्नुहोस्।", "INVALID_GENDER");
    }

    if (!location) {
      throw createError("कृपया आफ्नो सहर वा जिल्ला लेख्नुहोस्।", "INVALID_LOCATION");
    }

    return {
      firstName,
      lastName,
      location,
      birthDate,
      gender
    };
  }

  /* =====================================================
     SIGN UP
  ===================================================== */

  async function signUp({
    firstName,
    lastName,
    location,
    birthDate,
    gender,
    email,
    password
  } = {}) {
    const safeEmail = validateEmail(email);
    const safePassword = validatePassword(password);

    const details = validateSignupDetails({
      firstName,
      lastName,
      location,
      birthDate,
      gender
    });

    const fullName = cleanText(
      `${details.firstName} ${details.lastName}`,
      60
    );

    try {
      const { data, error } = await getClient().auth.signUp({
        email: safeEmail,
        password: safePassword,
        options: {
          data: {
            first_name: details.firstName,
            last_name: details.lastName,
            name: fullName,
            location: details.location,
            birth_date: details.birthDate,
            gender: details.gender
          }
        }
      });

      if (error) throw normalizeAuthError(error);

      return data;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     SIGN IN
  ===================================================== */

  async function signIn({ email, password } = {}) {
    const safeEmail = validateEmail(email);
    const safePassword = String(password || "");

    if (!safePassword) {
      throw createError("कृपया पासवर्ड राख्नुहोस्।", "INVALID_PASSWORD");
    }

    try {
      const { data, error } =
        await getClient().auth.signInWithPassword({
          email: safeEmail,
          password: safePassword
        });

      if (error) throw normalizeAuthError(error);
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
      const { error } = await getClient().auth.signOut();

      if (error) throw normalizeAuthError(error);
      return true;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     PASSWORD RESET
  ===================================================== */

  async function sendPasswordReset(email, redirectTo) {
    const safeEmail = validateEmail(email);
    const options = {};

    if (redirectTo) options.redirectTo = String(redirectTo);

    try {
      const { data, error } =
        await getClient().auth.resetPasswordForEmail(
          safeEmail,
          options
        );

      if (error) throw normalizeAuthError(error);
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
      const { data, error } = await getClient().auth.getSession();

      if (error) throw normalizeAuthError(error);
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
      const { data, error } = await getClient().auth.getUser();

      if (error) throw normalizeAuthError(error);
      return data.user || null;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     GET PUBLIC PROFILE
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
      const { data, error } = await getClient()
        .from("profiles")
        .select(
          "id,name,first_name,last_name,bio,location,avatar_url,cover_url,onboarding_completed,created_at,updated_at"
        )
        .eq("id", id)
        .single();

      if (error) throw normalizeAuthError(error);
      return data;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     GET PRIVATE PROFILE DETAILS
     Only the logged-in member can read their own details.
  ===================================================== */

  async function getPrivateProfileDetails() {
    const user = await getUser();

    if (!user) {
      throw createError(
        "पहिले आफ्नो खातामा लगइन गर्नुहोस्।",
        "NOT_AUTHENTICATED"
      );
    }

    try {
      const { data, error } = await getClient()
        .from("profile_private_details")
        .select("user_id,date_of_birth,gender,created_at,updated_at")
        .eq("user_id", user.id)
        .single();

      if (error) throw normalizeAuthError(error);
      return data;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     UPDATE PRIVATE PROFILE DETAILS
  ===================================================== */

  async function updatePrivateProfileDetails(changes = {}) {
    const user = await getUser();

    if (!user) {
      throw createError(
        "पहिले आफ्नो खातामा लगइन गर्नुहोस्।",
        "NOT_AUTHENTICATED"
      );
    }

    const update = {};

    if (Object.prototype.hasOwnProperty.call(changes, "date_of_birth")) {
      const date = String(changes.date_of_birth || "").trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw createError("जन्ममिति सही राख्नुहोस्।", "INVALID_BIRTH_DATE");
      }

      update.date_of_birth = date;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "gender")) {
      const gender = String(changes.gender || "").trim();

      if (!["पुरुष", "महिला", "अन्य"].includes(gender)) {
        throw createError("लिङ्ग छान्नुहोस्।", "INVALID_GENDER");
      }

      update.gender = gender;
    }

    if (!Object.keys(update).length) {
      throw createError(
        "परिवर्तन गर्न कुनै विवरण दिइएको छैन।",
        "EMPTY_PRIVATE_PROFILE_UPDATE"
      );
    }

    try {
      const { data, error } = await getClient()
        .from("profile_private_details")
        .update(update)
        .eq("user_id", user.id)
        .select("user_id,date_of_birth,gender,created_at,updated_at")
        .single();

      if (error) throw normalizeAuthError(error);
      return data;
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  /* =====================================================
     UPDATE PUBLIC PROFILE
  ===================================================== */

  async function updateProfile(changes = {}) {
    const user = await getUser();

    if (!user) {
      throw createError(
        "प्रोफाइल परिवर्तन गर्न पहिले लगइन गर्नुहोस्।",
        "NOT_AUTHENTICATED"
      );
    }

    const allowed = [
      "name",
      "first_name",
      "last_name",
      "bio",
      "location",
      "avatar_url",
      "cover_url"
    ];

    const update = {};

    allowed.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(changes, key)) {
        update[key] = changes[key];
      }
    });

    if (!Object.keys(update).length) {
      throw createError(
        "परिवर्तन गर्न कुनै विवरण दिइएको छैन।",
        "EMPTY_PROFILE_UPDATE"
      );
    }

    ["name", "first_name", "last_name"].forEach(key => {
      if (key in update) {
        update[key] = cleanText(update[key], 60);

        if (!update[key]) {
          throw createError("नाम खाली राख्न मिल्दैन।", "INVALID_NAME");
        }
      }
    });

    if ("bio" in update) {
      update.bio = cleanText(update.bio, 240);
    }

    if ("location" in update) {
      update.location = cleanText(update.location, 100);
    }

    try {
      const { data, error } = await getClient()
        .from("profiles")
        .update(update)
        .eq("id", user.id)
        .select(
          "id,name,first_name,last_name,bio,location,avatar_url,cover_url,onboarding_completed,created_at,updated_at"
        )
        .single();

      if (error) throw normalizeAuthError(error);
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

    const { data, error } = getClient().auth.onAuthStateChange(
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
          new CustomEvent("ksk:auth-state-change", {
            detail: {
              event,
              session: session || null,
              user: session?.user || null
            }
          })
        );
      }
    );

    if (error) throw normalizeAuthError(error);

    authSubscription = data?.subscription || null;
    return authSubscription;
  }

  function initialize() {
    if (initialized) return true;
    getClient();
    initialized = true;
    return true;
  }

  function destroy() {
    if (authSubscription?.unsubscribe) {
      authSubscription.unsubscribe();
    }

    authSubscription = null;
    return true;
  }

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
    getPrivateProfileDetails,
    updatePrivateProfileDetails,
    updateProfile,
    onAuthStateChange,
    destroy
  });

})(window);
