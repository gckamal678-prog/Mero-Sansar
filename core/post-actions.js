"use strict";

/*
 * KSK — POST ACTIONS
 * Shared Action Menu integration
 *
 * Existing Supabase save/edit/delete features preserved.
 */

(function (global) {
  "use strict";

  if (global.KSKPostActions) return;

  const MODAL = () => global.KSKModal || null;
  const UTILS = () => global.KSKUtils || null;
  const POSTS = () => global.KSKSupabasePosts || null;
  const AUTH = () => global.KSKSupabaseAuth || null;

  let initialized = false;

  const savedPostIds = new Set();
  const savingPostIds = new Set();

  let savedCacheUserId = "";
  let savedPostsLoading = null;
  let savedPostsLoaded = false;

  let app = {
    isEnglish: () => false,
    translate: (key, fallback = "") => fallback || key,
    toast: () => {},
    refreshCurrentPage: () => {}
  };

  /* UTILITIES */

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

    console.error("KSKPostActions is not initialized.");
    return false;
  }

  function getCurrentUserId() {
    return String(AUTH()?.getUser?.()?.id || "");
  }

  function getErrorMessage(result, fallback) {
    return String(
      result?.message ||
      result?.code ||
      fallback
    );
  }

  /* SUPABASE POST LOOKUP */

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

    const loaders = [
      () => api.getFeed({ limit: 100 }),

      ...(typeof api.getMyPosts === "function"
        ? [() => api.getMyPosts({ limit: 100 })]
        : []),

      ...(typeof api.getSavedPosts === "function"
        ? [() => api.getSavedPosts()]
        : [])
    ];

    let lastError = null;

    for (const load of loaders) {
      try {
        const result = await load();

        if (!result?.ok || !Array.isArray(result.data)) {
          lastError = new Error(
            getErrorMessage(
              result,
              isEnglish()
                ? "Could not load the post."
                : "पोस्ट लोड गर्न सकिएन।"
            )
          );

          continue;
        }

        const post = result.data.find(
          item => String(item?.id) === id
        );

        if (post) return post;

      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(
      isEnglish()
        ? "Post could not be found."
        : "पोस्ट भेटिएन।"
    );
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

  /* INITIALIZATION */

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

    loadSavedPosts().catch(() => {});

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

    document.removeEventListener(
      "ksk:action-menu-select",
      handleActionMenuSelect
    );

    document.addEventListener(
      "ksk:action-menu-select",
      handleActionMenuSelect
    );

    global.KSKActionMenu?.initialize?.();

    return true;
  }

  /* SAVED POSTS */

  async function getSavedPostsContext() {
    const auth = AUTH();

    if (!auth || typeof auth.initialize !== "function") {
      throw new Error(
        isEnglish()
          ? "Supabase authentication is unavailable."
          : "Supabase Authentication उपलब्ध छैन।"
      );
    }

    const initializedAuth = await auth.initialize();

    if (!initializedAuth || !auth.isAuthenticated?.()) {
      throw new Error(
        isEnglish()
          ? "Please sign in first."
          : "पहिले आफ्नो खातामा लगइन गर्नुहोस्।"
      );
    }

    const client = auth.getClient?.();
    const user = auth.getUser?.();

    if (!client || !user?.id) {
      throw new Error(
        isEnglish()
          ? "Your login session could not be found."
          : "लगइन Session प्राप्त भएन।"
      );
    }

    const userId = String(user.id);

    if (savedCacheUserId !== userId) {
      savedPostIds.clear();
      savedCacheUserId = userId;
      savedPostsLoading = null;
      savedPostsLoaded = false;
    }

    return { client, user, userId };
  }

  async function loadSavedPosts(force = false) {
    if (savedPostsLoading && !force) {
      return savedPostsLoading;
    }

    savedPostsLoading = (async () => {
      try {
        const { client, userId } =
          await getSavedPostsContext();

        const { data, error } = await client
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        savedPostIds.clear();

        (Array.isArray(data) ? data : []).forEach(row => {
          if (row?.post_id) {
            savedPostIds.add(String(row.post_id));
          }
        });

        savedPostsLoaded = true;

        global.dispatchEvent(
          new CustomEvent("ksk:saved-posts-change", {
            detail: {
              action: "loaded",
              userId,
              postIds: Array.from(savedPostIds)
            }
          })
        );

        return {
          ok: true,
          data: Array.from(savedPostIds)
        };

      } catch (error) {
        console.error(
          "KSK Saved Posts load failed:",
          error
        );

        return {
          ok: false,
          message: getErrorMessage(
            error,
            isEnglish()
              ? "Could not load saved posts."
              : "सेभ गरिएका पोस्ट लोड गर्न सकिएन।"
          )
        };

      } finally {
        savedPostsLoading = null;
      }
    })();

    return savedPostsLoading;
  }

  function isPostSaved(postId) {
    const id = String(postId || "").trim();

    if (!id) return false;

    const currentUserId = String(
      AUTH()?.getUser?.()?.id || ""
    );

    if (
      currentUserId &&
      savedCacheUserId !== currentUserId
    ) {
      savedPostIds.clear();
      savedCacheUserId = currentUserId;
      savedPostsLoading = null;
      savedPostsLoaded = false;
    }

    if (
      !savedCacheUserId ||
      (!savedPostsLoaded && !savedPostsLoading)
    ) {
      loadSavedPosts().catch(() => {});
    }

    return savedPostIds.has(id);
  }

  async function toggleSave(postId, button = null) {
    if (!isReady()) return false;

    const id = String(postId || "").trim();

    if (!id) {
      toast(
        isEnglish()
          ? "Post ID is missing."
          : "पोस्ट ID उपलब्ध छैन।",
        "error"
      );

      return false;
    }

    if (savingPostIds.has(id)) return false;

    savingPostIds.add(id);

    if (button) button.disabled = true;

    try {
      const { client, userId } =
        await getSavedPostsContext();

      if (!savedPostsLoaded) {
        const loaded = await loadSavedPosts(true);

        if (!loaded?.ok) {
          throw new Error(
            loaded?.message || "Saved posts load failed."
          );
        }
      }

      const wasSaved = savedPostIds.has(id);

      if (wasSaved) {
        const { error } = await client
          .from("saved_posts")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", id);

        if (error) throw error;

        savedPostIds.delete(id);

        toast(
          isEnglish()
            ? "Post removed from saved."
            : "सेभ सूचीबाट पोस्ट हटाइयो।",
          "success"
        );

      } else {
        const { error } = await client
          .from("saved_posts")
          .insert({
            user_id: userId,
            post_id: id
          });

        if (error) throw error;

        savedPostIds.add(id);

        toast(
          isEnglish()
            ? "Post saved successfully."
            : "पोस्ट सफलतापूर्वक सेभ भयो।",
          "success"
        );
      }

      global.dispatchEvent(
        new CustomEvent("ksk:saved-posts-change", {
          detail: {
            action: wasSaved ? "removed" : "saved",
            userId,
            postId: id,
            saved: !wasSaved
          }
        })
      );

      global.dispatchEvent(
        new CustomEvent("ksk:posts-cloud-change", {
          detail: {
            action: wasSaved
              ? "post-unsaved"
              : "post-saved",
            postId: id,
            source: "post-actions"
          }
        })
      );

      return true;

    } catch (error) {
      console.error(
        "KSK Saved Posts action failed:",
        error
      );

      toast(
        error?.message ||
          (
            isEnglish()
              ? "Could not update saved posts."
              : "पोस्ट सेभ सूची परिवर्तन गर्न सकिएन।"
          ),
        "error"
      );

      return false;

    } finally {
      savingPostIds.delete(id);

      if (button) button.disabled = false;
    }
  }

  /* EDIT POST */

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

  /* SHARED ACTION MENU */

  function getActionMenuService() {
    const menu = global.KSKActionMenu || null;

    if (typeof menu?.initialize !== "function") {
      throw new Error(
        isEnglish()
          ? "Shared action menu is unavailable."
          : "साझा Action Menu उपलब्ध छैन।"
      );
    }

    menu.initialize();

    return menu;
  }

  function safeMenuId(postId) {
    return "ksk-post-menu-" +
      String(postId || "").replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      );
  }

  function buildPostMenuMarkup(post) {
    const id = String(post.id);
    const menuId = safeMenuId(id);

    const ownPost = canManagePost(post);
    const saved = isPostSaved(id);

    const items = ownPost
      ? `
          <button
            type="button"
            role="menuitem"
            data-menu-action="post-edit"
            data-menu-value="${escapeHTML(id)}">
            <span aria-hidden="true">✏️</span>
            ${isEnglish()
              ? "Edit post"
              : "पोस्ट सम्पादन"}
          </button>

          <button
            type="button"
            role="menuitem"
            class="is-danger"
            data-menu-action="post-delete"
            data-menu-value="${escapeHTML(id)}">
            <span aria-hidden="true">🗑️</span>
            ${isEnglish()
              ? "Delete post"
              : "पोस्ट मेटाउनुहोस्"}
          </button>
        `
      : `
          <button
            type="button"
            role="menuitem"
            data-menu-action="post-save"
            data-menu-value="${escapeHTML(id)}">
            <span aria-hidden="true">
              ${saved ? "🔖" : "☆"}
            </span>

            ${saved
              ? (
                  isEnglish()
                    ? "Remove from saved"
                    : "सेभ सूचीबाट हटाउनुहोस्"
                )
              : (
                  isEnglish()
                    ? "Save post"
                    : "पोस्ट सेभ गर्नुहोस्"
                )}
          </button>
        `;

    return `
      <div class="ksk-action-menu">

        <button
          type="button"
          class="icon-button"
          data-ksk-menu-trigger
          data-post-menu="${escapeHTML(id)}"
          aria-controls="${menuId}"
          aria-expanded="false"
          aria-label="${isEnglish()
            ? "Post options"
            : "पोस्टका विकल्प"}"
          title="${isEnglish()
            ? "More options"
            : "थप विकल्प"}">
          ⋯
        </button>

        <div
          id="${menuId}"
          data-ksk-menu
          role="menu"
          hidden>
          ${items}
        </div>

      </div>
    `;
  }

  async function openPostMenu(postId, trigger = null) {
    if (!isReady()) return false;

    const id = String(postId || "").trim();

    if (!id) {
      toast(
        isEnglish()
          ? "Post ID is missing."
          : "पोस्ट ID उपलब्ध छैन।",
        "warning"
      );

      return false;
    }

    try {
      const menuService = getActionMenuService();
      const post = await getCloudPost(id);

      let button = trigger;

      if (!button?.isConnected) {
        button = Array.from(
          document.querySelectorAll("[data-post-menu]")
        ).find(
          node => String(node.dataset.postMenu || "") === id
        );
      }

      if (!button?.isConnected) {
        toast(
          isEnglish()
            ? "Post options are no longer available."
            : "पोस्टका विकल्प अहिले उपलब्ध छैनन्।",
          "warning"
        );

        return false;
      }

      const existing = button.closest(
        ".ksk-action-menu"
      );

      const wrapper = document.createElement("div");

      wrapper.innerHTML =
        buildPostMenuMarkup(post);

      const newWrapper = wrapper.firstElementChild;

      const newTrigger = newWrapper?.querySelector(
        "[data-ksk-menu-trigger]"
      );

      if (!newWrapper || !newTrigger) {
        throw new Error(
          "Could not build the post action menu."
        );
      }

      if (existing) {
        existing.replaceWith(newWrapper);
      } else {
        button.replaceWith(newWrapper);
      }

      menuService.open(newTrigger, false);

      return true;

    } catch (error) {
      console.error(
        "KSK Post menu failed:",
        error
      );

      toast(
        error?.message ||
          (
            isEnglish()
              ? "Post options are unavailable."
              : "पोस्ट विकल्प उपलब्ध छैनन्।"
          ),
        "error"
      );

      return false;
    }
  }

  function handleActionMenuSelect(event) {
    const detail = event?.detail || {};

    const action = String(
      detail.action || ""
    );

    const postId = String(
      detail.value || ""
    ).trim();

    if (
      !postId ||
      !action.startsWith("post-")
    ) {
      return;
    }

    if (action === "post-edit") {
      editPost(postId);
      return;
    }

    if (action === "post-delete") {
      deletePost(postId);
      return;
    }

    if (action === "post-save") {
      toggleSave(postId);
    }
  }

  /* DELETE CONFIRMATION */

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

    confirmButton.addEventListener(
      "click",
      async () => {
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
      }
    );

    return true;
  }

  /* DELETE POST */

  function deletePost(postId) {
    if (!isReady()) return false;

    confirmDeletePost(postId);

    return true;
  }

  /* SAVE BUTTON CAPTURE HANDLER */

  function onDocumentClick(event) {
    const target = event.target;

    if (!target?.closest || !isReady()) return;

    const saveButton = target.closest(
      '[data-post-action="save"]'
    );

    if (!saveButton) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    toggleSave(
      saveButton.dataset.postId,
      saveButton
    );
  }

  /* DELEGATED POST ACTIONS */

  function handleClick(target) {
    if (!isReady()) return false;

    if (
      !target ||
      typeof target.closest !== "function"
    ) {
      return false;
    }

    /*
     * Shared KSKActionMenu ले data-ksk-menu-trigger
     * क्लिक आफैँ toggle गर्छ। यहाँ पुनः openPostMenu
     * चलाउँदा menu हरेक पटक फेरि rebuild भएर बन्द/खुल्ने
     * व्यवहार बिग्रन्छ। त्यसैले existing shared trigger
     * लाई यहीँबाट पुनः process गर्दैनौँ।
     */
    const sharedMenuTrigger = target.closest(
      "[data-ksk-menu-trigger]"
    );

    if (sharedMenuTrigger) {
      return true;
    }

    const postMenu = target.closest(
      "[data-post-menu]"
    );

    if (postMenu) {
      openPostMenu(
        postMenu.dataset.postMenu,
        postMenu
      );

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

  /* CLEANUP */

  function destroy() {
    document.removeEventListener(
      "click",
      onDocumentClick,
      true
    );

    document.removeEventListener(
      "ksk:action-menu-select",
      handleActionMenuSelect
    );

    initialized = false;

    savedPostIds.clear();
    savingPostIds.clear();

    savedCacheUserId = "";
    savedPostsLoading = null;
    savedPostsLoaded = false;

    return true;
  }

  /* PUBLIC API */

  global.KSKPostActions = Object.freeze({
    initialize,
    destroy,

    handleClick,
    openPostMenu,

    editPost,
    deletePost,

    toggleSave,
    isPostSaved
  });

  console.info(
    "KSK Supabase Post Actions module loaded."
  );

})(window);
