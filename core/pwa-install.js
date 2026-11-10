
"use strict";

/*
 * =========================================================
 * HAMRO SANSAR — PWA INSTALL CONTROLLER
 *
 * Android / Chromium:
 *   Uses beforeinstallprompt.
 *
 * iOS / iPadOS:
 *   Shows Add to Home Screen instructions.
 *
 * Installed app:
 *   Hides the install button.
 *
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPWAInstall) {
    return;
  }

  const doc = global.document;
  const nav = global.navigator;

  let deferredPrompt = null;
  let initialized = false;

  let installButton = null;

  /* =======================================================
     STANDALONE DETECTION
  ======================================================= */

  function isStandalone() {

    const displayMode =
      global.matchMedia &&
      global.matchMedia(
        "(display-mode: standalone)"
      ).matches;

    const iosStandalone =
      nav.standalone === true;

    return Boolean(
      displayMode || iosStandalone
    );

  }

  /* =======================================================
     IOS DETECTION
  ======================================================= */

  function isIOS() {

    const userAgent =
      nav.userAgent || "";

    const isAppleMobile =
      /iphone|ipad|ipod/i.test(
        userAgent
      );

    const isIPadOS =
      nav.platform === "MacIntel" &&
      nav.maxTouchPoints > 1;

    return Boolean(
      isAppleMobile || isIPadOS
    );

  }

  /* =======================================================
     BUTTON VISIBILITY
  ======================================================= */

  function showButton() {

    if (!installButton) {
      return;
    }

    installButton.hidden = false;

  }

  function hideButton() {

    if (!installButton) {
      return;
    }

    installButton.hidden = true;

  }

  /* =======================================================
     IOS INSTRUCTIONS
  ======================================================= */

  function showIOSInstructions() {

    global.alert(
      "हाम्रो संसारलाई Home Screen मा राख्न:\n\n" +

      "१. Safari मा Share बटन थिच्नुहोस्।\n\n" +

      "२. Add to Home Screen विकल्प छान्नुहोस्।\n\n" +

      "३. Add थिचेर पुष्टि गर्नुहोस्।"
    );

  }

  /* =======================================================
     CHROMIUM INSTALL PROMPT
  ======================================================= */

  async function installApplication() {

    if (!deferredPrompt) {
      return false;
    }

    const promptEvent = deferredPrompt;

    /*
     * The browser install event can be used only once.
     * Clear the reference before opening the prompt.
     */

    deferredPrompt = null;

    try {

      await promptEvent.prompt();

      const choice =
        await promptEvent.userChoice;

      if (
        choice &&
        choice.outcome === "accepted"
      ) {

        hideButton();

        console.info(
          "Hamro Sansar installation accepted."
        );

        return true;

      }

      /*
       * User dismissed the prompt.
       * Do not force another prompt.
       */

      hideButton();

      console.info(
        "Hamro Sansar installation dismissed."
      );

      return false;

    } catch (error) {

      hideButton();

      console.error(
        "PWA installation failed:",
        error
      );

      return false;

    }

  }

  /* =======================================================
     BUTTON CLICK
  ======================================================= */

  function handleInstallClick() {

    if (isIOS()) {

      showIOSInstructions();

      return;

    }

    installApplication();

  }

  /* =======================================================
     BROWSER INSTALL EVENTS
  ======================================================= */

  function handleBeforeInstallPrompt(event) {

    /*
     * Prevent the browser from showing its
     * automatic installation prompt.
     */

    event.preventDefault();

    if (isStandalone()) {
      return;
    }

    deferredPrompt = event;

    showButton();

    console.info(
      "Hamro Sansar is ready to install."
    );

  }

  function handleAppInstalled() {

    deferredPrompt = null;

    hideButton();

    console.info(
      "Hamro Sansar was installed successfully."
    );

  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {

    if (initialized) {
      return true;
    }

    installButton = doc.getElementById(
      "installAppButton"
    );

    if (!installButton) {

      console.warn(
        "PWA install button was not found."
      );

      return false;

    }

    initialized = true;

    /*
     * Already installed:
     * Do not show installation controls.
     */

    if (isStandalone()) {

      hideButton();

      return true;

    }

    installButton.addEventListener(
      "click",
      handleInstallClick
    );

    /*
     * iOS does not provide the standard
     * beforeinstallprompt event.
     */

    if (isIOS()) {

      installButton.title =
        "Home Screen मा थप्नुहोस्";

      installButton.setAttribute(
        "aria-label",
        "Home Screen मा थप्नुहोस्"
      );

      showButton();

    }

    global.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    global.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    console.info(
      "Hamro Sansar PWA install controller initialized."
    );

    return true;

  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKPWAInstall = Object.freeze({

    initialize,

    isStandalone,

    isIOS,

    isInstallAvailable() {
      return Boolean(deferredPrompt);
    }

  });

  /* =======================================================
     START
  ======================================================= */

  if (doc.readyState === "loading") {

    doc.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );

  } else {

    initialize();

  }

})(window);
