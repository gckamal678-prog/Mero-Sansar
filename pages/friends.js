"use strict";

/*
 * =========================================================
 * KSK — SOCIAL DATA + FRIENDS PAGE
 *
 * SOCIAL DATA:
 * - LocalStorage-only development adapter
 * - No demo users or fake profiles
 * - No authentication or server synchronization
 *
 * FRIENDS PAGE:
 * - Preserves the existing legacy Friends UI
 *
 * IMPORTANT:
 * Caller-supplied IDs are NOT authenticated identities.
 * Replace the storage adapter with Supabase + RLS later.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKSocialData) return;

  const STORAGE_KEY = "ksk_social_state_v1";
  const VERSION = 1;

  const VALID_DIRECTIONS = new Set([
    "all",
    "incoming",
    "outgoing"
  ]);

  const VALID_STATUSES = new Set([
    "pending",
    "accepted",
    "rejected",
    "cancelled"
  ]);

  function emptyState() {
    return {
      version: VERSION,
      friendRequests: [],
      friendships: [],
      follows: []
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeId(value) {
    if (
      typeof value !== "string" &&
      typeof value !== "number"
    ) {
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

  function makeId() {
    try {
      if (global.crypto?.randomUUID) {
        return global.crypto.randomUUID();
      }
    } catch (error) {
      // Use the fallback below.
    }

    return (
      "social-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 12)
    );
  }

  function readState() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (raw === null) {
        return {
          ok: true,
          state: emptyState()
        };
      }

      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        parsed.version !== VERSION ||
        !Array.isArray(parsed.friendRequests) ||
        !Array.isArray(parsed.friendships) ||
        !Array.isArray(parsed.follows)
      ) {
        return {
          ok: false,
          code: "CORRUPT_DATA"
        };
      }

      return {
        ok: true,
        state: parsed
      };
    } catch (error) {
      return {
        ok: false,
        code: "STORAGE_UNAVAILABLE"
      };
    }
  }

  function failure(code) {
    return {
      ok: false,
      code,
      data: null
    };
  }

  function commit(state, code, data) {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      try {
        global.dispatchEvent(
          new CustomEvent("ksk:social-change", {
            detail: {
              type: code,
              at: new Date().toISOString()
            }
          })
        );
      } catch (error) {
        // Storage operation has already succeeded.
      }

      return {
        ok: true,
        code: code || "OK",
        data: data === undefined
          ? null
          : clone(data)
      };
    } catch (error) {
      return failure("STORAGE_UNAVAILABLE");
    }
  }

  function pairKey(firstId, secondId) {
    return [firstId, secondId]
      .sort()
      .join("\u0000");
  }

  function findFriendship(state, firstId, secondId) {
    const key = pairKey(firstId, secondId);

    return state.friendships.find(item =>
      pairKey(item.userAId, item.userBId) === key
    );
  }

  /* =======================================================
     FRIENDSHIPS
  ======================================================= */

  function getFriends(userId) {
    const id = normalizeId(userId);

    if (!id) return [];

    const loaded = readState();

    if (!loaded.ok) return [];

    return loaded.state.friendships
      .filter(item =>
        item.userAId === id ||
        item.userBId === id
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

    const loaded = readState();

    if (!loaded.ok) {
      return failure(loaded.code);
    }

    const state = loaded.state;

    const index = state.friendships.findIndex(item =>
      pairKey(item.userAId, item.userBId) ===
      pairKey(user, friend)
    );

    if (index < 0) {
      return failure("FRIENDSHIP_NOT_FOUND");
    }

    const removed = state.friendships.splice(index, 1)[0];

    return commit(state, "FRIEND_REMOVED", removed);
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

    const loaded = readState();

    if (!loaded.ok) {
      return failure(loaded.code);
    }

    const state = loaded.state;

    if (findFriendship(state, from, to)) {
      return failure("ALREADY_FRIENDS");
    }

    const receivedRequest = state.friendRequests.some(
      request =>
        request.fromUserId === to &&
        request.toUserId === from &&
        request.status === "pending"
    );

    if (receivedRequest) {
      return failure("REQUEST_ALREADY_RECEIVED");
    }

    const duplicateRequest = state.friendRequests.some(
      request =>
        request.fromUserId === from &&
        request.toUserId === to &&
        request.status === "pending"
    );

    if (duplicateRequest) {
      return failure("DUPLICATE_REQUEST");
    }

    const now = new Date().toISOString();

    const request = {
      id: makeId(),
      fromUserId: from,
      toUserId: to,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    state.friendRequests.push(request);

    return commit(
      state,
      "FRIEND_REQUEST_SENT",
      request
    );
  }

  function getFriendRequests(userId, options = {}) {
    const id = normalizeId(userId);

    if (!id) return [];

    const direction = VALID_DIRECTIONS.has(
      options.direction
    )
      ? options.direction
      : "all";

    const status = options.status === undefined
      ? "pending"
      : options.status;

    if (
      status !== "all" &&
      !VALID_STATUSES.has(status)
    ) {
      return [];
    }

    const loaded = readState();

    if (!loaded.ok) return [];

    return loaded.state.friendRequests
      .filter(request => {
        const belongs =
          direction === "incoming"
            ? request.toUserId === id
            : direction === "outgoing"
              ? request.fromUserId === id
              : (
                  request.fromUserId === id ||
                  request.toUserId === id
                );

        return (
          belongs &&
          (
            status === "all" ||
            request.status === status
          )
        );
      })
      .map(clone);
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

    const loaded = readState();

    if (!loaded.ok) {
      return failure(loaded.code);
    }

    const state = loaded.state;

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

    if (nextStatus === "accepted") {
      if (
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
          id: makeId(),
          userAId: ids[0],
          userBId: ids[1],
          createdAt: new Date().toISOString()
        });
      }
    }

    request.status = nextStatus;
    request.updatedAt = new Date().toISOString();

    return commit(
      state,
      "FRIEND_REQUEST_" + nextStatus.toUpperCase(),
      request
    );
  }

  function acceptFriendRequest(requestId, currentUserId) {
    return updateRequest(
      requestId,
      currentUserId,
      "accepted",
      "toUserId"
    );
  }

  function rejectFriendRequest(requestId, currentUserId) {
    return updateRequest(
      requestId,
      currentUserId,
      "rejected",
      "toUserId"
    );
  }

  function cancelFriendRequest(requestId, currentUserId) {
    return updateRequest(
      requestId,
      currentUserId,
      "cancelled",
      "fromUserId"
    );
  }

  /* =======================================================
     FOLLOW SYSTEM
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

    const loaded = readState();

    if (!loaded.ok) {
      return failure(loaded.code);
    }

    const state = loaded.state;

    const alreadyFollowing = state.follows.some(
      item =>
        item.followerId === follower &&
        item.followingId === following
    );

    if (alreadyFollowing) {
      return failure("ALREADY_FOLLOWING");
    }

    const relation = {
      id: makeId(),
      followerId: follower,
      followingId: following,
      createdAt: new Date().toISOString()
    };

    state.follows.push(relation);

    return commit(
      state,
      "USER_FOLLOWED",
      relation
    );
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

    const loaded = readState();

    if (!loaded.ok) {
      return failure(loaded.code);
    }

    const state = loaded.state;

    const index = state.follows.findIndex(
      item =>
        item.followerId === follower &&
        item.followingId === following
    );

    if (index < 0) {
      return failure("NOT_FOLLOWING");
    }

    const removed = state.follows.splice(index, 1)[0];

    return commit(
      state,
      "USER_UNFOLLOWED",
      removed
    );
  }

  function getFollowing(userId) {
    const id = normalizeId(userId);

    if (!id) return [];

    const loaded = readState();

    if (!loaded.ok) return [];

    return loaded.state.follows
      .filter(item => item.followerId === id)
      .map(item => ({
        userId: item.followingId,
        createdAt: item.createdAt
      }));
  }

  function getFollowers(userId) {
    const id = normalizeId(userId);

    if (!id) return [];

    const loaded = readState();

    if (!loaded.ok) return [];

    return loaded.state.follows
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

    if (
      !first ||
      !second ||
      first === second
    ) {
      return [];
    }

    const firstFriends = new Set(
      getFriends(first).map(item => item.userId)
    );

    return getFriends(second).filter(
      item => firstFriends.has(item.userId)
    );
  }

  /* =======================================================
     COUNTS
  ======================================================= */

  function getCounts(userId) {
    const id = normalizeId(userId);

    const emptyCounts = {
      friends: 0,
      followers: 0,
      following: 0,
      incomingRequests: 0,
      outgoingRequests: 0
    };

    if (!id) return emptyCounts;

    const loaded = readState();

    if (!loaded.ok) return emptyCounts;

    const state = loaded.state;

    return {
      friends: state.friendships.filter(
        item =>
          item.userAId === id ||
          item.userBId === id
      ).length,

      followers: state.follows.filter(
        item => item.followingId === id
      ).length,

      following: state.follows.filter(
        item => item.followerId === id
      ).length,

      incomingRequests: state.friendRequests.filter(
        item =>
          item.toUserId === id &&
          item.status === "pending"
      ).length,

      outgoingRequests: state.friendRequests.filter(
        item =>
          item.fromUserId === id &&
          item.status === "pending"
      ).length
    };
  }

  /* =======================================================
     CROSS-TAB CHANGE NOTIFICATION
  ======================================================= */

  global.addEventListener?.("storage", event => {
    if (event?.key !== STORAGE_KEY) return;

    try {
      global.dispatchEvent(
        new CustomEvent("ksk:social-change", {
          detail: {
            type: "STORAGE_SYNC"
          }
        })
      );
    } catch (error) {
      // Ignore unsupported event environments.
    }
  });

  /* =======================================================
     PUBLIC SOCIAL API
  ======================================================= */

  global.KSKSocialData = Object.freeze({
    STORAGE_KEY,

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
    getCounts
  });

})(window);


/*
 * =========================================================
 * KSK — FRIENDS PAGE MODULE
 * Existing legacy Friends functionality preserved.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKFriendsPage) return;

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const MODAL = () => global.KSKModal || null;
  const TOAST = () => global.KSKToast || null;
  const UTILS = () => global.KSKUtils || null;

  function escapeHTML(value) {
    if (typeof UTILS()?.escapeHTML === "function") {
      return UTILS().escapeHTML(value);
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function isEnglish() {
    return LANG()?.getLanguage?.() === "en";
  }

  function translate(key, fallback = "") {
    return LANG()?.translate?.(key) || fallback || key;
  }

  function showToast(message, type = "info") {
    const toast = TOAST();

    if (typeof toast?.[type] === "function") {
      toast[type](message);
      return;
    }

    toast?.show?.(message, type);
  }

  /* =======================================================
     RENDER EXISTING FRIENDS
  ======================================================= */

  function render(options = {}) {
    const data = DATA();
    const userCard = global.KSKUserCard;

    const friends = Array.isArray(options.friends)
      ? options.friends
      : data?.getFriends?.() || [];

    const english = typeof options.isEnglish === "boolean"
      ? options.isEnglish
      : isEnglish();

    const friendList = friends.length
      ? friends.map(friend => {
          if (typeof userCard?.render === "function") {
            return userCard.render(friend);
          }

          return `
            <article class="card friend-card">
              <strong>
                ${escapeHTML(friend.name || "साथी")}
              </strong>
            </article>
          `;
        }).join("")
      : `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>

          <h3 class="empty-state-title">
            ${english
              ? "No friends added yet"
              : "अहिलेसम्म साथी थपिएको छैन"}
          </h3>

          <p>
            ${english
              ? "Add a friend by entering their name."
              : "नाम लेखेर साथी थप्न सक्नुहुन्छ।"}
          </p>
        </div>
      `;

    return `
      <section class="page-section">

        <div class="flex-between">

          <h3 class="section-title">
            ${english ? "My Friends" : "मेरा साथीहरू"}
          </h3>

          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-add-friend-open>

            +
            ${english ? "Add Friend" : "साथी थप्नुहोस्"}

          </button>

        </div>

        <div class="friends-list">
          ${friendList}
        </div>

      </section>
    `;
  }

  /* =======================================================
     OPEN EXISTING ADD FRIEND MODAL
  ======================================================= */

  function openAddFriend() {
    const modalAPI = MODAL();

    if (typeof modalAPI?.openModal !== "function") {
      showToast(
        isEnglish()
          ? "Friend form is unavailable. Please reload the app."
          : "साथी थप्ने फारम उपलब्ध छैन। कृपया एप पुनः खोल्नुहोस्।",
        "error"
      );

      return false;
    }

    const english = isEnglish();

    const modal = modalAPI.openModal({
      title: english
        ? "Add Friend"
        : "साथी थप्नुहोस्",

      content: `
        <form id="kskAddFriendForm">

          <label
            class="form-label"
            for="kskFriendName">

            ${english
              ? "Friend's name"
              : "साथीको नाम"}

          </label>

          <input
            id="kskFriendName"
            class="form-input"
            maxlength="60"
            placeholder="${english
              ? "Enter friend's name"
              : "साथीको नाम लेख्नुहोस्"}"
            autocomplete="name"
            required>

        </form>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${translate("cancel", "रद्द")}
        </button>

        <button
          class="btn btn-primary"
          type="submit"
          form="kskAddFriendForm">
          ${translate("addFriend", "साथी थप्नुहोस्")}
        </button>
      `
    });

    if (!modal?.element) {
      return false;
    }

    const input = modal.element.querySelector(
      "#kskFriendName"
    );

    const form = modal.element.querySelector(
      "#kskAddFriendForm"
    );

    input?.focus();

    form?.addEventListener("submit", event => {
      event.preventDefault();

      const name = String(input?.value || "").trim();

      if (!name) {
        input?.focus();
        return;
      }

      const data = DATA();

      if (typeof data?.addFriend !== "function") {
        showToast(
          english
            ? "Friend service is unavailable."
            : "साथी थप्ने सेवा उपलब्ध छैन।",
          "error"
        );

        return;
      }

      const friend = data.addFriend({ name });

      if (!friend) {
        showToast(
          english
            ? "Friend already exists or could not be added."
            : "यो साथी पहिल्यै छ वा थप्न सकिएन।",
          "warning"
        );

        input?.focus();
        return;
      }

      modalAPI.closeModal?.();

      showToast(
        english
          ? "Friend added."
          : "साथी थपियो।",
        "success"
      );
    });

    return true;
  }

  /* =======================================================
     PUBLIC FRIENDS PAGE API
  ======================================================= */

  global.KSKFriendsPage = Object.freeze({
    render,
    openAddFriend
  });

})(window);
