
"use strict";

/*
 * MERO SANSAR — SUPABASE PROFILE ADAPTER
 *
 * - Load own profile
 * - Load another user's public profile by ID
 * - Update own profile only
 * - Normalize Supabase profile rows
 */

(function (global) {
  "use strict";

  if (global.KSKSupabaseProfile) return;

  const TABLE = "profiles";

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

  function getAuth() {
    return global.KSKSupabaseAuth || null;
  }

  async function getAuthenticatedContext() {
    const auth = getAuth();

    if (!auth) {
      throw new Error(
        "Supabase Authentication सेवा उपलब्ध छैन।"
      );
    }

    const initialized = await auth.initialize();

    if (!initialized || !auth.isAuthenticated()) {
      throw new Error(
        "यो काम गर्न पहिले आफ्नो खातामा लगइन गर्नुहोस्।"
      );
    }

    const client = auth.getClient();
    const user = auth.getUser();

    if (!client || !user?.id) {
      throw new Error(
        "प्रयोगकर्ता विवरण प्राप्त भएन।"
      );
    }

    return { client, user };
  }

  function normalizeProfile(row) {
    if (!row) return null;

    return {
      id: row.id || "",
      userId: row.id || "",

      name: row.name || "",

      firstName: row.first_name || "",
      lastName: row.last_name || "",

      bio: row.bio || "",
      location: row.location || "",

      avatar: row.avatar_url || "",
      cover: row.cover_url || "",

      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",

      onboardingCompleted:
        Boolean(row.onboarding_completed)
    };
  }

  function cleanText(value, fieldName, maxLength) {
    const text = String(value ?? "").trim();

    if (text.length > maxLength) {
      throw new Error(
        `${fieldName} बढीमा ${maxLength} अक्षरको हुनुपर्छ।`
      );
    }

    return text;
  }

  function buildUpdatePayload(profile) {
    if (
      !profile ||
      typeof profile !== "object" ||
      Array.isArray(profile)
    ) {
      throw new Error(
        "प्रोफाइल विवरण सही छैन।"
      );
    }

    const update = {};

    if (
      Object.prototype.hasOwnProperty.call(profile, "name")
    ) {
      update.name = cleanText(
        profile.name,
        "नाम",
        60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "firstName")
    ) {
      update.first_name = cleanText(
        profile.firstName,
        "पहिलो नाम",
        60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "first_name")
    ) {
      update.first_name = cleanText(
        profile.first_name,
        "पहिलो नाम",
        60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "lastName")
    ) {
      update.last_name = cleanText(
        profile.lastName,
        "थर",
        60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "last_name")
    ) {
      update.last_name = cleanText(
        profile.last_name,
        "थर",
        60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "bio")
    ) {
      update.bio = cleanText(
        profile.bio,
        "परिचय",
        240
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "location")
    ) {
      update.location = cleanText(
        profile.location,
        "ठेगाना",
        100
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "avatar")
    ) {
      update.avatar_url =
        String(profile.avatar || "").trim();
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "avatar_url")
    ) {
      update.avatar_url =
        String(profile.avatar_url || "").trim();
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "cover")
    ) {
      update.cover_url =
        String(profile.cover || "").trim();
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "cover_url")
    ) {
      update.cover_url =
        String(profile.cover_url || "").trim();
    }

    if (Object.keys(update).length === 0) {
      throw new Error(
        "अपडेट गर्न कुनै विवरण प्राप्त भएन।"
      );
    }

    return update;
  }

  /*
   * GET MY PROFILE
   */

  async function getMyProfile() {
    const auth = getAuth();

    if (!auth) return null;

    const initialized = await auth.initialize();

    if (!initialized || !auth.isAuthenticated()) {
      return null;
    }

    const client = auth.getClient();
    const user = auth.getUser();

    if (!client || !user?.id) {
      return null;
    }

    const { data, error } = await client
      .from(TABLE)
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Supabase Profile Load Failed:",
        error
      );

      throw error;
    }

    return normalizeProfile(data);
  }

  /*
   * GET ANOTHER USER'S PUBLIC PROFILE
   *
   * Reads only the selected profile row.
   * Supabase RLS remains responsible for access.
   */

  async function getProfileById(userId) {
    const id = String(userId || "").trim();

    if (!id) {
      throw new Error(
        "प्रयोगकर्ताको ID उपलब्ध भएन।"
      );
    }

    const { client, user } =
      await getAuthenticatedContext();

    if (id === String(user.id)) {
      return getMyProfile();
    }

    const { data, error } = await client
      .from(TABLE)
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(
        "Public Profile Load Failed:",
        error
      );

      throw error;
    }

    if (!data) {
      return null;
    }

    return normalizeProfile(data);
  }

  /*
   * UPDATE MY PROFILE ONLY
   */

  async function updateMyProfile(profile) {
    const { client, user } =
      await getAuthenticatedContext();

    const update = buildUpdatePayload(profile);

    const { data, error } = await client
      .from(TABLE)
      .update(update)
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error(
        "Supabase Profile Update Failed:",
        error
      );

      throw error;
    }

    if (!data) {
      throw new Error(
        "प्रोफाइल सुरक्षित भएन। आफ्नो प्रोफाइलको अनुमति जाँच गर्नुहोस्।"
      );
    }

    const result = normalizeProfile(data);

    global.dispatchEvent(
      new CustomEvent("ksk:profile-updated", {
        detail: {
          profile: result
        }
      })
    );

    return result;
  }

  /*
   * PUBLIC API
   */

  global.KSKSupabaseProfile = Object.freeze({
    initialize: async function () {
      const auth = getAuth();

      if (!auth) return false;

      return await auth.initialize();
    },

    getMyProfile,
    getProfileById,
    updateMyProfile,
    normalizeProfile
  });

  console.info(
    "KSK Supabase Profile Adapter loaded."
  );

})(window);
