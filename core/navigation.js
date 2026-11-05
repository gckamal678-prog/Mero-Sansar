"use strict";

/* HAMRO SANSAR — GLOBAL NAVIGATION CONTROLLER */

(function (global) {
  const allowedPages = [
    "home",
    "posts",
    "create",
    "friends",
    "messages",
    "notifications",
    "profile",
    "settings",
    "saved"
  ];

  function isValidPage(page) {
    return allowedPages.includes(page);
  }

  function navigate(page, options = {}) {
    if (!isValidPage(page)) {
      global.HamroToast?.error("यो पृष्ठ उपलब्ध छैन।");
      return false;
    }

    if (page === "create") {
      global.dispatchEvent(
        new CustomEvent("hamro:open-composer")
      );

      return true;
    }

    if (global.HamroState) {
      global.HamroState.setCurrentPage(page);
    }

    global.dispatchEvent(
      new CustomEvent("hamro:navigate", {
        detail: {
          page,
          options
        }
      })
    );

    return true;
  }

  function getCurrentPage() {
    return global.HamroState?.state?.currentPage || "home";
  }

  function initializeNavigation(root = document) {
    if (!root || root.dataset.hamroNavigationReady === "true") {
      return;
    }

    root.dataset.hamroNavigationReady = "true";

    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");

      if (!button || !root.contains(button)) {
        return;
      }

      navigate(button.dataset.page);
    });
  }

  function getPages() {
    return [...allowedPages];
  }

  global.HamroNavigation = Object.freeze({
    navigate,
    getCurrentPage,
    getPages,
    isValidPage,
    initializeNavigation
  });

})(window);
