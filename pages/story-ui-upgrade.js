
"use strict";

/*
 * MERO SANSAR — STORY UI UPGRADE
 * Story tools, Highlights and custom Story deletion.
 * Local-only; no backend or core/data.js changes.
 */

(function (global) {
  "use strict";

  if (global.KSKStoryUIUpgrade) return;

  const FEATURE_KEY = "ksk_home_story_features_v1";
  const $ = (selector, root = document) => root.querySelector(selector);

  let observer = null;
  let decorating = false;
  let scanQueued = false;

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function escapeHTML(value) {
    if (typeof global.KSKUtils?.escapeHTML === "function") {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function getStory(id) {
    const stories = global.KSKData?.getStories?.(true) || [];

    return stories.find(item =>
      String(item?.id || "") === String(id || "")
    ) || null;
  }

  function profileId() {
    return String(global.KSKData?.getProfile?.()?.id || "");
  }

  function toast(message, type = "success") {
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function addStyles() {
    if ($("#kskStoryUIUpgradeStyles")) return;

    const style = document.createElement("style");
    style.id = "kskStoryUIUpgradeStyles";

    style.textContent = `
      #storiesList .ksk-story-manager-trigger,
      #storiesList .ksk-story-tool-card {
        flex:0 0 72px;width:72px;min-width:72px;
        display:flex;flex-direction:column;align-items:center;
        gap:5px;margin:0;padding:0;border:0;border-radius:0;
        background:transparent;color:var(--color-text);
        font:inherit;cursor:pointer;
      }

      #storiesList .ksk-story-manager-trigger .story-avatar,
      #storiesList .ksk-story-tool-card .story-avatar {
        width:62px;height:62px;display:flex;
        align-items:center;justify-content:center;
        border:1px solid var(--color-border);
        border-radius:50%;
        background:var(--color-surface-secondary);
        color:var(--color-text);font-size:22px;
      }

      #storiesList .ksk-story-manager-trigger .story-name,
      #storiesList .ksk-story-tool-card .story-name {
        display:block;width:100%;overflow:hidden;
        color:var(--color-text-secondary);font-size:11px;
        text-align:center;text-overflow:ellipsis;
        white-space:nowrap;
      }

      #storiesList .ksk-story-highlight-card {
        flex:0 0 72px;width:72px;min-width:72px;
        display:flex;flex-direction:column;
        align-items:center;gap:5px;padding:0;
        border:0;border-radius:0;
        background:transparent;color:var(--color-text);
        text-align:center;
      }

      #storiesList .ksk-story-highlight-card .story-avatar {
        width:62px;height:62px;padding:3px;overflow:hidden;
        border:2px solid transparent;border-radius:50%;
        background:
          linear-gradient(var(--color-surface),var(--color-surface)) padding-box,
          linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5) border-box;
      }

      #storiesList .ksk-story-highlight-card .story-avatar img,
      #storiesList .ksk-story-highlight-card .story-avatar .story-text-preview {
        width:100%;height:100%;display:flex;
        align-items:center;justify-content:center;
        border-radius:50%;object-fit:cover;overflow:hidden;
      }

      #storiesList .ksk-story-highlight-card .story-name {
        width:100%;overflow:hidden;
        color:var(--color-text-secondary);
        font-size:11px;text-overflow:ellipsis;
        white-space:nowrap;
      }

      .ksk-story-ui-delete {
        min-height:38px;margin-left:auto;
        padding:8px 13px;border:1px solid #dc3545;
        border-radius:9px;background:rgba(220,53,69,.08);
        color:#dc3545;font:inherit;font-size:13px;
        font-weight:700;cursor:pointer;
      }

      .ksk-story-ui-delete:focus-visible {
        outline:2px solid #dc3545;outline-offset:2px;
      }

      .ksk-story-delete-confirm {
        padding:14px 8px 18px;text-align:center;
      }

      .ksk-story-delete-icon {
        width:64px;height:64px;margin:4px auto 15px;
        display:flex;align-items:center;justify-content:center;
        border-radius:20px;background:rgba(220,53,69,.12);
        font-size:28px;
      }

      .ksk-story-delete-confirm h3 {
        margin:0 0 10px;font-size:18px;font-weight:800;
      }

      .ksk-story-delete-confirm p {
        max-width:350px;margin:0 auto;
        color:var(--color-text-secondary);
        font-size:14px;line-height:1.7;
      }

      .ksk-story-delete-confirm [data-story-delete-confirm] {
        background:#dc3545;border-color:#dc3545;color:#fff;
      }

      @media(max-width:480px) {
        #storiesList .story-card,
        #storiesList .ksk-story-highlight-card,
        #storiesList .ksk-story-manager-trigger,
        #storiesList .ksk-story-tool-card {
          flex:0 0 72px;min-width:72px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function loadHighlightPhoto(button, id) {
    const story = getStory(id);

    if (
      !story?.mediaId ||
      typeof global.KSKMedia?.getImageURL !== "function" ||
      button.dataset.highlightImageLoaded === "true"
    ) {
      return;
    }

    button.dataset.highlightImageLoaded = "true";

    Promise.resolve(global.KSKMedia.getImageURL(story.mediaId))
      .then(url => {
        if (!url || !button.isConnected) return;

        const avatar = button.querySelector(".story-avatar");
        if (!avatar) return;

        const image = document.createElement("img");
        image.src = url;
        image.alt = isEnglish() ? "Story highlight" : "Story Highlight";
        image.loading = "lazy";

        avatar.replaceChildren(image);
      })
      .catch(error => {
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
        Array.from(panel.querySelectorAll(".ksk-story-highlight"))
          .forEach(button => {
            const id = button.dataset.homeStoryView || "";
            const preview =
              button.querySelector("span")?.textContent ||
              button.querySelector("strong")?.textContent ||
              "Highlight";

            button.className = "story-card ksk-story-highlight-card";

            button.innerHTML =
              '<span class="story-avatar"><span class="story-text-preview">' +
              escapeHTML(preview.slice(0, 32)) +
              '</span></span><span class="story-name">Highlight</span>';

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
    } catch (error) {
      console.error("Story strip decoration failed.", error);
    } finally {
      decorating = false;
    }
  }

  function canShowDelete(story) {
    if (!story || !story.authorId) return Boolean(story);

    const ownId = profileId();

    return !ownId || String(story.authorId) === ownId;
  }

  function makeDeleteButton(id, label) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "ksk-story-ui-delete";
    button.dataset.storyUiDelete = String(id);
    button.textContent = label;
    button.setAttribute("aria-label", label);

    return button;
  }

  function addDeleteButtons() {
    const backdrops = document.querySelectorAll(".modal-backdrop");

    backdrops.forEach(backdrop => {
      const body = backdrop.querySelector(".modal-body");
      if (!body) return;

      body.querySelectorAll(".ksk-story-manager-item").forEach(item => {
        const select = item.querySelector("[data-home-story-privacy]");
        const id = select?.getAttribute("data-home-story-privacy");
        const actions = item.querySelector(".ksk-story-manager-actions");

        if (!id || !actions || actions.querySelector("[data-story-ui-delete]")) {
          return;
        }

        const story = getStory(id);
        if (!canShowDelete(story)) return;

        actions.appendChild(makeDeleteButton(
          id,
          isEnglish() ? "Delete Story" : "Story मेटाउनुहोस्"
        ));
      });

      const viewer = body.querySelector(".ksk-story-feature-view");
      const replyForm = viewer?.querySelector("[data-home-story-reply]");
      const id = replyForm?.getAttribute("data-home-story-reply");
      const actions = viewer?.querySelector(".ksk-story-view-actions");

      if (!id || !actions || actions.querySelector("[data-story-ui-delete]")) {
        return;
      }

      const story = getStory(id);
      if (!canShowDelete(story)) return;

      actions.appendChild(makeDeleteButton(
        id,
        isEnglish() ? "Delete Story" : "Story मेटाउनुहोस्"
      ));
    });
  }

  function scheduleDeleteButtonScan() {
    if (scanQueued) return;

    scanQueued = true;

    global.setTimeout(() => {
      scanQueued = false;
      addDeleteButtons();
    }, 0);
  }

  function removeStoryData(storyId) {
    const removed = global.KSKData?.deleteStory?.(storyId);

    if (!removed) return false;

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

    return true;
  }

  function confirmStoryDelete(id) {
    const storyId = String(id || "");

    if (!storyId) return false;

    const story = getStory(storyId);

    if (!story) {
      toast(isEnglish() ? "Story not found." : "Story भेटिएन।", "warning");
      return false;
    }

    const ownId = profileId();

    if (story.authorId && ownId && String(story.authorId) !== ownId) {
      toast(
        isEnglish()
          ? "You can delete only your own Story."
          : "आफ्नो Story मात्र मेटाउन सकिन्छ।",
        "error"
      );

      return false;
    }

    const modal = global.KSKModal?.openModal?.({
      title: isEnglish() ? "Delete Story?" : "Story मेटाउने?",

      content: `
        <div class="ksk-story-delete-confirm">
          <div class="ksk-story-delete-icon" aria-hidden="true">🗑️</div>
          <h3>${isEnglish() ? "Are you sure?" : "के तपाईं निश्चित हुनुहुन्छ?"}</h3>
          <p>
            ${isEnglish()
              ? "This Story will be removed from this device. This action cannot be undone."
              : "यो Story यस डिभाइसको स्थानीय डाटाबाट हटाइनेछ। यो कार्य फिर्ता गर्न मिल्दैन।"}
          </p>
        </div>
      `,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${isEnglish() ? "Cancel" : "रद्द गर्नुहोस्"}
        </button>

        <button
          type="button"
          class="btn btn-danger"
          data-story-delete-confirm>
          ${isEnglish() ? "Delete Story" : "Story मेटाउनुहोस्"}
        </button>
      `
    });

    if (!modal?.element) {
      toast(
        isEnglish()
          ? "Could not open confirmation."
          : "पुष्टि गर्ने विन्डो खोल्न सकिएन।",
        "error"
      );

      return false;
    }

    const confirmButton = modal.element.querySelector(
      "[data-story-delete-confirm]"
    );

    if (!confirmButton) {
      global.KSKModal?.closeModal?.();
      return false;
    }

    confirmButton.addEventListener("click", () => {
      if (confirmButton.disabled) return;

      confirmButton.disabled = true;

      const removed = removeStoryData(storyId);

      if (!removed) {
        global.KSKModal?.closeModal?.();

        toast(
          isEnglish() ? "Story could not be deleted." : "Story मेटाउन सकिएन।",
          "error"
        );

        return;
      }

      global.KSKModal?.closeModal?.();
      global.KSKHomePage?.refresh?.();

      toast(
        isEnglish() ? "Story deleted." : "Story मेटियो।",
        "success"
      );
    });

    return true;
  }

  function handleDelete(event) {
    const button = event.target?.closest?.("[data-story-ui-delete]");

    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    confirmStoryDelete(button.dataset.storyUiDelete);
  }

  function handleStoryOpen(event) {
    const trigger = event.target?.closest?.(
      "[data-story-manage], [data-home-story-view]"
    );

    if (!trigger) return;

    scheduleDeleteButtonScan();
  }

  function startObserver() {
    if (!document.body) return;

    if (!observer && typeof global.MutationObserver === "function") {
      observer = new MutationObserver(() => {
        try {
          decorateStoryStrip();
        } finally {
          addDeleteButtons();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    decorateStoryStrip();
    addDeleteButtons();
  }

  document.addEventListener("click", handleDelete, true);
  document.addEventListener("click", handleStoryOpen, true);

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startObserver,
      { once: true }
    );
  } else {
    startObserver();
  }

  global.KSKStoryUIUpgrade = Object.freeze({
    refresh() {
      decorateStoryStrip();
      addDeleteButtons();
      return true;
    },

    deleteStory: confirmStoryDelete
  });

})(window);
