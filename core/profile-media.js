
"use strict";

/*
 * KSK PROFILE MEDIA UI
 * Avatar + Cover Photo
 * Storage: KSKMedia (IndexedDB)
 * Profile data: KSKData
 */

(function (global) {
  const $ = (selector, root = document) =>
    root.querySelector(selector);

  let observer = null;
  let busy = false;

  const objectURLs = new Map();

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "EN";
  }

  function profile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function toast(message, type = "info") {
    global.KSKToast?.show?.(message, type);
  }

  function openModal(options) {
    return global.KSKModal?.openModal?.(options) || null;
  }

  function closeModal() {
    global.KSKModal?.closeModal?.();
  }

  function getMediaId(value) {
    const text = String(value || "");
    return text.startsWith("media_") ? text : "";
  }

  async function getImageURL(id) {
    if (!id) return "";

    if (objectURLs.has(id)) {
      return objectURLs.get(id);
    }

    const url = await global.KSKMedia?.getImageURL?.(id);

    if (url) objectURLs.set(id, url);

    return url || "";
  }

  function injectStyles() {
    if ($("#kskProfileMediaStyles")) return;

    const style = document.createElement("style");
    style.id = "kskProfileMediaStyles";

    style.textContent = `
      .ksk-profile-cover {
        width:100%;
        height:190px;
        overflow:hidden;
        position:relative;
        border-radius:16px;
        background:linear-gradient(135deg,#243b55,#141e30);
        margin-bottom:-42px;
      }

      .ksk-profile-cover img {
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }

      .ksk-profile-cover-empty {
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
        font-size:38px;
        opacity:.75;
      }

      .profile-card .profile-avatar {
        position:relative;
        z-index:2;
        width:max-content;
        margin:0 auto 12px;
        padding:5px;
        border-radius:50%;
        background:var(--card-bg,#fff);
      }

      .profile-card .profile-avatar .avatar {
        overflow:hidden;
      }

      .profile-card .profile-avatar img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .ksk-profile-media-fields {
        display:grid;
        gap:14px;
        margin-top:16px;
      }

      .ksk-profile-upload {
        display:flex;
        flex-direction:column;
        gap:8px;
        padding:12px;
        border:1px solid var(--border-color,#ddd);
        border-radius:12px;
      }

      .ksk-profile-upload input {
        width:100%;
      }

      .ksk-profile-preview {
        width:100%;
        max-height:150px;
        object-fit:cover;
        border-radius:10px;
        display:none;
      }

      .ksk-profile-preview.has-image {
        display:block;
      }

      .ksk-nav-avatar {
        width:27px;
        height:27px;
        border-radius:50%;
        object-fit:cover;
        display:block;
      }
    `;

    document.head.appendChild(style);
  }

  async function updateFooterAvatar() {
    const button = $(
      '.nav-item[data-page="profile"] .nav-icon'
    );

    if (!button) return;

    const user = profile();
    const id = getMediaId(user.avatarMediaId || user.avatar);

    if (!id) {
      if (button.querySelector("img")) {
        button.textContent = "👤";
      }
      return;
    }

    const url = await getImageURL(id);
    if (!url || !button.isConnected) return;

    button.innerHTML = "";

    const img = document.createElement("img");
    img.className = "ksk-nav-avatar";
    img.src = url;
    img.alt = "Profile";

    button.appendChild(img);
  }

  async function updateProfileDisplay() {
    const card = $(".profile-section .profile-card");
    if (!card) {
      updateFooterAvatar();
      return;
    }

    const user = profile();

    let cover = $(".ksk-profile-cover", card);

    if (!cover) {
      cover = document.createElement("div");
      cover.className = "ksk-profile-cover";

      const avatar = $(".profile-avatar", card);

      if (avatar) {
        card.insertBefore(cover, avatar);
      } else {
        card.prepend(cover);
      }
    }

    const coverId = getMediaId(
      user.coverMediaId || user.cover
    );

    if (coverId) {
      const url = await getImageURL(coverId);

      if (url && cover.isConnected) {
        cover.innerHTML = "";

        const img = document.createElement("img");
        img.src = url;
        img.alt = "Cover Photo";

        cover.appendChild(img);
      }
    } else {
      cover.innerHTML = `
        <div class="ksk-profile-cover-empty">🌄</div>
      `;
    }

    const avatarId = getMediaId(
      user.avatarMediaId || user.avatar
    );

    const avatarBox = $(".profile-avatar .avatar", card);

    if (avatarBox && avatarId) {
      const url = await getImageURL(avatarId);

      if (url && avatarBox.isConnected) {
        avatarBox.innerHTML = "";

        const img = document.createElement("img");
        img.src = url;
        img.alt = "Profile Avatar";

        avatarBox.appendChild(img);
      }
    }

    updateFooterAvatar();
  }

  function openEditor() {
    if (busy) return;

    const user = profile();

    const modal = openModal({
      title: isEnglish()
        ? "Edit Profile"
        : "प्रोफाइल सम्पादन",

      content: `
        <form id="kskProfileMediaForm">

          <div class="form-group">
            <label class="form-label" for="kskPMName">
              ${isEnglish() ? "Name" : "नाम"}
            </label>

            <input
              id="kskPMName"
              class="form-input"
              maxlength="60"
              value="${escapeHTML(user.name || "")}">
          </div>

          <div class="form-group">
            <label class="form-label" for="kskPMBio">
              ${isEnglish() ? "About me" : "मेरो परिचय"}
            </label>

            <textarea
              id="kskPMBio"
              class="form-textarea"
              maxlength="240"
              rows="3">${escapeHTML(user.bio || "")}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="kskPMLocation">
              ${isEnglish() ? "Location" : "ठेगाना"}
            </label>

            <input
              id="kskPMLocation"
              class="form-input"
              maxlength="100"
              value="${escapeHTML(user.location || "")}">
          </div>

          <div class="ksk-profile-media-fields">

            <div class="ksk-profile-upload">
              <strong>
                ${isEnglish() ? "Profile Avatar" : "प्रोफाइल फोटो"}
              </strong>

              <input
                id="kskPMAvatar"
                type="file"
                accept="image/jpeg,image/png,image/webp">

              <img
                id="kskPMAvatarPreview"
                class="ksk-profile-preview"
                alt="Avatar preview">
            </div>

            <div class="ksk-profile-upload">
              <strong>
                ${isEnglish() ? "Cover Photo" : "Cover फोटो"}
              </strong>

              <input
                id="kskPMCover"
                type="file"
                accept="image/jpeg,image/png,image/webp">

              <img
                id="kskPMCoverPreview"
                class="ksk-profile-preview"
                alt="Cover preview">
            </div>

          </div>
        </form>
      `,

      footer: `
        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${isEnglish() ? "Cancel" : "रद्द"}
        </button>

        <button
          class="btn btn-primary"
          type="submit"
          form="kskProfileMediaForm"
          id="kskPMSave">
          ${isEnglish() ? "Save Profile" : "सुरक्षित गर्नुहोस्"}
        </button>
      `
    });

    if (!modal) return;

    const form = $("#kskProfileMediaForm", modal.element);

    function preview(inputId, previewId) {
      const input = $(`#${inputId}`, modal.element);
      const image = $(`#${previewId}`, modal.element);

      input?.addEventListener("change", () => {
        const file = input.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
          toast(
            isEnglish()
              ? "Please select an image."
              : "कृपया फोटो छान्नुहोस्।",
            "warning"
          );
          input.value = "";
          return;
        }

        if (file.size > 12 * 1024 * 1024) {
          toast(
            isEnglish()
              ? "Image must be smaller than 12 MB."
              : "फोटो १२ MB भन्दा सानो हुनुपर्छ।",
            "warning"
          );
          input.value = "";
          return;
        }

        const oldURL = image.dataset.previewURL;
        if (oldURL) URL.revokeObjectURL(oldURL);

        const url = URL.createObjectURL(file);

        image.src = url;
        image.dataset.previewURL = url;
        image.classList.add("has-image");
      });
    }

    preview("kskPMAvatar", "kskPMAvatarPreview");
    preview("kskPMCover", "kskPMCoverPreview");

    form?.addEventListener("submit", async event => {
      event.preventDefault();

      if (busy) return;
      busy = true;

      const saveButton = $("#kskPMSave", modal.element);
      if (saveButton) saveButton.disabled = true;

      let avatarId = user.avatarMediaId || user.avatar || "";
      let coverId = user.coverMediaId || user.cover || "";

      const savedMedia = [];

      try {
        const avatarFile = $("#kskPMAvatar", modal.element)?.files?.[0];
        const coverFile = $("#kskPMCover", modal.element)?.files?.[0];

        if (avatarFile) {
          const saved = await global.KSKMedia.saveImage(avatarFile);

          if (!saved?.id) throw new Error("Avatar upload failed");

          avatarId = saved.id;
          savedMedia.push(saved.id);
        }

        if (coverFile) {
          const saved = await global.KSKMedia.saveImage(coverFile);

          if (!saved?.id) throw new Error("Cover upload failed");

          coverId = saved.id;
          savedMedia.push(saved.id);
        }

        const result = global.KSKData?.saveProfile?.({
          name: $("#kskPMName", modal.element)?.value.trim() || "",
          bio: $("#kskPMBio", modal.element)?.value.trim() || "",
          location: $("#kskPMLocation", modal.element)?.value.trim() || "",
          avatar: avatarId,
          avatarMediaId: avatarId,
          cover: coverId,
          coverMediaId: coverId
        });

        if (!result) throw new Error("Profile save failed");

        closeModal();

        global.KSKApp?.refreshCurrentPage?.();
        updateProfileDisplay();

        toast(
          isEnglish()
            ? "Profile updated successfully."
            : "प्रोफाइल सफलतापूर्वक अपडेट भयो।",
          "success"
        );
      } catch (error) {
        console.error("KSK profile media save failed:", error);

        for (const id of savedMedia) {
          await global.KSKMedia?.deleteImage?.(id).catch(() => {});
        }

        toast(
          isEnglish()
            ? "Profile could not be saved. Please try again."
            : "प्रोफाइल सुरक्षित भएन। फेरि प्रयास गर्नुहोस्।",
          "error"
        );
      } finally {
        busy = false;
        if (saveButton?.isConnected) saveButton.disabled = false;
      }
    });
  }

  function handleClick(event) {
    const target = event.target;
    if (!target?.closest) return;

    const editButton = target.closest("[data-edit-profile]");

    if (editButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openEditor();
    }
  }

  function refresh() {
    updateProfileDisplay();
  }

  function initialize() {
    if (observer) return;

    injectStyles();

    document.addEventListener("click", handleClick, true);

    observer = new MutationObserver(() => {
      updateProfileDisplay();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    global.addEventListener("ksk:data-change", event => {
      if (event.detail?.collection === "profile") {
        updateProfileDisplay();
      }
    });

    updateProfileDisplay();

    console.info("KSK Profile Media UI initialized.");
  }

  global.KSKProfileMediaUI = Object.freeze({
    initialize,
    refresh,
    openEditor
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

})(window);
