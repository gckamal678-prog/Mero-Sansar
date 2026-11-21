
"use strict";

/*
 * KSK — NAVIGATION CONTROLLER
 * Mero-Sansar
 *
 * - Normal page navigation
 * - Post deep-link navigation: #post=POST_ID
 * - Opens Home and focuses the requested post
 * - Waits for asynchronous Supabase Feed loading
 * - Shows application header only on Home / Dashboard
 * - Hides Profile page heading
 */

(function (global) {
  "use strict";

  if (global.KSKNavigation) return;

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
  let postLinkRequest = 0;

  /* STATE */

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

  /* PAGE VALIDATION */

  function normalizePage(page) {
    const value = String(page || "home")
      .trim()
      .toLowerCase();

    return value === "posts" ? "home" : value;
  }

  function isValidPage(page) {
    return VALID_PAGES.has(normalizePage(page));
  }

  /* LANGUAGE */

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

  /* PAGE MODULE RENDERING */

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

  /* SHARED POST CARD */

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

  /* ACTIVE NAVIGATION */

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

  /* PAGE HEADER AND TITLE */

  function updatePageChrome(page) {
    const currentPage = normalizePage(page);

    /*
     * Main application header:
     * Only Home / Dashboard displays it.
     */
    const appHeader = document.querySelector(
      ".app-header"
    );

    if (appHeader) {
      appHeader.hidden = currentPage !== "home";
    }

    /*
     * Profile page:
     * Hide the generic "Profile" heading.
     * Keep headings on other pages.
     */
    const title = document.getElementById(
      "otherPageTitle"
    );

    const heading = title?.closest(
      ".other-page-heading"
    ) || title?.parentElement;

    if (heading) {
      heading.hidden = currentPage === "profile";
    } else if (title) {
      title.hidden = currentPage === "profile";
    }

    document.body.classList.toggle(
      "ksk-current-page-profile",
      currentPage === "profile"
    );

    document.body.classList.toggle(
      "ksk-app-header-hidden",
      currentPage !== "home"
    );

    return true;
  }

  /* PAGE VISIBILITY */

  function showHomePage() {
    updatePageChrome("home");

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

    updatePageChrome(page);

    home?.classList.add("hidden");
    other.classList.remove("hidden");

    if (title) {
      title.textContent = getPageTitle(page);
    }

    content.innerHTML = html;

    refreshPageMedia();

    return true;
  }

  /* MEDIA REFRESH */

  function refreshPageMedia() {
    global.KSKMediaUI?.refresh?.();
    global.KSKProfileMediaUI?.refresh?.();
  }

  /* PAGE ERROR */

  function showPageError() {
    return getLanguage() === "en"
      ? '<div class="empty-state">This page is temporarily unavailable. Please try again.</div>'
      : '<div class="empty-state">यो पृष्ठ अहिले उपलब्ध छैन। कृपया फेरि प्रयास गर्नुहोस्।</div>';
  }

  /* REFRESH CURRENT PAGE */

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

  /* NAVIGATION EVENTS */

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

  /* NAVIGATE */

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

  /* SET CURRENT PAGE */

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

    updatePageChrome(next);

    return true;
  }

  /* DOCUMENT NAVIGATION CLICK */

  function handleDocumentClick(event) {
    const target = event.target?.closest?.(
      "[data-page], [data-nav-page]"
    );

    if (!target) return;

    const page =
      target.dataset.page ||
      target.dataset.navPage;

    if (!isValidPage(page)) {
      return;
    }

    event.preventDefault();

    navigate(page, {
      source: "navigation-control"
    });
  }

  /* EXTERNAL NAVIGATION REQUEST */

  function handleNavigationRequest(event) {
    const detail = event.detail || {};

    if (!detail.page) return;

    navigate(
      detail.page,
      detail.options || {}
    );
  }

  /* READ POST LINK */

  function getPostIdFromHash() {
    const rawHash = String(
      global.location?.hash || ""
    ).replace(/^#/, "").trim();

    if (!rawHash.startsWith("post=")) {
      return "";
    }

    const encodedId = rawHash.slice(5);

    if (!encodedId) return "";

    try {
      return decodeURIComponent(encodedId).trim();
    } catch (error) {
      console.warn(
        "KSKNavigation: Invalid post link:",
        error
      );

      return "";
    }
  }

  /* OPEN POST FROM DEEP LINK */

  function openPostDeepLink(postId) {
    const id = String(postId || "").trim();

    if (!id) return false;

    const requestId = ++postLinkRequest;

    // पोस्ट खोज्न पुरानो Search हटाउने।
    global.KSKHomePage?.clearSearch?.();

    // Home page खोल्ने।
    if (getCurrentPage() !== "home") {
      navigate("home", {
        source: "post-deep-link",
        postId: id
      });
    } else {
      updateActiveNavigation();
      showHomePage();
    }

    const home = global.KSKHomePage;

    if (typeof home?.focusPost !== "function") {
      console.error(
        "KSKNavigation: Home focusPost is unavailable."
      );

      return false;
    }

    // Feed मा पोस्ट पहिले नै उपलब्ध छ भने तुरुन्त खोल्ने।
    if (home.focusPost(id)) {
      return true;
    }

    /*
     * Feed asynchronous भएकाले Cloud बाट फेरि लोड गर्ने।
     * focusPost सफल नभएसम्म सीमित समय पर्खने।
     */
    if (typeof home.refresh === "function") {
      home.refresh();
    }

    let attempts = 0;
    const maxAttempts = 120;

    function retryFocus() {
      if (requestId !== postLinkRequest) {
        return;
      }

      if (home.focusPost(id)) {
        return;
      }

      attempts += 1;

      if (attempts >= maxAttempts) {
        console.warn(
          "KSKNavigation: Linked post was not found in the loaded feed:",
          id
        );

        return;
      }

      global.setTimeout(retryFocus, 125);
    }

    global.setTimeout(retryFocus, 125);

    return true;
  }

  /* HANDLE HASH ROUTING */

  function handleHashChange() {
    const postId = getPostIdFromHash();

    if (postId) {
      openPostDeepLink(postId);
      return;
    }

    const rawHash = String(
      global.location?.hash || ""
    ).replace(/^#/, "").trim();

    if (!rawHash) {
      setCurrentPage("home");
      return;
    }

    const linkedPage = normalizePage(rawHash);

    if (isValidPage(linkedPage)) {
      // नयाँ page link ले पुरानो post retry रोक्छ।
      postLinkRequest += 1;

      setCurrentPage(linkedPage);
    }
  }

  /* INITIALIZE */

  function initializeNavigation(root = document) {
    if (initialized) {
      updateActiveNavigation();
      updatePageChrome(getCurrentPage());
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

    const linkedPostId = getPostIdFromHash();

    const rawHash = String(
      global.location?.hash || ""
    ).replace(/^#/, "").trim();

    const linkedPage = rawHash
      ? normalizePage(rawHash)
      : "";

    if (linkedPostId) {
      updatePageState("home");

    } else if (
      linkedPage &&
      isValidPage(linkedPage)
    ) {
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
    updatePageChrome(getCurrentPage());

    // App initialization पछि पोस्ट खोल्ने।
    if (linkedPostId) {
      global.setTimeout(() => {
        openPostDeepLink(linkedPostId);
      }, 0);
    }

    return true;
  }

  /* REFRESH NAVIGATION */

  function refreshNavigation() {
    updateActiveNavigation();
    updatePageChrome(getCurrentPage());
    return true;
  }

  /* DESTROY */

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

    postLinkRequest += 1;

    initialized = false;
    clickRoot = null;

    // Navigation बन्द हुँदा Header लुकाएर नराख्ने।
    const appHeader = document.querySelector(
      ".app-header"
    );

    if (appHeader) {
      appHeader.hidden = false;
    }

    document.body.classList.remove(
      "ksk-current-page-profile",
      "ksk-app-header-hidden"
    );

    const title = document.getElementById(
      "otherPageTitle"
    );

    const heading = title?.closest(
      ".other-page-heading"
    ) || title?.parentElement;

    if (heading) {
      heading.hidden = false;
    }

    return true;
  }

  /* PUBLIC API */

  global.KSKNavigation = Object.freeze({
    initializeNavigation,
    isValidPage,
    navigate,
    setCurrentPage,
    getCurrentPage,
    refreshNavigation,
    refreshCurrentPage,
    openPostDeepLink,
    destroy
  });

})(window);
