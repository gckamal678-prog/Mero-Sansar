
"use strict";

/*
 * =========================================================
 * HAMRO SANSAR — SAFE PWA UPDATE CONTROLLER
 *
 * Features:
 * - In-app update banner
 * - Nepali / English messages
 * - Update only after user approval
 * - Later option
 * - No prompt during first installation
 * - Reload after successful activation
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPWAUpdate) {
    return;
  }

  const doc = global.document;
  const nav = global.navigator;

  let registration = null;
  let pendingWorker = null;

  let initialized = false;
  let updateRequested = false;
  let dismissedThisPage = false;

  let banner = null;
  let titleElement = null;
  let messageElement = null;
  let updateButton = null;
  let laterButton = null;

  const TEXT = Object.freeze({
    ne: {
      title: "नयाँ संस्करण उपलब्ध छ",
      message: "हाम्रो संसारको नयाँ संस्करण तयार छ। नयाँ सुविधा र सुधार प्रयोग गर्न Update गर्नुहोस्।",
      update: "Update गर्नुहोस्",
      later: "पछि",
      updating: "अपडेट हुँदैछ...",
      updatingMessage: "कृपया केही क्षण पर्खनुहोस्।"
    },

    en: {
      title: "New version available",
      message: "A new version of Hamro Sansar is ready. Update to use the latest improvements.",
      update: "Update now",
      later: "Later",
      updating: "Updating...",
      updatingMessage: "Please wait a moment."
    }
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

  function getText() {
    return TEXT[getLanguage()];
  }

  function renderBanner() {
    if (!banner) {
      return;
    }

    const text = getText();

    if (updateRequested) {
      titleElement.textContent = text.updating;
      messageElement.textContent = text.updatingMessage;
      updateButton.textContent = text.updating;
      laterButton.disabled = true;
      updateButton.disabled = true;
      return;
    }

    titleElement.textContent = text.title;
    messageElement.textContent = text.message;
    updateButton.textContent = text.update;
    laterButton.textContent = text.later;
  }

  function showBanner(worker) {
    if (!worker || dismissedThisPage || updateRequested) {
      return;
    }

    pendingWorker = worker;

    renderBanner();

    banner.hidden = false;
  }

  function hideBanner() {
    if (!banner) {
      return;
    }

    banner.hidden = true;
  }

  function handleLater() {
    if (updateRequested) {
      return;
    }

    dismissedThisPage = true;

    hideBanner();
  }

  function handleUpdateNow() {
    if (updateRequested) {
      return;
    }

    const worker =
      registration?.waiting || pendingWorker;

    if (!worker) {
      hideBanner();

      console.warn(
        "No waiting Service Worker is available."
      );

      return;
    }

    updateRequested = true;

    renderBanner();

    try {
      worker.postMessage({
        type: "SKIP_WAITING"
      });
    } catch (error) {
      updateRequested = false;

      renderBanner();

      console.error(
        "Could not request Service Worker activation:",
        error
      );
    }
  }

  function handleControllerChange() {
    if (!updateRequested) {
      return;
    }

    updateRequested = false;

    global.location.reload();
  }

  function monitorWorker(worker) {
    if (!worker) {
      return;
    }

    let installHandled = false;

    function checkWorkerState() {
      if (
        worker.state !== "installed" ||
        installHandled
      ) {
        return;
      }

      installHandled = true;

      /*
       * First installation:
       * No active older worker exists.
       * Activate silently without showing update banner.
       */

      if (!registration.active) {
        worker.postMessage({
          type: "SKIP_WAITING"
        });

        return;
      }

      /*
       * Existing installation:
       * Wait for user approval.
       */

      showBanner(worker);
    }

    worker.addEventListener(
      "statechange",
      checkWorkerState
    );

    checkWorkerState();
  }

  function setupRegistrationEvents() {
    if (!registration) {
      return;
    }

    /*
     * A waiting worker may already exist
     * when the page is opened.
     */

    if (
      registration.waiting &&
      registration.active
    ) {
      showBanner(registration.waiting);
    }

    registration.addEventListener(
      "updatefound",
      function () {
        monitorWorker(registration.installing);
      }
    );

    /*
     * An installation may already be running
     * before updatefound listener is attached.
     */

    if (registration.installing) {
      monitorWorker(registration.installing);
    }

    /*
     * Check for a newer version.
     */

    if (typeof registration.update === "function") {
      registration.update().catch(function (error) {
        console.warn(
          "PWA update check failed:",
          error
        );
      });
    }
  }

  function initialize() {
    if (initialized) {
      return true;
    }

    banner = doc.getElementById(
      "pwaUpdateBanner"
    );

    titleElement = doc.getElementById(
      "pwaUpdateTitle"
    );

    messageElement = doc.getElementById(
      "pwaUpdateMessage"
    );

    updateButton = doc.getElementById(
      "pwaUpdateNow"
    );

    laterButton = doc.getElementById(
      "pwaUpdateLater"
    );

    if (
      !banner ||
      !titleElement ||
      !messageElement ||
      !updateButton ||
      !laterButton
    ) {
      console.warn(
        "PWA update banner elements are incomplete."
      );

      return false;
    }

    initialized = true;

    updateButton.addEventListener(
      "click",
      handleUpdateNow
    );

    laterButton.addEventListener(
      "click",
      handleLater
    );

    global.addEventListener(
      "ksk:language-change",
      renderBanner
    );

    nav.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    if (!("serviceWorker" in nav)) {
      console.warn(
        "Service Worker is not supported."
      );

      return false;
    }

    global.addEventListener(
      "load",
      function () {
        nav.serviceWorker.register("./sw.js", {
          scope: "./"
        }).then(function (result) {
          registration = result;

          console.info(
            "Hamro Sansar Service Worker registered:",
            registration.scope
          );

          setupRegistrationEvents();

        }).catch(function (error) {
          console.error(
            "Service Worker registration failed:",
            error
          );
        });
      },
      { once: true }
    );

    return true;
  }

  global.KSKPWAUpdate = Object.freeze({
    initialize,

    isUpdateAvailable() {
      return Boolean(
        registration?.waiting
      );
    },

    getRegistration() {
      return registration;
    }
  });

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
