
"use strict";

/*
 * MERO SANSAR — PWA UPDATE
 * - Compact update banner
 * - No fabricated release notes
 * - Nepali / English labels
 * - Safe Service Worker activation
 */

(function (global) {
  "use strict";

  if (global.KSKPWAUpdate) return;

  const doc = global.document;
  const nav = global.navigator;

  let registration = null;
  let pendingWorker = null;
  let initialized = false;
  let updateRequested = false;
  let dismissed = false;
  let activationTimer = null;

  let banner = null;
  let title = null;
  let message = null;
  let updateButton = null;
  let laterButton = null;

  const monitoredWorkers = new WeakSet();
  const STYLE_ID = "ksk-pwa-clean-update-style";

  function language() {
    try {
      return global.KSKLanguage?.getLanguage?.() === "en"
        ? "en"
        : "ne";
    } catch (_) {
      return "ne";
    }
  }

  function labels() {
    if (language() === "en") {
      return {
        title: "Update Available",
        message: "A new version of Mero Sansar is ready.",
        update: "Update Now",
        later: "Later",
        updating: "Updating…",
        wait: "Please wait while the new version activates."
      };
    }

    return {
      title: "नयाँ अपडेट उपलब्ध",
      message: "मेरो संसारको नयाँ संस्करण तयार छ।",
      update: "अहिले अपडेट गर्नुहोस्",
      later: "पछि",
      updating: "अपडेट हुँदैछ…",
      wait: "नयाँ संस्करण सक्रिय हुँदैछ। कृपया पर्खनुहोस्।"
    };
  }

  function addStyles() {
    if (doc.getElementById(STYLE_ID)) return;

    const style = doc.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #pwaUpdateBanner.pwa-update-banner {
        position: relative !important;
        inset: auto !important;
        transform: none !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
        box-sizing: border-box !important;
        width: calc(100% - 28px) !important;
        max-width: 760px !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 8px auto 12px !important;
        padding: 10px 12px !important;
        overflow: visible !important;
        border: 1px solid var(--color-border, #334155) !important;
        border-left: 3px solid var(--color-primary, #3b82f6) !important;
        border-radius: 12px !important;
        background: var(--color-surface, #111827) !important;
        color: var(--color-text, #f8fafc) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,.12) !important;
        animation: none !important;
      }

      #pwaUpdateBanner[hidden] {
        display: none !important;
      }

      #pwaUpdateBanner .pwa-update-content {
        display: block !important;
        flex: 1 1 180px !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      #pwaUpdateBanner .pwa-update-content strong {
        display: block !important;
        margin: 0 0 3px !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1.4 !important;
      }

      #pwaUpdateBanner .pwa-update-content p {
        display: block !important;
        margin: 0 !important;
        font-size: 11px !important;
        line-height: 1.45 !important;
        overflow-wrap: anywhere !important;
      }

      #pwaUpdateBanner .pwa-update-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-end !important;
        flex-wrap: wrap !important;
        gap: 7px !important;
        width: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      #pwaUpdateBanner .pwa-update-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 auto !important;
        width: auto !important;
        min-width: 0 !important;
        min-height: 34px !important;
        height: auto !important;
        margin: 0 !important;
        padding: 7px 11px !important;
        border: 1px solid var(--color-border, #334155) !important;
        border-radius: 9px !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 750 !important;
        line-height: 1.3 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
      }

      #pwaUpdateBanner .pwa-update-later {
        background: var(--color-surface-secondary, #1e293b) !important;
        color: var(--color-text, #f8fafc) !important;
      }

      #pwaUpdateBanner .pwa-update-now {
        border-color: var(--color-primary, #3b82f6) !important;
        background: var(--color-primary, #3b82f6) !important;
        color: #fff !important;
      }

      #pwaUpdateBanner button:focus-visible {
        outline: 2px solid var(--color-primary, #3b82f6) !important;
        outline-offset: 2px !important;
      }

      #pwaUpdateBanner button:disabled {
        opacity: .55 !important;
        cursor: wait !important;
      }

      @media (max-width: 480px) {
        #pwaUpdateBanner.pwa-update-banner {
          align-items: center !important;
          flex-direction: row !important;
          padding: 9px 10px !important;
        }

        #pwaUpdateBanner .pwa-update-content {
          flex-basis: 100% !important;
        }

        #pwaUpdateBanner .pwa-update-actions {
          width: 100% !important;
          justify-content: flex-end !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #pwaUpdateBanner,
        #pwaUpdateBanner * {
          animation: none !important;
          transition: none !important;
        }
      }
    `;

    doc.head.appendChild(style);
  }

  function render() {
    if (!banner || !title || !message ||
        !updateButton || !laterButton) {
      return;
    }

    const text = labels();

    title.textContent = updateRequested
      ? text.updating
      : text.title;

    message.textContent = updateRequested
      ? text.wait
      : text.message;

    updateButton.textContent = updateRequested
      ? text.updating
      : text.update;

    laterButton.textContent = text.later;

    updateButton.disabled = updateRequested;
    laterButton.disabled = updateRequested;

    banner.setAttribute(
      "aria-busy",
      String(updateRequested)
    );
  }

  function show(worker) {
    if (!worker || !banner || dismissed || updateRequested) {
      return;
    }

    pendingWorker = worker;

    render();
    banner.hidden = false;
  }

  function hide() {
    if (banner) banner.hidden = true;
  }

  function later() {
    if (updateRequested) return;

    dismissed = true;
    hide();
  }

  function clearActivationTimer() {
    if (activationTimer !== null) {
      global.clearTimeout(activationTimer);
      activationTimer = null;
    }
  }

  function activationFailed(error) {
    clearActivationTimer();
    updateRequested = false;
    render();

    console.error(
      "PWA update activation failed:",
      error
    );

    if (pendingWorker) {
      dismissed = false;
      show(pendingWorker);
    }
  }

  function updateNow() {
    if (updateRequested) return;

    const worker =
      registration?.waiting ||
      pendingWorker;

    if (!worker || worker.state === "redundant") {
      pendingWorker = null;
      hide();
      return;
    }

    updateRequested = true;
    render();

    activationTimer = global.setTimeout(function () {
      activationFailed(
        new Error("Service Worker activation timed out.")
      );
    }, 30000);

    try {
      worker.postMessage({
        type: "SKIP_WAITING"
      });
    } catch (error) {
      activationFailed(error);
    }
  }

  function onControllerChange() {
    if (!updateRequested) return;

    clearActivationTimer();
    updateRequested = false;

    global.location.reload();
  }

  function monitorWorker(worker) {
    if (!worker || monitoredWorkers.has(worker)) return;

    monitoredWorkers.add(worker);

    function checkState() {
      if (worker.state === "redundant") {
        if (pendingWorker === worker) {
          pendingWorker = null;
        }
        return;
      }

      if (worker.state !== "installed") return;

      if (!registration?.active) {
        try {
          worker.postMessage({
            type: "SKIP_WAITING"
          });
        } catch (error) {
          console.error(
            "Initial Service Worker activation failed:",
            error
          );
        }

        return;
      }

      show(worker);
    }

    worker.addEventListener(
      "statechange",
      checkState
    );

    checkState();
  }

  function setupRegistration() {
    if (!registration) return;

    if (registration.waiting && registration.active) {
      show(registration.waiting);
    }

    registration.addEventListener(
      "updatefound",
      function () {
        monitorWorker(registration.installing);
      }
    );

    if (registration.installing) {
      monitorWorker(registration.installing);
    }

    if (typeof registration.update === "function") {
      registration.update().catch(function (error) {
        console.warn(
          "PWA update check failed:",
          error
        );
      });
    }
  }

  function registerWorker() {
    if (!nav.serviceWorker || !global.isSecureContext) {
      return;
    }

    nav.serviceWorker.register("./sw.js", {
      scope: "./"
    }).then(function (result) {
      registration = result;
      setupRegistration();
    }).catch(function (error) {
      console.error(
        "Service Worker registration failed:",
        error
      );
    });
  }

  function initialize() {
    if (initialized) return true;

    if (
      !("serviceWorker" in nav) ||
      !global.isSecureContext
    ) {
      return false;
    }

    banner = doc.getElementById("pwaUpdateBanner");
    title = doc.getElementById("pwaUpdateTitle");
    message = doc.getElementById("pwaUpdateMessage");
    updateButton = doc.getElementById("pwaUpdateNow");
    laterButton = doc.getElementById("pwaUpdateLater");

    if (
      !banner ||
      !title ||
      !message ||
      !updateButton ||
      !laterButton
    ) {
      console.error(
        "PWA update HTML elements are missing."
      );
      return false;
    }

    addStyles();

    /*
     * पुरानो संस्करणले बनाएका विवरणका खाली भाग भए हटाउने।
     * कुनै बनावटी विवरण पुनः सिर्जना गरिँदैन।
     */
    banner.querySelectorAll(
      ".pwa-update-details, .pwa-update-whats-new"
    ).forEach(function (element) {
      element.remove();
    });

    const header = doc.querySelector(".app-header");

    if (
      header &&
      banner.previousElementSibling !== header
    ) {
      header.insertAdjacentElement(
        "afterend",
        banner
      );
    }

    banner.setAttribute("role", "region");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-atomic", "false");

    updateButton.addEventListener(
      "click",
      updateNow
    );

    laterButton.addEventListener(
      "click",
      later
    );

    global.addEventListener(
      "ksk:language-change",
      render
    );

    nav.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    initialized = true;
    render();

    if (doc.readyState === "complete") {
      registerWorker();
    } else {
      global.addEventListener(
        "load",
        registerWorker,
        { once: true }
      );
    }

    return true;
  }

  global.KSKPWAUpdate = Object.freeze({
    initialize,

    isUpdateAvailable() {
      return Boolean(
        registration?.waiting || pendingWorker
      );
    },

    isUpdating() {
      return updateRequested;
    },

    getRegistration() {
      return registration;
    },

    checkForUpdate() {
      return registration?.update?.() ||
        Promise.resolve(null);
    },

    showUpdateBanner() {
      const worker =
        registration?.waiting || pendingWorker;

      if (!worker) return false;

      dismissed = false;
      show(worker);
      return true;
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
