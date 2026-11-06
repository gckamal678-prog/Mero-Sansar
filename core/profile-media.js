"use strict";

/*
 * KSK PROFILE MEDIA UI
 * Avatar + Cover Photo
 *
 * Architecture:
 * - Profile Data: KSKData
 * - Image Storage: KSKMedia
 * - Modal: KSKModal
 * - Notifications: KSKToast
 * - Navigation: KSKNavigation
 */

(function (global) {

  /* =====================================================
     CORE
  ===================================================== */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  let initialized = false;
  let busy = false;

  const objectURLs = new Map();


  /* =====================================================
     LANGUAGE
  ===================================================== */

  function isEnglish() {
    return (
      global.KSKLanguage?.getLanguage?.() === "en"
    );
  }


  /* =====================================================
     PROFILE DATA
  ===================================================== */

  function profile() {
    return global.KSKData?.getProfile?.() || {};
  }


  /* =====================================================
     TOAST
  ===================================================== */

  function toast(message, type = "info") {

    const api = global.KSKToast;

    if (api?.[type]) {
      api[type](message);
      return;
    }

    api?.show?.(message, type);
  }


  /* =====================================================
     MODAL
  ===================================================== */

  function openModal(options) {

    if (!global.KSKModal?.openModal) {
      toast(
        isEnglish()
          ? "This feature is unavailable."
          : "यो सुविधा अहिले उपलब्ध छैन।",
        "error"
      );

      return null;
    }

    return global.KSKModal.openModal(options);
  }


  function closeModal() {
    global.KSKModal?.closeModal?.();
  }


  /* =====================================================
     MEDIA ID
  ===================================================== */

  function getMediaId(value) {

    const text = String(value || "");

    if (
      text.startsWith("ksk_media_") ||
      text.startsWith("media_")
    ) {
      return text;
    }

    return "";
  }


  /* =====================================================
     IMAGE URL
  ===================================================== */

  async function getImageURL(id) {

    if (!id) return "";

    if (objectURLs.has(id)) {
      return objectURLs.get(id);
    }

    try {

      const url =
        await global.KSKMedia?.getImageURL?.(id);

      if (url) {
        objectURLs.set(id, url);
      }

      return url || "";

    } catch (error) {

      console.error(
        "KSK Profile Media: Image loading failed.",
        error
      );

      return "";
    }
  }


  /* =====================================================
     HTML ESCAPE
  ===================================================== */

  function escapeHTML(value) {

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


  /* =====================================================
     STYLES
  ===================================================== */

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
        background:linear-gradient(
          135deg,
          #243b55,
          #141e30
        );
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
        display:block;
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


  /* =====================================================
     FOOTER AVATAR
  ===================================================== */

  async function updateFooterAvatar() {

    const button = $(
      '.nav-item[data-page="profile"] .nav-icon'
    );

    if (!button) return;

    const user = profile();

    const id = getMediaId(
      user.avatarMediaId || user.avatar
    );

    if (!id) {

      if (button.querySelector("img")) {
        button.textContent = "👤";
      }

      return;
    }

    const url = await getImageURL(id);

    if (!url || !button.isConnected) return;

    // एउटै URL को Image भए पुनः DOM नबदल्ने
    const currentImage = $("img", button);

    if (currentImage?.src === url) return;

    button.innerHTML = "";

    const img = document.createElement("img");

    img.className = "ksk-nav-avatar";
    img.src = url;
    img.alt = "Profile";

    button.appendChild(img);
  }


  /* =====================================================
     PROFILE DISPLAY
  ===================================================== */

  async function updateProfileDisplay() {

    const card = $(
      ".profile-section .profile-card"
    );

    if (!card) {
      await updateFooterAvatar();
      return;
    }

    const user = profile();

    /* COVER CONTAINER */

    let cover = $(
      ".ksk-profile-cover",
      card
    );

    if (!cover) {

      cover = document.createElement("div");

      cover.className = "ksk-profile-cover";

      const avatar = $(
        ".profile-avatar",
        card
      );

      if (avatar) {
        card.insertBefore(cover, avatar);
      } else {
        card.prepend(cover);
      }
    }


    /* COVER IMAGE */

    const coverId = getMediaId(
      user.coverMediaId || user.cover
    );

    if (coverId) {

      const url = await getImageURL(coverId);

      if (url && cover.isConnected) {

        const currentImage = $("img", cover);

        if (currentImage?.src !== url) {

          cover.innerHTML = "";

          const img = document.createElement("img");

          img.src = url;
          img.alt = "Cover Photo";

          cover.appendChild(img);
        }
      }

    } else {

      if (!$(".ksk-profile-cover-empty", cover)) {

        cover.innerHTML = `
          <div class="ksk-profile-cover-empty">
            🌄
          </div>
        `;
      }
    }


    /* AVATAR IMAGE */

    const avatarId = getMediaId(
      user.avatarMediaId || user.avatar
    );

    const avatarBox = $(
      ".profile-avatar .avatar",
      card
    );

    if (avatarBox && avatarId) {

      const url = await getImageURL(avatarId);

      if (url && avatarBox.isConnected) {

        const currentImage = $("img", avatarBox);

        if (currentImage?.src !== url) {

          avatarBox.innerHTML = "";

          const img = document.createElement("img");

          img.src = url;
          img.alt = "Profile Avatar";

          avatarBox.appendChild(img);
        }
      }
    }

    await updateFooterAvatar();
  }


  /* =====================================================
     IMAGE PREVIEW
  ===================================================== */

  function bindPreview(
    modal,
    inputId,
    previewId
  ) {

    const input = $(
      `#${inputId}`,
      modal.element
    );

    const image = $(
      `#${previewId}`,
      modal.element
    );

    if (!input || !image) return;

    input.addEventListener("change", () => {

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

      if (oldURL) {
        URL.revokeObjectURL(oldURL);
      }

      const url = URL.createObjectURL(file);

      image.src = url;
      image.dataset.previewURL = url;

      image.classList.add("has-image");
    });
  }


  /* =====================================================
     PROFILE EDITOR
  ===================================================== */

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

            <label
              class="form-label"
              for="kskPMName">

              ${isEnglish() ? "Name" : "नाम"}

            </label>

            <input
              id="kskPMName"
              class="form-input"
              maxlength="60"
              value="${escapeHTML(user.name || "")}">

          </div>


          <div class="form-group">

            <label
              class="form-label"
              for="kskPMBio">

              ${isEnglish() ? "About me" : "मेरो परिचय"}

            </label>

            <textarea
              id="kskPMBio"
              class="form-textarea"
              maxlength="240"
              rows="3">${escapeHTML(user.bio || "")}</textarea>

          </div>


          <div class="form-group">

            <label
              class="form-label"
              for="kskPMLocation">

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
                ${isEnglish()
                  ? "Profile Avatar"
                  : "प्रोफाइल फोटो"}
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
                ${isEnglish()
                  ? "Cover Photo"
                  : "Cover फोटो"}
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

          ${isEnglish()
            ? "Save Profile"
            : "सुरक्षित गर्नुहोस्"}

        </button>

      `
    });

    if (!modal) return;


    /* PREVIEWS */

    bindPreview(
      modal,
      "kskPMAvatar",
      "kskPMAvatarPreview"
    );

    bindPreview(
      modal,
      "kskPMCover",
      "kskPMCoverPreview"
    );


    /* FORM */

    const form = $(
      "#kskProfileMediaForm",
      modal.element
    );

    form?.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        if (busy) return;

        busy = true;

        const saveButton = $(
          "#kskPMSave",
          modal.element
        );

        if (saveButton) {
          saveButton.disabled = true;
        }

        let avatarId =
          user.avatarMediaId || user.avatar || "";

        let coverId =
          user.coverMediaId || user.cover || "";

        const savedMedia = [];

        try {

          const avatarFile = $(
            "#kskPMAvatar",
            modal.element
          )?.files?.[0];

          const coverFile = $(
            "#kskPMCover",
            modal.element
          )?.files?.[0];


          /* SAVE AVATAR */

          if (avatarFile) {

            const saved =
              await global.KSKMedia.saveImage(
                avatarFile
              );

            if (!saved?.id) {
              throw new Error(
                "Avatar upload failed"
              );
            }

            avatarId = saved.id;

            savedMedia.push(saved.id);
          }


          /* SAVE COVER */

          if (coverFile) {

            const saved =
              await global.KSKMedia.saveImage(
                coverFile
              );

            if (!saved?.id) {
              throw new Error(
                "Cover upload failed"
              );
            }

            coverId = saved.id;

            savedMedia.push(saved.id);
          }


          /* SAVE PROFILE */

          const result =
            global.KSKData?.saveProfile?.({

              name: $(
                "#kskPMName",
                modal.element
              )?.value.trim() || "",

              bio: $(
                "#kskPMBio",
                modal.element
              )?.value.trim() || "",

              location: $(
                "#kskPMLocation",
                modal.element
              )?.value.trim() || "",

              avatar: avatarId,
              avatarMediaId: avatarId,

              cover: coverId,
              coverMediaId: coverId

            });


          if (!result) {
            throw new Error(
              "Profile save failed"
            );
          }


          /* CLOSE AND REFRESH */

          closeModal();

          global.KSKApp?.refreshCurrentPage?.();

          await updateProfileDisplay();


          toast(
            isEnglish()
              ? "Profile updated successfully."
              : "प्रोफाइल सफलतापूर्वक अपडेट भयो।",
            "success"
          );


        } catch (error) {

          console.error(
            "KSK profile media save failed:",
            error
          );


          /* CLEANUP NEW MEDIA */

          for (const id of savedMedia) {

            try {

              await global.KSKMedia?.deleteImage?.(
                id
              );

              objectURLs.delete(id);

            } catch (cleanupError) {

              console.warn(
                "KSK Media cleanup failed:",
                cleanupError
              );
            }
          }


          toast(
            isEnglish()
              ? "Profile could not be saved. Please try again."
              : "प्रोफाइल सुरक्षित भएन। फेरि प्रयास गर्नुहोस्।",
            "error"
          );


        } finally {

          busy = false;

          if (saveButton?.isConnected) {
            saveButton.disabled = false;
          }
        }
      }
    );
  }


  /* =====================================================
     EDIT BUTTON INTERCEPTION
  ===================================================== */

  function handleClick(event) {

    const target = event.target;

    if (!target?.closest) return;

    const editButton = target.closest(
      "[data-edit-profile]"
    );

    if (!editButton) return;

    event.preventDefault();

    event.stopImmediatePropagation();

    openEditor();
  }


  /* =====================================================
     REFRESH
  ===================================================== */

  function refresh() {
    updateProfileDisplay();
  }


  /* =====================================================
     INITIALIZE
     No MutationObserver.
     Only required application events.
  ===================================================== */

  function initialize() {

    if (initialized) return;

    initialized = true;

    injectStyles();


    /* PROFILE EDIT CLICK */

    document.addEventListener(
      "click",
      handleClick,
      true
    );


    /* NAVIGATION EVENT */

    global.addEventListener(
      "ksk:navigate",
      () => {
        updateProfileDisplay();
      }
    );


    /* PROFILE DATA EVENT */

    global.addEventListener(
      "ksk:data-change",
      event => {

        if (
          event.detail?.collection === "profile"
        ) {
          updateProfileDisplay();
        }
      }
    );


    /* INITIAL DISPLAY */

    updateProfileDisplay();


    console.info(
      "KSK Profile Media UI initialized."
    );
  }


  /* =====================================================
     PUBLIC API
  ===================================================== */

  global.KSKProfileMediaUI = Object.freeze({

    initialize,

    refresh,

    openEditor

  });


  /* =====================================================
     AUTO START
  ===================================================== */

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
