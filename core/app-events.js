"use strict";

/*
 * =========================================================
 * KSK — APPLICATION EVENT CONTROLLER
 *
 * This module owns application-wide Window and Element events.
 * Search events belong to KSKSearch.
 * Delegated UI actions belong to KSKUIActions.
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

    elements.quickPhoto?.addEventListener(
      "click",
      event => callHandler(options, "onQuickPhoto", event)
    );

    elements.quickVideo?.addEventListener(
      "click",
      event => callHandler(options, "onQuickVideo", event)
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

    initialized = true;

    console.info("KSK Application Events initialized.");

    return true;
  }

  global.KSKAppEvents = Object.freeze({
    initialize
  });

})(window);
