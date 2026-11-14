
"use strict";

/*
 * MERO SANSAR — SUPABASE FRIENDS
 * Version: 2.0.0
 *
 * Real Supabase Auth UUID based social system.
 * Search, requests, friendships, follows and blocks.
 */

(function (global) {
  "use strict";

  if (global.KSKSupabaseFriends) return;

  const TABLE = {
    profiles: "profiles",
    requests: "friend_requests",
    friendships: "friendships",
    follows: "user_follows",
    blocks: "user_blocks"
  };

  let initialized = false;

  function result(ok, code, data = null, message = "") {
    return { ok, code, data, message };
  }

  function fail(code, message) {
    return result(false, code, null, message);
  }

  function normalizeId(value) {
    if (typeof value !== "string") return "";

    const id = value.trim();

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ? id
      : "";
  }

  function auth() {
    return global.KSKSupabaseAuth || null;
  }

  function client() {
    return auth()?.getClient?.() || null;
  }

  function currentUser() {
    if (!auth()?.isAuthenticated?.()) return null;
    return auth()?.getUser?.() || null;
  }

  function currentUserId() {
    return normalizeId(currentUser()?.id);
  }

  async function ready() {
    const a = auth();

    if (!a) {
      return fail("AUTH_MODULE_MISSING", "Supabase Auth उपलब्ध छैन।");
    }

    try {
      await a.initialize();
    } catch (error) {
      return fail(error.code || "AUTH_ERROR", error.message);
    }

    const c = client();
    const uid = currentUserId();

    if (!c || !uid) {
      return fail("NOT_AUTHENTICATED", "पहिले आफ्नो खातामा लगइन गर्नुहोस्।");
    }

    initialized = true;

    return result(true, "READY", { client: c, userId: uid });
  }

  function handleError(error) {
    const code = error?.code || "SUPABASE_ERROR";

    const messages = {
      "23505": "यो सम्बन्ध वा Request पहिल्यै रहेको छ।",
      "23503": "प्रयोगकर्ता भेटिएन।",
      "42501": "यो कार्य गर्ने अनुमति छैन।",
      "PGRST116": "रेकर्ड भेटिएन।"
    };

    return fail(code, messages[code] || error?.message || "अनुरोध पूरा हुन सकेन।");
  }

  function notify(type) {
    try {
      global.dispatchEvent(new CustomEvent("ksk:friends-cloud-change", {
        detail: { type }
      }));
    } catch (_) {}
  }

  function cleanTerm(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 60)
      .replace(/[\\%_]/g, "\\$&");
  }

  async function profilesByIds(c, ids) {
    const unique = [...new Set((ids || []).map(normalizeId).filter(Boolean))];

    if (!unique.length) return [];

    const { data, error } = await c
      .from(TABLE.profiles)
      .select("id,name,first_name,last_name,avatar_url")
      .in("id", unique);

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      userId: p.id,
      name: p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Mero Sansar User",
      avatarUrl: p.avatar_url || null
    }));
  }

  async function searchUsers(searchText, options = {}) {
    const term = cleanTerm(searchText);

    if (term.replace(/\\/g, "").length < 2) {
      return fail("SEARCH_TOO_SHORT", "कम्तीमा २ अक्षर लेख्नुहोस्।");
    }

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;
    const limit = Math.min(20, Math.max(1, Number(options.limit) || 20));

    try {
      const pattern = `%${term}%`;

      const searches = [
        c.from(TABLE.profiles)
          .select("id,name,first_name,last_name,avatar_url")
          .ilike("name", pattern)
          .neq("id", userId)
          .limit(limit),

        c.from(TABLE.profiles)
          .select("id,name,first_name,last_name,avatar_url")
          .ilike("first_name", pattern)
          .neq("id", userId)
          .limit(limit),

        c.from(TABLE.profiles)
          .select("id,name,first_name,last_name,avatar_url")
          .ilike("last_name", pattern)
          .neq("id", userId)
          .limit(limit)
      ];

      const words = term.split(" ");

      if (words.length >= 2) {
        searches.push(
          c.from(TABLE.profiles)
            .select("id,name,first_name,last_name,avatar_url")
            .ilike("first_name", `%${words[0]}%`)
            .ilike("last_name", `%${words.slice(1).join(" ")}%`)
            .neq("id", userId)
            .limit(limit)
        );
      }

      const responses = await Promise.all(searches);
      const failed = responses.find(x => x.error);

      if (failed) throw failed.error;

      const map = new Map();

      responses.forEach(response => {
        (response.data || []).forEach(profile => {
          if (normalizeId(profile.id)) map.set(profile.id, profile);
        });
      });

      const users = [...map.values()]
        .map(p => ({
          id: p.id,
          userId: p.id,
          name: p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Mero Sansar User",
          avatarUrl: p.avatar_url || null
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, limit);

      return result(true, "USERS_SEARCHED", users);
    } catch (error) {
      return handleError(error);
    }
  }

  async function getDashboard() {
    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;

    try {
      const responses = await Promise.all([
        c.from(TABLE.requests)
          .select("id,sender_id,receiver_id,status,created_at")
          .eq("receiver_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),

        c.from(TABLE.requests)
          .select("id,sender_id,receiver_id,status,created_at")
          .eq("sender_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),

        c.from(TABLE.friendships)
          .select("user_a_id,user_b_id,created_at")
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
          .order("created_at", { ascending: false }),

        c.from(TABLE.follows)
          .select("follower_id,following_id,created_at")
          .eq("following_id", userId),

        c.from(TABLE.follows)
          .select("follower_id,following_id,created_at")
          .eq("follower_id", userId),

        c.from(TABLE.blocks)
          .select("blocker_id,blocked_id,created_at")
          .eq("blocker_id", userId)
      ]);

      const failed = responses.find(x => x.error);
      if (failed) throw failed.error;

      const [
        incoming,
        outgoing,
        friendships,
        followers,
        following,
        blocks
      ] = responses.map(x => x.data || []);

      const ids = [
        ...incoming.map(x => x.sender_id),
        ...outgoing.map(x => x.receiver_id),
        ...friendships.map(x => x.user_a_id === userId ? x.user_b_id : x.user_a_id),
        ...followers.map(x => x.follower_id),
        ...following.map(x => x.following_id),
        ...blocks.map(x => x.blocked_id)
      ];

      const profiles = await profilesByIds(c, ids);
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      function person(id, createdAt) {
        const profile = profileMap.get(id) || {
          id,
          userId: id,
          name: "प्रोफाइल उपलब्ध छैन",
          avatarUrl: null
        };

        return { ...profile, createdAt };
      }

      return result(true, "DASHBOARD_LOADED", {
        userId,

        incoming: incoming.map(x => ({
          id: x.id,
          createdAt: x.created_at,
          person: person(x.sender_id)
        })),

        outgoing: outgoing.map(x => ({
          id: x.id,
          createdAt: x.created_at,
          person: person(x.receiver_id)
        })),

        friends: friendships.map(x => person(
          x.user_a_id === userId ? x.user_b_id : x.user_a_id,
          x.created_at
        )),

        followers: followers.map(x => person(x.follower_id, x.created_at)),
        following: following.map(x => person(x.following_id, x.created_at)),
        blocked: blocks.map(x => person(x.blocked_id, x.created_at))
      });
    } catch (error) {
      return handleError(error);
    }
  }

  async function sendFriendRequest(receiverId) {
    const target = normalizeId(receiverId);
    if (!target) return fail("INVALID_USER_ID", "प्रयोगकर्ता ID मान्य छैन।");

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;

    if (target === userId) {
      return fail("SELF_REQUEST_NOT_ALLOWED", "आफैँलाई Request पठाउन मिल्दैन।");
    }

    try {
      const { data, error } = await c
        .from(TABLE.requests)
        .insert({
          sender_id: userId,
          receiver_id: target,
          status: "pending"
        })
        .select("id,sender_id,receiver_id,status,created_at")
        .single();

      if (error) throw error;

      notify("FRIEND_REQUEST_SENT");
      return result(true, "FRIEND_REQUEST_SENT", data);
    } catch (error) {
      return handleError(error);
    }
  }

  async function respondToFriendRequest(requestId, status) {
    const id = normalizeId(requestId);

    if (!id || !["accepted", "rejected"].includes(status)) {
      return fail("INVALID_REQUEST");
    }

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;

    try {
      const { data, error } = await c
        .from(TABLE.requests)
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .select("id,status")
        .maybeSingle();

      if (error) throw error;
      if (!data) return fail("REQUEST_NOT_FOUND", "Request भेटिएन वा पहिले नै पूरा भयो।");

      notify("FRIEND_REQUEST_" + status.toUpperCase());
      return result(true, "REQUEST_UPDATED", data);
    } catch (error) {
      return handleError(error);
    }
  }

  async function cancelFriendRequest(requestId) {
    const id = normalizeId(requestId);
    if (!id) return fail("INVALID_REQUEST_ID");

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;

    try {
      const { data, error } = await c
        .from(TABLE.requests)
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("sender_id", userId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) return fail("REQUEST_NOT_FOUND");

      notify("FRIEND_REQUEST_CANCELLED");
      return result(true, "REQUEST_CANCELLED", data);
    } catch (error) {
      return handleError(error);
    }
  }

  async function removeFriend(friendId) {
    const target = normalizeId(friendId);
    if (!target) return fail("INVALID_USER_ID");

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;
    const [a, b] = [userId, target].sort();

    try {
      const { data, error } = await c
        .from(TABLE.friendships)
        .delete()
        .eq("user_a_id", a)
        .eq("user_b_id", b)
        .select("user_a_id");

      if (error) throw error;
      if (!data?.length) return fail("FRIENDSHIP_NOT_FOUND");

      notify("FRIEND_REMOVED");
      return result(true, "FRIEND_REMOVED", data);
    } catch (error) {
      return handleError(error);
    }
  }

  async function followUser(targetId) {
    const target = normalizeId(targetId);
    if (!target) return fail("INVALID_USER_ID");

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;
    if (target === userId) return fail("SELF_FOLLOW_NOT_ALLOWED");

    try {
      const { error } = await c.from(TABLE.follows).insert({
        follower_id: userId,
        following_id: target
      });

      if (error) throw error;

      notify("USER_FOLLOWED");
      return result(true, "USER_FOLLOWED");
    } catch (error) {
      return handleError(error);
    }
  }

  async function unfollowUser(targetId) {
    const target = normalizeId(targetId);
    if (!target) return fail("INVALID_USER_ID");

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;

    try {
      const { data, error } = await c
        .from(TABLE.follows)
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", target)
        .select("follower_id");

      if (error) throw error;
      if (!data?.length) return fail("NOT_FOLLOWING");

      notify("USER_UNFOLLOWED");
      return result(true, "USER_UNFOLLOWED");
    } catch (error) {
      return handleError(error);
    }
  }

  async function blockUser(targetId) {
    const target = normalizeId(targetId);
    if (!target) return fail("INVALID_USER_ID");

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;
    if (target === userId) return fail("SELF_BLOCK_NOT_ALLOWED");

    try {
      const { error } = await c.from(TABLE.blocks).insert({
        blocker_id: userId,
        blocked_id: target
      });

      if (error) throw error;

      notify("USER_BLOCKED");
      return result(true, "USER_BLOCKED");
    } catch (error) {
      return handleError(error);
    }
  }

  async function unblockUser(targetId) {
    const target = normalizeId(targetId);
    if (!target) return fail("INVALID_USER_ID");

    const session = await ready();
    if (!session.ok) return session;

    const { client: c, userId } = session.data;

    try {
      const { data, error } = await c
        .from(TABLE.blocks)
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", target)
        .select("blocker_id");

      if (error) throw error;
      if (!data?.length) return fail("BLOCK_NOT_FOUND");

      notify("USER_UNBLOCKED");
      return result(true, "USER_UNBLOCKED");
    } catch (error) {
      return handleError(error);
    }
  }

  global.KSKSupabaseFriends = Object.freeze({
    initialize: ready,
    isInitialized: () => initialized,
    getCurrentUserId: currentUserId,
    searchUsers,
    getDashboard,
    sendFriendRequest,
    respondToFriendRequest,
    cancelFriendRequest,
    removeFriend,
    followUser,
    unfollowUser,
    blockUser,
    unblockUser
  });

  global.addEventListener("ksk:auth-ready", () => {
    initialized = Boolean(currentUserId());
  });

  global.addEventListener("ksk:auth-change", () => {
    initialized = Boolean(currentUserId());
  });

})(window);
