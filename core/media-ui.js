
"use strict";

/*
 * KSK — MEDIA UI
 * Story and Post photo composer + media rendering.
 * Dependencies: KSKMedia, KSKData, KSKModal
 */

(function (global) {
  const $ = (selector, root = document) =>
    root.querySelector(selector);

  let observer = null;
  let renderQueued = false;

  const mediaURLCache = new Map();

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function toast(message, type = "info") {
    const api = global.KSKToast;

    if (api?.[type]) {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function escapeHTML(value = "") {
    return global.KSKUtils?.escapeHTML
      ? global.KSKUtils.escapeHTML(value)
      : String(value).replace(/[&<>"']/g, char => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[char]);
  }

  function getProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getDisplayName() {
    const profile = getProfile();

    return profile.name ||
      (isEnglish() ? "You" : "तपाईं");
  }

  function getModal() {
    return global.KSKModal;
  }

  function openModal(options) {
    if (!getModal()?.openModal) {
      toast(
        isEnglish()
          ? "This feature is unavailable."
          : "यो सुविधा अहिले उपलब्ध छैन।",
        "error"
      );

      return null;
    }

    return getModal().openModal(options);
  }

  function closeModal() {
    getModal()?.closeModal?.();
  }

  function getFileInput(form) {
    return $("input[type='file']", form);
  }

  function bindImagePicker(form, preview) {
    const input = getFileInput(form);

    if (!input || !preview) return;

    let previewURL = "";

    input.addEventListener("change", () => {
      const file = input.files?.[0];

      if (!file) return;

      if (!String(file.type).startsWith("image/")) {
        input.value = "";

        toast(
          isEnglish()
            ? "Please select an image."
            : "कृपया फोटो छान्नुहोस्।",
          "warning"
        );

        return;
      }

      if (file.size > 12 * 1024 * 1024) {
        input.value = "";

        toast(
          isEnglish()
            ? "Image must be smaller than 12 MB."
            : "फोटो १२ MB भन्दा सानो हुनुपर्छ।",
          "warning"
        );

        return;
      }

      if (previewURL) {
        URL.revokeObjectURL(previewURL);
      }

      previewURL = URL.createObjectURL(file);

      preview.innerHTML = `
        <img
          src="${previewURL}"
          alt="${isEnglish() ? "Image preview" : "फोटो पूर्वावलोकन"}">
        <button
          type="button"
          class="ksk-media-remove"
          aria-label="${isEnglish() ? "Remove photo" : "फोटो हटाउनुहोस्"}">
          ×
        </button>
      `;

      preview.classList.remove("hidden");

      $(".ksk-media-remove", preview)?.addEventListener(
        "click",
        () => {
          input.value = "";
          preview.innerHTML = "";
          preview.classList.add("hidden");

          URL.revokeObjectURL(previewURL);
          previewURL = "";
        }
      );
    });
  }

  function injectStyles() {
    if ($("#kskMediaStyles")) return;

    const style = document.createElement("style");

    style.id = "kskMediaStyles";

    style.textContent = `
      .ksk-media-tools {
        display:flex;
        align-items:center;
        gap:10px;
        margin-top:12px;
        flex-wrap:wrap;
      }

      .ksk-media-pick {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        padding:10px 14px;
        border:1px solid var(--color-border);
        border-radius:var(--radius-md, 12px);
        background:var(--color-surface-secondary);
        color:var(--color-text);
        cursor:pointer;
        font:inherit;
      }

      .ksk-media-pick input {
        display:none;
      }

      .ksk-media-preview {
        position:relative;
        margin-top:14px;
        max-width:100%;
        overflow:hidden;
        border-radius:14px;
      }

      .ksk-media-preview img {
        display:block;
        width:100%;
        max-height:300px;
        object-fit:contain;
        background:var(--color-surface-secondary);
      }

      .ksk-media-remove {
        position:absolute;
        top:8px;
        right:8px;
        width:32px;
        height:32px;
        border:0;
        border-radius:50%;
        background:rgba(0,0,0,.75);
        color:#fff;
        font-size:22px;
        cursor:pointer;
      }

      .ksk-post-media {
        display:block;
        width:100%;
        margin:10px 0 14px;
        overflow:hidden;
        border-radius:12px;
        background:var(--color-surface-secondary);
      }

      .ksk-post-media img {
        display:block;
        width:100%;
        max-height:560px;
        object-fit:contain;
      }

      .ksk-story-media {
        display:block;
        width:100%;
        max-height:65vh;
        margin:14px 0;
        border-radius:14px;
        object-fit:contain;
        background:var(--color-surface-secondary);
      }

      .ksk-media-error {
        padding:14px;
        color:var(--color-text-secondary);
        text-align:center;
      }
    `;

    document.head.appendChild(style);
  }

  function composerContent(type) {
    const isStory = type === "story";

    const title = isStory
      ? (isEnglish() ? "Create Story" : "नयाँ Story")
      : (isEnglish() ? "Create Post" : "नयाँ पोस्ट");

    const placeholder = isStory
      ? (isEnglish() ? "Write your story..." : "आफ्नो Story लेख्नुहोस्...")
      : (isEnglish() ? "What is on your mind?" : "के सोच्दै हुनुहुन्छ?");

    const formId = isStory
      ? "kskMediaStoryForm"
      : "kskMediaPostForm";

    const textId = isStory
      ? "kskMediaStoryText"
      : "kskMediaPostText";

    const previewId = isStory
      ? "kskMediaStoryPreview"
      : "kskMediaPostPreview";

    return {
      title,

      content: `
        <form id="${formId}">

          <textarea
            id="${textId}"
            class="form-textarea"
            rows="${isStory ? 4 : 5}"
            maxlength="${isStory ? 1000 : 10000}"
            placeholder="${escapeHTML(placeholder)}"></textarea>

          <div class="ksk-media-tools">

            <label class="ksk-media-pick">
              📷 ${isEnglish() ? "Add Photo" : "फोटो थप्नुहोस्"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif">
            </label>

          </div>

          <div
            id="${previewId}"
            class="ksk-media-preview hidden">
          </div>

        </form>
      `,

      formId,
      textId,
      previewId
    };
  }

  async function publishMedia(type, modal, ids) {
    const form = $(`#${ids.formId}`, modal.element);

    const text = $(`#${ids.textId}`, modal.element)
      ?.value.trim() || "";

    const input = getFileInput(form);
    const file = input?.files?.[0] || null;

    if (!text && !file) {
      toast(
        isEnglish()
          ? "Write something or add a photo."
          : "केही लेख्नुहोस् वा फोटो थप्नुहोस्।",
        "warning"
      );

      return;
    }

    let media = null;

    if (file) {
      try {
        media = await global.KSKMedia.saveImage(file, {
          name: file.name
        });
      } catch (error) {
        console.error("KSK media save failed:", error);

        toast(
          error.message ||
          (isEnglish()
            ? "Could not save photo."
            : "फोटो सुरक्षित गर्न सकिएन।"),
          "error"
        );

        return;
      }
    }

    const user = getProfile();

    const payload = {
      author: getDisplayName(),
      authorId: user.id || "",
      authorInitial: user.name?.charAt(0) || "स",
      text
    };

    if (media) {
      payload.mediaId = media.id;
      payload.mediaType = media.type;
    }

    let result = false;

    if (type === "story") {
      result = global.KSKData?.addStory?.(payload);
    } else {
      result = global.KSKData?.addPost?.({
        ...payload,
        likes: 0,
        liked: false
      });
    }

    if (!result) {
      if (media?.id) {
        await global.KSKMedia.deleteImage(media.id)
          .catch(() => {});
      }

      toast(
        isEnglish()
          ? "Could not publish. Please try again."
          : "प्रकाशित गर्न सकिएन। फेरि प्रयास गर्नुहोस्।",
        "error"
      );

      return;
    }

    closeModal();

    global.KSKApp?.renderStories?.();
    global.KSKApp?.renderFeed?.();

    toast(
      type === "story"
        ? (isEnglish() ? "Story published." : "Story प्रकाशित भयो।")
        : (isEnglish() ? "Post published." : "पोस्ट प्रकाशित भयो।"),
      "success"
    );
  }

  function openComposer(type) {
    const ids = composerContent(type);

    const modal = openModal({
      title: ids.title,
      content: ids.content,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${isEnglish() ? "Cancel" : "रद्द"}
        </button>

        <button
          type="submit"
          form="${ids.formId}"
          class="btn btn-primary">
          ${isEnglish() ? "Publish" : "प्रकाशित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal) return;

    const form = $(`#${ids.formId}`, modal.element);
    const preview = $(`#${ids.previewId}`, modal.element);

    bindImagePicker(form, preview);

    $(`#${ids.textId}`, modal.element)?.focus();

    form?.addEventListener("submit", event => {
      event.preventDefault();

      const submit = $("button[type='submit']", modal.element);

      if (submit) submit.disabled = true;

      publishMedia(type, modal, ids)
        .finally(() => {
          if (submit && modal.element.isConnected) {
            submit.disabled = false;
          }
        });
    });
  }

  async function imageMarkup(mediaId, className) {
    if (!mediaId) return "";

    try {
      const url = await global.KSKMedia.getImageURL(mediaId);

      if (!url) {
        return `<div class="ksk-media-error">${
          isEnglish() ? "Photo unavailable." : "फोटो उपलब्ध छैन।"
        }</div>`;
      }

      mediaURLCache.set(String(mediaId), url);

      return `
        <div class="${className}">
          <img
            src="${url}"
            alt="${isEnglish() ? "Shared photo" : "साझा गरिएको फोटो"}"
            loading="lazy">
        </div>
      `;
    } catch (error) {
      console.error("KSK media render failed:", error);

      return `<div class="ksk-media-error">${
        isEnglish() ? "Could not load photo." : "फोटो लोड गर्न सकिएन।"
      }</div>`;
    }
  }

  async function renderPostMedia(postElement) {
    if (!postElement || postElement.dataset.mediaReady === "true") {
      return;
    }

    const postId = postElement.dataset.postId;
    const post = global.KSKData?.getPost?.(postId);

    if (!post?.mediaId) return;

    postElement.dataset.mediaReady = "loading";

    const markup = await imageMarkup(
      post.mediaId,
      "ksk-post-media"
    );

    if (!postElement.isConnected) return;

    const footer = $(".post-actions", postElement);

    if (footer) {
      footer.insertAdjacentHTML("beforebegin", markup);
    }

    postElement.dataset.mediaReady = "true";
  }

  function renderAllPostMedia() {
    document.querySelectorAll(".post-card[data-post-id]")
      .forEach(renderPostMedia);
  }

  function queuePostRender() {
    if (renderQueued) return;

    renderQueued = true;

    requestAnimationFrame(() => {
      renderQueued = false;
      renderAllPostMedia();
    });
  }

  async function viewStoryWithMedia(id) {
    const story = global.KSKData?.getStories?.(true)
      ?.find(item => String(item.id) === String(id));

    if (!story) return;

    const media = story.mediaId
      ? await imageMarkup(story.mediaId, "ksk-story-media")
      : "";

    const content = `
      <div class="story-view-content">

        <h3>${escapeHTML(story.author || "सदस्य")}</h3>

        ${media}

        ${story.text
          ? `<div class="post-content">${escapeHTML(story.text)}</div>`
          : ""}

      </div>
    `;

    openModal({
      title: "Story",
      content,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${isEnglish() ? "Close" : "बन्द गर्नुहोस्"}
        </button>
      `
    });
  }

  function interceptClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const storyCreate = target.closest("[data-story-create]");

    if (storyCreate) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openComposer("story");
      return;
    }

    const storyView = target.closest("[data-story-view]");

    if (storyView) {
      event.preventDefault();
      event.stopImmediatePropagation();
      viewStoryWithMedia(storyView.dataset.storyView);
      return;
    }

    const openComposerButton = target.closest(
      "#openComposer, #quickText, [data-page='create']"
    );

    if (openComposerButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openComposer("post");
    }
  }

  function initialize() {
    if (observer) return;

    injectStyles();

    document.addEventListener(
      "click",
      interceptClick,
      true
    );

    observer = new MutationObserver(queuePostRender);

    const feed = $("#feedList");
    const profilePosts = $(".profile-posts");

    if (feed) {
      observer.observe(feed, {
        childList: true,
        subtree: true
      });
    }

    if (profilePosts) {
      observer.observe(profilePosts, {
        childList: true,
        subtree: true
      });
    }

    queuePostRender();

    global.addEventListener("ksk:data-change", event => {
      const collection = event.detail?.collection || "";

      if (
        collection.includes("posts") ||
        collection.includes("stories")
      ) {
        queuePostRender();
      }
    });

    console.info("KSK Media UI initialized.");
  }

  global.KSKMediaUI = Object.freeze({
    initialize,
    openPostComposer: () => openComposer("post"),
    openStoryCreator: () => openComposer("story"),
    refresh: queuePostRender
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

})(window);
