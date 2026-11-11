
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
 * - Safe Service Worker activation
 * - Activation timeout protection
 * - Automatic reload after activation
 * - Language change support
 * - Duplicate initialization protection
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPWAUpdate) {
    return;
  }

  const doc = global.document;
  const nav = global.navigator;

  const ACTIVATION_TIMEOUT = 30000;

  let registration = null;
  let pendingWorker = null;

  let initialized = false;
  let updateRequested = false;
  let dismissedThisPage = false;
  let activationTimer = null;

  let banner = null;
  let titleElement = null;
  let messageElement = null;
  let updateButton = null;
  let laterButton = null;

  let monitoredWorkers = new WeakSet();

  const TEXT = Object.freeze({
    ne: {
      title: "नयाँ संस्करण उपलब्ध छ",
      message:
        "हाम्रो संसारको नयाँ संस्करण तयार छ। नयाँ सुविधा र सुधार प्रयोग गर्न Update गर्नुहोस्।",
      update: "Update गर्नुहोस्",
      later: "पछि",
      updating: "अपडेट हुँदैछ...",
      updatingMessage:
        "कृपया केही क्षण पर्खनुहोस्।",
      failed:
        "अपडेट सक्रिय हुन सकेन। कृपया फेरि प्रयास गर्नुहोस्।"
    },

    en: {
      title: "New version available",
      message:
        "A new version of Hamro Sansar is ready. Update to use the latest improvements.",
      update: "Update now",
      later: "Later",
      updating: "Updating...",
      updatingMessage:
        "Please wait a moment.",
      failed:
        "The update could not be activated. Please try again."
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
    if (
      !banner ||
      !titleElement ||
      !messageElement ||
      !updateButton ||
      !laterButton
    ) {
      return;
    }

    const text = getText();

    if (updateRequested) {
      titleElement.textContent = text.updating;
      messageElement.textContent =
        text.updatingMessage;

      updateButton.textContent = text.updating;

      updateButton.disabled = true;
      laterButton.disabled = true;

      return;
    }

    titleElement.textContent = text.title;
    messageElement.textContent = text.message;

    updateButton.textContent = text.update;
    laterButton.textContent = text.later;

    updateButton.disabled = false;
    laterButton.disabled = false;
  }

  function showBanner(worker) {
    if (
      !worker ||
      dismissedThisPage ||
      updateRequested ||
      !banner
    ) {
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

  function clearActivationTimer() {
    if (activationTimer !== null) {
      global.clearTimeout(activationTimer);
      activationTimer = null;
    }
  }

  function handleLater() {
    if (updateRequested) {
      return;
    }

    dismissedThisPage = true;

    hideBanner();
  }

  function handleActivationFailure(error) {
    clearActivationTimer();

    updateRequested = false;

    renderBanner();

    if (pendingWorker) {
      showBanner(pendingWorker);
    }

    console.error(
      "PWA update activation failed:",
      error
    );
  }

  function handleUpdateNow() {
    if (updateRequested) {
      return;
    }

    const worker =
      registration?.waiting ||
      pendingWorker;

    if (
      !worker ||
      worker.state === "redundant"
    ) {
      pendingWorker = null;

      hideBanner();

      console.warn(
        "No valid waiting Service Worker is available."
      );

      return;
    }

    updateRequested = true;

    renderBanner();

    clearActivationTimer();

    activationTimer = global.setTimeout(
      function () {
        handleActivationFailure(
          new Error("Service Worker activation timeout.")
        );
      },
      ACTIVATION_TIMEOUT
    );

    try {
      worker.postMessage({
        type: "SKIP_WAITING"
      });
    } catch (error) {
      handleActivationFailure(error);
    }
  }

  function handleControllerChange() {
    if (!updateRequested) {
      return;
    }

    clearActivationTimer();

    updateRequested = false;

    global.location.reload();
  }

  function monitorWorker(worker) {
    if (
      !worker ||
      monitoredWorkers.has(worker)
    ) {
      return;
    }

    monitoredWorkers.add(worker);

    function checkWorkerState() {
      if (worker.state === "redundant") {
        if (pendingWorker === worker) {
          pendingWorker = null;
        }

        return;
      }

      if (worker.state !== "installed") {
        return;
      }

      /*
       * FIRST INSTALLATION
       *
       * No older active worker exists.
       * Activate silently without banner.
       */

      if (!registration.active) {
        try {
          worker.postMessage({
            type: "SKIP_WAITING"
          });
        } catch (error) {
          console.error(
            "First Service Worker activation failed:",
            error
          );
        }

        return;
      }

      /*
       * EXISTING INSTALLATION
       *
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
     * Check an already waiting worker.
     */

    if (
      registration.waiting &&
      registration.active
    ) {
      showBanner(registration.waiting);
    }

    /*
     * Detect new worker installation.
     */

    registration.addEventListener(
      "updatefound",
      function () {
        monitorWorker(
          registration.installing
        );
      }
    );

    /*
     * Detect installation already in progress.
     */

    if (registration.installing) {
      monitorWorker(
        registration.installing
      );
    }

    /*
     * Check for a newer version.
     */

    if (
      typeof registration.update === "function"
    ) {
      registration.update().catch(
        function (error) {
          console.warn(
            "PWA update check failed:",
            error
          );
        }
      );
    }
  }

  function registerServiceWorker() {
    if (
      !nav.serviceWorker ||
      !global.isSecureContext
    ) {
      console.warn(
        "Service Worker requires a supported secure context."
      );

      return;
    }

    nav.serviceWorker.register(
      "./sw.js",
      {
        scope: "./"
      }
    )
    .then(function (result) {
      registration = result;

      console.info(
        "Hamro Sansar Service Worker registered:",
        registration.scope
      );

      setupRegistrationEvents();
    })
    .catch(function (error) {
      console.error(
        "Service Worker registration failed:",
        error
      );
    });
  }

  function initialize() {
    if (initialized) {
      return true;
    }

    /*
     * Service Worker support check.
     */

    if (
      !("serviceWorker" in nav) ||
      !global.isSecureContext
    ) {
      console.warn(
        "Service Worker is not supported in this context."
      );

      return false;
    }

    /*
     * Get banner elements.
     */

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

    /*
     * Button events.
     */

    updateButton.addEventListener(
      "click",
      handleUpdateNow
    );

    laterButton.addEventListener(
      "click",
      handleLater
    );

    /*
     * Language change event.
     */

    global.addEventListener(
      "ksk:language-change",
      renderBanner
    );

    /*
     * Service Worker controller change.
     */

    nav.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    /*
     * Register after page load.
     */

    if (doc.readyState === "complete") {
      registerServiceWorker();
    } else {
      global.addEventListener(
        "load",
        registerServiceWorker,
        { once: true }
      );
    }

    return true;
  }

  /*
   * PUBLIC API
   */

  global.KSKPWAUpdate = Object.freeze({

    initialize,

    isUpdateAvailable() {
      return Boolean(
        registration?.waiting ||
        pendingWorker
      );
    },

    isUpdating() {
      return updateRequested;
    },

    getRegistration() {
      return registration;
    },

    checkForUpdate() {
      if (
        registration &&
        typeof registration.update === "function"
      ) {
        return registration.update();
      }

      return Promise.resolve(null);
    },

    showUpdateBanner() {
      const worker =
        registration?.waiting ||
        pendingWorker;

      if (worker) {
        showBanner(worker);
        return true;
      }

      return false;
    }

  });

  /*
   * AUTO INITIALIZATION
   */

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
