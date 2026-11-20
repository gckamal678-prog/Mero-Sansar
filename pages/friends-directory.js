
"use strict";

/*
 * MERO SANSAR — FACEBOOK STYLE PEOPLE DIRECTORY
 * Version: 1.0.0
 *
 * Discover people, relationship-aware actions and pagination.
 */

(function (global) {
  "use strict";

  if (global.KSKFriendsDirectory) return;

  const PAGE_SIZE = 30;

  let activeRoot = null;
  let observer = null;
  let loadVersion = 0;
  let nextOffset = 0;
  let hasMore = false;
  let loading = false;
  let people = [];

  const AUTH = () => global.KSKSupabaseAuth;
  const FRIENDS = () => global.KSKSupabaseFriends;

  function english() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return english() ? en : ne;
  }

  function esc(value) {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(String(value ?? ""));
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
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function styles() {
    if (document.getElementById("ksfdStyles")) return;

    const style = document.createElement("style");
    style.id = "ksfdStyles";

    style.textContent = `
      #ksfdDirectoryCard {
        margin:12px 0;
        padding:14px;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:16px;
        background:var(--color-surface,#fff);
        color:var(--color-text,inherit);
      }

      #ksfdDirectoryCard * {
        box-sizing:border-box;
      }

      .ksfd-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:12px;
      }

      .ksfd-heading h3 {
        margin:0;
        font-size:15px;
        font-weight:850;
      }

      .ksfd-heading p {
        margin:4px 0 0;
        color:var(--color-muted,#888);
        font-size:11px;
      }

      .ksfd-refresh {
        width:36px;
        height:36px;
        flex:none;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:50%;
        background:var(--color-surface-secondary,#f4f4f4);
        color:inherit;
        font-size:18px;
        cursor:pointer;
      }

      .ksfd-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(145px,1fr));
        gap:10px;
      }

      .ksfd-person {
        position:relative;
        display:flex;
        min-width:0;
        flex-direction:column;
        align-items:center;
        gap:8px;
        padding:13px 8px;
        border:1px solid var(--color-border,rgba(128,128,128,.18));
        border-radius:14px;
        background:var(--color-surface-secondary,rgba(128,128,128,.04));
        text-align:center;
      }

      .ksfd-avatar {
        display:grid;
        place-items:center;
        width:58px;
        height:58px;
        flex:none;
        overflow:hidden;
        padding:0;
        border:0;
        border-radius:50%;
        background:var(--color-surface,#ddd);
        color:var(--color-text,inherit);
        font-size:22px;
        font-weight:850;
        cursor:pointer;
      }

      .ksfd-avatar img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .ksfd-person-info {
        width:100%;
        min-width:0;
      }

      .ksfd-person-info strong {
        display:block;
        overflow-wrap:anywhere;
        font-size:12px;
        line-height:1.5;
      }

      .ksfd-person-info small {
        display:block;
        margin-top:3px;
        color:var(--color-muted,#888);
        font-size:10px;
      }

      .ksfd-actions {
        display:flex;
        width:100%;
        flex-wrap:wrap;
        align-items:center;
        justify-content:center;
        gap:5px;
      }

      .ksfd-btn {
        min-height:32px;
        padding:6px 9px;
        border:1px solid var(--color-border,rgba(128,128,128,.25));
        border-radius:8px;
        background:var(--color-surface,#fff);
        color:var(--color-text,inherit);
        font:inherit;
        font-size:10px;
        font-weight:750;
        cursor:pointer;
      }

      .ksfd-btn.primary {
        border-color:transparent;
        background:var(--color-primary,#2563eb);
        color:#fff;
      }

      .ksfd-btn.danger {
        color:#c43d3d;
      }

      .ksfd-btn:disabled {
        opacity:.55;
        cursor:not-allowed;
      }

      .ksfd-menu-wrap {
        position:relative;
      }

      .ksfd-menu-trigger {
        width:32px;
        height:32px;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:50%;
        background:transparent;
        color:inherit;
        font-size:19px;
        cursor:pointer;
      }

      .ksfd-menu {
        position:absolute;
        z-index:80;
        top:36px;
        right:0;
        display:none;
        min-width:145px;
        padding:5px;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:11px;
        background:var(--color-surface,#fff);
        box-shadow:0 8px 25px rgba(0,0,0,.15);
      }

      .ksfd-menu.open {
        display:block;
      }

      .ksfd-menu button {
        display:block;
        width:100%;
        padding:9px;
        border:0;
        border-radius:7px;
        background:transparent;
        color:var(--color-text,inherit);
        text-align:left;
        font:inherit;
        font-size:11px;
        cursor:pointer;
      }

      .ksfd-menu button.danger {
        color:#c43d3d;
      }

      .ksfd-menu button:hover {
        background:var(--color-surface-secondary,#eee);
      }

      .ksfd-empty,
      .ksfd-loading {
        padding:22px 8px;
        color:var(--color-muted,#888);
        text-align:center;
        font-size:12px;
      }

      .ksfd-load-more {
        display:block;
        width:100%;
        min-height:40px;
        margin-top:12px;
        border:1px solid var(--color-border,rgba(128,128,128,.2));
        border-radius:10px;
        background:var(--color-surface-secondary,#f5f5f5);
        color:var(--color-text,inherit);
        font:inherit;
        font-size:12px;
        font-weight:800;
        cursor:pointer;
      }

      .ksfd-load-more:disabled {
        opacity:.55;
      }

      @media(max-width:360px) {
        .ksfd-grid {
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .ksfd-person {
          padding:10px 5px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureCard(root) {
    if (!root) return;

    const suggestions = root.querySelector("#ksfSuggestions");

    if (suggestions) {
      suggestions.hidden = true;
      suggestions.style.display = "none";
    }

    const dashboard = root.querySelector("#ksfDashboard");
    if (!dashboard) return;

    let card = root.querySelector("#ksfdDirectoryCard");
    let created = false;

    if (!card) {
      card = document.createElement("section");
      card.id = "ksfdDirectoryCard";

      card.innerHTML = `
        <div class="ksfd-heading">
          <div>
            <h3>${t("नयाँ सदस्यहरू खोज्नुहोस्", "Discover people")}</h3>
            <p>${t(
              "नयाँ सदस्यहरू खोज्नुहोस् र साथी बनाउनुहोस्।",
              "Find new people and make friends."
            )}</p>
          </div>

          <button
            type="button"
            class="ksfd-refresh"
            data-ksfd-refresh
            aria-label="${t("रिफ्रेस", "Refresh")}"
            title="${t("रिफ्रेस", "Refresh")}"
          >↻</button>
        </div>

        <div id="ksfdDirectoryList">
          <div class="ksfd-loading">
            ${t("सदस्यहरू लोड हुँदैछन्...", "Loading members...")}
          </div>
        </div>
      `;

      dashboard.parentNode.insertBefore(card, dashboard);
      created = true;
    }

    if (root !== activeRoot || created) {
      activeRoot = root;
      loadDirectory(false);
    }
  }

  function relationshipText(state) {
    switch (state?.state) {
      case "friend":
        return t("तपाईंको साथी", "Your friend");

      case "pending_sent":
        return t("Request पठाइएको", "Request sent");

      case "pending_received":
        return t("Friend Request आएको", "Sent you a request");

      default:
        return state?.following
          ? t("तपाईंले Follow गर्नुभएको छ", "You are following")
          : t("Mero Sansar सदस्य", "Mero Sansar member");
    }
  }

  function actionButton(action, id, userId, label, kind = "") {
    return `
      <button
        type="button"
        class="ksfd-btn ${kind}"
        data-ksfd-action="${esc(action)}"
        data-ksfd-id="${esc(id || "")}"
        data-ksfd-user="${esc(userId || "")}"
      >${label}</button>
    `;
  }

  function menu(person) {
    const id = person.id;
    const isFriend = person.status?.state === "friend";

    return `
      <div class="ksfd-menu-wrap">
        <button
          type="button"
          class="ksfd-menu-trigger"
          data-ksfd-menu="${esc(id)}"
          aria-label="${t("थप विकल्प", "More options")}"
          aria-expanded="false"
        >⋯</button>

        <div
          class="ksfd-menu"
          data-ksfd-menu-panel="${esc(id)}"
        >
          ${
            isFriend
              ? actionButton(
                  "unfriend",
                  id,
                  id,
                  t("साथी हटाउनुहोस्", "Remove friend"),
                  "danger"
                )
              : ""
          }

          ${actionButton(
            "block",
            id,
            id,
            t("Block गर्नुहोस्", "Block user"),
            "danger"
          )}
        </div>
      </div>
    `;
  }

  function actions(person) {
    const id = person.id;
    const state = person.status || {};

    if (state.state === "friend") {
      return (
        actionButton(
          "message",
          id,
          id,
          t("मेसेज", "Message"),
          "primary"
        ) +
        actionButton(
          "profile",
          id,
          id,
          t("प्रोफाइल", "Profile")
        ) +
        menu(person)
      );
    }

    if (state.state === "pending_sent") {
      return (
        actionButton(
          "cancel",
          state.requestId,
          id,
          t("Request रद्द", "Cancel request"),
          "danger"
        ) +
        menu(person)
      );
    }

    if (state.state === "pending_received") {
      return (
        actionButton(
          "accept",
          state.requestId,
          id,
          t("स्वीकार", "Accept"),
          "primary"
        ) +
        actionButton(
          "reject",
          state.requestId,
          id,
          t("अस्वीकार", "Decline"),
          "danger"
        ) +
        menu(person)
      );
    }

    return (
      actionButton(
        "add",
        id,
        id,
        t("साथी बनाउनुहोस्", "Add friend"),
        "primary"
      ) +
      actionButton(
        state.following ? "unfollow" : "follow",
        id,
        id,
        state.following ? "Following" : "Follow"
      ) +
      actionButton(
        "profile",
        id,
        id,
        t("प्रोफाइल", "Profile")
      ) +
      menu(person)
    );
  }

  function renderList() {
    const box = document.getElementById("ksfdDirectoryList");
    if (!box) return;

    if (!people.length) {
      box.innerHTML = `
        <div class="ksfd-empty">
          ${t(
            "अहिलेलाई देखाउन मिल्ने सदस्य भेटिएनन्।",
            "No members are available to display."
          )}
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="ksfd-grid">
          ${people.map(person => `
            <article class="ksfd-person">
              <button
                type="button"
                class="ksfd-avatar"
                data-ksfd-action="profile"
                data-ksfd-id="${esc(person.id)}"
                data-ksfd-user="${esc(person.id)}"
                aria-label="${t("प्रोफाइल खोल्नुहोस्", "Open profile")}"
              >
                ${
                  person.avatarUrl
                    ? `<img src="${esc(person.avatarUrl)}" alt="" loading="lazy">`
                    : esc(person.name.trim().charAt(0).toUpperCase() || "?")
                }
              </button>

              <div class="ksfd-person-info">
                <strong>${esc(person.name)}</strong>
                <small>${esc(relationshipText(person.status))}</small>
              </div>

              <div class="ksfd-actions">
                ${actions(person)}
              </div>
            </article>
          `).join("")}
        </div>
      `;
    }

    if (hasMore) {
      box.insertAdjacentHTML("beforeend", `
        <button
          type="button"
          class="ksfd-load-more"
          data-ksfd-load-more
        >${t("थप सदस्यहरू हेर्नुहोस्", "Load more members")}</button>
      `);
    }
  }

  async function loadDirectory(append = false) {
    const root = document.getElementById("ksfFriendsRoot");
    const box = document.getElementById("ksfdDirectoryList");

    if (!root || !box || loading) {
      if (loading && !append) {
        loadVersion += 1;
        loading = false;
      } else {
        return;
      }
    }

    const token = ++loadVersion;
    const offset = append ? nextOffset : 0;

    if (!append) {
      nextOffset = 0;
      people = [];
      hasMore = false;
      box.innerHTML = `
        <div class="ksfd-loading">
          ${t("सदस्यहरू लोड हुँदैछन्...", "Loading members...")}
        </div>
      `;
    } else {
      const moreButton = box.querySelector("[data-ksfd-load-more]");
      if (moreButton) {
        moreButton.disabled = true;
        moreButton.textContent = t("लोड हुँदैछ...", "Loading...");
      }
    }

    loading = true;

    try {
      const auth = AUTH();
      const api = FRIENDS();

      if (!auth || !api) {
        throw new Error(t(
          "Supabase सेवा उपलब्ध छैन।",
          "Supabase service is unavailable."
        ));
      }

      await auth.initialize();

      const user = auth.getUser?.();
      const client = auth.getClient?.();

      if (!user?.id || !client) {
        throw new Error(t(
          "पहिले आफ्नो खातामा लगइन गर्नुहोस्।",
          "Please sign in first."
        ));
      }

      const { data, error } = await client
        .from("profiles")
        .select("id,name,first_name,last_name,avatar_url,created_at")
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      if (token !== loadVersion) return;

      const profiles = data || [];
      const ids = profiles.map(profile => profile.id);

      let statuses = {};

      if (ids.length) {
        const statusResponse = await api.getRelationshipStatuses(ids);

        if (!statusResponse?.ok) {
          throw new Error(
            statusResponse?.message ||
            t("सम्बन्धको विवरण लोड हुन सकेन।", "Could not load relationship data.")
          );
        }

        statuses = statusResponse.data || {};
      }

      if (token !== loadVersion) return;

      const page = profiles
        .filter(profile => profile.id && profile.id !== user.id)
        .map(profile => ({
          id: profile.id,
          name: profile.name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Mero Sansar User",
          avatarUrl: profile.avatar_url || null,
          status: statuses[profile.id] || {
            state: "none",
            following: false,
            blocked: false
          }
        }))
        // Block भएका र पहिल्यै साथी भएका सदस्य नदेखाउने।
        .filter(profile =>
          !profile.status.blocked &&
          profile.status.state !== "friend"
        );

      if (append) {
        people = people.concat(page);
      } else {
        people = page;
      }

      nextOffset = offset + profiles.length;
      hasMore = profiles.length === PAGE_SIZE;

      renderList();

    } catch (error) {
      if (token !== loadVersion) return;

      box.innerHTML = `
        <div class="ksfd-empty">
          ${esc(error?.message || t(
            "सदस्यहरू लोड हुन सकेनन्।",
            "Could not load members."
          ))}
        </div>
      `;

    } finally {
      if (token === loadVersion) {
        loading = false;
      }
    }
  }

  function closeMenus() {
    document.querySelectorAll(".ksfd-menu.open").forEach(menu => {
      menu.classList.remove("open");
    });

    document.querySelectorAll("[data-ksfd-menu]").forEach(button => {
      button.setAttribute("aria-expanded", "false");
    });
  }

  function toggleMenu(id, trigger) {
    const panel = [...document.querySelectorAll("[data-ksfd-menu-panel]")]
      .find(item => item.dataset.ksfdMenuPanel === id);

    if (!panel) return;

    const opening = !panel.classList.contains("open");

    closeMenus();

    panel.classList.toggle("open", opening);

    if (trigger) {
      trigger.setAttribute("aria-expanded", String(opening));
    }
  }

  async function performAction(action, targetId, userId, element) {
    if (!action || !userId) return;

    if (action === "profile") {
      global.KSKFriendsPage?.openFriendProfile?.(userId);
      return;
    }

    if (action === "message") {
      const opened = await global.KSKFriendsPage?.openFriendMessenger?.(userId);

      if (opened === false) {
        toast(t("मेसेज खोल्न सकिएन।", "Could not open chat."), "error");
      }

      return;
    }

    const api = FRIENDS();
    if (!api) return;

    if (action === "unfriend" || action === "block") {
      const confirmed = global.confirm(t(
        action === "unfriend"
          ? "यो साथीलाई सूचीबाट हटाउने?"
          : "यो प्रयोगकर्तालाई Block गर्ने?",
        action === "unfriend"
          ? "Remove this friend?"
          : "Block this user?"
      ));

      if (!confirmed) return;
    }

    if (element) element.disabled = true;

    let response;

    try {
      switch (action) {
        case "add":
          response = await api.sendFriendRequest(userId);
          break;

        case "follow":
          response = await api.followUser(userId);
          break;

        case "unfollow":
          response = await api.unfollowUser(userId);
          break;

        case "accept":
          response = await api.respondToFriendRequest(targetId, "accepted");
          break;

        case "reject":
          response = await api.respondToFriendRequest(targetId, "rejected");
          break;

        case "cancel":
          response = await api.cancelFriendRequest(targetId);
          break;

        case "unfriend":
          response = await api.removeFriend(userId);
          break;

        case "block":
          response = await api.blockUser(userId);
          break;

        default:
          return;
      }

      if (!response?.ok) {
        throw new Error(response?.message || t(
          "कार्य पूरा हुन सकेन।",
          "Action failed."
        ));
      }

      const messages = {
        add: t("Friend Request पठाइयो।", "Friend request sent."),
        follow: t("Follow गर्नुभयो।", "Following."),
        unfollow: t("Unfollow भयो।", "Unfollowed."),
        accept: t("Friend Request स्वीकार भयो।", "Request accepted."),
        reject: t("Request अस्वीकार भयो।", "Request declined."),
        cancel: t("Request रद्द भयो।", "Request cancelled."),
        unfriend: t("साथी हटाइयो।", "Friend removed."),
        block: t("प्रयोगकर्ता Block भयो।", "User blocked.")
      };

      toast(messages[action] || t("सफल भयो।", "Done."), "success");

      closeMenus();

      await global.KSKFriendsPage?.refresh?.();
      await loadDirectory(false);

    } catch (error) {
      toast(
        error?.message || t("कार्य पूरा हुन सकेन।", "Action failed."),
        "error"
      );

      if (element) element.disabled = false;
    }
  }

  function handleClick(event) {
    const target = event.target;
    if (!target?.closest) return;

    const menuTrigger = target.closest("[data-ksfd-menu]");

    if (menuTrigger) {
      event.preventDefault();
      event.stopPropagation();

      toggleMenu(menuTrigger.dataset.ksfdMenu, menuTrigger);
      return;
    }

    if (!target.closest(".ksfd-menu-wrap")) {
      closeMenus();
    }

    if (target.closest("[data-ksfd-refresh]")) {
      event.preventDefault();
      loadDirectory(false);
      return;
    }

    if (target.closest("[data-ksfd-load-more]")) {
      event.preventDefault();
      loadDirectory(true);
      return;
    }

    const button = target.closest("[data-ksfd-action]");
    if (!button || button.disabled) return;

    event.preventDefault();

    performAction(
      button.dataset.ksfdAction,
      button.dataset.ksfdId,
      button.dataset.ksfdUser,
      button
    );
  }

  function observe() {
    styles();

    document.addEventListener("click", handleClick);

    observer = new MutationObserver(() => {
      const root = document.getElementById("ksfFriendsRoot");

      if (!root) {
        if (activeRoot) {
          activeRoot = null;
          loadVersion += 1;
          loading = false;
        }
        return;
      }

      ensureCard(root);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const root = document.getElementById("ksfFriendsRoot");
    if (root) ensureCard(root);

    global.addEventListener("ksk:friends-cloud-change", () => {
      if (document.getElementById("ksfFriendsRoot")) {
        loadDirectory(false);
      }
    });

    global.addEventListener("ksk:auth-ready", () => {
      if (document.getElementById("ksfFriendsRoot")) {
        loadDirectory(false);
      }
    });

    global.addEventListener("ksk:auth-change", () => {
      if (document.getElementById("ksfFriendsRoot")) {
        loadDirectory(false);
      }
    });
  }

  global.KSKFriendsDirectory = Object.freeze({
    refresh() {
      return loadDirectory(false);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe, { once: true });
  } else {
    observe();
  }

})(window);
