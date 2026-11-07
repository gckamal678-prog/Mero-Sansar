(function (global) {
  "use strict";

  const VALID_PAGES = [
    "home",
    "posts",
    "friends",
    "messages",
    "notifications",
    "saved",
    "profile"
  ];

  let currentPage = "home";
  let renderPage = null;
  let onNavigate = null;
  let initialized = false;
  let rootElement = document;

  function normalizePage(page) {
    const value = String(page || "home").trim().toLowerCase();
    return VALID_PAGES.includes(value) ? value : "home";
  }

  function configure(options = {}) {
    if (typeof options.renderPage === "function") {
      renderPage = options.renderPage;
    }

    if (typeof options.onNavigate === "function") {
      onNavigate = options.onNavigate;
    }

    if (options.initialPage) {
      currentPage = normalizePage(options.initialPage);
    }
  }

  function updateActiveNavigation() {
    if (!rootElement) return;

    rootElement
      .querySelectorAll("[data-page], [data-nav-page]")
      .forEach((element) => {
        const page = normalizePage(
          element.dataset.page || element.dataset.navPage
        );

        const active = page === currentPage;

        element.classList.toggle("active", active);
        element.classList.toggle("is-active", active);

        if (active) {
          element.setAttribute("aria-current", "page");
        } else {
          element.removeAttribute("aria-current");
        }
      });
  }

  function renderCurrentPage() {
    if (typeof renderPage === "function") {
      renderPage(currentPage);
    }

    updateActiveNavigation();
  }

  function navigate(page, options = {}) {
    const nextPage = normalizePage(page);

    if (nextPage === currentPage && !options.force) {
      updateActiveNavigation();
      return currentPage;
    }

    const previousPage = currentPage;
    currentPage = nextPage;

    renderCurrentPage();

    if (typeof onNavigate === "function") {
      onNavigate(nextPage, previousPage);
    }

    return currentPage;
  }

  function handleClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const link = target.closest("[data-page], [data-nav-page]");

    if (!link || !rootElement.contains(link)) return;

    const page = link.dataset.page || link.dataset.navPage;

    if (!page) return;

    event.preventDefault();
    navigate(page);
  }

  function handleNavigateEvent(event) {
    const page = event.detail && (
      event.detail.page || event.detail
    );

    if (page) {
      navigate(page);
    }
  }

  function initializeNavigation(root = document) {
    rootElement = root || document;

    if (initialized) {
      updateActiveNavigation();
      return;
    }

    rootElement.addEventListener("click", handleClick);
    global.addEventListener("ksk:navigate", handleNavigateEvent);

    initialized = true;
    updateActiveNavigation();
  }

  function refreshCurrentPage() {
    renderCurrentPage();
  }

  function refreshNavigation() {
    updateActiveNavigation();
  }

  function setCurrentPage(page) {
    currentPage = normalizePage(page);
    updateActiveNavigation();
    return currentPage;
  }

  function getCurrentPage() {
    return currentPage;
  }

  function destroy() {
    if (!initialized) return;

    rootElement.removeEventListener("click", handleClick);
    global.removeEventListener("ksk:navigate", handleNavigateEvent);

    initialized = false;
  }

  global.KSKNavigation = {
    configure,
    initializeNavigation,
    navigate,
    setCurrentPage,
    getCurrentPage,
    refreshCurrentPage,
    refreshNavigation,
    destroy
  };
})(window);
