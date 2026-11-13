
"use strict";

/*
 * MERO SANSAR — INLINE PWA UPDATE
 * Compact inline notice; never covers posts or images.
 * Expandable release notes and safe update activation.
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

  const monitored = new WeakSet();

  const NOTES = {
    ne: [
      ["प्रोफाइल", "प्रोफाइल बटन र टुल्स व्यवस्थित।"],
      ["Friends", "Friend Requests, Followers र Following सुधार।"],
      ["Stories", "Story Viewer, Highlights र Delete विकल्प सुधार।"],
      ["Safety", "Content Safety, Hide र Report विकल्प।"],
      ["Drafts र Insights", "Drafts र व्यक्तिगत गतिविधिको विवरण।"],
      ["Data Saver", "Image Loading र Data Saver सुधार।"],
      ["Messages", "सन्देश र Notifications विकल्प व्यवस्थित।"],
      ["Mobile र PWA", "मोबाइल UI, Toast र Update अनुभव सुधार।"]
    ],
    en: [
      ["Profile", "Profile buttons and tools reorganized."],
      ["Friends", "Friend requests, followers and following improved."],
      ["Stories", "Story viewer, highlights and delete options improved."],
      ["Safety", "Content safety, hide and report options."],
      ["Drafts and Insights", "Drafts and personal activity insights."],
      ["Data Saver", "Image loading and data saver improvements."],
      ["Messages", "Messaging and notification options improved."],
      ["Mobile and PWA", "Mobile UI, toast and update experience improved."]
    ]
  };

  const LABELS = {
    ne: {
      title: "✨ नयाँ अपडेट उपलब्ध",
      message: "नयाँ सुधारहरू हेर्नुहोस्",
      notes: "के नयाँ छ?",
      closeNotes: "विवरण बन्द",
      notesTitle: "यस अपडेटमा भएका सुधारहरू",
      update: "अपडेट",
      later: "पछि",
      updating: "अपडेट हुँदैछ…",
      waiting: "पर्खनुहोस्",
      waitMessage: "कृपया केही क्षण पर्खनुहोस्।"
    },
    en: {
      title: "✨ Update available",
      message: "See what's improved",
      notes: "What's new?",
      closeNotes: "Close details",
      notesTitle: "Improvements in this update",
      update: "Update",
      later: "Later",
      updating: "Updating…",
      waiting: "Please wait",
      waitMessage: "Please wait a moment."
    }
  };

  function language() {
    try {
      return global.KSKLanguage?.getLanguage?.() === "en" ? "en" : "ne";
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
        left: auto !important;
        right: auto !important;
        top: auto !important;
        bottom: auto !important;
        transform: none !important;
        z-index: 2 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        justify-content: center !important;
        flex-wrap: nowrap !important;
        gap: 0 !important;
        width: calc(100% - 24px) !important;
        max-width: 760px !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: min(65vh, 420px) !important;
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
        flex: 1 1 auto !important;
        align-items: center !important;
        min-width: 0 !important;
        padding: 7px 9px 0 !important;
      }

      #pwaUpdateBanner .pwa-update-content strong {
        display: block !important;
        margin: 0 !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        line-height: 1.35 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #pwaUpdateBanner .pwa-update-content p {
        display: none !important;
      }

      #pwaUpdateBanner .pwa-update-actions {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-end !important;
        flex-wrap: nowrap !important;
        gap: 5px !important;
        width: 100% !important;
        min-height: 37px !important;
        box-sizing: border-box !important;
        padding: 3px 7px 6px !important;
      }

      #pwaUpdateBanner .pwa-update-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
        min-height: 27px !important;
        height: 27px !important;
        margin: 0 !important;
        padding: 4px 8px !important;
        border: 1px solid var(--color-border, #334155) !important;
        border-radius: 7px !important;
        font: inherit !important;
        font-size: 10px !important;
        font-weight: 750 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
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
        max-height: min(48vh, 290px) !important;
        overflow-y: auto !important;
        border-top-width: 1px !important;
      }

      #pwaUpdateBanner .pwa-update-details-inner {
        padding: 9px 11px 11px !important;
      }

      #pwaUpdateBanner .pwa-update-details h3 {
        margin: 0 0 8px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }

      #pwaUpdateBanner .pwa-update-notes {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 7px !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }

      #pwaUpdateBanner .pwa-update-notes li {
        margin: 0 !important;
        padding-left: 9px !important;
        border-left: 2px solid var(--color-primary, #3b82f6) !important;
      }

      #pwaUpdateBanner .pwa-update-notes strong {
        display: block !important;
        margin-bottom: 2px !important;
        font-size: 10px !important;
        font-weight: 800 !important;
      }

      #pwaUpdateBanner .pwa-update-notes span {
        display: block !important;
        color: var(--color-text-secondary, #cbd5e1) !important;
        font-size: 10px !important;
        line-height: 1.4 !important;
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

  function buildNotes() {
    if (detailsPanel) return;

    const t = labels();
    const list = doc.createElement("ul");
    list.className = "pwa-update-notes";

    NOTES[language()].forEach(function (note) {
      const item = doc.createElement("li");
      const heading = doc.createElement("strong");
      const description = doc.createElement("span");

      heading.textContent = note[0];
      description.textContent = note[1];

      item.append(heading, description);
      list.appendChild(item);
    });

    detailsPanel = doc.createElement("section");
    detailsPanel.className = "pwa-update-details";
    detailsPanel.dataset.open = "false";
    detailsPanel.id = "pwaUpdateDetails";
    detailsPanel.setAttribute("aria-hidden", "true");

    const inner = doc.createElement("div");
    inner.className = "pwa-update-details-inner";

    const heading = doc.createElement("h3");
    heading.textContent = t.notesTitle;

    inner.append(heading, list);
    detailsPanel.appendChild(inner);
    banner.appendChild(detailsPanel);

    whatsNewButton = doc.createElement("button");
    whatsNewButton.type = "button";
    whatsNewButton.className =
      "pwa-update-button pwa-update-whats-new";
    whatsNewButton.textContent = t.notes;
    whatsNewButton.setAttribute("aria-expanded", "false");
    whatsNewButton.setAttribute("aria-controls", "pwaUpdateDetails");
    whatsNewButton.addEventListener("click", toggleNotes);

    const actions = banner.querySelector(".pwa-update-actions");

    if (actions) {
      actions.insertBefore(whatsNewButton, actions.firstChild);
    } else {
      console.error("PWA update actions container is missing.");
    }
  }

  function toggleNotes() {
    if (!detailsPanel || !whatsNewButton) return;

    const open = detailsPanel.dataset.open !== "true";
    const t = labels();

    detailsPanel.dataset.open = String(open);
    detailsPanel.setAttribute("aria-hidden", String(!open));
    whatsNewButton.setAttribute("aria-expanded", String(open));
    whatsNewButton.textContent = open ? t.closeNotes : t.notes;
  }

  function render() {
    if (!title || !message || !updateButton || !laterButton) return;

    const t = labels();

    title.textContent = updateRequested ? t.updating : t.title;
    message.textContent = updateRequested ? t.waitMessage : t.message;
    updateButton.textContent = updateRequested ? t.waiting : t.update;

    updateButton.disabled = updateRequested;
    laterButton.disabled = updateRequested;

    if (whatsNewButton) {
      whatsNewButton.disabled = updateRequested;
      if (!updateRequested) {
        whatsNewButton.textContent =
          detailsPanel?.dataset.open === "true" ? t.closeNotes : t.notes;
      }
    }

    if (detailsPanel) {
      const heading = detailsPanel.querySelector("h3");
      if (heading) heading.textContent = t.notesTitle;
    }

    banner?.setAttribute("aria-busy", String(updateRequested));
  }

  function show(worker) {
    if (!worker || dismissed || updateRequested || !banner) return;

    pendingWorker = worker;
    buildNotes();
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

    if (pendingWorker) show(pendingWorker);

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
      activationFailed(new Error("Service Worker activation timed out."));
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
        if (pendingWorker === worker) pendingWorker = null;
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

    /* Keep the banner in normal document flow below the app header. */
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
