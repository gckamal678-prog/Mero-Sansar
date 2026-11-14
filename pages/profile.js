
/* =========================================================
   MERO SANSAR — SUPABASE PROFILE ADAPTER
   File: core/supabase-profile.js

   Purpose:
   - Read authenticated user's own profile
   - Update allowed public profile fields
   - Never access private personal details
   - Never migrate or delete localStorage data
========================================================= */

(function (global) {
  "use strict";

  const PROFILE_COLUMNS = [
    "id",
    "name",
    "first_name",
    "last_name",
    "bio",
    "location",
    "avatar_url",
    "cover_url",
    "created_at",
    "updated_at",
    "onboarding_completed"
  ].join(",");

  let initialized = false;

  function getAuth() {
    return global.KSKSupabaseAuth || null;
  }

  function getClient() {
    const auth = getAuth();

    if (!auth || !auth.getClient) {
      throw new Error(
        "Supabase Authentication उपलब्ध छैन।"
      );
    }

    const client = auth.getClient();

    if (!client) {
      throw new Error(
        "Supabase Client तयार भएको छैन।"
      );
    }

    return client;
  }

  async function getCurrentUser() {
    const auth = getAuth();

    if (!auth) {
      throw new Error(
        "Authentication सेवा उपलब्ध छैन।"
      );
    }

    await auth.initialize();

    if (!auth.isAuthenticated()) {
      throw new Error(
        "यो सुविधा प्रयोग गर्न पहिले लगइन गर्नुहोस्।"
      );
    }

    const user = auth.getUser();

    if (!user || !user.id) {
      throw new Error(
        "प्रयोगकर्ताको पहिचान प्राप्त हुन सकेन।"
      );
    }

    return user;
  }

  function cleanText(value, maxLength) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .trim()
      .slice(0, maxLength);
  }

  function mapProfile(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,

      name: row.name || "",

      firstName: row.first_name || "",

      lastName: row.last_name || "",

      bio: row.bio || "",

      location: row.location || "",

      avatar: row.avatar_url || "",

      cover: row.cover_url || "",

      createdAt: row.created_at || null,

      updatedAt: row.updated_at || null,

      onboardingCompleted:
        Boolean(row.onboarding_completed)
    };
  }

  function throwIfError(error) {
    if (error) {
      throw new Error(
        error.message ||
        "प्रोफाइल अनुरोध पूरा हुन सकेन।"
      );
    }
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  async function initialize() {
    if (initialized) {
      return true;
    }

    const auth = getAuth();

    if (!auth) {
      throw new Error(
        "KSKSupabaseAuth लोड भएको छैन।"
      );
    }

    await auth.initialize();

    initialized = true;

    return true;
  }

  /* =======================================================
     GET MY PROFILE
  ======================================================= */

  async function getMyProfile() {
    await initialize();

    const user = await getCurrentUser();

    const client = getClient();

    const { data, error } = await client
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();

    throwIfError(error);

    if (!data) {
      return null;
    }

    return mapProfile(data);
  }

  /* =======================================================
     UPDATE MY PROFILE
  ======================================================= */

  async function updateMyProfile(profile = {}) {
    await initialize();

    if (
      !profile ||
      typeof profile !== "object" ||
      Array.isArray(profile)
    ) {
      throw new Error(
        "मान्य प्रोफाइल विवरण प्रदान गर्नुहोस्।"
      );
    }

    const user = await getCurrentUser();

    const client = getClient();

    const updates = {};

    if ("name" in profile) {
      updates.name = cleanText(
        profile.name,
        60
      );
    }

    if ("bio" in profile) {
      updates.bio = cleanText(
        profile.bio,
        240
      );
    }

    if ("location" in profile) {
      updates.location = cleanText(
        profile.location,
        100
      );
    }

    if ("avatar" in profile) {
      updates.avatar_url = cleanText(
        profile.avatar,
        200000
      );
    }

    if ("cover" in profile) {
      updates.cover_url = cleanText(
        profile.cover,
        200000
      );
    }

    if (Object.keys(updates).length === 0) {
      throw new Error(
        "परिवर्तन गर्न कुनै प्रोफाइल विवरण भेटिएन।"
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();

    throwIfError(error);

    if (!data) {
      throw new Error(
        "प्रोफाइल अपडेट भएन। आफ्नो अनुमति जाँच गर्नुहोस्।"
      );
    }

    return mapProfile(data);
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKSupabaseProfile = Object.freeze({
    initialize,

    getMyProfile,

    updateMyProfile,

    isInitialized() {
      return initialized;
    }
  });

})(window);
