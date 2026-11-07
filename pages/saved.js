/* =========================================================
   SAVED POSTS PAGE
   Mero-Sansar
   ========================================================= */

(function (global) {
  "use strict";

  const DATA = () => global.KSKData || null;
  const UTILS = () => global.KSKUtils || null;

  function escapeHTML(value) {
    const utils = UTILS();

    if (typeof utils?.escapeHTML === "function") {
      return utils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function isEnglish(options = {}) {
    return options.isEnglish === true;
  }

  function getSavedPosts() {
    const data = DATA();

    if (typeof data?.getSavedPosts !== "function") {
      return [];
    }

    const saved = data.getSavedPosts();

    return Array.isArray(saved) ? saved : [];
  }

  function getSavedPostItems() {
    const data = DATA();

    if (
      typeof data?.getPost !== "function" ||
      typeof data?.getSavedPosts !== "function"
    ) {
      return [];
    }

    return getSavedPosts()
      .map(id => data.getPost(id))
      .filter(post => post && typeof post === "object");
  }

  function renderFallbackPost(post) {
    const author = escapeHTML(post.author || "सदस्य");
    const content = escapeHTML(post.text || "");

    const utils = UTILS();

    let date = "";

    if (typeof utils?.formatDate === "function") {
      date = utils.formatDate(
        post.createdAt,
        "ne"
      );
    }

    return `
      <article
        class="post-card"
        data-post-id="${escapeHTML(post.id)}">

        <header class="post-header">

          <div class="post-author">

            <p class="post-author-name">
              ${author}
            </p>

            <p class="post-time">
              ${escapeHTML(date)}
            </p>

          </div>

        </header>

        ${
          content
            ? `
              <div class="post-content">
                ${content}
              </div>
            `
            : ""
        }

      </article>
    `;
  }

  function render(options = {}) {
    const english = isEnglish(options);
    const posts = getSavedPostItems();

    const renderPost =
      typeof options.renderPost === "function"
        ? options.renderPost
        : renderFallbackPost;

    const postHTML = posts
      .map(post => renderPost(post))
      .filter(Boolean)
      .join("");

    return `
      <section>

        <h3 class="section-title">
          ${
            english
              ? "Saved Posts"
              : "सेभ गरिएका पोस्ट"
          }
        </h3>

        ${
          posts.length
            ? postHTML
            : `
              <div class="empty-state">

                <div class="empty-state-icon">
                  🔖
                </div>

                <p>
                  ${
                    english
                      ? "No saved posts yet."
                      : "अहिलेसम्म पोस्ट सेभ गरिएको छैन।"
                  }
                </p>

              </div>
            `
        }

      </section>
    `;
  }

  const api = Object.freeze({
    render,
    getSavedPosts,
    getSavedPostItems
  });

  global.KSKSavedPage = api;

})(window);
