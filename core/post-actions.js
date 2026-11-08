
"use strict";

/*
 * =========================================================
 * KSK — POST ACTIONS MODULE
 * Mero-Sansar
 *
 * RESPONSIBILITY:
 * - Open post options menu
 * - Edit and delete posts
 * - Save and unsave posts
 * - Handle post menu and save button clicks
 *
 * LIKE / REACTION:
 * Owned by core/reactions.js
 *
 * REFRESH:
 * Owned by core/data-refresh.js
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPostActions) return;

  const DATA = () => global.KSKData || null;
  const MODAL = () => global.KSKModal || null;
  const UTILS = () => global.KSKUtils || null;

  let initialized = false;

  let app = {
    isEnglish: () => false,
    translate: (key, fallback = "") =>
      fallback || key,
    toast: () => {},
    refreshCurrentPage: () => {}
  };

  /* =======================================================
     HELPERS
  ======================================================= */

  function escapeHTML(value = "") {
    if (typeof UTILS()?.escapeHTML === "function") {
      return UTILS().escapeHTML(String(value));
    }

    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
    );
  }

  function isEnglish() {
    return Boolean(app.isEnglish());
  }

  function toast(message, type = "info") {
    app.toast(message, type);
  }

  function openModal(options) {
    const modal = MODAL();

    if (typeof modal?.openModal !== "function") {
      toast(
        isEnglish()
          ? "This feature is unavailable."
          : "यो सुविधा अहिले उपलब्ध छैन।",
        "error"
      );

      return null;
    }

    return modal.openModal(options);
  }

  function closeModal() {
    MODAL()?.closeModal?.();
  }

  function isReady() {
    if (initialized) return true;

    console.error(
      "KSKPostActions is not initialized."
    );

    return false;
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize(options = {}) {
    if (options && typeof options === "object") {
      app = {
        ...app,
        ...options
      };
    }

    if (
      typeof app.isEnglish !== "function" ||
      typeof app.translate !== "function" ||
      typeof app.toast !== "function" ||
      typeof app.refreshCurrentPage !== "function"
    ) {
      console.error(
        "KSKPostActions: Invalid application callbacks."
      );

      return false;
    }

    initialized = true;

    document.removeEventListener(
      "click",
      onDocumentClick,
      true
    );

    document.addEventListener(
      "click",
      onDocumentClick,
      true
    );

    return true;
  }

  /* =======================================================
     SAVE / UNSAVE POST
  ======================================================= */

  function isPostSaved(id) {
    const saved = DATA()?.getSavedPosts?.() || [];

    return (
      Array.isArray(saved) &&
      saved.some(
        item => String(item) === String(id)
      )
    );
  }

  function toggleSave(id) {
    if (!isReady()) return false;

    const post = DATA()?.getPost?.(id);

    if (!post) {
      toast(
        isEnglish()
          ? "Post could not be found."
          : "पोस्ट भेटिएन।",
        "warning"
      );

      return false;
    }

    const wasSaved = isPostSaved(id);

    const success = wasSaved
      ? DATA()?.unsavePost?.(id)
      : DATA()?.savePost?.(id);

    if (!success) {
      toast(
        isEnglish()
          ? "Could not update saved post."
          : "पोस्टको Save अवस्था परिवर्तन गर्न सकिएन।",
        "error"
      );

      return false;
    }

    if (wasSaved) {
      toast(
        isEnglish()
          ? "Post removed from saved."
          : "सेभबाट हटाइयो।",
        "success"
      );
    } else {
      toast(
        isEnglish()
          ? "Post saved."
          : "पोस्ट सेभ भयो।",
        "success"
      );
    }

    /*
     * No manual refresh here.
     * KSKData emits ksk:data-change.
     * KSKDataRefresh handles the affected page.
     */

    return true;
  }

  /* =======================================================
     EDIT POST
  ======================================================= */

  function editPost(id) {
    if (!isReady()) return false;

    const post = DATA()?.getPost?.(id);

    if (!post) {
      toast(
        isEnglish()
          ? "Post could not be found."
          : "पोस्ट भेटिएन।",
        "warning"
      );

      return false;
    }

    const modal = openModal({
      title: isEnglish()
        ? "Edit Post"
        : "पोस्ट सम्पादन",

      content: `
        <form id="kskEditPostForm">

          <textarea
            id="kskEditPostText"
            class="form-textarea"
            rows="5"
            maxlength="10000"
            required>${escapeHTML(post.text || "")}</textarea>

        </form>
      `,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${app.translate("cancel", "रद्द")}
        </button>

        <button
          type="submit"
          form="kskEditPostForm"
          class="btn btn-primary">
          ${isEnglish()
            ? "Save Changes"
            : "परिवर्तन सुरक्षित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal?.element) return false;

    const form = modal.element.querySelector(
      "#kskEditPostForm"
    );

    const textarea = modal.element.querySelector(
      "#kskEditPostText"
    );

    textarea?.focus();

    form?.addEventListener("submit", event => {
      event.preventDefault();

      const text = textarea?.value.trim();

      if (!text) {
        toast(
          isEnglish()
            ? "Please write something."
            : "पोस्ट खाली राख्न मिल्दैन।",
          "warning"
        );

        textarea?.focus();

        return;
      }

      const success = DATA()?.updatePost?.(id, {
        text
      });

      if (!success) {
        toast(
          isEnglish()
            ? "Could not update post."
            : "पोस्ट परिवर्तन गर्न सकिएन।",
          "error"
        );

        return;
      }

      /*
       * Data change event already handles refresh.
       */

      closeModal();

      toast(
        isEnglish()
          ? "Post updated."
          : "पोस्ट परिवर्तन भयो।",
        "success"
      );
    });

    return true;
  }

  /* =======================================================
     OPEN POST MENU
  ======================================================= */

  function openPostMenu(id) {
    if (!isReady()) return false;

    const post = DATA()?.getPost?.(id);

    if (!post) return false;

    openModal({
      title: isEnglish()
        ? "Post options"
        : "पोस्ट विकल्प",

      content: `
        <div class="post-menu-actions">

          <button
            class="dropdown-item"
            type="button"
            data-edit-post="${escapeHTML(id)}">

            ✏️
            ${isEnglish()
              ? "Edit post"
              : "पोस्ट सम्पादन"}

          </button>

          <button
            class="dropdown-item"
            type="button"
            data-delete-post="${escapeHTML(id)}">

            🗑️
            ${isEnglish()
              ? "Delete post"
              : "पोस्ट मेटाउनुहोस्"}

          </button>

        </div>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${app.translate("close", "बन्द")}
        </button>
      `
    });

    return true;
  }

  /* =======================================================
     DELETE POST
  ======================================================= */

  function deletePost(id) {
    if (!isReady()) return false;

    const message = isEnglish()
      ? "Are you sure you want to delete this post?"
      : "के तपाईं यो पोस्ट मेटाउन चाहनुहुन्छ?";

    if (!global.confirm(message)) {
      return false;
    }

    const success = DATA()?.deletePost?.(id);

    if (!success) {
      toast(
        isEnglish()
          ? "Could not delete post."
          : "पोस्ट मेटाउन सकिएन।",
        "error"
      );

      return false;
    }

    /*
     * Data change event already handles refresh.
     */

    closeModal();

    toast(
      isEnglish()
        ? "Post deleted."
        : "पोस्ट मेटाइयो।",
      "success"
    );

    return true;
  }

  /* =======================================================
     DOCUMENT CLICK HANDLER
  ======================================================= */

  function onDocumentClick(event) {
    const target = event.target;

    if (!target?.closest || !isReady()) return;

    /*
     * Save button is handled here in capture phase.
     * This prevents the old app.js save handler
     * from processing the same click again.
     */

    const saveButton = target.closest(
      '[data-post-action="save"]'
    );

    if (saveButton) {
      event.preventDefault();
      event.stopImmediatePropagation();

      toggleSave(saveButton.dataset.postId);

      return;
    }
  }

  /* =======================================================
     POST MENU CLICK HANDLER
  ======================================================= */

  function handleClick(target) {
    if (!isReady()) return false;

    if (
      !target ||
      typeof target.closest !== "function"
    ) {
      return false;
    }

    const postMenu = target.closest(
      "[data-post-menu]"
    );

    if (postMenu) {
      openPostMenu(postMenu.dataset.postMenu);

      return true;
    }

    const editButton = target.closest(
      "[data-edit-post]"
    );

    if (editButton) {
      const id = editButton.dataset.editPost;

      closeModal();
      editPost(id);

      return true;
    }

    const deleteButton = target.closest(
      "[data-delete-post]"
    );

    if (deleteButton) {
      deletePost(deleteButton.dataset.deletePost);

      return true;
    }

    return false;
  }

  /* =======================================================
     CLEANUP
  ======================================================= */

  function destroy() {
    document.removeEventListener(
      "click",
      onDocumentClick,
      true
    );

    initialized = false;

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKPostActions = Object.freeze({
    initialize,
    destroy,
    handleClick,
    editPost,
    openPostMenu,
    deletePost,
    toggleSave,
    isPostSaved
  });

})(window);
