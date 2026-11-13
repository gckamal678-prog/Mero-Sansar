
"use strict";

/*
 * =========================================================
 * MERO SANSAR — COMPACT PWA UPDATE CONTROLLER
 *
 * - Compact floating update card; no page layout shift
 * - Mobile-first, Nepali / English
 * - User-approved update activation
 * - First installation activates silently
 * - Safe activation timeout and reload
 * - Accessible live status and keyboard focus
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPWAUpdate) return;

  const doc = global.document;
  const nav = global.navigator;
  const ACTIVATION_TIMEOUT = 30000;
  const STYLE_ID = "ksk-pwa-update-compact-style";

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

  const monitoredWorkers = new WeakSet();

  const TEXT = Object.freeze({
    ne: {
      title: "नयाँ अपडेट उपलब्ध",
      message: "नयाँ सुधार प्रयोग गर्न अपडेट गर्नुहोस्।",
      update: "अपडेट",
      later: "पछि",
      updating: "अपडेट हुँदैछ…",
      updatingMessage: "कृपया केही क्षण पर्खनुहोस्।",
      waiting: "पर्खनुहोस्"
    },
    en: {
      title: "Update available",
      message: "Update to get the latest improvements.",
      update: "Update",
      later: "Later",
      updating: "Updating…",
      updatingMessage: "Please wait a moment.",
      waiting: "Please wait"
    }
  });

  function getLanguage() {
    try {
      return global.KSKLanguage?.getLanguage?.() === "en" ? "en" : "ne";
    } catch (error) {
      return "ne";
    }
  }

  function getText() {
    return TEXT[getLanguage()];
  }

  function injectCompactStyles() {
    if (doc.getElementById(STYLE_ID)) return;

    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #pwaUpdateBanner.pwa-update-banner {
        position: fixed !important;
        z-index: 950 !important;
        left: 50% !important;
        right: auto !important;
        bottom: calc(var(--nav-height, 68px) + 10px + env(safe-area-inset-bottom, 0px)) !important;
        transform: translateX(-50%) !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        flex-wrap: nowrap !important;
        gap: 9px !important;
        width: min(420px, calc(100% - 20px)) !important;
        max-width: 420px !important;
        min-height: 52px !important;
        margin: 0 !important;
        padding: 8px 10px !important;
        border: 1px solid var(--color-border, #dbe3ef) !important;
        border-left: 3px solid var(--color-primary, #2563eb) !important;
        border-radius: 13px !important;
        background: var(--color-surface, #fff) !important;
        color: var(--color-text, #172033) !important;
        box-shadow: 0 8px 28px rgba(15, 23, 42, .18) !important;
        text-align: left !important;
        animation: kskPwaUpdateIn .18s ease-out both;
      }

      #pwaUpdateBanner[hidden] {
        display: none !important;
      }

      #pwaUpdateBanner .pwa-update-content {
        display: block !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      #pwaUpdateBanner .pwa-update-content strong {
        display: block !important;
        margin: 0 !important;
        color: var(--color-text, #172033) !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        line-height: 1.35 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #pwaUpdateBanner .pwa-update-content p {
        display: block !important;
        margin: 2px 0 0 !important;
        color: var(--color-text-secondary, #64748b) !important;
        font-size: 10px !important;
        line-height: 1.3 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #pwaUpdateBanner .pwa-update-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: flex-end !important;
        flex-wrap: nowrap !important;
        gap: 5px !important;
        width: auto !important;
      }

      #pwaUpdateBanner .pwa-update-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 0 !important;
        min-height: 32px !important;
        padding: 5px 9px !important;
        border: 1px solid var(--color-border, #dbe3ef) !important;
        border-radius: 8px !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 750 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
      }

      #pwaUpdateBanner .pwa-update-later {
        background: var(--color-surface-secondary, #f8fafc) !important;
        color: var(--color-text-secondary, #475569) !important;
      }

      #pwaUpdateBanner .pwa-update-now {
        border-color: var(--color-primary, #2563eb) !important;
        background: var(--color-primary, #2563eb) !important;
        color: #fff !important;
      }

      #pwaUpdateBanner .pwa-update-button:disabled {
        opacity: .6 !important;
        cursor: wait !important;
      }

      #pwaUpdateBanner .pwa-update-button:focus-visible {
        outline: 3px solid var(--color-primary, #2563eb) !important;
        outline-offset: 2px !important;
      }

      @keyframes kskPwaUpdateIn {
        from { opacity: 0; transform: translate(-50%, 7px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      @media (max-width: 480px) {
        #pwaUpdateBanner.pwa-update-banner {
          width: calc(100% - 18px) !important;
          min-height: 46px !important;
          padding: 6px 8px !important;
          gap: 6px !important;
          border-radius: 11px !important;
        }

        #pwaUpdateBanner .pwa-update-content p {
          display: none !important;
        }

        #pwaUpdateBanner .pwa-update-content strong {
          font-size: 11px !important;
        }

        #pwaUpdateBanner .pwa-update-button {
          min-height: 30px !important;
          padding: 5px 8px !important;
          font-size: 10px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #pwaUpdateBanner.pwa-update-banner {
          animation: none !important;
        }
      }
    `;

    doc.head.appendChild(style);
  }

  function renderBanner() {
    if (!banner || !titleElement || !messageElement || !updateButton || !laterButton) {
      return;
    }

    const text = getText();

    if (updateRequested) {
      titleElement.textContent = text.updating;
      messageElement.textContent = text.updatingMessage;
      updateButton.textContent = text.waiting;
      updateButton.disabled = true;
      laterButton.disabled = true;
      banner.setAttribute("aria-busy", "true");
      return;
    }

    titleElement.textContent = text.title;
    messageElement.textContent = text.message;
    updateButton.textContent = text.update;
    laterButton.textContent = text.later;
    updateButton.disabled = false;
    laterButton.disabled = false;
    banner.removeAttribute("aria-busy");
  }

  function showBanner(worker) {
    if (!worker || dismissedThisPage || updateRequested || !banner) return;

    pendingWorker = worker;
    renderBanner();
    banner.hidden = false;
  }

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  function clearActivationTimer() {
    if (activationTimer !== null) {
      global.clearTimeout(activationTimer);
      activationTimer = null;
    }
  }

  function handleLater() {
    if (updateRequested) return;
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

    console.error("PWA update activation failed:", error);
  }

  function handleUpdateNow() {
    if (updateRequested) return;

    const worker = registration?.waiting || pendingWorker;

    if (!worker || worker.state === "redundant") {
      pendingWorker = null;
      hideBanner();
      console.warn("No valid waiting Service Worker is available.");
      return;
    }

    updateRequested = true;
    renderBanner();
    clearActivationTimer();

    activationTimer = global.setTimeout(function () {
      handleActivationFailure(new Error("Service Worker activation timeout."));
    }, ACTIVATION_TIMEOUT);

    try {
      worker.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      handleActivationFailure(error);
    }
  }

  function handleControllerChange() {
    if (!updateRequested) return;

    clearActivationTimer();
    updateRequested = false;
    global.location.reload();
  }

  function monitorWorker(worker) {
    if (!worker || monitoredWorkers.has(worker)) return;

    monitoredWorkers.add(worker);

    function checkWorkerState() {
      if (worker.state === "redundant") {
        if (pendingWorker === worker) pendingWorker = null;
        return;
      }

      if (worker.state !== "installed") return;

      if (!registration.active) {
        try {
          worker.postMessage({ type: "SKIP_WAITING" });
        } catch (error) {
          console.error("First Service Worker activation failed:", error);
        }
        return;
      }

      showBanner(worker);
    }

    worker.addEventListener("statechange", checkWorkerState);
    checkWorkerState();
  }

  function setupRegistrationEvents() {
    if (!registration) return;

    if (registration.waiting && registration.active) {
      showBanner(registration.waiting);
    }

    registration.addEventListener("updatefound", function () {
      monitorWorker(registration.installing);
    });

    if (registration.installing) {
      monitorWorker(registration.installing);
    }

    if (typeof registration.update === "function") {
      registration.update().catch(function (error) {
        console.warn("PWA update check failed:", error);
      });
    }
  }

  function registerServiceWorker() {
    if (!nav.serviceWorker || !global.isSecureContext) {
      console.warn("Service Worker requires a supported secure context.");
      return;
    }

    nav.serviceWorker.register("./sw.js", { scope: "./" })
      .then(function (result) {
        registration = result;
        console.info("Mero Sansar Service Worker registered:", registration.scope);
        setupRegistrationEvents();
      })
      .catch(function (error) {
        console.error("Service Worker registration failed:", error);
      });
  }

  function initialize() {
    if (initialized) return true;

    if (!("serviceWorker" in nav) || !global.isSecureContext) {
      console.warn("Service Worker is not supported in this context.");
      return false;
    }

    banner = doc.getElementById("pwaUpdateBanner");
    titleElement = doc.getElementById("pwaUpdateTitle");
    messageElement = doc.getElementById("pwaUpdateMessage");
    updateButton = doc.getElementById("pwaUpdateNow");
    laterButton = doc.getElementById("pwaUpdateLater");

    if (!banner || !titleElement || !messageElement || !updateButton || !laterButton) {
      console.warn("PWA update banner elements are incomplete.");
      return false;
    }

    injectCompactStyles();
    initialized = true;

    updateButton.addEventListener("click", handleUpdateNow);
    laterButton.addEventListener("click", handleLater);
    global.addEventListener("ksk:language-change", renderBanner);
    nav.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    if (doc.readyState === "complete") {
      registerServiceWorker();
    } else {
      global.addEventListener("load", registerServiceWorker, { once: true });
    }

    return true;
  }

  global.KSKPWAUpdate = Object.freeze({
    initialize,

    isUpdateAvailable() {
      return Boolean(registration?.waiting || pendingWorker);
    },

    isUpdating() {
      return updateRequested;
    },

    getRegistration() {
      return registration;
    },

    checkForUpdate() {
      if (registration && typeof registration.update === "function") {
        return registration.update();
      }
      return Promise.resolve(null);
    },

    showUpdateBanner() {
      const worker = registration?.waiting || pendingWorker;
      if (!worker) return false;
      showBanner(worker);
      return true;
    }
  });

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

})(window);
