
"use strict";

/* =========================================================
   KSK SOCIAL DATA
   LocalStorage adapter — no backend / no server sync.
   Backward-compatible with existing ksk_social_state_v1.
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSocialData) return;

  const STORAGE_KEY = "ksk_social_state_v1";
  const VERSION = 1;

  function emptyState() {
    return {
      version: VERSION,
      localUserId: "",
      friendRequests: [],
      friendships: [],
      follows: [],
      blocks: []
    };
  }

  function makeId(prefix) {
    try {
      if (global.crypto?.randomUUID) {
        return prefix + "_" + global.crypto.randomUUID();
      }
    } catch (error) {}

    return prefix + "_" + Date.now().toString(36) +
      "_" + Math.random().toString(36).slice(2, 12);
  }

  function normalizeId(value) {
    if (typeof value !== "string" && typeof value !== "number") {
      return "";
    }

    const id = String(value).trim();

    if (
      !id ||
      id.length > 128 ||
      /[\u0000-\u001f\u007f]/.test(id)
    ) {
      return "";
    }

    return id;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readState() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (raw === null) {
        return { ok: true, state: emptyState() };
      }

      const state = JSON.parse(raw);

      if (
        !state ||
        state.version !== VERSION ||
        !Array.isArray(state.friendRequests) ||
        !Array.isArray(state.friendships) ||
        !Array.isArray(state.follows)
      ) {
        return { ok: false, code: "CORRUPT_DATA" };
      }

      if (typeof state.localUserId !== "string") {
        state.localUserId = "";
      }

      // Migration: पुरानो v1 डाटामा blocks थिएन।
      if (!Array.isArray(state.blocks)) {
        state.blocks = [];
      }

      return { ok: true, state };
    } catch (error) {
      return { ok: false, code: "STORAGE_UNAVAILABLE" };
    }
  }

  function failure(code) {
    return {
      ok: false,
      code: code || "UNKNOWN_ERROR",
      data: null
    };
  }

  function saveState(state, code, data) {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      try {
        global.dispatchEvent(new CustomEvent("ksk:social-change", {
          detail: { type: code || "UPDATED" }
        }));
      } catch (error) {}

      return {
        ok: true,
        code: code || "OK",
        data: data === undefined ? null : clone(data)
      };
    } catch (error) {
      return failure("STORAGE_UNAVAILABLE");
    }
  }

  function getLocalUserId() {
    const result = readState();
    if (!result.ok) return "";

    const state = result.state;

    if (state.localUserId) {
      return state.localUserId;
    }

    state.localUserId = makeId("local-user");

    const saved = saveState(
      state,
      "LOCAL_USER_ID_CREATED",
      { userId: state.localUserId }
    );

    return saved.ok ? state.localUserId : "";
  }

  function pairKey(a, b) {
    return [a, b].sort().join("\u0000");
  }

  function findFriendship(state, a, b) {
    const key = pairKey(a, b);

    return state.friendships.find(item =>
      pairKey(item.userAId, item.userBId) === key
    );
  }

  function isBlockedPair(state, firstId, secondId) {
    return state.blocks.some(item =>
      (
        item.blockerId === firstId &&
        item.blockedUserId === secondId
      ) ||
      (
        item.blockerId === secondId &&
        item.blockedUserId === firstId
      )
    );
  }

  /* =======================================================
     BLOCK / UNBLOCK
  ======================================================= */

  function getBlockedUsers(userId) {
    const id = normalizeId(userId);
    if (!id) return [];

    const result = readState();
    if (!result.ok) return [];

    return result.state.blocks
      .filter(item => item.blockerId === id)
      .map(item => ({
        userId: item.blockedUserId,
        createdAt: item.createdAt
      }));
  }

  function isUserBlocked(userId, otherUserId) {
    const first = normalizeId(userId);
    const second = normalizeId(otherUserId);

    if (!first || !second) return false;

    const result = readState();
    if (!result.ok) return false;

    return isBlockedPair(result.state, first, second);
  }

  function blockUser(blockerId, blockedUserId) {
    const blocker = normalizeId(blockerId);
    const blocked = normalizeId(blockedUserId);

    if (!blocker || !blocked) {
      return failure("INVALID_USER_ID");
    }

    if (blocker === blocked) {
      return failure("SELF_BLOCK_NOT_ALLOWED");
    }

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    if (state.blocks.some(item =>
      item.blockerId === blocker &&
      item.blockedUserId === blocked
    )) {
      return failure("ALREADY_BLOCKED");
    }

    state.blocks.push({
      id: makeId("block"),
      blockerId: blocker,
      blockedUserId: blocked,
      createdAt: new Date().toISOString()
    });

    // Block गर्दा दुवै दिशाका सम्बन्ध हटाइन्छ।
    state.friendships = state.friendships.filter(item =>
      pairKey(item.userAId, item.userBId) !==
      pairKey(blocker, blocked)
    );

    state.follows = state.follows.filter(item =>
      !(
        (
          item.followerId === blocker &&
          item.followingId === blocked
        ) ||
        (
          item.followerId === blocked &&
          item.followingId === blocker
        )
      )
    );

    // Pending request निष्क्रिय हुन्छ; इतिहास राखिन्छ।
    state.friendRequests.forEach(item => {
      if (
        item.status === "pending" &&
        (
          (
            item.fromUserId === blocker &&
            item.toUserId === blocked
          ) ||
          (
            item.fromUserId === blocked &&
            item.toUserId === blocker
          )
        )
      ) {
        item.status = "cancelled";
        item.updatedAt = new Date().toISOString();
      }
    });

    return saveState(state, "USER_BLOCKED", {
      blockerId: blocker,
      blockedUserId: blocked
    });
  }

  function unblockUser(blockerId, blockedUserId) {
    const blocker = normalizeId(blockerId);
    const blocked = normalizeId(blockedUserId);

    if (!blocker || !blocked) {
      return failure("INVALID_USER_ID");
    }

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    const index = state.blocks.findIndex(item =>
      item.blockerId === blocker &&
      item.blockedUserId === blocked
    );

    if (index < 0) {
      return failure("BLOCK_NOT_FOUND");
    }

    const removed = state.blocks.splice(index, 1)[0];

    return saveState(state, "USER_UNBLOCKED", removed);
  }

  /* =======================================================
     FRIENDS
  ======================================================= */

  function getFriends(userId) {
    const id = normalizeId(userId);
    if (!id) return [];

    const result = readState();
    if (!result.ok) return [];

    return result.state.friendships
      .filter(item =>
        item.userAId === id || item.userBId === id
      )
      .map(item => ({
        userId: item.userAId === id
          ? item.userBId
          : item.userAId,
        createdAt: item.createdAt
      }));
  }

  function removeFriend(userId, friendUserId) {
    const user = normalizeId(userId);
    const friend = normalizeId(friendUserId);

    if (!user || !friend) {
      return failure("INVALID_USER_ID");
    }

    if (user === friend) {
      return failure("SELF_RELATION_NOT_ALLOWED");
    }

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    const index = state.friendships.findIndex(item =>
      pairKey(item.userAId, item.userBId) ===
      pairKey(user, friend)
    );

    if (index < 0) {
      return failure("FRIENDSHIP_NOT_FOUND");
    }

    const removed = state.friendships.splice(index, 1)[0];

    return saveState(state, "FRIEND_REMOVED", removed);
  }

  /* =======================================================
     FRIEND REQUESTS
  ======================================================= */

  function sendFriendRequest(fromUserId, toUserId) {
    const from = normalizeId(fromUserId);
    const to = normalizeId(toUserId);

    if (!from || !to) {
      return failure("INVALID_USER_ID");
    }

    if (from === to) {
      return failure("SELF_REQUEST_NOT_ALLOWED");
    }

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    if (isBlockedPair(state, from, to)) {
      return failure("USER_BLOCKED");
    }

    if (findFriendship(state, from, to)) {
      return failure("ALREADY_FRIENDS");
    }

    if (state.friendRequests.some(item =>
      item.fromUserId === to &&
      item.toUserId === from &&
      item.status === "pending"
    )) {
      return failure("REQUEST_ALREADY_RECEIVED");
    }

    if (state.friendRequests.some(item =>
      item.fromUserId === from &&
      item.toUserId === to &&
      item.status === "pending"
    )) {
      return failure("DUPLICATE_REQUEST");
    }

    const now = new Date().toISOString();

    const request = {
      id: makeId("request"),
      fromUserId: from,
      toUserId: to,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    state.friendRequests.push(request);

    return saveState(state, "FRIEND_REQUEST_SENT", request);
  }

  function getFriendRequests(userId, options = {}) {
    const id = normalizeId(userId);
    if (!id) return [];

    const result = readState();
    if (!result.ok) return [];

    const direction = [
      "all",
      "incoming",
      "outgoing"
    ].includes(options.direction)
      ? options.direction
      : "all";

    const status = options.status === undefined
      ? "pending"
      : options.status;

    if (
      status !== "all" &&
      ![
        "pending",
        "accepted",
        "rejected",
        "cancelled"
      ].includes(status)
    ) {
      return [];
    }

    return result.state.friendRequests
      .filter(item => {
        const belongs = direction === "incoming"
          ? item.toUserId === id
          : direction === "outgoing"
            ? item.fromUserId === id
            : (
                item.fromUserId === id ||
                item.toUserId === id
              );

        return belongs &&
          (status === "all" || item.status === status);
      })
      .map(item => ({ ...item }));
  }

  function updateRequest(
    requestId,
    currentUserId,
    nextStatus,
    ownerField
  ) {
    const rid = normalizeId(requestId);
    const actor = normalizeId(currentUserId);

    if (!rid || !actor) {
      return failure("INVALID_ARGUMENT");
    }

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    const request = state.friendRequests.find(
      item => item.id === rid
    );

    if (!request) {
      return failure("REQUEST_NOT_FOUND");
    }

    if (request[ownerField] !== actor) {
      return failure("NOT_AUTHORIZED_FOR_REQUEST");
    }

    if (request.status !== "pending") {
      return failure("REQUEST_NOT_PENDING");
    }

    if (
      nextStatus === "accepted" &&
      isBlockedPair(
        state,
        request.fromUserId,
        request.toUserId
      )
    ) {
      return failure("USER_BLOCKED");
    }

    if (
      nextStatus === "accepted" &&
      !findFriendship(
        state,
        request.fromUserId,
        request.toUserId
      )
    ) {
      const ids = [
        request.fromUserId,
        request.toUserId
      ].sort();

      state.friendships.push({
        id: makeId("friendship"),
        userAId: ids[0],
        userBId: ids[1],
        createdAt: new Date().toISOString()
      });
    }

    request.status = nextStatus;
    request.updatedAt = new Date().toISOString();

    return saveState(
      state,
      "FRIEND_REQUEST_" + nextStatus.toUpperCase(),
      request
    );
  }

  function acceptFriendRequest(id, userId) {
    return updateRequest(
      id,
      userId,
      "accepted",
      "toUserId"
    );
  }

  function rejectFriendRequest(id, userId) {
    return updateRequest(
      id,
      userId,
      "rejected",
      "toUserId"
    );
  }

  function cancelFriendRequest(id, userId) {
    return updateRequest(
      id,
      userId,
      "cancelled",
      "fromUserId"
    );
  }

  /* =======================================================
     FOLLOW / UNFOLLOW
  ======================================================= */

  function followUser(followerId, followingId) {
    const follower = normalizeId(followerId);
    const following = normalizeId(followingId);

    if (!follower || !following) {
      return failure("INVALID_USER_ID");
    }

    if (follower === following) {
      return failure("SELF_FOLLOW_NOT_ALLOWED");
    }

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    if (isBlockedPair(state, follower, following)) {
      return failure("USER_BLOCKED");
    }

    if (state.follows.some(item =>
      item.followerId === follower &&
      item.followingId === following
    )) {
      return failure("ALREADY_FOLLOWING");
    }

    const relation = {
      id: makeId("follow"),
      followerId: follower,
      followingId: following,
      createdAt: new Date().toISOString()
    };

    state.follows.push(relation);

    return saveState(state, "USER_FOLLOWED", relation);
  }

  function unfollowUser(followerId, followingId) {
    const follower = normalizeId(followerId);
    const following = normalizeId(followingId);

    if (!follower || !following) {
      return failure("INVALID_USER_ID");
    }

    if (follower === following) {
      return failure("SELF_RELATION_NOT_ALLOWED");
    }

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    const index = state.follows.findIndex(item =>
      item.followerId === follower &&
      item.followingId === following
    );

    if (index < 0) {
      return failure("NOT_FOLLOWING");
    }

    const removed = state.follows.splice(index, 1)[0];

    return saveState(state, "USER_UNFOLLOWED", removed);
  }

  function getFollowing(userId) {
    const id = normalizeId(userId);
    if (!id) return [];

    const result = readState();
    if (!result.ok) return [];

    return result.state.follows
      .filter(item => item.followerId === id)
      .map(item => ({
        userId: item.followingId,
        createdAt: item.createdAt
      }));
  }

  function getFollowers(userId) {
    const id = normalizeId(userId);
    if (!id) return [];

    const result = readState();
    if (!result.ok) return [];

    return result.state.follows
      .filter(item => item.followingId === id)
      .map(item => ({
        userId: item.followerId,
        createdAt: item.createdAt
      }));
  }

  /* =======================================================
     MUTUAL FRIENDS
  ======================================================= */

  function getMutualFriends(userId, otherUserId) {
    const first = normalizeId(userId);
    const second = normalizeId(otherUserId);

    if (!first || !second || first === second) {
      return [];
    }

    const firstFriends = new Set(
      getFriends(first).map(item => item.userId)
    );

    return getFriends(second).filter(item =>
      firstFriends.has(item.userId)
    );
  }

  /* =======================================================
     COUNTS
  ======================================================= */

  function getCounts(userId) {
    const id = normalizeId(userId);

    const empty = {
      friends: 0,
      followers: 0,
      following: 0,
      incomingRequests: 0,
      outgoingRequests: 0,
      blocked: 0
    };

    if (!id) return empty;

    const result = readState();
    if (!result.ok) return empty;

    const state = result.state;

    return {
      friends: state.friendships.filter(item =>
        item.userAId === id || item.userBId === id
      ).length,

      followers: state.follows.filter(
        item => item.followingId === id
      ).length,

      following: state.follows.filter(
        item => item.followerId === id
      ).length,

      incomingRequests: state.friendRequests.filter(item =>
        item.toUserId === id &&
        item.status === "pending"
      ).length,

      outgoingRequests: state.friendRequests.filter(item =>
        item.fromUserId === id &&
        item.status === "pending"
      ).length,

      blocked: state.blocks.filter(
        item => item.blockerId === id
      ).length
    };
  }

  /* =======================================================
     STORAGE SYNCHRONIZATION
  ======================================================= */

  global.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;

    try {
      global.dispatchEvent(new CustomEvent("ksk:social-change", {
        detail: { type: "STORAGE_SYNC" }
      }));
    } catch (error) {}
  });

  global.KSKSocialData = Object.freeze({
    STORAGE_KEY,
    getLocalUserId,
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriends,
    removeFriend,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getMutualFriends,
    getCounts,
    blockUser,
    unblockUser,
    getBlockedUsers,
    isUserBlocked
  });

})(window);


/* =========================================================
   KSK FRIENDS PAGE — COMPLETE LOCAL SOCIAL UI
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKFriendsPage) return;

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const MODAL = () => global.KSKModal || null;
  const TOAST = () => global.KSKToast || null;
  const SOCIAL = () => global.KSKSocialData || null;

  function isEnglish() {
    return LANG()?.getLanguage?.() === "en";
  }

  function escapeHTML(value) {
    if (typeof global.KSKUtils?.escapeHTML === "function") {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function toast(message, type = "info") {
    const api = TOAST();

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function refreshPage() {
    if (typeof global.KSKApp?.refreshCurrentPage === "function") {
      global.KSKApp.refreshCurrentPage();
    }
  }

  function emptyMessage(message) {
    return `
      <p style="
        margin:12px 0 0;
        color:var(--text-muted);
        font-size:13px;
        text-align:center;
      ">${message}</p>
    `;
  }

  function actionButton(
    action,
    id,
    label,
    className = "btn-secondary"
  ) {
    return `
      <button
        type="button"
        class="btn ${className} btn-sm"
        data-social-action="${escapeHTML(action)}"
        data-social-id="${escapeHTML(id)}"
      >${label}</button>
    `;
  }

  /* =======================================================
     REQUESTS UI
  ======================================================= */

  function renderRequests(userId, english) {
    const social = SOCIAL();

    const incoming = social.getFriendRequests(userId, {
      direction: "incoming",
      status: "pending"
    });

    const outgoing = social.getFriendRequests(userId, {
      direction: "outgoing",
      status: "pending"
    });

    const incomingHTML = incoming.length
      ? incoming.map(item => `
          <article class="card" style="
            padding:13px;
            margin-top:9px;
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            justify-content:space-between;
            gap:10px;
          ">
            <div style="min-width:0;flex:1">
              <strong>${english ? "Request from" : "Request पठाउने ID"}</strong>
              <div style="font-size:12px;overflow-wrap:anywhere">
                ${escapeHTML(item.fromUserId)}
              </div>
            </div>

            <div style="display:flex;gap:7px;flex-wrap:wrap">
              ${actionButton(
                "accept-request",
                item.id,
                english ? "Accept" : "स्वीकार",
                "btn-primary"
              )}

              ${actionButton(
                "reject-request",
                item.id,
                english ? "Reject" : "अस्वीकार",
                "btn-secondary"
              )}
            </div>
          </article>
        `).join("")
      : emptyMessage(
          english
            ? "No incoming requests."
            : "अहिलेसम्म कुनै Incoming Request छैन।"
        );

    const outgoingHTML = outgoing.length
      ? outgoing.map(item => `
          <article class="card" style="
            padding:13px;
            margin-top:9px;
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            justify-content:space-between;
            gap:10px;
          ">
            <div style="min-width:0;flex:1">
              <strong>${english ? "Request to" : "Request पठाइएको ID"}</strong>

              <div style="font-size:12px;overflow-wrap:anywhere">
                ${escapeHTML(item.toUserId)}
              </div>

              <small style="color:var(--text-muted)">
                ${english
                  ? "Pending — local only"
                  : "प्रतीक्षामा — स्थानीय रेकर्ड मात्र"}
              </small>
            </div>

            ${actionButton(
              "cancel-request",
              item.id,
              english ? "Cancel" : "रद्द",
              "btn-secondary"
            )}
          </article>
        `).join("")
      : emptyMessage(
          english
            ? "No outgoing requests."
            : "अहिलेसम्म कुनै Outgoing Request छैन।"
        );

    return `
      <section class="card" style="padding:16px;margin-top:14px">
        <h3 style="margin:0">
          ${english ? "Incoming Requests" : "आएका Request"}
          <span style="font-size:13px">(${incoming.length})</span>
        </h3>
        ${incomingHTML}
      </section>

      <section class="card" style="padding:16px;margin-top:14px">
        <h3 style="margin:0">
          ${english ? "Outgoing Requests" : "पठाएका Request"}
          <span style="font-size:13px">(${outgoing.length})</span>
        </h3>
        ${outgoingHTML}
      </section>
    `;
  }

  /* =======================================================
     FRIENDS / FOLLOWERS / FOLLOWING / BLOCKED UI
  ======================================================= */

  function renderRelations(userId, english) {
    const social = SOCIAL();

    const friends = social.getFriends(userId);
    const followers = social.getFollowers(userId);
    const following = social.getFollowing(userId);
    const blocked = social.getBlockedUsers(userId);

    const friendsHTML = friends.length
      ? friends.map(item => `
          <article class="card" style="
            padding:12px;
            margin-top:8px;
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            justify-content:space-between;
            gap:10px;
          ">
            <code style="overflow-wrap:anywhere">
              ${escapeHTML(item.userId)}
            </code>

            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${actionButton(
                "remove-friend",
                item.userId,
                english ? "Remove" : "हटाउनुहोस्",
                "btn-secondary"
              )}

              ${actionButton(
                "block-user",
                item.userId,
                english ? "Block" : "Block",
                "btn-secondary"
              )}
            </div>
          </article>
        `).join("")
      : emptyMessage(
          english ? "No friends yet." : "अहिलेसम्म साथी छैनन्।"
        );

    const followersHTML = followers.length
      ? followers.map(item => `
          <div style="
            padding:9px 0;
            border-bottom:1px solid var(--border-color,rgba(127,127,127,.15));
            overflow-wrap:anywhere;
          ">
            <code>${escapeHTML(item.userId)}</code>
          </div>
        `).join("")
      : emptyMessage(
          english ? "No followers yet." : "अहिलेसम्म Followers छैनन्।"
        );

    const followingHTML = following.length
      ? following.map(item => `
          <article style="
            padding:9px 0;
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            justify-content:space-between;
            gap:8px;
            border-bottom:1px solid var(--border-color,rgba(127,127,127,.15));
          ">
            <code style="overflow-wrap:anywhere">
              ${escapeHTML(item.userId)}
            </code>

            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${actionButton(
                "unfollow",
                item.userId,
                "Unfollow",
                "btn-secondary"
              )}

              ${actionButton(
                "block-user",
                item.userId,
                "Block",
                "btn-secondary"
              )}
            </div>
          </article>
        `).join("")
      : emptyMessage(
          english
            ? "Not following anyone."
            : "कसैलाई Follow गर्नुभएको छैन।"
        );

    const blockedHTML = blocked.length
      ? blocked.map(item => `
          <article style="
            padding:9px 0;
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            justify-content:space-between;
            gap:8px;
            border-bottom:1px solid var(--border-color,rgba(127,127,127,.15));
          ">
            <code style="overflow-wrap:anywhere">
              ${escapeHTML(item.userId)}
            </code>

            ${actionButton(
              "unblock-user",
              item.userId,
              "Unblock",
              "btn-secondary"
            )}
          </article>
        `).join("")
      : emptyMessage(
          english
            ? "No blocked users."
            : "कुनै Block गरिएको ID छैन।"
        );

    return `
      <section class="card" style="padding:16px;margin-top:14px">
        <h3 style="margin:0">
          ${english ? "Your Friends" : "तपाईंका साथीहरू"}
          <span style="font-size:13px">(${friends.length})</span>
        </h3>
        ${friendsHTML}
      </section>

      <section class="card" style="padding:16px;margin-top:14px">
        <h3 style="margin:0">
          Followers
          <span style="font-size:13px">(${followers.length})</span>
        </h3>
        ${followersHTML}
      </section>

      <section class="card" style="padding:16px;margin-top:14px">
        <h3 style="margin:0">
          Following
          <span style="font-size:13px">(${following.length})</span>
        </h3>
        ${followingHTML}
      </section>

      <section class="card" style="padding:16px;margin-top:14px">
        <h3 style="margin:0">
          ${english ? "Blocked Users" : "Block गरिएका ID"}
          <span style="font-size:13px">(${blocked.length})</span>
        </h3>
        ${blockedHTML}
      </section>
    `;
  }

  /* =======================================================
     MUTUAL FRIENDS UI
  ======================================================= */

  function renderMutualFriends(english) {
    return `
      <section class="card" style="padding:16px;margin-top:14px">
        <h3 style="margin:0">
          ${english ? "Mutual Friends" : "आपसी साथीहरू"}
        </h3>

        <p style="
          margin:7px 0 10px;
          font-size:13px;
          line-height:1.6;
          color:var(--text-muted);
        ">
          ${english
            ? "Compare your friend list with another local profile ID."
            : "अर्को स्थानीय Profile ID सँग साझा साथीहरू तुलना गर्नुहोस्।"}
        </p>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input
            id="ksk-mutual-user-id"
            type="text"
            maxlength="128"
            autocomplete="off"
            placeholder="${english ? "Other profile ID" : "अर्को Profile ID"}"
            style="flex:1;min-width:150px"
          />

          <button
            type="button"
            class="btn btn-secondary"
            data-mutual-search
          >${english ? "Find" : "खोज्नुहोस्"}</button>
        </div>

        <div id="ksk-mutual-results" aria-live="polite">
          ${emptyMessage(
            english
              ? "Enter an ID to compare."
              : "तुलना गर्न अर्को ID राख्नुहोस्।"
          )}
        </div>
      </section>
    `;
  }

  /* =======================================================
     MAIN PAGE RENDER
  ======================================================= */

  function render(options = {}) {
    const english = typeof options.isEnglish === "boolean"
      ? options.isEnglish
      : isEnglish();

    const social = SOCIAL();
    const userId = social?.getLocalUserId?.() || "";

    const counts = userId
      ? social.getCounts(userId)
      : {
          friends: 0,
          followers: 0,
          following: 0
        };

    // पुरानो Friends रेकर्डलाई मेटाउँदैनौँ।
    const oldFriends = DATA()?.getFriends?.() || [];

    const stats = [
      {
        value: counts.friends,
        label: english ? "Friends" : "साथीहरू"
      },
      {
        value: counts.followers,
        label: english ? "Followers" : "फलोअर्स"
      },
      {
        value: counts.following,
        label: english ? "Following" : "फलोइङ"
      }
    ];

    const oldFriendsHTML = oldFriends.length
      ? `
        <section class="card" style="padding:16px;margin-top:14px">
          <h3>
            ${english
              ? "Previously saved friends"
              : "पहिले सुरक्षित गरिएका साथीहरू"}
          </h3>

          <p style="
            font-size:13px;
            color:var(--text-muted);
            line-height:1.5;
          ">
            ${english
              ? "Old local entries; not verified friend connections."
              : "पुराना स्थानीय रेकर्ड हुन्, प्रमाणित साथी सम्बन्ध होइनन्।"}
          </p>

          ${oldFriends.map(friend => `
            <div style="padding:7px 0">
              ${escapeHTML(friend.name || "Friend")}
            </div>
          `).join("")}
        </section>
      `
      : "";

    return `
      <section class="page-section ksk-social-page">

        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:14px;
        ">
          <h3 class="section-title" style="margin:0">
            ${english
              ? "Friends & Social"
              : "साथी तथा सामाजिक सम्बन्ध"}
          </h3>

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button
              type="button"
              class="btn btn-primary"
              data-add-friend-open
              ${userId ? "" : "disabled"}
            >
              ＋ ${english ? "Add Friend" : "साथी थप्नुहोस्"}
            </button>

            <button
              type="button"
              class="btn btn-secondary"
              data-open-follow
              ${userId ? "" : "disabled"}
            >
              ${english ? "Follow by ID" : "ID बाट Follow"}
            </button>
          </div>
        </div>

        <div class="card" style="
          padding:18px;
          margin:14px 0;
          border-radius:16px;
        ">
          <div style="
            font-size:13px;
            color:var(--text-muted);
          ">
            ${english
              ? "Your local profile ID"
              : "तपाईंको स्थानीय Profile ID"}
          </div>

          <div style="
            display:flex;
            gap:10px;
            align-items:center;
            margin-top:8px;
            flex-wrap:wrap;
          ">
            <code style="
              flex:1;
              min-width:180px;
              overflow-wrap:anywhere;
              font-size:13px;
            ">
              ${escapeHTML(userId || "ID unavailable")}
            </code>

            <button
              class="btn btn-secondary btn-sm"
              type="button"
              data-copy-social-id
              ${userId ? "" : "disabled"}
            >
              ${english ? "Copy ID" : "ID कपी"}
            </button>
          </div>

          <p style="
            margin:12px 0 0;
            font-size:13px;
            color:var(--text-muted);
            line-height:1.6;
          ">
            ${english
              ? "This ID and all social records are stored only in this browser. Requests are not delivered to other devices."
              : "यो ID र सामाजिक रेकर्ड यही ब्राउजरमा मात्र सुरक्षित हुन्छन्। Request अर्को मोबाइलमा पुग्दैन।"}
          </p>
        </div>

        <div class="card" style="
          padding:16px;
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:8px;
          text-align:center;
        ">
          ${stats.map(item => `
            <div>
              <strong style="display:block;font-size:22px">
                ${Number(item.value || 0)}
              </strong>

              <span style="
                font-size:12px;
                color:var(--text-muted);
              ">
                ${item.label}
              </span>
            </div>
          `).join("")}
        </div>

        <div class="card" style="padding:14px;margin-top:14px">
          <strong>
            ${english ? "Local prototype" : "स्थानीय Prototype"}
          </strong>

          <p style="
            margin:6px 0 0;
            font-size:13px;
            line-height:1.6;
            color:var(--text-muted);
          ">
            ${english
              ? "You can record a request or follow relation using an ID. This does not verify that the ID belongs to a real account."
              : "ID प्रयोग गरेर Request वा Follow को स्थानीय रेकर्ड बनाउन सकिन्छ। यसले त्यो ID वास्तविक Account को हो भनेर प्रमाणित गर्दैन।"}
          </p>
        </div>

        ${renderMutualFriends(english)}
        ${renderRequests(userId, english)}
        ${renderRelations(userId, english)}
        ${oldFriendsHTML}

      </section>
    `;
  }

  /* =======================================================
     MODAL
  ======================================================= */

  function closeModal() {
    MODAL()?.closeModal?.();
  }

  function openIdModal(kind) {
    const english = isEnglish();
    const social = SOCIAL();
    const localId = social?.getLocalUserId?.() || "";
    const modal = MODAL();

    if (
      !localId ||
      typeof modal?.openModal !== "function"
    ) {
      toast(
        english
          ? "Social feature is unavailable."
          : "Social सुविधा उपलब्ध छैन।",
        "error"
      );
      return false;
    }

    const isFollow = kind === "follow";

    return modal.openModal({
      title: isFollow
        ? (
            english
              ? "Follow a User ID"
              : "User ID Follow गर्नुहोस्"
          )
        : (
            english
              ? "Add Friend"
              : "साथी थप्नुहोस्"
          ),

      content: `
        <div>
          <p style="line-height:1.6">
            ${isFollow
              ? (
                  english
                    ? "Enter the other profile ID to create a local follow record."
                    : "स्थानीय Follow रेकर्ड बनाउन अर्को Profile ID राख्नुहोस्।"
                )
              : (
                  english
                    ? "Enter the other profile ID to create a local outgoing friend request."
                    : "स्थानीय Outgoing Friend Request बनाउन अर्को Profile ID राख्नुहोस्।"
                )}
          </p>

          <label for="ksk-social-target-id">
            ${english ? "Other User ID" : "अर्को User ID"}
          </label>

          <input
            id="ksk-social-target-id"
            type="text"
            maxlength="128"
            autocomplete="off"
            placeholder="${english ? "Paste user ID" : "User ID यहाँ राख्नुहोस्"}"
          />

          <p style="
            margin-top:10px;
            font-size:12px;
            line-height:1.6;
            color:var(--text-muted);
          ">
            ${english
              ? "LocalStorage only: this record is not sent to another device or user."
              : "LocalStorage मात्र: यो रेकर्ड अर्को मोबाइल वा प्रयोगकर्तालाई पठाइँदैन।"}
          </p>
        </div>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close
        >
          ${english ? "Close" : "बन्द गर्नुहोस्"}
        </button>

        <button
          class="btn btn-primary"
          type="button"
          data-submit-social="${isFollow ? "follow" : "friend"}"
        >
          ${isFollow
            ? "Follow"
            : (
                english
                  ? "Send Request"
                  : "Request पठाउनुहोस्"
              )}
        </button>
      `
    });
  }

  /* =======================================================
     COPY LOCAL ID
  ======================================================= */

  async function copyLocalId() {
    const id = SOCIAL()?.getLocalUserId?.();

    if (!id) {
      toast(
        isEnglish()
          ? "Local ID is unavailable."
          : "स्थानीय ID उपलब्ध छैन।",
        "error"
      );
      return false;
    }

    let copied = false;

    try {
      if (
        global.isSecureContext &&
        global.navigator?.clipboard?.writeText
      ) {
        await global.navigator.clipboard.writeText(id);
        copied = true;
      }
    } catch (error) {}

    if (!copied && global.document?.body) {
      const field = global.document.createElement("textarea");

      field.value = id;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";

      global.document.body.appendChild(field);
      field.select();

      try {
        copied = Boolean(
          global.document.execCommand("copy")
        );
      } catch (error) {}

      field.remove();
    }

    toast(
      copied
        ? (
            isEnglish()
              ? "Local ID copied."
              : "स्थानीय ID कपी भयो।"
          )
        : (
            isEnglish()
              ? "Could not copy ID."
              : "ID कपी गर्न सकिएन।"
          ),
      copied ? "success" : "error"
    );

    return copied;
  }

  /* =======================================================
     ACTION FEEDBACK
  ======================================================= */

  function showActionResult(result, action) {
    const english = isEnglish();

    if (result?.ok) {
      const messages = {
        friend: english
          ? "Local friend request record created."
          : "स्थानीय Friend Request रेकर्ड बन्यो।",

        follow: english
          ? "Local follow record created."
          : "स्थानीय Follow रेकर्ड बन्यो।",

        accept: english
          ? "Request accepted locally."
          : "स्थानीय Request स्वीकार भयो।",

        reject: english
          ? "Request rejected locally."
          : "स्थानीय Request अस्वीकार भयो।",

        cancel: english
          ? "Request cancelled locally."
          : "स्थानीय Request रद्द भयो।",

        remove: english
          ? "Friend removed locally."
          : "स्थानीय साथी हटाइयो।",

        unfollow: english
          ? "Unfollowed locally."
          : "स्थानीय Unfollow भयो।",

        block: english
          ? "User blocked locally."
          : "प्रयोगकर्ता स्थानीय रूपमा Block भयो।",

        unblock: english
          ? "User unblocked locally."
          : "प्रयोगकर्ता स्थानीय रूपमा Unblock भयो।"
      };

      toast(
        messages[action] || "Updated.",
        "success"
      );

      closeModal();
      refreshPage();
      return;
    }

    const errors = {
      INVALID_USER_ID: english
        ? "Enter a valid user ID."
        : "सही User ID राख्नुहोस्।",

      SELF_REQUEST_NOT_ALLOWED: english
        ? "You cannot add yourself."
        : "आफैँलाई साथी बनाउन मिल्दैन।",

      SELF_FOLLOW_NOT_ALLOWED: english
        ? "You cannot follow yourself."
        : "आफैँलाई Follow गर्न मिल्दैन।",

      SELF_BLOCK_NOT_ALLOWED: english
        ? "You cannot block yourself."
        : "आफैँलाई Block गर्न मिल्दैन।",

      ALREADY_BLOCKED: english
        ? "This ID is already blocked."
        : "यो ID पहिल्यै Block गरिएको छ।",

      BLOCK_NOT_FOUND: english
        ? "Block record not found."
        : "Block रेकर्ड भेटिएन।",

      USER_BLOCKED: english
        ? "This ID is blocked. Unblock it first."
        : "यो ID Block गरिएको छ। पहिले Unblock गर्नुहोस्।",

      ALREADY_FRIENDS: english
        ? "Already friends."
        : "पहिल्यै साथी हुनुहुन्छ।",

      DUPLICATE_REQUEST: english
        ? "A request is already pending."
        : "Request पहिल्यै पठाइएको छ।",

      REQUEST_ALREADY_RECEIVED: english
        ? "This user has already requested you."
        : "यो User ले तपाईंलाई Request पठाइसकेको छ।",

      ALREADY_FOLLOWING: english
        ? "Already following this ID."
        : "यो ID पहिल्यै Follow गरिएको छ।",

      REQUEST_NOT_FOUND: english
        ? "Request not found."
        : "Request भेटिएन।",

      REQUEST_NOT_PENDING: english
        ? "This request is no longer pending."
        : "यो Request अब Pending छैन।",

      NOT_AUTHORIZED_FOR_REQUEST: english
        ? "You cannot perform this request action."
        : "यो Request मा तपाईंलाई अनुमति छैन।",

      FRIENDSHIP_NOT_FOUND: english
        ? "Friend connection not found."
        : "साथी सम्बन्ध भेटिएन।",

      NOT_FOLLOWING: english
        ? "You are not following this ID."
        : "यो ID Follow गरिएको छैन।",

      STORAGE_UNAVAILABLE: english
        ? "Local storage is unavailable."
        : "LocalStorage उपलब्ध छैन।",

      CORRUPT_DATA: english
        ? "Social data is invalid."
        : "Social डाटा बिग्रिएको छ।"
    };

    toast(
      errors[result?.code] ||
        (
          english
            ? "The action could not be completed."
            : "काम पूरा गर्न सकिएन।"
        ),
      "error"
    );
  }

  /* =======================================================
     MUTUAL FRIEND SEARCH HANDLER
  ======================================================= */

  function handleMutualSearch(event) {
    const button = event.target?.closest?.(
      "[data-mutual-search]"
    );

    if (!button) return;

    event.preventDefault();

    const input = global.document.getElementById(
      "ksk-mutual-user-id"
    );

    const resultBox = global.document.getElementById(
      "ksk-mutual-results"
    );

    const targetId = input?.value?.trim() || "";
    const localId = SOCIAL()?.getLocalUserId?.() || "";

    if (!targetId) {
      toast(
        isEnglish()
          ? "Enter another profile ID."
          : "अर्को Profile ID राख्नुहोस्।",
        "warning"
      );

      input?.focus();
      return;
    }

    if (targetId === localId) {
      toast(
        isEnglish()
          ? "Enter a different profile ID."
          : "आफ्नो भन्दा फरक ID राख्नुहोस्।",
        "warning"
      );

      input?.focus();
      return;
    }

    const mutual = SOCIAL()?.getMutualFriends?.(
      localId,
      targetId
    ) || [];

    if (!resultBox) return;

    resultBox.innerHTML = mutual.length
      ? `
        <p style="
          margin:12px 0 6px;
          font-size:13px;
          color:var(--text-muted);
        ">
          ${isEnglish()
            ? mutual.length + " mutual friend(s) found."
            : mutual.length + " जना साझा साथी भेटिए।"}
        </p>

        ${mutual.map(item => `
          <div style="
            padding:9px 0;
            border-bottom:1px solid var(--border-color,rgba(127,127,127,.15));
          ">
            <code style="overflow-wrap:anywhere">
              ${escapeHTML(item.userId)}
            </code>
          </div>
        `).join("")}
      `
      : emptyMessage(
          isEnglish()
            ? "No mutual friends found in local records."
            : "स्थानीय रेकर्डमा आपसी साथी भेटिएनन्।"
        );
  }

  /* =======================================================
     CLICK HANDLER
  ======================================================= */

  function handleClick(event) {
    const target = event.target;
    if (!target?.closest) return;

    if (target.closest("[data-copy-social-id]")) {
      event.preventDefault();
      copyLocalId();
      return;
    }

    if (target.closest("[data-add-friend-open]")) {
      event.preventDefault();
      openIdModal("friend");
      return;
    }

    if (target.closest("[data-open-follow]")) {
      event.preventDefault();
      openIdModal("follow");
      return;
    }

    const submit = target.closest("[data-submit-social]");

    if (submit) {
      event.preventDefault();

      const kind = submit.getAttribute(
        "data-submit-social"
      );

      const input = global.document.getElementById(
        "ksk-social-target-id"
      );

      const targetId = input?.value?.trim() || "";
      const social = SOCIAL();
      const localId = social?.getLocalUserId?.() || "";

      if (!targetId) {
        toast(
          isEnglish()
            ? "Enter a user ID."
            : "User ID राख्नुहोस्।",
          "warning"
        );

        input?.focus();
        return;
      }

      const result = kind === "follow"
        ? social.followUser(localId, targetId)
        : social.sendFriendRequest(localId, targetId);

      showActionResult(result, kind);
      return;
    }

    const actionButton = target.closest(
      "[data-social-action]"
    );

    if (!actionButton) return;

    event.preventDefault();

    const action = actionButton.getAttribute(
      "data-social-action"
    );

    const id = actionButton.getAttribute(
      "data-social-id"
    );

    const social = SOCIAL();
    const localId = social?.getLocalUserId?.() || "";

    let result;

    switch (action) {
      case "accept-request":
        result = social.acceptFriendRequest(id, localId);
        showActionResult(result, "accept");
        break;

      case "reject-request":
        result = social.rejectFriendRequest(id, localId);
        showActionResult(result, "reject");
        break;

      case "cancel-request":
        result = social.cancelFriendRequest(id, localId);
        showActionResult(result, "cancel");
        break;

      case "remove-friend":
        result = social.removeFriend(localId, id);
        showActionResult(result, "remove");
        break;

      case "unfollow":
        result = social.unfollowUser(localId, id);
        showActionResult(result, "unfollow");
        break;

      case "block-user":
        result = social.blockUser(localId, id);
        showActionResult(result, "block");
        break;

      case "unblock-user":
        result = social.unblockUser(localId, id);
        showActionResult(result, "unblock");
        break;
    }
  }

  /* =======================================================
     PUBLIC PAGE API
  ======================================================= */

  function openAddFriend() {
    return openIdModal("friend");
  }

  global.document?.addEventListener(
    "click",
    handleClick
  );

  global.document?.addEventListener(
    "click",
    handleMutualSearch
  );

  global.KSKFriendsPage = Object.freeze({
    render,
    openAddFriend,
    copyLocalId
  });

  // Local state changes refresh the Friends screen when supported.
  global.addEventListener("ksk:social-change", () => {
    refreshPage();
  });

})(window);
