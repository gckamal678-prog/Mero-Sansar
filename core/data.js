
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

  const listeners = new Set();
  let initialized = false;

  /* =======================================================
     HELPERS
  ======================================================= */

  function clone(value) {
    if (value === undefined || value === null) {
      return value;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function read(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);

      if (raw === null) {
        return clone(fallback);
      }

      const value = JSON.parse(raw);

      return value === null
        ? clone(fallback)
        : value;
    } catch (error) {
      console.error("KSK data read failed:", error);
      return clone(fallback);
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
      console.error("KSK data save failed:", error);

      global.KSKToast?.error(
        "डाटा सुरक्षित गर्न सकिएन। भण्डारण क्षमता जाँच गर्नुहोस्।"
      );

      return false;
    }
  }

  function makeId(prefix = "item") {
    const random = global.crypto?.randomUUID
      ? global.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return `${prefix}_${random}`;
  }

  function cleanText(value, maxLength = 5000) {
    return String(value ?? "")
      .trim()
      .slice(0, maxLength);
  }

  function isArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function emit(collection, action, item = null) {
    const detail = {
      collection,
      action,
      item: item ? clone(item) : null,
      timestamp: Date.now()
    };

    listeners.forEach(listener => {
      try {
        listener(detail);
      } catch (error) {
        console.error(
          "KSK data listener failed:",
          error
        );
      }
    });

    global.dispatchEvent(
      new CustomEvent("ksk:data-change", {
        detail
      })
    );

    if (global.KSKState?.setState) {
      global.KSKState.setState(
        {
          lastDataChange: {
            collection,
            action,
            timestamp: detail.timestamp
          }
        },
        "data-change"
      );
    }

    return detail;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError(
        "KSKData subscriber must be a function."
      );
    }

    listeners.add(listener);

    return () => listeners.delete(listener);
  }

  function saveCollection(
    key,
    collection,
    action,
    item
  ) {
    const saved = write(key, collection);

    if (saved) {
      emit(key, action, item);
    }

    return saved;
  }

  function sortNewest(items) {
    return items.sort((a, b) =>
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
    );
  }

  /* =======================================================
     POSTS
  ======================================================= */

  function getPosts() {
    return sortNewest(
      isArray(read(STORAGE.posts, []))
    );
  }

  function getPost(postId) {
    const id = String(postId || "");

    const post = getPosts().find(
      item => String(item.id) === id
    );

    return post ? clone(post) : null;
  }

  function addPost(post = {}) {
    if (!post || typeof post !== "object") {
      return false;
    }

    const item = {
      ...clone(post),
      id: post.id || makeId("post"),
      text: cleanText(post.text, 10000),
      comments: isArray(post.comments),
      createdAt: post.createdAt || new Date().toISOString()
    };

    if (
      !item.text &&
      !item.mediaId &&
      !item.mediaData
    ) {
      return false;
    }

    const posts = getPosts();
    posts.unshift(item);

    if (!saveCollection(
      STORAGE.posts,
      posts,
      "add",
      item
    )) {
      return false;
    }

    return clone(item);
  }

  function updatePost(postId, changes = {}) {
    const id = String(postId || "");

    if (
      !id ||
      !changes ||
      typeof changes !== "object"
    ) {
      return false;
    }

    const posts = getPosts();

    const index = posts.findIndex(
      post => String(post.id) === id
    );

    if (index === -1) return false;

    const updated = {
      ...posts[index],
      ...clone(changes),
      id: posts[index].id
    };

    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "text"
      )
    ) {
      updated.text = cleanText(
        changes.text,
        10000
      );
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        changes,
        "comments"
      )
    ) {
      updated.comments = isArray(
        posts[index].comments
      );
    } else {
      updated.comments = isArray(
        changes.comments
      );
    }

    posts[index] = updated;

    return saveCollection(
      STORAGE.posts,
      posts,
      "update",
      updated
    );
  }

  function deletePost(postId) {
    const id = String(postId || "");
    const posts = getPosts();

    const next = posts.filter(
      post => String(post.id) !== id
    );

    if (next.length === posts.length) {
      return false;
    }

    return saveCollection(
      STORAGE.posts,
      next,
      "delete",
      { id }
    );
  }

  /* =======================================================
     COMMENTS
     Flat comment structure with parentId.
  ======================================================= */

  function getComments(postId) {
    const post = getPost(postId);

    if (!post) return [];

    return sortNewest(
      isArray(post.comments)
    );
  }

  function getComment(postId, commentId) {
    const comments = getComments(postId);
    const id = String(commentId || "");

    const comment = comments.find(
      item => String(item.id) === id
    );

    return comment ? clone(comment) : null;
  }

  function addComment(
    postId,
    comment = {},
    options = {}
  ) {
    const id = String(postId || "");
    const post = getPost(id);

    if (
      !post ||
      !comment ||
      typeof comment !== "object"
    ) {
      return false;
    }

    const text = cleanText(comment.text, 3000);

    if (!text) return false;

    const comments = isArray(post.comments);

    const parentId = String(
      options.parentId ||
      comment.parentId ||
      ""
    );

    if (parentId) {
      const parentExists = comments.some(
        item => String(item.id) === parentId
      );

      if (!parentExists) return false;
    }

    const mentions = isArray(
      options.mentions || comment.mentions
    ).map(mention => ({
      id: cleanText(mention?.id, 120),
      name: cleanText(mention?.name, 60)
    })).filter(mention => mention.name);

    const item = {
      id: comment.id || makeId("comment"),
      postId: id,
      parentId: parentId || null,
      replyTo: cleanText(
        options.replyTo || comment.replyTo,
        60
      ),
      author: cleanText(
        comment.author || "सदस्य",
        60
      ),
      authorId: cleanText(
        comment.authorId,
        120
      ),
      authorInitial: cleanText(
        comment.authorInitial ||
        comment.author?.charAt?.(0) ||
        "स",
        4
      ),
      avatar: cleanText(
        comment.avatar,
        200000
      ),
      text,
      mentions,
      likes: Number(comment.likes || 0),
      liked: Boolean(comment.liked),
      createdAt: comment.createdAt ||
        new Date().toISOString(),
      editedAt: null
    };

    comments.push(item);

    const updated = {
      ...post,
      comments
    };

    if (!saveCollection(
      STORAGE.posts,
      replacePostInList(id, updated),
      parentId ? "reply-add" : "comment-add",
      item
    )) {
      return false;
    }

    return clone(item);
  }

  function replacePostInList(
    postId,
    updatedPost
  ) {
    const posts = getPosts();

    const index = posts.findIndex(
      post => String(post.id) === String(postId)
    );

    if (index === -1) return posts;

    posts[index] = updatedPost;

    return posts;
  }

  function updateComment(
    postId,
    commentId,
    changes = {}
  ) {
    const id = String(postId || "");
    const post = getPost(id);

    if (
      !post ||
      !changes ||
      typeof changes !== "object"
    ) {
      return false;
    }

    const comments = isArray(post.comments);

    const index = comments.findIndex(
      item => String(item.id) === String(commentId)
    );

    if (index === -1) return false;

    const updatedComment = {
      ...comments[index],
      ...clone(changes),
      id: comments[index].id,
      postId: id,
      editedAt: new Date().toISOString()
    };

    if (
      Object.prototype.hasOwnProperty.call(
        changes,
        "text"
      )
    ) {
      updatedComment.text = cleanText(
        changes.text,
        3000
      );

      if (!updatedComment.text) return false;
    }

    comments[index] = updatedComment;

    const updatedPost = {
      ...post,
      comments
    };

    return saveCollection(
      STORAGE.posts,
      replacePostInList(id, updatedPost),
      "comment-update",
      updatedComment
    );
  }

  function deleteComment(postId, commentId) {
    const id = String(postId || "");
    const targetId = String(commentId || "");
    const post = getPost(id);

    if (!post || !targetId) return false;

    const comments = isArray(post.comments);

    const exists = comments.some(
      item => String(item.id) === targetId
    );

    if (!exists) return false;

    const idsToDelete = new Set([targetId]);

    let changed = true;

    while (changed) {
      changed = false;

      comments.forEach(item => {
        if (
          item.parentId &&
          idsToDelete.has(String(item.parentId)) &&
          !idsToDelete.has(String(item.id))
        ) {
          idsToDelete.add(String(item.id));
          changed = true;
        }
      });
    }

    const nextComments = comments.filter(
      item => !idsToDelete.has(String(item.id))
    );

    const updatedPost = {
      ...post,
      comments: nextComments
    };

    return saveCollection(
      STORAGE.posts,
      replacePostInList(id, updatedPost),
      "comment-delete",
      {
        id: targetId,
        deletedIds: [...idsToDelete]
      }
    );
  }

  function toggleCommentLike(
    postId,
    commentId
  ) {
    const post = getPost(postId);

    if (!post) return false;

    const comments = isArray(post.comments);

    const index = comments.findIndex(
      item => String(item.id) === String(commentId)
    );

    if (index === -1) return false;

    const comment = comments[index];
    const liked = !Boolean(comment.liked);

    const reactionCounts = {
      ...(comment.reactionCounts || {})
    };

    if (!liked && comment.myReaction) {
      reactionCounts[comment.myReaction] = Math.max(
        0,
        Number(
          reactionCounts[comment.myReaction] || 0
        ) - 1
      );
    }

    comments[index] = {
      ...comment,
      liked,
      myReaction: liked
        ? (comment.myReaction || "")
        : "",
      reactionCounts,
      likes: Math.max(
        0,
        Number(comment.likes || 0) +
          (liked ? 1 : -1)
      )
    };

    const updatedPost = {
      ...post,
      comments
    };

    return saveCollection(
      STORAGE.posts,
      replacePostInList(postId, updatedPost),
      "comment-like",
      comments[index]
    );
  }

  function setCommentReaction(
    postId,
    commentId,
    emoji
  ) {
    const allowedReactions = [
      "🌹",
      "😘",
      "😢",
      "😠",
      "🤓"
    ];

    if (
      emoji &&
      !allowedReactions.includes(emoji)
    ) {
      return false;
    }

    const post = getPost(postId);

    if (!post) return false;

    const comments = isArray(post.comments);

    const index = comments.findIndex(
      item => String(item.id) === String(commentId)
    );

    if (index === -1) return false;

    const comment = comments[index];
    const previousReaction = comment.myReaction || "";

    const reactionCounts = {
      ...(comment.reactionCounts || {})
    };

    let likes = Math.max(
      0,
      Number(comment.likes || 0)
    );

    if (previousReaction === emoji) {
      reactionCounts[emoji] = Math.max(
        0,
        Number(reactionCounts[emoji] || 0) - 1
      );

      likes = Math.max(0, likes - 1);

      comments[index] = {
        ...comment,
        liked: false,
        myReaction: "",
        reactionCounts,
        likes
      };
    } else {
      if (previousReaction) {
        reactionCounts[previousReaction] = Math.max(
          0,
          Number(
            reactionCounts[previousReaction] || 0
          ) - 1
        );
      }

      if (!comment.liked) {
        likes += 1;
      }

      reactionCounts[emoji] = Number(
        reactionCounts[emoji] || 0
      ) + 1;

      comments[index] = {
        ...comment,
        liked: true,
        myReaction: emoji,
        reactionCounts,
        likes
      };
    }

    const updatedPost = {
      ...post,
      comments
    };

    return saveCollection(
      STORAGE.posts,
      replacePostInList(postId, updatedPost),
      "comment-reaction",
      comments[index]
    );
  }

  function getCommentCount(postId) {
    return getComments(postId).length;
  }

  /* =======================================================
     STORIES
  ======================================================= */

  function getStories(includeExpired = false) {
    const now = Date.now();

    return read(STORAGE.stories, [])
      .filter(story => {
        if (includeExpired) return true;

        return !story.expiresAt ||
          new Date(story.expiresAt).getTime() > now;
      })
      .sort((a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );
  }

  function addStory(story = {}) {
    if (!story || typeof story !== "object") {
      return false;
    }

    const now = Date.now();

    const item = {
      ...clone(story),
      id: story.id || makeId("story"),
      createdAt: story.createdAt ||
        new Date(now).toISOString(),
      expiresAt: story.expiresAt ||
        new Date(
          now + 24 * 60 * 60 * 1000
        ).toISOString()
    };

    if (
      !item.mediaId &&
      !item.mediaData &&
      !item.text
    ) {
      return false;
    }

    const stories = getStories(true);
    stories.unshift(item);

    if (!saveCollection(
      STORAGE.stories,
      stories,
      "add",
      item
    )) {
      return false;
    }

    return clone(item);
  }

  function deleteStory(storyId) {
    const id = String(storyId || "");
    const stories = getStories(true);

    const next = stories.filter(
      story => String(story.id) !== id
    );

    if (next.length === stories.length) {
      return false;
    }

    return saveCollection(
      STORAGE.stories,
      next,
      "delete",
      { id }
    );
  }

  /* =======================================================
     FRIENDS
  ======================================================= */

  function getFriends() {
    return isArray(
      read(STORAGE.friends, [])
    );
  }

  function addFriend(friend) {
    const item = typeof friend === "string"
      ? {
          name: cleanText(friend, 60)
        }
      : clone(friend || {});

    const name = cleanText(item.name, 60);

    if (!name) return false;

    const friends = getFriends();

    const duplicate = friends.some(existing =>
      String(existing.name || "").toLowerCase() ===
      name.toLowerCase()
    );

    if (duplicate) return false;

    const newFriend = {
      ...item,
      id: item.id || makeId("friend"),
      name,
      avatar: item.avatar ||
        item.initial ||
        name.charAt(0),
      createdAt: item.createdAt ||
        new Date().toISOString()
    };

    friends.unshift(newFriend);

    if (!saveCollection(
      STORAGE.friends,
      friends,
      "add",
      newFriend
    )) {
      return false;
    }

    return clone(newFriend);
  }

  function updateFriend(
    friendId,
    changes = {}
  ) {
    const id = String(friendId || "");
    const friends = getFriends();

    const index = friends.findIndex(
      friend => String(friend.id) === id
    );

    if (index === -1) return false;

    friends[index] = {
      ...friends[index],
      ...clone(changes),
      id: friends[index].id
    };

    return saveCollection(
      STORAGE.friends,
      friends,
      "update",
      friends[index]
    );
  }

  function removeFriend(friendId) {
    const id = String(friendId || "");
    const friends = getFriends();

    const next = friends.filter(
      friend => String(friend.id) !== id
    );

    if (next.length === friends.length) {
      return false;
    }

    return saveCollection(
      STORAGE.friends,
      next,
      "delete",
      { id }
    );
  }

  /* =======================================================
     PROFILE
  ======================================================= */

  function getProfile() {
    const profile = read(
      STORAGE.profile,
      DEFAULT_PROFILE
    );

    return {
      ...clone(DEFAULT_PROFILE),
      ...(profile && typeof profile === "object"
        ? profile
        : {})
    };
  }

  function saveProfile(profile = {}) {
    if (!profile || typeof profile !== "object") {
      return false;
    }

    const current = getProfile();

    const next = {
      ...current,
      ...clone(profile)
    };

    if ("name" in profile) {
      next.name = cleanText(
        profile.name,
        60
      );
    }

    if ("bio" in profile) {
      next.bio = cleanText(
        profile.bio,
        240
      );
    }

    if ("location" in profile) {
      next.location = cleanText(
        profile.location,
        100
      );
    }

    if ("avatar" in profile) {
      next.avatar = cleanText(
        profile.avatar,
        200000
      );
    }

    if ("cover" in profile) {
      next.cover = cleanText(
        profile.cover,
        200000
      );
    }

    if (!write(STORAGE.profile, next)) {
      return false;
    }

    emit("profile", "update", next);

    return clone(next);
  }

  /* =======================================================
     MESSAGES AND CHATS
  ======================================================= */

  function getMessages() {
    return isArray(
      read(STORAGE.messages, [])
    ).sort((a, b) =>
      new Date(a.createdAt || a.time || 0) -
      new Date(b.createdAt || b.time || 0)
    );
  }

  function getChats() {
    const storedChats = isArray(
      read(STORAGE.chats, [])
    );

    const messages = getMessages();
    const chatsById = new Map();

    storedChats.forEach(chat => {
      chatsById.set(String(chat.id), {
        ...chat,
        messages: isArray(chat.messages)
      });
    });

    messages.forEach(message => {
      const chatId = String(
        message.chatId || "general"
      );

      if (!chatsById.has(chatId)) {
        chatsById.set(chatId, {
          id: chatId,
          userId: message.userId || "",
          name: message.sender || "सन्देश",
          avatar: message.avatar || "",
          messages: []
        });
      }

      const chat = chatsById.get(chatId);

      const exists = chat.messages.some(
        item => String(item.id) ===
          String(message.id)
      );

      if (!exists) {
        chat.messages.push({
          ...message,
          text: message.text || "",
          fromMe: Boolean(message.fromMe),
          time: message.time ||
            message.createdAt ||
            Date.now()
        });
      }
    });

    return [...chatsById.values()].map(chat => ({
      ...chat,
      messages: chat.messages.sort((a, b) =>
        new Date(a.time || a.createdAt || 0) -
        new Date(b.time || b.createdAt || 0)
      )
    }));
  }

  function createChat(friend = {}) {
    if (!friend || typeof friend !== "object") {
      return false;
    }

    const chats = getChats();

    const existing = chats.find(chat =>
      String(chat.userId) === String(friend.id)
    );

    if (existing) return existing.id;

    const chat = {
      id: makeId("chat"),
      userId: friend.id || "",
      name: cleanText(
        friend.name || "साथी",
        60
      ),
      avatar: friend.avatar ||
        friend.initial ||
        "",
      messages: [],
      createdAt: new Date().toISOString()
    };

    const stored = isArray(
      read(STORAGE.chats, [])
    );

    stored.unshift(chat);

    if (!saveCollection(
      STORAGE.chats,
      stored,
      "add",
      chat
    )) {
      return false;
    }

    return chat.id;
  }

  function sendMessage(
    chatId,
    message,
    options = {}
  ) {
    const id = String(chatId || "");

    const text = typeof message === "object"
      ? cleanText(message.text, 2000)
      : cleanText(message, 2000);

    if (!id || !text) return false;

    const item = {
      id: makeId("message"),
      chatId: id,
      sender: options.sender || "",
      text,
      fromMe: options.fromMe !== false,
      createdAt: new Date().toISOString(),
      time: Date.now()
    };

    const messages = getMessages();
    messages.push(item);

    if (!saveCollection(
      STORAGE.messages,
      messages,
      "send",
      item
    )) {
      return false;
    }

    return clone(item);
  }

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  function getNotifications() {
    return isArray(
      read(STORAGE.notifications, [])
    ).sort((a, b) =>
      new Date(b.createdAt || b.time || 0) -
      new Date(a.createdAt || a.time || 0)
    );
  }

  function addNotification(notification = {}) {
    if (
      !notification ||
      typeof notification !== "object"
    ) {
      return false;
    }

    const item = {
      ...clone(notification),
      id: notification.id ||
        makeId("notification"),
      text: cleanText(
        notification.text,
        500
      ),
      read: Boolean(notification.read),
      createdAt: notification.createdAt ||
        new Date().toISOString(),
      time: notification.time || Date.now()
    };

    if (!item.text) return false;

    const notifications = getNotifications();
    notifications.unshift(item);

    if (!saveCollection(
      STORAGE.notifications,
      notifications,
      "add",
      item
    )) {
      return false;
    }

    return clone(item);
  }

  function markNotificationsRead() {
    const notifications = getNotifications().map(
      item => ({
        ...item,
        read: true
      })
    );

    return saveCollection(
      STORAGE.notifications,
      notifications,
      "mark-read"
    );
  }

  function getUnreadNotificationCount() {
    return getNotifications().filter(
      item => !item.read
    ).length;
  }

  /* =======================================================
     SAVED POSTS
  ======================================================= */

  function getSavedPosts() {
    return isArray(
      read(STORAGE.saved, [])
    );
  }

  function savePost(postId) {
    const id = String(postId || "");

    if (!id) return false;

    const saved = getSavedPosts();

    if (
      saved.some(item => String(item) === id)
    ) {
      return true;
    }

    saved.push(id);

    return saveCollection(
      STORAGE.saved,
      saved,
      "save",
      { id }
    );
  }

  function unsavePost(postId) {
    const id = String(postId || "");
    const saved = getSavedPosts();

    const next = saved.filter(
      item => String(item) !== id
    );

    if (next.length === saved.length) {
      return false;
    }

    return saveCollection(
      STORAGE.saved,
      next,
      "unsave",
      { id }
    );
  }

  function toggleSavedPost(postId) {
    const id = String(postId || "");

    if (!id) return false;

    const exists = getSavedPosts().some(
      item => String(item) === id
    );

    return exists
      ? (unsavePost(id), false)
      : (savePost(id), true);
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return true;

    initialized = true;

    global.dispatchEvent(
      new CustomEvent("ksk:data-ready", {
        detail: {
          timestamp: Date.now()
        }
      })
    );

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  const api = Object.freeze({
    initialize,
    subscribe,

    // Posts
    getPosts,
    getPost,
    addPost,
    updatePost,
    deletePost,

    // Comments and replies
    getComments,
    getComment,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    setCommentReaction,
    getCommentCount,

    // Stories
    getStories,
    addStory,
    deleteStory,

    // Friends
    getFriends,
    addFriend,
    updateFriend,
    removeFriend,

    // Profile
    getProfile,
    saveProfile,

    // Messages
    getMessages,
    getChats,
    createChat,
    sendMessage,

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
