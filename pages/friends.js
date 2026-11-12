
"use strict";

/* =========================================================
   KSK SOCIAL DATA
   LocalStorage adapter — no backend / no server sync.
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSocialData) return;

  const STORAGE_KEY = "ksk_social_state_v1";
  const VERSION = 1;

  const emptyState = () => ({
    version: VERSION,
    localUserId: "",
    friendRequests: [],
    friendships: [],
    follows: []
  });

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

    if (!id || id.length > 128 ||
        /[\u0000-\u001f\u007f]/.test(id)) {
      return "";
    }

    return id;
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

      return { ok: true, state };
    } catch (error) {
      return { ok: false, code: "STORAGE_UNAVAILABLE" };
    }
  }

  function failure(code) {
    return { ok: false, code, data: null };
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
        data: data === undefined
          ? null
          : JSON.parse(JSON.stringify(data))
      };
    } catch (error) {
      return failure("STORAGE_UNAVAILABLE");
    }
  }

  function getLocalUserId() {
    const result = readState();
    if (!result.ok) return "";

    const state = result.state;

    if (state.localUserId) return state.localUserId;

    state.localUserId = makeId("local-user");

    return saveState(
      state,
      "LOCAL_USER_ID_CREATED",
      { userId: state.localUserId }
    ).ok ? state.localUserId : "";
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

  function getFriends(userId) {
    const id = normalizeId(userId);
    if (!id) return [];

    const result = readState();
    if (!result.ok) return [];

    return result.state.friendships
      .filter(item => item.userAId === id || item.userBId === id)
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

    if (!user || !friend) return failure("INVALID_USER_ID");
    if (user === friend) return failure("SELF_RELATION_NOT_ALLOWED");

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;
    const index = state.friendships.findIndex(item =>
      pairKey(item.userAId, item.userBId) === pairKey(user, friend)
    );

    if (index < 0) return failure("FRIENDSHIP_NOT_FOUND");

    const removed = state.friendships.splice(index, 1)[0];
    return saveState(state, "FRIEND_REMOVED", removed);
  }

  function sendFriendRequest(fromUserId, toUserId) {
    const from = normalizeId(fromUserId);
    const to = normalizeId(toUserId);

    if (!from || !to) return failure("INVALID_USER_ID");
    if (from === to) return failure("SELF_REQUEST_NOT_ALLOWED");

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

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

    const request = {
      id: makeId("request"),
      fromUserId: from,
      toUserId: to,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.friendRequests.push(request);

    return saveState(state, "FRIEND_REQUEST_SENT", request);
  }

  function getFriendRequests(userId, options = {}) {
    const id = normalizeId(userId);
    if (!id) return [];

    const result = readState();
    if (!result.ok) return [];

    const direction = ["all", "incoming", "outgoing"].includes(
      options.direction
    ) ? options.direction : "all";

    const status = options.status === undefined
      ? "pending"
      : options.status;

    if (
      status !== "all" &&
      !["pending", "accepted", "rejected", "cancelled"].includes(status)
    ) return [];

    return result.state.friendRequests
      .filter(item => {
        const belongs = direction === "incoming"
          ? item.toUserId === id
          : direction === "outgoing"
            ? item.fromUserId === id
            : item.fromUserId === id || item.toUserId === id;

        return belongs && (status === "all" || item.status === status);
      })
      .map(item => ({ ...item }));
  }

  function updateRequest(requestId, currentUserId, nextStatus, ownerField) {
    const rid = normalizeId(requestId);
    const actor = normalizeId(currentUserId);

    if (!rid || !actor) return failure("INVALID_ARGUMENT");

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;
    const request = state.friendRequests.find(item => item.id === rid);

    if (!request) return failure("REQUEST_NOT_FOUND");
    if (request[ownerField] !== actor) {
      return failure("NOT_AUTHORIZED_FOR_REQUEST");
    }
    if (request.status !== "pending") {
      return failure("REQUEST_NOT_PENDING");
    }

    if (nextStatus === "accepted" &&
        !findFriendship(state, request.fromUserId, request.toUserId)) {
      const ids = [request.fromUserId, request.toUserId].sort();

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

    if (!follower || !following) return failure("INVALID_USER_ID");
    if (follower === following) return failure("SELF_FOLLOW_NOT_ALLOWED");

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;

    if (state.follows.some(item =>
      item.followerId === follower &&
      item.followingId === following
    )) return failure("ALREADY_FOLLOWING");

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

    if (!follower || !following) return failure("INVALID_USER_ID");
    if (follower === following) return failure("SELF_RELATION_NOT_ALLOWED");

    const result = readState();
    if (!result.ok) return failure(result.code);

    const state = result.state;
    const index = state.follows.findIndex(item =>
      item.followerId === follower &&
      item.followingId === following
    );

    if (index < 0) return failure("NOT_FOLLOWING");

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

    if (!first || !second || first === second) return [];

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
      outgoingRequests: 0
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
        item.toUserId === id && item.status === "pending"
      ).length,

      outgoingRequests: state.friendRequests.filter(item =>
        item.fromUserId === id && item.status === "pending"
      ).length
    };
  }

  global.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;

    global.dispatchEvent(new CustomEvent("ksk:social-change", {
      detail: { type: "STORAGE_SYNC" }
    }));
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
    getCounts
  });

})(window);


/* =========================================================
   KSK FRIENDS PAGE
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
          following: 0,
          incomingRequests: 0,
          outgoingRequests: 0
        };

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
        <section class="card" style="margin-top:16px;padding:16px">
          <h3>${english
            ? "Previously saved friends"
            : "पहिले सुरक्षित गरिएका साथीहरू"}</h3>
          <p class="text-muted" style="font-size:13px">
            ${english
              ? "Old local entries — not verified connections."
              : "पुराना स्थानीय रेकर्ड — प्रमाणित साथी सम्बन्ध होइनन्।"}
          </p>
          <div class="friends-list">
            ${oldFriends.map(friend => `
              <article class="friend-card">
                <strong>${escapeHTML(friend.name || "Friend")}</strong>
              </article>
            `).join("")}
          </div>
        </section>
      `
      : "";

    return `
      <section class="page-section ksk-social-page">

        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:14px;
        ">
          <h3 class="section-title" style="margin:0">
            ${english ? "Friends & Social" : "साथी तथा सामाजिक सम्बन्ध"}
          </h3>

          <button
            type="button"
            class="btn btn-primary"
            data-add-friend-open
            ${userId ? "" : "disabled"}
          >
            <span aria-hidden="true">＋</span>
            ${english ? "Add Friend" : "साथी थप्नुहोस्"}
          </button>
        </div>

        <div class="card" style="
          padding:18px;
          margin:14px 0;
          border-radius:16px;
        ">
          <div style="font-size:13px;color:var(--text-muted)">
            ${english ? "Your local profile ID" : "तपाईंको स्थानीय Profile ID"}
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
            ">${escapeHTML(userId || "ID unavailable")}</code>

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
              ? "This ID is stored only in this browser. It is not a login account and cannot receive requests from other devices yet."
              : "यो ID यही ब्राउजरमा मात्र सुरक्षित हुन्छ। यो Login Account होइन र अहिले अर्को मोबाइलबाट Request प्राप्त गर्न सक्दैन।"}
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
                ${item.value}
              </strong>
              <span style="font-size:12px;color:var(--text-muted)">
                ${item.label}
              </span>
            </div>
          `).join("")}
        </div>

        <div class="card" style="
          padding:18px;
          margin-top:14px;
          text-align:center;
        ">
          <div style="font-size:30px" aria-hidden="true">👥</div>
          <h3 style="margin:10px 0 6px">
            ${english ? "Friend connections" : "साथी सम्बन्ध"}
          </h3>
          <p style="
            margin:0;
            font-size:13px;
            line-height:1.6;
            color:var(--text-muted);
          ">
            ${english
              ? "Friend requests and follow actions between different users require secure account and server setup."
              : "फरक प्रयोगकर्ताबीच Friend Request र Follow चलाउन सुरक्षित Account तथा Server जोड्नुपर्छ।"}
          </p>
          <p style="
            margin:12px 0 0;
            font-size:12px;
            color:var(--text-muted);
          ">
            ${english
              ? "No sample users or fake connections are displayed."
              : "यहाँ कुनै Demo User वा नक्कली सम्बन्ध देखाइएको छैन।"}
          </p>
        </div>

        ${oldFriendsHTML}

      </section>
    `;
  }

  async function copyLocalId() {
    const id = SOCIAL()?.getLocalUserId?.();

    if (!id) {
      toast(
        isEnglish() ? "Local ID is unavailable." : "स्थानीय ID उपलब्ध छैन।",
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
        ? (isEnglish() ? "Local ID copied." : "स्थानीय ID कपी भयो।")
        : (isEnglish() ? "Could not copy ID." : "ID कपी गर्न सकिएन।"),
      copied ? "success" : "error"
    );

    return copied;
  }

  function openAddFriend() {
    const english = isEnglish();
    const modal = MODAL();
    const id = SOCIAL()?.getLocalUserId?.() || "";

    if (typeof modal?.openModal !== "function") {
      toast(
        english
          ? "Social information is unavailable."
          : "सामाजिक जानकारी उपलब्ध छैन।",
        "error"
      );
      return false;
    }

    return modal.openModal({
      title: english ? "Add Friend" : "साथी थप्नुहोस्",

      content: `
        <div style="padding:4px 0">
          <p style="line-height:1.6">
            ${english
              ? "Your local profile ID is ready. Copy it to keep it available. Sending a request to another person will be enabled after secure server authentication is connected."
              : "तपाईंको स्थानीय Profile ID तयार छ। यसलाई सुरक्षित राख्न Copy गर्नुहोस्। अर्को व्यक्तिलाई वास्तविक Request पठाउने सुविधा सुरक्षित Server Authentication जोडेपछि सक्रिय हुन्छ।"}
          </p>

          <label style="
            display:block;
            margin:14px 0 7px;
            font-weight:600;
          ">
            ${english ? "Your Local ID" : "तपाईंको Local ID"}
          </label>

          <code style="
            display:block;
            padding:12px;
            border-radius:10px;
            overflow-wrap:anywhere;
            background:var(--surface-2,rgba(127,127,127,.12));
          ">${escapeHTML(id || "Unavailable")}</code>

          <p style="
            margin-top:12px;
            font-size:12px;
            color:var(--text-muted);
          ">
            ${english
              ? "LocalStorage does not deliver requests to another device."
              : "LocalStorage ले अर्को मोबाइलमा Friend Request पुर्‍याउँदैन।"}
          </p>
        </div>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${english ? "Close" : "बन्द गर्नुहोस्"}
        </button>

        <button
          class="btn btn-primary"
          type="button"
          data-copy-social-id>
          ${english ? "Copy ID" : "ID कपी"}
        </button>
      `
    });
  }

  function handleClick(event) {
    const target = event.target;
    if (!target?.closest) return;

    if (target.closest("[data-copy-social-id]")) {
      event.preventDefault();
      copyLocalId();
    }
  }

  global.document?.addEventListener("click", handleClick);

  global.KSKFriendsPage = Object.freeze({
    render,
    openAddFriend,
    copyLocalId
  });

})(window);
