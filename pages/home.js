
"use strict";

/*
 * KSK HOME PAGE
 * Owns Home Stories, Feed, Post Card rendering and feed search.
 * DATA: KSKData | STATE: KSKState | CARD: KSKPostCard
 */

(function (global) {
  "use strict";

  if (global.KSKHomePage) return;

  let searchQuery = String(
    global.KSKState?.getState?.()?.searchQuery || ""
  );

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function escapeHTML(value = "") {
    if (typeof global.KSKUtils?.escapeHTML === "function") {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function initial(value) {
    return String(value || "").trim().charAt(0) ||
      (isEnglish() ? "U" : "स");
  }

  function getPosts() {
    const posts = global.KSKData?.getPosts?.();
    return Array.isArray(posts) ? posts : [];
  }

  function getStories() {
    const stories = global.KSKData?.getStories?.();
    return Array.isArray(stories) ? stories : [];
  }

  function formatDate(value) {
    if (typeof global.KSKUtils?.formatDateTime === "function") {
      return global.KSKUtils.formatDateTime(value);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(
      isEnglish() ? "en-US" : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }

  /*
   * POST CARD RENDERING
   * Actual card HTML belongs to KSKPostCard.
   */

  function renderPost(post) {
    if (!post || typeof post !== "object") return "";

    const postCard = global.KSKPostCard;

    if (typeof postCard?.render !== "function") {
      console.error(
        "KSKPostCard is unavailable. Check index.html script order."
      );

      return `
        <div class="empty-state">
          ${isEnglish()
            ? "Post display is temporarily unavailable."
            : "पोस्ट देखाउने सुविधा अहिले उपलब्ध छैन।"}
        </div>
      `;
    }

    return postCard.render(post, {
      isEnglish: isEnglish(),
      formatDate
    });
  }

  /*
   * STORIES RENDERING
   */

  function renderStories() {
    const storiesList = $("#storiesList");

    if (!storiesList) return false;

    const stories = getStories();

    const addLabel = isEnglish()
      ? "Add Story"
      : "स्टोरी थप्नुहोस्";

    const addStory = `
      <button
        class="story-card"
        type="button"
        data-story-create
        aria-label="${escapeHTML(addLabel)}">

        <span class="story-avatar">＋</span>

        <span class="story-name">
          ${escapeHTML(addLabel)}
        </span>

      </button>
    `;

    const storyItems = stories.map(story => `
      <button
        class="story-card"
        type="button"
        data-story-view="${escapeHTML(story.id)}">

        <span class="story-avatar">
          ${escapeHTML(initial(story.author))}
        </span>

        <span class="story-name">
          ${escapeHTML(story.author || "सदस्य")}
        </span>

      </button>
    `).join("");

    storiesList.innerHTML = addStory + storyItems;

    global.KSKMediaUI?.refresh?.();

    return true;
  }

  /*
   * FEED RENDERING
   */

  function renderFeed() {
    const feedList = $("#feedList");

    if (!feedList) return false;

    const query = searchQuery.toLowerCase();

    const filtered = getPosts().filter(post => {
      const searchable = [
        post.author || "",
        post.text || ""
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });

    feedList.innerHTML = filtered
      .map(renderPost)
      .join("");

    $("#emptyFeed")?.classList.toggle(
      "hidden",
      filtered.length > 0
    );

    global.KSKMediaUI?.refresh?.();

    return true;
  }

  /*
   * SEARCH
   */

  function setSearchQuery(value) {
    searchQuery = String(value ?? "")
      .trim()
      .slice(0, 500);

    global.KSKState?.setSearchQuery?.(searchQuery);

    return searchQuery;
  }

  function clearSearch() {
    searchQuery = "";

    global.KSKState?.setSearchQuery?.("");

    return true;
  }

  /*
   * REFRESH
   */

  function refresh() {
    renderStories();
    renderFeed();

    return true;
  }

  /*
   * PUBLIC API
   */

  global.KSKHomePage = Object.freeze({
    getPosts,
    getStories,

    renderPost,
    renderStories,
    renderFeed,

    setSearchQuery,
    clearSearch,

    refresh
  });

})(window);
