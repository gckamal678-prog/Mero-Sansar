
"use strict";

/*
 * MERO SANSAR — LIVE SUPABASE POST SHARE
 *
 * - Live post fetch from Supabase
 * - Share text, photo and exact post link
 * - Record successful shares in public.post_shares
 * - No Local Storage fallback
 */

(function (global) {
  "use strict";

  if (global.KSKShare) return;

  const POSTS_TABLE = "posts";
  const SHARES_TABLE = "post_shares";

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function message(nepali, english) {
    return isEnglish() ? english : nepali;
  }

  function toast(text, type = "info") {
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](text);
    } else if (typeof api?.show === "function") {
      api.show(text, type);
    } else {
      console.warn("KSKShare:", text);
    }
  }

  async function getContext() {
    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      throw new Error("Supabase Authentication उपलब्ध छैन।");
    }

    const initialized = await auth.initialize();

    if (!initialized || !auth.isAuthenticated()) {
      throw new Error("पहिले आफ्नो खातामा लगइन गर्नुहोस्।");
    }

    const client = auth.getClient();
    const user = auth.getUser();

    if (!client || !user?.id) {
      throw new Error("लगइन गरिएको प्रयोगकर्ता भेटिएन।");
    }

    return { client, user };
  }

  /* LOAD POST DIRECTLY FROM SUPABASE */

  async function getPost(postId) {
    const id = String(postId || "").trim();

    if (!id) {
      throw new Error("पोस्ट ID उपलब्ध छैन।");
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
        "created_at"
      ].join(","))
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("पोस्ट भेटिएन वा हेर्ने अनुमति छैन।");
    }

    return {
      id: data.id,
      authorId: data.user_id || "",
      author: data.author_name || "सदस्य",
      text: data.content || "",
      mediaPath: data.media_path || "",
      mediaType: data.media_mime_type || "",
      createdAt: data.created_at || ""
    };
  }

  /* EXACT POST DEEP LINK */

  function getPostUrl(postId) {
    try {
      if (
        !global.location?.href ||
        typeof global.URL !== "function"
      ) {
        return "";
      }

      const url = new global.URL(
        "./",
        global.location.href
      );

      if (
        url.protocol !== "https:" &&
        url.protocol !== "http:"
      ) {
        return "";
      }

      url.hash = "post=" + encodeURIComponent(
        String(postId || "")
      );

      return url.href;

    } catch (error) {
      console.error("KSKShare: Post URL failed:", error);
      return "";
    }
  }

  function getShareTitle(post) {
    return String(
      post?.author ||
      message("हाम्रो संसार पोस्ट", "Hamro Sansar Post")
    ).trim();
  }

  function getPostText(post) {
    const author = String(
      post?.author || message("सदस्य", "Member")
    ).trim();

    const content = String(post?.text || "").trim();

    return [author, content].filter(Boolean).join("\n\n");
  }

  function getCompleteShareMessage(text, url) {
    const parts = [];

    if (text) parts.push(text);

    if (url) {
      parts.push(
        message(
          "यो पोस्ट खोल्नुहोस्:",
          "Open this post:"
        ) + "\n" + url
      );
    }

    return parts.join("\n\n");
  }

  /* PRIVATE POST PHOTO URL */

  async function getPostMediaUrl(post) {
    if (!post?.mediaPath) return "";

    const postsApi = global.KSKSupabasePosts;

    if (typeof postsApi?.getSignedMediaUrl !== "function") {
      throw new Error("Supabase Media सेवा उपलब्ध छैन।");
    }

    const url = await postsApi.getSignedMediaUrl(
      post.mediaPath
    );

    if (!url) {
      throw new Error("पोस्टको फोटो URL प्राप्त भएन।");
    }

    return url;
  }

  /* CONVERT PHOTO TO FILE */

  async function getPostImageFile(post) {
    if (!post?.mediaPath) return null;

    if (
      typeof global.fetch !== "function" ||
      typeof global.File !== "function"
    ) {
      return null;
    }

    const mediaUrl = await getPostMediaUrl(post);
    const response = await global.fetch(mediaUrl);

    if (!response.ok) {
      throw new Error("पोस्टको फोटो डाउनलोड गर्न सकिएन।");
    }

    const blob = await response.blob();

    if (!blob?.size) {
      throw new Error("पोस्टको फोटो खाली छ।");
    }

    const mimeType = String(
      blob.type || post.mediaType || "image/jpeg"
    ).toLowerCase();

    const extension = mimeType.includes("png")
      ? "png"
      : mimeType.includes("webp")
        ? "webp"
        : mimeType.includes("gif")
          ? "gif"
          : "jpg";

    const safeId = String(post.id || "post")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    return new global.File(
      [blob],
      `mero-sansar-post-${safeId}.${extension}`,
      {
        type: mimeType,
        lastModified: Date.now()
      }
    );
  }

  /* COPY TEXT */

  async function copyText(text) {
    if (!text) return false;

    if (
      global.navigator?.clipboard?.writeText &&
      global.isSecureContext
    ) {
      try {
        await global.navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn("Clipboard API failed:", error);
      }
    }

    let textarea = null;

    try {
      textarea = global.document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");

      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";

      global.document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      return Boolean(
        global.document.execCommand("copy")
      );

    } catch (error) {
      console.error("Clipboard fallback failed:", error);
      return false;

    } finally {
      textarea?.remove();
    }
  }

  async function copyShareMessage(text, url) {
    const copied = await copyText(
      getCompleteShareMessage(text, url)
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
        "पोस्ट Copy गर्न सकिएन।",
        "Could not copy the post."
      ),
      "error"
    );

    return false;
  }

  /* NATIVE TEXT SHARE */

  async function shareText(post, text, url) {
    const nav = global.navigator;

    if (typeof nav?.share === "function") {
      await nav.share({
        title: getShareTitle(post),
        text,
        ...(url ? { url } : {})
      });

      return true;
    }

    return copyShareMessage(text, url);
  }

  /* RECORD SUCCESSFUL SHARE IN SUPABASE */

  async function recordShare(postId) {
    const id = String(postId || "").trim();

    if (!id) {
      throw new Error("Share Post ID उपलब्ध छैन।");
    }

    const { client, user } = await getContext();

    const { error: insertError } = await client
      .from(SHARES_TABLE)
      .insert({
        post_id: id,
        user_id: user.id
      });

    if (insertError) throw insertError;

    let shareCount = null;

    const { count, error: countError } = await client
      .from(SHARES_TABLE)
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("post_id", id);

    if (!countError && Number.isFinite(count)) {
      shareCount = count;
    }

    global.dispatchEvent(
      new CustomEvent("ksk:post-share-change", {
        detail: {
          postId: id,
          shareCount
        }
      })
    );

    return shareCount;
  }

  /* COMPLETE SUCCESS HANDLER */

  async function finishShare(post, success) {
    if (!success) return false;

    try {
      await recordShare(post.id);

      toast(
        message(
          "पोस्ट सफलतापूर्वक Share भयो।",
          "Post shared successfully."
        ),
        "success"
      );

    } catch (error) {
      console.error(
        "KSKShare: Share record failed:",
        error
      );

      toast(
        message(
          "Share भयो, तर Share संख्या सुरक्षित गर्न सकिएन।",
          "Shared, but the share count could not be saved."
        ),
        "warning"
      );
    }

    // Share सफल भएको छ भने record failure ले
    // Share success लाई असफल बनाउँदैन।
    return true;
  }

  /* SHARE POST */

  async function sharePost(postId) {
    let post;

    try {
      post = await getPost(postId);

    } catch (error) {
      console.error("KSKShare: Post loading failed:", error);

      toast(
        error?.message ||
        message("पोस्ट लोड गर्न सकिएन।", "Could not load post."),
        "error"
      );

      return false;
    }

    const text = getPostText(post);
    const url = getPostUrl(post.id);
    const hasPhoto = Boolean(post.mediaPath);

    /* TEXT-ONLY POST */

    if (!hasPhoto) {
      try {
        const success = await shareText(post, text, url);
        return await finishShare(post, success);

      } catch (error) {
        if (error?.name === "AbortError") return false;

        console.error("KSKShare: Text sharing failed:", error);

        toast(
          message("पोस्ट Share गर्न सकिएन।", "Could not share post."),
          "error"
        );

        return false;
      }
    }

    /* PHOTO POST */

    try {
      const file = await getPostImageFile(post);
      const nav = global.navigator;

      if (
        !file ||
        typeof nav?.share !== "function"
      ) {
        toast(
          message(
            "फोटो जोड्न मिलेन। Text र Link Share गरिँदैछ।",
            "Photo attachment unavailable. Sharing text and link."
          ),
          "warning"
        );

        const success = await shareText(post, text, url);
        return await finishShare(post, success);
      }

      if (
        typeof nav.canShare === "function" &&
        !nav.canShare({ files: [file] })
      ) {
        toast(
          message(
            "यो ब्राउजरले फोटो Share समर्थन गर्दैन।",
            "This browser does not support photo sharing."
          ),
          "warning"
        );

        const success = await shareText(post, text, url);
        return await finishShare(post, success);
      }

      await nav.share({
        title: getShareTitle(post),
        text,
        files: [file],
        ...(url ? { url } : {})
      });

      return await finishShare(post, true);

    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }

      console.error("KSKShare: Photo sharing failed:", error);

      /* PHOTO FAILED: TRY TEXT + LINK */

      try {
        toast(
          message(
            "फोटो Share हुन सकेन। Text र Link प्रयास गरिँदैछ।",
            "Photo sharing failed. Trying text and link."
          ),
          "warning"
        );

        const success = await shareText(post, text, url);
        return await finishShare(post, success);

      } catch (fallbackError) {
        if (fallbackError?.name === "AbortError") {
          return false;
        }

        console.error(
          "KSKShare: Text fallback failed:",
          fallbackError
        );

        const copied = await copyShareMessage(text, url);
        return await finishShare(post, copied);
      }
    }
  }

  /* PUBLIC API */

  global.KSKShare = Object.freeze({
    sharePost
  });

  console.info("KSK Supabase Share initialized.");

})(window);
