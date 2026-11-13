
"use strict";

/*
 * MERO SANSAR — PWA UPDATE SYSTEM
 *
 * - Compact update banner
 * - Release notes automatically expanded
 * - Complete Nepali / English translation
 * - Release notes refresh when language changes
 * - Safe service worker activation
 */

(function (global) {
  "use strict";

  if (global.KSKPWAUpdate) return;

  const doc = global.document;
  const nav = global.navigator;
  const STYLE_ID = "ksk-pwa-inline-update-style";

  let registration = null;
  let pendingWorker = null;
  let initialized = false;
  let updateRequested = false;
  let dismissed = false;
  let activationTimer = null;

  let banner;
  let title;
  let message;
  let updateButton;
  let laterButton;
  let whatsNewButton;
  let detailsPanel;
  let notesList;
  let notesHeading;

  const monitored = new WeakSet();

  /*
   * वास्तविक रूपमा एपमा थपिएका सुविधा र सुधारहरू।
   * नेपाली र अंग्रेजी विवरण छुट्टाछुट्टै राखिएका छन्।
   */
  const NOTES = {
    ne: [
      [
        "प्रोफाइल पृष्ठ",
        "प्रोफाइलको सजावट, साथीहरूको सङ्ख्या, विवरण र मुख्य विकल्पहरू व्यवस्थित।"
      ],
      [
        "साथी व्यवस्थापन",
        "साथी अनुरोध, स्वीकार, अस्वीकार, फलो, अनफलो र साथीहरूको सूची सुधार।"
      ],
      [
        "स्टोरी सुविधा",
        "स्टोरी हेर्ने, प्रतिक्रिया दिने, जवाफ दिने, सङ्ग्रह गर्ने र हाइलाइट व्यवस्थापन सुधार।"
      ],
      [
        "पोस्ट सिर्जना",
        "पोस्ट लेख्ने बाकस, फोटो छान्ने र फोटोको पूर्वावलोकन गर्ने सुविधा सुधार।"
      ],
      [
        "सामग्री सुरक्षा",
        "अनुपयुक्त सामग्रीबारे चेतावनी, सामग्री लुकाउने र उजुरी गर्ने विकल्प थप।"
      ],
      [
        "सन्देश व्यवस्थापन",
        "सन्देश खोज्ने, महत्त्वपूर्ण कुराकानी छुट्याउने र स्थानीय समूह व्यवस्थापन सुधार।"
      ],
      [
        "सूचना व्यवस्थापन",
        "सूचनाको प्रकार छुट्याउने, पढिएको अवस्था र सूचना व्यवस्थापनका विकल्प सुधार।"
      ],
      [
        "मस्यौदा",
        "अधुरा पोस्ट सुरक्षित राख्ने र पछि फेरि खोल्ने सुविधा थप।"
      ],
      [
        "गतिविधि विवरण",
        "पोस्ट र प्रोफाइलसम्बन्धी व्यक्तिगत गतिविधिको विवरण हेर्ने सुविधा थप।"
      ],
      [
        "इन्टरनेट खर्च बचत",
        "फोटो लोड हुने तरिका सुधार र कम इन्टरनेट प्रयोग गर्ने विकल्प थप।"
      ],
      [
        "प्रोफाइल क्यूआर",
        "आफ्नो प्रोफाइलको क्यूआर कोड हेर्ने, साझा गर्ने र स्क्यान गर्ने सुविधा सुधार।"
      ],
      [
        "मोबाइल अनुभव",
        "मोबाइल पर्दामा देखिने बनावट, बटन, सूचना सन्देश र प्रयोगको सहजता सुधार।"
      ],
      [
        "गोपनीयता र पहुँच",
        "सेटिङ पूर्ववत् गर्दा देखिने संवाद, किबोर्ड प्रयोग र पर्दा पढ्ने सुविधामा सुधार।"
      ],
      [
        "त्रुटि सुधार",
        "स्टोरीमा प्रतिक्रिया दिँदा हुने झिलमिल समस्या र क्यूआर फोटो साझा गर्ने प्रक्रियामा सुधार।"
      ]
    ],

    en: [
      [
        "Profile",
        "Improved profile layout, friend counts, profile details and main actions."
      ],
      [
        "Friend Management",
        "Improved friend requests, accept, reject, follow, unfollow and friend lists."
      ],
      [
        "Stories",
        "Improved story viewing, reactions, replies, archiving and highlight management."
      ],
      [
        "Post Creation",
        "Improved post composer, photo selection and photo preview."
      ],
      [
        "Content Safety",
        "Added inappropriate-content warnings, hide controls and reporting options."
      ],
      [
        "Message Management",
        "Improved conversation search, pinned conversations and local group management."
      ],
      [
        "Notifications",
        "Improved notification categories, read status and notification controls."
      ],
      [
        "Drafts",
        "Added the ability to save unfinished posts and reopen them later."
      ],
      [
        "Activity Insights",
        "Added personal activity information for posts and profile activity."
      ],
      [
        "Data Saver",
        "Improved image loading and added options to reduce data usage."
      ],
      [
        "Profile QR Code",
        "Improved profile QR viewing, image sharing and scanning."
      ],
      [
        "Mobile Experience",
        "Improved mobile layout, buttons, notification messages and usability."
      ],
      [
        "Accessibility and Privacy",
        "Improved settings confirmation, keyboard navigation and accessibility."
      ],
      [
        "Bug Fixes",
        "Improved story reaction flickering and profile QR image sharing."
      ]
    ]
  };

  const LABELS = {
    ne: {
      title: "✨ नयाँ अपडेट उपलब्ध",
      message: "यस पटक थपिएका सुविधा र सुधारहरू तल हेर्नुहोस्।",
      notes: "विवरण बन्द गर्नुहोस्",
      openNotes: "अपडेटका विवरण हेर्नुहोस्",
      notesTitle: "यस अपडेटमा भएका नयाँ सुविधा र सुधारहरू",
      update: "अहिले अपडेट गर्नुहोस्",
      later: "पछि गर्नुहोस्",
      updating: "अपडेट हुँदैछ…",
      waiting: "पर्खनुहोस्",
      waitMessage: "नयाँ संस्करण सक्रिय हुँदैछ। कृपया केही क्षण पर्खनुहोस्।"
    },

    en: {
      title: "✨ Update Available",
      message: "See the new features and improvements included in this update.",
      notes: "Close details",
      openNotes: "View update details",
      notesTitle: "New Features and Improvements",
      update: "Update Now",
      later: "Later",
      updating: "Updating…",
      waiting: "Please wait",
      waitMessage: "The new version is activating. Please wait a moment."
    }
  };

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
    return LABELS[language()];
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
        z-index: 2 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        width: calc(100% - 24px) !important;
        max-width: 760px !important;
        max-height: min(75vh, 560px) !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 7px auto 9px !important;
        padding: 0 !important;
        overflow: hidden !important;
        border: 1px solid var(--color-border, #334155) !important;
        border-left: 3px solid var(--color-primary, #3b82f6) !important;
        border-radius: 11px !important;
        background: var(--color-surface, #111827) !important;
        color: var(--color-text, #f8fafc) !important;
        box-shadow: 0 2px 9px rgba(0,0,0,.12) !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        animation: kskPwaInlineIn .2s ease-out both !important;
      }

      #pwaUpdateBanner[hidden] {
        display: none !important;
      }

      #pwaUpdateBanner .pwa-update-content {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        min-width: 0 !important;
        padding: 8px 10px 3px !important;
      }

      #pwaUpdateBanner .pwa-update-content strong {
        display: block !important;
        margin: 0 !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        line-height: 1.4 !important;
        white-space: normal !important;
      }

      #pwaUpdateBanner .pwa-update-content p {
        display: block !important;
        margin: 3px 0 0 !important;
        font-size: 10px !important;
        line-height: 1.45 !important;
        color: var(--color-text-secondary, #cbd5e1) !important;
      }

      #pwaUpdateBanner .pwa-update-actions {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-end !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
        width: 100% !important;
        min-height: 38px !important;
        box-sizing: border-box !important;
        padding: 4px 8px 7px !important;
      }

      #pwaUpdateBanner .pwa-update-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
        min-height: 29px !important;
        height: auto !important;
        margin: 0 !important;
        padding: 5px 9px !important;
        border: 1px solid var(--color-border, #334155) !important;
        border-radius: 7px !important;
        font: inherit !important;
        font-size: 10px !important;
        font-weight: 750 !important;
        line-height: 1.3 !important;
        white-space: normal !important;
        cursor: pointer !important;
      }

      #pwaUpdateBanner .pwa-update-later {
        background: var(--color-surface-secondary, #1e293b) !important;
        color: var(--color-text-secondary, #cbd5e1) !important;
      }

      #pwaUpdateBanner .pwa-update-now {
        border-color: var(--color-primary, #3b82f6) !important;
        background: var(--color-primary, #3b82f6) !important;
        color: #fff !important;
      }

      #pwaUpdateBanner .pwa-update-whats-new {
        margin-right: auto !important;
        border: 0 !important;
        padding-inline: 4px !important;
        background: transparent !important;
        color: var(--color-primary, #60a5fa) !important;
      }

      #pwaUpdateBanner .pwa-update-details {
        display: block !important;
        max-height: 0 !important;
        overflow: hidden !important;
        border-top: 0 solid var(--color-border, #334155) !important;
        transition: max-height .22s ease, border-width .2s ease !important;
      }

      #pwaUpdateBanner .pwa-update-details[data-open="true"] {
        max-height: min(52vh, 390px) !important;
        overflow-y: auto !important;
        border-top-width: 1px !important;
      }

      #pwaUpdateBanner .pwa-update-details-inner {
        padding: 10px 11px 12px !important;
      }

      #pwaUpdateBanner .pwa-update-details h3 {
        margin: 0 0 10px !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        line-height: 1.45 !important;
      }

      #pwaUpdateBanner .pwa-update-notes {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 9px !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }

      #pwaUpdateBanner .pwa-update-notes li {
        margin: 0 !important;
        padding-left: 10px !important;
        border-left: 2px solid var(--color-primary, #3b82f6) !important;
      }

      #pwaUpdateBanner .pwa-update-notes strong {
        display: block !important;
        margin-bottom: 2px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        line-height: 1.4 !important;
      }

      #pwaUpdateBanner .pwa-update-notes span {
        display: block !important;
        color: var(--color-text-secondary, #cbd5e1) !important;
        font-size: 10px !important;
        line-height: 1.5 !important;
      }

      #pwaUpdateBanner button:focus-visible {
        outline: 2px solid var(--color-primary, #3b82f6) !important;
        outline-offset: 2px !important;
      }

      #pwaUpdateBanner button:disabled {
        opacity: .55 !important;
        cursor: wait !important;
      }

      @keyframes kskPwaInlineIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
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

  function renderNotes() {
    if (!notesList || !notesHeading) return;

    const t = labels();
    const currentNotes = NOTES[language()];

    notesHeading.textContent = t.notesTitle;
    notesList.replaceChildren();

    currentNotes.forEach(function (note) {
      const item = doc.createElement("li");
      const heading = doc.createElement("strong");
      const description = doc.createElement("span");

      heading.textContent = note[0];
      description.textContent = note[1];

      item.append(heading, description);
      notesList.appendChild(item);
    });
  }

  function buildNotes() {
    if (detailsPanel) {
      renderNotes();
      return;
    }

    const t = labels();

    detailsPanel = doc.createElement("section");
    detailsPanel.className = "pwa-update-details";
    detailsPanel.dataset.open = "false";
    detailsPanel.id = "pwaUpdateDetails";
    detailsPanel.setAttribute("aria-hidden", "true");

    const inner = doc.createElement("div");
    inner.className = "pwa-update-details-inner";

    notesHeading = doc.createElement("h3");

    notesList = doc.createElement("ul");
    notesList.className = "pwa-update-notes";

    inner.append(notesHeading, notesList);
    detailsPanel.appendChild(inner);
    banner.appendChild(detailsPanel);

    whatsNewButton = doc.createElement("button");
    whatsNewButton.type = "button";
    whatsNewButton.className =
      "pwa-update-button pwa-update-whats-new";
    whatsNewButton.setAttribute("aria-expanded", "false");
    whatsNewButton.setAttribute("aria-controls", "pwaUpdateDetails");
    whatsNewButton.addEventListener("click", toggleNotes);

    const actions = banner.querySelector(".pwa-update-actions");

    if (actions) {
      actions.insertBefore(whatsNewButton, actions.firstChild);
    } else {
      console.error("PWA update actions container is missing.");
    }

    renderNotes();
    whatsNewButton.textContent = t.openNotes;
  }

  function setNotesOpen(open) {
    if (!detailsPanel || !whatsNewButton) return;

    const t = labels();

    detailsPanel.dataset.open = String(open);
    detailsPanel.setAttribute("aria-hidden", String(!open));
    whatsNewButton.setAttribute("aria-expanded", String(open));
    whatsNewButton.textContent = open ? t.notes : t.openNotes;
  }

  function toggleNotes() {
    if (!detailsPanel) return;

    setNotesOpen(detailsPanel.dataset.open !== "true");
  }

  function render() {
    if (!title || !message || !updateButton || !laterButton) return;

    const t = labels();

    title.textContent = updateRequested ? t.updating : t.title;
    message.textContent = updateRequested ? t.waitMessage : t.message;
    updateButton.textContent = updateRequested ? t.waiting : t.update;
    laterButton.textContent = t.later;

    updateButton.disabled = updateRequested;
    laterButton.disabled = updateRequested;

    if (whatsNewButton) {
      whatsNewButton.disabled = updateRequested;
    }

    if (detailsPanel) {
      renderNotes();

      if (whatsNewButton) {
        whatsNewButton.textContent =
          detailsPanel.dataset.open === "true"
            ? t.notes
            : t.openNotes;
      }
    }

    banner?.setAttribute("aria-busy", String(updateRequested));
  }

  function show(worker) {
    if (!worker || dismissed || updateRequested || !banner) return;

    pendingWorker = worker;

    buildNotes();

    /*
     * नयाँ अपडेट देखिँदा विवरण आफैँ खुल्छ।
     * प्रयोगकर्ताले चाहेको खण्डमा बन्द गर्न सक्छ।
     */
    setNotesOpen(true);

    render();
    banner.hidden = false;
  }

  function hide() {
    if (banner) banner.hidden = true;
  }

  function clearTimer() {
    if (activationTimer !== null) {
      global.clearTimeout(activationTimer);
      activationTimer = null;
    }
  }

  function later() {
    if (updateRequested) return;

    dismissed = true;
    hide();
  }

  function activationFailed(error) {
    clearTimer();
    updateRequested = false;
    render();

    if (pendingWorker) {
      dismissed = false;
      show(pendingWorker);
    }

    console.error("PWA update activation failed:", error);
  }

  function updateNow() {
    if (updateRequested) return;

    const worker = registration?.waiting || pendingWorker;

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
      worker.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      activationFailed(error);
    }
  }

  function controllerChanged() {
    if (!updateRequested) return;

    clearTimer();
    updateRequested = false;
    global.location.reload();
  }

  function monitor(worker) {
    if (!worker || monitored.has(worker)) return;

    monitored.add(worker);

    function check() {
      if (worker.state === "redundant") {
        if (pendingWorker === worker) {
          pendingWorker = null;
        }
        return;
      }

      if (worker.state !== "installed") return;

      if (!registration.active) {
        try {
          worker.postMessage({ type: "SKIP_WAITING" });
        } catch (error) {
          console.error("Initial worker activation failed:", error);
        }
        return;
      }

      show(worker);
    }

    worker.addEventListener("statechange", check);
    check();
  }

  function setupRegistration() {
    if (!registration) return;

    if (registration.waiting && registration.active) {
      show(registration.waiting);
    }

    registration.addEventListener("updatefound", function () {
      monitor(registration.installing);
    });

    if (registration.installing) {
      monitor(registration.installing);
    }

    if (typeof registration.update === "function") {
      registration.update().catch(function (error) {
        console.warn("PWA update check failed:", error);
      });
    }
  }

  function registerWorker() {
    if (!nav.serviceWorker || !global.isSecureContext) return;

    nav.serviceWorker.register("./sw.js", { scope: "./" })
      .then(function (result) {
        registration = result;
        setupRegistration();
      })
      .catch(function (error) {
        console.error("Service Worker registration failed:", error);
      });
  }

  function initialize() {
    if (initialized) return true;

    if (!("serviceWorker" in nav) || !global.isSecureContext) {
      return false;
    }

    banner = doc.getElementById("pwaUpdateBanner");
    title = doc.getElementById("pwaUpdateTitle");
    message = doc.getElementById("pwaUpdateMessage");
    updateButton = doc.getElementById("pwaUpdateNow");
    laterButton = doc.getElementById("pwaUpdateLater");

    if (!banner || !title || !message || !updateButton || !laterButton) {
      console.error("PWA update HTML elements are missing.");
      return false;
    }

    addStyles();

    /* Keep the banner below the app header in normal document flow. */
    const header = doc.querySelector(".app-header");

    if (header && banner.previousElementSibling !== header) {
      header.insertAdjacentElement("afterend", banner);
    }

    buildNotes();

    banner.setAttribute("role", "region");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-atomic", "false");

    updateButton.addEventListener("click", updateNow);
    laterButton.addEventListener("click", later);

    global.addEventListener("ksk:language-change", render);

    nav.serviceWorker.addEventListener(
      "controllerchange",
      controllerChanged
    );

    initialized = true;

    if (doc.readyState === "complete") {
      registerWorker();
    } else {
      global.addEventListener("load", registerWorker, { once: true });
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
      return registration?.update?.() || Promise.resolve(null);
    },

    showUpdateBanner() {
      const worker = registration?.waiting || pendingWorker;

      if (!worker) return false;

      show(worker);
      return true;
    },

    getReleaseNotes() {
      return NOTES[language()].map(function (item) {
        return {
          title: item[0],
          description: item[1]
        };
      });
    }
  });

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

})(window);
