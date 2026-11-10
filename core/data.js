
"use strict";

/*
 * KSK — SINGLE DATA LAYER
 *
 * RESPONSIBILITY:
 * - Central data storage and retrieval.
 * - Posts, comments, stories, friends, profile,
 *   messages, notifications and saved posts.
 * - Notify the application when stored data changes.
 *
 * All features must use window.KSKData.
 * No feature should access localStorage directly.
 */

(function (global) {
  "use strict";

  if (global.KSKData) return;

  const STORAGE = Object.freeze({
    posts: "ksk_posts_v2",
    stories: "ksk_stories_v1",
    friends: "ksk_friends_v1",
    messages: "ksk_messages_v1",
    profile: "ksk_profile_v1",
    saved: "ksk_saved_v1",
    notifications: "ksk_notifications_v1",
    chats: "ksk_feature_chats"
  });

  const DEFAULT_PROFILE = Object.freeze({
    name: "",
    bio: "",
    location: "",
    avatar: "",
    cover: ""
  });

  /* =======================================================
     STORAGE HELPERS
  ======================================================= */

  function read(key, fallback = []) {
    try {
      const raw = global.localStorage.getItem(key);

      if (raw === null) return fallback;

      const parsed = JSON.parse(raw);

      return parsed ?? fallback;
    } catch (error) {
      console.warn("KSKData: Storage read failed:", key, error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error("KSKData: Storage write failed:", key, error);
      return false;
    }
  }

  function makeId(prefix = "id") {
    const random = Math.random()
      .toString(36)
      .slice(2, 10);

    return `${prefix}_${Date.now()}_${random}`;
  }

  function clone(value) {
    if (value === undefined || value === null) {
      return value;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asString(value) {
    return String(value ?? "").trim();
  }

  function now() {
    return new Date().toISOString();
  }

  /* =======================================================
     DATA CHANGE EVENTS
  ======================================================= */

  function notify(collection, action, item = null) {
    try {
      global.dispatchEvent(
        new CustomEvent("ksk:data-change", {
          detail: {
            collection,
            action,
            item: clone(item),
            timestamp: Date.now()
          }
        })
      );
    } catch (error) {
      console.warn("KSKData: Event dispatch failed:", error);
    }
  }

  /* =======================================================
     INITIAL DATA
  ======================================================= */

  let posts = [];
  let stories = [];
  let friends = [];
  let messages = [];
  let profile = {};
  let saved = [];
  let notifications = [];
  let chats = [];

  let initialized = false;

  function initialize() {
    if (initialized) return true;

    posts = asArray(read(STORAGE.posts, []));
    stories = asArray(read(STORAGE.stories, []));
    friends = asArray(read(STORAGE.friends, []));
    messages = asArray(read(STORAGE.messages, []));
    profile = {
      ...DEFAULT_PROFILE,
      ...(read(STORAGE.profile, {}) || {})
    };
    saved = asArray(read(STORAGE.saved, []));
    notifications = asArray(
      read(STORAGE.notifications, [])
    );
    chats = asArray(read(STORAGE.chats, []));

    initialized = true;

    return true;
  }

  function ensureInitialized() {
    if (!initialized) initialize();
  }

  /* =======================================================
     PERSISTENCE
  ======================================================= */

  function persistPosts() {
    return write(STORAGE.posts, posts);
  }

  function persistStories() {
    return write(STORAGE.stories, stories);
  }

  function persistFriends() {
    return write(STORAGE.friends, friends);
  }

  function persistMessages() {
    return write(STORAGE.messages, messages);
  }

  function persistProfile() {
    return write(STORAGE.profile, profile);
  }

  function persistSaved() {
    return write(STORAGE.saved, saved);
  }

  function persistNotifications() {
    return write(STORAGE.notifications, notifications);
  }

  function persistChats() {
    return write(STORAGE.chats, chats);
  }

  /* =======================================================
     POSTS
  ======================================================= */

  function getPosts() {
    ensureInitialized();
    return clone(posts);
  }

  function getPost(postId) {
    ensureInitialized();

    const id = asString(postId);

    return clone(
      posts.find(post => String(post.id) === id) || null
    );
  }

  function addPost(data = {}) {
    ensureInitialized();

    const post = {
      id: data.id || makeId("post"),
      userId: data.userId || "me",
      author: data.author || profile.name || "User",
      avatar: data.avatar || profile.avatar || "",
      text: asString(data.text),
      image: data.image || "",
      mediaId: data.mediaId || null,
      createdAt: data.createdAt || now(),
      likes: asArray(data.likes),
      comments: asArray(data.comments),
      shares: Number(data.shares || 0),
      ...clone(data)
    };

    posts.unshift(post);

    if (!persistPosts()) {
      posts.shift();
      return null;
    }

    notify("posts", "add", post);

    return clone(post);
  }

  function updatePost(postId, updates = {}) {
    ensureInitialized();

    const id = asString(postId);
    const index = posts.findIndex(
      post => String(post.id) === id
    );

    if (index < 0) return null;

    const previous = clone(posts[index]);

    posts[index] = {
      ...posts[index],
      ...clone(updates),
      id: posts[index].id
    };

    if (!persistPosts()) {
      posts[index] = previous;
      return null;
    }

    notify("posts", "update", posts[index]);

    return clone(posts[index]);
  }

  function deletePost(postId) {
    ensureInitialized();

    const id = asString(postId);
    const index = posts.findIndex(
      post => String(post.id) === id
    );

    if (index < 0) return false;

    const removed = posts[index];

    posts.splice(index, 1);

    if (!persistPosts()) {
      posts.splice(index, 0, removed);
      return false;
    }

    // Preserve media information for safe cleanup.
    notify("posts", "delete", {
      id: removed.id,
      mediaId: removed.mediaId || null,
      image: removed.image || ""
    });

    return true;
  }

  /* =======================================================
     POST REACTIONS
  ======================================================= */

  function togglePostLike(postId, userId = "me") {
    ensureInitialized();

    const id = asString(postId);
    const post = posts.find(
      item => String(item.id) === id
    );

    if (!post) return null;

    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    const existing = post.likes.findIndex(
      like => String(
        typeof like === "object" ? like.userId : like
      ) === String(userId)
    );

    if (existing >= 0) {
      post.likes.splice(existing, 1);
    } else {
      post.likes.push({
        userId,
        createdAt: now()
      });
    }

    if (!persistPosts()) return null;

    notify("posts", "like", {
      postId: id,
      likes: post.likes.length
    });

    return clone(post);
  }

  /* =======================================================
     COMMENTS
  ======================================================= */

  function addComment(postId, data = {}) {
    ensureInitialized();

    const id = asString(postId);
    const post = posts.find(
      item => String(item.id) === id
    );

    if (!post) return null;

    if (!Array.isArray(post.comments)) {
      post.comments = [];
    }

    const comment = {
      id: data.id || makeId("comment"),
      postId: id,
      userId: data.userId || "me",
      author: data.author || profile.name || "User",
      avatar: data.avatar || profile.avatar || "",
      text: asString(data.text),
      createdAt: data.createdAt || now(),
      likes: [],
      replies: [],
      ...clone(data)
    };

    post.comments.push(comment);

    if (!persistPosts()) {
      post.comments.pop();
      return null;
    }

    notify("posts", "comment-add", {
      postId: id,
      comment
    });

    return clone(comment);
  }

  function updateComment(postId, commentId, updates = {}) {
    ensureInitialized();

    const post = posts.find(
      item => String(item.id) === String(postId)
    );

    if (!post || !Array.isArray(post.comments)) {
      return null;
    }

    const comment = post.comments.find(
      item => String(item.id) === String(commentId)
    );

    if (!comment) return null;

    const previous = clone(comment);

    Object.assign(comment, clone(updates));

    if (!persistPosts()) {
      Object.assign(comment, previous);
      return null;
    }

    notify("posts", "comment-update", {
      postId: String(postId),
      commentId: String(commentId),
      comment
    });

    return clone(comment);
  }

  function deleteComment(postId, commentId) {
    ensureInitialized();

    const post = posts.find(
      item => String(item.id) === String(postId)
    );

    if (!post || !Array.isArray(post.comments)) {
      return false;
    }

    const index = post.comments.findIndex(
      item => String(item.id) === String(commentId)
    );

    if (index < 0) return false;

    const removed = post.comments.splice(index, 1)[0];

    if (!persistPosts()) {
      post.comments.splice(index, 0, removed);
      return false;
    }

    notify("posts", "comment-delete", {
      postId: String(postId),
      id: String(commentId),
      deletedIds: [String(commentId)]
    });

    return true;
  }

  function addReply(postId, commentId, data = {}) {
    ensureInitialized();

    const post = posts.find(
      item => String(item.id) === String(postId)
    );

    if (!post || !Array.isArray(post.comments)) {
      return null;
    }

    const comment = post.comments.find(
      item => String(item.id) === String(commentId)
    );

    if (!comment) return null;

    if (!Array.isArray(comment.replies)) {
      comment.replies = [];
    }

    const reply = {
      id: data.id || makeId("reply"),
      postId: String(postId),
      commentId: String(commentId),
      userId: data.userId || "me",
      author: data.author || profile.name || "User",
      avatar: data.avatar || profile.avatar || "",
      text: asString(data.text),
      createdAt: data.createdAt || now(),
      likes: [],
      ...clone(data)
    };

    comment.replies.push(reply);

    if (!persistPosts()) {
      comment.replies.pop();
      return null;
    }

    notify("posts", "reply-add", {
      postId: String(postId),
      commentId: String(commentId),
      reply
    });

    return clone(reply);
  }

  function deleteReply(postId, commentId, replyId) {
    ensureInitialized();

    const post = posts.find(
      item => String(item.id) === String(postId)
    );

    if (!post || !Array.isArray(post.comments)) {
      return false;
    }

    const comment = post.comments.find(
      item => String(item.id) === String(commentId)
    );

    if (!comment || !Array.isArray(comment.replies)) {
      return false;
    }

    const index = comment.replies.findIndex(
      item => String(item.id) === String(replyId)
    );

    if (index < 0) return false;

    const removed = comment.replies.splice(index, 1)[0];

    if (!persistPosts()) {
      comment.replies.splice(index, 0, removed);
      return false;
    }

    notify("posts", "reply-delete", {
      postId: String(postId),
      commentId: String(commentId),
      id: String(replyId),
      deletedIds: [String(replyId)]
    });

    return true;
  }

  function toggleCommentLike(postId, commentId, userId = "me") {
    ensureInitialized();

    const post = posts.find(
      item => String(item.id) === String(postId)
    );

    if (!post || !Array.isArray(post.comments)) {
      return null;
    }

    const comment = post.comments.find(
      item => String(item.id) === String(commentId)
    );

    if (!comment) return null;

    if (!Array.isArray(comment.likes)) {
      comment.likes = [];
    }

    const index = comment.likes.findIndex(
      like => String(
        typeof like === "object" ? like.userId : like
      ) === String(userId)
    );

    if (index >= 0) {
      comment.likes.splice(index, 1);
    } else {
      comment.likes.push({
        userId,
        createdAt: now()
      });
    }

    if (!persistPosts()) return null;

    notify("posts", "comment-like", {
      postId: String(postId),
      commentId: String(commentId)
    });

    return clone(comment);
  }

  /* =======================================================
     STORIES
  ======================================================= */

  function getStories() {
    ensureInitialized();
    return clone(stories);
  }

  function getStory(storyId) {
    ensureInitialized();

    return clone(
      stories.find(
        story => String(story.id) === String(storyId)
      ) || null
    );
  }

  function addStory(data = {}) {
    ensureInitialized();

    const story = {
      id: data.id || makeId("story"),
      userId: data.userId || "me",
      author: data.author || profile.name || "User",
      avatar: data.avatar || profile.avatar || "",
      text: asString(data.text),
      image: data.image || "",
      mediaId: data.mediaId || null,
      createdAt: data.createdAt || now(),
      expiresAt: data.expiresAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      views: [],
      ...clone(data)
    };

    stories.unshift(story);

    if (!persistStories()) {
      stories.shift();
      return null;
    }

    notify("stories", "add", story);

    return clone(story);
  }

  function deleteStory(storyId) {
    ensureInitialized();

    const id = asString(storyId);
    const index = stories.findIndex(
      story => String(story.id) === id
    );

    if (index < 0) return false;

    const removed = stories[index];

    stories.splice(index, 1);

    if (!persistStories()) {
      stories.splice(index, 0, removed);
      return false;
    }

    // Preserve media information for safe cleanup.
    notify("stories", "delete", {
      id: removed.id,
      mediaId: removed.mediaId || null,
      image: removed.image || ""
    });

    return true;
  }

  function addStoryView(storyId, userId = "me") {
    ensureInitialized();

    const story = stories.find(
      item => String(item.id) === String(storyId)
    );

    if (!story) return false;

    if (!Array.isArray(story.views)) {
      story.views = [];
    }

    if (
      story.views.some(view =>
        String(
          typeof view === "object" ? view.userId : view
        ) === String(userId)
      )
    ) {
      return true;
    }

    story.views.push({
      userId,
      viewedAt: now()
    });

    if (!persistStories()) return false;

    notify("stories", "view", {
      storyId: String(storyId),
      userId
    });

    return true;
  }

  function getActiveStories() {
    ensureInitialized();

    const currentTime = Date.now();

    return clone(
      stories.filter(story => {
        if (!story.expiresAt) return true;

        const expires = new Date(
          story.expiresAt
        ).getTime();

        return !Number.isNaN(expires) &&
          expires > currentTime;
      })
    );
  }

  /* =======================================================
     FRIENDS
  ======================================================= */

  function getFriends() {
    ensureInitialized();
    return clone(friends);
  }

  function addFriend(data = {}) {
    ensureInitialized();

    const friend = {
      id: data.id || makeId("friend"),
      userId: data.userId || data.id || "",
      name: data.name || "",
      avatar: data.avatar || "",
      status: data.status || "friend",
      createdAt: data.createdAt || now(),
      ...clone(data)
    };

    const exists = friends.some(
      item => String(item.userId) === String(friend.userId)
    );

    if (exists) return false;

    friends.push(friend);

    if (!persistFriends()) {
      friends.pop();
      return false;
    }

    notify("friends", "add", friend);

    return clone(friend);
  }

  function removeFriend(userId) {
    ensureInitialized();

    const index = friends.findIndex(
      item => String(item.userId) === String(userId)
    );

    if (index < 0) return false;

    const removed = friends.splice(index, 1)[0];

    if (!persistFriends()) {
      friends.splice(index, 0, removed);
      return false;
    }

    notify("friends", "delete", {
      id: removed.id,
      userId: removed.userId
    });

    return true;
  }

  /* =======================================================
     MESSAGES
  ======================================================= */

  function getMessages() {
    ensureInitialized();
    return clone(messages);
  }

  function addMessage(data = {}) {
    ensureInitialized();

    const message = {
      id: data.id || makeId("message"),
      senderId: data.senderId || "me",
      receiverId: data.receiverId || "",
      text: asString(data.text),
      image: data.image || "",
      createdAt: data.createdAt || now(),
      read: false,
      ...clone(data)
    };

    messages.push(message);

    if (!persistMessages()) {
      messages.pop();
      return null;
    }

    notify("messages", "add", message);

    return clone(message);
  }

  function deleteMessage(messageId) {
    ensureInitialized();

    const index = messages.findIndex(
      item => String(item.id) === String(messageId)
    );

    if (index < 0) return false;

    const removed = messages.splice(index, 1)[0];

    if (!persistMessages()) {
      messages.splice(index, 0, removed);
      return false;
    }

    notify("messages", "delete", {
      id: removed.id
    });

    return true;
  }

  /* =======================================================
     CHATS
  ======================================================= */

  function getChats() {
    ensureInitialized();
    return clone(chats);
  }

  function addChat(data = {}) {
    ensureInitialized();

    const chat = {
      id: data.id || makeId("chat"),
      participants: asArray(data.participants),
      messages: asArray(data.messages),
      updatedAt: data.updatedAt || now(),
      ...clone(data)
    };

    chats.push(chat);

    if (!persistChats()) {
      chats.pop();
      return null;
    }

    notify("messages", "chat-add", chat);

    return clone(chat);
  }

  /* =======================================================
     PROFILE
  ======================================================= */

  function getProfile() {
    ensureInitialized();
    return clone(profile);
  }

  function updateProfile(updates = {}) {
    ensureInitialized();

    const previous = clone(profile);

    const oldAvatar = profile.avatar || "";
    const oldCover = profile.cover || "";

    profile = {
      ...profile,
      ...clone(updates)
    };

    if (!persistProfile()) {
      profile = previous;
      return null;
    }

    const newAvatar = profile.avatar || "";
    const newCover = profile.cover || "";

    notify("profile", "update", {
      ...clone(profile),

      oldAvatar,
      oldCover,

      oldAvatarMediaId:
        previous.avatarMediaId || null,

      oldCoverMediaId:
        previous.coverMediaId || null,

      newAvatarMediaId:
        profile.avatarMediaId || null,

      newCoverMediaId:
        profile.coverMediaId || null
    });

    return clone(profile);
  }

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  function getNotifications() {
    ensureInitialized();
    return clone(notifications);
  }

  function addNotification(data = {}) {
    ensureInitialized();

    const notification = {
      id: data.id || makeId("notification"),
      type: data.type || "general",
      text: data.text || "",
      read: false,
      createdAt: data.createdAt || now(),
      ...clone(data)
    };

    notifications.unshift(notification);

    if (!persistNotifications()) {
      notifications.shift();
      return null;
    }

    notify("notifications", "add", notification);

    return clone(notification);
  }

  function markNotificationsRead() {
    ensureInitialized();

    const previous = clone(notifications);

    notifications = notifications.map(item => ({
      ...item,
      read: true
    }));

    if (!persistNotifications()) {
      notifications = previous;
      return false;
    }

    notify("notifications", "mark-read", {
      count: notifications.length
    });

    return true;
  }

  function getUnreadNotificationCount() {
    ensureInitialized();

    return notifications.filter(
      item => !item.read
    ).length;
  }

  /* =======================================================
     SAVED POSTS
  ======================================================= */

  function getSavedPosts() {
    ensureInitialized();
    return clone(saved);
  }

  function savePost(postId) {
    ensureInitialized();

    const id = asString(postId);

    if (!id) return false;

    if (
      saved.some(item =>
        String(
          typeof item === "object" ? item.postId : item
        ) === id
      )
    ) {
      return true;
    }

    saved.push({
      postId: id,
      savedAt: now()
    });

    if (!persistSaved()) {
      saved.pop();
      return false;
    }

    notify("saved", "add", {
      postId: id
    });

    return true;
  }

  function unsavePost(postId) {
    ensureInitialized();

    const id = asString(postId);

    const index = saved.findIndex(
      item => String(
        typeof item === "object" ? item.postId : item
      ) === id
    );

    if (index < 0) return false;

    const removed = saved.splice(index, 1)[0];

    if (!persistSaved()) {
      saved.splice(index, 0, removed);
      return false;
    }

    notify("saved", "delete", {
      postId: id
    });

    return true;
  }

  function toggleSavedPost(postId) {
    ensureInitialized();

    const id = asString(postId);

    const exists = saved.some(
      item => String(
        typeof item === "object" ? item.postId : item
      ) === id
    );

    return exists
      ? unsavePost(id)
      : savePost(id);
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  const api = Object.freeze({

    initialize,

    // Posts
    getPosts,
    getPost,
    addPost,
    updatePost,
    deletePost,
    togglePostLike,

    // Comments
    addComment,
    updateComment,
    deleteComment,
    addReply,
    deleteReply,
    toggleCommentLike,

    // Stories
    getStories,
    getStory,
    getActiveStories,
    addStory,
    deleteStory,
    addStoryView,

    // Friends
    getFriends,
    addFriend,
    removeFriend,

    // Messages
    getMessages,
    addMessage,
    deleteMessage,

    // Chats
    getChats,
    addChat,

    // Profile
    getProfile,
    updateProfile,

    // Notifications
    getNotifications,
    addNotification,
    markNotificationsRead,
    getUnreadNotificationCount,

    // Saved posts
    getSavedPosts,
    savePost,
    unsavePost,
    toggleSavedPost,

    // Utilities
    makeId
  });

  global.KSKData = api;

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
