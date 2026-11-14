"use strict";

/*
 * =========================================================
 * MERO SANSAR — FRIENDS PAGE
 * PHASE 9.2 — FRIENDS INTERFACE REDESIGN
 *
 * - Existing LocalStorage schema preserved
 * - Existing Social API preserved
 * - UUID generated through KSKData.makeId()
 * - Modern compact mobile-first interface
 * - Friend requests, friends, followers, following
 * - Mutual friends, block/unblock, search
 * - No backend / SQL / server sync
 * =========================================================
 */

(function (global) {
  "use strict";

  /* =======================================================
     1. SOCIAL DATA API — EXISTING STORAGE COMPATIBILITY
  ======================================================= */

  if (!global.KSKSocialData) {
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

    // Central UUID service — KSKData
    function makeId() {
      if (typeof global.KSKData?.makeId !== "function") {
        throw new Error("KSKData UUID service is unavailable.");
      }

      return global.KSKData.makeId();
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
          global.dispatchEvent(new CustomEvent(
            "ksk:social-change",
            { detail: { type: code || "UPDATED" } }
          ));
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

      try {
        state.localUserId = makeId();

        const saved = saveState(
          state,
          "LOCAL_USER_ID_CREATED",
          { userId: state.localUserId }
        );

        return saved.ok ? state.localUserId : "";
      } catch (error) {
        return "";
      }
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

      let blockId;

      try {
        blockId = makeId();
      } catch (error) {
        return failure("UUID_SERVICE_UNAVAILABLE");
      }

      state.blocks.push({
        id: blockId,
        blockerId: blocker,
        blockedUserId: blocked,
        createdAt: new Date().toISOString()
      });

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

      let requestId;

      try {
        requestId = makeId();
      } catch (error) {
        return failure("UUID_SERVICE_UNAVAILABLE");
      }

      const request = {
        id: requestId,
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

        let friendshipId;

        try {
          friendshipId = makeId();
        } catch (error) {
          return failure("UUID_SERVICE_UNAVAILABLE");
        }

        state.friendships.push({
          id: friendshipId,
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
      return updateRequest(id, userId, "accepted", "toUserId");
    }

    function rejectFriendRequest(id, userId) {
      return updateRequest(id, userId, "rejected", "toUserId");
    }

    function cancelFriendRequest(id, userId) {
      return updateRequest(id, userId, "cancelled", "fromUserId");
    }

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

      let relationId;

      try {
        relationId = makeId();
      } catch (error) {
        return failure("UUID_SERVICE_UNAVAILABLE");
      }

      const relation = {
        id: relationId,
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

    global.addEventListener("storage", event => {
      if (event.key !== STORAGE_KEY) return;

      try {
        global.dispatchEvent(new CustomEvent(
          "ksk:social-change",
          { detail: { type: "STORAGE_SYNC" } }
        ));
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
  }

  /* =======================================================
     2. FRIENDS PAGE UI
  ======================================================= */

  if (global.KSKFriendsPage) return;

  const SOCIAL = () => global.KSKSocialData || null;
  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const MODAL = () => global.KSKModal || null;
  const TOAST = () => global.KSKToast || null;

  function isEnglish() {
    return LANG()?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
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

  /* =======================================================
     3. MODERN FRIENDS DESIGN
  ======================================================= */

  function injectStyles() {
    if (global.document.getElementById("ksk-friends-redesign-style")) {
      return;
    }

    const style = global.document.createElement("style");
    style.id = "ksk-friends-redesign-style";

    style.textContent = `
      .ksf-page {
        --ksf-line:var(--color-border,rgba(127,127,127,.18));
        --ksf-muted:var(--color-muted,#7b8494);
        --ksf-surface:var(--color-surface,#fff);
        --ksf-soft:var(--color-surface-secondary,rgba(127,127,127,.07));
        --ksf-text:var(--color-text,inherit);
        --ksf-primary:var(--color-primary,#2563eb);
        width:100%;
        max-width:100%;
        padding:2px 0 28px;
        color:var(--ksf-text);
        box-sizing:border-box;
      }

      .ksf-page *,
      .ksf-page *::before,
      .ksf-page *::after {
        box-sizing:border-box;
      }

      .ksf-topbar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin:0 0 16px;
      }

      .ksf-topbar h2 {
        margin:0;
        font-size:21px;
        line-height:1.25;
        font-weight:850;
        letter-spacing:-.45px;
        color:var(--ksf-text);
      }

      .ksf-topbar p {
        margin:5px 0 0;
        color:var(--ksf-muted);
        font-size:12px;
        line-height:1.5;
      }

      .ksf-card {
        min-width:0;
        margin:12px 0;
        padding:15px;
        border:1px solid var(--ksf-line);
        border-radius:17px;
        background:var(--ksf-surface);
        color:var(--ksf-text);
        box-shadow:0 4px 18px rgba(0,0,0,.035);
      }

      .ksf-identity {
        position:relative;
        overflow:hidden;
        padding:17px;
        background:linear-gradient(
          135deg,
          var(--color-primary-soft,rgba(37,99,235,.12)),
          var(--ksf-surface) 78%
        );
      }

      .ksf-identity::after {
        content:"";
        position:absolute;
        width:115px;
        height:115px;
        right:-46px;
        top:-54px;
        border-radius:50%;
        background:rgba(37,99,235,.07);
        pointer-events:none;
      }

      .ksf-id-top {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        position:relative;
        z-index:1;
      }

      .ksf-id-label {
        color:var(--ksf-muted);
        font-size:10px;
        font-weight:800;
        letter-spacing:.8px;
      }

      .ksf-local-tag {
        padding:4px 8px;
        border-radius:20px;
        background:var(--ksf-soft);
        color:var(--ksf-muted);
        font-size:9px;
        font-weight:800;
        white-space:nowrap;
      }

      .ksf-id-line {
        display:flex;
        align-items:center;
        gap:9px;
        margin-top:11px;
        min-width:0;
        position:relative;
        z-index:1;
      }

      .ksf-id-value {
        flex:1;
        min-width:0;
        display:block;
        padding:10px 11px;
        border:1px dashed var(--ksf-line);
        border-radius:10px;
        background:var(--ksf-surface);
        color:var(--ksf-text);
        font-size:11px;
        line-height:1.5;
        font-weight:750;
        overflow-wrap:anywhere;
        user-select:text;
      }

      .ksf-copy-btn {
        min-height:40px;
        flex:none;
        padding:8px 12px;
        border:1px solid var(--ksf-line);
        border-radius:10px;
        background:var(--ksf-surface);
        color:var(--ksf-text);
        font-size:12px;
        font-weight:800;
        cursor:pointer;
      }

      .ksf-main-actions {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:9px;
        margin-top:13px;
        position:relative;
        z-index:1;
      }

      .ksf-action {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        min-width:0;
        min-height:42px;
        padding:9px 11px;
        border:1px solid var(--ksf-line);
        border-radius:11px;
        font:inherit;
        font-size:12px;
        font-weight:800;
        line-height:1.25;
        cursor:pointer;
        transition:transform .16s ease,opacity .16s ease;
      }

      .ksf-action:active {
        transform:scale(.98);
      }

      .ksf-action:disabled {
        opacity:.5;
        cursor:not-allowed;
      }

      .ksf-primary {
        border-color:transparent;
        background:var(--ksf-primary);
        color:#fff;
      }

      .ksf-secondary {
        background:var(--ksf-soft);
        color:var(--ksf-text);
      }

      .ksf-id-note {
        margin:11px 0 0;
        color:var(--ksf-muted);
        font-size:10px;
        line-height:1.6;
        position:relative;
        z-index:1;
      }

      .ksf-stats {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        margin:12px 0 15px;
      }

      .ksf-stat {
        min-width:0;
        padding:12px 5px;
        text-align:center;
        border:1px solid var(--ksf-line);
        border-radius:13px;
        background:var(--ksf-surface);
      }

      .ksf-stat strong {
        display:block;
        color:var(--ksf-text);
        font-size:21px;
        line-height:1.15;
        font-weight:850;
      }

      .ksf-stat span {
        display:block;
        margin-top:5px;
        color:var(--ksf-muted);
        font-size:10px;
        font-weight:700;
      }

      .ksf-search-wrap {
        position:relative;
        margin:0 0 12px;
      }

      .ksf-search-icon {
        position:absolute;
        left:13px;
        top:50%;
        transform:translateY(-50%);
        font-size:15px;
        color:var(--ksf-muted);
        pointer-events:none;
      }

      .ksf-search {
        width:100%;
        min-height:44px;
        margin:0;
        padding:10px 13px 10px 38px;
        border:1px solid var(--ksf-line);
        border-radius:12px;
        outline:none;
        background:var(--ksf-soft);
        color:var(--ksf-text);
        font:inherit;
        font-size:12px;
      }

      .ksf-search::placeholder {
        color:var(--ksf-muted);
        opacity:1;
      }

      .ksf-search:focus {
        border-color:var(--ksf-primary);
        box-shadow:0 0 0 3px rgba(37,99,235,.10);
      }

      .ksf-section {
        padding:0;
        overflow:hidden;
      }

      .ksf-section summary {
        display:flex;
        align-items:center;
        gap:10px;
        min-height:56px;
        padding:12px 15px;
        list-style:none;
        cursor:pointer;
        user-select:none;
      }

      .ksf-section summary::-webkit-details-marker {
        display:none;
      }

      .ksf-section summary::after {
        content:"＋";
        margin-left:auto;
        color:var(--ksf-muted);
        font-size:17px;
        font-weight:500;
      }

      .ksf-section[open] summary::after {
        content:"−";
      }

      .ksf-section-icon {
        display:grid;
        place-items:center;
        width:34px;
        height:34px;
        flex:none;
        border-radius:11px;
        background:var(--ksf-soft);
        font-size:16px;
      }

      .ksf-section-title {
        min-width:0;
        flex:1;
      }

      .ksf-section-title strong {
        display:block;
        color:var(--ksf-text);
        font-size:13px;
        font-weight:850;
      }

      .ksf-section-title small {
        display:block;
        margin-top:3px;
        color:var(--ksf-muted);
        font-size:10px;
        font-weight:500;
      }

      .ksf-count {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:25px;
        height:23px;
        padding:0 7px;
        border-radius:20px;
        background:var(--ksf-soft);
        color:var(--ksf-text);
        font-size:10px;
        font-weight:850;
      }

      .ksf-count.ksf-count-alert {
        background:rgba(225,70,70,.12);
        color:#d44747;
      }

      .ksf-section-body {
        padding:0 15px 13px;
        border-top:1px solid var(--ksf-line);
      }

      .ksf-subheading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        margin:13px 0 5px;
        color:var(--ksf-muted);
        font-size:10px;
        font-weight:850;
        letter-spacing:.35px;
        text-transform:uppercase;
      }

      .ksf-item {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:9px;
        min-width:0;
        padding:11px 0;
        border-bottom:1px solid var(--ksf-line);
      }

      .ksf-item:last-child {
        border-bottom:0;
      }

      .ksf-item-main {
        display:flex;
        align-items:center;
        gap:9px;
        min-width:0;
        flex:1;
      }

      .ksf-avatar {
        display:grid;
        place-items:center;
        width:35px;
        height:35px;
        flex:none;
        border-radius:50%;
        background:var(--ksf-soft);
        color:var(--ksf-text);
        font-size:13px;
        font-weight:850;
        overflow:hidden;
      }

      .ksf-person-info {
        min-width:0;
        flex:1;
      }

      .ksf-person-info strong {
        display:block;
        color:var(--ksf-text);
        font-size:11px;
        font-weight:800;
        overflow-wrap:anywhere;
      }

      .ksf-person-info small {
        display:block;
        margin-top:3px;
        color:var(--ksf-muted);
        font-size:9px;
        line-height:1.4;
        overflow-wrap:anywhere;
      }

      .ksf-item-actions {
        display:flex;
        align-items:center;
        justify-content:flex-end;
        flex-wrap:wrap;
        gap:6px;
        flex:none;
      }

      .ksf-small-btn {
        min-height:32px;
        padding:6px 9px;
        border-radius:9px;
        font-size:10px;
      }

      .ksf-danger-btn {
        color:#c94444;
        border-color:rgba(201,68,68,.2);
        background:rgba(201,68,68,.06);
      }

      .ksf-empty {
        padding:17px 8px;
        text-align:center;
        color:var(--ksf-muted);
        font-size:11px;
        line-height:1.6;
      }

      .ksf-empty-icon {
        display:block;
        margin-bottom:5px;
        font-size:22px;
        opacity:.75;
      }

      .ksf-note {
        margin-top:10px;
        padding:10px 11px;
        border-radius:10px;
        background:var(--ksf-soft);
        color:var(--ksf-muted);
        font-size:10px;
        line-height:1.6;
      }

      .ksf-muted {
        color:var(--ksf-muted);
        font-size:10px;
      }

      .ksf-hidden {
        display:none !important;
      }

      .ksf-mutual-form {
        display:flex;
        align-items:center;
        gap:7px;
        margin:12px 0 5px;
      }

      .ksf-mutual-form .ksf-search {
        padding-left:12px;
      }

      .ksf-mutual-form .ksf-action {
        flex:none;
        min-width:75px;
      }

      .ksf-legacy {
        opacity:.9;
      }

      .ksf-legacy .ksf-section-icon {
        background:var(--ksf-soft);
      }

      .ksf-page button:focus-visible,
      .ksf-page input:focus-visible,
      .ksf-page summary:focus-visible {
        outline:2px solid var(--ksf-primary);
        outline-offset:2px;
      }

      .ksf-page .ksf-stats {
        display:none !important;
      }

      @media(max-width:390px) {
        .ksf-card { padding:12px; }
        .ksf-identity { padding:14px; }
        .ksf-topbar h2 { font-size:19px; }
        .ksf-action { font-size:11px; }
        .ksf-item { flex-wrap:wrap; }
        .ksf-item-actions { width:100%; padding-left:44px; }
        .ksf-item-actions .ksf-action { flex:1; }
      }

      @media(prefers-reduced-motion:reduce) {
        .ksf-page * { transition:none!important; }
      }
    `;

    global.document.head.appendChild(style);
  }

  /* =======================================================
     4. HTML HELPERS
  ======================================================= */

  function actionButton(action, id, label, kind = "secondary") {
    const extra = kind === "danger" ? "ksf-danger-btn" : "";

    return `
      <button
        type="button"
        class="ksf-action ksf-small-btn ${kind === "primary" ? "ksf-primary" : "ksf-secondary"} ${extra}"
        data-social-action="${escapeHTML(action)}"
        data-social-id="${escapeHTML(id)}"
      >${label}</button>
    `;
  }

  function emptyMessage(message, icon = "👥") {
    return `
      <div class="ksf-empty">
        <span class="ksf-empty-icon" aria-hidden="true">${icon}</span>
        ${escapeHTML(message)}
      </div>
    `;
  }

  function personItem(id, subtitle, actions = "") {
    const safeId = escapeHTML(id);
    const initial = escapeHTML(
      String(id || "?").trim().charAt(0).toUpperCase() || "?"
    );

    return `
      <div class="ksf-item ksf-searchable"
        data-search="${safeId.toLowerCase()}">
        <div class="ksf-item-main">
          <div class="ksf-avatar" aria-hidden="true">${initial}</div>
          <div class="ksf-person-info">
            <strong>${safeId}</strong>
            <small>${escapeHTML(subtitle || "")}</small>
          </div>
        </div>
        ${actions ? `<div class="ksf-item-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  function section(title, subtitle, icon, count, content, options = {}) {
    return `
      <details class="ksf-card ksf-section ${options.className || ""}"
        ${options.open ? "open" : ""}>
        <summary>
          <span class="ksf-section-icon" aria-hidden="true">${icon}</span>
          <span class="ksf-section-title">
            <strong>${title}</strong>
            <small>${subtitle}</small>
          </span>
          <span class="ksf-count ${options.alert ? "ksf-count-alert" : ""}">
            ${Number(count || 0)}
          </span>
        </summary>
        <div class="ksf-section-body">
          ${content}
        </div>
      </details>
    `;
  }

  /* =======================================================
     5. FRIEND REQUESTS
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
      ? incoming.map(item => personItem(
          item.fromUserId,
          english ? "Wants to connect with you" : "तपाईंसँग साथी बन्न चाहन्छ",
          actionButton(
            "accept-request",
            item.id,
            english ? "Accept" : "स्वीकार",
            "primary"
          ) +
          actionButton(
            "reject-request",
            item.id,
            english ? "Decline" : "अस्वीकार",
            "danger"
          )
        )).join("")
      : emptyMessage(
          english ? "No incoming requests right now." : "अहिले कुनै नयाँ Request आएको छैन।",
          "📩"
        );

    const outgoingHTML = outgoing.length
      ? outgoing.map(item => personItem(
          item.toUserId,
          english ? "Request pending · Local record" : "Request प्रतीक्षामा · स्थानीय रेकर्ड",
          actionButton(
            "cancel-request",
            item.id,
            english ? "Cancel" : "रद्द गर्नुहोस्",
            "danger"
          )
        )).join("")
      : emptyMessage(
          english ? "You have not sent any requests." : "तपाईंले कुनै Request पठाउनुभएको छैन।",
          "📤"
        );

    const content = `
      <div class="ksf-subheading">
        <span>${english ? "Incoming requests" : "आएका Request"}</span>
        <span>${incoming.length}</span>
      </div>
      ${incomingHTML}

      <div class="ksf-subheading">
        <span>${english ? "Sent requests" : "पठाएका Request"}</span>
        <span>${outgoing.length}</span>
      </div>
      ${outgoingHTML}
    `;

    return section(
      english ? "Friend Requests" : "Friend Requests",
      english ? "Manage connection requests" : "आएका र पठाएका Request व्यवस्थापन",
      "📨",
      incoming.length + outgoing.length,
      content,
      {
        open: incoming.length > 0,
        alert: incoming.length > 0
      }
    );
  }

  /* =======================================================
     6. FRIENDS / FOLLOWERS / FOLLOWING / BLOCKED
  ======================================================= */

  function renderRelations(userId, english) {
    const social = SOCIAL();

    const friends = social.getFriends(userId);
    const followers = social.getFollowers(userId);
    const following = social.getFollowing(userId);
    const blocked = social.getBlockedUsers(userId);

    const friendsHTML = friends.length
      ? friends.map(item => personItem(
          item.userId,
          english ? "Friend" : "साथी",
          actionButton(
            "remove-friend",
            item.userId,
            english ? "Remove" : "हटाउनुहोस्",
            "danger"
          ) +
          actionButton(
            "block-user",
            item.userId,
            "Block",
            "danger"
          )
        )).join("")
      : emptyMessage(
          english ? "Your friend list is empty." : "तपाईंको साथी सूची खाली छ।",
          "👥"
        );

    const followersHTML = followers.length
      ? followers.map(item => personItem(
          item.userId,
          english ? "Follows you" : "तपाईंलाई Follow गर्नुहुन्छ"
        )).join("")
      : emptyMessage(
          english ? "No followers yet." : "अहिलेसम्म Followers छैनन्।",
          "🌱"
        );

    const followingHTML = following.length
      ? following.map(item => personItem(
          item.userId,
          english ? "You follow this profile" : "तपाईंले Follow गर्नुभएको छ",
          actionButton(
            "unfollow",
            item.userId,
            "Unfollow",
            "danger"
          ) +
          actionButton(
            "block-user",
            item.userId,
            "Block",
            "danger"
          )
        )).join("")
      : emptyMessage(
          english ? "You are not following anyone yet." : "तपाईंले अहिलेसम्म कसैलाई Follow गर्नुभएको छैन।",
          "➕"
        );

    const blockedHTML = blocked.length
      ? blocked.map(item => personItem(
          item.userId,
          english ? "Blocked on this device" : "यो डिभाइसमा Block गरिएको",
          actionButton(
            "unblock-user",
            item.userId,
            "Unblock",
            "primary"
          )
        )).join("")
      : emptyMessage(
          english ? "No blocked profiles." : "कुनै Profile Block गरिएको छैन।",
          "🛡️"
        );

    return [
      section(
        english ? "Your Friends" : "तपाईंका साथीहरू",
        english ? "People connected as friends" : "साथीका रूपमा जोडिएका Profile",
        "👥",
        friends.length,
        friendsHTML,
        { open: true }
      ),

      section(
        "Followers",
        english ? "Profiles following you" : "तपाईंलाई Follow गर्नेहरू",
        "↙️",
        followers.length,
        followersHTML
      ),

      section(
        "Following",
        english ? "Profiles you follow" : "तपाईंले Follow गरेका Profile",
        "↗️",
        following.length,
        followingHTML
      ),

      section(
        english ? "Blocked Profiles" : "Block गरिएका Profile",
        english ? "Manage blocked IDs" : "Block सूची व्यवस्थापन",
        "🛡️",
        blocked.length,
        blockedHTML
      )
    ].join("");
  }

  /* =======================================================
     7. MUTUAL FRIENDS
  ======================================================= */

  function renderMutualFriends(english) {
    const content = `
      <p class="ksf-muted" style="margin:12px 0 8px;line-height:1.6">
        ${english
          ? "Compare your local friend records with another profile ID."
          : "अर्को Profile ID सँग तपाईंका साझा साथीहरू तुलना गर्नुहोस्।"}
      </p>

      <div class="ksf-mutual-form">
        <input
          id="ksk-mutual-user-id"
          class="ksf-search"
          type="text"
          maxlength="128"
          autocomplete="off"
          placeholder="${english ? "Enter another Profile ID" : "अर्को Profile ID राख्नुहोस्"}"
          aria-label="${english ? "Other profile ID" : "अर्को Profile ID"}"
        />

        <button
          type="button"
          class="ksf-action ksf-primary"
          data-mutual-search
        >${english ? "Find" : "खोज्नुहोस्"}</button>
      </div>

      <div id="ksk-mutual-results" aria-live="polite">
        ${emptyMessage(
          english ? "Enter an ID to compare friends." : "साझा साथी हेर्न Profile ID राख्नुहोस्।",
          "🤝"
        )}
      </div>
    `;

    return section(
      english ? "Mutual Friends" : "आपसी साथीहरू",
      english ? "Find friends you have in common" : "तपाईंसँग साझा साथी खोज्नुहोस्",
      "🤝",
      "↔",
      content
    );
  }

  /* =======================================================
     8. LEGACY FRIENDS
  ======================================================= */

  function renderLegacyFriends(english) {
    const oldFriends = DATA()?.getFriends?.() || [];

    if (!oldFriends.length) return "";

    const content = `
      <p class="ksf-muted" style="line-height:1.6;margin:10px 0">
        ${english
          ? "Older locally saved entries. These are not verified social connections."
          : "पहिले सुरक्षित गरिएका स्थानीय रेकर्ड हुन्। यी प्रमाणित Social Connection होइनन्।"}
      </p>

      ${oldFriends.map(friend => `
        <div class="ksf-item">
          <div class="ksf-person-info">
            <strong>${escapeHTML(friend.name || "Friend")}</strong>
          </div>
        </div>
      `).join("")}
    `;

    return section(
      english ? "Previously Saved Friends" : "पुराना सुरक्षित साथीहरू",
      english ? "Legacy local records" : "पुराना स्थानीय रेकर्ड",
      "🗂️",
      oldFriends.length,
      content,
      { className: "ksf-legacy" }
    );
  }

  /* =======================================================
     9. MAIN PAGE
  ======================================================= */

  function render(options = {}) {
    injectStyles();

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
          following: 0,
          incomingRequests: 0,
          outgoingRequests: 0,
          blocked: 0
        };

    return `
      <section class="page-section ksf-page">

        <header class="ksf-topbar">
          <div>
            <h2>${english ? "Friends" : "साथीहरू"}</h2>
            <p>
              ${english
                ? "Your connections, requests and community."
                : "तपाईंका साथी, Request र सामाजिक सम्बन्धहरू।"}
            </p>
          </div>
        </header>

        <section class="ksf-card ksf-identity">

          <div class="ksf-id-top">
            <span class="ksf-id-label">
              ${english ? "YOUR PROFILE ID" : "तपाईंको PROFILE ID"}
            </span>
            <span class="ksf-local-tag">
              ${english ? "LOCAL ID" : "स्थानीय ID"}
            </span>
          </div>

          <div class="ksf-id-line">
            <code class="ksf-id-value">
              ${escapeHTML(userId || "ID unavailable")}
            </code>

            <button
              type="button"
              class="ksf-copy-btn"
              data-copy-social-id
              ${userId ? "" : "disabled"}
            >
              ${english ? "Copy" : "कपी"}
            </button>
          </div>

          <div class="ksf-main-actions">
            <button
              type="button"
              class="ksf-action ksf-primary"
              data-add-friend-open
              ${userId ? "" : "disabled"}
            >
              <span aria-hidden="true">＋</span>
              ${english ? "Add Friend" : "साथी थप्नुहोस्"}
            </button>

            <button
              type="button"
              class="ksf-action ksf-secondary"
              data-open-follow
              ${userId ? "" : "disabled"}
            >
              <span aria-hidden="true">↗</span>
              ${english ? "Follow by ID" : "ID बाट Follow"}
            </button>
          </div>

          <p class="ksf-id-note">
            ${english
              ? "Local prototype only. Your ID and social records stay in this browser. Requests and follows are not delivered to other devices or real accounts."
              : "यो LocalStorage Prototype मात्र हो। ID र सामाजिक रेकर्ड यही ब्राउजरमा सुरक्षित हुन्छन्। Request वा Follow अर्को मोबाइल वा वास्तविक Account मा पुग्दैन।"}
          </p>
        </section>

        <div class="ksf-stats">
          <div class="ksf-stat">
            <strong>${Number(counts.friends || 0)}</strong>
            <span>${english ? "Friends" : "साथीहरू"}</span>
          </div>

          <div class="ksf-stat">
            <strong>${Number(counts.followers || 0)}</strong>
            <span>Followers</span>
          </div>

          <div class="ksf-stat">
            <strong>${Number(counts.following || 0)}</strong>
            <span>Following</span>
          </div>
        </div>

        <div class="ksf-search-wrap">
          <span class="ksf-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            class="ksf-search"
            data-friends-filter
            placeholder="${english ? "Search IDs in your lists..." : "आफ्नो सूचीमा ID खोज्नुहोस्..."}"
            aria-label="${english ? "Search friends and social lists" : "साथी र सामाजिक सूची खोज्नुहोस्"}"
          />
        </div>

        ${renderRequests(userId, english)}
        ${renderRelations(userId, english)}
        ${renderMutualFriends(english)}
        ${renderLegacyFriends(english)}

      </section>
    `;
  }

  /* =======================================================
     10. MODAL
  ======================================================= */

  function closeModal() {
    MODAL()?.closeModal?.();
  }

  function openIdModal(kind) {
    const english = isEnglish();
    const social = SOCIAL();
    const localId = social?.getLocalUserId?.() || "";
    const modal = MODAL();

    if (!localId || typeof modal?.openModal !== "function") {
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
        ? (english ? "Follow a User ID" : "User ID Follow गर्नुहोस्")
        : (english ? "Add Friend" : "साथी थप्नुहोस्"),

      content: `
        <div class="ksf-modal-content">
          <p style="line-height:1.6;font-size:13px">
            ${isFollow
              ? (
                  english
                    ? "Enter another profile ID to create a local follow record."
                    : "स्थानीय Follow रेकर्ड बनाउन अर्को Profile ID राख्नुहोस्।"
                )
              : (
                  english
                    ? "Enter another profile ID to create a local friend request."
                    : "स्थानीय Friend Request बनाउन अर्को Profile ID राख्नुहोस्।"
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
            style="width:100%;box-sizing:border-box;min-height:43px;padding:10px;border:1px solid var(--color-border,#ddd);border-radius:10px;background:var(--color-surface-secondary,#fff);color:var(--color-text,inherit)"
          />

          <p style="margin-top:10px;font-size:11px;line-height:1.6;color:var(--text-muted)">
            ${english
              ? "LocalStorage only. This record is not sent to another device or user."
              : "LocalStorage मात्र। यो रेकर्ड अर्को मोबाइल वा प्रयोगकर्तालाई पठाइँदैन।"}
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
            : (english ? "Send Request" : "Request पठाउनुहोस्")}
        </button>
      `
    });
  }

  /* =======================================================
     11. COPY LOCAL ID
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
        copied = Boolean(global.document.execCommand("copy"));
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
     12. ACTION FEEDBACK
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

      toast(messages[action] || "Updated.", "success");
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
        : "Social डाटा बिग्रिएको छ।",

      UUID_SERVICE_UNAVAILABLE: english
        ? "KSKData UUID service is unavailable."
        : "KSKData UUID सेवा उपलब्ध छैन।"
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
     13. MUTUAL FRIEND SEARCH
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
        <p class="ksf-muted" style="margin:12px 0 5px">
          ${isEnglish()
            ? mutual.length + " mutual friend(s) found."
            : mutual.length + " जना साझा साथी भेटिए।"}
        </p>

        ${mutual.map(item => personItem(
          item.userId,
          isEnglish() ? "Mutual friend" : "साझा साथी"
        )).join("")}
      `
      : emptyMessage(
          isEnglish()
            ? "No mutual friends found in local records."
            : "स्थानीय रेकर्डमा आपसी साथी भेटिएनन्।",
          "🔎"
        );
  }

  /* =======================================================
     14. LIST SEARCH
  ======================================================= */

  function handleListSearch(event) {
    const input = event.target?.closest?.(
      "[data-friends-filter]"
    );

    if (!input) return;

    const query = String(input.value || "")
      .trim()
      .toLowerCase();

    global.document
      .querySelectorAll(".ksf-page .ksf-searchable")
      .forEach(item => {
        const value = item.getAttribute("data-search") || "";

        item.classList.toggle(
          "ksf-hidden",
          Boolean(query) && !value.includes(query)
        );
      });
  }

  /* =======================================================
     15. CLICK HANDLER
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

      const kind = submit.getAttribute("data-submit-social");
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

    const button = target.closest("[data-social-action]");
    if (!button) return;

    event.preventDefault();

    const action = button.getAttribute("data-social-action");
    const id = button.getAttribute("data-social-id");

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
     16. INITIALIZATION
  ======================================================= */

  global.document?.addEventListener("click", handleClick);
  global.document?.addEventListener("click", handleMutualSearch);
  global.document?.addEventListener("input", handleListSearch);

  global.KSKFriendsPage = Object.freeze({
    render,
    openAddFriend: () => openIdModal("friend"),
    copyLocalId
  });

  global.addEventListener("ksk:social-change", refreshPage);

})(window);
