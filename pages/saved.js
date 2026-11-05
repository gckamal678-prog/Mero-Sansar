"use strict";

(function (global) {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  global.HamroPages.register("saved", {
    render() {
      const ids = global.HamroData.getSavedPosts();
      let posts = [];

      try {
        const stored = JSON.parse(localStorage.getItem("hs_posts_v1") || "[]");
        if (Array.isArray(stored)) posts = stored;
      } catch {}

      const saved = posts.filter((post) => ids.includes(String(post.id)));

      return `
        <section class="hs-page">
          <div class="hs-page-heading">
            <h2>सेभ गरिएका पोस्ट</h2>
            <p>पछि हेर्न सुरक्षित गरेका पोस्टहरू।</p>
          </div>
          <div class="hs-list">
            ${saved.map((post) => `
              <article class="card">
                <strong>${esc(post.author || post.authorName || "सदस्य")}</strong>
                <p>${esc(post.text || "मिडिया पोस्ट")}</p>
                <button class="btn btn-secondary" data-hs-action="unsave-post"
                  data-post-id="${esc(post.id)}">सेभ हटाउनुहोस्</button>
              </article>
            `).join("") || `<div class="empty-state"><p>अहिलेसम्म सेभ पोस्ट छैन।</p></div>`}
          </div>
        </section>
      `;
    },

    handle(action, data) {
      if (action === "unsave-post") {
        global.HamroData.toggleSavedPost(data.postId);
        global.HamroApp?.refreshPage();
      }
    }
  });
})(window);
