
"use strict";

/*
 * MERO SANSAR — SUPABASE POSTS ADAPTER
 *
 * Responsibilities:
 * - Load the authenticated user's feed.
 * - Load the authenticated user's own posts.
 * - Create, update and delete posts.
 * - Upload post images to private Supabase Storage.
 * - Generate signed URLs for private post images.
 *
 * Dependencies:
 * - core/supabase-auth.js
 * - core/supabase-profile.js
 *
 * Supabase:
 * - public.posts
 * - posts-media (private storage bucket)
 */

(function (global) {
  "use strict";

  if (global.KSKSupabasePosts) return;

  const TABLE = "posts";
  const BUCKET = "posts-media";

  const MAX_CONTENT_LENGTH = 10000;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const SIGNED_URL_SECONDS = 3600;

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  const SIGNED_URL_CACHE = new Map();

  function getAuth() {
    return global.KSKSupabaseAuth || null;
  }

  function makeResult(ok, code, data = null, message = "") {
    return {
      ok,
      code,
      data,
      message
    };
  }

  function getErrorMessage(error) {
    return String(
      error?.message ||
      error?.details ||
      error?.hint ||
      "पोस्टसम्बन्धी काम पूरा गर्न सकिएन।"
    );
  }

  async function getContext() {
    const auth = getAuth();

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

  function cleanContent(value) {
    const content = String(value ?? "").trim();

    if (content.length > MAX_CONTENT_LENGTH) {
      throw new Error(
        `पोस्ट बढीमा ${MAX_CONTENT_LENGTH} अक्षरको हुनुपर्छ।`
      );
    }

    return content;
  }

  function getFileExtension(file) {
    const type = String(file?.type || "").toLowerCase();

    const extensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };

    return extensions[type] || "";
  }

  function validateMedia(file) {
    if (!file) return true;

    if (!(file instanceof Blob)) {
      throw new Error(
        "फोटो फाइल सही छैन।"
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        "JPEG, PNG, WebP वा GIF फोटो मात्र प्रयोग गर्न सकिन्छ।"
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "फोटोको आकार 10 MB भन्दा बढी हुनुहुँदैन।"
      );
    }

    if (file.size <= 0) {
      throw new Error(
        "फोटो खाली छ।"
      );
    }

    return true;
  }

  async function getAuthorProfile() {
    const profileAPI = global.KSKSupabaseProfile;

    if (!profileAPI?.getMyProfile) {
      throw new Error(
        "Supabase Profile सेवा उपलब्ध छैन।"
      );
    }

    const profile = await profileAPI.getMyProfile();

    if (!profile) {
      throw new Error(
        "आफ्नो प्रोफाइल प्राप्त गर्न सकिएन।"
      );
    }

    const name = String(profile.name || "").trim();

    if (!name) {
      throw new Error(
        "पोस्ट गर्नुअघि आफ्नो प्रोफाइलमा नाम राख्नुहोस्।"
      );
    }

    return {
      name: name.slice(0, 120),
      avatar: String(profile.avatar || "").trim()
    };
  }

  async function uploadMedia(client, userId, file, postId) {
    if (!file) return null;

    validateMedia(file);

    const extension = getFileExtension(file);

    const randomId =
      global.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const path =
      `${userId}/${postId}/${randomId}.${extension}`;

    const { data, error } = await client
      .storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    return {
      path: data?.path || path,
      mimeType: file.type
    };
  }

  async function getSignedMediaUrl(path, clientOverride = null) {
    const mediaPath = String(path || "").trim();

    if (!mediaPath) return "";

    const cached = SIGNED_URL_CACHE.get(mediaPath);

    if (
      cached &&
      cached.expiresAt > Date.now() + 30000
    ) {
      return cached.url;
    }

    const client = clientOverride ||
      (await getContext()).client;

    const { data, error } = await client
      .storage
      .from(BUCKET)
      .createSignedUrl(
        mediaPath,
        SIGNED_URL_SECONDS
      );

    if (error) throw error;

    const url = data?.signedUrl || "";

    if (url) {
      SIGNED_URL_CACHE.set(mediaPath, {
        url,
        expiresAt:
          Date.now() + SIGNED_URL_SECONDS * 1000
      });
    }

    return url;
  }

  async function normalizePost(row, client) {
    if (!row) return null;

    let mediaUrl = "";

    if (row.media_path) {
      try {
        mediaUrl = await getSignedMediaUrl(
          row.media_path,
          client
        );
      } catch (error) {
        console.warn(
          "Post media URL could not be created:",
          error
        );
      }
    }

    return {
      id: row.id,

      author: row.author_name || "सदस्य",
      authorId: row.user_id || "",
      authorAvatar: row.author_avatar_url || "",
      authorInitial:
        String(row.author_name || "स").charAt(0),

      text: row.content || "",

      mediaPath: row.media_path || "",
      mediaType: row.media_mime_type || "",
      mediaUrl,

      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",

      likes: 0,
      liked: false,
      comments: [],
      reactionCounts: {}
    };
  }

  async function initialize() {
    try {
      await getContext();
      return true;
    } catch (error) {
      console.error(
        "Supabase Posts initialization failed:",
        error
      );

      return false;
    }
  }

  async function getFeed(options = {}) {
    try {
      const { client } = await getContext();

      const requestedLimit = Number(options.limit || 50);

      const limit = Math.min(
        100,
        Math.max(1, requestedLimit)
      );

      let query = client
        .from(TABLE)
        .select([
          "id",
          "user_id",
          "content",
          "media_path",
          "media_mime_type",
          "author_name",
          "author_avatar_url",
          "created_at",
          "updated_at"
        ].join(","))
        .order("created_at", {
          ascending: false
        })
        .limit(limit);

      if (options.before) {
        query = query.lt(
          "created_at",
          options.before
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const posts = await Promise.all(
        (data || []).map(row =>
          normalizePost(row, client)
        )
      );

      return makeResult(
        true,
        "FEED_LOADED",
        posts
      );

    } catch (error) {
      console.error(
        "Supabase Feed Load Failed:",
        error
      );

      return makeResult(
        false,
        "FEED_LOAD_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  async function getMyPosts(options = {}) {
    try {
      const { client, user } = await getContext();

      const limit = Math.min(
        100,
        Math.max(1, Number(options.limit || 50))
      );

      const { data, error } = await client
        .from(TABLE)
        .select([
          "id",
          "user_id",
          "content",
          "media_path",
          "media_mime_type",
          "author_name",
          "author_avatar_url",
          "created_at",
          "updated_at"
        ].join(","))
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        })
        .limit(limit);

      if (error) throw error;

      const posts = await Promise.all(
        (data || []).map(row =>
          normalizePost(row, client)
        )
      );

      return makeResult(
        true,
        "MY_POSTS_LOADED",
        posts
      );

    } catch (error) {
      console.error(
        "My Posts Load Failed:",
        error
      );

      return makeResult(
        false,
        "MY_POSTS_LOAD_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  async function createPost(input = {}) {
    let uploadedPath = "";

    try {
      const { client, user } = await getContext();

      const content = cleanContent(input.text);

      const file = input.media || null;

      validateMedia(file);

      if (!content && !file) {
        throw new Error(
          "केही लेख्नुहोस् वा फोटो थप्नुहोस्।"
        );
      }

      const profile = await getAuthorProfile();

      const postId =
        global.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let media = null;

      if (file) {
        media = await uploadMedia(
          client,
          user.id,
          file,
          postId
        );

        uploadedPath = media.path;
      }

      const payload = {
        id: postId,
        user_id: user.id,
        content,
        media_path: media?.path || null,
        media_mime_type: media?.mimeType || null,
        author_name: profile.name,
        author_avatar_url: profile.avatar || null
      };

      const { data, error } = await client
        .from(TABLE)
        .insert(payload)
        .select([
          "id",
          "user_id",
          "content",
          "media_path",
          "media_mime_type",
          "author_name",
          "author_avatar_url",
          "created_at",
          "updated_at"
        ].join(","))
        .single();

      if (error) throw error;

      const post = await normalizePost(data, client);

      global.dispatchEvent(
        new CustomEvent("ksk:posts-cloud-change", {
          detail: {
            action: "create",
            post
          }
        })
      );

      return makeResult(
        true,
        "POST_CREATED",
        post,
        "पोस्ट सफलतापूर्वक प्रकाशित भयो।"
      );

    } catch (error) {
      if (uploadedPath) {
        try {
          const auth = getAuth();
          const client = auth?.getClient?.();

          await client
            ?.storage
            ?.from(BUCKET)
            .remove([uploadedPath]);

          SIGNED_URL_CACHE.delete(uploadedPath);
        } catch (cleanupError) {
          console.warn(
            "Failed upload cleanup:",
            cleanupError
          );
        }
      }

      console.error(
        "Post Creation Failed:",
        error
      );

      return makeResult(
        false,
        "POST_CREATE_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  async function updatePost(postId, changes = {}) {
    try {
      const { client, user } = await getContext();

      const id = String(postId || "").trim();

      if (!id) {
        throw new Error(
          "पोस्ट ID उपलब्ध छैन।"
        );
      }

      const payload = {};

      if (
        Object.prototype.hasOwnProperty.call(
          changes,
          "text"
        )
      ) {
        payload.content = cleanContent(
          changes.text
        );
      }

      if (!Object.keys(payload).length) {
        throw new Error(
          "अपडेट गर्न कुनै विवरण प्राप्त भएन।"
        );
      }

      payload.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from(TABLE)
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select([
          "id",
          "user_id",
          "content",
          "media_path",
          "media_mime_type",
          "author_name",
          "author_avatar_url",
          "created_at",
          "updated_at"
        ].join(","))
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "पोस्ट भेटिएन वा सम्पादन गर्ने अनुमति छैन।"
        );
      }

      const post = await normalizePost(data, client);

      global.dispatchEvent(
        new CustomEvent("ksk:posts-cloud-change", {
          detail: {
            action: "update",
            post
          }
        })
      );

      return makeResult(
        true,
        "POST_UPDATED",
        post,
        "पोस्ट अपडेट भयो।"
      );

    } catch (error) {
      console.error(
        "Post Update Failed:",
        error
      );

      return makeResult(
        false,
        "POST_UPDATE_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  async function deletePost(postId) {
    try {
      const { client, user } = await getContext();

      const id = String(postId || "").trim();

      if (!id) {
        throw new Error(
          "पोस्ट ID उपलब्ध छैन।"
        );
      }

      const { data, error } = await client
        .from(TABLE)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id,media_path")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "पोस्ट भेटिएन वा मेटाउने अनुमति छैन।"
        );
      }

      if (data.media_path) {
        try {
          const { error: storageError } = await client
            .storage
            .from(BUCKET)
            .remove([data.media_path]);

          if (storageError) {
            console.warn(
              "Post deleted but media cleanup failed:",
              storageError
            );
          }

          SIGNED_URL_CACHE.delete(data.media_path);

        } catch (cleanupError) {
          console.warn(
            "Post media cleanup failed:",
            cleanupError
          );
        }
      }

      global.dispatchEvent(
        new CustomEvent("ksk:posts-cloud-change", {
          detail: {
            action: "delete",
            postId: id
          }
        })
      );

      return makeResult(
        true,
        "POST_DELETED",
        { id },
        "पोस्ट मेटियो।"
      );

    } catch (error) {
      console.error(
        "Post Delete Failed:",
        error
      );

      return makeResult(
        false,
        "POST_DELETE_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  function clearSignedUrlCache() {
    SIGNED_URL_CACHE.clear();
  }

  global.KSKSupabasePosts = Object.freeze({
    initialize,

    getFeed,
    getMyPosts,

    createPost,
    updatePost,
    deletePost,

    getSignedMediaUrl,
    clearSignedUrlCache
  });

  console.info(
    "KSK Supabase Posts Adapter loaded."
  );

})(window);
