
"use strict";

/*
 * KSK — USER CARD COMPONENT
 *
 * RESPONSIBILITY:
 * - Render friend/user cards
 * - Display profile names and avatars
 * - Load IndexedDB avatar images
 * - Provide message action hooks
 *
 * DATA SOURCE: KSKData
 * MEDIA SOURCE: KSKMedia
 */

(function (global) {
  "use strict";

  if (global.KSKUserCard) return;

  /* =========================================
     HELPERS
  ========================================= */

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

  function getInitial(name) {
    return String(name || "").trim().charAt(0) || "स";
  }

  function isImageURL(value) {
    if (typeof value !== "string") return false;

    return (
      /^https?:\/\//i.test(value) ||
      /^data:image\//i.test(value) ||
      /^blob:/i.test(value)
    );
  }

  /* =========================================
     AVATAR RENDERING
  ========================================= */

  function renderAvatar(user = {}) {
    const name = String(user.name || "").trim();
    const avatar = String(
      user.avatarMediaId ||
      user.avatar ||
      ""
    ).trim();

    const initial = escapeHTML(getInitial(name));

    if (isImageURL(avatar)) {
      return `
        <div class="avatar">
          <img
            src="${escapeHTML(avatar)}"
            alt="${escapeHTML(name)}"
            loading="lazy">
        </div>
      `;
    }

    if (avatar) {
      return `
        <div
          class="avatar"
          data-ksk-user-avatar="${escapeHTML(avatar)}">
          ${initial}
        </div>
      `;
    }

    return `
      <div class="avatar">
        ${initial}
      </div>
    `;
  }

  /* =========================================
     RENDER USER CARD
  ========================================= */

  function render(user = {}, options = {}) {
    const id = String(user.id || "");
    const name = String(user.name || "").trim();
    const location = String(user.location || "");

    const showMessage = options.message !== false;

    return `
      <article
        class="card friend-card"
        data-user-card="${escapeHTML(id)}">

        <div class="flex align-center gap-3">

          ${renderAvatar(user)}

          <div class="flex-column">

            <strong>
              ${escapeHTML(name || "साथी")}
            </strong>

            ${
              location
                ? `
                  <span class="text-muted text-small">
                    ${escapeHTML(location)}
                  </span>
                `
                : ""
            }

          </div>

          ${
            showMessage
              ? `
                <button
                  class="icon-button"
                  type="button"
                  data-message-friend="${escapeHTML(id)}"
                  aria-label="सन्देश पठाउनुहोस्"
                  title="सन्देश">

                  💬

                </button>
              `
              : ""
          }

        </div>

      </article>
    `;
  }

  /* =========================================
     RENDER USER LIST
  ========================================= */

  function renderList(users = [], options = {}) {
    if (!Array.isArray(users) || !users.length) {
      return "";
    }

    return users
      .map(user => render(user, options))
      .join("");
  }

  /* =========================================
     LOAD STORED AVATARS
  ========================================= */

  async function refresh(root = document) {
    const media = global.KSKMedia;

    if (!media?.getImageURL) return;

    const avatars = root.querySelectorAll(
      "[data-ksk-user-avatar]"
    );

    await Promise.all(
      [...avatars].map(async element => {
        const mediaId = element.dataset.kskUserAvatar;

        if (!mediaId) return;

        try {
          const imageURL = await media.getImageURL(mediaId);

          if (!imageURL || !element.isConnected) return;

          if (
            element.dataset.kskUserAvatar !== mediaId
          ) {
            return;
          }

          const image = document.createElement("img");

          image.src = imageURL;
          image.alt = "";
          image.loading = "lazy";

          element.replaceChildren(image);

        } catch (error) {
          console.warn(
            "KSK user avatar could not be loaded:",
            error
          );
        }
      })
    );
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  global.KSKUserCard = Object.freeze({

    render,

    renderList,

    renderAvatar,

    refresh

  });

})(window);
