"use strict";

/*
 * KSK SEARCH CONTROLLER
 * Owns search panel visibility and input interaction.
 * Filtering remains in pages/home.js.
 */

(function (global) {
  "use strict";

  if (global.KSKSearch) return;

  let initialized = false;
  let elements = {};
  let navigation = null;
  let homePage = null;

  function renderFeed() {
    return homePage?.renderFeed?.() || false;
  }

  function search(value) {
    if (typeof homePage?.setSearchQuery !== "function") return false;

    homePage.setSearchQuery(value);

    if (navigation?.getCurrentPage?.() !== "home") {
      navigation?.navigate?.("home");
    }

    renderFeed();
    return true;
  }

  function clearSearch() {
    homePage?.clearSearch?.();

    if (elements.searchInput) {
      elements.searchInput.value = "";
    }

    renderFeed();
    return true;
  }

  function open() {
    if (!elements.searchPanel) return false;

    elements.searchPanel.classList.remove("hidden");
    elements.searchInput?.focus();

    return true;
  }

  function close(options = {}) {
    if (!elements.searchPanel) return false;

    elements.searchPanel.classList.add("hidden");

    if (options.clear !== false) clearSearch();

    return true;
  }

  function toggle() {
    if (!elements.searchPanel) return false;

    return elements.searchPanel.classList.contains("hidden")
      ? open()
      : close({ clear: true });
  }

  function handleInput(event) {
    search(event?.target?.value ?? "");
  }

  function initialize(options = {}) {
    if (initialized) return true;

    elements = options.elements || {};
    navigation = options.navigation || global.KSKNavigation;
    homePage = options.homePage || global.KSKHomePage;

    elements.searchToggle?.addEventListener("click", toggle);
    elements.searchInput?.addEventListener("input", handleInput);

    initialized = true;
    return true;
  }

  function destroy() {
    elements.searchToggle?.removeEventListener("click", toggle);
    elements.searchInput?.removeEventListener("input", handleInput);

    initialized = false;
    elements = {};
    navigation = null;
    homePage = null;

    return true;
  }

  global.KSKSearch = Object.freeze({
    initialize,
    destroy,
    open,
    close,
    toggle,
    search,
    clearSearch
  });

})(window);
