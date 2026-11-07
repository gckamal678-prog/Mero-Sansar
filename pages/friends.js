"use strict";

/*
 * =========================================================
 * KSK — FRIENDS PAGE MODULE
 *
 * RESPONSIBILITY:
 * - Render friends page
 * - Display friends using KSKUserCard
 *
 * DATA SOURCE:
 * - KSKData
 *
 * DEPENDENCIES:
 * - KSKUserCard
 *
 * NOTE:
 * - No Hamro system dependency.
 * - Friend creation remains in app.js for now.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKFriendsPage) return;

  function escapeHTML(value) {
    if (global.KSKUtils?.escapeHTML) {
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

  function render(options = {}) {
    const data = global.KSKData;
    const userCard = global.KSKUserCard;

    const friends = Array.isArray(options.friends)
      ? options.friends
      : data?.getFriends?.() || [];

    const isEnglish = Boolean(options.isEnglish);

    const friendList = friends.length
      ? friends.map(friend => {
          if (userCard?.render) {
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
            ${isEnglish
              ? "No friends added yet"
              : "अहिलेसम्म साथी थपिएको छैन"}
          </h3>

          <p>
            ${isEnglish
              ? "Add a friend by entering their name."
              : "नाम लेखेर साथी थप्न सक्नुहुन्छ।"}
          </p>
        </div>
      `;

    return `
      <section class="page-section">

        <div class="flex-between">

          <h3 class="section-title">
            ${isEnglish ? "My Friends" : "मेरा साथीहरू"}
          </h3>

          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-add-friend-open>

            +
            ${isEnglish ? "Add Friend" : "साथी थप्नुहोस्"}

          </button>

        </div>

        <div class="friends-list">
          ${friendList}
        </div>

      </section>
    `;
  }

  global.KSKFriendsPage = Object.freeze({
    render
  });

})(window);
