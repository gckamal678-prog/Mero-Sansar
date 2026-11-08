"use strict";

/*
 * =========================================================
 * KSK — APPLICATION EVENT CONTROLLER
 *
 * This module owns application-wide DOM and window events.
 * Feature-specific capture-phase events remain in their
 * respective feature modules.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKAppEvents) return;

  let initialized = false;

  function callHandler(options, name, ...args) {
    const handler = options[name];

    if (typeof handler !== "function") {
      return undefined;
    }

    return handler(...args);
  }

  function initialize(options = {}) {
    if (initialized) return true;

    const doc = options.document || document;
    const win = options.window || global;
    const elements = options.elements || {};
    const navigation = options.navigation || global.KSKNavigation;

    if (!doc || !win) {
      console.error("KSKAppEvents could not access the application window.");
      return false;
    }

    /*
     * Keep navigation initialization before app-level
     * bubble listeners, matching the previous event order.
     */
    navigation?.initializeNavigation?.(doc);

    win.addEventListener(
      "ksk:open-composer",
      () => callHandler(options, "onOpenComposer")
    );

    win.addEventListener(
      "ksk:language-change",
      event => callHandler(options, "onLanguageChange", event)
    );

    win.addEventListener(
      "ksk:settings-change",
      event => callHandler(options, "onSettingsChange", event)
    );

    win.addEventListener(
      "ksk:data-change",
      event => callHandler(options, "onDataChange", event)
    );

    /*
     * Feature modules such as Media UI, Profile Media,
     * Reactions and Post Actions retain their own capture
     * phase listeners. These handlers remain in bubble phase.
     */

    elements.quickPhoto?.addEventListener(
      "click",
      event => callHandler(options, "onQuickPhoto", event)
    );

    elements.quickVideo?.addEventListener(
      "click",
      event => callHandler(options, "onQuickVideo", event)
    );

    elements.searchToggle?.addEventListener(
      "click",
      event => callHandler(options, "onSearchToggle", event)
    );

    elements.searchInput?.addEventListener(
      "input",
      event => callHandler(options, "onSearch", event.target.value, event)
    );

    elements.notificationsToggle?.addEventListener(
      "click",
      event => callHandler(options, "onNotifications", event)
    );

    elements.closeSettings?.addEventListener(
      "click",
      event => callHandler(options, "onCloseSettings", event)
    );

    elements.settingsModal?.addEventListener(
      "click",
      event => {
        if (event.target === elements.settingsModal) {
          callHandler(options, "onCloseSettings", event);
        }
      }
    );

    doc.addEventListener("click", event => {
      const target = event.target;

      if (!target?.closest) return;

      const postAction = target.closest("[data-post-action]");

      if (postAction) {
        const action = postAction.dataset.postAction;

        /*
         * Like / Reaction and Save / Unsave are intercepted
         * in capture phase by their feature modules.
         * The app-level router handles Comment and Share.
         */
        if (action === "comment" || action === "share") {
          callHandler(
            options,
            "onPostAction",
            action,
            postAction.dataset.postId,
            event
          );
        }

        return;
      }

      if (callHandler(options, "onPostActionsClick", target)) {
        return;
      }

      if (target.closest("[data-add-friend-open]")) {
        callHandler(options, "onAddFriend", event);
        return;
      }

      if (target.closest("[data-edit-profile]")) {
        callHandler(options, "onEditProfile", event);
        return;
      }

      if (target.closest("[data-open-settings]")) {
        callHandler(options, "onOpenSettings", event);
      }
    });

    initialized = true;

    console.info("KSK Application Events initialized.");

    return true;
  }

  global.KSKAppEvents = Object.freeze({
    initialize
  });

})(window);
