
"use strict";

/*
 * =========================================================
 * KSK — POST SHARE MODULE
 *
 * FILE: core/share.js
 *
 * RESPONSIBILITY:
 * - Share post text and author
 * - Share application URL with every post
 * - Share original post photo when supported
 * - Open native mobile share sheet
 * - Copy complete share message as fallback
 *
 * DEPENDENCIES:
 * - KSKData
 * - KSKMedia
 * - KSKLanguage
 * - KSKToast
 *
 * IMPORTANT:
 * app.js only calls KSKShare.sharePost().
 * All sharing logic belongs to this file.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKShare) return;

  /* =====================================================
     LANGUAGE
  ===================================================== */

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function message(nepali, english) {
    return isEnglish() ? english : nepali;
  }

  /* =====================================================
     TOAST
  ===================================================== */

  function toast(text, type = "info") {
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](text);
      return;
    }

    if (typeof api?.show === "function") {
      api.show(text, type);
      return;
    }

    console.warn("KSKShare:", text);
  }

  /* =====================================================
     POST DATA
  ===================================================== */

  function getPost(id) {
    if (!id) return null;

    return global.KSKData?.getPost?.(id) || null;
  }

  function getPostText(post) {
    const author = String(
      post.author ||
      message("हाम्रो संसार सदस्य", "Hamro Sansar Member")
    ).trim();

    const content = String(post.text || "").trim();

    return [author, content]
      .filter(Boolean)
      .join("\n\n");
  }

  /* =====================================================
     APPLICATION SHARE URL
  ===================================================== */

  function getApplicationUrl() {
    try {
      if (!global.location?.href || !global.URL) {
        return "";
      }

      /*
       * Current page, query and hash हटाएर
       * एपको मुख्य URL तयार गर्ने।
       *
       * उदाहरण:
       * https://example.com/Mero-Sansar/
       */

      const appUrl = new global.URL(
        "./",
        global.location.href
      );

      if (
        appUrl.protocol !== "https:" &&
        appUrl.protocol !== "http:"
      ) {
        return "";
      }

      return appUrl.href;

    } catch (error) {
      console.error(
        "KSKShare: Application URL failed:",
        error
      );

      return "";
    }
  }

  /* =====================================================
     SHARE MESSAGE
  ===================================================== */

  function getShareTitle(post) {
    return String(
      post.author ||
      message("हाम्रो संसार पोस्ट", "Hamro Sansar Post")
    ).trim();
  }

  function getCompleteShareMessage(text, url) {
    const parts = [text];

    if (url) {
      parts.push(
        message(
          "हाम्रो संसार खोल्नुहोस्:",
          "Open Hamro Sansar:"
        ) + "\n" + url
      );
    }

    return parts
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

    if (typeof media?.getImage !== "function") {
      throw new Error("Photo storage is unavailable.");
    }

    const record = await media.getImage(post.mediaId);

    if (!record?.blob) {
      throw new Error("Post photo could not be found.");
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

    const fileName = `hamro-sansar-post-${safeId}.${extension}`;

    if (typeof global.File !== "function") {
      return null;
    }

    return new global.File(
      [blob],
      fileName,
      {
        type: mimeType,
        lastModified: Date.now()
      }
    );
  }

  /* =====================================================
     CLIPBOARD
  ===================================================== */

  async function copyText(text) {
    if (!text) return false;

    /*
     * Modern Clipboard API
     */

    if (
      global.navigator?.clipboard?.writeText &&
      global.isSecureContext
    ) {
      try {
        await global.navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn(
          "KSKShare: Modern clipboard failed:",
          error
        );
      }
    }

    /*
     * Older browser fallback
     */

    let textarea = null;

    try {
      textarea = document.createElement("textarea");

      textarea.value = text;
      textarea.setAttribute("readonly", "");

      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      return Boolean(
        document.execCommand("copy")
      );

    } catch (error) {
      console.error(
        "KSKShare: Clipboard fallback failed:",
        error
      );

      return false;

    } finally {
      textarea?.remove();
    }
  }

  /* =====================================================
     COPY FALLBACK
  ===================================================== */

  async function copyShareMessage(text, url) {
    const completeMessage = getCompleteShareMessage(
      text,
      url
    );

    const copied = await copyText(completeMessage);

    if (copied) {
      toast(
        message(
          "पोस्टको Text र Link Copy भयो। अब जहाँ चाहनुहुन्छ Paste गरेर पठाउनुहोस्।",
          "Post text and link copied. Paste them wherever you want to share."
        ),
        "success"
      );

      return true;
    }

    toast(
      message(
        "पोस्ट Copy गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।",
        "Could not copy the post. Please try again."
      ),
      "error"
    );

    return false;
  }

  /* =====================================================
     NATIVE TEXT SHARE
  ===================================================== */

  async function shareText(post, text, url) {
    const title = getShareTitle(post);

    if (typeof global.navigator?.share === "function") {
      await global.navigator.share({
        title,
        text,
        ...(url ? { url } : {})
      });

      return true;
    }

    return copyShareMessage(text, url);
  }

  /* =====================================================
     SHARE POST
  ===================================================== */

  async function sharePost(id) {
    const post = getPost(id);

    if (!post) {
      toast(
        message(
          "पोस्ट भेटिएन।",
          "Post could not be found."
        ),
        "error"
      );

      return false;
    }

    const text = getPostText(post);
    const title = getShareTitle(post);
    const url = getApplicationUrl();

    /*
     * Link नभए पनि Text Share रोकिँदैन।
     */

    const hasPhoto = Boolean(post.mediaId);

    /* -----------------------------------------------
       TEXT-ONLY POST
    ----------------------------------------------- */

    if (!hasPhoto) {
      try {
        return await shareText(post, text, url);

      } catch (error) {
        if (error?.name === "AbortError") {
          return false;
        }

        console.error(
          "KSKShare: Text sharing failed:",
          error
        );

        toast(
          message(
            "पोस्ट Share गर्न सकिएन।",
            "Could not share this post."
          ),
          "error"
        );

        return false;
      }
    }

    /* -----------------------------------------------
       PHOTO POST
    ----------------------------------------------- */

    try {
      const file = await getPostImageFile(post);

      /*
       * फोटो File बनाउन नसके Text + Link पठाउने।
       */

      if (!file) {
        toast(
          message(
            "फोटो जोड्न मिलेन। Text र Link Share गरिँदैछ।",
            "Photo attachment is unavailable. Sharing text and link instead."
          ),
          "warning"
        );

        return await shareText(post, text, url);
      }

      /*
       * Native Share उपलब्ध नभए फोटो पठाउन सकिँदैन।
       */

      if (typeof global.navigator?.share !== "function") {
        toast(
          message(
            "यो ब्राउजरमा फोटो Share गर्न मिल्दैन। Text र Link Copy गरिँदैछ।",
            "Photo sharing is not supported here. Copying text and link instead."
          ),
          "warning"
        );

        return await copyShareMessage(text, url);
      }

      /*
       * Check file sharing support.
       */

      if (
        typeof global.navigator.canShare === "function" &&
        !global.navigator.canShare({
          files: [file]
        })
      ) {
        toast(
          message(
            "यो ब्राउजरले फोटो Share समर्थन गर्दैन। Text र Link पठाइँदैछ।",
            "This browser does not support photo sharing. Sharing text and link instead."
          ),
          "warning"
        );

        return await shareText(post, text, url);
      }

      /*
       * Photo + Text + Application URL
       */

      const shareData = {
        title,
        text,
        files: [file],
        ...(url ? { url } : {})
      };

      await global.navigator.share(shareData);

      return true;

    } catch (error) {
      /*
       * User cancelled the share sheet.
       */

      if (error?.name === "AbortError") {
        return false;
      }

      console.error(
        "KSKShare: Photo sharing failed:",
        error
      );

      /*
       * Photo sharing failed.
       * Try Text + Link instead.
       */

      try {
        toast(
          message(
            "फोटो Share गर्न सकिएन। Text र Link पठाउने प्रयास गरिँदैछ।",
            "Photo sharing failed. Trying text and link sharing instead."
          ),
          "warning"
        );

        return await shareText(post, text, url);

      } catch (fallbackError) {
        if (fallbackError?.name === "AbortError") {
          return false;
        }

        console.error(
          "KSKShare: Final sharing fallback failed:",
          fallbackError
        );

        /*
         * Last fallback: Clipboard
         */

        return await copyShareMessage(text, url);
      }
    }
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  global.KSKShare = Object.freeze({
    sharePost
  });

  console.info("KSK Share initialized.");

})(window);
