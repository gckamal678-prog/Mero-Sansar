
"use strict";

/*
 * MERO SANSAR — STORY UI UPGRADE
 * Story tools and Highlights stay inside the Story strip.
 * Adds local Story deletion without changing core/data.js.
 */

(function (global) {
  "use strict";

  if (global.KSKStoryUIUpgrade) return;

  const FEATURE_KEY = "ksk_home_story_features_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  let observer = null;
  let decorating = false;

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function escapeHTML(value) {
    if (typeof global.KSKUtils?.escapeHTML === "function") {
      return global.KSKUtils.escapeHTML(value);
    }
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function getStory(id) {
    const stories = global.KSKData?.getStories?.(true) || [];
    return stories.find(item =>
      String(item?.id || "") === String(id || "")
    ) || null;
  }

  function profileId() {
    return String(global.KSKData?.getProfile?.()?.id || "local-device");
  }

  function toast(message, type = "success") {
    const api = global.KSKToast;
    if (typeof api?.[type] === "function") api[type](message);
    else api?.show?.(message, type);
  }

  function addStyles() {
    if ($("#kskStoryUIUpgradeStyles")) return;

    const style = document.createElement("style");
    style.id = "kskStoryUIUpgradeStyles";
    style.textContent = `
      #storiesList .ksk-story-manager-trigger,
      #storiesList .ksk-story-tool-card {
        flex:0 0 72px;
        width:72px;
        min-width:72px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:5px;
        margin:0;
        padding:0;
        border:0;
        border-radius:0;
        background:transparent;
        color:var(--color-text);
        font:inherit;
        cursor:pointer;
      }

      #storiesList .ksk-story-manager-trigger .story-avatar,
      #storiesList .ksk-story-tool-card .story-avatar {
        width:62px;
        height:62px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:1px solid var(--color-border);
        border-radius:50%;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font-size:22px;
      }

      #storiesList .ksk-story-manager-trigger .story-name,
      #storiesList .ksk-story-tool-card .story-name {
        display:block;
        width:100%;
        overflow:hidden;
        color:var(--color-text-secondary);
        font-size:11px;
        text-align:center;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      #storiesList .ksk-story-highlight-card {
        flex:0 0 72px;
        width:72px;
        min-width:72px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:5px;
        padding:0;
        border:0;
        border-radius:0;
        background:transparent;
        color:var(--color-text);
        text-align:center;
      }

      #storiesList .ksk-story-highlight-card .story-avatar {
        width:62px;
        height:62px;
        padding:3px;
        overflow:hidden;
        border:2px solid transparent;
        border-radius:50%;
        background:
          linear-gradient(var(--color-surface),var(--color-surface)) padding-box,
          linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5) border-box;
      }

      #storiesList .ksk-story-highlight-card .story-avatar img,
      #storiesList .ksk-story-highlight-card .story-avatar .story-text-preview {
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        object-fit:cover;
        overflow:hidden;
      }

      #storiesList .ksk-story-highlight-card .story-name {
        width:100%;
        overflow:hidden;
        color:var(--color-text-secondary);
        font-size:11px;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .ksk-story-ui-delete {
        min-height:36px;
        margin-left:auto;
        padding:7px 11px;
        border:1px solid #dc3545;
        border-radius:9px;
        background:transparent;
        color:#dc3545;
        font:inherit;
        font-size:12px;
        font-weight:700;
        cursor:pointer;
      }

      @media(max-width:480px) {
        #storiesList .story-card,
        #storiesList .ksk-story-highlight-card,
        #storiesList .ksk-story-manager-trigger,
        #storiesList .ksk-story-tool-card {
          flex:0 0 72px;
          min-width:72px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function loadHighlightPhoto(button, id) {
    const story = getStory(id);
    if (!story?.mediaId || typeof global.KSKMedia?.getImageURL !== "function") return;
    if (button.dataset.highlightImageLoaded === "true") return;

    button.dataset.highlightImageLoaded = "true";
    global.KSKMedia.getImageURL(story.mediaId).then(url => {
      if (!url || !button.isConnected) return;
      const avatar = button.querySelector(".story-avatar");
      if (!avatar) return;

      const image = document.createElement("img");
      image.src = url;
      image.alt = isEnglish() ? "Story highlight" : "Story Highlight";
      image.loading = "lazy";
      avatar.replaceChildren(image);
    }).catch(error => {
      console.warn("Story Highlight thumbnail unavailable.", error);
    });
  }

  function decorateStoryStrip() {
    const list = $("#storiesList");
    const section = list?.closest(".stories-section");
    if (!list || !section || decorating) return;

    decorating = true;
    try {
      addStyles();

      const panel = section.querySelector("[data-story-highlights]");
      if (panel) {
        Array.from(panel.querySelectorAll(".ksk-story-highlight")).forEach(button => {
          const id = button.dataset.homeStoryView || "";
          const preview = button.querySelector("span")?.textContent ||
            button.querySelector("strong")?.textContent || "Highlight";

          button.className = "story-card ksk-story-highlight-card";
          button.innerHTML =
            '<span class="story-avatar"><span class="story-text-preview">' +
            escapeHTML(preview.slice(0, 32)) +
            '</span></span><span class="story-name">' +
            escapeHTML(isEnglish() ? "Highlight" : "Highlight") +
            '</span>';

          button.dataset.homeStoryView = id;
          button.removeAttribute("data-story-media");
          list.appendChild(button);
          loadHighlightPhoto(button, id);
        });
        panel.remove();
      }

      const manager = section.querySelector("[data-story-manage]");
      if (manager) {
        if (manager.dataset.storyUiReady !== "true") {
          manager.className = "story-card ksk-story-tool-card";
          manager.innerHTML =
            '<span class="story-avatar" aria-hidden="true">⚙</span>' +
            '<span class="story-name">' +
            escapeHTML(isEnglish() ? "Manage" : "व्यवस्थापन") +
            '</span>';
          manager.dataset.storyUiReady = "true";
        }

        if (manager.parentElement !== list || list.lastElementChild !== manager) {
          list.appendChild(manager);
        }
      }
    } finally {
      decorating = false;
    }
  }

  function addDeleteButtons() {
    const body = $(".modal-backdrop .modal-body");
    if (!body) return;

    body.querySelectorAll(".ksk-story-manager-item").forEach(item => {
      const select = item.querySelector("[data-home-story-privacy]");
      const id = select?.getAttribute("data-home-story-privacy");
      if (!id || item.querySelector("[data-story-ui-delete]")) return;

      const story = getStory(id);
      if (story?.authorId && String(story.authorId) !== profileId()) return;

      const actions = item.querySelector(".ksk-story-manager-actions");
      if (!actions) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "ksk-story-ui-delete";
      button.dataset.storyUiDelete = id;
      button.textContent = isEnglish() ? "Delete" : "मेटाउनुहोस्";
      actions.appendChild(button);
    });

    const viewer = body.querySelector(".ksk-story-feature-view");
    const replyForm = viewer?.querySelector("[data-home-story-reply]");
    const id = replyForm?.getAttribute("data-home-story-reply");
    const actions = viewer?.querySelector(".ksk-story-view-actions");

    if (id && actions && !actions.querySelector("[data-story-ui-delete]")) {
      const story = getStory(id);
      if (!story?.authorId || String(story.authorId) === profileId()) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ksk-story-ui-delete";
        button.dataset.storyUiDelete = id;
        button.textContent = isEnglish() ? "Delete Story" : "Story मेटाउनुहोस्";
        actions.appendChild(button);
      }
    }
  }

  function deleteStory(id) {
    const storyId = String(id || "");
    if (!storyId) return;

    const story = getStory(storyId);
    if (!story) {
      toast(isEnglish() ? "Story not found." : "Story भेटिएन।", "warning");
      return;
    }

    if (story.authorId && String(story.authorId) !== profileId()) {
      toast(
        isEnglish() ? "You can delete only your own Story." : "आफ्नो Story मात्र मेटाउन सकिन्छ।",
        "error"
      );
      return;
    }

    const confirmed = global.confirm(
      isEnglish()
        ? "Delete this Story from this device?"
        : "यो Story यो डिभाइसबाट मेटाउने?"
    );
    if (!confirmed) return;

    const removed = global.KSKData?.deleteStory?.(storyId);
    if (!removed) {
      toast(isEnglish() ? "Story could not be deleted." : "Story मेटाउन सकिएन।", "error");
      return;
    }

    try {
      const raw = global.localStorage.getItem(FEATURE_KEY);
      const state = raw ? JSON.parse(raw) : { version: 1, items: {} };
      if (state.items && typeof state.items === "object") {
        delete state.items[storyId];
        global.localStorage.setItem(FEATURE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      console.warn("Could not clear local Story preferences.", error);
    }

    global.KSKModal?.closeModal?.();
    global.KSKHomePage?.refresh?.();
    toast(isEnglish() ? "Story deleted." : "Story मेटियो।", "success");
  }

  function handleDelete(event) {
    const button = event.target?.closest?.("[data-story-ui-delete]");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    deleteStory(button.dataset.storyUiDelete);
  }

  function startObserver() {
    if (observer || !document.body) return;

    observer = new MutationObserver(() => {
      decorateStoryStrip();
      addDeleteButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    decorateStoryStrip();
    addDeleteButtons();
  }

  document.addEventListener("click", handleDelete, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  global.KSKStoryUIUpgrade = Object.freeze({
    refresh: decorateStoryStrip,
    deleteStory
  });

})(window);
