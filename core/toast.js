
"use strict";

/* =========================================================
   KSK — GLOBAL TOAST NOTIFICATION SYSTEM
   Clear, safe and consistent user notifications.
========================================================= */

(function (global) {

  const DEFAULT_DURATION = 3000;
  const EXIT_DURATION = 200;

  const ALLOWED_TYPES = Object.freeze([
    "success",
    "error",
    "warning",
    "info"
  ]);

  let container = null;

  function getContainer() {
    if (container && container.isConnected) {
      return container;
    }

    container = document.getElementById("toastContainer");

    if (!container) {
      container = document.createElement("div");

      container.id = "toastContainer";
      container.className = "toast-container";

      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");

      document.body.appendChild(container);
    }

    return container;
  }

  function normalizeMessage(message) {
    if (message === null || message === undefined) {
      return "";
    }

    return String(message).trim();
  }

  function normalizeDuration(duration) {
    const value = Number(duration);

    if (!Number.isFinite(value) || value <= 0) {
      return DEFAULT_DURATION;
    }

    return Math.max(1000, value);
  }

  function show(message, type = "info", duration = DEFAULT_DURATION) {
    const text = normalizeMessage(message);

    if (!text) return null;

    const safeType = ALLOWED_TYPES.includes(type)
      ? type
      : "info";

    const toast = document.createElement("div");

    toast.className = `toast toast-${safeType}`;
    toast.setAttribute(
      "role",
      safeType === "error" ? "alert" : "status"
    );

    toast.textContent = text;

    getContainer().appendChild(toast);

    const displayTime = normalizeDuration(duration);

    const hideTimer = global.setTimeout(() => {
      toast.classList.add("toast-hiding");

      global.setTimeout(() => {
        toast.remove();
      }, EXIT_DURATION);
    }, displayTime);

    toast.dataset.kskToast = "true";

    return Object.freeze({
      element: toast,
      close() {
        global.clearTimeout(hideTimer);
        toast.classList.add("toast-hiding");

        global.setTimeout(() => {
          toast.remove();
        }, EXIT_DURATION);
      }
    });
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
    const currentContainer = getContainer();
    currentContainer.replaceChildren();
  }

  function initialize() {
    getContainer();
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
