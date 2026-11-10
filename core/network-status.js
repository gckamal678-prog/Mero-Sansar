
"use strict";

(function (global) {
  "use strict";

  if (global.KSKNetworkStatus) {
    return;
  }

  const doc = global.document;
  const nav = global.navigator;

  let statusElement = null;
  let statusMode = "hidden";
  let hideTimer = null;
  let initialized = false;

  const ONLINE_MESSAGE = Object.freeze({
    ne: "नेटवर्क जडान फर्किएको देखिन्छ।",
    en: "Network connection appears to be available again."
  });

  const OFFLINE_MESSAGE = Object.freeze({
    ne: "इन्टरनेट जडान उपलब्ध छैन जस्तो देखिन्छ। पहिले लोड भएका सामग्री मात्र उपलब्ध हुन सक्छन्।",
    en: "No internet connection appears to be available. Previously loaded content may still be accessible."
  });

  function getLanguage() {
    try {
      return global.KSKLanguage?.getLanguage?.() === "en"
        ? "en"
        : "ne";
    } catch (error) {
      return "ne";
    }
  }

  function clearHideTimer() {
    if (hideTimer !== null) {
      global.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function render() {
    if (!statusElement) {
      return false;
    }

    if (statusMode === "hidden") {
      statusElement.hidden = true;
      statusElement.textContent = "";
      statusElement.className = "network-status";
      return true;
    }

    const language = getLanguage();

    statusElement.hidden = false;

    statusElement.setAttribute(
      "role",
      "status"
    );

    statusElement.setAttribute(
      "aria-live",
      "polite"
    );

    statusElement.setAttribute(
      "aria-atomic",
      "true"
    );

    if (statusMode === "offline") {
      statusElement.className =
        "network-status network-status-offline";

      statusElement.textContent =
        OFFLINE_MESSAGE[language];

      return true;
    }

    statusElement.className =
      "network-status network-status-online";

    statusElement.textContent =
      ONLINE_MESSAGE[language];

    return true;
  }

  /* =========================================
     OFFLINE EVENT
  ========================================= */

  function handleOffline() {
    clearHideTimer();

    statusMode = "offline";

    render();
  }

  /* =========================================
     ONLINE EVENT
  ========================================= */

  function handleOnline() {
    const wasOffline = statusMode === "offline";

    clearHideTimer();

    if (!wasOffline) {
      statusMode = "hidden";
      render();
      return;
    }

    statusMode = "online";

    render();

    hideTimer = global.setTimeout(function () {
      hideTimer = null;

      statusMode = "hidden";

      render();

    }, 4500);
  }

  /* =========================================
     LANGUAGE CHANGE
  ========================================= */

  function handleLanguageChange() {
    if (statusMode !== "hidden") {
      render();
    }
  }

  /* =========================================
     INITIALIZATION
  ========================================= */

  function initialize() {
    if (initialized) {
      return true;
    }

    statusElement = doc.getElementById(
      "networkStatus"
    );

    if (!statusElement) {
      console.warn(
        "KSK network status element was not found."
      );

      return false;
    }

    initialized = true;

    global.addEventListener(
      "offline",
      handleOffline
    );

    global.addEventListener(
      "online",
      handleOnline
    );

    global.addEventListener(
      "ksk:language-change",
      handleLanguageChange
    );

    if (nav.onLine === false) {
      statusMode = "offline";
      render();
    } else {
      statusMode = "hidden";
      render();
    }

    return true;
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  global.KSKNetworkStatus = Object.freeze({

    initialize,

    getState() {
      return statusMode;
    }

  });

  /* =========================================
     START
  ========================================= */

  if (doc.readyState === "loading") {

    doc.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );

  } else {

    initialize();

  }

})(window);
