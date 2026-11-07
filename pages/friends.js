
"use strict";

/*
 * =========================================================
 * KSK — FRIENDS PAGE MODULE
 *
 * RESPONSIBILITY:
 * - Render friends page
 * - Display friends using KSKUserCard
 * - Open add-friend modal
 * - Validate and add a friend
 *
 * DEPENDENCIES:
 * - KSKData
 * - KSKUserCard
 * - KSKUtils
 * - KSKLanguage
 * - KSKModal
 * - KSKToast
 *
 * app.js:
 * - Calls this module to open the add-friend interface.
 * - Does not own friend creation logic.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKFriendsPage) return;

  /* =======================================================
     SHARED MODULES
  ======================================================= */

  const DATA = () => global.KSKData || null;
  const LANG = () => global.KSKLanguage || null;
  const MODAL = () => global.KSKModal || null;
  const TOAST = () => global.KSKToast || null;
  const UTILS = () => global.KSKUtils || null;

  /* =======================================================
     HELPERS
  ======================================================= */

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
     RENDER FRIENDS
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
     OPEN ADD FRIEND
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

      /*
       * KSKData emits ksk:data-change after saving.
       * app.js listens to that event and refreshes
       * the currently visible page.
       */
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
