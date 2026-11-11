
"use strict";

/*
 * KSK HOME PAGE
 * Owns Home Stories, Feed, Post Card rendering and feed search.
 * DATA: KSKData | STATE: KSKState | CARD: KSKPostCard
 */

(function (global) {
  "use strict";

  if (global.KSKHomePage) return;

  const PAGE_SIZE = 10;

  let visiblePostCount = PAGE_SIZE;

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

  /* STORY TEXT PREVIEW STYLES */

  function ensureStoryPreviewStyles() {
    if ($("#kskStoryPreviewStyles")) return;

    const style = document.createElement("style");

    style.id = "kskStoryPreviewStyles";

    style.textContent = `
      .story-avatar .story-text-preview {
        display: -webkit-box;
        width: 100%;
        max-height: 100%;
        padding: 3px;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow-wrap: anywhere;
        text-align: center;
        font-size: 9px;
        line-height: 1.2;
        font-weight: 700;
      }
    `;

    document.head.appendChild(style);
  }

  /* CREATE SHORT STORY TEXT */

  function getStoryPreview(text) {
    const cleanText = String(text || "")
      .trim()
      .replace(/\s+/g, " ");

    if (!cleanText) return "";

    const characters = Array.from(cleanText);
    const limit = 32;

    if (characters.length <= limit) {
      return cleanText;
    }

    return characters.slice(0, limit).join("") + "…";
  }

  /* POST CARD RENDERING */

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

  /* STORIES RENDERING */

  function renderStories() {
    const storiesList = $("#storiesList");

    if (!storiesList) return false;

    ensureStoryPreviewStyles();

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

    const storyItems = stories
      .filter(story => {
        if (!story || typeof story !== "object") {
          return false;
        }

        const hasPhoto = Boolean(story.mediaId);

        const hasText = Boolean(
          String(story.text || "").trim()
        );

        return hasPhoto || hasText;
      })
      .map(story => {
        const hasPhoto = Boolean(story.mediaId);

        const preview = hasPhoto
          ? ""
          : getStoryPreview(story.text);

        return `
          <button
            class="story-card"
            type="button"
            data-story-view="${escapeHTML(story.id)}"
            aria-label="${escapeHTML(story.author || "सदस्य")}">

            <span class="story-avatar">
              ${
                hasPhoto
                  ? ""
                  : `
                    <span class="story-text-preview">
                      ${escapeHTML(preview)}
                    </span>
                  `
              }
            </span>

            <span class="story-name">
              ${escapeHTML(story.author || "सदस्य")}
            </span>

          </button>
        `;
      })
      .join("");

    storiesList.innerHTML = addStory + storyItems;

    return true;
  }

  /* FEED FILTERING */

  function getFilteredPosts() {
    const query = searchQuery.toLowerCase();

    return getPosts().filter(post => {
      if (!post || typeof post !== "object") {
        return false;
      }

      const searchable = [
  String(post.author || ""),
  String(post.text || ""),
  String(post.location || "")
].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }

  /* FEED PAGINATION CONTROLS */

  function renderPaginationControls(feedList, total) {
    feedList
      .querySelector(".feed-pagination-controls")
      ?.remove();

    const shown = Math.min(
      visiblePostCount,
      total
    );

    const status = isEnglish()
      ? `Showing ${shown} of ${total} posts`
      : `${total} मध्ये ${shown} पोस्ट देखाइएको`;

    const loadMoreLabel = isEnglish()
      ? "Load more posts"
      : "थप पोस्ट हेर्नुहोस्";

    const button = shown < total
      ? `
        <button
          class="feed-load-more"
          type="button"
          data-feed-load-more>
          ${escapeHTML(loadMoreLabel)}
        </button>
      `
      : "";

    feedList.insertAdjacentHTML(
      "beforeend",
      `
        <div class="feed-pagination-controls">

          <span
            class="feed-pagination-status"
            role="status"
            aria-live="polite">
            ${escapeHTML(status)}
          </span>

          ${button}

        </div>
      `
    );
  }

  /* BIND LOAD MORE EVENT ONLY ONCE */

  function bindFeedPagination(feedList) {
    if (
      feedList.dataset.paginationBound === "true"
    ) {
      return;
    }

    feedList.dataset.paginationBound = "true";

    feedList.addEventListener("click", event => {
      const button = event.target?.closest?.(
        "[data-feed-load-more]"
      );

      if (
        !button ||
        !feedList.contains(button)
      ) {
        return;
      }

      event.preventDefault();

      loadMorePosts();
    });
  }

  /* LOAD NEXT PAGE WITHOUT RE-RENDERING OLD POSTS */

  function loadMorePosts() {
    const feedList = $("#feedList");

    if (!feedList) return false;

    const filtered = getFilteredPosts();

    const start = Math.min(
      visiblePostCount,
      filtered.length
    );

    if (start >= filtered.length) {
      renderPaginationControls(
        feedList,
        filtered.length
      );

      return false;
    }

    const end = Math.min(
      start + PAGE_SIZE,
      filtered.length
    );

    const nextMarkup = filtered
      .slice(start, end)
      .map(renderPost)
      .join("");

    feedList
      .querySelector(".feed-pagination-controls")
      ?.remove();

    if (nextMarkup) {
      feedList.insertAdjacentHTML(
        "beforeend",
        nextMarkup
      );
    }

    visiblePostCount = end;

    renderPaginationControls(
      feedList,
      filtered.length
    );

    return true;
  }

  /* FEED RENDERING */

  function renderFeed() {
    const feedList = $("#feedList");

    if (!feedList) return false;

    bindFeedPagination(feedList);

    const filtered = getFilteredPosts();

    visiblePostCount = Math.min(
      Math.max(PAGE_SIZE, visiblePostCount),
      filtered.length
    );

    const visible = filtered.slice(
      0,
      visiblePostCount
    );

    feedList.innerHTML = visible
      .map(renderPost)
      .join("");

    $("#emptyFeed")?.classList.toggle(
      "hidden",
      filtered.length > 0
    );

    if (filtered.length > 0) {
      renderPaginationControls(
        feedList,
        filtered.length
      );
    }

    return true;
  }

  /* FOCUS A SEARCHED POST */

  function focusPost(postId) {
    const id = String(postId || "");

    if (!id) return false;

    const filtered = getFilteredPosts();

    const index = filtered.findIndex(post =>
      String(post?.id || "") === id
    );

    if (index < 0) return false;

    visiblePostCount = Math.max(
      PAGE_SIZE,
      index + 1
    );

    if (!renderFeed()) {
      return false;
    }

    const scrollToPost = () => {
      const cards = document.querySelectorAll(
        ".post-card[data-post-id]"
      );

      const card = Array.from(cards).find(item =>
        String(item.dataset.postId || "") === id
      );

      card?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    };

    if (typeof global.requestAnimationFrame === "function") {
      global.requestAnimationFrame(scrollToPost);
    } else {
      Promise.resolve().then(scrollToPost);
    }

    return true;
  }

  /* SEARCH */

  function setSearchQuery(value) {
    searchQuery = String(value ?? "")
      .trim()
      .slice(0, 500);

    visiblePostCount = PAGE_SIZE;

    global.KSKState?.setSearchQuery?.(
      searchQuery
    );

    return searchQuery;
  }

  function clearSearch() {
    searchQuery = "";

    visiblePostCount = PAGE_SIZE;

    global.KSKState?.setSearchQuery?.("");

    return true;
  }

  /* REFRESH */

  function refresh() {
    renderStories();
    renderFeed();

    return true;
  }

  /* PUBLIC API */

  global.KSKHomePage = Object.freeze({
    getPosts,
    getStories,

    renderPost,
    renderStories,
    renderFeed,

    loadMorePosts,

    focusPost,

    setSearchQuery,
    clearSearch,

    refresh
  });

})(window);
