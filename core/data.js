"use strict";

/*
 * KSK — SINGLE DATA LAYER
 * Central data access for every application feature.
 *
 * All features must use window.KSKData.
 * No feature should access localStorage directly.
 */

(function (global) {
  const STORAGE = Object.freeze({
    posts: "ksk_posts_v2",
    oldPosts: "ksk_posts_v1",
    stories: "ksk_stories_v1",
    friends: "ksk_friends_v1",
    messages: "ksk_messages_v1",
    profile: "ksk_profile_v1",
    saved: "ksk_saved_v1",
    notifications: "ksk_notifications_v1",
    chats: "ksk_feature_chats",
    featureFriends: "ksk_feature_friends",
    featureProfile: "ksk_feature_profile",
    featureNotifications: "ksk_feature_notifications",
    featureSaved: "ksk_feature_savedPosts"
  });

  const DEFAULT_PROFILE = Object.freeze({
    name: "",
    bio: "",
    location: "",
    avatar: ""
  });

  const listeners = new Set();

  let initialized = false;

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

      return value === null ? clone(fallback) : value;
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
        "डाटा सुरक्षित गर्न सकिएन। फेरि प्रयास गर्नुहोस्।"
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

    listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch (error) {
        console.error("KSK data listener failed:", error);
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
      throw new TypeError("KSKData subscriber must be a function.");
    }

    listeners.add(listener);

    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function saveCollection(key, collection, action, item) {
    const saved = write(key, collection);

    if (saved) {
      emit(key, action, item);
    }

    return saved;
  }

  /* =========================================
     LEGACY DATA MIGRATION
     ========================================= */

  function migrateLegacyData() {
    let migrated = [];

    const migrations = [
      {
        target: STORAGE.posts,
        sources: [STORAGE.oldPosts]
      },
      {
        target: STORAGE.friends,
        sources: [STORAGE.featureFriends]
      },
      {
        target: STORAGE.profile,
        sources: [STORAGE.featureProfile]
      },
      {
        target: STORAGE.notifications,
        sources: [STORAGE.featureNotifications]
      },
      {
        target: STORAGE.saved,
        sources: [STORAGE.featureSaved]
      }
    ];

    migrations.forEach((migration) => {
      try {
        const existing = global.localStorage.getItem(
          migration.target
        );

        if (existing !== null) {
          return;
        }

        for (const source of migration.sources) {
          const oldValue = global.localStorage.getItem(source);

          if (oldValue === null) {
            continue;
          }

          const parsed = JSON.parse(oldValue);

          if (parsed !== null && parsed !== undefined) {
            if (write(migration.target, parsed)) {
              migrated.push({
                from: source,
                to: migration.target
              });
            }
          }

          break;
        }
      } catch (error) {
        console.error("KSK migration failed:", error);
      }
    });

    return migrated;
  }

  /* =========================================
     POSTS
     ========================================= */

  function getPosts() {
    const posts = read(STORAGE.posts, null);

    if (Array.isArray(posts)) {
      return posts.sort((a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );
    }

    const oldPosts = read(STORAGE.oldPosts, []);

    return isArray(oldPosts).sort((a, b) =>
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
    );
  }

  function addPost(post = {}) {
    if (!post || typeof post !== "object") {
      return false;
    }

    const item = {
      ...clone(post),
      id: post.id || makeId("post"),
      text: cleanText(post.text, 10000),
      createdAt: post.createdAt || new Date().toISOString()
    };

    if (!item.text && !item.mediaId && !item.mediaData) {
      return false;
    }

    const posts = getPosts();

    posts.unshift(item);

    if (!saveCollection(STORAGE.posts, posts, "add", item)) {
      return false;
    }

    return clone(item);
  }

  function updatePost(postId, changes = {}) {
    const id = String(postId || "");

    if (!id || !changes || typeof changes !== "object") {
      return false;
    }

    const posts = getPosts();
    const index = posts.findIndex(
      (post) => String(post.id) === id
    );

    if (index === -1) {
      return false;
    }

    const updated = {
      ...posts[index],
      ...clone(changes),
      id: posts[index].id
    };

    if (Object.prototype.hasOwnProperty.call(changes, "text")) {
      updated.text = cleanText(changes.text, 10000);
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
      (post) => String(post.id) !== id
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

  function getPost(postId) {
    const id = String(postId || "");

    const post = getPosts().find(
      (item) => String(item.id) === id
    );

    return post ? clone(post) : null;
  }

  /* =========================================
     STORIES
     ========================================= */

  function getStories(includeExpired = false) {
    const now = Date.now();

    return read(STORAGE.stories, [])
      .filter((story) => {
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
      createdAt: story.createdAt || new Date(now).toISOString(),
      expiresAt: story.expiresAt ||
        new Date(now + 24 * 60 * 60 * 1000).toISOString()
    };

    if (!item.mediaId && !item.mediaData && !item.text) {
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
      (story) => String(story.id) !== id
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

  /* =========================================
     FRIENDS
     ========================================= */

  function getFriends() {
    return isArray(read(STORAGE.friends, []));
  }

  function addFriend(friend) {
    const item = typeof friend === "string"
      ? {
          name: cleanText(friend, 60)
        }
      : clone(friend || {});

    const name = cleanText(item.name, 60);

    if (!name) {
      return false;
    }

    const friends = getFriends();

    const duplicate = friends.some((existing) =>
      String(existing.name || "").toLowerCase() ===
      name.toLowerCase()
    );

    if (duplicate) {
      return false;
    }

    const newFriend = {
      ...item,
      id: item.id || makeId("friend"),
      name,
      avatar: item.avatar || item.initial || name.charAt(0),
      createdAt: item.createdAt || new Date().toISOString()
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

  function updateFriend(friendId, changes = {}) {
    const id = String(friendId || "");
    const friends = getFriends();

    const index = friends.findIndex(
      (friend) => String(friend.id) === id
    );

    if (index === -1) {
      return false;
    }

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
      (friend) => String(friend.id) !== id
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

  /* =========================================
     PROFILE
     ========================================= */

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

    if (Object.prototype.hasOwnProperty.call(profile, "name")) {
      next.name = cleanText(profile.name, 60);
    }

    if (Object.prototype.hasOwnProperty.call(profile, "bio")) {
      next.bio = cleanText(profile.bio, 240);
    }

    if (Object.prototype.hasOwnProperty.call(profile, "location")) {
      next.location = cleanText(profile.location, 100);
    }

    if (!write(STORAGE.profile, next)) {
      return false;
    }

    emit("profile", "update", next);

    return clone(next);
  }

  /* =========================================
     MESSAGES AND CHATS
     ========================================= */

  function getMessages() {
    return isArray(read(STORAGE.messages, []))
      .sort((a, b) =>
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

    storedChats.forEach((chat) => {
      chatsById.set(String(chat.id), {
        ...chat,
        messages: isArray(chat.messages)
      });
    });

    messages.forEach((message) => {
      const chatId = String(message.chatId || "general");

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
        (item) => String(item.id) === String(message.id)
      );

      if (!exists) {
        chat.messages.push({
          ...message,
          text: message.text || "",
          fromMe: Boolean(message.fromMe),
          time: message.time || message.createdAt || Date.now()
        });
      }
    });

    return [...chatsById.values()].map((chat) => ({
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

    const existing = chats.find((chat) =>
      String(chat.userId) === String(friend.id)
    );

    if (existing) {
      return existing.id;
    }

    const chat = {
      id: makeId("chat"),
      userId: friend.id || "",
      name: cleanText(friend.name || "साथी", 60),
      avatar: friend.avatar || friend.initial || "",
      messages: [],
      createdAt: new Date().toISOString()
    };

    const stored = isArray(read(STORAGE.chats, []));

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

  function sendMessage(chatId, message, options = {}) {
    const id = String(chatId || "");

    const text = typeof message === "object"
      ? cleanText(message.text, 2000)
      : cleanText(message, 2000);

    if (!id || !text) {
      return false;
    }

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

  /* =========================================
     NOTIFICATIONS
     ========================================= */

  function getNotifications() {
    return isArray(read(STORAGE.notifications, []))
      .sort((a, b) =>
        new Date(b.createdAt || b.time || 0) -
        new Date(a.createdAt || a.time || 0)
      );
  }

  function addNotification(notification = {}) {
    if (!notification || typeof notification !== "object") {
      return false;
    }

    const item = {
      ...clone(notification),
      id: notification.id || makeId("notification"),
      text: cleanText(notification.text, 500),
      read: Boolean(notification.read),
      createdAt: notification.createdAt || new Date().toISOString(),
      time: notification.time || Date.now()
    };

    if (!item.text) {
      return false;
    }

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
    const notifications = getNotifications().map((item) => ({
      ...item,
      read: true
    }));

    return saveCollection(
      STORAGE.notifications,
      notifications,
      "mark-read"
    );
  }

  function getUnreadNotificationCount() {
    return getNotifications().filter(
      (item) => !item.read
    ).length;
  }

  /* =========================================
     SAVED POSTS
     ========================================= */

  function getSavedPosts() {
    return isArray(read(STORAGE.saved, []));
  }

  function savePost(postId) {
    const id = String(postId || "");

    if (!id) return false;

    const saved = getSavedPosts();

    if (saved.some((item) => String(item) === id)) {
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
      (item) => String(item) !== id
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
      (item) => String(item) === id
    );

    return exists
      ? (unsavePost(id), false)
      : (savePost(id), true);
  }

  /* =========================================
     DATA INITIALIZATION
     ========================================= */

  function initialize() {
    if (initialized) {
      return true;
    }

    initialized = true;

    const migrations = migrateLegacyData();

    global.dispatchEvent(
      new CustomEvent("ksk:data-ready", {
        detail: {
          migrations,
          timestamp: Date.now()
        }
      })
    );

    return true;
  }

  /* =========================================
     PUBLIC API
     ========================================= */

  const api = Object.freeze({
    initialize,
    subscribe,

    getPosts,
    getPost,
    addPost,
    updatePost,
    deletePost,

    getStories,
    addStory,
    deleteStory,

    getFriends,
    addFriend,
    updateFriend,
    removeFriend,

    getProfile,
    saveProfile,

    getMessages,
    getChats,
    createChat,
    sendMessage,

    getNotifications,
    addNotification,
    markNotificationsRead,
    getUnreadNotificationCount,

    getSavedPosts,
    savePost,
    unsavePost,
    toggleSavedPost,

    migrateLegacyData,
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
