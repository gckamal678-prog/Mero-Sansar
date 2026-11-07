"use strict";

/*
 * KSK NAVIGATION CONTROLLER
 * Page routing and navigation state.
 */

(function (global) {
  "use strict";

  if (global.KSKNavigation) return;

  const VALID_PAGES = new Set([
    "home",
    "posts",
    "friends",
    "messages",
    "notifications",
    "saved",
    "profile"
  ]);

  let currentPage = "home";
  let renderPage = null;
  let onNavigate = null;
  let initialized = false;
  let clickRoot = null;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function isValidPage(page) {
    return VALID_PAGES.has(
      String(page || "").trim().toLowerCase()
    );
  }

  function normalizePage(page) {
    const value = String(page || "home")
      .trim()
      .toLowerCase();

    return value === "posts" ? "home" : value;
  }

  function setCurrentPage(page, options = {}) {
    const next = normalizePage(page);

    if (!isValidPage(next)) return false;

    currentPage = next;

    if (options.render !== false) {
      refreshCurrentPage();
    }

    return true;
  }

  function updateActiveNavigation() {
    document
      .querySelectorAll("[data-page], [data-nav-page]")
      .forEach(node => {
        const value =
          node.dataset.page ||
          node.dataset.navPage ||
          "";

        const active =
          normalizePage(value) === currentPage;

        node.classList.toggle("active", active);
        node.classList.toggle("is-active", active);

        if (active) {
          node.setAttribute("aria-current", "page");
        } else {
          node.removeAttribute("aria-current");
        }
      });
  }

  function renderResult(result) {
    const home = $("#homePage");
    const other = $("#otherPage");
    const title = $("#otherPageTitle");
    const content = $("#otherPageText");

    if (currentPage === "home") {
      home?.classList.remove("hidden");
      other?.classList.add("hidden");
      return;
    }

    home?.classList.add("hidden");
    other?.classList.remove("hidden");

    if (title) {
      title.textContent = result?.title || "";
    }

    if (content) {
      content.innerHTML = result?.html || "";
    }
  }

  function refreshCurrentPage() {
    if (typeof renderPage !== "function") {
      console.error(
        "KSKNavigation: page renderer is not configured."
      );
      return false;
    }

    try {
      const result = renderPage(currentPage);

      renderResult(result || {});
      updateActiveNavigation();

      return true;
    } catch (error) {
      console.error(
        "KSKNavigation: page rendering failed.",
        error
      );

      const content = $("#otherPageText");

      if (content && currentPage !== "home") {
        content.innerHTML =
          '<div class="empty-state">यो पृष्ठ खोल्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।</div>';
      }

      return false;
    }
  }

  function navigate(page, options = {}) {
    const next = normalizePage(page);

    if (!isValidPage(next)) return false;

    currentPage = next;

    if (typeof onNavigate === "function") {
      onNavigate(next, options);
    }

    refreshCurrentPage();

    global.dispatchEvent(
      new CustomEvent("ksk:page-change", {
        detail: {
          page: next,
          options
        }
      })
    );

    return true;
  }

  function handleNavigationEvent(event) {
    const detail = event.detail || {};

    if (!detail.page) return;

    navigate(
      detail.page,
      detail.options || {}
    );
  }

  function handleDocumentClick(event) {
    const target =
      event.target?.closest?.(
        "[data-page], [data-nav-page]"
      );

    if (!target) return;

    const page =
      target.dataset.page ||
      target.dataset.navPage;

    if (!isValidPage(page)) return;

    event.preventDefault();

    navigate(page, {
      source: "navigation-control"
    });
  }

  function initializeNavigation(root = document) {
    if (initialized) {
      updateActiveNavigation();
      return true;
    }

    initialized = true;
    clickRoot = root || document;

    clickRoot.addEventListener(
      "click",
      handleDocumentClick
    );

    global.addEventListener(
      "ksk:navigate",
      handleNavigationEvent
    );

    updateActiveNavigation();

    return true;
  }

  function configure(options = {}) {
    if (typeof options.renderPage === "function") {
      renderPage = options.renderPage;
    }

    if (typeof options.onNavigate === "function") {
      onNavigate = options.onNavigate;
    }

    if (
      options.initialPage &&
      isValidPage(options.initialPage)
    ) {
      currentPage = normalizePage(
        options.initialPage
      );
    }

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
      "ksk:navigate",
      handleNavigationEvent
    );

    initialized = false;
    clickRoot = null;
  }

  global.KSKNavigation = Object.freeze({
    configure,
    initializeNavigation,
    isValidPage,
    navigate,
    refreshNavigation,
    refreshCurrentPage,
    setCurrentPage,
    getCurrentPage: () => currentPage,
    destroy
  });

})(window);
