
"use strict";

/*
 * =========================================================
 * MERO SANSAR — LIVE SUPABASE POST SHARE
 *
 * FILE: core/share.js
 *
 * RESPONSIBILITY:
 * - Fetch the requested post directly from Supabase.
 * - Fetch private post media using signed Storage URLs.
 * - Share text, application URL and photo when supported.
 * - Copy text and URL when native sharing is unavailable.
 *
 * DEPENDENCIES:
 * - core/supabase-auth.js
 * - core/supabase-posts.js
 * - KSKLanguage
 * - KSKToast
 *
 * DATA:
 * - public.posts
 * - posts-media (private Storage bucket)
 *
 * IMPORTANT:
 * - No KSKData post lookup.
 * - No KSKMedia local image lookup.
 * - No Local Storage fallback.
 * =========================================================
 */

(function (global) {
  "use strict";

  if (global.KSKShare) return;

  const POSTS_TABLE = "posts";

  /* =====================================================
     LANGUAGE
  ===================================================== */

  function isEnglish() {
    return (
      global.KSKLanguage?.getLanguage?.() === "en"
    );
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
     SUPABASE CONTEXT
  ===================================================== */

  async function getContext() {
    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      throw new Error(
        "Supabase Authentication उपलब्ध छैन।"
      );
    }

    const initialized = await auth.initialize();

    if (!initialized || !auth.isAuthenticated()) {
      throw new Error(
        "पहिले आफ्नो खातामा लगइन गर्नुहोस्।"
      );
    }

    const client = auth.getClient();
    const user = auth.getUser();

    if (!client || !user?.id) {
      throw new Error(
        "लगइन गरिएको प्रयोगकर्ता भेटिएन।"
      );
    }

    return {
      client,
      user
    };
  }

  /* =====================================================
     LIVE POST FETCH
  ===================================================== */

  async function getPost(postId) {
    const id = String(postId || "").trim();

    if (!id) {
      throw new Error(
        "पोस्ट ID उपलब्ध छैन।"
      );
    }

    const { client } = await getContext();

    const { data, error } = await client
      .from(POSTS_TABLE)
      .select([
        "id",
        "user_id",
        "content",
        "media_path",
        "media_mime_type",
        "author_name",
        "author_avatar_url",
        "created_at"
      ].join(","))
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "पोस्ट भेटिएन वा हेर्ने अनुमति छैन।"
      );
    }

    return {
      id: data.id,
      authorId: data.user_id || "",
      author: data.author_name || "सदस्य",
      text: data.content || "",
      mediaPath: data.media_path || "",
      mediaType: data.media_mime_type || "",
      authorAvatar: data.author_avatar_url || "",
      createdAt: data.created_at || ""
    };
  }

  /* =====================================================
     APPLICATION URL
  ===================================================== */

  function getApplicationUrl() {
    try {
      if (
        !global.location?.href ||
        typeof global.URL !== "function"
      ) {
        return "";
      }

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
     SHARE TEXT
  ===================================================== */

  function getShareTitle(post) {
    return String(
      post?.author ||
      message(
        "हाम्रो संसार पोस्ट",
        "Hamro Sansar Post"
      )
    ).trim();
  }

  function getPostText(post) {
    const author = String(
      post?.author ||
      message(
        "हाम्रो संसार सदस्य",
        "Hamro Sansar Member"
      )
    ).trim();

    const content = String(
      post?.text || ""
    ).trim();

    return [
      author,
      content
    ].filter(Boolean).join("\n\n");
  }

  function getCompleteShareMessage(text, url) {
    const parts = [];

    if (text) {
      parts.push(text);
    }

    if (url) {
      parts.push(
        message(
          "हाम्रो संसार खोल्नुहोस्:",
          "Open Hamro Sansar:"
        ) + "\n" + url
      );
    }

    return parts.join("\n\n");
  }

  /* =====================================================
     SIGNED MEDIA URL
  ===================================================== */

  async function getPostMediaUrl(post) {
    if (!post?.mediaPath) {
      return "";
    }

    const postsApi = global.KSKSupabasePosts;

    if (
      typeof postsApi?.getSignedMediaUrl !== "function"
    ) {
      throw new Error(
        "Supabase Media सेवा उपलब्ध छैन।"
      );
    }

    const url = await postsApi.getSignedMediaUrl(
      post.mediaPath
    );

    if (!url) {
      throw new Error(
        "पोस्टको फोटो URL प्राप्त भएन।"
      );
    }

    return url;
  }

  /* =====================================================
     SIGNED URL TO FILE
  ===================================================== */

  async function getPostImageFile(post) {
    if (!post?.mediaPath) {
      return null;
    }

    if (typeof global.fetch !== "function") {
      throw new Error(
        "यो ब्राउजरमा फोटो प्राप्त गर्न सकिएन।"
      );
    }

    const mediaUrl = await getPostMediaUrl(post);

    const response = await global.fetch(mediaUrl);

    if (!response.ok) {
      throw new Error(
        "पोस्टको फोटो डाउनलोड गर्न सकिएन।"
      );
    }

    const blob = await response.blob();

    if (!blob || !blob.size) {
      throw new Error(
        "पोस्टको फोटो खाली छ।"
      );
    }

    const mimeType = String(
      blob.type ||
      post.mediaType ||
      "image/jpeg"
    ).toLowerCase();

    const extension = mimeType.includes("png")
      ? "png"
      : mimeType.includes("webp")
        ? "webp"
        : mimeType.includes("gif")
          ? "gif"
          : "jpg";

    const safeId = String(
      post.id || "post"
    ).replace(/[^a-zA-Z0-9_-]/g, "");

    const fileName =
      `mero-sansar-post-${safeId}.${extension}`;

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
    if (!text) {
      return false;
    }

    if (
      global.navigator?.clipboard?.writeText &&
      global.isSecureContext
    ) {
      try {
        await global.navigator.clipboard.writeText(text);
        return true;

      } catch (error) {
        console.warn(
          "KSKShare: Clipboard API failed:",
          error
        );
      }
    }

    let textarea = null;

    try {
      textarea = global.document.createElement(
        "textarea"
      );

      textarea.value = text;
      textarea.setAttribute("readonly", "");

      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";

      global.document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      return Boolean(
        global.document.execCommand("copy")
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
     COPY SHARE MESSAGE
  ===================================================== */

  async function copyShareMessage(text, url) {
    const completeMessage =
      getCompleteShareMessage(text, url);

    const copied = await copyText(
      completeMessage
    );

    if (copied) {
      toast(
        message(
          "पोस्टको Text र Link Copy भयो।",
          "Post text and link copied."
        ),
        "success"
      );

      return true;
    }

    toast(
      message(
        "पोस्ट Copy गर्न सकिएन। फेरि प्रयास गर्नुहोस्।",
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
    const navigator = global.navigator;

    if (
      typeof navigator?.share === "function"
    ) {
      await navigator.share({
        title: getShareTitle(post),
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

  async function sharePost(postId) {
    let post = null;

    try {
      /*
       * पोस्ट सधैँ Supabase बाट प्राप्त गर्ने।
       */
      post = await getPost(postId);

    } catch (error) {
      console.error(
        "KSKShare: Post loading failed:",
        error
      );

      toast(
        error?.message ||
        message(
          "पोस्ट लोड गर्न सकिएन।",
          "Could not load the post."
        ),
        "error"
      );

      return false;
    }

    const text = getPostText(post);
    const title = getShareTitle(post);
    const url = getApplicationUrl();

    const hasPhoto = Boolean(post.mediaPath);

    /*
     * TEXT-ONLY POST
     */

    if (!hasPhoto) {
      try {
        return await shareText(
          post,
          text,
          url
        );

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

    /*
     * PHOTO POST
     */

    try {
      const file = await getPostImageFile(post);

      /*
       * File API उपलब्ध नभए Text Share।
       */

      if (!file) {
        toast(
          message(
            "फोटो जोड्न मिलेन। Text र Link Share गरिँदैछ।",
            "Photo attachment unavailable. Sharing text and link."
          ),
          "warning"
        );

        return await shareText(
          post,
          text,
          url
        );
      }

      const navigator = global.navigator;

      /*
       * Native Share उपलब्ध छैन।
       */

      if (
        typeof navigator?.share !== "function"
      ) {
        toast(
          message(
            "यो ब्राउजरमा फोटो Share गर्न मिल्दैन। Text Copy गरिँदैछ।",
            "Photo sharing is not supported. Copying text instead."
          ),
          "warning"
        );

        return await copyShareMessage(
          text,
          url
        );
      }

      /*
       * Browser ले File Share समर्थन गर्छ कि जाँच।
       */

      if (
        typeof navigator.canShare === "function" &&
        !navigator.canShare({
          files: [file]
        })
      ) {
        toast(
          message(
            "यो ब्राउजरले फोटो Share समर्थन गर्दैन। Text र Link पठाइँदैछ।",
            "This browser does not support photo sharing."
          ),
          "warning"
        );

        return await shareText(
          post,
          text,
          url
        );
      }

      /*
       * PHOTO + TEXT + APPLICATION URL
       */

      const shareData = {
        title,
        text,
        files: [file],
        ...(url ? { url } : {})
      };

      await navigator.share(shareData);

      return true;

    } catch (error) {
      /*
       * प्रयोगकर्ताले Share बन्द गरेको अवस्थामा
       * कुनै error toast नदेखाउने।
       */

      if (error?.name === "AbortError") {
        return false;
      }

      console.error(
        "KSKShare: Photo sharing failed:",
        error
      );

      /*
       * फोटो Share असफल भए Text + Link प्रयास।
       */

      try {
        toast(
          message(
            "फोटो Share हुन सकेन। Text र Link पठाउने प्रयास गरिँदैछ।",
            "Photo sharing failed. Trying text and link instead."
          ),
          "warning"
        );

        return await shareText(
          post,
          text,
          url
        );

      } catch (fallbackError) {
        if (fallbackError?.name === "AbortError") {
          return false;
        }

        console.error(
          "KSKShare: Text fallback failed:",
          fallbackError
        );

        return await copyShareMessage(
          text,
          url
        );
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
    "KSK Supabase Share initialized."
  );

})(window);
