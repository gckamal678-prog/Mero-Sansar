File path: "Mero-Sansar/pages/friends.js"

"use strict";

/*
 * =========================================================
 * KSK — FRIENDS PAGE MODULE
 *
 * RESPONSIBILITY:
 * - Render friends list
 * - Handle add-friend form
 *
 * DATA OWNER     : KSKData
 * MODAL OWNER    : KSKModal
 * APP CONTROLLER : KSKApp
 *
 * This module does not own persistent data.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKFriendsPage) return;

  /* =======================================================
     HELPERS
  ======================================================= */

  function escapeHTML(value = "") {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function isEnglish(context) {
    return typeof context?.isEnglish === "function"
      ? context.isEnglish()
      : false;
  }

  function avatarHTML(context, name, avatar) {
    if (typeof context?.avatarHTML === "function") {
      return context.avatarHTML(name, avatar);
    }

    return `
      <div class="avatar">
        ${escapeHTML(String(name || "स").charAt(0))}
      </div>
    `;
  }

  /* =======================================================
     RENDER FRIENDS
  ======================================================= */

  function render(context = {}) {
    const friends = Array.isArray(context.friends)
      ? context.friends
      : [];

    const english = isEnglish(context);

    const list = friends.length
      ? friends.map(friend => `
          <article class="card friend-card">

            <div class="flex align-center gap-3">

              ${avatarHTML(
                context,
                friend.name,
                friend.avatar
              )}

              <div class="flex-column">

                <strong>
                  ${escapeHTML(friend.name || "साथी")}
                </strong>

                <span class="text-muted text-small">
                  ${escapeHTML(friend.location || "")}
                </span>

              </div>

              <button
                class="icon-button"
                type="button"
                data-message-friend="${escapeHTML(friend.id)}"
                aria-label="${english ? "Message" : "सन्देश"}">

                💬

              </button>

            </div>

          </article>
        `).join("")
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
          ${list}
        </div>

      </section>
    `;
  }

  /* =======================================================
     ADD FRIEND
  ======================================================= */

  function openAddFriend(context = {}) {
    const english = isEnglish(context);

    if (typeof context.openModal !== "function") {
      return false;
    }

    const modal = context.openModal({
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
            required>

        </form>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${typeof context.translate === "function"
            ? context.translate("cancel", "रद्द")
            : "रद्द"}
        </button>

        <button
          class="btn btn-primary"
          type="submit"
          form="kskAddFriendForm">
          ${typeof context.translate === "function"
            ? context.translate("addFriend", "साथी थप्नुहोस्")
            : "साथी थप्नुहोस्"}
        </button>
      `
    });

    if (!modal?.element) {
      return false;
    }

    const nameInput = modal.element.querySelector(
      "#kskFriendName"
    );

    const form = modal.element.querySelector(
      "#kskAddFriendForm"
    );

    nameInput?.focus();

    form?.addEventListener("submit", event => {
      event.preventDefault();

      const name = nameInput?.value.trim();

      if (!name) return;

      const friend = context.data?.addFriend?.({
        name
      });

      if (!friend) {
        context.toast?.(
          english
            ? "Friend already exists or could not be added."
            : "यो साथी पहिल्यै छ वा थप्न सकिएन।",
          "warning"
        );

        return;
      }

      context.closeModal?.();
      context.refreshCurrentPage?.();

      context.toast?.(
        english
          ? "Friend added."
          : "साथी थपियो।",
        "success"
      );
    });

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKFriendsPage = Object.freeze({
    render,
    openAddFriend
  });

})(window);
