
"use strict";

/*
 * MERO SANSAR — LOCAL INSIGHTS
 * Read-only dashboard based on data available in this browser.
 * No server analytics, tracking, or core/data.js changes.
 */
(function (global) {
  "use strict";

  if (global.KSKInsightsPage) return;

  const STYLE_ID = "ksk-insights-style";
  let modal = null;
  let observer = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const english = () => global.KSKLanguage?.getLanguage?.() === "en";
  const t = (ne, en) => english() ? en : ne;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#039;"
    })[ch]);
  }

  function notify(message, type = "info") {
    if (typeof global.KSKToast?.[type] === "function") {
      global.KSKToast[type](message);
    } else {
      global.KSKToast?.show?.(message, type);
    }
  }

  function getProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getAllPosts() {
    const posts = global.KSKData?.getPosts?.();
    return Array.isArray(posts) ? posts : [];
  }

  function getOwnPosts() {
    const user = getProfile();
    const posts = getAllPosts();

    if (typeof global.KSKProfilePage?.getProfilePosts === "function") {
      return global.KSKProfilePage.getProfilePosts(user, posts);
    }

    const id = String(user.id || "");
    const name = String(user.name || "").trim();

    return posts.filter(post =>
      (id && String(post.authorId || "") === id) ||
      (!id && name && String(post.author || "").trim() === name)
    );
  }

  function getSocialCounts() {
    const social = global.KSKSocialData;

    if (social?.getLocalUserId && social?.getCounts) {
      const id = social.getLocalUserId();
      if (id) return social.getCounts(id);
    }

    return {
      friends: global.KSKData?.getFriends?.()?.length || 0,
      followers: 0,
      following: 0,
      incomingRequests: 0,
      outgoingRequests: 0,
      blocked: 0
    };
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
      ? Math.floor(number)
      : 0;
  }

  function getPostLikes(post) {
    if (Number.isFinite(Number(post?.likes))) {
      return safeNumber(post.likes);
    }

    const counts = post?.reactionCounts;
    if (!counts || typeof counts !== "object") return 0;

    return Object.values(counts).reduce(
      (total, value) => total + safeNumber(value),
      0
    );
  }

  function getPostComments(post) {
    if (Array.isArray(post?.comments)) return post.comments.length;

    return safeNumber(
      global.KSKData?.getCommentCount?.(post?.id)
    );
  }

  function isPhoto(post) {
    return Boolean(
      global.KSKProfilePage?.isPhotoPost?.(post) ||
      post?.mediaId ||
      post?.mediaData ||
      post?.image ||
      post?.imageUrl ||
      post?.photo
    );
  }

  function getOwnStories() {
    const stories = global.KSKData?.getStories?.(true);
    if (!Array.isArray(stories)) return [];

    const profile = getProfile();
    const id = String(profile.id || "");
    const name = String(profile.name || "").trim();

    return stories.filter(story => {
      if (!story || typeof story !== "object") return false;

      if (story.authorId && id) {
        return String(story.authorId) === id;
      }

      if (story.author && name) {
        return String(story.author).trim() === name;
      }

      return false;
    });
  }

  function getMetrics() {
    const posts = getOwnPosts();
    const social = getSocialCounts();
    const now = Date.now();
    const sevenDays = now - 7 * 24 * 60 * 60 * 1000;

    const comments = posts.reduce(
      (sum, post) => sum + getPostComments(post), 0
    );

    const likes = posts.reduce(
      (sum, post) => sum + getPostLikes(post), 0
    );

    const recentPosts = posts.filter(post => {
      const date = new Date(post.createdAt || 0).getTime();
      return Number.isFinite(date) && date >= sevenDays && date <= now;
    }).length;

    const stories = getOwnStories();
    const activeStories = stories.filter(story => {
      if (!story.expiresAt) return true;
      const expiry = new Date(story.expiresAt).getTime();
      return Number.isFinite(expiry) && expiry > now;
    }).length;

    const saved = global.KSKData?.getSavedPosts?.();
    const notifications = global.KSKData?.getNotifications?.();

    return {
      posts,
      postCount: posts.length,
      photoCount: posts.filter(isPhoto).length,
      comments,
      likes,
      engagement: comments + likes,
      recentPosts,
      friends: safeNumber(social.friends),
      followers: safeNumber(social.followers),
      following: safeNumber(social.following),
      stories: stories.length,
      activeStories,
      savedCount: Array.isArray(saved) ? saved.length : 0,
      notificationCount: Array.isArray(notifications)
        ? notifications.length
        : 0
    };
  }

  function monthData(posts) {
    const now = new Date();
    const result = [];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      const count = posts.filter(post => {
        const created = new Date(post.createdAt || 0);
        return !Number.isNaN(created.getTime()) &&
          created.getFullYear() === year &&
          created.getMonth() === month;
      }).length;

      result.push({
        label: date.toLocaleDateString(
          english() ? "en-US" : "ne-NP",
          { month: "short" }
        ),
        count
      });
    }

    return result;
  }

  function formatDate(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(
      english() ? "en-US" : "ne-NP",
      { day: "numeric", month: "short", year: "numeric" }
    );
  }

  function statCard(icon, value, label, note = "") {
    return `
      <article class="ksk-insight-stat">
        <span class="ksk-insight-stat-icon">${icon}</span>
        <strong>${value}</strong>
        <span>${esc(label)}</span>
        ${note ? `<small>${esc(note)}</small>` : ""}
      </article>
    `;
  }

  function renderChart(posts) {
    const months = monthData(posts);
    const max = Math.max(1, ...months.map(item => item.count));

    return `
      <section class="ksk-insight-panel">
        <h3>${t("पोस्ट गतिविधि", "Post activity")}</h3>
        <p class="ksk-insight-muted">
          ${t("पछिल्ला ६ महिनाको पोस्ट संख्या", "Posts published over the last 6 months")}
        </p>

        <div class="ksk-insight-chart">
          ${months.map(item => {
            const height = item.count
              ? Math.max(8, Math.round(item.count / max * 100))
              : 3;

            return `
              <div class="ksk-insight-chart-column">
                <strong>${item.count}</strong>
                <div class="ksk-insight-bar-track">
                  <span style="height:${height}%"></span>
                </div>
                <small>${esc(item.label)}</small>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderTopPosts(posts) {
    const ranked = posts.map(post => ({
      post,
      likes: getPostLikes(post),
      comments: getPostComments(post)
    })).sort((a, b) =>
      (b.likes + b.comments) - (a.likes + a.comments)
    ).slice(0, 3);

    if (!ranked.length) {
      return `
        <div class="ksk-insight-empty">
          ${t("तपाईंका पोस्ट प्रकाशित भएपछि यहाँ देखिनेछन्।", "Your published posts will appear here.")}
        </div>
      `;
    }

    return ranked.map((item, index) => `
      <article class="ksk-insight-top-post">
        <span class="ksk-insight-rank">${index + 1}</span>
        <div class="ksk-insight-top-copy">
          <strong>${esc(
            String(item.post.text || "").trim().slice(0, 90) ||
            t("फोटो पोस्ट", "Photo post")
          )}</strong>
          <small>${esc(formatDate(item.post.createdAt))}</small>
        </div>
        <span class="ksk-insight-engagement">
          ❤️ ${item.likes} · 💬 ${item.comments}
        </span>
      </article>
    `).join("");
  }

  function ensureStyles() {
    if ($("#" + STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ksk-insights-trigger{
        grid-column:1/-1;min-height:48px;
        border:1px solid var(--color-border);
        border-radius:12px;padding:10px;
        background:var(--color-surface-secondary);
        color:var(--color-text);font:inherit;
        font-weight:750;cursor:pointer
      }
      .ksk-insights-overlay{
        position:fixed;inset:0;z-index:10070;
        display:flex;align-items:center;justify-content:center;
        padding:12px;background:rgba(0,0,0,.66)
      }
      .ksk-insights-dialog{
        width:min(100%,620px);max-height:92vh;overflow:auto;
        padding:16px;border:1px solid var(--color-border);
        border-radius:18px;background:var(--color-surface);
        color:var(--color-text);box-shadow:0 18px 60px rgba(0,0,0,.3)
      }
      .ksk-insights-head{
        display:flex;align-items:center;justify-content:space-between;
        gap:10px;margin-bottom:12px
      }
      .ksk-insights-head h2{margin:0;font-size:19px}
      .ksk-insights-close{
        width:38px;height:38px;border:0;border-radius:50%;
        background:var(--color-surface-secondary);
        color:var(--color-text);font-size:22px;cursor:pointer
      }
      .ksk-insights-note{
        padding:10px 12px;margin-bottom:13px;
        border:1px solid var(--color-border);border-radius:11px;
        background:var(--color-surface-secondary);
        color:var(--color-text-secondary);font-size:12px;line-height:1.5
      }
      .ksk-insight-grid{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;margin-bottom:12px
      }
      .ksk-insight-stat{
        min-width:0;padding:12px;
        display:flex;flex-direction:column;gap:4px;
        border:1px solid var(--color-border);border-radius:13px;
        background:var(--color-surface-secondary)
      }
      .ksk-insight-stat-icon{font-size:19px}
      .ksk-insight-stat strong{font-size:23px;line-height:1.2}
      .ksk-insight-stat>span:nth-of-type(2){font-size:12px;font-weight:750}
      .ksk-insight-stat small{font-size:10px;color:var(--color-muted)}
      .ksk-insight-panel{
        padding:13px;margin:10px 0;
        border:1px solid var(--color-border);border-radius:13px
      }
      .ksk-insight-panel h3{margin:0;font-size:15px}
      .ksk-insight-muted{margin:4px 0 12px;color:var(--color-muted);font-size:11px}
      .ksk-insight-chart{
        height:150px;display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;
        align-items:end
      }
      .ksk-insight-chart-column{
        height:100%;display:flex;flex-direction:column;
        align-items:center;justify-content:flex-end;gap:5px;
        min-width:0
      }
      .ksk-insight-chart-column strong{font-size:11px}
      .ksk-insight-bar-track{
        height:100px;width:100%;max-width:34px;
        display:flex;align-items:flex-end;overflow:hidden;
        border-radius:7px;background:var(--color-surface-secondary)
      }
      .ksk-insight-bar-track span{
        display:block;width:100%;min-height:3px;
        border-radius:7px 7px 0 0;background:var(--color-primary)
      }
      .ksk-insight-chart-column small{
        font-size:10px;color:var(--color-muted)
      }
      .ksk-insight-top-post{
        display:flex;align-items:center;gap:9px;
        padding:10px 0;border-top:1px solid var(--color-border)
      }
      .ksk-insight-rank{
        width:27px;height:27px;flex:0 0 27px;
        display:grid;place-items:center;border-radius:50%;
        background:var(--color-surface-secondary);font-weight:800
      }
      .ksk-insight-top-copy{min-width:0;flex:1}
      .ksk-insight-top-copy strong{
        display:block;font-size:12px;overflow-wrap:anywhere
      }
      .ksk-insight-top-copy small{
        display:block;margin-top:3px;color:var(--color-muted);font-size:10px
      }
      .ksk-insight-engagement{font-size:10px;white-space:nowrap}
      .ksk-insight-empty{
        padding:14px;text-align:center;color:var(--color-muted);font-size:12px
      }
      .ksk-insights-refresh{
        width:100%;min-height:42px;margin-top:10px;
        border:0;border-radius:10px;background:var(--color-primary);
        color:#fff;font:inherit;font-weight:750;cursor:pointer
      }
      @media(max-width:380px){
        .ksk-insights-dialog{padding:12px}
        .ksk-insight-grid{gap:7px}
        .ksk-insight-stat{padding:9px}
        .ksk-insight-engagement{font-size:9px}
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function renderDashboard() {
    const m = getMetrics();

    return `
      <p class="ksk-insights-note">
        ${t(
          "यी तथ्याङ्क यही ब्राउजरमा उपलब्ध स्थानीय डाटाबाट गणना गरिएका हुन्। Server Analytics वा वास्तविक अनलाइन तथ्याङ्क होइनन्।",
          "These figures are calculated from data available in this browser. They are not server analytics or verified online statistics."
        )}
      </p>

      <div class="ksk-insight-grid">
        ${statCard("📝", m.postCount, t("आफ्ना पोस्ट", "Your posts"))}
        ${statCard("🖼️", m.photoCount, t("फोटो पोस्ट", "Photo posts"))}
        ${statCard("❤️", m.likes, t("प्रतिक्रिया", "Reactions"))}
        ${statCard("💬", m.comments, t("कमेन्ट", "Comments"))}
        ${statCard("🤝", m.friends, t("साथी", "Friends"))}
        ${statCard("👥", m.followers, t("फलोअर", "Followers"))}
        ${statCard("➡️", m.following, t("फलो गरिएका", "Following"))}
        ${statCard("📖", m.activeStories, t("सक्रिय स्टोरी", "Active stories"))}
        ${statCard("🔖", m.savedCount, t("सेभ पोस्ट", "Saved posts"))}
        ${statCard("🔔", m.notificationCount, t("सूचनाहरू", "Notifications"))}
      </div>

      <div class="ksk-insight-panel">
        <h3>${t("हालको गतिविधि", "Recent activity")}</h3>
        <p class="ksk-insight-muted">
          ${t("पछिल्ला ७ दिनमा प्रकाशित पोस्ट", "Posts published in the last 7 days")}
        </p>
        <strong style="font-size:25px">${m.recentPosts}</strong>
      </div>

      ${renderChart(m.posts)}

      <section class="ksk-insight-panel">
        <h3>${t("धेरै प्रतिक्रिया पाएका पोस्ट", "Posts with most engagement")}</h3>
        <p class="ksk-insight-muted">
          ${t("प्रतिक्रिया र कमेन्टको जोडिएको संख्या अनुसार", "Ranked by combined reactions and comments")}
        </p>
        ${renderTopPosts(m.posts)}
      </section>

      <button type="button" class="ksk-insights-refresh" data-insights-refresh>
        ↻ ${t("तथ्याङ्क Refresh गर्नुहोस्", "Refresh insights")}
      </button>
    `;
  }

  function close() {
    if (modal) {
      modal.remove();
      modal = null;
    }
    document.removeEventListener("keydown", handleKeydown);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") close();
  }

  function open() {
    ensureStyles();
    close();

    modal = document.createElement("div");
    modal.className = "ksk-insights-overlay";
    modal.innerHTML = `
      <section class="ksk-insights-dialog"
        role="dialog" aria-modal="true"
        aria-label="${t("मेरो Insights", "My Insights")}">

        <header class="ksk-insights-head">
          <h2>📊 ${t("मेरो Insights", "My Insights")}</h2>
          <button type="button" class="ksk-insights-close"
            data-insights-close aria-label="${t("बन्द गर्नुहोस्", "Close")}">×</button>
        </header>

        <div data-insights-content>${renderDashboard()}</div>
      </section>
    `;

    modal.addEventListener("click", event => {
      if (
        event.target === modal ||
        event.target.closest("[data-insights-close]")
      ) {
        close();
        return;
      }

      if (event.target.closest("[data-insights-refresh]")) {
        const content = $("[data-insights-content]", modal);
        if (content) content.innerHTML = renderDashboard();
      }
    });

    document.body.appendChild(modal);
    document.addEventListener("keydown", handleKeydown);
    $("[data-insights-close]", modal)?.focus();
  }

  function injectButton() {
    const section = $("#otherPageText .profile-section");
    const extras = section?.querySelector("[data-profile-extras]");

    if (!extras || extras.querySelector("[data-ksk-insights-open]")) {
      return false;
    }

    ensureStyles();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ksk-insights-trigger";
    button.dataset.kskInsightsOpen = "true";
    button.textContent = "📊 " + t("मेरो Insights", "My Insights");

    extras.appendChild(button);
    return true;
  }

  function initialize() {
    if (observer || !document.body) return true;

    ensureStyles();

    observer = new MutationObserver(() => injectButton());
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    injectButton();

    document.addEventListener("click", event => {
      if (event.target?.closest?.("[data-ksk-insights-open]")) {
        open();
      }
    });

    global.addEventListener("ksk:data-change", () => {
      if (modal) {
        const content = $("[data-insights-content]", modal);
        if (content) content.innerHTML = renderDashboard();
      }
    });

    global.addEventListener("ksk:social-change", () => {
      if (modal) {
        const content = $("[data-insights-content]", modal);
        if (content) content.innerHTML = renderDashboard();
      }
    });

    return true;
  }

  global.KSKInsightsPage = Object.freeze({
    initialize,
    open,
    close,
    getMetrics
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);
