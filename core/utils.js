"use strict";

/* Shared utility functions */

(function (global) {
  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createId(prefix = "item") {
    const randomPart = Math.random().toString(36).slice(2, 9);
    return `${prefix}-${Date.now()}-${randomPart}`;
  }

  function formatDateTime(timestamp, language = "ne") {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(language === "en" ? "en-US" : "ne-NP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function isImageFile(file) {
    return Boolean(file && file.type && file.type.startsWith("image/"));
  }

  function isVideoFile(file) {
    return Boolean(file && file.type && file.type.startsWith("video/"));
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        reject(new TypeError("A valid file is required."));
        return;
      }

      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Unable to read the file."));
      reader.readAsDataURL(file);
    });
  }

  function debounce(callback, delay = 250) {
    let timerId = null;

    return function debouncedFunction(...args) {
      global.clearTimeout(timerId);

      timerId = global.setTimeout(() => {
        callback.apply(this, args);
      }, delay);
    };
  }

  global.HamroUtils = Object.freeze({
    escapeHTML,
    createId,
    formatDateTime,
    isImageFile,
    isVideoFile,
    readFileAsDataURL,
    debounce
  });
})(window);
