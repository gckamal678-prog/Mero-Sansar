
"use strict";

/*
 * =========================================================
 * MERO SANSAR — SUPABASE FRIENDS ADAPTER
 *
 * Version: 1.1.0
 *
 * - Supabase Auth UUID आधारित सामाजिक सम्बन्ध
 * - Profile search by display name
 * - Friend requests
 * - Accept / Reject / Cancel
 * - Accepted friendships
 * - Existing localStorage data untouched
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKSupabaseFriends) return;

  const TABLE_REQUESTS = "friend_requests";
  const TABLE_FRIENDSHIPS = "friendships";
  const TABLE_PROFILES = "profiles";

  const REQUEST_FIELDS =
    "id,sender_id,receiver_id,status,created_at,updated_at";

  let initialized = false;

  function failure(code, message) {
    return {
      ok: false,
      code: code || "UNKNOWN_ERROR",
      message: message || "अनुरोध पूरा हुन सकेन।",
      data: null
    };
  }

  function success(data, code = "OK") {
    return {
      ok: true,
      code,
      message: "",
      data: data === undefined ? null : data
    };
  }

  function normalizeUuid(value) {
    if (typeof value !== "string") return "";

    const id = value.trim();

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return uuidPattern.test(id) ? id : "";
  }

  function getAuth() {
    return global.KSKSupabaseAuth || null;
  }

  function getClient() {
    return getAuth()?.getClient?.() || null;
  }

  function getCurrentUser() {
    const auth = getAuth();

    if (!auth?.isAuthenticated?.()) {
      return null;
    }

    return auth.getUser?.() || null;
  }

  function getCurrentUserId() {
    return normalizeUuid(getCurrentUser()?.id);
  }

  function normalizeRequest(row) {
    if (!row) return null;

    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function normalizeFriend(row, currentUserId) {
    if (!row) return null;

    const friendId =
      row.user_a_id === currentUserId
        ? row.user_b_id
        : row.user_a_id;

    return {
      userId: friendId,
      createdAt: row.created_at
    };
  }

  function notifyChange(type) {
    try {
      global.dispatchEvent(
        new CustomEvent("ksk:friends-cloud-change", {
          detail: { type }
        })
      );
    } catch (error) {
      // Event notification is optional.
    }
  }

  function handleError(error) {
    const code = error?.code || "SUPABASE_ERROR";
    const message = String(
      error?.message || "Supabase अनुरोध असफल भयो।"
    );

    if (code === "23505") {
      return failure("DUPLICATE_REQUEST", message);
    }

    if (code === "42501") {
      return failure("NOT_AUTHORIZED", message);
    }

    if (code === "23503") {
      return failure("USER_NOT_FOUND", message);
    }

    return failure(code, message);
  }

  async function requireClient() {
    const auth = getAuth();

    if (!auth) {
      return failure(
        "AUTH_MODULE_MISSING",
        "Supabase Auth module उपलब्ध छैन।"
      );
    }

    try {
      await auth.initialize();
    } catch (error) {
      return handleError(error);
    }

    if (!auth.isAuthenticated?.()) {
      return failure(
        "NOT_AUTHENTICATED",
        "पहिले आफ्नो खातामा लगइन गर्नुहोस्।"
      );
    }

    const client = getClient();

    if (!client) {
      return failure(
        "SUPABASE_CLIENT_MISSING",
        "Supabase Client तयार भएको छैन।"
      );
    }

    const userId = getCurrentUserId();

    if (!userId) {
      return failure(
        "INVALID_AUTH_USER",
        "प्रयोगकर्ताको Auth ID मान्य छैन।"
      );
    }

    return success({
      client,
      userId
    });
  }

  async function initialize() {
    const auth = getAuth();

    if (!auth) {
      return failure(
        "AUTH_MODULE_MISSING",
        "Supabase Auth module लोड भएको छैन।"
      );
    }

    try {
      await auth.initialize();

      initialized = Boolean(
        auth.isAuthenticated?.() &&
        getClient() &&
        getCurrentUserId()
      );

      return initialized
        ? success(true, "INITIALIZED")
        : failure(
            "NOT_AUTHENTICATED",
            "Friends सेवा प्रयोग गर्न लगइन आवश्यक छ।"
          );

    } catch (error) {
      initialized = false;
      return handleError(error);
    }
  }

  /*
   * SEARCH USERS
   *
   * Searches real Supabase profiles by display name.
   * Returns actual Auth UUIDs for friend requests.
   */

  async function searchUsers(searchText, options = {}) {
    const term = String(searchText ?? "")
      .trim()
      .replace(/\s+/g, " ");

    if (term.length < 2) {
      return failure(
        "SEARCH_TOO_SHORT",
        "कम्तीमा २ अक्षर लेखेर खोज्नुहोस्।"
      );
    }

    if (term.length > 60) {
      return failure(
        "SEARCH_TOO_LONG",
        "खोजी शब्द बढीमा ६० अक्षरको हुनुपर्छ।"
      );
    }

    const ready = await requireClient();

    if (!ready.ok) return ready;

    const { client, userId } = ready.data;

    const requestedLimit = Number(options.limit || 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(20, Math.max(1, Math.floor(requestedLimit)))
      : 20;

    /*
     * Treat user-entered wildcard characters literally.
     */

    const safeTerm = term.replace(/[\\%_]/g, "\\$&");

    try {
      const { data, error } = await client
        .from(TABLE_PROFILES)
        .select("id,name")
        .ilike("name", `%${safeTerm}%`)
        .neq("id", userId)
        .order("name", { ascending: true })
        .limit(limit);

      if (error) return handleError(error);

      const profiles = (data || [])
        .filter(row => normalizeUuid(row.id))
        .map(row => ({
          userId: row.id,
          id: row.id,
          name: String(row.name || "Mero Sansar User")
        }));

      return success(
        profiles,
        "USERS_SEARCHED"
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /*
   * SEND FRIEND REQUEST
   */

  async function sendFriendRequest(receiverId) {
    const targetId = normalizeUuid(receiverId);

    if (!targetId) {
      return failure("INVALID_USER_ID");
    }

    const ready = await requireClient();

    if (!ready.ok) return ready;

    const { client, userId } = ready.data;

    if (userId === targetId) {
      return failure("SELF_REQUEST_NOT_ALLOWED");
    }

    try {
      const { data, error } = await client
        .from(TABLE_REQUESTS)
        .insert({
          sender_id: userId,
          receiver_id: targetId,
          status: "pending"
        })
        .select(REQUEST_FIELDS)
        .single();

      if (error) return handleError(error);

      notifyChange("FRIEND_REQUEST_SENT");

      return success(
        normalizeRequest(data),
        "FRIEND_REQUEST_SENT"
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /*
   * GET INCOMING REQUESTS
   */

  async function getIncomingRequests() {
    const ready = await requireClient();

    if (!ready.ok) return ready;

    const { client, userId } = ready.data;

    try {
      const { data, error } = await client
        .from(TABLE_REQUESTS)
        .select(REQUEST_FIELDS)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) return handleError(error);

      return success(
        (data || []).map(normalizeRequest),
        "INCOMING_REQUESTS_LOADED"
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /*
   * GET OUTGOING REQUESTS
   */

  async function getOutgoingRequests() {
    const ready = await requireClient();

    if (!ready.ok) return ready;

    const { client, userId } = ready.data;

    try {
      const { data, error } = await client
        .from(TABLE_REQUESTS)
        .select(REQUEST_FIELDS)
        .eq("sender_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) return handleError(error);

      return success(
        (data || []).map(normalizeRequest),
        "OUTGOING_REQUESTS_LOADED"
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /*
   * ACCEPT OR REJECT REQUEST
   */

  async function respondToFriendRequest(
    requestId,
    nextStatus
  ) {
    const id = normalizeUuid(requestId);

    if (!id) {
      return failure("INVALID_REQUEST_ID");
    }

    if (!["accepted", "rejected"].includes(nextStatus)) {
      return failure("INVALID_REQUEST_STATUS");
    }

    const ready = await requireClient();

    if (!ready.ok) return ready;

    const { client, userId } = ready.data;

    try {
      const { data, error } = await client
        .from(TABLE_REQUESTS)
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .select(REQUEST_FIELDS)
        .maybeSingle();

      if (error) return handleError(error);

      if (!data) {
        return failure(
          "REQUEST_NOT_FOUND_OR_NOT_ALLOWED",
          "अनुरोध भेटिएन वा यो कार्य गर्ने अनुमति छैन।"
        );
      }

      notifyChange(
        nextStatus === "accepted"
          ? "FRIEND_REQUEST_ACCEPTED"
          : "FRIEND_REQUEST_REJECTED"
      );

      return success(
        normalizeRequest(data),
        nextStatus === "accepted"
          ? "FRIEND_REQUEST_ACCEPTED"
          : "FRIEND_REQUEST_REJECTED"
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /*
   * CANCEL OUTGOING REQUEST
   */

  async function cancelFriendRequest(requestId) {
    const id = normalizeUuid(requestId);

    if (!id) {
      return failure("INVALID_REQUEST_ID");
    }

    const ready = await requireClient();

    if (!ready.ok) return ready;

    const { client, userId } = ready.data;

    try {
      const { data, error } = await client
        .from(TABLE_REQUESTS)
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("sender_id", userId)
        .eq("status", "pending")
        .select(REQUEST_FIELDS)
        .maybeSingle();

      if (error) return handleError(error);

      if (!data) {
        return failure(
          "REQUEST_NOT_FOUND_OR_NOT_ALLOWED",
          "अनुरोध भेटिएन वा रद्द गर्ने अनुमति छैन।"
        );
      }

      notifyChange("FRIEND_REQUEST_CANCELLED");

      return success(
        normalizeRequest(data),
        "FRIEND_REQUEST_CANCELLED"
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /*
   * GET ACCEPTED FRIENDS
   */

  async function getMyFriends() {
    const ready = await requireClient();

    if (!ready.ok) return ready;

    const { client, userId } = ready.data;

    try {
      const { data, error } = await client
        .from(TABLE_FRIENDSHIPS)
        .select("user_a_id,user_b_id,created_at")
        .or(
          `user_a_id.eq.${userId},user_b_id.eq.${userId}`
        )
        .order("created_at", { ascending: false });

      if (error) return handleError(error);

      return success(
        (data || [])
          .map(row => normalizeFriend(row, userId))
          .filter(Boolean),
        "FRIENDS_LOADED"
      );

    } catch (error) {
      return handleError(error);
    }
  }

  /*
   * PUBLIC API
   */

  global.KSKSupabaseFriends = Object.freeze({
    initialize,

    isInitialized() {
      return initialized;
    },

    getCurrentUserId,

    searchUsers,
    sendFriendRequest,
    getIncomingRequests,
    getOutgoingRequests,
    respondToFriendRequest,
    cancelFriendRequest,
    getMyFriends
  });

  /*
   * AUTH CHANGE OBSERVER
   */

  global.addEventListener("ksk:auth-ready", () => {
    initialized = Boolean(
      getAuth()?.isAuthenticated?.()
    );
  });

  global.addEventListener("ksk:auth-change", () => {
    initialized = Boolean(
      getAuth()?.isAuthenticated?.()
    );
  });

})(window);
