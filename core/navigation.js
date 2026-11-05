
"use strict";

/* =========================================================
   KSK — GLOBAL NAVIGATION CONTROLLER
   Centralized application page navigation.
========================================================= */

(function (global) {

  const ALLOWED_PAGES = Object.freeze([
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

  const initializedRoots = new WeakSet();

  function isValidPage(page) {
    return (
      typeof page === "string" &&
      ALLOWED_PAGES.includes(page)
    );
  }

  function getCurrentPage() {
    return global.KSKState?.getState()?.currentPage || "home";
  }

  function navigate(page, options = {}) {
    if (!isValidPage(page)) {
      global.KSKToast?.error(
        global.KSKLanguage?.translate("pageUnavailable") ||
        "यो पृष्ठ उपलब्ध छैन।"
      );

      return false;
    }

    const navigationOptions = (
      options &&
      typeof options === "object" &&
      !Array.isArray(options)
    ) ? { ...options } : {};

    /* OPEN POST COMPOSER */

    if (page === "create") {
      global.dispatchEvent(
        new CustomEvent("ksk:open-composer", {
          detail: {
            options: navigationOptions
          }
        })
      );

      return true;
    }

    /* UPDATE SHARED STATE */

    global.KSKState?.setCurrentPage(page);

    /* NOTIFY APPLICATION */

    global.dispatchEvent(
      new CustomEvent("ksk:navigate", {
        detail: {
          page,
          options: navigationOptions
        }
      })
    );

    return true;
  }

  function initializeNavigation(root = document) {
    if (
      !root ||
      typeof root.addEventListener !== "function" ||
      initializedRoots.has(root)
    ) {
      return false;
    }

    initializedRoots.add(root);

    root.addEventListener("click", function (event) {
      const target = event.target;

      if (!target || typeof target.closest !== "function") {
        return;
      }

      const trigger = target.closest("[data-page]");

      if (!trigger || !root.contains(trigger)) {
        return;
      }

      if (
        trigger.disabled ||
        trigger.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      event.preventDefault();

      const page = trigger.dataset.page;

      navigate(page);
    });

    return true;
  }

  function getPages() {
    return [...ALLOWED_PAGES];
  }

  function isCurrentPage(page) {
    return isValidPage(page) && getCurrentPage() === page;
  }

  function refreshNavigation() {
    const currentPage = getCurrentPage();

    document.querySelectorAll("[data-page]").forEach(element => {
      const active = element.dataset.page === currentPage;

      element.classList.toggle("active", active);

      if (active) {
        element.setAttribute("aria-current", "page");
      } else {
        element.removeAttribute("aria-current");
      }
    });

    return currentPage;
  }

  /* PUBLIC API */

  global.KSKNavigation = Object.freeze({
    navigate,
    getCurrentPage,
    getPages,
    isValidPage,
    isCurrentPage,
    initializeNavigation,
    refreshNavigation
  });

  /* INITIALIZATION */

  function initialize() {
    initializeNavigation(document);
    refreshNavigation();

    global.addEventListener("ksk:navigate", refreshNavigation);

    global.addEventListener("ksk:state-change", function (event) {
      if (event.detail?.change === "page-change") {
        refreshNavigation();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})(window);
