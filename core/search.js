
"use strict";

/*
 * KSK GLOBAL SEARCH CONTROLLER
 *
 * Searches:
 * - Posts: author, text and location
 * - Friends: name and location
 *
 * POST DATA: KSKData
 * FRIEND CARD: KSKUserCard
 * POST FEED: KSKHomePage
 */

(function (global) {
  "use strict";

  if (global.KSKSearch) return;

  let initialized = false;
  let elements = {};
  let navigation = null;
  let homePage = null;

  const DATA = () => global.KSKData || null;

  function escapeHTML(value) {
    if (typeof global.KSKUtils?.escapeHTML === "function") {
      return global.KSKUtils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function getCurrentPage() {
    return (
      navigation?.getCurrentPage?.() ||
      global.KSKState?.getState?.()?.currentPage ||
      "home"
    );
  }

  function getMatches(query) {
    const normalized = String(query || "")
      .trim()
      .toLowerCase();

    if (!normalized) {
      return {
        posts: [],
        friends: []
      };
    }

    const posts = DATA()?.getPosts?.() || [];
    const friends = DATA()?.getFriends?.() || [];

    const matchedPosts = posts.filter(post => {
      if (!post || typeof post !== "object") {
        return false;
      }

      const searchable = [
        post.author,
        post.text,
        post.location
      ]
        .map(value => String(value || ""))
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalized);
    });

    const matchedFriends = friends.filter(friend => {
      if (!friend || typeof friend !== "object") {
        return false;
      }

      const searchable = [
        friend.name,
        friend.location
      ]
        .map(value => String(value || ""))
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalized);
    });

    return {
      posts: matchedPosts,
      friends: matchedFriends
    };
  }

  function renderPostResults(posts) {
    if (!posts.length) return "";

    const english = isEnglish();

    const heading = english
      ? "Posts"
      : "पोस्टहरू";

    const items = posts.slice(0, 6).map(post => {
      const id = String(post.id || "");
      const author = String(
        post.author || (english ? "Member" : "सदस्य")
      );

      const content = String(post.text || "").trim();

      const preview = content
        ? content.slice(0, 180)
        : english
          ? "Media post"
          : "मिडिया पोस्ट";

      return `
        <button
          class="search-result-post"
          type="button"
          data-search-post-id="${escapeHTML(id)}">

          <strong>
            ${escapeHTML(author)}
          </strong>

          <span>
            ${escapeHTML(preview)}
          </span>

        </button>
      `;
    }).join("");

    const more = posts.length > 6
      ? `<p class="search-results-more">
          ${english
            ? `And ${posts.length - 6} more posts`
            : `अन्य ${posts.length - 6} पोस्ट`}
        </p>`
      : "";

    return `
      <section class="search-results-group">

        <h3 class="search-results-heading">
          ${heading}
          <span>${posts.length}</span>
        </h3>

        <div class="search-result-post-list">
          ${items}
        </div>

        ${more}

      </section>
    `;
  }

  function renderFriendResults(friends) {
    if (!friends.length) return "";

    const english = isEnglish();

    const heading = english
      ? "Friends"
      : "साथीहरू";

    const userCard = global.KSKUserCard;

    const items = friends
      .slice(0, 6)
      .map(friend => {
        if (typeof userCard?.render === "function") {
          return userCard.render(friend, {
            message: false
          });
        }

        return `
          <article class="card friend-card">
            <strong>
              ${escapeHTML(friend.name || "")}
            </strong>
          </article>
        `;
      })
      .join("");

    const more = friends.length > 6
      ? `<p class="search-results-more">
          ${english
            ? `And ${friends.length - 6} more friends`
            : `अन्य ${friends.length - 6} साथी`}
        </p>`
      : "";

    return `
      <section class="search-results-group">

        <h3 class="search-results-heading">
          ${heading}
          <span>${friends.length}</span>
        </h3>

        <div class="search-result-friend-list">
          ${items}
        </div>

        ${more}

      </section>
    `;
  }

  function renderResults(query) {
    const container = elements.searchResults;

    if (!container) return false;

    const normalized = String(query || "").trim();

    if (!normalized) {
      container.innerHTML = "";
      container.classList.add("hidden");
      return true;
    }

    const matches = getMatches(normalized);
    const english = isEnglish();

    if (
      matches.posts.length === 0 &&
      matches.friends.length === 0
    ) {
      container.innerHTML = `
        <div class="search-results-empty">
          ${english
            ? "No matching posts or friends found."
            : "मिल्दो पोस्ट वा साथी भेटिएन।"}
        </div>
      `;

      container.classList.remove("hidden");
      return true;
    }

    container.innerHTML = `
      <div class="search-results-summary">
        ${english
          ? `${matches.posts.length} posts · ${matches.friends.length} friends`
          : `${matches.posts.length} पोस्ट · ${matches.friends.length} साथी`}
      </div>

      ${renderPostResults(matches.posts)}

      ${renderFriendResults(matches.friends)}
    `;

    container.classList.remove("hidden");

    global.KSKUserCard?.refresh?.(container);

    return true;
  }

  function renderFeed() {
    if (getCurrentPage() !== "home") {
      return false;
    }

    return homePage?.renderFeed?.() || false;
  }

  function search(value) {
    if (typeof homePage?.setSearchQuery !== "function") {
      return false;
    }

    const query = String(value ?? "")
      .trim()
      .slice(0, 500);

    homePage.setSearchQuery(query);

    renderFeed();
    renderResults(query);

    return true;
  }

  function clearSearch() {
    homePage?.clearSearch?.();

    if (elements.searchInput) {
      elements.searchInput.value = "";
    }

    renderResults("");
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

    if (options.clear !== false) {
      clearSearch();
    }

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

  function handleResultsClick(event) {
    const target = event.target?.closest?.(
      "[data-search-post-id]"
    );

    if (!target || !elements.searchResults?.contains(target)) {
      return;
    }

    event.preventDefault();

    const postId = String(
      target.dataset.searchPostId || ""
    );

    if (!postId) return;

    if (getCurrentPage() !== "home") {
      const navigated = navigation?.navigate?.("home");

      if (!navigated) return;
    }

    close({ clear: false });

    if (typeof homePage?.focusPost === "function") {
      homePage.focusPost(postId);
    } else {
      renderFeed();
    }
  }

  function initialize(options = {}) {
    if (initialized) return true;

    elements = options.elements || {};
    navigation = options.navigation || global.KSKNavigation;
    homePage = options.homePage || global.KSKHomePage;

    elements.searchToggle?.addEventListener(
      "click",
      toggle
    );

    elements.searchInput?.addEventListener(
      "input",
      handleInput
    );

    elements.searchResults?.addEventListener(
      "click",
      handleResultsClick
    );

    initialized = true;

    return true;
  }

  function destroy() {
    elements.searchToggle?.removeEventListener(
      "click",
      toggle
    );

    elements.searchInput?.removeEventListener(
      "input",
      handleInput
    );

    elements.searchResults?.removeEventListener(
      "click",
      handleResultsClick
    );

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
    clearSearch,
    renderResults
  });

})(window);
