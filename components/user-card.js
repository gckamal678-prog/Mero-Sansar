"use strict";

(function (global) {
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function render(user, actions = true) {
    const id = escape(user.id);
    const name = escape(user.name);
    const avatar = escape(user.avatar || name.charAt(0));
    const status = escape(user.status || "");

    return `
      <article class="hs-user-card">
        <div class="avatar">${avatar}</div>
        <div class="hs-user-info">
          <strong>${name}</strong>
          <small>${status}</small>
        </div>
        ${actions ? `
          <button class="btn btn-secondary" data-hs-action="message"
            data-user-id="${id}">सन्देश</button>
          <button class="btn btn-secondary" data-hs-action="remove-friend"
            data-user-id="${id}" aria-label="साथी हटाउनुहोस्">×</button>
        ` : ""}
      </article>
    `;
  }

  global.HamroUserCard = Object.freeze({ render });
})(window);
