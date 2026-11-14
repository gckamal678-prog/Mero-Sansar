
"use strict";

/*
 * =========================================================
 * KSK — POST ACTIONS MODULE
 * Mero-Sansar
 *
 * - Open post options menu
 * - Edit posts through Supabase
 * - Delete posts through Supabase
 * - Save / Unsave: waiting for Supabase saved_posts table
 *
 * LIKE / REACTION:
 * Owned by core/reactions.js
 *
 * REFRESH:
 * Owned by core/data-refresh.js and Supabase post events
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKPostActions) return;

  const MODAL = () => global.KSKModal || null;
  const UTILS = () => global.KSKUtils || null;
  const POSTS = () => global.KSKSupabasePosts || null;
  const AUTH = () => global.KSKSupabaseAuth || null;

  let initialized = false;

  let app = {
    isEnglish: () => false,

    translate: (key, fallback = "") =>
      fallback || key,

    toast: () => {},

    refreshCurrentPage: () => {}
  };

  /* =======================================================
     UTILITIES
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

  function getCurrentUserId() {
    return String(
      AUTH()?.getUser?.()?.id || ""
    );
  }

  function getErrorMessage(result, fallback) {
    return String(
      result?.message ||
      result?.code ||
      fallback
    );
  }

  /* =======================================================
     SUPABASE POST LOOKUP
  ======================================================= */

  async function getCloudPost(postId) {
    const id = String(postId || "").trim();

    if (!id) {
      throw new Error(
        isEnglish()
          ? "Post ID is missing."
          : "पोस्ट ID उपलब्ध छैन।"
      );
    }

    const api = POSTS();

    if (typeof api?.getFeed !== "function") {
      throw new Error(
        isEnglish()
          ? "Supabase Posts service is unavailable."
          : "Supabase Posts सेवा उपलब्ध छैन।"
      );
    }

    const result = await api.getFeed({
      limit: 100
    });

    if (!result?.ok || !Array.isArray(result.data)) {
      throw new Error(
        getErrorMessage(
          result,
          isEnglish()
            ? "Could not load the post."
            : "पोस्ट लोड गर्न सकिएन।"
        )
      );
    }

    const post = result.data.find(
      item => String(item?.id) === id
    );

    if (!post) {
      throw new Error(
        isEnglish()
          ? "Post could not be found in the live feed."
          : "लाइभ Feed मा पोस्ट भेटिएन।"
      );
    }

    return post;
  }

  function canManagePost(post) {
    const userId = getCurrentUserId();

    return Boolean(
      userId &&
      post?.authorId &&
      String(post.authorId) === userId
    );
  }

  async function getOwnedCloudPost(postId) {
    const post = await getCloudPost(postId);

    if (!canManagePost(post)) {
      throw new Error(
        isEnglish()
          ? "You can only edit or delete your own posts."
          : "तपाईंले आफ्नै पोस्ट मात्र सम्पादन वा मेटाउन सक्नुहुन्छ।"
      );
    }

    return post;
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
     SAVE / UNSAVE
     
     Not connected yet:
     Supabase saved_posts table and RLS are not available.
     Do not report fake success.
  ======================================================= */

  function isPostSaved() {
    return false;
  }

  function toggleSave() {
    if (!isReady()) return false;

    toast(
      isEnglish()
        ? "Cloud saving is not available yet."
        : "Cloud Save सुविधा अझै तयार भएको छैन।",
      "info"
    );

    return false;
  }

  /* =======================================================
     EDIT POST
  ======================================================= */

  async function editPost(postId) {
    if (!isReady()) return false;

    let post;

    try {
      post = await getOwnedCloudPost(postId);
    } catch (error) {
      toast(
        error?.message ||
          (
            isEnglish()
              ? "Could not open this post."
              : "यो पोस्ट खोल्न सकिएन।"
          ),
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
          class="btn btn-primary"
          id="kskEditPostSubmit">
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

    const submitButton = modal.element.querySelector(
      "#kskEditPostSubmit"
    );

    textarea?.focus();

    form?.addEventListener("submit", async event => {
      event.preventDefault();

      if (submitButton?.disabled) return;

      const text = String(
        textarea?.value || ""
      ).trim();

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

      if (text.length > 10000) {
        toast(
          isEnglish()
            ? "Post is too long."
            : "पोस्ट धेरै लामो भयो।",
          "warning"
        );

        return;
      }

      const api = POSTS();

      if (typeof api?.updatePost !== "function") {
        toast(
          isEnglish()
            ? "Supabase update service is unavailable."
            : "Supabase Update सेवा उपलब्ध छैन।",
          "error"
        );

        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
      }

      try {
        const result = await api.updatePost(
          post.id,
          { text }
        );

        if (!result?.ok) {
          throw new Error(
            getErrorMessage(
              result,
              isEnglish()
                ? "Could not update post."
                : "पोस्ट परिवर्तन गर्न सकिएन।"
            )
          );
        }

        closeModal();

        toast(
          isEnglish()
            ? "Post updated successfully."
            : "पोस्ट सफलतापूर्वक अपडेट भयो।",
          "success"
        );

        app.refreshCurrentPage();

      } catch (error) {
        if (submitButton) {
          submitButton.disabled = false;
        }

        toast(
          error?.message ||
            (
              isEnglish()
                ? "Could not update post."
                : "पोस्ट परिवर्तन गर्न सकिएन।"
            ),
          "error"
        );
      }
    });

    return true;
  }

  /* =======================================================
     POST OPTIONS MENU
  ======================================================= */

  async function openPostMenu(postId) {
    if (!isReady()) return false;

    let post;

    try {
      post = await getOwnedCloudPost(postId);
    } catch (error) {
      toast(
        error?.message ||
          (
            isEnglish()
              ? "Post options are unavailable."
              : "पोस्ट विकल्प उपलब्ध छैन।"
          ),
        "warning"
      );

      return false;
    }

    openModal({
      title: isEnglish()
        ? "Post options"
        : "पोस्ट विकल्प",

      content: `
        <div class="post-menu-actions">

          <button
            class="dropdown-item"
            type="button"
            data-edit-post="${escapeHTML(post.id)}">
            ✏️
            ${isEnglish()
              ? "Edit post"
              : "पोस्ट सम्पादन"}
          </button>

          <button
            class="dropdown-item"
            type="button"
            data-delete-post="${escapeHTML(post.id)}">
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
     DELETE CONFIRMATION
  ======================================================= */

  async function confirmDeletePost(postId) {
    if (!isReady()) return false;

    let post;

    try {
      post = await getOwnedCloudPost(postId);
    } catch (error) {
      toast(
        error?.message ||
          (
            isEnglish()
              ? "Could not find this post."
              : "पोस्ट भेटिएन।"
          ),
        "warning"
      );

      return false;
    }

    const modal = openModal({
      title: isEnglish()
        ? "Delete post?"
        : "पोस्ट मेटाउने?",

      content: `
        <div class="ksk-delete-confirm">

          <div
            class="ksk-delete-confirm-icon"
            aria-hidden="true">
            🗑️
          </div>

          <h3>
            ${isEnglish()
              ? "Are you sure?"
              : "के तपाईं निश्चित हुनुहुन्छ?"}
          </h3>

          <p>
            ${isEnglish()
              ? "This post will be permanently deleted from the cloud."
              : "यो पोस्ट Cloud बाट स्थायी रूपमा मेटिनेछ।"}
          </p>

        </div>
      `,

      footer: `
        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${isEnglish()
            ? "Cancel"
            : "रद्द गर्नुहोस्"}
        </button>

        <button
          type="button"
          class="btn btn-danger"
          data-confirm-delete-post>
          ${isEnglish()
            ? "Delete Post"
            : "पोस्ट मेटाउनुहोस्"}
        </button>
      `
    });

    if (!modal?.element) return false;

    const confirmButton = modal.element.querySelector(
      "[data-confirm-delete-post]"
    );

    if (!confirmButton) {
      closeModal();

      toast(
        isEnglish()
          ? "Could not open delete confirmation."
          : "Delete Confirmation खोल्न सकिएन।",
        "error"
      );

      return false;
    }

    confirmButton.addEventListener("click", async () => {
      if (confirmButton.disabled) return;

      confirmButton.disabled = true;

      const api = POSTS();

      if (typeof api?.deletePost !== "function") {
        closeModal();

        toast(
          isEnglish()
            ? "Supabase delete service is unavailable."
            : "Supabase Delete सेवा उपलब्ध छैन।",
          "error"
        );

        return;
      }

      try {
        const result = await api.deletePost(post.id);

        if (!result?.ok) {
          throw new Error(
            getErrorMessage(
              result,
              isEnglish()
                ? "Could not delete post."
                : "पोस्ट मेटाउन सकिएन।"
            )
          );
        }

        closeModal();

        toast(
          isEnglish()
            ? "Post deleted successfully."
            : "पोस्ट सफलतापूर्वक मेटाइयो।",
          "success"
        );

        app.refreshCurrentPage();

      } catch (error) {
        confirmButton.disabled = false;

        toast(
          error?.message ||
            (
              isEnglish()
                ? "Could not delete post."
                : "पोस्ट मेटाउन सकिएन।"
            ),
          "error"
        );
      }
    });

    return true;
  }

  /* =======================================================
     DELETE POST
  ======================================================= */

  function deletePost(postId) {
    if (!isReady()) return false;

    confirmDeletePost(postId);

    return true;
  }

  /* =======================================================
     SAVE BUTTON CAPTURE HANDLER
  ======================================================= */

  function onDocumentClick(event) {
    const target = event.target;

    if (!target?.closest || !isReady()) return;

    const saveButton = target.closest(
      '[data-post-action="save"]'
    );

    if (!saveButton) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    toggleSave(saveButton.dataset.postId);
  }

  /* =======================================================
     DELEGATED POST MENU ACTIONS
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

  console.info(
    "KSK Supabase Post Actions module loaded."
  );

})(window);
