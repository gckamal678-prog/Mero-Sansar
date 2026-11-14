
"use strict";

/*
 * MERO SANSAR — SUPABASE POSTS ADAPTER
 *
 * Responsibilities:
 * - Authenticated feed and own posts
 * - Create, update and delete posts
 * - Private Storage image upload
 * - Signed media URLs with expiry cache
 * - Realtime post changes
 *
 * Dependencies:
 * - core/supabase-auth.js
 * - core/supabase-profile.js
 *
 * Tables / Storage:
 * - public.posts
 * - public.profiles
 * - posts-media
 */

(function (global) {
  "use strict";

  if (global.KSKSupabasePosts) return;

  const TABLE = "posts";
  const BUCKET = "posts-media";

  const MAX_CONTENT_LENGTH = 10000;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const SIGNED_URL_SECONDS = 3600;
  const SIGNED_URL_REFRESH_MARGIN = 30000;

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  const SELECT_COLUMNS = [
    "id",
    "user_id",
    "content",
    "media_path",
    "media_mime_type",
    "author_name",
    "author_avatar_url",
    "created_at",
    "updated_at"
  ].join(",");

  const SIGNED_URL_CACHE = new Map();

  let realtimeChannel = null;
  let realtimeUserId = "";
  let realtimeStarting = false;

  function getAuth() {
    return global.KSKSupabaseAuth || null;
  }

  function makeResult(ok, code, data = null, message = "") {
    return { ok, code, data, message };
  }

  function getErrorMessage(error) {
    return String(
      error?.message ||
      error?.details ||
      error?.hint ||
      "पोस्टसम्बन्धी काम पूरा गर्न सकिएन।"
    );
  }

  function dispatchPostChange(detail = {}) {
    global.dispatchEvent(
      new CustomEvent("ksk:posts-cloud-change", {
        detail
      })
    );
  }

  function clearSignedUrlCache() {
    SIGNED_URL_CACHE.clear();
  }

  async function getContext() {
    const auth = getAuth();

    if (!auth) {
      throw new Error("Supabase Authentication उपलब्ध छैन।");
    }

    if (typeof auth.initialize !== "function") {
      throw new Error("Supabase Auth Initialization उपलब्ध छैन।");
    }

    const initialized = await auth.initialize();

    if (!initialized) {
      throw new Error(
        "Supabase Authentication सुरु हुन सकेन। फेरि प्रयास गर्नुहोस्।"
      );
    }

    if (!auth.isAuthenticated?.()) {
      throw new Error("पहिले आफ्नो खातामा लगइन गर्नुहोस्।");
    }

    const client = auth.getClient?.();
    const user = auth.getUser?.();

    if (!client || !user?.id) {
      throw new Error(
        "लगइन Session प्राप्त भएन। फेरि प्रयास गर्नुहोस्।"
      );
    }

    return { client, user };
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
    const extensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };

    return extensions[
      String(file?.type || "").toLowerCase()
    ] || "";
  }

  function validateMedia(file) {
    if (!file) return true;

    if (!(file instanceof Blob)) {
      throw new Error("फोटो फाइल सही छैन।");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        "JPEG, PNG, WebP वा GIF फोटो मात्र प्रयोग गर्न सकिन्छ।"
      );
    }

    if (file.size <= 0) {
      throw new Error("फोटो खाली छ।");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("फोटोको आकार 10 MB भन्दा बढी हुनुहुँदैन।");
    }

    return true;
  }

  async function getAuthorProfile() {
    const profileAPI = global.KSKSupabaseProfile;

    if (!profileAPI?.getMyProfile) {
      throw new Error("Supabase Profile सेवा उपलब्ध छैन।");
    }

    const profile = await profileAPI.getMyProfile();

    if (!profile) {
      throw new Error("आफ्नो प्रोफाइल प्राप्त गर्न सकिएन।");
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

  function createId() {
    return global.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function uploadMedia(client, userId, file, postId) {
    if (!file) return null;

    validateMedia(file);

    const extension = getFileExtension(file);

    if (!extension) {
      throw new Error("फोटोको प्रकार पहिचान गर्न सकिएन।");
    }

    const path =
      `${userId}/${postId}/${createId()}.${extension}`;

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
      cached.expiresAt > Date.now() + SIGNED_URL_REFRESH_MARGIN
    ) {
      return cached.url;
    }

    let client = clientOverride;

    if (!client) {
      const context = await getContext();
      client = context.client;
    }

    const { data, error } = await client
      .storage
      .from(BUCKET)
      .createSignedUrl(mediaPath, SIGNED_URL_SECONDS);

    if (error) throw error;

    const url = data?.signedUrl || "";

    if (url) {
      SIGNED_URL_CACHE.set(mediaPath, {
        url,
        expiresAt: Date.now() + SIGNED_URL_SECONDS * 1000
      });
    }

    return url;
  }

  /*
   * AUTHOR AVATAR LOOKUP
   *
   * Current avatar URLs are loaded from profiles.
   * This also fixes older posts with empty or outdated
   * author_avatar_url snapshots.
   *
   * Profile photos use the public profile-media bucket.
   */

  async function getAuthorAvatarMap(rows, client) {
    const userIds = [
      ...new Set(
        (rows || [])
          .map(row => String(row?.user_id || "").trim())
          .filter(Boolean)
      )
    ];

    const avatarMap = new Map();

    if (!userIds.length || !client) {
      return avatarMap;
    }

    try {
      const { data, error } = await client
        .from("profiles")
        .select("id,avatar_url")
        .in("id", userIds);

      if (error) throw error;

      (data || []).forEach(profile => {
        const id = String(profile?.id || "").trim();
        const avatar = String(profile?.avatar_url || "").trim();

        if (id && avatar) {
          avatarMap.set(id, avatar);
        }
      });

    } catch (error) {
      console.warn(
        "Author avatar lookup failed; using post snapshots:",
        error
      );
    }

    return avatarMap;
  }

  async function normalizePost(row, client, avatarMap = null) {
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

    const authorId = String(row.user_id || "").trim();

    const currentAvatar = avatarMap instanceof Map
      ? avatarMap.get(authorId)
      : "";

    const authorAvatar =
      currentAvatar ||
      String(row.author_avatar_url || "").trim();

    return {
      id: row.id,

      author: row.author_name || "सदस्य",
      authorId,
      authorAvatar,
      authorInitial: String(row.author_name || "स").charAt(0),

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

  async function normalizeRows(rows, client) {
    const sourceRows = Array.isArray(rows) ? rows : [];

    const avatarMap = await getAuthorAvatarMap(
      sourceRows,
      client
    );

    return Promise.all(
      sourceRows.map(row =>
        normalizePost(row, client, avatarMap)
      )
    );
  }

  /* =====================================================
     REALTIME
  ===================================================== */

  async function stopRealtime() {
    const auth = getAuth();
    const client = auth?.getClient?.();
    const oldChannel = realtimeChannel;

    realtimeChannel = null;
    realtimeUserId = "";

    if (oldChannel && client?.removeChannel) {
      try {
        await client.removeChannel(oldChannel);
      } catch (error) {
        console.warn("Posts Realtime cleanup failed:", error);
      }
    }

    return true;
  }

  async function startRealtime() {
    if (realtimeStarting) return false;

    let context;

    try {
      context = await getContext();
    } catch (_) {
      await stopRealtime();
      return false;
    }

    const { client, user } = context;

    if (
      realtimeChannel &&
      realtimeUserId === user.id
    ) {
      return true;
    }

    realtimeStarting = true;

    try {
      await stopRealtime();

      const channel = client
        .channel("ksk-posts-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLE
          },
          payload => {
            dispatchPostChange({
              action: "realtime",
              eventType: payload?.eventType || "",
              postId:
                payload?.new?.id ||
                payload?.old?.id ||
                ""
            });
          }
        );

      realtimeChannel = channel;
      realtimeUserId = user.id;

      const result = await channel.subscribe(status => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Posts Realtime channel error.");
        }

        if (status === "TIMED_OUT") {
          console.warn("Posts Realtime connection timed out.");
        }
      });

      return Boolean(result || realtimeChannel === channel);

    } catch (error) {
      console.warn("Posts Realtime could not start:", error);

      realtimeChannel = null;
      realtimeUserId = "";

      return false;

    } finally {
      realtimeStarting = false;
    }
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  async function initialize() {
    try {
      const context = await getContext();

      startRealtime().catch(error => {
        console.warn("Posts Realtime startup failed:", error);
      });

      return Boolean(context.client && context.user?.id);

    } catch (error) {
      console.error(
        "Supabase Posts initialization failed:",
        error
      );

      return false;
    }
  }

  /* =====================================================
     READ FEED
  ===================================================== */

  async function getFeed(options = {}) {
    try {
      const { client } = await getContext();

      const requestedLimit = Number(options.limit || 50);

      const limit = Math.min(
        100,
        Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 50)
      );

      let query = client
        .from(TABLE)
        .select(SELECT_COLUMNS)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);

      if (options.before) {
        query = query.lt("created_at", options.before);
      }

      const { data, error } = await query;

      if (error) throw error;

      const posts = await normalizeRows(data, client);

      return makeResult(true, "FEED_LOADED", posts);

    } catch (error) {
      console.error("Supabase Feed Load Failed:", error);

      return makeResult(
        false,
        "FEED_LOAD_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  /* =====================================================
     READ MY POSTS
  ===================================================== */

  async function getMyPosts(options = {}) {
    try {
      const { client, user } = await getContext();

      const requestedLimit = Number(options.limit || 50);

      const limit = Math.min(
        100,
        Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 50)
      );

      const { data, error } = await client
        .from(TABLE)
        .select(SELECT_COLUMNS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const posts = await normalizeRows(data, client);

      return makeResult(true, "MY_POSTS_LOADED", posts);

    } catch (error) {
      console.error("My Posts Load Failed:", error);

      return makeResult(
        false,
        "MY_POSTS_LOAD_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  /* =====================================================
     CREATE POST
  ===================================================== */

  async function createPost(input = {}) {
    let uploadedPath = "";
    let uploadClient = null;

    try {
      const { client, user } = await getContext();

      uploadClient = client;

      const content = cleanContent(input.text);
      const file = input.media || null;

      validateMedia(file);

      if (!content && !file) {
        throw new Error("केही लेख्नुहोस् वा फोटो थप्नुहोस्।");
      }

      const profile = await getAuthorProfile();
      const postId = createId();

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
        .select(SELECT_COLUMNS)
        .single();

      if (error) throw error;

      const post = await normalizePost(data, client);

      dispatchPostChange({
        action: "create",
        post
      });

      return makeResult(
        true,
        "POST_CREATED",
        post,
        "पोस्ट सफलतापूर्वक प्रकाशित भयो।"
      );

    } catch (error) {
      if (uploadedPath && uploadClient) {
        try {
          const { error: cleanupError } = await uploadClient
            .storage
            .from(BUCKET)
            .remove([uploadedPath]);

          if (cleanupError) {
            console.warn(
              "Failed upload cleanup:",
              cleanupError
            );
          }
        } catch (cleanupError) {
          console.warn("Failed upload cleanup:", cleanupError);
        }

        SIGNED_URL_CACHE.delete(uploadedPath);
      }

      console.error("Post Creation Failed:", error);

      return makeResult(
        false,
        "POST_CREATE_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  /* =====================================================
     UPDATE POST
  ===================================================== */

  async function updatePost(postId, changes = {}) {
    try {
      const { client, user } = await getContext();

      const id = String(postId || "").trim();

      if (!id) {
        throw new Error("पोस्ट ID उपलब्ध छैन।");
      }

      const payload = {};

      if (
        Object.prototype.hasOwnProperty.call(changes, "text")
      ) {
        payload.content = cleanContent(changes.text);
      }

      if (!Object.keys(payload).length) {
        throw new Error("अपडेट गर्न कुनै विवरण प्राप्त भएन।");
      }

      payload.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from(TABLE)
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select(SELECT_COLUMNS)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "पोस्ट भेटिएन वा सम्पादन गर्ने अनुमति छैन।"
        );
      }

      const post = await normalizePost(data, client);

      dispatchPostChange({
        action: "update",
        post,
        postId: id
      });

      return makeResult(
        true,
        "POST_UPDATED",
        post,
        "पोस्ट अपडेट भयो।"
      );

    } catch (error) {
      console.error("Post Update Failed:", error);

      return makeResult(
        false,
        "POST_UPDATE_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  /* =====================================================
     DELETE POST
  ===================================================== */

  async function deletePost(postId) {
    try {
      const { client, user } = await getContext();

      const id = String(postId || "").trim();

      if (!id) {
        throw new Error("पोस्ट ID उपलब्ध छैन।");
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
        } catch (cleanupError) {
          console.warn(
            "Post media cleanup failed:",
            cleanupError
          );
        }

        SIGNED_URL_CACHE.delete(data.media_path);
      }

      dispatchPostChange({
        action: "delete",
        postId: id
      });

      return makeResult(
        true,
        "POST_DELETED",
        { id },
        "पोस्ट मेटियो।"
      );

    } catch (error) {
      console.error("Post Delete Failed:", error);

      return makeResult(
        false,
        "POST_DELETE_FAILED",
        null,
        getErrorMessage(error)
      );
    }
  }

  /* =====================================================
     AUTH CHANGE HANDLING
  ===================================================== */

  global.addEventListener("ksk:auth-change", event => {
    clearSignedUrlCache();

    const user = event.detail?.user;

    if (!user?.id) {
      stopRealtime();
      return;
    }

    startRealtime().catch(error => {
      console.warn("Posts Realtime restart failed:", error);
    });
  });

  global.addEventListener("ksk:auth-ready", event => {
    const user = event.detail?.user;

    if (user?.id) {
      startRealtime().catch(error => {
        console.warn("Posts Realtime startup failed:", error);
      });
    } else {
      stopRealtime();
    }
  });

  /* =====================================================
     PUBLIC API
  ===================================================== */

  global.KSKSupabasePosts = Object.freeze({
    initialize,

    getFeed,
    getMyPosts,

    createPost,
    updatePost,
    deletePost,

    getSignedMediaUrl,
    clearSignedUrlCache,

    startRealtime,
    stopRealtime
  });

  console.info("KSK Supabase Posts Adapter loaded.");

})(window);
