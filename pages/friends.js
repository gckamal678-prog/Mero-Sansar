"use strict";

/*
 * MERO SANSAR — FRIENDS & CONNECTIONS
 * Version: 4.0.0
 */

(function (global) {
  "use strict";

  if (global.KSKFriendsPage) return;

  const API = () => global.KSKSupabaseFriends;
  const LANG = () => global.KSKLanguage;
  const TOAST = () => global.KSKToast;

  let searchVersion = 0;
  let dashboardVersion = 0;
  let suggestionVersion = 0;
  let lastSearchTerm = "";
  let activeMenuId = null;

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

  function avatar(person) {
    if (person?.avatarUrl) {
      return `<img src="${esc(person.avatarUrl)}" alt="" loading="lazy">`;
    }

    const initial = String(person?.name || "?")
      .trim()
      .charAt(0)
      .toUpperCase();

    return `<span>${esc(initial || "?")}</span>`;
  }

  function button(action, id, label, kind = "secondary", disabled = false) {
    return `
      <button
        type="button"
        class="ksf-btn ksf-${kind}"
        data-friends-action="${esc(action)}"
        data-user-id="${esc(id || "")}"
        ${disabled ? "disabled" : ""}
      >${label}</button>
    `;
  }

  function person(personData, subtitle, actions = "") {
    const p = personData || {};

    return `
      <article class="ksf-person">
        <button
          type="button"
          class="ksf-avatar ksf-avatar-button"
          data-friends-action="profile"
          data-user-id="${esc(p.id || "")}"
          aria-label="${esc(t("प्रोफाइल खोल्नुहोस्", "Open profile"))}"
        >${avatar(p)}</button>

        <div class="ksf-person-info">
          <strong>${esc(p.name || t("प्रोफाइल उपलब्ध छैन", "Profile unavailable"))}</strong>
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
          <span class="ksf-chevron" aria-hidden="true">⌄</span>
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
        min-height:35px;
        padding:7px 11px;
        border:1px solid var(--color-border,rgba(128,128,128,.25));
        border-radius:9px;
        background:var(--color-surface-secondary,#f4f4f4);
        color:var(--color-text,inherit);
        font:inherit;
        font-size:11px;
        font-weight:750;
        cursor:pointer;
      }

      .ksf-btn:disabled {
        opacity:.55;
        cursor:not-allowed;
      }

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

      .ksf-search-button {
        flex:none;
        min-width:75px;
      }

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
        width:41px;
        height:41px;
        flex:none;
        overflow:hidden;
        border-radius:50%;
        background:var(--color-surface-secondary,#eee);
        font-weight:800;
      }

      .ksf-avatar-button {
        padding:0;
        border:0;
        color:inherit;
        cursor:pointer;
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
        align-items:center;
        flex-wrap:wrap;
        justify-content:flex-end;
        gap:5px;
      }

      .ksf-section {
        margin:11px 0;
        overflow:visible;
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

      .ksf-section summary::-webkit-details-marker {
        display:none;
      }

      .ksf-section summary strong {
        flex:1;
        font-size:13px;
      }

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

      .ksf-chevron {
        color:var(--color-muted,#888);
        transition:transform .2s ease;
      }

      .ksf-section[open] .ksf-chevron {
        transform:rotate(180deg);
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

      .ksf-suggestions {
        margin-top:14px;
      }

      .ksf-suggestion-title {
        margin:0 0 5px;
        font-size:12px;
        font-weight:800;
      }

      .ksf-more-wrap {
        position:relative;
        flex:none;
      }

      .ksf-more-trigger {
        display:grid;
        place-items:center;
        width:34px;
        height:34px;
        padding:0;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:50%;
        background:transparent;
        color:inherit;
        font-size:19px;
        cursor:pointer;
      }

      .ksf-menu {
        position:absolute;
        z-index:50;
        top:39px;
        right:0;
        display:none;
        min-width:165px;
        padding:5px;
        border:1px solid var(--color-border,rgba(128,128,128,.25));
        border-radius:12px;
        background:var(--color-surface,#fff);
        box-shadow:0 8px 28px rgba(0,0,0,.15);
      }

      .ksf-menu.open { display:block; }

      .ksf-menu button {
        display:block;
        width:100%;
        padding:10px;
        border:0;
        border-radius:8px;
        background:transparent;
        color:var(--color-text,inherit);
        text-align:left;
        font:inherit;
        font-size:12px;
        cursor:pointer;
      }

      .ksf-menu button:hover {
        background:var(--color-surface-secondary,#eee);
      }

      .ksf-menu button.danger { color:#c43d3d; }

      @media(max-width:390px) {
        .ksf-person { gap:8px; }
        .ksf-person-actions { gap:4px; }
        .ksf-person-actions .ksf-btn {
          padding:6px 8px;
          font-size:10px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function render() {
    styles();

    /*
     * Navigation ले HTML DOM मा राखेपछि Dashboard स्वतः सुरु हुन्छ।
     * छोटो delay ले render-before-mount race रोक्छ।
     */
    global.setTimeout(() => {
      if (document.getElementById("ksfDashboard")) {
        loadDashboard();
        loadSuggestions();
      }
    }, 0);

    return `
      <section class="page-section ksf-page" id="ksfFriendsRoot">

        <header class="ksf-heading">
          <div>
            <h2>${t("साथीहरू", "Friends")}</h2>
            <p>${t(
              "साथी खोज्नुहोस् र आफ्नो सामाजिक सम्बन्ध व्यवस्थापन गर्नुहोस्।",
              "Find people and manage your social connections."
            )}</p>
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

            <button
              class="ksf-btn ksf-primary ksf-search-button"
              type="button"
              data-friends-search
            >${t("खोज्नुहोस्", "Search")}</button>
          </div>

          <div
            id="ksfSearchResults"
            class="ksf-results"
            aria-live="polite"
          ></div>

          <div id="ksfSuggestions" class="ksf-suggestions">
            <div class="ksf-loading">
              ${t("सुझाव लोड हुँदैछ...", "Loading suggestions...")}
            </div>
          </div>

          <p class="ksf-note">
            ${t(
              "साथी बनेपछि Direct Message गर्न सकिन्छ।",
              "Direct messaging is available after becoming friends."
            )}
          </p>
        </section>

        <div id="ksfDashboard">
          <div class="ksf-loading">
            ${t("साथीहरूको विवरण लोड हुँदैछ...", "Loading your connections...")}
          </div>
        </div>

      </section>
    `;
  }

  function menuActions(id, includeBlock = true) {
    return `
      <div class="ksf-more-wrap">
        <button
          type="button"
          class="ksf-more-trigger"
          data-friends-menu="${esc(id)}"
          aria-label="${esc(t("थप विकल्प", "More options"))}"
          aria-expanded="false"
        >⋯</button>

        <div class="ksf-menu" data-friends-menu-panel="${esc(id)}">
          <button
            type="button"
            data-friends-action="unfriend"
            data-user-id="${esc(id)}"
            class="danger"
          >${t("साथी हटाउनुहोस्", "Remove friend")}</button>

          ${
            includeBlock
              ? `
                <button
                  type="button"
                  data-friends-action="block"
                  data-user-id="${esc(id)}"
                  class="danger"
                >${t("Block गर्नुहोस्", "Block user")}</button>
              `
              : ""
          }
        </div>
      </div>
    `;
  }

  function friendActions(p) {
    return `
      ${button("message", p.id, t("मेसेज", "Message"), "primary")}
      ${button("profile", p.id, t("प्रोफाइल", "Profile"))}
      ${menuActions(p.id)}
    `;
  }

  async function loadDashboard() {
    const root = document.getElementById("ksfDashboard");
    if (!root) return;

    const version = ++dashboardVersion;
    const api = API();

    root.innerHTML = `
      <div class="ksf-loading">${t("लोड हुँदैछ...", "Loading...")}</div>
    `;

    if (!api || typeof api.getDashboard !== "function") {
      root.innerHTML = empty(
        t("Friends सेवा उपलब्ध छैन।", "Friends service is unavailable.")
      );
      return;
    }

    try {
      const response = await api.getDashboard();

      if (version !== dashboardVersion) return;
      if (!document.getElementById("ksfDashboard")) return;

      if (!response?.ok) {
        root.innerHTML = empty(
          response?.message || t("डाटा लोड हुन सकेन।", "Could not load data.")
        );
        return;
      }

      const d = response.data || {};

      const incomingList = d.incoming || [];
      const outgoingList = d.outgoing || [];
      const friendsList = d.friends || [];
      const followersList = d.followers || [];
      const followingList = d.following || [];
      const blockedList = d.blocked || [];

      const incoming = incomingList.length
        ? incomingList.map(x => person(
            x.person,
            t("तपाईंलाई साथी बन्न अनुरोध गर्नुभयो", "Sent you a friend request"),
            button("accept", x.id, t("स्वीकार", "Accept"), "primary") +
            button("reject", x.id, t("अस्वीकार", "Decline"), "danger")
          )).join("")
        : empty(t("नयाँ Request छैन।", "No incoming requests."), "📩");

      const outgoing = outgoingList.length
        ? outgoingList.map(x => person(
            x.person,
            t("स्वीकृतिको प्रतीक्षामा", "Waiting for acceptance"),
            button("cancel", x.id, t("रद्द", "Cancel"), "danger")
          )).join("")
        : empty(t("तपाईंले Request पठाउनुभएको छैन।", "No outgoing requests."), "📤");

      const friends = friendsList.length
        ? friendsList.map(p => person(
            p,
            t("तपाईंको साथी", "Your friend"),
            friendActions(p)
          )).join("")
        : empty(
            t(
              "अहिलेसम्म साथी छैनन्। नामबाट खोजेर Request पठाउनुहोस्।",
              "No friends yet. Search for people and send a request."
            )
          );

      const followers = followersList.length
        ? followersList.map(p => person(
            p,
            t("तपाईंलाई Follow गर्नुहुन्छ", "Follows you"),
            button("profile", p.id, t("प्रोफाइल", "Profile"))
          )).join("")
        : empty(t("अहिलेसम्म Followers छैनन्।", "No followers yet."), "🌱");

      const following = followingList.length
        ? followingList.map(p => person(
            p,
            t("तपाईंले Follow गर्नुभएको छ", "You follow this person"),
            button("profile", p.id, t("प्रोफाइल", "Profile")) +
            button("unfollow", p.id, t("Unfollow", "Unfollow"))
          )).join("")
        : empty(
            t("तपाईंले कसैलाई Follow गर्नुभएको छैन।", "You are not following anyone."),
            "↗️"
          );

      const blocked = blockedList.length
        ? blockedList.map(p => person(
            p,
            t("Block गरिएको प्रयोगकर्ता", "Blocked user"),
            button("unblock", p.id, t("Block हटाउनुहोस्", "Unblock"), "primary")
          )).join("")
        : empty(t("Block गरिएको प्रयोगकर्ता छैन।", "No blocked users."), "🛡️");

      root.innerHTML = `
        ${section(
          t("आएका Friend Request", "Incoming requests"),
          "📩", incomingList.length, incoming, incomingList.length > 0
        )}

        ${section(
          t("पठाएका Request", "Sent requests"),
          "📤", outgoingList.length, outgoing
        )}

        ${section(
          t("तपाईंका साथीहरू", "Your friends"),
          "👥", friendsList.length, friends, true
        )}

        ${section("Followers", "↙️", followersList.length, followers)}

        ${section("Following", "↗️", followingList.length, following)}

        ${section(
          t("Block सूची", "Blocked users"),
          "🛡️", blockedList.length, blocked
        )}
      `;
    } catch (error) {
      if (version !== dashboardVersion) return;

      root.innerHTML = empty(
        error?.message || t("डाटा लोड हुन सकेन।", "Could not load data.")
      );
    }
  }

  async function loadSuggestions() {
    const box = document.getElementById("ksfSuggestions");
    if (!box) return;

    const version = ++suggestionVersion;
    const api = API();

    if (typeof api?.getSuggestedUsers !== "function") {
      box.innerHTML = "";
      return;
    }

    box.innerHTML = `
      <div class="ksf-loading">${t("सुझाव लोड हुँदैछ...", "Loading suggestions...")}</div>
    `;

    try {
      const response = await api.getSuggestedUsers(8);

      if (version !== suggestionVersion) return;
      if (!document.getElementById("ksfSuggestions")) return;

      if (!response?.ok) {
        box.innerHTML = "";
        return;
      }

      const users = response.data || [];

      if (!users.length) {
        box.innerHTML = "";
        return;
      }

      let statuses = {};

      if (typeof api.getRelationshipStatuses === "function") {
        const statusResponse = await api.getRelationshipStatuses(
          users.map(user => user.id)
        );

        if (version !== suggestionVersion) return;
        if (statusResponse?.ok) statuses = statusResponse.data || {};
      }

      box.innerHTML = `
        <div class="ksf-result-heading">
          ${t("तपाईंले चिन्न सक्ने व्यक्तिहरू", "People you may know")}
        </div>

        ${users.map(p => {
          const state = statuses[p.id] || { state: "none" };

          return person(
            p,
            relationshipSubtitle(state),
            relationshipActions(p, state)
          );
        }).join("")}
      `;
    } catch (_) {
      if (version === suggestionVersion) box.innerHTML = "";
    }
  }

  function relationshipActions(personData, state) {
    const id = personData.id;

    if (state?.blocked) {
      return button(
        "unblock", id,
        t("Block हटाउनुहोस्", "Unblock"),
        "primary"
      );
    }

    switch (state?.state || "none") {
      case "friend":
        return friendActions(personData);

      case "pending_sent":
        return button(
          "cancel",
          state.requestId,
          t("Request रद्द", "Cancel request"),
          "danger"
        );

      case "pending_received":
        return (
          button("accept", state.requestId, t("स्वीकार", "Accept"), "primary") +
          button("reject", state.requestId, t("अस्वीकार", "Decline"), "danger")
        );

      default:
        return (
          button("add", id, t("साथी बनाउनुहोस्", "Add friend"), "primary") +
          button(
            state?.following ? "unfollow" : "follow",
            id,
            state?.following ? "Following" : "Follow"
          ) +
          button("profile", id, t("प्रोफाइल", "Profile"))
        );
    }
  }

  function relationshipSubtitle(state) {
    if (state?.blocked) return t("Block गरिएको", "Blocked");

    switch (state?.state) {
      case "friend":
        return t("तपाईंको साथी", "Your friend");
      case "pending_sent":
        return t("Request स्वीकृतिको प्रतीक्षामा", "Request awaiting acceptance");
      case "pending_received":
        return t("तपाईंलाई Friend Request आएको छ", "Sent you a friend request");
      default:
        return state?.following
          ? t("तपाईंले Follow गर्नुभएको छ", "You are following")
          : t("Mero Sansar प्रयोगकर्ता", "Mero Sansar user");
    }
  }

  async function searchUsers() {
    const input = document.getElementById("ksfUserSearch");
    const box = document.getElementById("ksfSearchResults");
    const term = input?.value?.trim() || "";

    if (!box) return;

    if (term.length < 2) {
      ++searchVersion;
      lastSearchTerm = "";
      box.innerHTML = empty(
        t("कम्तीमा २ अक्षर लेख्नुहोस्।", "Enter at least 2 characters."),
        "🔎"
      );
      return;
    }

    const version = ++searchVersion;
    lastSearchTerm = term;

    box.innerHTML = `
      <div class="ksf-loading">${t("खोज्दैछ...", "Searching...")}</div>
    `;

    const api = API();

    if (!api) {
      box.innerHTML = empty(t("Friends सेवा उपलब्ध छैन।", "Friends service unavailable."));
      return;
    }

    try {
      const response = await api.searchUsers(term);

      if (version !== searchVersion) return;

      if (!response?.ok) {
        box.innerHTML = empty(
          response?.message || t("खोजी असफल भयो।", "Search failed.")
        );
        return;
      }

      const users = response.data || [];

      if (!users.length) {
        box.innerHTML = empty(
          t("मिल्दो प्रयोगकर्ता भेटिएन।", "No matching users found."),
          "🔎"
        );
        return;
      }

      let statuses = {};

      if (typeof api.getRelationshipStatuses === "function") {
        const statusResponse = await api.getRelationshipStatuses(
          users.map(user => user.id)
        );

        if (version !== searchVersion) return;

        if (!statusResponse?.ok) {
          box.innerHTML = empty(
            statusResponse?.message ||
            t("सम्बन्धको विवरण लोड हुन सकेन।", "Could not load relationship status.")
          );
          return;
        }

        statuses = statusResponse.data || {};
      }

      if (version !== searchVersion) return;

      box.innerHTML = `
        <div class="ksf-result-heading">
          ${t("खोजी नतिजा", "Search results")} · ${users.length}
        </div>

        ${users.map(p => {
          const state = statuses[p.id] || { state: "none" };

          return person(
            p,
            relationshipSubtitle(state),
            relationshipActions(p, state)
          );
        }).join("")}
      `;
    } catch (error) {
      if (version !== searchVersion) return;

      box.innerHTML = empty(
        error?.message || t("खोजी असफल भयो।", "Search failed.")
      );
    }
  }

  async function openFriendProfile(userId) {
    const id = String(userId || "").trim();
    if (!id) return false;

    const profile = global.KSKProfilePage;

    if (typeof profile?.openUserProfile === "function") {
      return Boolean(await profile.openUserProfile(id));
    }

    return Boolean(global.KSKNavigation?.navigate?.("profile", {
      profileUserId: id,
      source: "friends"
    }));
  }

  async function openFriendMessenger(userId) {
    const id = String(userId || "").trim();
    if (!id) return false;

    const messenger = global.KSKMessagesPage;

    if (!messenger || typeof messenger.openFriendChat !== "function") {
      toast(
        t(
          "Messenger सेवा उपलब्ध छैन। पृष्ठ पुनः लोड गरेर प्रयास गर्नुहोस्।",
          "Messenger is unavailable. Reload the page and try again."
        ),
        "error"
      );
      return false;
    }

    const ready = await messenger.initialize?.();

    if (ready === false) {
      toast(t("Messenger सुरु हुन सकेन।", "Messenger could not initialize."), "error");
      return false;
    }

    global.KSKNavigation?.navigate?.("messages", {
      source: "friends",
      friendId: id
    });

    const opened = await messenger.openFriendChat(id);

    if (!opened) {
      toast(
        t("साथीसँग कुराकानी खोल्न सकिएन।", "Could not open this friend's chat."),
        "error"
      );
      return false;
    }

    return true;
  }

  async function performAction(action, id, element) {
    if (!id || action === "pending") return;

    if (action === "profile") {
      await openFriendProfile(id);
      return;
    }

    if (action === "message") {
      if (element) element.disabled = true;

      try {
        await openFriendMessenger(id);
      } finally {
        if (element) element.disabled = false;
      }

      return;
    }

    const api = API();
    if (!api) return;

    if (element) element.disabled = true;

    let response;

    try {
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
          if (!global.confirm(t(
            "यो साथीलाई सूचीबाट हटाउने?",
            "Remove this friend?"
          ))) {
            if (element) element.disabled = false;
            return;
          }
          response = await api.removeFriend(id);
          break;

        case "unfollow":
          response = await api.unfollowUser(id);
          break;

        case "block":
          if (!global.confirm(t(
            "यो प्रयोगकर्तालाई Block गर्ने? यसले तपाईंहरूबीचको सम्पर्क रोक्नेछ।",
            "Block this user? This will prevent interaction between you."
          ))) {
            if (element) element.disabled = false;
            return;
          }
          response = await api.blockUser(id);
          break;

        case "unblock":
          response = await api.unblockUser(id);
          break;

        default:
          if (element) element.disabled = false;
          return;
      }
    } catch (error) {
      response = {
        ok: false,
        message: error?.message || t("कार्य पूरा हुन सकेन।", "Action failed.")
      };
    }

    if (!response?.ok) {
      toast(
        response?.message || t("कार्य पूरा हुन सकेन।", "Action failed."),
        "error"
      );

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

    activeMenuId = null;

    await loadDashboard();

    const input = document.getElementById("ksfUserSearch");

    if (input && input.value.trim().length >= 2 && lastSearchTerm) {
      await searchUsers();
    } else {
      await loadSuggestions();
    }
  }

  function toggleMenu(id, trigger) {
    const key = String(id || "");
    const panel = document.querySelector(
      `[data-friends-menu-panel="${CSS.escape(key)}"]`
    );

    if (!panel) return;

    document.querySelectorAll(".ksf-menu.open").forEach(menu => {
      if (menu !== panel) menu.classList.remove("open");
    });

    const opening = !panel.classList.contains("open");
    panel.classList.toggle("open", opening);

    document.querySelectorAll("[data-friends-menu]").forEach(button => {
      button.setAttribute("aria-expanded", "false");
    });

    if (trigger) trigger.setAttribute("aria-expanded", String(opening));

    activeMenuId = opening ? key : null;
  }

  function handleClick(event) {
    const target = event.target;
    if (!target?.closest) return;

    const menuTrigger = target.closest("[data-friends-menu]");

    if (menuTrigger) {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu(menuTrigger.dataset.friendsMenu, menuTrigger);
      return;
    }

    if (!target.closest(".ksf-more-wrap")) {
      document.querySelectorAll(".ksf-menu.open").forEach(menu => {
        menu.classList.remove("open");
      });
      activeMenuId = null;
    }

    const searchButton = target.closest("[data-friends-search]");

    if (searchButton) {
      event.preventDefault();
      searchUsers();
      return;
    }

    const actionButton = target.closest("[data-friends-action]");

    if (!actionButton || actionButton.disabled) return;

    event.preventDefault();

    const action = actionButton.dataset.friendsAction;
    const id = actionButton.dataset.userId;

    if (action === "unfriend" || action === "block") {
      actionButton.closest(".ksf-menu")?.classList.remove("open");
    }

    performAction(action, id, actionButton);
  }

  function handleKey(event) {
    if (
      event.target?.id === "ksfUserSearch" &&
      event.key === "Enter"
    ) {
      event.preventDefault();
      searchUsers();
    }

    if (event.key === "Escape") {
      document.querySelectorAll(".ksf-menu.open").forEach(menu => {
        menu.classList.remove("open");
      });
      activeMenuId = null;
    }
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKey);

  global.addEventListener("ksk:friends-cloud-change", () => {
    if (global.KSKNavigation?.getCurrentPage?.() === "friends") {
      loadDashboard();

      const input = document.getElementById("ksfUserSearch");

      if (input?.value?.trim().length >= 2) {
        searchUsers();
      } else {
        loadSuggestions();
      }
    }
  });

  global.KSKFriendsPage = Object.freeze({
    render,

    openAddFriend: () => {
      global.KSKNavigation?.navigate?.("friends");

      global.setTimeout(() => {
        document.getElementById("ksfUserSearch")?.focus();
      }, 150);

      return true;
    },

    openFriendProfile,
    openFriendMessenger,

    async refresh() {
      await loadDashboard();
      await loadSuggestions();
      return true;
    }
  });

})(window);
