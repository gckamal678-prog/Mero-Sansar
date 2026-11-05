"use strict";

/* Shared toast notifications.
   Toast text must never include a domain name. */

(function (global) {
  function getContainer() {
    let container = document.getElementById("toastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }

    return container;
  }

  function show(message, type = "info", duration = 2600) {
    const container = getContainer();
    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.textContent = String(message || "");
    toast.setAttribute("role", "status");

    container.appendChild(toast);

    global.setTimeout(() => {
      toast.remove();
    }, Math.max(1000, Number(duration) || 2600));
  }

  global.HamroToast = Object.freeze({
    show,
    success(message, duration) {
      show(message, "success", duration);
    },
    error(message, duration) {
      show(message, "error", duration);
    },
    info(message, duration) {
      show(message, "info", duration);
    }
  });
})(window);
