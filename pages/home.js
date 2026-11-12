
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
  const STORY_FEATURE_KEY = "ksk_home_story_features_v1";

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

      .ksk-story-manager-trigger {
        display:inline-flex;
        align-items:center;
        gap:7px;
        margin:10px 0 4px;
        padding:8px 12px;
        border:1px solid var(--color-border);
        border-radius:999px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:12px;
        font-weight:700;
        cursor:pointer;
      }

      .ksk-story-feature-note {
        margin:8px 0;
        padding:9px 11px;
        border:1px solid var(--color-border);
        border-radius:10px;
        background:var(--color-surface-secondary);
        color:var(--color-text-secondary);
        font-size:11px;
        line-height:1.5;
      }

      .ksk-story-manager-list,
      .ksk-story-reply-list {
        display:flex;
        flex-direction:column;
        gap:9px;
        margin-top:12px;
      }

      .ksk-story-manager-item,
      .ksk-story-reply-item,
      .ksk-story-viewer-item {
        padding:11px;
        border:1px solid var(--color-border);
        border-radius:12px;
        background:var(--color-surface);
      }

      .ksk-story-manager-item strong,
      .ksk-story-reply-item strong,
      .ksk-story-viewer-item strong {
        display:block;
        margin-bottom:4px;
        color:var(--color-text);
      }

      .ksk-story-manager-item p,
      .ksk-story-reply-item p {
        margin:4px 0;
        color:var(--color-text-secondary);
        font-size:13px;
        overflow-wrap:anywhere;
      }

      .ksk-story-manager-actions,
      .ksk-story-view-actions,
      .ksk-story-reaction-row {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        margin-top:10px;
      }

      .ksk-story-manager-actions .btn,
      .ksk-story-view-actions .btn {
        min-height:36px;
        padding:7px 10px;
        font-size:12px;
      }

      .ksk-story-feature-view {
        display:flex;
        flex-direction:column;
        gap:9px;
      }

      .ksk-story-feature-view h3 {
        margin:0;
        color:var(--color-text);
      }

      .ksk-story-feature-media {
        display:block;
        width:100%;
        max-height:65vh;
        object-fit:contain;
        border-radius:14px;
        background:var(--color-surface-secondary);
      }

      .ksk-story-reaction-row button {
        min-width:42px;
        min-height:40px;
        border:1px solid var(--color-border);
        border-radius:10px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font-size:19px;
        cursor:pointer;
      }

      .ksk-story-reaction-row button.is-selected {
        border-color:var(--color-primary);
        background:var(--color-primary-soft);
      }

      .ksk-story-reply-form {
        display:flex;
        flex-direction:column;
        gap:8px;
        margin-top:12px;
      }

      .ksk-story-reply-form textarea {
        width:100%;
        min-height:72px;
        resize:vertical;
      }

      .ksk-story-meta-line {
        color:var(--color-text-secondary);
        font-size:11px;
      }

      .ksk-story-privacy-field {
        display:flex;
        flex-direction:column;
        gap:7px;
        margin:14px 0;
        color:var(--color-text);
        font-size:13px;
        font-weight:700;
      }

      .ksk-story-manager-item select {
        width:100%;
        margin-top:8px;
      }

      .ksk-story-highlights {
        margin:12px 0;
      }

      .ksk-story-highlights h3 {
        margin:0 0 8px;
        font-size:14px;
      }

      .ksk-story-highlight-list {
        display:flex;
        gap:8px;
        overflow-x:auto;
        padding:2px 0 8px;
      }

      .ksk-story-highlight {
        flex:0 0 150px;
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:5px;
        padding:10px;
        border:1px solid var(--color-border);
        border-radius:12px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        text-align:left;
        cursor:pointer;
      }

      .ksk-story-highlight strong {
        font-size:12px;
      }

      .ksk-story-highlight span {
        font-size:11px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
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

  /* STORY UPGRADE — LOCAL-ONLY FEATURES */

  function readStoryState() {
    try {
      const raw = global.localStorage?.getItem(STORY_FEATURE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};

      return parsed && parsed.items &&
        typeof parsed.items === "object"
        ? parsed
        : { version: 1, items: {} };

    } catch (error) {
      console.warn("Story state read failed.", error);
      return { version: 1, items: {} };
    }
  }

  function writeStoryState(state) {
    try {
      global.localStorage?.setItem(
        STORY_FEATURE_KEY,
        JSON.stringify(state)
      );

      return true;

    } catch (error) {
      console.error("Story state save failed.", error);

      showStoryToast(
        isEnglish()
          ? "Could not save Story settings."
          : "Story सेटिङ सुरक्षित गर्न सकिएन।",
        "error"
      );

      return false;
    }
  }

  function getStoryFeature(id) {
    const item = readStoryState().items[String(id || "")];

    return item && typeof item === "object"
      ? item
      : {};
  }

  function updateStoryFeature(id, patch) {
    const key = String(id || "");

    if (!key || !patch || typeof patch !== "object") {
      return false;
    }

    const state = readStoryState();

    state.items[key] = {
      ...(state.items[key] &&
        typeof state.items[key] === "object"
          ? state.items[key]
          : {}),
      ...patch
    };

    state.version = 1;

    return writeStoryState(state);
  }

  function normalizeStoryPrivacy(value) {
    return ["everyone", "friends", "only-me"].includes(value)
      ? value
      : "everyone";
  }

  function storyPrivacyLabel(value) {
    const labels = isEnglish()
      ? {
          everyone: "Everyone",
          friends: "Friends",
          "only-me": "Only me"
        }
      : {
          everyone: "सबै",
          friends: "साथीहरू",
          "only-me": "मात्र म"
        };

    return labels[normalizeStoryPrivacy(value)];
  }

  function storyViewer() {
    const profile = global.KSKData?.getProfile?.() || {};

    return {
      id: String(profile.id || "local-device"),
      name: String(
        profile.name || (isEnglish() ? "You" : "तपाईं")
      ).slice(0, 80)
    };
  }

  function managedStories() {
    const current = global.KSKData?.getStories?.(true) || [];

    const map = new Map(
      current
        .filter(item => item?.id)
        .map(item => [String(item.id), item])
    );

    const state = readStoryState();

    Object.keys(state.items).forEach(id => {
      const item = state.items[id];

      if (
        (item?.archived || item?.highlight) &&
        item.snapshot &&
        !map.has(id)
      ) {
        map.set(id, item.snapshot);
      }
    });

    return Array.from(map.values());
  }

  function showStoryToast(message, type = "success") {
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function storyModal(options) {
    if (typeof global.KSKModal?.openModal !== "function") {
      showStoryToast(
        isEnglish()
          ? "Story feature is unavailable."
          : "Story सुविधा उपलब्ध छैन।",
        "error"
      );

      return false;
    }

    global.KSKModal.openModal(options);

    return true;
  }

  function closeStoryModal() {
    global.KSKModal?.closeModal?.();
  }

  function recordStoryView(story) {
    const viewer = storyViewer();
    const feature = getStoryFeature(story.id);

    const views = Array.isArray(feature.views)
      ? feature.views
      : [];

    const next = views.filter(item =>
      String(item?.viewerId || "") !== viewer.id
    );

    next.push({
      viewerId: viewer.id,
      name: viewer.name,
      viewedAt: new Date().toISOString()
    });

    return updateStoryFeature(story.id, {
      views: next.slice(-100)
    });
  }

  function storyReactionCounts(feature) {
    const reactions =
      feature?.reactions &&
      typeof feature.reactions === "object"
        ? feature.reactions
        : {};

    const counts = {};

    Object.values(reactions).forEach(value => {
      if (["❤️", "👍", "😂", "😮", "😢"].includes(value)) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    return counts;
  }

  function storyRepliesMarkup(feature) {
    const replies = Array.isArray(feature?.replies)
      ? feature.replies.slice(-5)
      : [];

    if (!replies.length) {
      return '<p class="ksk-story-meta-line">' +
        (isEnglish()
          ? "No local replies yet."
          : "अहिलेसम्म स्थानीय जवाफ छैन।") +
        '</p>';
    }

    return replies.map(reply =>
      '<div class="ksk-story-reply-item"><strong>' +
      escapeHTML(
        reply.author || (isEnglish() ? "You" : "तपाईं")
      ) +
      '</strong><p>' +
      escapeHTML(reply.text || "") +
      '</p><span class="ksk-story-meta-line">' +
      escapeHTML(
        reply.createdAt ? formatDate(reply.createdAt) : ""
      ) +
      '</span></div>'
    ).join("");
  }

  function openStoryViewers(id) {
    const views = Array.isArray(getStoryFeature(id).views)
      ? getStoryFeature(id).views
      : [];

    const rows = views.length
      ? views.slice().reverse().map(view =>
          '<div class="ksk-story-viewer-item"><strong>' +
          escapeHTML(
            view.name ||
            (isEnglish() ? "Local viewer" : "स्थानीय दर्शक")
          ) +
          '</strong><span class="ksk-story-meta-line">' +
          escapeHTML(
            view.viewedAt ? formatDate(view.viewedAt) : ""
          ) +
          '</span></div>'
        ).join("")
      : '<div class="empty-state">' +
        (isEnglish()
          ? "No views recorded on this device."
          : "यो डिभाइसमा View रेकर्ड छैन।") +
        '</div>';

    closeStoryModal();

    storyModal({
      title: isEnglish()
        ? "Story viewers"
        : "स्टोरी हेर्नेहरू",

      content:
        '<div class="ksk-story-feature-note">' +
        (isEnglish()
          ? "Only views recorded in this browser appear here. This is not a real multi-user viewer list."
          : "यही Browser मा रेकर्ड भएका View मात्र देखिन्छन्। यो वास्तविक बहु-प्रयोगकर्ता Viewer सूची होइन।") +
        '</div><div class="ksk-story-manager-list">' +
        rows +
        '</div>',

      footer:
        '<button class="btn btn-secondary" type="button" data-modal-close>' +
        (isEnglish() ? "Close" : "बन्द गर्नुहोस्") +
        '</button>'
    });
  }

  function renderStoryManager() {
    const stories = managedStories();

    if (!stories.length) {
      return '<div class="empty-state">' +
        (isEnglish()
          ? "No stories to manage yet."
          : "व्यवस्थापन गर्न Story छैन।") +
        '</div>';
    }

    const rows = stories.map(story => {
      const feature = getStoryFeature(story.id);

      return '<article class="ksk-story-manager-item">' +
        '<strong>' +
        escapeHTML(story.author || "सदस्य") +
        '</strong>' +

        '<p>' +
        escapeHTML(
          String(story.text || "").slice(0, 130) ||
          (isEnglish() ? "Photo Story" : "फोटो Story")
        ) +
        '</p>' +

        '<span class="ksk-story-meta-line">' +
        (feature.archived
          ? (isEnglish() ? "Archived" : "Archive")
          : (isEnglish() ? "Active" : "सक्रिय")) +
        (feature.highlight ? " · Highlight" : "") +
        '</span>' +

        '<label class="ksk-story-privacy-field">' +
        (isEnglish()
          ? "Audience preference"
          : "Audience प्राथमिकता") +

        '<select class="form-input" data-home-story-privacy="' +
        escapeHTML(story.id) +
        '">' +

        '<option value="everyone"' +
        (normalizeStoryPrivacy(feature.privacy) === "everyone"
          ? " selected"
          : "") +
        '>' +
        (isEnglish() ? "Everyone" : "सबै") +
        '</option>' +

        '<option value="friends"' +
        (normalizeStoryPrivacy(feature.privacy) === "friends"
          ? " selected"
          : "") +
        '>' +
        (isEnglish() ? "Friends" : "साथीहरू") +
        '</option>' +

        '<option value="only-me"' +
        (normalizeStoryPrivacy(feature.privacy) === "only-me"
          ? " selected"
          : "") +
        '>' +
        (isEnglish() ? "Only me" : "मात्र म") +
        '</option>' +

        '</select></label>' +

        '<div class="ksk-story-manager-actions">' +

        '<button class="btn btn-secondary" type="button" data-home-story-open="' +
        escapeHTML(story.id) + '">' +
        (isEnglish() ? "View" : "हेर्नुहोस्") +
        '</button>' +

        '<button class="btn btn-secondary" type="button" data-home-story-manager-archive="' +
        escapeHTML(story.id) + '">' +
        (feature.archived
          ? (isEnglish() ? "Restore" : "फिर्ता ल्याउनुहोस्")
          : "Archive") +
        '</button>' +

        '<button class="btn btn-secondary" type="button" data-home-story-manager-highlight="' +
        escapeHTML(story.id) + '">' +
        (feature.highlight
          ? (isEnglish() ? "Remove highlight" : "Highlight हटाउनुहोस्")
          : "Highlight") +
        '</button>' +

        '<button class="btn btn-secondary" type="button" data-home-story-manager-viewers="' +
        escapeHTML(story.id) + '">' +
        (isEnglish() ? "Viewers" : "दर्शक") +
        '</button>' +

        '</div></article>';
    }).join("");

    return '<div class="ksk-story-feature-note">' +
      (isEnglish()
        ? "Settings are saved only on this device. Audience choices are preferences, not server-enforced privacy. Archived text is retained locally; expired image files may no longer be available."
        : "सेटिङ यही डिभाइसमा मात्र सुरक्षित हुन्छन्। Audience छनोट प्राथमिकता मात्र हो, Server बाट लागू हुने गोपनीयता होइन। Archive गरिएको लेखाइ स्थानीय रूपमा रहन्छ; म्याद सकिएका फोटो उपलब्ध नहुन सक्छन्।") +
      '</div><div class="ksk-story-manager-list">' +
      rows +
      '</div>';
  }

  function openStoryManager() {
    storyModal({
      title: isEnglish()
        ? "Manage Stories"
        : "Story व्यवस्थापन",

      content: renderStoryManager(),

      footer:
        '<button class="btn btn-secondary" type="button" data-modal-close>' +
        (isEnglish() ? "Close" : "बन्द गर्नुहोस्") +
        '</button>'
    });
  }

  function refreshStoryManager() {
    closeStoryModal();
    openStoryManager();
  }

  function renderStoryHighlights() {
    const section = $("#storiesList")?.closest(".stories-section");

    if (!section) return;

    let panel = section.querySelector("[data-story-highlights]");

    if (!panel) {
      panel = document.createElement("div");
      panel.className = "ksk-story-highlights";
      panel.dataset.storyHighlights = "true";

      const manager = section.querySelector("[data-story-manage]");

      (manager || $("#storiesList", section))
        ?.insertAdjacentElement("afterend", panel);
    }

    const highlights = managedStories().filter(story =>
      getStoryFeature(story.id).highlight
    );

    panel.innerHTML = highlights.length
      ? '<h3>Story Highlights</h3>' +
        '<div class="ksk-story-highlight-list">' +

        highlights.map(story =>
          '<button type="button" class="ksk-story-highlight" data-home-story-view="' +
          escapeHTML(story.id) +
          '"><strong>' +
          escapeHTML(story.author || "सदस्य") +
          '</strong><span>' +
          escapeHTML(
            String(story.text || "").slice(0, 55) ||
            (isEnglish() ? "Photo Story" : "फोटो Story")
          ) +
          '</span></button>'
        ).join("") +

        '</div>'
      : "";

    panel.hidden = !highlights.length;
  }

  function ensureStoryManagerButton() {
    const section = $("#storiesList")?.closest(".stories-section");

    if (!section) return;

    if (!section.querySelector("[data-story-manage]")) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "ksk-story-manager-trigger";
      button.dataset.storyManage = "true";

      button.textContent = isEnglish()
        ? "⚙ Manage Stories"
        : "⚙ Story व्यवस्थापन";

      $("#storiesList", section)
        ?.insertAdjacentElement("afterend", button);
    }

    renderStoryHighlights();
  }

  function hydrateStoryThumbnails() {
    document
      .querySelectorAll(
        "#storiesList [data-home-story-view][data-story-media]"
      )
      .forEach(async card => {
        if (
          card.dataset.mediaLoaded === "true" ||
          card.dataset.mediaLoaded === "loading"
        ) {
          return;
        }

        const story = getStories().find(item =>
          String(item.id) === String(card.dataset.homeStoryView)
        );

        if (
          !story?.mediaId ||
          typeof global.KSKMedia?.getImageURL !== "function"
        ) {
          return;
        }

        card.dataset.mediaLoaded = "loading";

        try {
          const url = await global.KSKMedia.getImageURL(story.mediaId);

          const avatar = card.querySelector(".story-avatar");

          if (!url || !card.isConnected || !avatar) {
            card.dataset.mediaLoaded = "error";
            return;
          }

          const image = document.createElement("img");

          image.className = "ksk-story-thumbnail";
          image.src = url;
          image.alt = isEnglish() ? "Story photo" : "Story फोटो";
          image.loading = "lazy";

          avatar.replaceChildren(image);

          card.dataset.mediaLoaded = "true";

        } catch (error) {
          card.dataset.mediaLoaded = "error";

          console.warn(
            "Story thumbnail loading failed.",
            error
          );
        }
      });
  }

  async function openStoryFeatureViewer(id) {
    const story = managedStories().find(item =>
      String(item.id) === String(id)
    );

    if (!story) {
      showStoryToast(
        isEnglish()
          ? "This Story is unavailable."
          : "यो Story उपलब्ध छैन।",
        "warning"
      );

      return false;
    }

    recordStoryView(story);

    let mediaMarkup = "";

    if (
      story.mediaId &&
      typeof global.KSKMedia?.getImageURL === "function"
    ) {
      try {
        const url = await global.KSKMedia.getImageURL(story.mediaId);

        mediaMarkup = url
          ? '<img class="ksk-story-feature-media" src="' +
            escapeHTML(url) +
            '" alt="' +
            (isEnglish() ? "Story photo" : "Story फोटो") +
            '">'
          : '<div class="ksk-story-feature-note">' +
            (isEnglish()
              ? "Photo is no longer available."
              : "फोटो अब उपलब्ध छैन।") +
            '</div>';

      } catch (error) {
        mediaMarkup =
          '<div class="ksk-story-feature-note">' +
          (isEnglish()
            ? "Photo could not be loaded."
            : "फोटो लोड गर्न सकिएन।") +
          '</div>';
      }
    }

    const feature = getStoryFeature(story.id);
    const viewer = storyViewer();

    const reactions =
      feature.reactions && typeof feature.reactions === "object"
        ? feature.reactions
        : {};

    const selected = reactions[viewer.id] || "";
    const counts = storyReactionCounts(feature);

    const countText =
      Object.keys(counts)
        .map(key => key + " " + counts[key])
        .join(" · ") ||
      (isEnglish()
        ? "No reactions yet"
        : "अहिलेसम्म Reaction छैन");

    const content =
      '<section class="ksk-story-feature-view">' +

      '<div class="ksk-story-feature-note"><strong>' +
      (isEnglish()
        ? "Audience preference: "
        : "Audience प्राथमिकता: ") +
      escapeHTML(storyPrivacyLabel(feature.privacy)) +
      '</strong><br>' +

      (isEnglish()
        ? "Local preference only; it does not restrict other visitors."
        : "स्थानीय प्राथमिकता मात्र हो; यसले अन्य Visitor लाई रोक्दैन।") +

      '</div><h3>' +
      escapeHTML(story.author || "सदस्य") +
      '</h3>' +

      mediaMarkup +

      (story.text
        ? '<div class="post-content">' +
          escapeHTML(story.text) +
          '</div>'
        : '') +

      '<div class="ksk-story-reaction-row">' +

      ["❤️", "👍", "😂", "😮", "😢"].map(emoji =>
        '<button type="button" data-home-story-reaction="' +
        emoji +
        '" data-story-id="' +
        escapeHTML(story.id) +
        '" class="' +
        (selected === emoji ? "is-selected" : "") +
        '" aria-pressed="' +
        (selected === emoji ? "true" : "false") +
        '">' +
        emoji +
        '</button>'
      ).join("") +

      '</div><p class="ksk-story-meta-line">' +
      escapeHTML(countText) +
      '</p>' +

      '<div class="ksk-story-view-actions">' +

      '<button class="btn btn-secondary" type="button" data-home-story-viewers="' +
      escapeHTML(story.id) + '">' +
      (isEnglish() ? "Viewers" : "दर्शक सूची") +
      '</button>' +

      '<button class="btn btn-secondary" type="button" data-home-story-archive="' +
      escapeHTML(story.id) + '">' +
      (feature.archived
        ? (isEnglish() ? "Restore" : "फिर्ता ल्याउनुहोस्")
        : "Archive") +
      '</button>' +

      '<button class="btn btn-secondary" type="button" data-home-story-highlight="' +
      escapeHTML(story.id) + '">' +
      (feature.highlight
        ? (isEnglish() ? "Remove highlight" : "Highlight हटाउनुहोस्")
        : "Highlight") +
      '</button>' +

      '</div><form class="ksk-story-reply-form" data-home-story-reply="' +
      escapeHTML(story.id) + '">' +

      '<label for="kskHomeStoryReply">' +
      (isEnglish()
        ? "Reply to Story"
        : "Story मा जवाफ दिनुहोस्") +
      '</label>' +

      '<textarea id="kskHomeStoryReply" class="form-textarea" maxlength="500" placeholder="' +
      (isEnglish()
        ? "Write a reply..."
        : "जवाफ लेख्नुहोस्...") +
      '"></textarea>' +

      '<button class="btn btn-primary" type="submit">' +
      (isEnglish()
        ? "Save local reply"
        : "स्थानीय जवाफ सुरक्षित गर्नुहोस्") +
      '</button>' +

      '</form><div class="ksk-story-reply-list">' +
      storyRepliesMarkup(feature) +
      '</div>' +

      '<div class="ksk-story-feature-note">' +

      (isEnglish()
        ? "Views, reactions and replies are stored only in this browser. Other users cannot see them."
        : "View, Reaction र जवाफ यही Browser मा मात्र सुरक्षित हुन्छन्। अन्य प्रयोगकर्ताले देख्दैनन्।") +

      '</div></section>';

    storyModal({
      title: isEnglish() ? "Story" : "स्टोरी",

      content,

      footer:
        '<button class="btn btn-secondary" type="button" data-modal-close>' +
        (isEnglish() ? "Close" : "बन्द गर्नुहोस्") +
        '</button>'
    });

    return true;
  }

  function toggleStoryFeature(id, field, fromViewer) {
    const feature = getStoryFeature(id);

    const story = managedStories().find(item =>
      String(item.id) === String(id)
    );

    if (!["archived", "highlight"].includes(field)) {
      return false;
    }

    if (!updateStoryFeature(id, {
      [field]: !feature[field],
      snapshot: story || feature.snapshot || null
    })) {
      return false;
    }

    renderStories();

    if (fromViewer) {
      closeStoryModal();
      openStoryFeatureViewer(id);
    } else {
      refreshStoryManager();
    }

    return true;
  }

  function setStoryReaction(id, emoji) {
    if (!["❤️", "👍", "😂", "😮", "😢"].includes(emoji)) {
      return false;
    }

    const feature = getStoryFeature(id);

    const reactions =
      feature.reactions && typeof feature.reactions === "object"
        ? { ...feature.reactions }
        : {};

    const viewer = storyViewer();

    if (reactions[viewer.id] === emoji) {
      delete reactions[viewer.id];
    } else {
      reactions[viewer.id] = emoji;
    }

    if (!updateStoryFeature(id, { reactions })) {
      return false;
    }

    closeStoryModal();
    openStoryFeatureViewer(id);

    return true;
  }

  function saveStoryReply(id, value) {
    const text = String(value || "").trim().slice(0, 500);

    if (!text) {
      showStoryToast(
        isEnglish()
          ? "Write a reply first."
          : "पहिले जवाफ लेख्नुहोस्।",
        "warning"
      );

      return false;
    }

    const feature = getStoryFeature(id);

    const replies = Array.isArray(feature.replies)
      ? feature.replies
      : [];

    const viewer = storyViewer();

    replies.push({
      id: "reply-" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 7),

      author: viewer.name,
      authorId: viewer.id,
      text,
      createdAt: new Date().toISOString()
    });

    if (!updateStoryFeature(id, {
      replies: replies.slice(-50)
    })) {
      return false;
    }

    showStoryToast(
      isEnglish()
        ? "Local reply saved on this device."
        : "स्थानीय जवाफ यो डिभाइसमा सुरक्षित भयो।",
      "success"
    );

    closeStoryModal();
    openStoryFeatureViewer(id);

    return true;
  }

  function handleStoryFeatureClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const create = target.closest("[data-home-story-create]");

    if (create) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (typeof global.KSKMediaUI?.openStoryCreator === "function") {
        global.KSKMediaUI.openStoryCreator();
      } else {
        showStoryToast(
          isEnglish()
            ? "Story creator unavailable."
            : "Story Creator उपलब्ध छैन।",
          "error"
        );
      }

      return;
    }

    const manage = target.closest("[data-story-manage]");

    if (manage) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openStoryManager();
      return;
    }

    const view = target.closest("[data-home-story-view]");

    if (view) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openStoryFeatureViewer(view.dataset.homeStoryView);
      return;
    }

    const managerOpen = target.closest("[data-home-story-open]");

    if (managerOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeStoryModal();
      openStoryFeatureViewer(managerOpen.dataset.homeStoryOpen);
      return;
    }

    const managerViewers = target.closest(
      "[data-home-story-manager-viewers]"
    );

    if (managerViewers) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openStoryViewers(managerViewers.dataset.homeStoryManagerViewers);
      return;
    }

    const managerArchive = target.closest(
      "[data-home-story-manager-archive]"
    );

    if (managerArchive) {
      event.preventDefault();
      event.stopImmediatePropagation();

      toggleStoryFeature(
        managerArchive.dataset.homeStoryManagerArchive,
        "archived",
        false
      );

      return;
    }

    const managerHighlight = target.closest(
      "[data-home-story-manager-highlight]"
    );

    if (managerHighlight) {
      event.preventDefault();
      event.stopImmediatePropagation();

      toggleStoryFeature(
        managerHighlight.dataset.homeStoryManagerHighlight,
        "highlight",
        false
      );

      return;
    }

    const viewers = target.closest("[data-home-story-viewers]");

    if (viewers) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openStoryViewers(viewers.dataset.homeStoryViewers);
      return;
    }

    const reaction = target.closest("[data-home-story-reaction]");

    if (reaction) {
      event.preventDefault();
      event.stopImmediatePropagation();

      setStoryReaction(
        reaction.dataset.storyId,
        reaction.dataset.homeStoryReaction
      );

      return;
    }

    const archive = target.closest("[data-home-story-archive]");

    if (archive) {
      event.preventDefault();
      event.stopImmediatePropagation();

      toggleStoryFeature(
        archive.dataset.homeStoryArchive,
        "archived",
        true
      );

      return;
    }

    const highlight = target.closest("[data-home-story-highlight]");

    if (highlight) {
      event.preventDefault();
      event.stopImmediatePropagation();

      toggleStoryFeature(
        highlight.dataset.homeStoryHighlight,
        "highlight",
        true
      );
    }
  }

  function handleStoryFeatureSubmit(event) {
    const form = event.target?.closest?.("[data-home-story-reply]");

    if (!form) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    saveStoryReply(
      form.dataset.homeStoryReply,
      $("textarea", form)?.value || ""
    );
  }

  function handleStoryFeatureChange(event) {
    const select = event.target?.closest?.(
      "[data-home-story-privacy]"
    );

    if (!select) return;

    if (updateStoryFeature(
      select.dataset.homeStoryPrivacy,
      {
        privacy: normalizeStoryPrivacy(select.value)
      }
    )) {
      showStoryToast(
        isEnglish()
          ? "Audience preference saved locally."
          : "Audience प्राथमिकता स्थानीय रूपमा सुरक्षित भयो।",
        "success"
      );
    }
  }

  if (
    global.document &&
    !global.document.documentElement.dataset.storyFeaturesBound
  ) {
    global.document.documentElement.dataset.storyFeaturesBound = "true";

    global.document.addEventListener(
      "click",
      handleStoryFeatureClick,
      true
    );

    global.document.addEventListener(
      "submit",
      handleStoryFeatureSubmit,
      true
    );

    global.document.addEventListener(
      "change",
      handleStoryFeatureChange,
      true
    );
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

    const stories = getStories().filter(story =>
      story &&
      typeof story === "object" &&
      (story.mediaId || String(story.text || "").trim()) &&
      !getStoryFeature(story.id).archived
    );

    const addLabel = isEnglish()
      ? "Add Story"
      : "स्टोरी थप्नुहोस्";

    const addStory = `
      <button
        class="story-card"
        type="button"
        data-home-story-create
        aria-label="${escapeHTML(addLabel)}">

        <span class="story-avatar">＋</span>

        <span class="story-name">
          ${escapeHTML(addLabel)}
        </span>

      </button>
    `;

    const storyItems = stories.map(story => {
      const hasPhoto = Boolean(story.mediaId);

      const preview = hasPhoto
        ? ""
        : getStoryPreview(story.text);

      return `
        <button
          class="story-card"
          type="button"
          data-home-story-view="${escapeHTML(story.id)}"
          ${hasPhoto ? 'data-story-media="true"' : ""}
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
    }).join("");

    storiesList.innerHTML = addStory + storyItems;

    ensureStoryManagerButton();
    hydrateStoryThumbnails();

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
