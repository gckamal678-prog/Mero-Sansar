
"use strict";

/*
 * =========================================================
 * KSK — SAVED POSTS PAGE
 * Mero-Sansar
 *
 * - Supabase Cloud Saved Posts
 * - Current account isolation
 * - Async loading and error handling
 * - Live refresh after save / unsave
 * - Shared KSKPostCard renderer
 * - No Local Storage dependency
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKSavedPage) return;

  const UTILS = () => global.KSKUtils || {};
  const POSTS = () => global.KSKSupabasePosts || {};
  const NAV = () => global.KSKNavigation || {};

  let savedPostIds = [];
  let savedPostItems = [];
  let loadingPromise = null;
  let requestVersion = 0;
  let lastOptions = {};

  function escapeHTML(value) {
    const utils = UTILS();

    if (typeof utils.escapeHTML === "function") {
      return utils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function isEnglish(options = {}) {
    if (typeof options.isEnglish === "boolean") {
      return options.isEnglish;
    }

    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function getText(ne, en) {
    return isEnglish(lastOptions) ? en : ne;
  }

  function getSavedPosts() {
    return [...savedPostIds];
  }

  function getSavedPostItems() {
    return [...savedPostItems];
  }

  function getPageContainer() {
    if (NAV().getCurrentPage?.() !== "saved") {
      return null;
    }

    return document.getElementById("otherPageText");
  }

  function renderLoading() {
    return `
      <section class="saved-posts-page">

        <h3 class="section-title">
          ${escapeHTML(getText("सेभ गरिएका पोस्ट", "Saved Posts"))}
        </h3>

        <div class="empty-state">
          <div class="empty-state-icon">🔖</div>
          <p>
            ${escapeHTML(getText(
              "सेभ गरिएका पोस्ट लोड हुँदैछन्...",
              "Loading saved posts..."
            ))}
          </p>
        </div>

      </section>
    `;
  }

  function renderEmpty() {
    return `
      <section class="saved-posts-page">

        <h3 class="section-title">
          ${escapeHTML(getText("सेभ गरिएका पोस्ट", "Saved Posts"))}
        </h3>

        <div class="empty-state">

          <div class="empty-state-icon">
            🔖
          </div>

          <p>
            ${escapeHTML(getText(
              "अहिलेसम्म पोस्ट सेभ गरिएको छैन।",
              "No saved posts yet."
            ))}
          </p>

          <p class="post-time">
            ${escapeHTML(getText(
              "Feed मा गएर मन परेको पोस्ट सेभ गर्नुहोस्।",
              "Save a post from your feed to see it here."
            ))}
          </p>

        </div>

      </section>
    `;
  }

  function renderError(message = "") {
    const fallback = getText(
      "सेभ गरिएका पोस्ट लोड गर्न सकिएन।",
      "Could not load saved posts."
    );

    return `
      <section class="saved-posts-page">

        <h3 class="section-title">
          ${escapeHTML(getText("सेभ गरिएका पोस्ट", "Saved Posts"))}
        </h3>

        <div class="empty-state">

          <div class="empty-state-icon">
            ⚠️
          </div>

          <p>
            ${escapeHTML(message || fallback)}
          </p>

          <button
            type="button"
            class="btn btn-primary"
            data-saved-posts-retry>
            ${escapeHTML(getText("फेरि प्रयास गर्नुहोस्", "Try Again"))}
          </button>

        </div>

      </section>
    `;
  }

  function renderPosts() {
    const english = isEnglish(lastOptions);

    const renderPost =
      typeof lastOptions.renderPost === "function"
        ? lastOptions.renderPost
        : post => global.KSKPostCard?.render?.(post, {
            isEnglish: english
          }) || "";

    const postHTML = savedPostItems
      .map(post => renderPost(post))
      .filter(Boolean)
      .join("");

    if (!savedPostItems.length) {
      return renderEmpty();
    }

    return `
      <section class="saved-posts-page">

        <h3 class="section-title">
          ${escapeHTML(getText("सेभ गरिएका पोस्ट", "Saved Posts"))}
        </h3>

        <div class="saved-posts-list">
          ${postHTML}
        </div>

      </section>
    `;
  }

  function updatePage(html) {
    const container = getPageContainer();

    if (!container) return false;

    container.innerHTML = html;

    global.KSKMediaUI?.refresh?.();
    global.KSKProfileMediaUI?.refresh?.();

    return true;
  }

  async function loadSavedPosts(force = false) {
    if (loadingPromise && !force) {
      return loadingPromise;
    }

    const version = ++requestVersion;

    loadingPromise = (async () => {
      try {
        const api = POSTS();

        if (typeof api.getSavedPosts !== "function") {
          throw new Error(
            getText(
              "Supabase Saved Posts सेवा उपलब्ध छैन।",
              "Supabase Saved Posts service is unavailable."
            )
          );
        }

        const result = await api.getSavedPosts();

        if (!result?.ok) {
          throw new Error(
            result?.message ||
            getText(
              "पोस्ट लोड गर्न सकिएन।",
              "Could not load posts."
            )
          );
        }

        if (version !== requestVersion) {
          return {
            ok: false,
            stale: true
          };
        }

        savedPostItems = Array.isArray(result.data)
          ? result.data
          : [];

        savedPostIds = savedPostItems
          .map(post => String(post?.id || "").trim())
          .filter(Boolean);

        updatePage(renderPosts());

        return {
          ok: true,
          data: savedPostItems
        };

      } catch (error) {
        console.error(
          "KSK Saved Posts Page Load Failed:",
          error
        );

        if (version === requestVersion) {
          savedPostItems = [];
          savedPostIds = [];

          updatePage(
            renderError(error?.message)
          );
        }

        return {
          ok: false,
          message: error?.message || ""
        };

      } finally {
        if (version === requestVersion) {
          loadingPromise = null;
        }
      }
    })();

    return loadingPromise;
  }

  function render(options = {}) {
    lastOptions = options || {};

    updatePage(renderLoading());

    loadSavedPosts().catch(error => {
      console.error(error);
    });

    return renderLoading();
  }

  function handleSavedPostsChange(event) {
    const detail = event?.detail || {};

    if (NAV().getCurrentPage?.() !== "saved") {
      return;
    }

    if (
      detail.action === "loaded" ||
      detail.action === "saved" ||
      detail.action === "removed"
    ) {
      loadSavedPosts(true).catch(error => {
        console.error(error);
      });
    }
  }

  function handleRetryClick(event) {
    const button = event.target?.closest?.(
      "[data-saved-posts-retry]"
    );

    if (!button) return;

    event.preventDefault();

    button.disabled = true;

    updatePage(renderLoading());

    loadSavedPosts(true).catch(error => {
      console.error(error);
    });
  }

  function initialize() {
    global.addEventListener(
      "ksk:saved-posts-change",
      handleSavedPostsChange
    );

    document.addEventListener(
      "click",
      handleRetryClick
    );

    return true;
  }

  function destroy() {
    global.removeEventListener(
      "ksk:saved-posts-change",
      handleSavedPostsChange
    );

    document.removeEventListener(
      "click",
      handleRetryClick
    );

    requestVersion += 1;
    loadingPromise = null;
    savedPostIds = [];
    savedPostItems = [];

    return true;
  }

  initialize();

  global.KSKSavedPage = Object.freeze({
    initialize,
    destroy,
    render,
    loadSavedPosts,
    getSavedPosts,
    getSavedPostItems
  });

  console.info("KSK Supabase Saved Posts Page loaded.");

})(window);
