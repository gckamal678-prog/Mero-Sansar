
"use strict";

/* =========================================================
   KSK — GLOBAL TOAST NOTIFICATION SYSTEM
   Friendly messages, duplicate control and safe cleanup.
========================================================= */

(function (global) {
  "use strict";

  const DEFAULT_DURATION = 3000;
  const EXIT_DURATION = 200;
  const MAX_VISIBLE_TOASTS = 4;
  const DUPLICATE_WINDOW = 900;

  const ALLOWED_TYPES = Object.freeze([
    "success",
    "error",
    "warning",
    "info"
  ]);

  let container = null;
  let activeToasts = [];
  let lastMessage = "";
  let lastMessageAt = 0;
  let lastType = "";
  let lastHandle = null;

  function getLanguage() {
    try {
      return global.KSKLanguage?.getLanguage?.() === "en"
        ? "en"
        : "ne";
    } catch (error) {
      return "ne";
    }
  }

  function friendlyTechnicalMessage(type, networkError) {
    const english = getLanguage() === "en";

    if (networkError) {
      return english
        ? "Connection problem. Check your internet and try again."
        : "जडानमा समस्या आयो। इन्टरनेट जाँच गरेर फेरि प्रयास गर्नुहोस्।";
    }

    if (type === "warning") {
      return english
        ? "This action could not be completed right now."
        : "यो काम अहिले पूरा हुन सकेन।";
    }

    return english
      ? "Something went wrong. Please try again."
      : "केही समस्या आयो। कृपया फेरि प्रयास गर्नुहोस्।";
  }

  function normalizeMessage(message, type) {
    if (message === null || message === undefined) {
      return "";
    }

    let value = "";

    if (message instanceof Error) {
      value = String(message.message || "");
    } else if (
      typeof message === "object" &&
      typeof message.message === "string"
    ) {
      value = message.message;
    } else {
      value = String(message);
    }

    value = value.trim();

    if (!value) {
      return "";
    }

    const networkError =
      /failed to fetch|networkerror|network error|network request failed|load failed|err_internet_disconnected|err_network_changed|err_connection|connection timed out|the internet connection appears to be offline/i.test(value);

    const technicalError =
      networkError ||
      /^(?:typeerror|referenceerror|syntaxerror|aborterror|quotaexceedederror|securityerror)\s*:/i.test(value) ||
      /\bat\s+[\w.$<>]+\s*\(/i.test(value) ||
      /https?:\/\/\S+/i.test(value) ||
      value.length > 240 ||
      /\n\s*at\s/.test(value);

    if (technicalError) {
      return friendlyTechnicalMessage(type, networkError);
    }

    return value.replace(/\s+/g, " ");
  }

  function normalizeDuration(duration) {
    const value = Number(duration);

    if (!Number.isFinite(value) || value <= 0) {
      return DEFAULT_DURATION;
    }

    return Math.min(15000, Math.max(1000, value));
  }

  function getContainer() {
    if (container && container.isConnected) {
      return container;
    }

    container = global.document.getElementById("toastContainer");

    if (!container) {
      container = global.document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "true");
      global.document.body.appendChild(container);
    }

    return container;
  }

  function removeRecord(record, immediate = false) {
    if (!record || record.removed) {
      return;
    }

    record.removed = true;
    activeToasts = activeToasts.filter(item => item !== record);

    if (record.hideTimer !== null) {
      global.clearTimeout(record.hideTimer);
      record.hideTimer = null;
    }

    if (record.removeTimer !== null) {
      global.clearTimeout(record.removeTimer);
      record.removeTimer = null;
    }

    if (immediate) {
      record.element.remove();
      return;
    }

    record.element.classList.add("toast-hiding");

    record.removeTimer = global.setTimeout(() => {
      record.element.remove();
      record.removeTimer = null;
    }, EXIT_DURATION);
  }

  function show(message, type = "info", duration = DEFAULT_DURATION) {
    const safeType = ALLOWED_TYPES.includes(type)
      ? type
      : "info";

    const text = normalizeMessage(message, safeType);

    if (!text) {
      return null;
    }

    const now = Date.now();

    if (
      text === lastMessage &&
      safeType === lastType &&
      now - lastMessageAt < DUPLICATE_WINDOW &&
      lastHandle?.element?.isConnected
    ) {
      return lastHandle;
    }

    const toast = global.document.createElement("div");

    toast.className = "toast toast-" + safeType;
    toast.setAttribute(
      "role",
      safeType === "error" ? "alert" : "status"
    );
    toast.textContent = text;
    toast.dataset.kskToast = "true";

    const record = {
      element: toast,
      hideTimer: null,
      removeTimer: null,
      removed: false
    };

    const handle = Object.freeze({
      element: toast,
      close() {
        removeRecord(record);
      }
    });

    const host = getContainer();
    host.appendChild(toast);
    activeToasts.push(record);

    while (activeToasts.length > MAX_VISIBLE_TOASTS) {
      removeRecord(activeToasts[0], true);
    }

    record.hideTimer = global.setTimeout(() => {
      removeRecord(record);
    }, normalizeDuration(duration));

    lastMessage = text;
    lastMessageAt = now;
    lastType = safeType;
    lastHandle = handle;

    return handle;
  }

  function success(message, duration) {
    return show(message, "success", duration);
  }

  function error(message, duration) {
    return show(message, "error", duration);
  }

  function warning(message, duration) {
    return show(message, "warning", duration);
  }

  function info(message, duration) {
    return show(message, "info", duration);
  }

  function clear() {
    activeToasts.slice().forEach(record => {
      removeRecord(record, true);
    });

    activeToasts = [];
    lastMessage = "";
    lastMessageAt = 0;
    lastType = "";
    lastHandle = null;
  }

  function initialize() {
    getContainer();
    return true;
  }

  global.KSKToast = Object.freeze({
    show,
    success,
    error,
    warning,
    info,
    clear,
    initialize
  });

})(window);
