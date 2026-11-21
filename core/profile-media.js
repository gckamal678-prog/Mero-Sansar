"use strict";

/*
 * KSK PROFILE MEDIA UI
 * Avatar + Cover Photo + Crop + Preview
 *
 * RESPONSIBILITY:
 * - Profile Avatar and Cover Photo
 * - Direct Gallery opening
 * - Image crop, zoom and positioning
 * - Profile information editing
 * - Profile media display
 *
 * DEPENDENCIES:
 * KSKData, KSKMedia, KSKModal, KSKToast
 * KSKSupabaseAuth, KSKSupabaseProfile
 */

(function (global) {

  /* =====================================================
     CORE
  ===================================================== */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  let initialized = false;
  let busy = false;
  let activeCropURL = "";

  const objectURLs = new Map();


  /* =====================================================
     LANGUAGE
  ===================================================== */

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }


  function t(nepali, english) {
    return isEnglish() ? english : nepali;
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
    } else {
      api?.show?.(message, type);
    }
  }


  /* =====================================================
     MODAL
  ===================================================== */

  function openModal(options) {

    if (!global.KSKModal?.openModal) {
      toast(
        t("यो सुविधा अहिले उपलब्ध छैन।", "This feature is unavailable."),
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
     HELPERS
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


  function getImageSource(value) {

    const id = getMediaId(value);
    if (id) return getImageURL(id);

    const source = String(value || "").trim();

    if (/^(https?:\/\/|data:image\/)/i.test(source)) {
      return Promise.resolve(source);
    }

    return Promise.resolve("");
  }


  async function getImageURL(id) {

    if (!id) return "";

    if (objectURLs.has(id)) {
      return objectURLs.get(id);
    }

    try {

      const url = await global.KSKMedia?.getImageURL?.(id);

      if (url) {
        objectURLs.set(id, url);
      }

      return url || "";

    } catch (error) {

      console.error("KSK Profile Media: Image loading failed.", error);

      return "";
    }
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
        background:linear-gradient(135deg,#243b55,#141e30);
        margin-bottom:-42px;
        cursor:pointer;
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
        cursor:pointer;
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

      .ksk-profile-cover,
      .profile-card .profile-avatar {
        transition:filter .2s ease, transform .2s ease;
      }

      .ksk-profile-cover:hover,
      .profile-card .profile-avatar:hover {
        filter:brightness(.92);
      }

      .ksk-profile-photo-hint {
        position:absolute;
        right:10px;
        bottom:10px;
        z-index:3;
        width:34px;
        height:34px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        color:#fff;
        background:rgba(0,0,0,.65);
        font-size:16px;
        pointer-events:none;
      }

      .ksk-profile-avatar-hint {
        position:absolute;
        right:4px;
        bottom:4px;
        width:30px;
        height:30px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        color:#fff;
        background:#2563eb;
        border:2px solid var(--card-bg,#fff);
        font-size:13px;
        pointer-events:none;
      }

      .ksk-profile-upload-input {
        position:fixed !important;
        width:1px !important;
        height:1px !important;
        opacity:0 !important;
        pointer-events:none !important;
        left:-9999px !important;
      }

      .ksk-nav-avatar {
        width:27px;
        height:27px;
        border-radius:50%;
        object-fit:cover;
        display:block;
      }

      /* CROP EDITOR */

      .ksk-crop-layout {
        display:grid;
        gap:16px;
      }

      .ksk-crop-stage {
        width:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:14px;
        padding:12px;
        background:#111827;
      }

      .ksk-crop-stage canvas {
        display:block;
        max-width:100%;
        max-height:42vh;
        object-fit:contain;
        background:#111827;
      }

      .ksk-crop-controls {
        display:grid;
        gap:12px;
      }

      .ksk-crop-control {
        display:grid;
        gap:6px;
      }

      .ksk-crop-control label {
        font-size:13px;
        font-weight:600;
        color:var(--color-text);
      }

      .ksk-crop-control input {
        width:100%;
        accent-color:var(--color-primary,#2563eb);
      }

      .ksk-crop-note {
        font-size:12px;
        color:var(--color-text-secondary);
        line-height:1.6;
      }

      .ksk-profile-editor {
        display:grid;
        gap:14px;
      }

      .ksk-profile-editor .form-group {
        display:grid;
        gap:7px;
      }

      .ksk-profile-editor .form-label {
        font-weight:600;
      }

      @media(max-width:480px) {
        .ksk-profile-cover {
          height:150px;
        }

        .ksk-crop-stage canvas {
          max-height:36vh;
        }
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

    const source = user.avatarMediaId || user.avatar || "";

    const url = await getImageSource(source);

    if (!button.isConnected) return;

    if (!url) {

      if (button.querySelector("img")) {
        button.textContent = "👤";
      }

      return;
    }

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

    const card = $(".profile-section .profile-card");

    if (!card) {
      await updateFooterAvatar();
      return;
    }

    const user = profile();


    /* COVER CONTAINER */

    let cover = $(".ksk-profile-cover", card);

    if (!cover) {

      cover = document.createElement("div");

      cover.className = "ksk-profile-cover";
      cover.setAttribute("role", "button");
      cover.setAttribute("tabindex", "0");
      cover.setAttribute(
        "aria-label",
        t("Cover फोटो परिवर्तन गर्नुहोस्", "Change cover photo")
      );

      const avatar = $(".profile-avatar", card);

      if (avatar) {
        card.insertBefore(cover, avatar);
      } else {
        card.prepend(cover);
      }
    }


    /* COVER IMAGE */

    const coverSource = user.coverMediaId || user.cover || "";
    const coverURL = await getImageSource(coverSource);

    if (!cover.isConnected) return;

    if (coverURL) {

      const currentImage = $("img", cover);

      if (currentImage?.src !== coverURL) {

        cover.innerHTML = "";

        const img = document.createElement("img");

        img.src = coverURL;
        img.alt = "Cover Photo";

        cover.appendChild(img);
      }

    } else if (!$(".ksk-profile-cover-empty", cover)) {

      cover.innerHTML = `
        <div class="ksk-profile-cover-empty">🌄</div>
      `;
    }

    if (!$(".ksk-profile-photo-hint", cover)) {
      const hint = document.createElement("span");

      hint.className = "ksk-profile-photo-hint";
      hint.textContent = "📷";

      cover.appendChild(hint);
    }


    /* AVATAR */

    const avatarBox = $(".profile-avatar", card);
    const avatarInner = $(".profile-avatar .avatar", card);

    const avatarSource = user.avatarMediaId || user.avatar || "";
    const avatarURL = await getImageSource(avatarSource);

    if (!card.isConnected) return;

    if (avatarInner && avatarURL) {

      const currentImage = $("img", avatarInner);

      if (currentImage?.src !== avatarURL) {

        avatarInner.innerHTML = "";

        const img = document.createElement("img");

        img.src = avatarURL;
        img.alt = "Profile Avatar";

        avatarInner.appendChild(img);
      }
    }

    if (avatarBox) {

      avatarBox.setAttribute("role", "button");
      avatarBox.setAttribute("tabindex", "0");

      avatarBox.setAttribute(
        "aria-label",
        t("प्रोफाइल फोटो परिवर्तन गर्नुहोस्", "Change profile photo")
      );

      if (!$(".ksk-profile-avatar-hint", avatarBox)) {

        const hint = document.createElement("span");

        hint.className = "ksk-profile-avatar-hint";
        hint.textContent = "📷";

        avatarBox.appendChild(hint);
      }
    }

    await updateFooterAvatar();
  }


  /* =====================================================
     HIDDEN GALLERY INPUT
  ===================================================== */

  function openGallery(type) {

    if (busy) return;

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.className = "ksk-profile-upload-input";
    input.setAttribute("aria-label", "Choose photo");

    input.addEventListener("change", () => {

      const file = input.files?.[0];

      input.remove();

      if (!file) return;

      if (!String(file.type).startsWith("image/")) {

        toast(
          t("कृपया फोटो फाइल छान्नुहोस्।", "Please select an image."),
          "warning"
        );

        return;
      }

      if (file.size > 12 * 1024 * 1024) {

        toast(
          t("फोटो १२ MB भन्दा सानो हुनुपर्छ।", "Image must be smaller than 12 MB."),
          "warning"
        );

        return;
      }

      openCropEditor(file, type);
    }, { once: true });

    document.body.appendChild(input);

    // Direct user interaction opens the device gallery.
    input.click();
  }


  /* =====================================================
     IMAGE CROP ENGINE
  ===================================================== */

  function loadImage(file) {

    return new Promise((resolve, reject) => {

      const url = URL.createObjectURL(file);

      const image = new Image();

      image.onload = () => resolve({ image, url });

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("फोटो खोल्न सकिएन।"));
      };

      image.src = url;
    });
  }


  function openCropEditor(file, type) {

    const isAvatar = type === "avatar";

    const aspect = isAvatar ? 1 : 3;

    const outputWidth = isAvatar ? 900 : 1500;
    const outputHeight = Math.round(outputWidth / aspect);

    const title = isAvatar
      ? t("प्रोफाइल फोटो मिलाउनुहोस्", "Crop Profile Photo")
      : t("Cover फोटो मिलाउनुहोस्", "Crop Cover Photo");

    const modal = openModal({

      title,

      content: `

        <div class="ksk-crop-layout">

          <div class="ksk-crop-stage">
            <canvas id="kskCropCanvas"></canvas>
          </div>

          <div class="ksk-crop-controls">

            <div class="ksk-crop-control">
              <label for="kskCropZoom">
                ${t("Zoom", "Zoom")}
              </label>
              <input
                id="kskCropZoom"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value="1">
            </div>

            <div class="ksk-crop-control">
              <label for="kskCropX">
                ${t("दायाँ / बायाँ", "Horizontal position")}
              </label>
              <input
                id="kskCropX"
                type="range"
                min="-100"
                max="100"
                value="0">
            </div>

            <div class="ksk-crop-control">
              <label for="kskCropY">
                ${t("माथि / तल", "Vertical position")}
              </label>
              <input
                id="kskCropY"
                type="range"
                min="-100"
                max="100"
                value="0">
            </div>

          </div>

          <p class="ksk-crop-note">
            ${t(
              "फोटोको सही भाग मिलाउन Zoom र Position स्लाइडर चलाउनुहोस्।",
              "Adjust zoom and position to select the best part of your photo."
            )}
          </p>

        </div>

      `,

      footer: `

        <button
          type="button"
          class="btn btn-secondary"
          data-modal-close>
          ${t("रद्द", "Cancel")}
        </button>

        <button
          type="button"
          class="btn btn-primary"
          id="kskCropSave">
          ${t("फोटो सुरक्षित गर्नुहोस्", "Save Photo")}
        </button>

      `
    });

    if (!modal) return;

    const canvas = $("#kskCropCanvas", modal.element);
    const context = canvas?.getContext("2d");

    const zoomInput = $("#kskCropZoom", modal.element);
    const xInput = $("#kskCropX", modal.element);
    const yInput = $("#kskCropY", modal.element);
    const saveButton = $("#kskCropSave", modal.element);

    if (!canvas || !context) {
      closeModal();
      toast(t("फोटो तयार गर्न सकिएन।", "Could not prepare image."), "error");
      return;
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    loadImage(file).then(({ image, url }) => {

      activeCropURL = url;

      if (!modal.element.isConnected) {
        URL.revokeObjectURL(url);
        return;
      }

      function drawCrop() {

        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;

        const baseWidth = Math.min(
          imageWidth,
          imageHeight * aspect
        );

        const baseHeight = baseWidth / aspect;

        const zoom = Number(zoomInput.value) || 1;

        const cropWidth = baseWidth / zoom;
        const cropHeight = baseHeight / zoom;

        const maxX = Math.max(0, imageWidth - cropWidth);
        const maxY = Math.max(0, imageHeight - cropHeight);

        const xPosition = Number(xInput.value) / 100;
        const yPosition = Number(yInput.value) / 100;

        const sourceX =
          maxX / 2 + (maxX / 2) * xPosition;

        const sourceY =
          maxY / 2 + (maxY / 2) * yPosition;

        context.clearRect(0, 0, outputWidth, outputHeight);

        context.drawImage(
          image,
          sourceX,
          sourceY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputWidth,
          outputHeight
        );
      }

      drawCrop();

      [zoomInput, xInput, yInput].forEach(input => {
        input.addEventListener("input", drawCrop);
      });

      saveButton?.addEventListener("click", async () => {

        if (busy) return;

        busy = true;

        saveButton.disabled = true;

        try {

          const blob = await new Promise((resolve, reject) => {

            canvas.toBlob(
              result => {
                if (result) resolve(result);
                else reject(new Error("फोटो Crop गर्न सकिएन।"));
              },
              "image/jpeg",
              0.9
            );
          });

          const croppedFile = new File(
            [blob],
            isAvatar ? "profile-avatar.jpg" : "profile-cover.jpg",
            { type: "image/jpeg" }
          );

          closeModal();

          busy = false;
          await saveProfilePhoto(croppedFile, type);

        } catch (error) {

          console.error("KSK Crop failed:", error);

          toast(
            error.message || t("फोटो तयार गर्न सकिएन।", "Could not prepare photo."),
            "error"
          );

        } finally {

          busy = false;

          if (activeCropURL) {
            URL.revokeObjectURL(activeCropURL);
            activeCropURL = "";
          }
        }

      });

    }).catch(error => {

      console.error("KSK Crop image loading failed:", error);

      closeModal();

      toast(
        t("फोटो खोल्न सकिएन।", "Could not open photo."),
        "error"
      );
    });
  }


  /* =====================================================
     SAVE AVATAR / COVER TO SUPABASE
  ===================================================== */

  async function saveProfilePhoto(file, type) {

    if (busy) return;

    if (!["avatar", "cover"].includes(type)) {
      toast(t("फोटोको प्रकार मान्य छैन।", "Invalid photo type."), "error");
      return;
    }

    if (!(file instanceof Blob) || !file.type.startsWith("image/")) {
      toast(t("कृपया मान्य फोटो छान्नुहोस्।", "Please choose a valid image."), "error");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast(t("फोटो ८ MB भन्दा सानो हुनुपर्छ।", "The image must be smaller than 8 MB."), "error");
      return;
    }

    busy = true;

    try {

      const auth = global.KSKSupabaseAuth;
      const profileAPI = global.KSKSupabaseProfile;

      if (!auth || !profileAPI) {
        throw new Error(t(
          "Supabase Profile सेवा लोड भएको छैन।",
          "Supabase Profile service is not loaded."
        ));
      }

      await auth.initialize();

      if (!auth.isAuthenticated()) {
        throw new Error(t(
          "फोटो परिवर्तन गर्न पहिले लगइन गर्नुहोस्।",
          "Please sign in before changing your photo."
        ));
      }

      const client = auth.getClient();
      const user = auth.getUser();

      if (!client || !user?.id) {
        throw new Error(t(
          "प्रयोगकर्ता विवरण प्राप्त भएन।",
          "Could not get the signed-in user."
        ));
      }

      const extension = file.type === "image/png" ? "png" :
        file.type === "image/webp" ? "webp" : "jpg";

      const path = user.id + "/" + type + "-" +
        Date.now() + "-" +
        Math.random().toString(36).slice(2, 8) +
        "." + extension;

      const { error: uploadError } = await client.storage
        .from("profile-media")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = client.storage
        .from("profile-media")
        .getPublicUrl(path);

      const publicURL = publicData?.publicUrl;

      if (!publicURL) {
        throw new Error(t(
          "फोटोको URL प्राप्त भएन।",
          "Could not create the photo URL."
        ));
      }

      const updated = type === "avatar"
        ? await profileAPI.updateMyProfile({ avatar: publicURL })
        : await profileAPI.updateMyProfile({ cover: publicURL });

      if (!updated) {
        throw new Error(t(
          "प्रोफाइलमा फोटोको URL सुरक्षित भएन।",
          "The photo URL was not saved to your profile."
        ));
      }

      global.KSKData?.saveProfile?.(
        type === "avatar"
          ? { avatar: publicURL, avatarMediaId: "" }
          : { cover: publicURL, coverMediaId: "" }
      );

      objectURLs.clear();

      await updateProfileDisplay();

      global.KSKApp?.refreshCurrentPage?.();

      await updateProfileDisplay();

      toast(
        type === "avatar"
          ? t("प्रोफाइल फोटो परिवर्तन भयो।", "Profile photo updated.")
          : t("Cover फोटो परिवर्तन भयो।", "Cover photo updated."),
        "success"
      );

    } catch (error) {

      console.error("KSK Profile Photo Save Failed:", error);

      toast(
        error?.message ||
        t("फोटो सुरक्षित गर्न सकिएन।", "Could not save photo."),
        "error"
      );

    } finally {
      busy = false;
    }
  }


  /* =====================================================
     PROFILE INFORMATION EDITOR
  ===================================================== */

  function openEditor() {

    if (busy) return;

    const user = profile();

    const modal = openModal({

      title: t("प्रोफाइल सम्पादन", "Edit Profile"),

      content: `

        <form id="kskProfileMediaForm" class="ksk-profile-editor">

          <div class="form-group">

            <label class="form-label" for="kskPMName">
              ${t("नाम", "Name")}
            </label>

            <input
              id="kskPMName"
              class="form-input"
              maxlength="60"
              value="${escapeHTML(user.name || "")}">

          </div>

          <div class="form-group">

            <label class="form-label" for="kskPMBio">
              ${t("मेरो परिचय", "About me")}
            </label>

            <textarea
              id="kskPMBio"
              class="form-textarea"
              maxlength="240"
              rows="3">${escapeHTML(user.bio || "")}</textarea>

          </div>

          <div class="form-group">

            <label class="form-label" for="kskPMLocation">
              ${t("ठेगाना", "Location")}
            </label>

            <input
              id="kskPMLocation"
              class="form-input"
              maxlength="100"
              value="${escapeHTML(user.location || "")}">

          </div>

          <p class="ksk-crop-note">
            ${t(
              "Avatar वा Cover परिवर्तन गर्न प्रोफाइल पेजमा फोटोमा सिधै ट्याप गर्नुहोस्।",
              "Tap your Avatar or Cover Photo directly on your profile page to change it."
            )}
          </p>

        </form>

      `,

      footer: `

        <button
          class="btn btn-secondary"
          type="button"
          data-modal-close>
          ${t("रद्द", "Cancel")}
        </button>

        <button
          class="btn btn-primary"
          type="submit"
          form="kskProfileMediaForm"
          id="kskPMSave">
          ${t("सुरक्षित गर्नुहोस्", "Save Profile")}
        </button>

      `
    });

    if (!modal) return;

    const form = $("#kskProfileMediaForm", modal.element);

    form?.addEventListener("submit", async event => {

      event.preventDefault();

      if (busy) return;

      busy = true;

      const saveButton = $("#kskPMSave", modal.element);

      if (saveButton) saveButton.disabled = true;

      try {

        const auth = global.KSKSupabaseAuth;
        const profileAPI = global.KSKSupabaseProfile;

        if (!auth || !profileAPI) {
          throw new Error(t(
            "Supabase Profile सेवा लोड भएको छैन।",
            "Supabase Profile service is not loaded."
          ));
        }

        await auth.initialize();

        if (!auth.isAuthenticated()) {
          throw new Error(t(
            "प्रोफाइल सम्पादन गर्न पहिले लगइन गर्नुहोस्।",
            "Please sign in before editing your profile."
          ));
        }

        const payload = {

          name: $("#kskPMName", modal.element)?.value.trim() || "",

          bio: $("#kskPMBio", modal.element)?.value.trim() || "",

          location: $("#kskPMLocation", modal.element)?.value.trim() || ""

        };

        const updated = await profileAPI.updateMyProfile(payload);

        if (!updated) {
          throw new Error(t(
            "प्रोफाइल सुरक्षित भएन।",
            "Profile could not be saved."
          ));
        }

        global.KSKData?.saveProfile?.(payload);

        closeModal();

        global.KSKApp?.refreshCurrentPage?.();

        await updateProfileDisplay();

        toast(
          t(
            "प्रोफाइल सफलतापूर्वक अपडेट भयो।",
            "Profile updated successfully."
          ),
          "success"
        );

      } catch (error) {

        console.error("KSK Profile Save Failed:", error);

        toast(
          error?.message ||
          t(
            "प्रोफाइल सुरक्षित भएन। फेरि प्रयास गर्नुहोस्।",
            "Profile could not be saved."
          ),
          "error"
        );

      } finally {

        busy = false;

        if (saveButton) saveButton.disabled = false;
      }
    });
  }


  /* =====================================================
     CLICK INTERCEPTION
  ===================================================== */

  function handleClick(event) {

    const target = event.target;

    if (!target?.closest) return;


    /* AVATAR GALLERY */

    const avatar = target.closest(
      ".profile-section .profile-card .profile-avatar"
    );

    if (avatar) {

      event.preventDefault();
      event.stopImmediatePropagation();

      openGallery("avatar");

      return;
    }


    /* COVER GALLERY */

    const cover = target.closest(
      ".profile-section .profile-card .ksk-profile-cover"
    );

    if (cover) {

      event.preventDefault();
      event.stopImmediatePropagation();

      openGallery("cover");

      return;
    }


    /* EDIT PROFILE */

    const editButton = target.closest("[data-edit-profile]");

    if (editButton) {

      event.preventDefault();
      event.stopImmediatePropagation();

      openEditor();
    }
  }


  /* =====================================================
     KEYBOARD ACCESSIBILITY
  ===================================================== */

  function handleKeydown(event) {

    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    const target = event.target;

    if (!target?.matches) return;

    if (target.matches(".ksk-profile-cover")) {

      event.preventDefault();

      openGallery("cover");

      return;
    }

    if (
      target.matches(
        ".profile-section .profile-card .profile-avatar"
      )
    ) {

      event.preventDefault();

      openGallery("avatar");
    }
  }


  /* =====================================================
     REFRESH
  ===================================================== */

  function refresh() {
    updateProfileDisplay();
  }


  /* =====================================================
     INITIALIZE
  ===================================================== */

  function initialize() {

    if (initialized) return;

    initialized = true;

    injectStyles();

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    document.addEventListener(
      "keydown",
      handleKeydown,
      true
    );

    global.addEventListener(
      "ksk:navigate",
      updateProfileDisplay
    );

    global.addEventListener(
      "ksk:data-change",
      event => {

        if (event.detail?.collection === "profile") {
          updateProfileDisplay();
        }
      }
    );

    updateProfileDisplay();

    console.info("KSK Profile Media UI initialized.");
  }


  /* =====================================================
     PUBLIC API
  ===================================================== */

  global.KSKProfileMediaUI = Object.freeze({

    initialize,

    refresh,

    openEditor,

    openGallery

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
