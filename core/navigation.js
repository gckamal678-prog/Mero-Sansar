
"use strict";

/*
 * =========================================================
 * KSK — NAVIGATION CONTROLLER
 * Mero-Sansar
 *
 * SINGLE RESPONSIBILITY:
 * - Navigate between pages
 * - Read current page from KSKState
 * - Update active navigation controls
 * - Render the selected page
 * - Dispatch navigation events
 *
 * STATE OWNER:
 * - KSKState (core/state.js)
 *
 * APPLICATION OWNER:
 * - KSKApp (app.js)
 *
 * DOES NOT:
 * - Maintain a second currentPage variable
 * - Manage post data
 * - Manage application initialization
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKNavigation) return;

  /* =======================================================
     CONSTANTS
  ======================================================= */

  const VALID_PAGES = new Set([
    "home",
    "friends",
    "messages",
    "notifications",
    "saved",
    "profile"
  ]);

  const PAGE_TITLES = {
    home: {
      ne: "गृहपृष्ठ",
      en: "Home"
    },

    friends: {
      ne: "साथीहरू",
      en: "Friends"
    },

    messages: {
      ne: "सन्देश",
      en: "Messages"
    },

    notifications: {
      ne: "सूचनाहरू",
      en: "Notifications"
    },

    saved: {
      ne: "सेभ गरिएका पोस्ट",
      en: "Saved Posts"
    },

    profile: {
      ne: "प्रोफाइल",
      en: "Profile"
    }
  };

  let initialized = false;
  let clickRoot = null;

  /* =======================================================
     STATE ACCESS
     KSKState IS THE ONLY CURRENT PAGE OWNER.
  ======================================================= */

  function getState() {
    return global.KSKState?.getState?.() || null;
  }

  function getCurrentPage() {
    const state = getState();

    const page = normalizePage(
      state?.currentPage || "home"
    );

    return isValidPage(page) ? page : "home";
  }

  function updatePageState(page) {
    const state = global.KSKState;

    if (typeof state?.setCurrentPage !== "function") {
      console.error(
        "KSKNavigation: KSKState is unavailable."
      );

      return false;
    }

    return state.setCurrentPage(page);
  }

  /* =======================================================
     PAGE VALIDATION
  ======================================================= */

  function normalizePage(page) {
    const value = String(page || "home")
      .trim()
      .toLowerCase();

    return value === "posts" ? "home" : value;
  }

  function isValidPage(page) {
    return VALID_PAGES.has(normalizePage(page));
  }

  /* =======================================================
     LANGUAGE
  ======================================================= */

  function getLanguage() {
    const language =
      global.KSKLanguage?.getLanguage?.() ||
      getState()?.language;

    return language === "en" ? "en" : "ne";
  }

  function getPageTitle(page) {
    return PAGE_TITLES[page]?.[getLanguage()] ||
      PAGE_TITLES.home[getLanguage()];
  }

  /* =======================================================
     PAGE MODULE RENDERING
  ======================================================= */

  function getPageHTML(page) {
    switch (page) {

      case "friends":
        return global.KSKFriendsPage?.render?.();

      case "messages":
        return global.KSKMessagesPage?.render?.();

      case "notifications":
        return global.KSKNotificationsPage?.render?.();

      case "saved":
        return global.KSKSavedPage?.render?.({
          isEnglish: getLanguage() === "en",
          renderPost
        });

      case "profile":
        return global.KSKProfilePage?.render?.({
          renderPost
        });

      default:
        return null;
    }
  }

  /* =======================================================
     SHARED POST CARD
     HTML GENERATION BELONGS TO KSKPostCard.
  ======================================================= */

  function renderPost(post) {
    const postCard = global.KSKPostCard;

    if (typeof postCard?.render !== "function") {
      console.error(
        "KSKNavigation: KSKPostCard is unavailable."
      );

      return "";
    }

    return postCard.render(post, {
      isEnglish: getLanguage() === "en",

      formatDate: value => {
        if (
          typeof global.KSKUtils?.formatDateTime === "function"
        ) {
          return global.KSKUtils.formatDateTime(
            value,
            getLanguage()
          );
        }

        return "";
      }
    });
  }

  /* =======================================================
     ACTIVE NAVIGATION
  ======================================================= */

  function updateActiveNavigation() {
    const currentPage = getCurrentPage();

    document
      .querySelectorAll("[data-page], [data-nav-page]")
      .forEach(node => {

        const page = normalizePage(
          node.dataset.page ||
          node.dataset.navPage ||
          ""
        );

        const active =
          isValidPage(page) &&
          page === currentPage;

        node.classList.toggle("active", active);
        node.classList.toggle("is-active", active);

        if (active) {
          node.setAttribute("aria-current", "page");
        } else {
          node.removeAttribute("aria-current");
        }
      });
  }

  /* =======================================================
     PAGE VISIBILITY
  ======================================================= */

  function showHomePage() {
    document
      .getElementById("homePage")
      ?.classList.remove("hidden");

    document
      .getElementById("otherPage")
      ?.classList.add("hidden");
  }

  function showOtherPage(page, html) {
    const home = document.getElementById("homePage");
    const other = document.getElementById("otherPage");

    const title = document.getElementById("otherPageTitle");
    const content = document.getElementById("otherPageText");

    if (!other || !content) {
      console.error(
        "KSKNavigation: Other page containers are missing."
      );

      return false;
    }

    home?.classList.add("hidden");
    other.classList.remove("hidden");

    if (title) {
      title.textContent = getPageTitle(page);
    }

    content.innerHTML = html;

    /* Media is refreshed after inserting page HTML. */

    refreshPageMedia();

    return true;
  }

  /* =======================================================
     MEDIA REFRESH
  ======================================================= */

  function refreshPageMedia() {
    global.KSKMediaUI?.refresh?.();
    global.KSKProfileMediaUI?.refresh?.();
  }

  /* =======================================================
     PAGE ERROR
  ======================================================= */

  function showPageError() {
    return getLanguage() === "en"
      ? '<div class="empty-state">This page is temporarily unavailable. Please try again.</div>'
      : '<div class="empty-state">यो पृष्ठ अहिले उपलब्ध छैन। कृपया फेरि प्रयास गर्नुहोस्।</div>';
  }

  /* =======================================================
     REFRESH CURRENT PAGE
  ======================================================= */

  function refreshCurrentPage() {
    const page = getCurrentPage();

    updateActiveNavigation();

    if (page === "home") {
      showHomePage();
      return true;
    }

    try {
      const html = getPageHTML(page);

      if (typeof html !== "string") {
        showOtherPage(page, showPageError());

        console.error(
          "KSKNavigation: Invalid page content:",
          page
        );

        return false;
      }

      return showOtherPage(page, html);

    } catch (error) {

      console.error(
        "KSKNavigation: Page rendering failed:",
        page,
        error
      );

      showOtherPage(page, showPageError());

      return false;
    }
  }

  /* =======================================================
     NAVIGATION EVENTS
  ======================================================= */

  function dispatchNavigationEvent(page, options = {}) {
    global.dispatchEvent(
      new CustomEvent("ksk:navigate", {
        detail: {
          page,
          options
        }
      })
    );

    global.dispatchEvent(
      new CustomEvent("ksk:page-change", {
        detail: {
          page,
          options
        }
      })
    );
  }

  /* =======================================================
     NAVIGATE
  ======================================================= */

  function navigate(page, options = {}) {
    const next = normalizePage(page);

    if (!isValidPage(next)) {
      console.warn(
        "KSKNavigation: Invalid page:",
        page
      );

      return false;
    }

    const previousPage = getCurrentPage();

    if (!updatePageState(next)) {
      return false;
    }

    dispatchNavigationEvent(next, {
      ...options,
      previousPage
    });

    refreshCurrentPage();

    return true;
  }

  /* =======================================================
     SET CURRENT PAGE
  ======================================================= */

  function setCurrentPage(page, options = {}) {
    const next = normalizePage(page);

    if (!isValidPage(next)) {
      return false;
    }

    if (!updatePageState(next)) {
      return false;
    }

    updateActiveNavigation();

    if (options.render !== false) {
      return refreshCurrentPage();
    }

    return true;
  }

  /* =======================================================
     NAVIGATION CLICK
  ======================================================= */

  function handleDocumentClick(event) {
    const target = event.target?.closest?.(
      "[data-page], [data-nav-page]"
    );

    if (!target) return;

    const page =
      target.dataset.page ||
      target.dataset.navPage;

    /*
     * Create is handled by KSKMediaUI.
     * It is not a navigation page.
     */

    if (!isValidPage(page)) {
      return;
    }

    event.preventDefault();

    navigate(page, {
      source: "navigation-control"
    });
  }

  /* =======================================================
     EXTERNAL NAVIGATION REQUEST
  ======================================================= */

  function handleNavigationRequest(event) {
    const detail = event.detail || {};

    if (!detail.page) return;

    navigate(
      detail.page,
      detail.options || {}
    );
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initializeNavigation(root = document) {
    if (initialized) {
      updateActiveNavigation();
      return true;
    }

    const state = getState();

    if (!state) {
      console.error(
        "KSKNavigation: Initialize KSKState first."
      );

      return false;
    }

    const savedPage = normalizePage(
      state.currentPage || "home"
    );

    const rawHash = String(global.location?.hash || "")
      .replace(/^#/, "")
      .trim();

    const linkedPage = rawHash ? normalizePage(rawHash) : "";

    // A valid deep link takes priority; an empty hash must not
    // overwrite the user's previously selected page.
    if (linkedPage && isValidPage(linkedPage)) {
      updatePageState(linkedPage);
    } else if (!isValidPage(savedPage)) {
      updatePageState("home");
    }

    clickRoot = root || document;

    clickRoot.addEventListener(
      "click",
      handleDocumentClick
    );

    global.addEventListener(
      "ksk:navigate-request",
      handleNavigationRequest
    );

    global.addEventListener(
      "hashchange",
      handleHashChange
    );

    initialized = true;

    updateActiveNavigation();

    return true;
  }

  /* =======================================================
     DEEP-LINK ROUTING
  ======================================================= */

  function handleHashChange() {
    const rawHash = String(global.location?.hash || "")
      .replace(/^#/, "")
      .trim();

    if (!rawHash) {
      setCurrentPage("home");
      return;
    }

    const linkedPage = normalizePage(rawHash);

    if (isValidPage(linkedPage)) {
      setCurrentPage(linkedPage);
    }
  }

  /* =======================================================
     REFRESH NAVIGATION
  ======================================================= */

  function refreshNavigation() {
    updateActiveNavigation();
    return true;
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  function destroy() {
    if (clickRoot) {
      clickRoot.removeEventListener(
        "click",
        handleDocumentClick
      );
    }

    global.removeEventListener(
      "ksk:navigate-request",
      handleNavigationRequest
    );

    global.removeEventListener(
      "hashchange",
      handleHashChange
    );

    initialized = false;
    clickRoot = null;

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKNavigation = Object.freeze({

    initializeNavigation,

    isValidPage,

    navigate,

    setCurrentPage,

    getCurrentPage,

    refreshNavigation,

    refreshCurrentPage,

    destroy

  });

})(window);
