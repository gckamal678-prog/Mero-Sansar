"use strict";

/*
 * KSK — MEDIA UI
 * Premium Post Composer + Story Composer + Media Rendering
 */

(function (global) {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  let initialized = false;
  let postObserver = null;
  let storyObserver = null;
  let postMediaObserver = null;
  let storyMediaObserver = null;
  let postRenderQueued = false;
  let storyRenderQueued = false;

  const mediaURLPending = new Map();

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
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(value);
    }

    return String(value).replace(/[&<>"']/g, char => ({
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

  async function getMediaURL(mediaId) {
    if (!mediaId) return "";

    const key = String(mediaId);

    if (mediaURLPending.has(key)) {
      return mediaURLPending.get(key);
    }

    const request = (async () => {
      try {
        return await global.KSKMedia?.getImageURL?.(key) || "";
      } catch (error) {
        console.error("KSK Media URL loading failed:", error);
        return "";
      } finally {
        mediaURLPending.delete(key);
      }
    })();

    mediaURLPending.set(key, request);

    return request;
  }

  function getFileInput(form) {
    return $("input[type='file']", form);
  }

  /* IMAGE PICKER + PREVIEW */

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
          alt="${isEnglish()
            ? "Image preview"
            : "फोटो पूर्वावलोकन"}">

        <button
          type="button"
          class="ksk-media-remove"
          aria-label="${isEnglish()
            ? "Remove photo"
            : "फोटो हटाउनुहोस्"}">
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

          if (previewURL) {
            URL.revokeObjectURL(previewURL);
            previewURL = "";
          }
        }
      );
    });
  }

  /* STYLES */

  function injectStyles() {
    if ($("#kskMediaStyles")) return;

    const style = document.createElement("style");
    style.id = "kskMediaStyles";

    style.textContent = `

      /* PREMIUM POST COMPOSER */

      .ksk-post-composer {
        display:flex;
        flex-direction:column;
        gap:14px;
        color:var(--color-text);
      }

      .ksk-post-composer .ksk-composer-author {
        display:flex;
        align-items:center;
        gap:11px;
        padding:11px 12px;
        border:1px solid var(--color-border);
        border-radius:14px;
        background:var(--color-surface-secondary);
      }

      .ksk-post-composer .ksk-composer-avatar {
        width:42px;
        height:42px;
        flex:0 0 42px;
        display:grid;
        place-items:center;
        border-radius:50%;
        background:var(--color-primary-soft);
        color:var(--color-primary);
        font-weight:800;
        font-size:17px;
      }

      .ksk-post-composer .ksk-composer-author strong {
        display:block;
        font-size:13px;
        line-height:1.4;
      }

      .ksk-post-composer .ksk-composer-author span {
        display:block;
        margin-top:2px;
        color:var(--color-text-secondary);
        font-size:11px;
      }

      .ksk-post-composer .ksk-composer-text {
        display:block;
        width:100%;
        min-height:155px;
        max-height:42vh;
        resize:vertical;
        box-sizing:border-box;
        padding:15px;
        border:1px solid var(--color-border);
        border-radius:15px;
        background:var(--color-surface);
        color:var(--color-text);
        font:inherit;
        font-size:15px;
        line-height:1.65;
        outline:none;
      }

      .ksk-post-composer .ksk-composer-text:focus {
        border-color:var(--color-primary);
        box-shadow:0 0 0 3px var(--color-primary-soft);
      }

      .ksk-post-composer .ksk-composer-bottom {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        color:var(--color-text-secondary);
        font-size:11px;
      }

      .ksk-post-composer .ksk-composer-tools {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
        padding:11px 12px;
        border:1px solid var(--color-border);
        border-radius:14px;
        background:var(--color-surface-secondary);
      }

      .ksk-post-composer .ksk-composer-tools-label {
        font-size:12px;
        font-weight:700;
      }

      .ksk-post-composer .ksk-media-pick {
        min-height:40px;
        padding:8px 13px;
        border-radius:11px;
        background:var(--color-surface);
        font-size:12px;
        font-weight:700;
      }

      .ksk-post-composer .ksk-media-preview {
        margin-top:0;
        border:1px solid var(--color-border);
        background:var(--color-surface-secondary);
      }

      .ksk-post-composer .ksk-media-preview img {
        max-height:340px;
      }

      .ksk-post-composer .ksk-composer-hint {
        margin:0;
        color:var(--color-text-secondary);
        font-size:11px;
        line-height:1.55;
      }

      @media(max-width:480px) {
        .ksk-post-composer .ksk-composer-text {
          min-height:135px;
          font-size:14px;
        }

        .ksk-post-composer .ksk-composer-tools {
          align-items:flex-start;
        }
      }

      /* MEDIA PICKER */

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

      /* IMAGE PREVIEW */

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

      /* POST MEDIA */

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

      /* STORY MEDIA */

      .ksk-story-media {
        display:block;
        width:100%;
        max-height:65vh;
        margin:14px 0;
        border-radius:14px;
        object-fit:contain;
        background:var(--color-surface-secondary);
      }

      /* STORY THUMBNAIL */

      .story-avatar {
        position:relative;
        overflow:hidden;
      }

      .story-avatar img.ksk-story-thumbnail {
        display:block;
        width:100%;
        height:100%;
        object-fit:cover;
        border-radius:inherit;
      }

      /* MEDIA ERROR */

      .ksk-media-error {
        padding:14px;
        color:var(--color-text-secondary);
        text-align:center;
      }
    `;

    document.head.appendChild(style);
  }

  /* COMPOSER CONTENT */

  function composerContent(type) {
    const isStory = type === "story";

    const title = isStory
      ? (isEnglish() ? "Create Story" : "नयाँ Story")
      : (isEnglish() ? "Create Post" : "नयाँ पोस्ट");

    const placeholder = isStory
      ? (isEnglish()
          ? "Write your story..."
          : "आफ्नो Story लेख्नुहोस्...")
      : (isEnglish()
          ? "What is on your mind?"
          : "के सोच्दै हुनुहुन्छ?");

    const formId = isStory
      ? "kskMediaStoryForm"
      : "kskMediaPostForm";

    const textId = isStory
      ? "kskMediaStoryText"
      : "kskMediaPostText";

    const previewId = isStory
      ? "kskMediaStoryPreview"
      : "kskMediaPostPreview";

    const profile = getProfile();
    const displayName = escapeHTML(getDisplayName());

    const initial = escapeHTML(
      String(profile.name || getDisplayName())
        .trim()
        .charAt(0) || "स"
    );

    let content;

    if (isStory) {
      content = [
        '<form id="', formId, '">',
        '<textarea id="', textId,
        '" class="form-textarea" rows="4" maxlength="1000"',
        ' placeholder="', escapeHTML(placeholder),
        '" aria-label="', escapeHTML(placeholder), '"></textarea>',

        '<div class="ksk-media-tools">',
        '<label class="ksk-media-pick">📷 ',
        (isEnglish() ? "Add Photo" : "फोटो थप्नुहोस्"),
        '<input type="file" accept="image/jpeg,image/png,image/webp,image/gif">',
        '</label></div>',

        '<div id="', previewId,
        '" class="ksk-media-preview hidden"></div>',

        '</form>'
      ].join("");
    } else {
      content = [
        '<form id="', formId, '" class="ksk-post-composer">',

        '<div class="ksk-composer-author">',
        '<div class="ksk-composer-avatar" aria-hidden="true">',
        initial,
        '</div><div><strong>',
        displayName,
        '</strong><span>',
        (isEnglish()
          ? "Create a post for your feed"
          : "आफ्नो Feed मा नयाँ पोस्ट लेख्नुहोस्"),
        '</span></div></div>',

        '<label for="', textId,
        '" class="sr-only">',
        escapeHTML(placeholder),
        '</label>',

        '<textarea id="', textId,
        '" class="ksk-composer-text" rows="5" maxlength="10000"',
        ' placeholder="', escapeHTML(placeholder),
        '" aria-label="', escapeHTML(placeholder),
        '"></textarea>',

        '<div class="ksk-composer-bottom"><span>',
        (isEnglish()
          ? "Share a thought or add a photo"
          : "आफ्नो विचार लेख्नुहोस् वा फोटो थप्नुहोस्"),
        '</span><span><b id="kskPostCharacterCount">0</b>/10000</span></div>',

        '<div class="ksk-composer-tools">',
        '<span class="ksk-composer-tools-label">',
        (isEnglish()
          ? "Add to your post"
          : "पोस्टमा थप्नुहोस्"),
        '</span>',

        '<label class="ksk-media-pick">',
        '<span aria-hidden="true">▧</span> ',
        (isEnglish() ? "Photo" : "फोटो"),

        '<input type="file" accept="image/jpeg,image/png,image/webp,image/gif"',
        ' aria-label="',
        (isEnglish() ? "Choose a photo" : "फोटो छान्नुहोस्"),
        '"></label></div>',

        '<div id="', previewId,
        '" class="ksk-media-preview hidden" aria-live="polite"></div>',

        '<p class="ksk-composer-hint">',
        (isEnglish()
          ? "Photos are saved using the app's current local media storage."
          : "फोटो एपको हालको स्थानीय Media Storage मा सुरक्षित हुन्छ।"),
        '</p>',

        '</form>'
      ].join("");
    }

    return {
      title,
      content,
      formId,
      textId,
      previewId
    };
  }

  /* PUBLISH POST / STORY */

  async function publishMedia(type, modal, ids) {
    const form = $(
      `#${ids.formId}`,
      modal.element
    );

    const text = $(
      `#${ids.textId}`,
      modal.element
    )?.value.trim() || "";

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

    /*
     * POSTS: Publish directly to Supabase.
     * STORIES: Keep the existing local workflow.
     */

    if (type === "post") {
      const postsAPI = global.KSKSupabasePosts;

      if (typeof postsAPI?.createPost !== "function") {
        toast(
          isEnglish()
            ? "Cloud post service is unavailable."
            : "Cloud पोस्ट सेवा उपलब्ध छैन।",
          "error"
        );
        return;
      }

      try {
        const result = await postsAPI.createPost({
          text,
          media: file
        });

        if (!result?.ok || !result.data) {
          toast(
            result?.message ||
            (isEnglish()
              ? "Could not publish post."
              : "पोस्ट प्रकाशित गर्न सकिएन।"),
            "error"
          );
          return;
        }

        closeModal();

        toast(
          isEnglish()
            ? "Post published successfully."
            : "पोस्ट सफलतापूर्वक प्रकाशित भयो।",
          "success"
        );

        return;

      } catch (error) {
        console.error(
          "Supabase post publishing failed:",
          error
        );

        toast(
          error?.message ||
          (isEnglish()
            ? "Could not publish post."
            : "पोस्ट प्रकाशित गर्न सकिएन।"),
          "error"
        );

        return;
      }
    }

    /* STORY: EXISTING LOCAL STORAGE WORKFLOW */

    let media = null;

    if (file) {
      try {
        media = await global.KSKMedia.saveImage(
          file,
          { name: file.name }
        );

        if (!media?.id) {
          throw new Error("Image could not be saved.");
        }

      } catch (error) {
        console.error(
          "KSK media save failed:",
          error
        );

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

    try {
      result = global.KSKData?.addStory?.(payload);
    } catch (error) {
      console.error(
        "KSK story publishing failed:",
        error
      );
    }

    if (!result) {
      if (media?.id) {
        await global.KSKMedia
          ?.deleteImage?.(media.id)
          .catch(() => {});
      }

      toast(
        isEnglish()
          ? "Could not publish story."
          : "Story प्रकाशित गर्न सकिएन।",
        "error"
      );

      return;
    }

    closeModal();

    toast(
      isEnglish()
        ? "Story published."
        : "Story प्रकाशित भयो।",
      "success"
    );
  }

  /* OPEN COMPOSER */

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
          ${isEnglish()
            ? "Publish"
            : "प्रकाशित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal) return;

    const form = $(
      `#${ids.formId}`,
      modal.element
    );

    const preview = $(
      `#${ids.previewId}`,
      modal.element
    );

    bindImagePicker(form, preview);

    if (type === "post") {
      const textArea = $(
        `#${ids.textId}`,
        modal.element
      );

      const counter = $(
        "#kskPostCharacterCount",
        modal.element
      );

      const updateCounter = () => {
        if (counter && textArea) {
          counter.textContent = String(
            textArea.value.length
          );
        }
      };

      textArea?.addEventListener(
        "input",
        updateCounter
      );

      updateCounter();
    }

    $(`#${ids.textId}`, modal.element)?.focus();

    form?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const submit = $(
          "button[type='submit']",
          modal.element
        );

        if (submit) {
          submit.disabled = true;
        }

        publishMedia(type, modal, ids)
          .finally(() => {
            if (
              submit &&
              modal.element.isConnected
            ) {
              submit.disabled = false;
            }
          });
      }
    );
  }

  /* IMAGE MARKUP */

  async function imageMarkup(mediaId, className) {
    if (!mediaId) return "";

    const url = await getMediaURL(mediaId);

    if (!url) {
      return `
        <div class="ksk-media-error">
          ${isEnglish()
            ? "Photo unavailable."
            : "फोटो उपलब्ध छैन।"}
        </div>
      `;
    }

    return `
      <div class="${className}">
        <img
          src="${url}"
          alt="${isEnglish()
            ? "Shared photo"
            : "साझा गरिएको फोटो"}"
          loading="lazy">
      </div>
    `;
  }

  /* POST MEDIA RENDERING */

  async function renderPostMedia(postElement) {
    if (
      !postElement ||
      postElement.dataset.mediaReady === "true" ||
      postElement.dataset.mediaReady === "loading"
    ) {
      return;
    }

    const postId = postElement.dataset.postId;

    const remoteUrl = String(
      postElement.dataset.postMediaUrl || ""
    ).trim();

    let markup = "";

    if (
      remoteUrl &&
      /^https?:\/\//i.test(remoteUrl)
    ) {
      postElement.dataset.mediaReady = "loading";

      markup = `
        <div class="ksk-post-media">
          <img
            src="${escapeHTML(remoteUrl)}"
            alt="${isEnglish() ? "Shared photo" : "साझा गरिएको फोटो"}"
            loading="lazy">
        </div>
      `;
    } else {
      const post = global.KSKData?.getPost?.(postId);

      if (!post?.mediaId) return;

      postElement.dataset.mediaReady = "loading";

      markup = await imageMarkup(
        post.mediaId,
        "ksk-post-media"
      );
    }

    if (!postElement.isConnected) return;

    const footer = $(
      ".post-actions",
      postElement
    );

    if (footer && markup) {
      footer.insertAdjacentHTML(
        "beforebegin",
        markup
      );
    }

    postElement.dataset.mediaReady = "true";
  }

  function observePostMedia(postElement) {
    if (!postElement) return;

    if (
      postElement.dataset.mediaReady === "true" ||
      postElement.dataset.mediaReady === "loading"
    ) {
      return;
    }

    if (postMediaObserver) {
      postMediaObserver.observe(postElement);
      return;
    }

    renderPostMedia(postElement);
  }

  function renderAllPostMedia() {
    document
      .querySelectorAll(".post-card[data-post-id]")
      .forEach(observePostMedia);
  }

  function queuePostRender() {
    if (postRenderQueued) return;

    postRenderQueued = true;

    requestAnimationFrame(() => {
      postRenderQueued = false;
      renderAllPostMedia();
    });
  }

  /* STORY THUMBNAIL RENDERING */

  async function renderStoryThumbnail(storyElement) {
    if (!storyElement) return;

    const storyId = storyElement.dataset.storyView;

    if (!storyId) return;

    if (
      storyElement.dataset.storyMediaReady === "true" ||
      storyElement.dataset.storyMediaReady === "loading"
    ) {
      return;
    }

    const stories =
      global.KSKData?.getStories?.(true) || [];

    const story = stories.find(
      item => String(item.id) === String(storyId)
    );

    if (!story?.mediaId) return;

    const avatar = $(
      ".story-avatar",
      storyElement
    );

    if (!avatar) return;

    storyElement.dataset.storyMediaReady = "loading";

    const url = await getMediaURL(story.mediaId);

    if (
      !url ||
      !storyElement.isConnected ||
      !avatar.isConnected
    ) {
      storyElement.dataset.storyMediaReady = "error";
      return;
    }

    avatar.innerHTML = `
      <img
        class="ksk-story-thumbnail"
        src="${url}"
        alt="${isEnglish()
          ? "Story photo"
          : "Story फोटो"}"
        loading="lazy">
    `;

    storyElement.dataset.storyMediaReady = "true";
  }

  function observeStoryThumbnail(storyElement) {
    if (!storyElement) return;

    if (
      storyElement.dataset.storyMediaReady === "true" ||
      storyElement.dataset.storyMediaReady === "loading"
    ) {
      return;
    }

    if (storyMediaObserver) {
      storyMediaObserver.observe(storyElement);
      return;
    }

    renderStoryThumbnail(storyElement);
  }

  function renderAllStoryThumbnails() {
    document
      .querySelectorAll(
        "#storiesList [data-story-view]"
      )
      .forEach(observeStoryThumbnail);
  }

  function queueStoryRender() {
    if (storyRenderQueued) return;

    storyRenderQueued = true;

    requestAnimationFrame(() => {
      storyRenderQueued = false;
      renderAllStoryThumbnails();
    });
  }

  /* STORY VIEWER */

  async function viewStoryWithMedia(id) {
    const stories =
      global.KSKData?.getStories?.(true) || [];

    const story = stories.find(
      item => String(item.id) === String(id)
    );

    if (!story) return;

    const media = story.mediaId
      ? await imageMarkup(
          story.mediaId,
          "ksk-story-media"
        )
      : "";

    const content = `
      <div class="story-view-content">
        <h3>
          ${escapeHTML(story.author || "सदस्य")}
        </h3>

        ${media}

        ${
          story.text
            ? `
              <div class="post-content">
                ${escapeHTML(story.text)}
              </div>
            `
            : ""
        }
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
          ${isEnglish()
            ? "Close"
            : "बन्द गर्नुहोस्"}
        </button>
      `
    });
  }

  /* CLICK INTERCEPTION */

  function interceptClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const storyCreate = target.closest(
      "[data-story-create]"
    );

    if (storyCreate) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openComposer("story");
      return;
    }

    const storyView = target.closest(
      "[data-story-view]"
    );

    if (storyView) {
      event.preventDefault();
      event.stopImmediatePropagation();

      viewStoryWithMedia(
        storyView.dataset.storyView
      );

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

  /* INITIALIZE */

  function initialize() {
    if (initialized) return true;

    initialized = true;

    injectStyles();

    if ("IntersectionObserver" in global) {
      postMediaObserver = new global.IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            postMediaObserver.unobserve(entry.target);
            renderPostMedia(entry.target);
          });
        },
        {
          root: null,
          rootMargin: "350px 0px",
          threshold: 0.01
        }
      );

      storyMediaObserver = new global.IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            storyMediaObserver.unobserve(entry.target);
            renderStoryThumbnail(entry.target);
          });
        },
        {
          root: null,
          rootMargin: "150px 0px",
          threshold: 0.01
        }
      );
    }

    document.addEventListener(
      "click",
      interceptClick,
      true
    );

    const feed = $("#feedList");
    const profilePosts = $(".profile-posts");

    if (feed || profilePosts) {
      postObserver = new MutationObserver(
        queuePostRender
      );

      if (feed) {
        postObserver.observe(feed, {
          childList: true,
          subtree: true
        });
      }

      if (profilePosts) {
        postObserver.observe(profilePosts, {
          childList: true,
          subtree: true
        });
      }
    }

    const storiesList = $("#storiesList");

    if (storiesList) {
      storyObserver = new MutationObserver(
        queueStoryRender
      );

      storyObserver.observe(storiesList, {
        childList: true,
        subtree: true
      });
    }

    queuePostRender();
    queueStoryRender();

    console.info("KSK Media UI initialized.");

    return true;
  }

  /* PUBLIC API */

  global.KSKMediaUI = Object.freeze({
    initialize,

    openPostComposer: () =>
      openComposer("post"),

    openStoryCreator: () =>
      openComposer("story"),

    refresh: () => {
      queuePostRender();
      queueStoryRender();
    }
  });

  /* AUTO START */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})(window);
