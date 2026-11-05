"use strict";

/* Hamro Sansar — Shared Navigation Controller */
(function (global) {
  const allowedPages = new Set([
    "home",
    "posts",
    "create",
    "friends",
    "messages",
    "notifications",
    "profile",
    "settings",
    "saved"
  ]);

  function navigate(page) {
    if (!allowedPages.has(page)) return false;

    if (page === "create") {
      global.dispatchEvent(new CustomEvent("hamro:open-composer"));
      return true;
    }

    if (global.HamroState) {
      global.HamroState.setCurrentPage(page);
    }

    global.dispatchEvent(
      new CustomEvent("hamro:navigate", {
        detail: { page }
      })
    );

    return true;
  }

  function initializeNavigation(root = document) {
    if (root.dataset.hamroNavigationReady === "true") return;
    root.dataset.hamroNavigationReady = "true";

    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;

      const page = button.dataset.page;
      if (!allowedPages.has(page)) return;

      navigate(page);
    });
  }

  global.HamroNavigation = Object.freeze({
    navigate,
    initializeNavigation,
    allowedPages: [...allowedPages]
  });
})(window);
