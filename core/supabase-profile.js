
"use strict";

/*
 * MERO SANSAR — SUPABASE PROFILE ADAPTER
 *
 * - Load own profile
 * - Load another user's public profile by ID
 * - Update own profile only
 * - Manage private birthday settings through secure RPC
 * - Read another user's permitted birthday through secure RPC
 * - Manage work and study experiences with RLS
 * - Normalize Supabase profile rows
 */

(function (global) {
  "use strict";

  if (global.KSKSupabaseProfile) return;

  const TABLE = "profiles";
  const EXPERIENCE_TABLE = "profile_experiences";

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

  const EXPERIENCE_COLUMNS = [
    "id",
    "user_id",
    "experience_type",
    "organization_name",
    "role_title",
    "description",
    "start_date",
    "end_date",
    "is_current",
    "visibility",
    "created_at",
    "updated_at"
  ].join(",");

  const BIRTHDAY_VISIBILITIES = [
    "public",
    "friends",
    "only_me"
  ];

  const EXPERIENCE_TYPES = [
    "work",
    "study"
  ];

  const EXPERIENCE_VISIBILITIES = [
    "public",
    "friends",
    "only_me"
  ];

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
      update.name = cleanText(profile.name, "नाम", 60);
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "firstName")
    ) {
      update.first_name = cleanText(
        profile.firstName, "पहिलो नाम", 60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "first_name")
    ) {
      update.first_name = cleanText(
        profile.first_name, "पहिलो नाम", 60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "lastName")
    ) {
      update.last_name = cleanText(
        profile.lastName, "थर", 60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "last_name")
    ) {
      update.last_name = cleanText(
        profile.last_name, "थर", 60
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "bio")
    ) {
      update.bio = cleanText(profile.bio, "परिचय", 240);
    }

    if (
      Object.prototype.hasOwnProperty.call(profile, "location")
    ) {
      update.location = cleanText(
        profile.location, "ठेगाना", 100
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
   * DATE VALIDATION
   */

  function validateDate(value, fieldName, required = false) {
    const date = String(value || "").trim();

    if (!date) {
      if (required) {
        throw new Error(
          `${fieldName} राख्नुहोस्।`
        );
      }

      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(
        `${fieldName} YYYY-MM-DD ढाँचामा हुनुपर्छ।`
      );
    }

    const parsed = new Date(date + "T00:00:00Z");

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      throw new Error(
        `${fieldName} सही मिति हुनुपर्छ।`
      );
    }

    const now = new Date();
    const today =
      now.getUTCFullYear() + "-" +
      String(now.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(now.getUTCDate()).padStart(2, "0");

    if (date > today) {
      throw new Error(
        `${fieldName} भविष्यको मिति हुन सक्दैन।`
      );
    }

    return date;
  }

  function validateBirthDate(value) {
    return validateDate(value, "जन्ममिति", true);
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

    if (!data) return null;

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
        detail: { profile: result }
      })
    );

    return result;
  }

  /*
   * GET MY PRIVATE BIRTHDAY SETTINGS
   */

  async function getMyBirthdaySettings() {
    const { client } =
      await getAuthenticatedContext();

    const { data, error } = await client.rpc(
      "get_my_birthday_settings"
    );

    if (error) {
      console.error(
        "Birthday Settings Load Failed:",
        error
      );

      throw error;
    }

    const row = Array.isArray(data)
      ? data[0]
      : data;

    if (!row) return null;

    return {
      dateOfBirth: row.date_of_birth || "",
      birthdayVisibility:
        row.birthday_visibility || "only_me",
      showBirthYear:
        Boolean(row.show_birth_year)
    };
  }

  /*
   * UPDATE MY PRIVATE BIRTHDAY SETTINGS
   */

  async function updateMyBirthdaySettings(settings) {
    if (
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings)
    ) {
      throw new Error(
        "जन्मदिन सेटिङ सही छैन।"
      );
    }

    const dateOfBirth = validateBirthDate(
      settings.dateOfBirth ?? settings.date_of_birth
    );

    const birthdayVisibility = String(
      settings.birthdayVisibility ??
      settings.birthday_visibility ??
      ""
    ).trim();

    if (
      !BIRTHDAY_VISIBILITIES.includes(birthdayVisibility)
    ) {
      throw new Error(
        "जन्मदिन देखाउने गोपनीयता विकल्प सही छैन।"
      );
    }

    if (typeof settings.showBirthYear !== "boolean") {
      throw new Error(
        "जन्म वर्ष देखाउने विकल्प true वा false हुनुपर्छ।"
      );
    }

    const { client } =
      await getAuthenticatedContext();

    const { data, error } = await client.rpc(
      "update_my_birthday_settings",
      {
        p_date_of_birth: dateOfBirth,
        p_birthday_visibility: birthdayVisibility,
        p_show_birth_year: settings.showBirthYear
      }
    );

    if (error) {
      console.error(
        "Birthday Settings Update Failed:",
        error
      );

      throw error;
    }

    if (data !== true) {
      throw new Error(
        "जन्मदिन सेटिङ सुरक्षित भएको पुष्टि भएन।"
      );
    }

    const result = {
      dateOfBirth,
      birthdayVisibility,
      showBirthYear: settings.showBirthYear
    };

    global.dispatchEvent(
      new CustomEvent("ksk:birthday-updated", {
        detail: { settings: result }
      })
    );

    return result;
  }

  /*
   * GET ANOTHER USER'S PERMITTED BIRTHDAY
   */

  async function getProfileBirthday(userId) {
    const id = String(userId || "").trim();

    if (!id) {
      throw new Error(
        "प्रयोगकर्ताको ID उपलब्ध भएन।"
      );
    }

    const { client } =
      await getAuthenticatedContext();

    const { data, error } = await client.rpc(
      "get_profile_birthday",
      {
        p_user_id: id
      }
    );

    if (error) {
      console.error(
        "Profile Birthday Load Failed:",
        error
      );

      throw error;
    }

    const row = Array.isArray(data)
      ? data[0]
      : data;

    if (!row) return null;

    return {
      birthMonth:
        row.birth_month == null
          ? null
          : Number(row.birth_month),

      birthDay:
        row.birth_day == null
          ? null
          : Number(row.birth_day),

      birthYear:
        row.birth_year == null
          ? null
          : Number(row.birth_year)
    };
  }

  /*
   * EXPERIENCE NORMALIZATION
   */

  function normalizeExperience(row) {
    if (!row) return null;

    return {
      id: row.id || "",
      userId: row.user_id || "",

      type: row.experience_type || "",

      organizationName: row.organization_name || "",
      roleTitle: row.role_title || "",
      description: row.description || "",

      startDate: row.start_date || "",
      endDate: row.end_date || "",

      isCurrent: Boolean(row.is_current),
      visibility: row.visibility || "only_me",

      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  /*
   * EXPERIENCE VALIDATION
   */

  function buildExperiencePayload(experience) {
    if (
      !experience ||
      typeof experience !== "object" ||
      Array.isArray(experience)
    ) {
      throw new Error(
        "Work/Study विवरण सही छैन।"
      );
    }

    const type = String(
      experience.type ??
      experience.experienceType ??
      experience.experience_type ??
      ""
    ).trim().toLowerCase();

    if (!EXPERIENCE_TYPES.includes(type)) {
      throw new Error(
        "विवरण Work वा Study हुनुपर्छ।"
      );
    }

    const organizationName = cleanText(
      experience.organizationName ??
      experience.organization_name ??
      "",
      type === "work" ? "कम्पनीको नाम" : "विद्यालय/कलेजको नाम",
      120
    );

    const roleTitle = cleanText(
      experience.roleTitle ??
      experience.role_title ??
      "",
      type === "work" ? "पद" : "तह वा विषय",
      120
    );

    if (!organizationName || !roleTitle) {
      throw new Error(
        "संस्था र पद/तहको विवरण आवश्यक छ।"
      );
    }

    const description = cleanText(
      experience.description || "",
      "विवरण",
      500
    );

    const startDate = validateDate(
      experience.startDate ?? experience.start_date,
      "सुरु मिति"
    );

    const isCurrent = Boolean(
      experience.isCurrent ?? experience.is_current
    );

    const endDate = isCurrent
      ? null
      : validateDate(
          experience.endDate ?? experience.end_date,
          "अन्त्य मिति"
        );

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      throw new Error(
        "अन्त्य मिति सुरु मितिभन्दा अगाडिको हुन सक्दैन।"
      );
    }

    const visibility = String(
      experience.visibility || "only_me"
    ).trim();

    if (
      !EXPERIENCE_VISIBILITIES.includes(visibility)
    ) {
      throw new Error(
        "गोपनीयता विकल्प सही छैन।"
      );
    }

    return {
      experience_type: type,
      organization_name: organizationName,
      role_title: roleTitle,
      description,
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent,
      visibility
    };
  }

  /*
   * GET MY WORK / STUDY EXPERIENCES
   */

  async function getMyExperiences(type) {
    const { client, user } =
      await getAuthenticatedContext();

    let query = client
      .from(EXPERIENCE_TABLE)
      .select(EXPERIENCE_COLUMNS)
      .eq("user_id", user.id);

    if (type) {
      const normalizedType = String(type).trim().toLowerCase();

      if (!EXPERIENCE_TYPES.includes(normalizedType)) {
        throw new Error(
          "विवरण Work वा Study हुनुपर्छ।"
        );
      }

      query = query.eq("experience_type", normalizedType);
    }

    const { data, error } = await query
      .order("start_date", {
        ascending: false,
        nullsFirst: false
      })
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error(
        "My Experiences Load Failed:",
        error
      );

      throw error;
    }

    return (data || [])
      .map(normalizeExperience)
      .filter(Boolean);
  }

  /*
   * GET ANOTHER USER'S PERMITTED EXPERIENCES
   *
   * Database RLS checks visibility, friendship
   * and either-direction block restrictions.
   */

  async function getProfileExperiences(userId, type) {
    const id = String(userId || "").trim();

    if (!id) {
      throw new Error(
        "प्रयोगकर्ताको ID उपलब्ध भएन।"
      );
    }

    const { client } =
      await getAuthenticatedContext();

    let query = client
      .from(EXPERIENCE_TABLE)
      .select(EXPERIENCE_COLUMNS)
      .eq("user_id", id);

    if (type) {
      const normalizedType = String(type).trim().toLowerCase();

      if (!EXPERIENCE_TYPES.includes(normalizedType)) {
        throw new Error(
          "विवरण Work वा Study हुनुपर्छ।"
        );
      }

      query = query.eq("experience_type", normalizedType);
    }

    const { data, error } = await query
      .order("start_date", {
        ascending: false,
        nullsFirst: false
      })
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error(
        "Profile Experiences Load Failed:",
        error
      );

      throw error;
    }

    return (data || [])
      .map(normalizeExperience)
      .filter(Boolean);
  }

  /*
   * ADD MY WORK / STUDY EXPERIENCE
   */

  async function addMyExperience(experience) {
    const { client, user } =
      await getAuthenticatedContext();

    const payload = buildExperiencePayload(experience);

    const { data, error } = await client
      .from(EXPERIENCE_TABLE)
      .insert({
        ...payload,
        user_id: user.id
      })
      .select(EXPERIENCE_COLUMNS)
      .single();

    if (error) {
      console.error(
        "Experience Insert Failed:",
        error
      );

      throw error;
    }

    const result = normalizeExperience(data);

    global.dispatchEvent(
      new CustomEvent("ksk:experience-updated", {
        detail: {
          action: "added",
          experience: result
        }
      })
    );

    return result;
  }

  /*
   * UPDATE MY OWN EXPERIENCE ONLY
   */

  async function updateMyExperience(id, experience) {
    const experienceId = String(id || "").trim();

    if (!experienceId) {
      throw new Error(
        "विवरणको ID उपलब्ध भएन।"
      );
    }

    const { client, user } =
      await getAuthenticatedContext();

    const payload = buildExperiencePayload(experience);

    const { data, error } = await client
      .from(EXPERIENCE_TABLE)
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", experienceId)
      .eq("user_id", user.id)
      .select(EXPERIENCE_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error(
        "Experience Update Failed:",
        error
      );

      throw error;
    }

    if (!data) {
      throw new Error(
        "विवरण अपडेट भएन वा यो विवरण तपाईंको होइन।"
      );
    }

    const result = normalizeExperience(data);

    global.dispatchEvent(
      new CustomEvent("ksk:experience-updated", {
        detail: {
          action: "updated",
          experience: result
        }
      })
    );

    return result;
  }

  /*
   * DELETE MY OWN EXPERIENCE ONLY
   */

  async function deleteMyExperience(id) {
    const experienceId = String(id || "").trim();

    if (!experienceId) {
      throw new Error(
        "विवरणको ID उपलब्ध भएन।"
      );
    }

    const { client, user } =
      await getAuthenticatedContext();

    const { data, error } = await client
      .from(EXPERIENCE_TABLE)
      .delete()
      .eq("id", experienceId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "Experience Delete Failed:",
        error
      );

      throw error;
    }

    if (!data) {
      throw new Error(
        "विवरण हटेन वा यो विवरण तपाईंको होइन।"
      );
    }

    global.dispatchEvent(
      new CustomEvent("ksk:experience-updated", {
        detail: {
          action: "deleted",
          id: experienceId
        }
      })
    );

    return true;
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

    getMyBirthdaySettings,
    updateMyBirthdaySettings,
    getProfileBirthday,

    getMyExperiences,
    getProfileExperiences,
    addMyExperience,
    updateMyExperience,
    deleteMyExperience,

    normalizeProfile,
    normalizeExperience
  });

  console.info(
    "KSK Supabase Profile Adapter loaded."
  );

})(window);
