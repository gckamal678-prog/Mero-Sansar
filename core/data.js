
"use strict";

/*
 * KSK — SINGLE DATA LAYER (validated replacement)
 *
 * Keeps the existing public KSKData API and storage keys.
 * This remains browser-local storage, NOT authentication or a server database.
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
    name: "", bio: "", location: "", avatar: "", cover: ""
  });

  const listeners = new Set();
  let initialized = false;

  /* ------------------------- primitives ------------------------- */

  function clone(value) {
    if (value === undefined || value === null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
  }

  function isRecord(value) {
    return !!value &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function cleanText(value, maxLength = 5000) {
    return String(value ?? "").trim().slice(0, maxLength);
  }

  function validId(value) {
    return typeof value === "string" ||
      typeof value === "number"
      ? cleanText(value, 200).length > 0
      : false;
  }

  function toTime(value) {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) return value;

    if (
      typeof value !== "string" &&
      !(value instanceof Date)
    ) return NaN;

    const time = new Date(value).getTime();

    return Number.isFinite(time) ? time : NaN;
  }

  function makeId(prefix = "item") {
    const random = global.crypto?.randomUUID
      ? global.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return `${prefix}_${random}`;
  }

  function rawRead(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);

      if (raw === null) return clone(fallback);

      const parsed = JSON.parse(raw);

      return parsed === null
        ? clone(fallback)
        : parsed;

    } catch (error) {
      console.error(
        "KSK data read failed:",
        key,
        error
      );

      return clone(fallback);
    }
  }

  function readArray(key) {
    const value = rawRead(key, []);

    if (!Array.isArray(value)) {
      console.warn(
        "KSK data collection has invalid root type:",
        key
      );

      return [];
    }

    return value
      .filter(isRecord)
      .map(clone)
      .filter(Boolean);
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;

    } catch (error) {
      console.error(
        "KSK data save failed:",
        key,
        error
      );

      global.KSKToast?.error?.(
        "डाटा सुरक्षित गर्न सकिएन। भण्डारण क्षमता जाँच गर्नुहोस्।"
      );

      return false;
    }
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

    if (typeof global.CustomEvent === "function") {
      global.dispatchEvent(
        new global.CustomEvent(
          "ksk:data-change",
          { detail }
        )
      );
    }

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
    if (!Array.isArray(collection)) return false;

    const saved = write(key, collection);

    if (saved) {
      emit(key, action, item);
    }

    return saved;
  }

  function sortNewest(items) {
    return items.sort((a, b) => {
      const at = toTime(a.createdAt || a.time) || 0;
      const bt = toTime(b.createdAt || b.time) || 0;

      return bt - at;
    });
  }

  function uniqueById(items) {
    const seen = new Set();

    return items.filter(item => {
      if (!validId(item.id)) return false;

      const id = String(item.id);

      if (seen.has(id)) return false;

      seen.add(id);

      return true;
    });
  }

  /* ------------------------- schema normalization ------------------------- */

  // Read-time normalization is deliberately non-destructive:
  // malformed records are ignored by getters but are not silently
  // rewritten/deleted from storage.

  function normalizeComment(value, postId) {
    if (!isRecord(value) || !validId(value.id)) {
      return null;
    }

    if (typeof value.text !== "string") {
      return null;
    }

    return {
      ...clone(value),

      id: String(value.id),

      postId: String(value.postId || postId),

      text: cleanText(value.text, 3000),

      likes: Number.isFinite(Number(value.likes))
        ? Math.max(0, Number(value.likes))
        : 0,

      liked: Boolean(value.liked),

      mentions: Array.isArray(value.mentions)
        ? value.mentions.filter(isRecord).slice(0, 100)
        : [],

      parentId: value.parentId
        ? String(value.parentId)
        : null
    };
  }

  function normalizePost(value) {
    if (!isRecord(value) || !validId(value.id)) {
      return null;
    }

    const comments = Array.isArray(value.comments)
      ? uniqueById(
          value.comments
            .map(item => normalizeComment(item, value.id))
            .filter(Boolean)
        )
      : [];

    return {
      ...clone(value),

      id: String(value.id),

      text: cleanText(value.text, 10000),

      comments,

      createdAt: value.createdAt ||
        new Date(0).toISOString()
    };
  }

  function normalizeStory(value) {
    if (!isRecord(value) || !validId(value.id)) {
      return null;
    }

    // Invalid expiry values are retained for cleanup.
    return {
      ...clone(value),
      id: String(value.id)
    };
  }

  function normalizeFriend(value) {
    if (!isRecord(value) || !validId(value.id)) {
      return null;
    }

    const name = cleanText(value.name, 60);

    if (!name) return null;

    return {
      ...clone(value),
      id: String(value.id),
      name
    };
  }

  function normalizeMessage(value) {
    if (
      !isRecord(value) ||
      !validId(value.id) ||
      !validId(value.chatId)
    ) {
      return null;
    }

    if (
      typeof value.text !== "string" ||
      !cleanText(value.text, 2000)
    ) {
      return null;
    }

    return {
      ...clone(value),

      id: String(value.id),

      chatId: String(value.chatId),

      text: cleanText(value.text, 2000),

      sender: cleanText(value.sender, 60),

      fromMe: Boolean(value.fromMe)
    };
  }

  function normalizeChat(value) {
    if (!isRecord(value) || !validId(value.id)) {
      return null;
    }

    return {
      ...clone(value),

      id: String(value.id),

      userId: value.userId == null
        ? ""
        : String(value.userId),

      name: cleanText(
        value.name || "साथी",
        60
      ),

      avatar: cleanText(value.avatar, 200000),

      messages: []
    };
  }

  function normalizeNotification(value) {
    if (!isRecord(value) || !validId(value.id)) {
      return null;
    }

    const text = cleanText(value.text, 500);

    if (!text) return null;

    return {
      ...clone(value),
      id: String(value.id),
      text,
      read: Boolean(value.read)
    };
  }

  function getRawStories() {
    return uniqueById(
      readArray(STORAGE.stories)
        .map(normalizeStory)
        .filter(Boolean)
    );
  }

  /* ------------------------- posts ------------------------- */

  function getPosts() {
    return sortNewest(
      uniqueById(
        readArray(STORAGE.posts)
          .map(normalizePost)
          .filter(Boolean)
      )
    );
  }

  function getPost(postId) {
    const id = String(postId || "");

    const post = getPosts().find(
      item => item.id === id
    );

    return post ? clone(post) : null;
  }

  function addPost(post = {}) {
    if (!isRecord(post)) return false;

    const item = normalizePost({
      ...clone(post),

      id: validId(post.id)
        ? String(post.id)
        : makeId("post"),

      text: cleanText(post.text, 10000),

      comments: Array.isArray(post.comments)
        ? post.comments
        : [],

      createdAt: post.createdAt ||
        new Date().toISOString()
    });

    if (
      !item ||
      (!item.text && !item.mediaId && !item.mediaData)
    ) {
      return false;
    }

    const posts = getPosts();

    if (posts.some(existing => existing.id === item.id)) {
      return false;
    }

    posts.unshift(item);

    return saveCollection(
      STORAGE.posts,
      posts,
      "add",
      item
    ) ? clone(item) : false;
  }

  function updatePost(postId, changes = {}) {
    const id = String(postId || "");

    if (!id || !isRecord(changes)) return false;

    const posts = getPosts();

    const index = posts.findIndex(
      post => post.id === id
    );

    if (index < 0) return false;

    const updated = normalizePost({
      ...posts[index],
      ...clone(changes),

      id: posts[index].id,

      comments: Object.prototype.hasOwnProperty.call(
        changes,
        "comments"
      )
        ? changes.comments
        : posts[index].comments,

      text: Object.prototype.hasOwnProperty.call(
        changes,
        "text"
      )
        ? cleanText(changes.text, 10000)
        : posts[index].text
    });

    if (!updated) return false;

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

    if (!id) return false;

    const posts = getPosts();

    const next = posts.filter(
      post => post.id !== id
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

  /* ------------------------- comments ------------------------- */

  function getComments(postId) {
    const post = getPost(postId);

    return post
      ? sortNewest(post.comments.slice())
      : [];
  }

  function getComment(postId, commentId) {
    const id = String(commentId || "");

    const item = getComments(postId).find(
      comment => comment.id === id
    );

    return item ? clone(item) : null;
  }

  function replacePostInList(postId, updatedPost) {
    const posts = getPosts();

    const index = posts.findIndex(
      post => post.id === String(postId)
    );

    if (index >= 0) {
      posts[index] = updatedPost;
    }

    return posts;
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
      !isRecord(comment) ||
      !isRecord(options)
    ) {
      return false;
    }

    const text = cleanText(comment.text, 3000);

    if (!text) return false;

    const comments = post.comments.slice();

    const parentId = String(
      options.parentId ||
      comment.parentId ||
      ""
    );

    if (
      parentId &&
      !comments.some(item => item.id === parentId)
    ) {
      return false;
    }

    const item = normalizeComment({
      ...clone(comment),

      id: validId(comment.id)
        ? String(comment.id)
        : makeId("comment"),

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

      mentions: Array.isArray(
        options.mentions || comment.mentions
      )
        ? (options.mentions || comment.mentions)
            .filter(isRecord)
            .slice(0, 100)
        : [],

      likes: Number(comment.likes || 0),

      liked: Boolean(comment.liked),

      createdAt: comment.createdAt ||
        new Date().toISOString(),

      editedAt: null
    }, id);

    if (
      !item ||
      comments.some(existing => existing.id === item.id)
    ) {
      return false;
    }

    comments.push(item);

    const updated = {
      ...post,
      comments
    };

    return saveCollection(
      STORAGE.posts,
      replacePostInList(id, updated),
      parentId ? "reply-add" : "comment-add",
      item
    ) ? clone(item) : false;
  }

  function updateComment(
    postId,
    commentId,
    changes = {}
  ) {
    const id = String(postId || "");
    const cid = String(commentId || "");

    const post = getPost(id);

    if (!post || !cid || !isRecord(changes)) {
      return false;
    }

    const comments = post.comments.slice();

    const index = comments.findIndex(
      item => item.id === cid
    );

    if (index < 0) return false;

    const updated = normalizeComment({
      ...comments[index],
      ...clone(changes),

      id: comments[index].id,

      postId: id,

      editedAt: new Date().toISOString()
    }, id);

    if (!updated || !updated.text) {
      return false;
    }

    comments[index] = updated;

    return saveCollection(
      STORAGE.posts,
      replacePostInList(
        id,
        { ...post, comments }
      ),
      "comment-update",
      updated
    );
  }

  function deleteComment(postId, commentId) {
    const id = String(postId || "");
    const targetId = String(commentId || "");

    const post = getPost(id);

    if (!post || !targetId) return false;

    const comments = post.comments.slice();

    if (!comments.some(item => item.id === targetId)) {
      return false;
    }

    const ids = new Set([targetId]);

    let changed = true;

    while (changed) {
      changed = false;

      comments.forEach(item => {
        if (
          item.parentId &&
          ids.has(String(item.parentId)) &&
          !ids.has(item.id)
        ) {
          ids.add(item.id);
          changed = true;
        }
      });
    }

    const next = comments.filter(
      item => !ids.has(item.id)
    );

    return saveCollection(
      STORAGE.posts,
      replacePostInList(
        id,
        { ...post, comments: next }
      ),
      "comment-delete",
      {
        id: targetId,
        postId: id,
        deletedIds: [...ids]
      }
    );
  }

  function toggleCommentLike(postId, commentId) {
    const post = getPost(postId);

    if (!post) return false;

    const comments = post.comments.slice();

    const index = comments.findIndex(
      item => item.id === String(commentId)
    );

    if (index < 0) return false;

    const old = comments[index];
    const liked = !old.liked;

    const counts = isRecord(old.reactionCounts)
      ? { ...old.reactionCounts }
      : {};

    if (!liked && old.myReaction) {
      counts[old.myReaction] = Math.max(
        0,
        Number(counts[old.myReaction] || 0) - 1
      );
    }

    comments[index] = {
      ...old,

      liked,

      myReaction: liked
        ? (old.myReaction || "")
        : "",

      reactionCounts: counts,

      likes: Math.max(
        0,
        Number(old.likes || 0) + (liked ? 1 : -1)
      )
    };

    return saveCollection(
      STORAGE.posts,
      replacePostInList(
        post.id,
        { ...post, comments }
      ),
      "comment-like",
      comments[index]
    );
  }

  function setCommentReaction(
    postId,
    commentId,
    emoji
  ) {
    const allowed = [
      "🌹",
      "😘",
      "😢",
      "😠",
      "🤓"
    ];

    if (emoji && !allowed.includes(emoji)) {
      return false;
    }

    const post = getPost(postId);

    if (!post) return false;

    const comments = post.comments.slice();

    const index = comments.findIndex(
      item => item.id === String(commentId)
    );

    if (index < 0) return false;

    const old = comments[index];
    const previous = old.myReaction || "";

    const counts = isRecord(old.reactionCounts)
      ? { ...old.reactionCounts }
      : {};

    let likes = Math.max(
      0,
      Number(old.likes || 0)
    );

    if (previous === emoji) {
      counts[emoji] = Math.max(
        0,
        Number(counts[emoji] || 0) - 1
      );

      likes = Math.max(0, likes - 1);

      comments[index] = {
        ...old,
        liked: false,
        myReaction: "",
        reactionCounts: counts,
        likes
      };

    } else {
      if (previous) {
        counts[previous] = Math.max(
          0,
          Number(counts[previous] || 0) - 1
        );
      }

      if (!old.liked) likes += 1;

      if (emoji) {
        counts[emoji] =
          Number(counts[emoji] || 0) + 1;
      }

      comments[index] = {
        ...old,
        liked: Boolean(emoji),
        myReaction: emoji || "",
        reactionCounts: counts,
        likes
      };
    }

    return saveCollection(
      STORAGE.posts,
      replacePostInList(
        post.id,
        { ...post, comments }
      ),
      "comment-reaction",
      comments[index]
    );
  }

  function getCommentCount(postId) {
    return getComments(postId).length;
  }

  /* ------------------------- stories ------------------------- */

  function isStoryActive(story, now = Date.now()) {
    if (
      !story ||
      story.expiresAt == null ||
      story.expiresAt === ""
    ) {
      return true;
    }

    const expiry = toTime(story.expiresAt);

    return Number.isFinite(expiry) && expiry > now;
  }

  function cleanupExpiredStories(options = {}) {
    const now = Number.isFinite(options.now)
      ? options.now
      : Date.now();

    const raw = getRawStories();

    const active = raw.filter(
      story => isStoryActive(story, now)
    );

    const removed = raw.length - active.length;

    if (removed > 0 && options.persist !== false) {
      if (!write(STORAGE.stories, active)) {
        return {
          success: false,
          removed: 0
        };
      }

      emit(
        STORAGE.stories,
        "expire-cleanup",
        { removed }
      );
    }

    return {
      success: true,
      removed
    };
  }

  function getStories(includeExpired = false) {
    const stories = getRawStories();

    if (includeExpired) {
      return sortNewest(stories);
    }

    cleanupExpiredStories();

    return sortNewest(
      stories.filter(story => isStoryActive(story))
    );
  }

  function addStory(story = {}) {
    if (!isRecord(story)) return false;

    const now = Date.now();

    cleanupExpiredStories();

    const item = normalizeStory({
      ...clone(story),

      id: validId(story.id)
        ? String(story.id)
        : makeId("story"),

      createdAt: story.createdAt ||
        new Date(now).toISOString(),

      expiresAt: story.expiresAt ||
        new Date(
          now + 24 * 60 * 60 * 1000
        ).toISOString()
    });

    if (
      !item ||
      (
        !item.mediaId &&
        !item.mediaData &&
        !cleanText(item.text, 5000)
      )
    ) {
      return false;
    }

    if (!isStoryActive(item, now)) {
      return false;
    }

    const stories = getRawStories().filter(
      existing => isStoryActive(existing, now)
    );

    if (stories.some(existing => existing.id === item.id)) {
      return false;
    }

    stories.unshift(item);

    return saveCollection(
      STORAGE.stories,
      stories,
      "add",
      item
    ) ? clone(item) : false;
  }

  function deleteStory(storyId) {
    const id = String(storyId || "");

    if (!id) return false;

    const stories = getRawStories();

    const next = stories.filter(
      story => story.id !== id
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

  /* ------------------------- friends ------------------------- */

  function getFriends() {
    return uniqueById(
      readArray(STORAGE.friends)
        .map(normalizeFriend)
        .filter(Boolean)
    );
  }

  function addFriend(friend) {
    const source = typeof friend === "string"
      ? { name: friend }
      : friend;

    if (!isRecord(source)) return false;

    const name = cleanText(source.name, 60);

    if (!name) return false;

    const friends = getFriends();

    if (
      friends.some(
        item => item.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return false;
    }

    const item = normalizeFriend({
      ...clone(source),

      id: validId(source.id)
        ? String(source.id)
        : makeId("friend"),

      name,

      avatar: source.avatar ||
        source.initial ||
        name.charAt(0),

      createdAt: source.createdAt ||
        new Date().toISOString()
    });

    if (!item) return false;

    friends.unshift(item);

    return saveCollection(
      STORAGE.friends,
      friends,
      "add",
      item
    ) ? clone(item) : false;
  }

  function updateFriend(friendId, changes = {}) {
    const id = String(friendId || "");

    if (!id || !isRecord(changes)) return false;

    const friends = getFriends();

    const index = friends.findIndex(
      item => item.id === id
    );

    if (index < 0) return false;

    const updated = normalizeFriend({
      ...friends[index],
      ...clone(changes),
      id: friends[index].id
    });

    if (!updated) return false;

    friends[index] = updated;

    return saveCollection(
      STORAGE.friends,
      friends,
      "update",
      updated
    );
  }

  function removeFriend(friendId) {
    const id = String(friendId || "");

    const friends = getFriends();

    const next = friends.filter(
      item => item.id !== id
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

  /* ------------------------- profile ------------------------- */

  function getProfile() {
    const profile = rawRead(
      STORAGE.profile,
      DEFAULT_PROFILE
    );

    return {
      ...clone(DEFAULT_PROFILE),

      ...(isRecord(profile)
        ? clone(profile)
        : {})
    };
  }

  function saveProfile(profile = {}) {
    if (!isRecord(profile)) return false;

    const current = getProfile();

    const next = {
      ...current,
      ...clone(profile)
    };

    next.name = cleanText(next.name, 60);
    next.bio = cleanText(next.bio, 240);
    next.location = cleanText(next.location, 100);
    next.avatar = cleanText(next.avatar, 200000);
    next.cover = cleanText(next.cover, 200000);

    if (!write(STORAGE.profile, next)) {
      return false;
    }

    emit("profile", "update", next);

    return clone(next);
  }

  /* ------------------------- chats and messages ------------------------- */

  function getMessages() {
    return uniqueById(
      readArray(STORAGE.messages)
        .map(normalizeMessage)
        .filter(Boolean)
    ).sort((a, b) =>
      (
        toTime(a.createdAt || a.time) || 0
      ) - (
        toTime(b.createdAt || b.time) || 0
      )
    );
  }

  function getStoredChats() {
    return uniqueById(
      readArray(STORAGE.chats)
        .map(normalizeChat)
        .filter(Boolean)
    );
  }

  function getChats() {
    // Only persisted chat records are authoritative.
    // Messages whose chatId has no corresponding chat
    // are orphan records and are not promoted into fake chats.

    const messages = getMessages();

    return getStoredChats().map(chat => ({
      ...chat,

      messages: messages
        .filter(message => message.chatId === chat.id)
        .map(message => ({
          ...message,

          time: message.time ||
            message.createdAt ||
            Date.now()
        }))
        .sort((a, b) =>
          (
            toTime(a.time || a.createdAt) || 0
          ) - (
            toTime(b.time || b.createdAt) || 0
          )
        )
    }));
  }

  function createChat(friend = {}) {
    if (!isRecord(friend) || !validId(friend.id)) {
      return false;
    }

    const userId = String(friend.id);

    const chats = getStoredChats();

    const existing = chats.find(
      chat => chat.userId === userId
    );

    if (existing) return existing.id;

    const chat = normalizeChat({
      id: makeId("chat"),

      userId,

      name: cleanText(
        friend.name || "साथी",
        60
      ),

      avatar: friend.avatar ||
        friend.initial ||
        "",

      createdAt: new Date().toISOString()
    });

    if (!chat) return false;

    const stored = getStoredChats();

    stored.unshift(chat);

    return saveCollection(
      STORAGE.chats,
      stored,
      "add",
      chat
    ) ? chat.id : false;
  }

  function sendMessage(
    chatId,
    message,
    options = {}
  ) {
    const id = String(chatId || "");

    if (
      !id ||
      (!isRecord(options) && options !== undefined)
    ) {
      return false;
    }

    // A message can only be added to a persisted chat.
    const chatExists = getStoredChats().some(
      chat => chat.id === id
    );

    if (!chatExists) {
      console.warn(
        "KSKData.sendMessage: chat does not exist:",
        id
      );

      return false;
    }

    const text = cleanText(
      isRecord(message)
        ? message.text
        : message,
      2000
    );

    if (!text) return false;

    const messages = getMessages();

    const item = normalizeMessage({
      id: makeId("message"),

      chatId: id,

      sender: cleanText(options.sender, 60),

      text,

      fromMe: options.fromMe !== false,

      createdAt: new Date().toISOString(),

      time: Date.now()
    });

    if (!item) return false;

    messages.push(item);

    return saveCollection(
      STORAGE.messages,
      messages,
      "send",
      item
    ) ? clone(item) : false;
  }

  /* ------------------------- notifications ------------------------- */

  function getNotifications() {
    return sortNewest(
      uniqueById(
        readArray(STORAGE.notifications)
          .map(normalizeNotification)
          .filter(Boolean)
      )
    );
  }

  function addNotification(notification = {}) {
    if (!isRecord(notification)) return false;

    const item = normalizeNotification({
      ...clone(notification),

      id: validId(notification.id)
        ? String(notification.id)
        : makeId("notification"),

      text: cleanText(notification.text, 500),

      read: Boolean(notification.read),

      createdAt: notification.createdAt ||
        new Date().toISOString(),

      time: notification.time || Date.now()
    });

    if (!item) return false;

    const notifications = getNotifications();

    if (
      notifications.some(
        existing => existing.id === item.id
      )
    ) {
      return false;
    }

    notifications.unshift(item);

    return saveCollection(
      STORAGE.notifications,
      notifications,
      "add",
      item
    ) ? clone(item) : false;
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

  /* ------------------------- saved posts ------------------------- */

  function getSavedPosts() {
    const value = rawRead(STORAGE.saved, []);

    if (!Array.isArray(value)) return [];

    return [
      ...new Set(
        value
          .filter(item => validId(item))
          .map(String)
      )
    ];
  }

  function savePost(postId) {
    const id = String(postId || "");

    if (!id) return false;

    const saved = getSavedPosts();

    if (saved.includes(id)) return true;

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

    if (!id) return false;

    const saved = getSavedPosts();

    const next = saved.filter(
      item => item !== id
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

    const exists = getSavedPosts().includes(id);

    const success = exists
      ? unsavePost(id)
      : savePost(id);

    return success
      ? getSavedPosts().includes(id)
      : false;
  }

  /* ------------------------- initialization ------------------------- */

  function initialize() {
    if (initialized) return true;

    initialized = true;

    cleanupExpiredStories();

    if (typeof global.CustomEvent === "function") {
      global.dispatchEvent(
        new global.CustomEvent(
          "ksk:data-ready",
          {
            detail: {
              timestamp: Date.now()
            }
          }
        )
      );
    }

    return true;
  }

  /* ------------------------- public API ------------------------- */

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
    cleanupExpiredStories,

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

  if (global.document?.readyState === "loading") {
    global.document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})(window);
