
"use strict";

/*
 * MERO SANSAR — REAL FRIENDS PAGE
 * Version: 2.0.0
 */

(function (global) {
  "use strict";

  if (global.KSKFriendsPage) return;

  const API = () => global.KSKSupabaseFriends;
  const LANG = () => global.KSKLanguage;
  const TOAST = () => global.KSKToast;

  let searchVersion = 0;
  let dashboardVersion = 0;

  function english() {
    return LANG()?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return english() ? en : ne;
  }

  function esc(value) {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[c]);
  }

  function toast(message, type = "info") {
    const api = TOAST();

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function refresh() {
    global.KSKNavigation?.refreshCurrentPage?.();
  }

  function avatar(person) {
    if (person?.avatarUrl) {
      return `<img src="${esc(person.avatarUrl)}" alt="" loading="lazy">`;
    }

    const initial = String(person?.name || "?").trim().charAt(0).toUpperCase();

    return `<span>${esc(initial || "?")}</span>`;
  }

  function button(action, id, label, kind = "secondary") {
    return `
      <button
        type="button"
        class="ksf-btn ksf-${kind}"
        data-friends-action="${esc(action)}"
        data-user-id="${esc(id || "")}"
      >${label}</button>
    `;
  }

  function person(personData, subtitle, actions = "") {
    const p = personData || {};
    const id = p.id || p.userId || "";

    return `
      <article class="ksf-person">
        <div class="ksf-avatar">${avatar(p)}</div>
        <div class="ksf-person-info">
          <strong>${esc(p.name || "प्रोफाइल उपलब्ध छैन")}</strong>
          <small>${esc(subtitle || "")}</small>
        </div>
        <div class="ksf-person-actions">${actions}</div>
      </article>
    `;
  }

  function empty(message, icon = "👥") {
    return `
      <div class="ksf-empty">
        <span>${icon}</span>
        <p>${esc(message)}</p>
      </div>
    `;
  }

  function section(title, icon, count, content, open = false) {
    return `
      <details class="ksf-section" ${open ? "open" : ""}>
        <summary>
          <span class="ksf-section-icon">${icon}</span>
          <strong>${title}</strong>
          <span class="ksf-count">${Number(count || 0)}</span>
        </summary>
        <div class="ksf-section-content">${content}</div>
      </details>
    `;
  }

  function styles() {
    if (document.getElementById("ksf-real-style")) return;

    const style = document.createElement("style");
    style.id = "ksf-real-style";

    style.textContent = `
      .ksf-page {
        width:100%;
        padding:4px 0 30px;
        color:var(--color-text,inherit);
      }
      .ksf-page * { box-sizing:border-box; }
      .ksf-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin:0 0 14px;
      }
      .ksf-heading h2 {
        margin:0;
        font-size:21px;
        font-weight:850;
      }
      .ksf-heading p {
        margin:5px 0 0;
        color:var(--color-muted,#888);
        font-size:12px;
      }
      .ksf-card {
        margin:12px 0;
        padding:15px;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:16px;
        background:var(--color-surface,#fff);
      }
      .ksf-search-box {
        display:flex;
        gap:8px;
        margin:14px 0;
      }
      .ksf-search-box input {
        width:100%;
        min-width:0;
        min-height:44px;
        padding:10px 13px;
        border:1px solid var(--color-border,#ddd);
        border-radius:11px;
        background:var(--color-surface-secondary,#f7f7f7);
        color:var(--color-text,inherit);
        font:inherit;
        font-size:13px;
      }
      .ksf-btn {
        min-height:34px;
        padding:7px 10px;
        border:1px solid var(--color-border,rgba(128,128,128,.25));
        border-radius:9px;
        background:var(--color-surface-secondary,#f4f4f4);
        color:var(--color-text,inherit);
        font:inherit;
        font-size:11px;
        font-weight:750;
        cursor:pointer;
      }
      .ksf-btn:disabled { opacity:.5; }
      .ksf-primary {
        color:white;
        background:var(--color-primary,#2563eb);
        border-color:transparent;
      }
      .ksf-danger {
        color:#c43d3d;
        background:rgba(210,60,60,.07);
        border-color:rgba(210,60,60,.2);
      }
      .ksf-search-button { flex:none; min-width:75px; }
      .ksf-results {
        margin:12px 0;
        padding:0 12px;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:14px;
        background:var(--color-surface,#fff);
      }
      .ksf-results:empty { display:none; }
      .ksf-result-heading {
        padding:12px 0 4px;
        font-size:12px;
        font-weight:800;
      }
      .ksf-person {
        display:flex;
        align-items:center;
        gap:10px;
        min-width:0;
        padding:11px 0;
        border-bottom:1px solid var(--color-border,rgba(128,128,128,.15));
      }
      .ksf-person:last-child { border-bottom:0; }
      .ksf-avatar {
        display:grid;
        place-items:center;
        width:39px;
        height:39px;
        flex:none;
        overflow:hidden;
        border-radius:50%;
        background:var(--color-surface-secondary,#eee);
        font-weight:800;
      }
      .ksf-avatar img {
        width:100%;
        height:100%;
        object-fit:cover;
      }
      .ksf-person-info {
        flex:1;
        min-width:0;
      }
      .ksf-person-info strong {
        display:block;
        overflow-wrap:anywhere;
        font-size:12px;
      }
      .ksf-person-info small {
        display:block;
        margin-top:4px;
        color:var(--color-muted,#888);
        font-size:10px;
      }
      .ksf-person-actions {
        display:flex;
        flex-wrap:wrap;
        justify-content:flex-end;
        gap:5px;
      }
      .ksf-section {
        margin:11px 0;
        overflow:hidden;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:15px;
        background:var(--color-surface,#fff);
      }
      .ksf-section summary {
        display:flex;
        align-items:center;
        gap:10px;
        min-height:56px;
        padding:11px 14px;
        cursor:pointer;
        list-style:none;
      }
      .ksf-section summary::-webkit-details-marker { display:none; }
      .ksf-section summary strong { flex:1; font-size:13px; }
      .ksf-section-icon { font-size:18px; }
      .ksf-count {
        display:grid;
        place-items:center;
        min-width:25px;
        height:24px;
        padding:0 7px;
        border-radius:20px;
        background:var(--color-surface-secondary,#eee);
        font-size:10px;
        font-weight:800;
      }
      .ksf-section-content {
        padding:0 13px 10px;
        border-top:1px solid var(--color-border,rgba(128,128,128,.15));
      }
      .ksf-empty {
        padding:17px 5px;
        text-align:center;
        color:var(--color-muted,#888);
        font-size:12px;
      }
      .ksf-empty span { font-size:22px; }
      .ksf-empty p { margin:7px 0 0; }
      .ksf-loading {
        padding:24px 10px;
        text-align:center;
        color:var(--color-muted,#888);
        font-size:12px;
      }
      .ksf-note {
        margin:12px 0;
        padding:11px;
        border-radius:11px;
        background:var(--color-surface-secondary,#f5f5f5);
        color:var(--color-muted,#777);
        font-size:11px;
        line-height:1.6;
      }
      @media(max-width:390px) {
        .ksf-person { flex-wrap:wrap; }
        .ksf-person-actions {
          width:100%;
          padding-left:49px;
          justify-content:flex-start;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function render() {
    styles();

    const uid = API()?.getCurrentUserId?.() || "";

    const html = `
      <section class="page-section ksf-page" id="ksfFriendsRoot">
        <header class="ksf-heading">
          <div>
            <h2>${t("साथीहरू", "Friends")}</h2>
            <p>${t("साथी खोज्नुहोस् र सम्बन्ध व्यवस्थापन गर्नुहोस्।", "Find people and manage your connections.")}</p>
          </div>
        </header>

        <section class="ksf-card">
          <strong>${t("नयाँ साथी खोज्नुहोस्", "Find people")}</strong>
          <div class="ksf-search-box">
            <input
              id="ksfUserSearch"
              type="search"
              maxlength="60"
              autocomplete="off"
              placeholder="${t("नाम वा थर लेख्नुहोस्...", "Search by name...")}"
              aria-label="${t("प्रयोगकर्ता खोज्नुहोस्", "Search users")}"
            >
            <button class="ksf-btn ksf-primary ksf-search-button"
              type="button" data-friends-search>
              ${t("खोज्नुहोस्", "Search")}
            </button>
          </div>
          <div id="ksfSearchResults" class="ksf-results" aria-live="polite"></div>
          <p class="ksf-note">
            ${t("खोजीमा सार्वजनिक प्रोफाइलको नाम मात्र देखिन्छ। Request स्वीकार भएपछि मात्र साथी सूचीमा जोडिन्छ।", "Search shows public profile names only. A person becomes your friend after accepting your request.")}
          </p>
        </section>

        <div id="ksfDashboard">
          <div class="ksf-loading">${t("साथीहरूको विवरण लोड हुँदैछ...", "Loading your connections...")}</div>
        </div>
      </section>
    `;

    Promise.resolve().then(loadDashboard);

    return html;
  }

  async function loadDashboard() {
    const root = document.getElementById("ksfDashboard");
    if (!root) return;

    const version = ++dashboardVersion;
    root.innerHTML = `<div class="ksf-loading">${t("लोड हुँदैछ...", "Loading...")}</div>`;

    const api = API();

    if (!api) {
      root.innerHTML = empty(t("Friends सेवा उपलब्ध छैन।", "Friends service is unavailable."));
      return;
    }

    const response = await api.getDashboard();

    if (version !== dashboardVersion) return;
    if (!document.getElementById("ksfDashboard")) return;

    if (!response.ok) {
      root.innerHTML = empty(response.message || t("डाटा लोड हुन सकेन।", "Could not load data."));
      return;
    }

    const d = response.data;

    const incoming = d.incoming.length
      ? d.incoming.map(x => person(
          x.person,
          t("तपाईंलाई साथी बन्न अनुरोध गर्नुभयो", "Sent you a friend request"),
          button("accept", x.id, t("स्वीकार", "Accept"), "primary") +
          button("reject", x.id, t("अस्वीकार", "Decline"), "danger")
        )).join("")
      : empty(t("नयाँ Request छैन।", "No incoming requests."), "📩");

    const outgoing = d.outgoing.length
      ? d.outgoing.map(x => person(
          x.person,
          t("स्वीकृतिको प्रतीक्षामा", "Waiting for acceptance"),
          button("cancel", x.id, t("रद्द", "Cancel"), "danger")
        )).join("")
      : empty(t("तपाईंले Request पठाउनुभएको छैन।", "No outgoing requests."), "📤");

    const friends = d.friends.length
      ? d.friends.map(p => person(
          p,
          t("तपाईंको साथी", "Your friend"),
          button("unfriend", p.id, t("साथी हटाउनुहोस्", "Unfriend"), "danger") +
          button("block", p.id, "Block", "danger")
        )).join("")
      : empty(t("अहिलेसम्म साथी छैनन्। नामबाट खोजेर Request पठाउनुहोस्।", "No friends yet. Search for people and send a request."));

    const followers = d.followers.length
      ? d.followers.map(p => person(
          p,
          t("तपाईंलाई Follow गर्नुहुन्छ", "Follows you")
        )).join("")
      : empty(t("अहिलेसम्म Followers छैनन्।", "No followers yet."), "🌱");

    const following = d.following.length
      ? d.following.map(p => person(
          p,
          t("तपाईंले Follow गर्नुभएको छ", "You follow this person"),
          button("unfollow", p.id, "Unfollow", "danger") +
          button("block", p.id, "Block", "danger")
        )).join("")
      : empty(t("तपाईंले कसैलाई Follow गर्नुभएको छैन।", "You are not following anyone."), "↗️");

    const blocked = d.blocked.length
      ? d.blocked.map(p => person(
          p,
          t("Block गरिएको प्रयोगकर्ता", "Blocked user"),
          button("unblock", p.id, "Unblock", "primary")
        )).join("")
      : empty(t("Block गरिएको प्रयोगकर्ता छैन।", "No blocked users."), "🛡️");

    root.innerHTML = `
      ${section(t("आएका Friend Request", "Incoming requests"), "📩", d.incoming.length, incoming, d.incoming.length > 0)}
      ${section(t("पठाएका Request", "Sent requests"), "📤", d.outgoing.length, outgoing)}
      ${section(t("तपाईंका साथीहरू", "Your friends"), "👥", d.friends.length, friends, true)}
      ${section("Followers", "↙️", d.followers.length, followers)}
      ${section("Following", "↗️", d.following.length, following)}
      ${section(t("Block सूची", "Blocked users"), "🛡️", d.blocked.length, blocked)}
    `;
  }

  async function searchUsers() {
    const input = document.getElementById("ksfUserSearch");
    const box = document.getElementById("ksfSearchResults");
    const term = input?.value?.trim() || "";

    if (!box) return;

    if (term.length < 2) {
      box.innerHTML = empty(t("कम्तीमा २ अक्षर लेख्नुहोस्।", "Enter at least 2 characters."), "🔎");
      return;
    }

    const version = ++searchVersion;
    box.innerHTML = `<div class="ksf-loading">${t("खोज्दैछ...", "Searching...")}</div>`;

    const response = await API().searchUsers(term);

    if (version !== searchVersion) return;

    if (!response.ok) {
      box.innerHTML = empty(response.message || t("खोजी असफल भयो।", "Search failed."));
      return;
    }

    const users = response.data || [];

    if (!users.length) {
      box.innerHTML = empty(t("मिल्दो प्रयोगकर्ता भेटिएन।", "No matching users found."), "🔎");
      return;
    }

    box.innerHTML = `
      <div class="ksf-result-heading">${t("खोजी नतिजा", "Search results")} · ${users.length}</div>
      ${users.map(p => person(
        p,
        t("Mero Sansar प्रयोगकर्ता", "Mero Sansar user"),
        button("add", p.id, t("Request पठाउनुहोस्", "Add friend"), "primary") +
        button("follow", p.id, "Follow")
      )).join("")}
    `;
  }

  async function performAction(action, id, element) {
    const api = API();
    if (!api || !id) return;

    if (element) element.disabled = true;

    let response;

    switch (action) {
      case "add":
        response = await api.sendFriendRequest(id);
        break;
      case "follow":
        response = await api.followUser(id);
        break;
      case "accept":
        response = await api.respondToFriendRequest(id, "accepted");
        break;
      case "reject":
        response = await api.respondToFriendRequest(id, "rejected");
        break;
      case "cancel":
        response = await api.cancelFriendRequest(id);
        break;
      case "unfriend":
        response = await api.removeFriend(id);
        break;
      case "unfollow":
        response = await api.unfollowUser(id);
        break;
      case "block":
        if (!global.confirm(t("यो प्रयोगकर्तालाई Block गर्ने?", "Block this user?"))) {
          if (element) element.disabled = false;
          return;
        }
        response = await api.blockUser(id);
        break;
      case "unblock":
        response = await api.unblockUser(id);
        break;
      default:
        return;
    }

    if (!response?.ok) {
      toast(response?.message || t("कार्य पूरा हुन सकेन।", "Action failed."), "error");
      if (element) element.disabled = false;
      return;
    }

    const messages = {
      add: t("Friend Request पठाइयो।", "Friend request sent."),
      follow: t("Follow गर्नुभयो।", "Following."),
      accept: t("Friend Request स्वीकार भयो।", "Request accepted."),
      reject: t("Request अस्वीकार भयो।", "Request declined."),
      cancel: t("Request रद्द भयो।", "Request cancelled."),
      unfriend: t("साथी सूचीबाट हटाइयो।", "Friend removed."),
      unfollow: t("Unfollow भयो।", "Unfollowed."),
      block: t("प्रयोगकर्ता Block भयो।", "User blocked."),
      unblock: t("Block हटाइयो।", "User unblocked.")
    };

    toast(messages[action] || t("सफल भयो।", "Done."), "success");

    await loadDashboard();

    if (action === "add" || action === "follow") {
      searchUsers();
    }
  }

  function handleClick(event) {
    const searchButton = event.target.closest("[data-friends-search]");

    if (searchButton) {
      event.preventDefault();
      searchUsers();
      return;
    }

    const button = event.target.closest("[data-friends-action]");
    if (!button) return;

    event.preventDefault();

    performAction(
      button.dataset.friendsAction,
      button.dataset.userId,
      button
    );
  }

  function handleKey(event) {
    if (
      event.target?.id === "ksfUserSearch" &&
      event.key === "Enter"
    ) {
      event.preventDefault();
      searchUsers();
    }
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKey);

  global.addEventListener("ksk:friends-cloud-change", () => {
    if (global.KSKNavigation?.getCurrentPage?.() === "friends") {
      loadDashboard();
    }
  });

  global.KSKFriendsPage = Object.freeze({
    render,
    openAddFriend: () => {
      global.KSKNavigation?.navigate?.("friends");
      setTimeout(() => document.getElementById("ksfUserSearch")?.focus(), 100);
      return true;
    }
  });

})(window);
