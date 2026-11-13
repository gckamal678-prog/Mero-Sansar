
"use strict";

/*
 * =========================================================
 * MERO SANSAR — PWA UPDATE v2
 *
 * Compact floating update notice
 * Expandable "What's new" release notes
 * Safe Service Worker activation
 * Reduced-motion and keyboard accessibility
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPWAUpdate) return;

  const doc = global.document;
  const nav = global.navigator;
  const STYLE_ID = "ksk-pwa-update-v2-style";
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
  let whatsNewButton = null;
  let detailsPanel = null;

  const monitoredWorkers = new WeakSet();

  const RELEASE_NOTES = {
    ne: [
      ["प्रोफाइल सुधार", "प्रोफाइलका बटन, टुल्स र जानकारी व्यवस्थित।"],
      ["साथी तथा Follow", "Friend Requests, Followers र Following व्यवस्थापन सुधार।"],
      ["Story सुधार", "Story Viewer, Highlights र Story व्यवस्थापन सजिलो।"],
      ["सुरक्षा र गोपनीयता", "Content Safety, Hide र Report विकल्प थप।"],
      ["Drafts र Insights", "Drafts तथा आफ्ना गतिविधिको विवरण हेर्न सकिने।"],
      ["Data Saver", "कम डेटा प्रयोग गर्न स्थानीय सेटिङ र Image Loading सुधार।"],
      ["Messages र Notifications", "सन्देश तथा सूचनाका विकल्प व्यवस्थित।"],
      ["मोबाइल अनुभव", "UI, Toast र PWA Update अनुभव सुधार।"]
    ],
    en: [
      ["Profile improvements", "Profile buttons, tools and information are better organized."],
      ["Friends and Follow", "Friend requests, followers and following management improved."],
      ["Stories", "Story viewer, highlights and story management improved."],
      ["Safety and Privacy", "Content safety, hide and report options added."],
      ["Drafts and Insights", "Drafts and personal activity insights available."],
      ["Data Saver", "Local data-saving controls and image loading improvements."],
      ["Messages and Notifications", "Messaging and notification options improved."],
      ["Mobile experience", "UI, toast messages and PWA update experience improved."]
    ]
  };

  const TEXT = {
    ne: {
      title: "✨ नयाँ अपडेट आएको छ",
      message: "नयाँ सुधारहरू हेर्नुहोस्",
      whatsNew: "के नयाँ छ?",
      hideNotes: "विवरण बन्द",
      update: "अपडेट",
      later: "पछि",
      updating: "अपडेट हुँदैछ…",
      waiting: "पर्खनुहोस्",
      updatingMessage: "कृपया केही क्षण पर्खनुहोस्।",
      notesTitle: "यस संस्करणमा भएका सुधारहरू"
    },
    en: {
      title: "✨ New update available",
      message: "See what's improved",
      whatsNew: "What's new?",
      hideNotes: "Close details",
      update: "Update",
      later: "Later",
      updating: "Updating…",
      waiting: "Please wait",
      updatingMessage: "Please wait a moment.",
      notesTitle: "What's included in this update"
    }
  };

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

  function createElement(tag, className, text) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function injectStyles() {
    if (doc.getElementById(STYLE_ID)) return;

    const style = doc.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #pwaUpdateBanner.pwa-update-banner {
        position: fixed !important;
        top: auto !important;
        right: auto !important;
        bottom: calc(var(--app-bottom-height, 78px) + 9px + env(safe-area-inset-bottom, 0px)) !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(8px) !important;
        z-index: 10020 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        justify-content: flex-start !important;
        flex-wrap: nowrap !important;
        gap: 0 !important;
        width: min(470px, calc(100% - 20px)) !important;
        max-width: 470px !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: min(62vh, 420px) !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 1px solid var(--color-border, #334155) !important;
        border-left: 3px solid var(--color-primary, #3b82f6) !important;
        border-radius: 14px !important;
        background: var(--color-surface, #111827) !important;
        color: var(--color-text, #f8fafc) !important;
        box-shadow: 0 8px 28px rgba(0,0,0,.25) !important;
        text-align: left !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition:
          opacity .2s ease,
          transform .2s ease,
          max-height .2s ease !important;
      }

      #pwaUpdateBanner[hidden] {
        display: none !important;
      }

      #pwaUpdateBanner.pwa-update-visible {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: translateX(-50%) translateY(0) !important;
      }

      #pwaUpdateBanner .pwa-update-content {
        display: none !important;
      }

      #pwaUpdateBanner .pwa-update-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        flex-wrap: nowrap !important;
        gap: 7px !important;
        width: 100% !important;
        min-height: 46px !important;
        box-sizing: border-box !important;
        padding: 6px 8px !important;
      }

      #pwaUpdateBanner .pwa-update-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
        min-height: 31px !important;
        height: 31px !important;
        margin: 0 !important;
        padding: 5px 9px !important;
        border: 1px solid var(--color-border, #334155) !important;
        border-radius: 8px !important;
        font-family: inherit !important;
        font-size: 11px !important;
        font-weight: 750 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
      }

      #pwaUpdateBanner .pwa-update-later {
        order: 3 !important;
        background: var(--color-surface-secondary, #1e293b) !important;
        color: var(--color-text-secondary, #cbd5e1) !important;
      }

      #pwaUpdateBanner .pwa-update-now {
        order: 2 !important;
        border-color: var(--color-primary, #3b82f6) !important;
        background: var(--color-primary, #3b82f6) !important;
        color: #fff !important;
      }

      #pwaUpdateBanner .pwa-update-whats-new {
        order: 1 !important;
        margin-right: auto !important;
        padding-inline: 5px !important;
        border: 0 !important;
        background: transparent !important;
        color: var(--color-primary, #60a5fa) !important;
        font-size: 11px !important;
        font-weight: 750 !important;
      }

      #pwaUpdateBanner .pwa-update-details {
        display: block !important;
        max-height: 0 !important;
        overflow: hidden !important;
        border-top: 0 solid var(--color-border, #334155) !important;
        transition:
          max-height .24s ease,
          border-width .2s ease !important;
      }

      #pwaUpdateBanner .pwa-update-details[data-open="true"] {
        max-height: min(52vh, 330px) !important;
        overflow-y: auto !important;
        border-top-width: 1px !important;
      }

      #pwaUpdateBanner .pwa-update-details-inner {
        padding: 10px 13px 12px !important;
      }

      #pwaUpdateBanner .pwa-update-details h3 {
        margin: 0 0 9px !important;
        color: var(--color-text, #f8fafc) !important;
        font-size: 12px !important;
        font-weight: 800 !important;
      }

      #pwaUpdateBanner .pwa-update-notes {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }

      #pwaUpdateBanner .pwa-update-notes li {
        display: block !important;
        margin: 0 !important;
        padding: 0 0 0 10px !important;
        border-left: 2px solid var(--color-primary, #3b82f6) !important;
      }

      #pwaUpdateBanner .pwa-update-notes strong {
        display: block !important;
        margin: 0 0 2px !important;
        color: var(--color-text, #f8fafc) !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }

      #pwaUpdateBanner .pwa-update-notes span {
        display: block !important;
        color: var(--color-text-secondary, #cbd5e1) !important;
        font-size: 10px !important;
        line-height: 1.45 !important;
      }

      #pwaUpdateBanner button:focus-visible {
        outline: 3px solid var(--color-primary, #3b82f6) !important;
        outline-offset: 2px !important;
      }

      #pwaUpdateBanner button:disabled {
        opacity: .55 !important;
        cursor: wait !important;
      }

      @media (max-width: 420px) {
        #pwaUpdateBanner.pwa-update-banner {
          width: calc(100% - 16px) !important;
          border-radius: 12px !important;
        }

        #pwaUpdateBanner .pwa-update-actions {
          min-height: 43px !important;
          gap: 5px !important;
          padding: 5px 7px !important;
        }

        #pwaUpdateBanner .pwa-update-button {
          min-height: 29px !important;
          height: 29px !important;
          padding: 4px 7px !important;
          font-size: 10px !important;
        }

        #pwaUpdateBanner .pwa-update-whats-new {
          font-size: 10px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #pwaUpdateBanner.pwa-update-banner,
        #pwaUpdateBanner * {
          animation: none !important;
          transition: none !important;
        }
      }
    `;

    doc.head.appendChild(style);
  }

  function buildReleaseNotes() {
    if (!banner || detailsPanel) return;

    const text = getText();
    const notes = RELEASE_NOTES[getLanguage()];

    detailsPanel = createElement("section", "pwa-update-details");
    detailsPanel.id = "pwaUpdateDetails";
    detailsPanel.dataset.open = "false";
    detailsPanel.setAttribute("aria-label", text.notesTitle);

    const inner = createElement("div", "pwa-update-details-inner");
    const heading = createElement("h3", "", text.notesTitle);
    const list = createElement("ul", "pwa-update-notes");

    notes.forEach(function (note) {
      const item = createElement("li");
      const name = createElement("strong", "", note[0]);
      const description = createElement("span", "", note[1]);

      item.append(name, description);
      list.appendChild(item);
    });

    inner.append(heading, list);
    detailsPanel.appendChild(inner);

    banner.appendChild(detailsPanel);

    whatsNewButton = createElement(
      "button",
      "pwa-update-button pwa-update-whats-new",
      text.whatsNew
    );

    whatsNewButton.type = "button";
    whatsNewButton.setAttribute("aria-expanded", "false");
    whatsNewButton.setAttribute("aria-controls", "pwaUpdateDetails");
    whatsNewButton.addEventListener("click", toggleReleaseNotes);

    const actions = banner.querySelector(".pwa-update-actions");

    if (actions) {
      actions.insertBefore(whatsNewButton, actions.firstChild);
    }
  }

  function toggleReleaseNotes() {
    if (!detailsPanel || !whatsNewButton) return;

    const open = detailsPanel.dataset.open !== "true";
    const text = getText();

    detailsPanel.dataset.open = open ? "true" : "false";
    detailsPanel.setAttribute("aria-hidden", open ? "false" : "true");
    whatsNewButton.setAttribute("aria-expanded", String(open));
    whatsNewButton.textContent = open ? text.hideNotes : text.whatsNew;
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

      if (whatsNewButton) whatsNewButton.disabled = true;

      banner.setAttribute("aria-busy", "true");
      return;
    }

    titleElement.textContent = text.title;
    messageElement.textContent = text.message;
    updateButton.textContent = text.update;
    laterButton.textContent = text.later;

    updateButton.disabled = false;
    laterButton.disabled = false;

    if (whatsNewButton) {
      whatsNewButton.disabled = false;
      whatsNewButton.textContent = text.whatsNew;
    }

    banner.removeAttribute("aria-busy");
  }

  function showBanner(worker) {
    if (!worker || dismissedThisPage || updateRequested || !banner) return;

    pendingWorker = worker;

    renderBanner();
    buildReleaseNotes();

    banner.hidden = false;

    global.requestAnimationFrame(function () {
      banner.classList.add("pwa-update-visible");
    });
  }

  function hideBanner() {
    if (!banner) return;

    banner.classList.remove("pwa-update-visible");

    global.setTimeout(function () {
      if (!banner.classList.contains("pwa-update-visible")) {
        banner.hidden = true;
      }
    }, 220);
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

    if (pendingWorker) showBanner(pendingWorker);

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
      handleActivationFailure(
        new Error("Service Worker activation timeout.")
      );
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

    injectStyles();

    /* Move it to the body end so page-flow styles cannot reserve space. */
    if (banner.parentElement !== doc.body) {
      doc.body.appendChild(banner);
    }

    buildReleaseNotes();

    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-atomic", "false");

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
    },

    getReleaseNotes() {
      return RELEASE_NOTES[getLanguage()].map(function (item) {
        return { title: item[0], description: item[1] };
      });
    }
  });

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

})(window);
