
"use strict";

/* =========================================================
   KSK — SHARED UTILITY ENGINE
   Reusable helpers for all application modules.
========================================================= */

(function (global) {

  /* SAFE HTML */

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* UNIQUE ID */

  function createId(prefix = "item") {
    const safePrefix = String(prefix || "item")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40) || "item";

    let uniquePart;

    if (
      global.crypto &&
      typeof global.crypto.randomUUID === "function"
    ) {
      uniquePart = global.crypto.randomUUID();
    } else {
      const randomPart = Math.random().toString(36).slice(2, 12);
      uniquePart = `${Date.now()}-${randomPart}`;
    }

    return `${safePrefix}-${uniquePart}`;
  }

  /* DATE AND TIME */

  function formatDateTime(timestamp, language) {
    const date = timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const selectedLanguage = language ||
      global.KSKLanguage?.getLanguage() ||
      "ne";

    const locale = selectedLanguage === "en"
      ? "en-US"
      : "ne-NP";

    try {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function formatDate(timestamp, language) {
    const date = timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const selectedLanguage = language ||
      global.KSKLanguage?.getLanguage() ||
      "ne";

    return new Intl.DateTimeFormat(
      selectedLanguage === "en" ? "en-US" : "ne-NP",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    ).format(date);
  }

  function formatTime(timestamp, language) {
    const date = timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const selectedLanguage = language ||
      global.KSKLanguage?.getLanguage() ||
      "ne";

    return new Intl.DateTimeFormat(
      selectedLanguage === "en" ? "en-US" : "ne-NP",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }

  /* FILE TYPE CHECKS
     These helpers only inspect file types.
     They do not upload or store files.
  */

  function isImageFile(file) {
    return Boolean(
      file &&
      typeof file.type === "string" &&
      file.type.startsWith("image/")
    );
  }

  function isVideoFile(file) {
    return Boolean(
      file &&
      typeof file.type === "string" &&
      file.type.startsWith("video/")
    );
  }

  /* FILE READING */

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (
        typeof File === "undefined" ||
        !(file instanceof File)
      ) {
        reject(new TypeError("मान्य फाइल आवश्यक छ।"));
        return;
      }

      if (typeof FileReader === "undefined") {
        reject(new Error("फाइल पढ्न सकिएन।"));
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        resolve(String(reader.result));
      };

      reader.onerror = () => {
        reject(new Error("फाइल पढ्न सकिएन।"));
      };

      reader.onabort = () => {
        reject(new Error("फाइल पढ्ने प्रक्रिया रोकियो।"));
      };

      reader.readAsDataURL(file);
    });
  }

  /* DEBOUNCE */

  function debounce(callback, delay = 250) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "KSKUtils.debounce requires a function."
      );
    }

    let timerId = null;

    return function debouncedFunction(...args) {
      const context = this;

      global.clearTimeout(timerId);

      timerId = global.setTimeout(() => {
        callback.apply(context, args);
      }, Math.max(0, Number(delay) || 0));
    };
  }

  /* THROTTLE */

  function throttle(callback, delay = 250) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "KSKUtils.throttle requires a function."
      );
    }

    let lastCall = 0;
    let timerId = null;

    return function throttledFunction(...args) {
      const context = this;
      const now = Date.now();
      const remaining = delay - (now - lastCall);

      if (remaining <= 0) {
        global.clearTimeout(timerId);
        timerId = null;
        lastCall = now;
        callback.apply(context, args);
      } else if (!timerId) {
        timerId = global.setTimeout(() => {
          lastCall = Date.now();
          timerId = null;
          callback.apply(context, args);
        }, remaining);
      }
    };
  }

  /* OBJECT HELPERS */

  function isPlainObject(value) {
    if (!value || typeof value !== "object") {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  }

  function cloneObject(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (error) {
        // Use JSON fallback for supported data.
      }
    }

    return JSON.parse(JSON.stringify(value));
  }

  /* STRING HELPERS */

  function truncateText(value, maxLength = 100) {
    const text = String(value ?? "");
    const limit = Math.max(0, Number(maxLength) || 0);

    if (text.length <= limit) {
      return text;
    }

    return text.slice(0, limit).trimEnd() + "…";
  }

  function capitalize(value) {
    const text = String(value ?? "");

    if (!text) return "";

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /* ARRAY HELPERS */

  function uniqueArray(items) {
    return Array.isArray(items)
      ? [...new Set(items)]
      : [];
  }

  /* PUBLIC API */

  global.KSKUtils = Object.freeze({
    escapeHTML,
    createId,

    formatDateTime,
    formatDate,
    formatTime,

    isImageFile,
    isVideoFile,
    readFileAsDataURL,

    debounce,
    throttle,

    isPlainObject,
    cloneObject,

    truncateText,
    capitalize,
    uniqueArray
  });

})(window);
