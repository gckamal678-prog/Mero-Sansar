"use strict";

/*
 * KSK — POST SHARING
 *
 * RESPONSIBILITY:
 * - Share post text and author
 * - Share original post photo as a file
 * - Use native mobile share sheet
 * - Provide clipboard fallback
 *
 * DEPENDENCIES:
 * KSKData, KSKMedia, KSKLanguage, KSKToast
 */

(function (global) {

  /* =====================================================
     LANGUAGE
  ===================================================== */

  function isEnglish() {
    return (
      global.KSKLanguage?.getLanguage?.() === "en"
    );
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
     POST DATA
  ===================================================== */

  function getPost(id) {

    if (!id) return null;

    return global.KSKData?.getPost?.(id) || null;
  }


  function getShareText(post) {

    const author = String(
      post.author || (
        isEnglish() ? "KSK Member" : "हाम्रो संसार सदस्य"
      )
    ).trim();

    const content = String(
      post.text || ""
    ).trim();

    return [author, content]
      .filter(Boolean)
      .join("\n\n");
  }


  /* =====================================================
     IMAGE FILE
  ===================================================== */

  async function getPostImageFile(post) {

    if (!post?.mediaId) {
      return null;
    }

    const media = global.KSKMedia;

    if (!media?.getImage) {
      throw new Error(
        isEnglish()
          ? "Photo storage is unavailable."
          : "फोटो भण्डारण सुविधा उपलब्ध छैन।"
      );
    }

    const record = await media.getImage(
      post.mediaId
    );

    if (!record?.blob) {
      throw new Error(
        isEnglish()
          ? "Post photo could not be found."
          : "पोस्टको फोटो भेटिएन।"
      );
    }

    const blob = record.blob;

    const mimeType =
      blob.type ||
      record.type ||
      "image/jpeg";

    const extension = mimeType.includes("png")
      ? "png"
      : mimeType.includes("webp")
        ? "webp"
        : mimeType.includes("gif")
          ? "gif"
          : "jpg";

    const safeId = String(post.id || "post")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    const fileName = `ksk-post-${safeId}.${extension}`;

    if (typeof File !== "function") {
      return null;
    }

    return new File(
      [blob],
      fileName,
      {
        type: mimeType,
        lastModified: Date.now()
      }
    );
  }


  /* =====================================================
     CLIPBOARD FALLBACK
  ===================================================== */

  async function copyPostText(text) {

    if (!text) return false;

    if (navigator.clipboard?.writeText) {

      await navigator.clipboard.writeText(text);

      return true;
    }

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    textarea.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } finally {
      textarea.remove();
    }

    return copied;
  }


  /* =====================================================
     SHARE TEXT ONLY
  ===================================================== */

  async function shareText(post, text) {

    const title = String(
      post.author || (
        isEnglish() ? "KSK Post" : "हाम्रो संसार पोस्ट"
      )
    );

    if (typeof navigator.share === "function") {

      await navigator.share({
        title,
        text
      });

      return true;
    }

    const copied = await copyPostText(text);

    if (copied) {

      toast(
        isEnglish()
          ? "Post text copied. You can paste it anywhere."
          : "पोस्टको Text कपी भयो। अब जहाँ चाहनुहुन्छ Paste गर्नुहोस्।",
        "success"
      );

      return true;
    }

    toast(
      isEnglish()
        ? "Sharing is not available in this browser."
        : "यो ब्राउजरमा Share सुविधा उपलब्ध छैन।",
      "warning"
    );

    return false;
  }


  /* =====================================================
     SHARE POST WITH PHOTO
  ===================================================== */

  async function sharePost(id) {

    const post = getPost(id);

    if (!post) {

      toast(
        isEnglish()
          ? "Post could not be found."
          : "पोस्ट भेटिएन।",
        "error"
      );

      return false;
    }

    const text = getShareText(post);

    const title = String(
      post.author || (
        isEnglish() ? "KSK Post" : "हाम्रो संसार पोस्ट"
      )
    );

    const hasPhoto = Boolean(post.mediaId);


    /* -----------------------------------------------
       NO PHOTO
    ----------------------------------------------- */

    if (!hasPhoto) {

      try {
        return await shareText(post, text);
      } catch (error) {

        if (error?.name === "AbortError") {
          return false;
        }

        console.error(
          "KSK text sharing failed:",
          error
        );

        toast(
          isEnglish()
            ? "Could not share this post."
            : "पोस्ट Share गर्न सकिएन।",
          "error"
        );

        return false;
      }
    }


    /* -----------------------------------------------
       PHOTO SHARE
    ----------------------------------------------- */

    try {

      const file = await getPostImageFile(post);

      if (!file) {

        toast(
          isEnglish()
            ? "This browser cannot attach the photo. Sharing text instead."
            : "यो ब्राउजरबाट फोटो जोड्न मिलेन। Text मात्र Share गरिँदैछ।",
          "warning"
        );

        return await shareText(post, text);
      }


      if (typeof navigator.share !== "function") {

        toast(
          isEnglish()
            ? "Photo sharing is not supported here. Post text will be copied."
            : "यहाँ फोटोसहित Share गर्न मिल्दैन। पोस्टको Text कपी गरिँदैछ।",
          "warning"
        );

        return await shareText(post, text);
      }


      const shareData = {
        title,
        text,
        files: [file]
      };


      /* CHECK FILE SHARING SUPPORT */

      if (
        typeof navigator.canShare === "function" &&
        !navigator.canShare({
          files: [file]
        })
      ) {

        toast(
          isEnglish()
            ? "Photo sharing is not supported by this browser. Sharing text instead."
            : "यो ब्राउजरले फोटोसहित Share समर्थन गर्दैन। Text मात्र Share गरिँदैछ।",
          "warning"
        );

        return await shareText(post, text);
      }


      /* OPEN NATIVE SHARE SHEET */

      await navigator.share(shareData);

      return true;

    } catch (error) {

      /* USER CANCELLED */

      if (error?.name === "AbortError") {
        return false;
      }

      console.error(
        "KSK photo sharing failed:",
        error
      );


      /* FALLBACK TO TEXT */

      try {

        toast(
          isEnglish()
            ? "Photo attachment failed. Trying text sharing instead."
            : "फोटो जोड्न सकिएन। Text Share गर्ने प्रयास गरिँदैछ।",
          "warning"
        );

        return await shareText(post, text);

      } catch (fallbackError) {

        if (fallbackError?.name === "AbortError") {
          return false;
        }

        console.error(
          "KSK share fallback failed:",
          fallbackError
        );

        toast(
          isEnglish()
            ? "Could not share this post."
            : "पोस्ट Share गर्न सकिएन।",
          "error"
        );

        return false;
      }
    }
  }


  /* =====================================================
     PUBLIC API
  ===================================================== */

  global.KSKShare = Object.freeze({

    sharePost

  });


  console.info(
    "KSK Share initialized."
  );

})(window);
