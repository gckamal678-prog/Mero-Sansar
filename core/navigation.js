
"use strict";

/*
 * KSK NAVIGATION CONTROLLER
 *
 * RESPONSIBILITY:
 * - Page navigation
 * - Current page state
 * - Active navigation menu
 * - Page module rendering
 * - Shared post card rendering on Profile and Saved
 * - Refresh media after page rendering
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

  let currentPage = "home";
  let initialized = false;
  let clickRoot = null;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function normalizePage(page) {
    const value = String(page || "home")
      .trim()
      .toLowerCase();

    return value === "posts" ? "home" : value;
  }

  function isValidPage(page) {
    return VALID_PAGES.has(normalizePage(page));
  }

  function getLanguage() {
    const language =
      global.KSKLanguage?.getLanguage?.() ||
      global.KSKState?.getState?.()?.language;

    return language === "en" ? "en" : "ne";
  }

  function isEnglish() {
    return getLanguage() === "en";
  }

  function getPageTitle(page) {
    const language = getLanguage();

    return PAGE_TITLES[page]?.[language] ||
      PAGE_TITLES.home[language];
  }

  /*
   * Shared post card.
   * Profile and Saved must use the same card as Home.
   */

  function renderPost(post) {
    const postCard = global.KSKPostCard;

    if (typeof postCard?.render !== "function") {
      console.error(
        "KSKNavigation: KSKPostCard is unavailable."
      );

      return "";
    }

    return postCard.render(post, {
      isEnglish: isEnglish(),
      formatDate: value => {
        if (typeof global.KSKUtils?.formatDateTime === "function") {
          return global.KSKUtils.formatDateTime(
            value,
            getLanguage()
          );
        }

        return "";
      }
    });
  }

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
          isEnglish: isEnglish(),
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

  function updateActiveNavigation() {
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

  function showHomePage() {
    $("#homePage")?.classList.remove("hidden");
    $("#otherPage")?.classList.add("hidden");
  }

  function refreshPageMedia() {
    /*
     * Media UI scans all visible post cards.
     * It loads images from IndexedDB using mediaId.
     */

    global.KSKMediaUI?.refresh?.();

    /*
     * Profile Media UI handles profile-specific media.
     */

    global.KSKProfileMediaUI?.refresh?.();
  }

  function showOtherPage(page, html) {
    const home = $("#homePage");
    const other = $("#otherPage");
    const title = $("#otherPageTitle");
    const content = $("#otherPageText");

    home?.classList.add("hidden");
    other?.classList.remove("hidden");

    if (title) {
      title.textContent = getPageTitle(page);
    }

    if (content) {
      content.innerHTML = html;

      /*
       * Important:
       * Refresh media AFTER the page HTML is inserted.
       */

      refreshPageMedia();
    }
  }

  function showPageError() {
    const language = getLanguage();

    return language === "en"
      ? '<div class="empty-state">This page is temporarily unavailable. Please try again.</div>'
      : '<div class="empty-state">यो पृष्ठ अहिले उपलब्ध छैन। कृपया फेरि प्रयास गर्नुहोस्।</div>';
  }

  function refreshCurrentPage() {
    updateActiveNavigation();

    if (currentPage === "home") {
      showHomePage();
      return true;
    }

    try {
      const html = getPageHTML(currentPage);

      if (typeof html !== "string") {
        showOtherPage(currentPage, showPageError());

        console.error(
          "KSKNavigation: Page module is missing or returned invalid content:",
          currentPage
        );

        return false;
      }

      showOtherPage(currentPage, html);
      return true;

    } catch (error) {
      console.error(
        "KSKNavigation: Page rendering failed:",
        currentPage,
        error
      );

      showOtherPage(currentPage, showPageError());
      return false;
    }
  }

  function dispatchNavigationEvent(page, options) {
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

  function navigate(page, options = {}) {
    const next = normalizePage(page);

    if (!isValidPage(next)) {
      return false;
    }

    const previousPage = currentPage;

    currentPage = next;

    global.KSKState?.setCurrentPage?.(next);

    dispatchNavigationEvent(next, {
      ...options,
      previousPage
    });

    refreshCurrentPage();

    return true;
  }

  function setCurrentPage(page, options = {}) {
    const next = normalizePage(page);

    if (!isValidPage(next)) {
      return false;
    }

    currentPage = next;

    global.KSKState?.setCurrentPage?.(next);

    updateActiveNavigation();

    if (options.render !== false) {
      refreshCurrentPage();
    }

    return true;
  }

  function handleDocumentClick(event) {
    const target = event.target?.closest?.(
      "[data-page], [data-nav-page]"
    );

    if (!target) return;

    const page =
      target.dataset.page ||
      target.dataset.navPage;

    /*
     * Create is a composer action.
     * Media UI owns it, not navigation.
     */

    if (!isValidPage(page)) {
      return;
    }

    event.preventDefault();

    navigate(page, {
      source: "navigation-control"
    });
  }

  function handleNavigationRequest(event) {
    const detail = event.detail || {};

    if (!detail.page) return;

    navigate(
      detail.page,
      detail.options || {}
    );
  }

  function initializeNavigation(root = document) {
    if (initialized) {
      updateActiveNavigation();
      return true;
    }

    clickRoot = root || document;

    const savedPage =
      global.KSKState?.getState?.()?.currentPage || "home";

    currentPage = isValidPage(savedPage)
      ? normalizePage(savedPage)
      : "home";

    if (currentPage !== savedPage) {
      global.KSKState?.setCurrentPage?.(currentPage);
    }

    clickRoot.addEventListener(
      "click",
      handleDocumentClick
    );

    global.addEventListener(
      "ksk:navigate-request",
      handleNavigationRequest
    );

    initialized = true;

    updateActiveNavigation();

    return true;
  }

  function refreshNavigation() {
    updateActiveNavigation();
  }

  function destroy() {
    if (initialized && clickRoot) {
      clickRoot.removeEventListener(
        "click",
        handleDocumentClick
      );
    }

    global.removeEventListener(
      "ksk:navigate-request",
      handleNavigationRequest
    );

    initialized = false;
    clickRoot = null;
  }

  global.KSKNavigation = Object.freeze({
    initializeNavigation,
    isValidPage,
    navigate,
    setCurrentPage,
    getCurrentPage: () => currentPage,
    refreshNavigation,
    refreshCurrentPage,
    destroy
  });

})(window);
