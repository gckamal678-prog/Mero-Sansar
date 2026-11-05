"use strict";

/* HAMRO SANSAR — GLOBAL TOAST SYSTEM */

(function (global) {
  const DEFAULT_DURATION = 3000;

  function getContainer() {
    let container = document.getElementById("toastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "true");

      document.body.appendChild(container);
    }

    return container;
  }

  function show(message, type = "info", duration = DEFAULT_DURATION) {
    const container = getContainer();

    const toast = document.createElement("div");

    const allowedTypes = [
      "success",
      "error",
      "warning",
      "info"
    ];

    const safeType = allowedTypes.includes(type)
      ? type
      : "info";

    toast.className = `toast toast-${safeType}`;
    toast.setAttribute("role", "status");
    toast.textContent = String(message || "");

    container.appendChild(toast);

    const time = Math.max(
      1000,
      Number(duration) || DEFAULT_DURATION
    );

    global.setTimeout(() => {
      toast.classList.add("toast-hiding");

      global.setTimeout(() => {
        toast.remove();
      }, 200);
    }, time);

    return toast;
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
    const container = getContainer();
    container.replaceChildren();
  }

  global.HamroToast = Object.freeze({
    show,
    success,
    error,
    warning,
    info,
    clear
  });

})(window);
