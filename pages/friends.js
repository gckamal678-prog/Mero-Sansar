
"use strict";

/* =========================================================
   MERO SANSAR — SOCIAL DATA + FRIENDS PAGE
   LocalStorage prototype only. No backend / server sync.
========================================================= */

(function (global) {
  "use strict";

  /* =======================================================
     SOCIAL DATA API — EXISTING STORAGE COMPATIBILITY
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
     FRIENDS PAGE UI
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

  function injectStyles() {
    if (global.document.getElementById("ksk-friends-redesign-style")) {
      return;
    }

    const style = global.document.createElement("style");
    style.id = "ksk-friends-redesign-style";

    style.textContent = `
      .ksf-page {
        --ksf-border: var(--border-color, rgba(127,127,127,.17));
        --ksf-muted: var(--text-muted, #7b8494);
        width:100%;
        max-width:100%;
        padding-bottom:24px;
      }

      .ksf-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin:0 0 14px;
      }

      .ksf-heading h2 {
        margin:0;
        font-size:20px;
        font-weight:800;
        letter-spacing:-.35px;
      }

      .ksf-subtitle {
        color:var(--ksf-muted);
        font-size:12px;
        line-height:1.55;
        margin:5px 0 0;
      }

      .ksf-card {
        background:var(--card-bg, var(--surface, #fff));
        color:var(--text-color, inherit);
        border:1px solid var(--ksf-border);
        border-radius:17px;
        padding:15px;
        margin:12px 0;
        min-width:0;
        box-shadow:0 5px 18px rgba(0,0,0,.035);
      }

      .ksf-identity {
        padding:17px;
        background:
          linear-gradient(135deg,
            rgba(37,99,235,.11),
            rgba(14,165,233,.045));
        border-color:rgba(37,99,235,.18);
      }

      .ksf-id-label {
        font-size:12px;
        color:var(--ksf-muted);
        font-weight:700;
      }

      .ksf-id-line {
        display:flex;
        align-items:center;
        gap:9px;
        margin-top:9px;
        min-width:0;
      }

      .ksf-id-value {
        min-width:0;
        flex:1;
        overflow-wrap:anywhere;
        font-size:12px;
        line-height:1.5;
        font-weight:700;
        color:var(--text-color, inherit);
      }

      .ksf-actions {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
        margin-top:15px;
      }

      .ksf-action {
        min-height:43px;
        border-radius:12px;
        padding:9px 10px;
        font-weight:700;
        font-size:13px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        cursor:pointer;
      }

      .ksf-primary {
        background:var(--primary-color, #2563eb);
        color:#fff;
        border:1px solid transparent;
      }

      .ksf-secondary {
        background:var(--surface-2, rgba(127,127,127,.09));
        color:var(--text-color, inherit);
        border:1px solid var(--ksf-border);
      }

      .ksf-action:disabled {
        opacity:.5;
        cursor:not-allowed;
      }

      .ksf-stats {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        margin:12px 0;
      }

      .ksf-stat {
        min-width:0;
        text-align:center;
        padding:13px 5px;
        border:1px solid var(--ksf-border);
        border-radius:14px;
        background:var(--card-bg, var(--surface, #fff));
      }

      .ksf-stat strong {
        display:block;
        font-size:21px;
        line-height:1.2;
        font-weight:800;
      }

      .ksf-stat span {
        display:block;
        margin-top:4px;
        font-size:11px;
        color:var(--ksf-muted);
      }

      .ksf-section {
        overflow:hidden;
      }

      .ksf-section summary {
        list-style:none;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        min-height:35px;
        font-weight:800;
        font-size:14px;
      }

      .ksf-section summary::-webkit-details-marker {
        display:none;
      }

      .ksf-section summary::after {
        content:"＋";
        font-size:17px;
        color:var(--ksf-muted);
        flex:none;
      }

      .ksf-section[open] summary::after {
        content:"−";
      }

      .ksf-section summary .ksf-count {
        margin-left:auto;
        margin-right:5px;
        min-width:25px;
        text-align:center;
        border-radius:20px;
        padding:3px 7px;
        font-size:11px;
        background:rgba(127,127,127,.11);
        color:var(--ksf-muted);
      }

      .ksf-section-body {
        border-top:1px solid var(--ksf-border);
        margin-top:12px;
        padding-top:10px;
      }

      .ksf-item {
        display:flex;
        align-items:center;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:10px;
        padding:11px 0;
        border-bottom:1px solid var(--ksf-border);
      }

      .ksf-item:last-child {
        border-bottom:0;
      }

      .ksf-item-id {
        min-width:0;
        flex:1;
        overflow-wrap:anywhere;
        font-size:12px;
        line-height:1.55;
      }

      .ksf-item-actions {
        display:flex;
        align-items:center;
        flex-wrap:wrap;
        gap:6px;
      }

      .ksf-small-btn {
        min-height:33px;
        border-radius:9px;
        padding:6px 10px;
        font-size:11px;
        font-weight:700;
      }

      .ksf-search {
        width:100%;
        min-height:42px;
        padding:10px 12px;
        border-radius:12px;
        border:1px solid var(--ksf-border);
        background:var(--input-bg, var(--card-bg, #fff));
        color:var(--text-color, inherit);
        outline:none;
        font:inherit;
        font-size:13px;
        margin:0 0 5px;
      }

      .ksf-search:focus {
        border-color:var(--primary-color, #2563eb);
        box-shadow:0 0 0 3px rgba(37,99,235,.10);
      }

      .ksf-empty {
        text-align:center;
        padding:17px 8px;
        color:var(--ksf-muted);
        font-size:12px;
        line-height:1.6;
      }

      .ksf-note {
        padding:12px 13px;
        border-radius:12px;
        background:rgba(127,127,127,.07);
        color:var(--ksf-muted);
        font-size:11px;
        line-height:1.65;
        margin-top:12px;
      }

      .ksf-muted {
        color:var(--ksf-muted);
        font-size:11px;
      }

      .ksf-danger {
        color:#dc4444;
      }

      .ksf-hidden {
        display:none !important;
      }

      @media(max-width:380px) {
        .ksf-card { padding:12px; }
        .ksf-heading h2 { font-size:18px; }
        .ksf-action { font-size:12px; }
        .ksf-item-actions { width:100%; }
        .ksf-item-actions button { flex:1; }
      }

      /* FRIENDS PAGE — REAL LIGHT / DARK THEME SUPPORT */

      .ksf-page {
        color: var(--color-text);
        --ksf-border: var(--color-border);
        --ksf-muted: var(--color-muted);
      }

      .ksf-card,
      .ksf-stat {
        background: var(--color-surface);
        color: var(--color-text);
        border-color: var(--color-border);
      }

      .ksf-identity {
        background: linear-gradient(
          135deg,
          var(--color-primary-soft),
          var(--color-surface)
        );
        border-color: var(--color-border);
      }

      .ksf-id-value,
      .ksf-section summary,
      .ksf-item-id,
      .ksf-stat strong,
      .ksf-heading h2 {
        color: var(--color-text);
      }

      .ksf-secondary {
        background: var(--color-surface-secondary);
        color: var(--color-text);
        border-color: var(--color-border);
      }

      .ksf-primary {
        background: var(--color-primary);
        color: #ffffff;
      }

      .ksf-search {
        background: var(--color-surface-secondary);
        color: var(--color-text);
        border-color: var(--color-border);
        color-scheme: inherit;
      }

      .ksf-search::placeholder {
        color: var(--color-muted);
        opacity: 1;
      }

      .ksf-note,
      .ksf-section summary .ksf-count {
        background: var(--color-surface-secondary);
        color: var(--color-text-secondary);
      }

      .ksf-item {
        border-color: var(--color-border);
      }

      .ksf-section-body {
        border-color: var(--color-border);
      }

      .ksf-empty,
      .ksf-subtitle,
      .ksf-muted,
      .ksf-id-label,
      .ksf-stat span {
        color: var(--color-muted);
      }

      html[data-theme="dark"] .ksf-card,
      html[data-theme="dark"] .ksf-stat {
        background: var(--color-surface);
        color: var(--color-text);
      }

      html[data-theme="dark"] .ksf-search {
        background: var(--color-surface-secondary);
        color: var(--color-text);
      }

      html[data-theme="dark"] .ksf-secondary {
        background: var(--color-surface-secondary);
        color: var(--color-text);
      }
    `;

    global.document.head.appendChild(style);
  }

  function actionButton(action, id, label, kind = "secondary") {
    return `
      <button
        type="button"
        class="ksf-action ksf-small-btn ${kind === "primary" ? "ksf-primary" : "ksf-secondary"}"
        data-social-action="${escapeHTML(action)}"
        data-social-id="${escapeHTML(id)}"
      >${label}</button>
    `;
  }

  function emptyMessage(message) {
    return `
      <div class="ksf-empty">
        ${escapeHTML(message)}
      </div>
    `;
  }

  function searchableItem(id, content) {
    return `
      <div class="ksf-item ksf-searchable"
        data-search="${escapeHTML(String(id).toLowerCase())}">
        <div class="ksf-item-id">
          <code>${escapeHTML(id)}</code>
        </div>
        ${content || ""}
      </div>
    `;
  }

  /* =======================================================
     REQUEST SECTIONS
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
          <div class="ksf-item">
            <div class="ksf-item-id">
              <strong>${english ? "Request from" : "Request पठाउने ID"}</strong>
              <div><code>${escapeHTML(item.fromUserId)}</code></div>
            </div>

            <div class="ksf-item-actions">
              ${actionButton(
                "accept-request",
                item.id,
                english ? "Accept" : "स्वीकार",
                "primary"
              )}

              ${actionButton(
                "reject-request",
                item.id,
                english ? "Reject" : "अस्वीकार"
              )}
            </div>
          </div>
        `).join("")
      : emptyMessage(
          english
            ? "No incoming requests."
            : "अहिलेसम्म कुनै Request आएको छैन।"
        );

    const outgoingHTML = outgoing.length
      ? outgoing.map(item => `
          <div class="ksf-item">
            <div class="ksf-item-id">
              <strong>${english ? "Request sent to" : "Request पठाइएको ID"}</strong>
              <div><code>${escapeHTML(item.toUserId)}</code></div>
              <span class="ksf-muted">
                ${english ? "Pending · Local only" : "प्रतीक्षामा · स्थानीय रेकर्ड"}
              </span>
            </div>

            <div class="ksf-item-actions">
              ${actionButton(
                "cancel-request",
                item.id,
                english ? "Cancel" : "रद्द"
              )}
            </div>
          </div>
        `).join("")
      : emptyMessage(
          english
            ? "No outgoing requests."
            : "तपाईंले कुनै Request पठाउनुभएको छैन।"
        );

    return `
      <details class="ksf-card ksf-section" ${incoming.length ? "open" : ""}>
        <summary>
          ${english ? "Friend Requests" : "Friend Requests"}
          <span class="ksf-count">${incoming.length + outgoing.length}</span>
        </summary>

        <div class="ksf-section-body">
          <strong>${english ? "Incoming" : "आएका Request"} (${incoming.length})</strong>
          ${incomingHTML}

          <div style="height:12px"></div>

          <strong>${english ? "Outgoing" : "पठाएका Request"} (${outgoing.length})</strong>
          ${outgoingHTML}
        </div>
      </details>
    `;
  }

  /* =======================================================
     RELATION SECTIONS
  ======================================================= */

  function renderRelations(userId, english) {
    const social = SOCIAL();

    const friends = social.getFriends(userId);
    const followers = social.getFollowers(userId);
    const following = social.getFollowing(userId);
    const blocked = social.getBlockedUsers(userId);

    const friendsHTML = friends.length
      ? friends.map(item => searchableItem(
          item.userId,
          `<div class="ksf-item-actions">
            ${actionButton(
              "remove-friend",
              item.userId,
              english ? "Remove" : "हटाउनुहोस्"
            )}
            ${actionButton(
              "block-user",
              item.userId,
              "Block"
            )}
          </div>`
        )).join("")
      : emptyMessage(
          english ? "No friends yet." : "अहिलेसम्म साथी छैनन्।"
        );

    const followersHTML = followers.length
      ? followers.map(item => searchableItem(
          item.userId,
          ""
        )).join("")
      : emptyMessage(
          english ? "No followers yet." : "अहिलेसम्म Followers छैनन्।"
        );

    const followingHTML = following.length
      ? following.map(item => searchableItem(
          item.userId,
          `<div class="ksf-item-actions">
            ${actionButton(
              "unfollow",
              item.userId,
              "Unfollow"
            )}
            ${actionButton(
              "block-user",
              item.userId,
              "Block"
            )}
          </div>`
        )).join("")
      : emptyMessage(
          english
            ? "You are not following anyone."
            : "कसैलाई Follow गर्नुभएको छैन।"
        );

    const blockedHTML = blocked.length
      ? blocked.map(item => searchableItem(
          item.userId,
          `<div class="ksf-item-actions">
            ${actionButton(
              "unblock-user",
              item.userId,
              "Unblock"
            )}
          </div>`
        )).join("")
      : emptyMessage(
          english ? "No blocked users." : "कुनै Block गरिएको ID छैन।"
        );

    return `
      <details class="ksf-card ksf-section" open>
        <summary>
          ${english ? "Friends" : "तपाईंका साथीहरू"}
          <span class="ksf-count">${friends.length}</span>
        </summary>
        <div class="ksf-section-body">
          ${friendsHTML}
        </div>
      </details>

      <details class="ksf-card ksf-section">
        <summary>
          Followers
          <span class="ksf-count">${followers.length}</span>
        </summary>
        <div class="ksf-section-body">
          ${followersHTML}
        </div>
      </details>

      <details class="ksf-card ksf-section">
        <summary>
          Following
          <span class="ksf-count">${following.length}</span>
        </summary>
        <div class="ksf-section-body">
          ${followingHTML}
        </div>
      </details>

      <details class="ksf-card ksf-section">
        <summary>
          ${english ? "Blocked Users" : "Block गरिएका प्रयोगकर्ता"}
          <span class="ksf-count">${blocked.length}</span>
        </summary>
        <div class="ksf-section-body">
          ${blockedHTML}
        </div>
      </details>
    `;
  }

  /* =======================================================
     MUTUAL FRIENDS
  ======================================================= */

  function renderMutualFriends(english) {
    return `
      <details class="ksf-card ksf-section">
        <summary>
          ${english ? "Mutual Friends" : "आपसी साथीहरू"}
        </summary>

        <div class="ksf-section-body">
          <p class="ksf-subtitle" style="margin:0 0 10px">
            ${english
              ? "Compare friend records with another local profile ID."
              : "अर्को स्थानीय Profile ID सँग साझा साथीहरू तुलना गर्नुहोस्।"}
          </p>

          <div style="display:flex;gap:8px">
            <input
              id="ksk-mutual-user-id"
              class="ksf-search"
              type="text"
              maxlength="128"
              autocomplete="off"
              placeholder="${english ? "Other profile ID" : "अर्को Profile ID"}"
            />

            <button
              type="button"
              class="ksf-action ksf-secondary"
              data-mutual-search
              style="min-width:75px"
            >${english ? "Find" : "खोज्नुहोस्"}</button>
          </div>

          <div id="ksk-mutual-results" aria-live="polite">
            ${emptyMessage(
              english
                ? "Enter an ID to compare."
                : "तुलना गर्न अर्को ID राख्नुहोस्।"
            )}
          </div>
        </div>
      </details>
    `;
  }

  /* =======================================================
     MAIN PAGE
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

    const oldFriends = DATA()?.getFriends?.() || [];

    const oldFriendsHTML = oldFriends.length
      ? `
        <details class="ksf-card ksf-section">
          <summary>
            ${english ? "Previously saved friends" : "पुराना सुरक्षित साथीहरू"}
            <span class="ksf-count">${oldFriends.length}</span>
          </summary>

          <div class="ksf-section-body">
            <p class="ksf-subtitle">
              ${english
                ? "Legacy local entries. These are not verified social connections."
                : "यी पुराना स्थानीय रेकर्ड हुन्, प्रमाणित साथी सम्बन्ध होइनन्।"}
            </p>

            ${oldFriends.map(friend => `
              <div class="ksf-item">
                <strong>${escapeHTML(friend.name || "Friend")}</strong>
              </div>
            `).join("")}
          </div>
        </details>
      `
      : "";

    return `
      <section class="page-section ksf-page">

        <header class="ksf-heading">
          <div>
            <h2>${english ? "Friends" : "साथीहरू"}</h2>
            <p class="ksf-subtitle">
              ${english
                ? "Manage your local social connections."
                : "आफ्ना सामाजिक सम्बन्धहरू व्यवस्थित गर्नुहोस्।"}
            </p>
          </div>
        </header>

        <section class="ksf-card ksf-identity">
          <div class="ksf-id-label">
            ${english ? "YOUR LOCAL PROFILE ID" : "तपाईंको स्थानीय PROFILE ID"}
          </div>

          <div class="ksf-id-line">
            <code class="ksf-id-value">
              ${escapeHTML(userId || "ID unavailable")}
            </code>

            <button
              type="button"
              class="ksf-action ksf-secondary"
              data-copy-social-id
              ${userId ? "" : "disabled"}
              style="min-height:36px;flex:none"
            >
              ${english ? "Copy" : "कपी"}
            </button>
          </div>

          <div class="ksf-actions">
            <button
              type="button"
              class="ksf-action ksf-primary"
              data-add-friend-open
              ${userId ? "" : "disabled"}
            >
              ＋ ${english ? "Add Friend" : "साथी थप्नुहोस्"}
            </button>

            <button
              type="button"
              class="ksf-action ksf-secondary"
              data-open-follow
              ${userId ? "" : "disabled"}
            >
              ${english ? "Follow by ID" : "ID बाट Follow"}
            </button>
          </div>

          <div class="ksf-note">
            ${english
              ? "Local prototype only. Your ID and social records are stored in this browser. Requests and follows are not delivered to other devices or real accounts."
              : "यो LocalStorage Prototype मात्र हो। तपाईंको ID र सामाजिक रेकर्ड यही ब्राउजरमा सुरक्षित हुन्छन्। Request वा Follow अर्को मोबाइल वा वास्तविक Account मा पुग्दैन।"}
          </div>
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

        <input
          type="search"
          class="ksf-search"
          data-friends-filter
          placeholder="${english ? "Search an ID in opened lists..." : "खोलिएका सूचीमा ID खोज्नुहोस्..."}"
          aria-label="${english ? "Search social lists" : "सामाजिक सूची खोज्नुहोस्"}"
        />

        ${renderRequests(userId, english)}
        ${renderRelations(userId, english)}
        ${renderMutualFriends(english)}
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
        <div>
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
            style="width:100%;box-sizing:border-box"
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
     MUTUAL FRIEND SEARCH
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
        <p class="ksf-subtitle">
          ${isEnglish()
            ? mutual.length + " mutual friend(s) found."
            : mutual.length + " जना साझा साथी भेटिए।"}
        </p>

        ${mutual.map(item => `
          <div class="ksf-item">
            <code>${escapeHTML(item.userId)}</code>
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
     LIST SEARCH
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
      .querySelectorAll(".ksf-searchable")
      .forEach(item => {
        const value = item.getAttribute("data-search") || "";
        item.classList.toggle(
          "ksf-hidden",
          Boolean(query) && !value.includes(query)
        );
      });
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
     INITIALIZATION
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
