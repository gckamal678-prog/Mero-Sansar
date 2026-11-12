
"use strict";

/*
 * MERO SANSAR — DATA SAVER
 * Browser-side loading preferences only.
 * Does not change core/data.js or upload/download user media.
 */
(function (global) {
  "use strict";

  if (global.KSKDataSaver) return;

  const STORAGE_KEY = "ksk_data_saver_v1";
  const STYLE_ID = "ksk-data-saver-style";
  let observer = null;
  let settingsObserver = null;
  let initialized = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const english = () => global.KSKLanguage?.getLanguage?.() === "en";
  const t = (ne, en) => english() ? en : ne;

  function readEnabled() {
    try {
      return global.localStorage.getItem(STORAGE_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function saveEnabled(enabled) {
    try {
      global.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
      return true;
    } catch (error) {
      console.error("Data Saver preference could not be saved.", error);
      return false;
    }
  }

  function notify(message, type = "info") {
    if (typeof global.KSKToast?.[type] === "function") {
      global.KSKToast[type](message);
    } else {
      global.KSKToast?.show?.(message, type);
    }
  }

  function ensureStyles() {
    if ($("#" + STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ksk-data-saver-card{
        margin:12px 0;padding:13px;
        border:1px solid var(--color-border);
        border-radius:13px;background:var(--color-surface-secondary)
      }
      .ksk-data-saver-card .ksk-setting-option{
        padding:0;border:0;background:transparent
      }
      .ksk-data-saver-card .ksk-data-saver-description{
        margin:8px 0 0;color:var(--color-muted);
        font-size:11px;line-height:1.5
      }
      html.ksk-data-saver img:not(.brand-logo-image){
        content-visibility:auto
      }
      html.ksk-data-saver .post-card img,
      html.ksk-data-saver .story-card img{
        max-width:100%
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function optimizeImage(image) {
    if (!(image instanceof HTMLImageElement)) return;

    if (image.classList.contains("brand-logo-image")) return;

    image.loading = "lazy";
    image.decoding = "async";

    try {
      image.fetchPriority = "low";
    } catch (error) {}
  }

  function optimizeImages(root = document) {
    if (!readEnabled()) return;

    if (root instanceof HTMLImageElement) {
      optimizeImage(root);
    }

    root.querySelectorAll?.("img").forEach(optimizeImage);
  }

  function apply() {
    const enabled = readEnabled();

    document.documentElement.classList.toggle(
      "ksk-data-saver",
      enabled
    );

    document.documentElement.dataset.dataSaver = enabled
      ? "on"
      : "off";

    if (enabled) optimizeImages(document);

    const toggle = $("[data-ksk-data-saver-toggle]");
    if (toggle) toggle.checked = enabled;

    return enabled;
  }

  function renderControl() {
    const body = $("#settingsBody");
    if (!body) return false;

    const active = global.KSKSettingsUI?.getActiveSection?.();

    if (active !== "data") return false;

    if (body.querySelector("[data-ksk-data-saver-card]")) {
      const existing = body.querySelector("[data-ksk-data-saver-toggle]");
      if (existing) existing.checked = readEnabled();
      return true;
    }

    const info = body.querySelector(".ksk-settings-info");

    const card = document.createElement("div");
    card.className = "ksk-settings-card ksk-data-saver-card";
    card.dataset.kskDataSaverCard = "true";

    card.innerHTML = `
      <div class="ksk-setting-option">
        <span class="ksk-setting-row-copy ksk-settings-row-copy">
          <strong>${t("Data Saver", "Data Saver")}</strong>
          <small>${t(
            "तस्वीरहरू ढिलो र कम प्राथमिकतामा लोड गर्ने",
            "Load images lazily with lower priority"
          )}</small>
        </span>

        <label class="ksk-switch">
          <input type="checkbox"
            data-ksk-data-saver-toggle
            ${readEnabled() ? "checked" : ""}>
          <span class="ksk-switch-track"></span>
        </label>
      </div>

      <p class="ksk-data-saver-description">
        ${t(
          "यो विकल्पले तस्वीरहरूको loading priority घटाउँछ र lazy loading प्रयोग गर्छ। यसले फोटो compress गर्दैन। पहिले नै लोड भएका सामग्रीको डेटा फिर्ता बचत हुँदैन।",
          "This lowers image loading priority and uses lazy loading. It does not compress photos or recover data already downloaded."
        )}
      </p>
    `;

    if (info) {
      info.parentNode.insertBefore(card, info);
    } else {
      body.appendChild(card);
    }

    return true;
  }

  function handleChange(event) {
    const toggle = event.target?.closest?.(
      "[data-ksk-data-saver-toggle]"
    );

    if (!toggle) return;

    if (!saveEnabled(toggle.checked)) {
      toggle.checked = readEnabled();
      notify(
        t("Data Saver सेटिङ सुरक्षित गर्न सकिएन।", "Could not save Data Saver preference."),
        "error"
      );
      return;
    }

    apply();

    notify(
      toggle.checked
        ? t("Data Saver सक्रिय भयो।", "Data Saver enabled.")
        : t("Data Saver बन्द भयो।", "Data Saver disabled."),
      "success"
    );
  }

  function initialize() {
    if (initialized || !document.body) return true;

    initialized = true;
    ensureStyles();
    apply();

    observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            optimizeImages(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const settingsBody = $("#settingsBody");

    if (settingsBody) {
      settingsObserver = new MutationObserver(() => renderControl());
      settingsObserver.observe(settingsBody, {
        childList: true,
        subtree: true
      });

      settingsBody.addEventListener("change", handleChange);
    }

    global.addEventListener("ksk:settings-change", apply);

    global.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY) apply();
    });

    renderControl();

    return true;
  }

  global.KSKDataSaver = Object.freeze({
    initialize,
    isEnabled: readEnabled,
    setEnabled(enabled) {
      if (!saveEnabled(Boolean(enabled))) return false;
      apply();
      return true;
    },
    apply
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);
