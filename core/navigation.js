"use strict";

/* Shared navigation controller */

(function (global) {
  const allowedPages = new Set([
    "home",
    "posts",
    "create",
    "messages",
    "profile",
    "settings",
    "friends"
  ]);

  function navigate(page) {
    if (!allowedPages.has(page)) {
      return false;
    }

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
    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;

      const page = button.dataset.page;
      navigate(page);
    });
  }

  global.HamroNavigation = Object.freeze({
    navigate,
    initializeNavigation,
    allowedPages: Array.from(allowedPages)
  });
})(window);
