"use strict";

/*
 * KSK UI ACTION ROUTER
 * Owns delegated clicks for app-wide UI actions.
 * Feature capture-phase handlers remain in their modules.
 */

(function (global) {
  "use strict";

  if (global.KSKUIActions) return;

  let initialized = false;
  let doc = null;
  let options = {};

  function callHandler(name, ...args) {
    const handler = options[name];

    if (typeof handler !== "function") return undefined;

    return handler(...args);
  }

  function handleClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const postAction = target.closest("[data-post-action]");

    if (postAction) {
      const action = postAction.dataset.postAction;

      if (action === "comment" || action === "share") {
        callHandler(
          "onPostAction",
          action,
          postAction.dataset.postId,
          event
        );
      }

      return;
    }

    if (callHandler("onPostActionsClick", target)) return;

    if (target.closest("[data-add-friend-open]")) {
      callHandler("onAddFriend", event);
      return;
    }

    if (target.closest("[data-edit-profile]")) {
      callHandler("onEditProfile", event);
      return;
    }

    if (target.closest("[data-open-settings]")) {
      callHandler("onOpenSettings", event);
    }
  }

  function initialize(settings = {}) {
    if (initialized) return true;

    options = settings;
    doc = settings.document || document;

    if (!doc?.addEventListener) {
      console.error("KSKUIActions could not access the document.");
      return false;
    }

    doc.addEventListener("click", handleClick);

    initialized = true;
    return true;
  }

  function destroy() {
    if (initialized && doc) {
      doc.removeEventListener("click", handleClick);
    }

    initialized = false;
    doc = null;
    options = {};

    return true;
  }

  global.KSKUIActions = Object.freeze({
    initialize,
    destroy
  });

})(window);
