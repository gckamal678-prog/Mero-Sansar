"use strict";

(function (global) {
  const PREFIX = "hs_feature_";

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Feature storage error:", error);
      return false;
    }
  }

  const demoFriends = [
    { id: "u1", name: "सुमन थापा", avatar: "स", status: "अनलाइन" },
    { id: "u2", name: "रीता शर्मा", avatar: "र", status: "केही समयअघि" },
    { id: "u3", name: "प्रकाश गुरुङ", avatar: "प", status: "अनलाइन" }
  ];

  const demoChats = [
    {
      id: "c1",
      userId: "u1",
      name: "सुमन थापा",
      avatar: "स",
      messages: [{ id: "m1", text: "नमस्ते! कस्तो छ?", fromMe: false, time: Date.now() - 60000 }]
    },
    {
      id: "c2",
      userId: "u2",
      name: "रीता शर्मा",
      avatar: "र",
      messages: [{ id: "m2", text: "पोस्ट राम्रो लाग्यो 😊", fromMe: false, time: Date.now() - 3600000 }]
    }
  ];

  function getFriends() {
    return read("friends", demoFriends);
  }

  function setFriends(friends) {
    return write("friends", friends);
  }

  function addFriend(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return false;

    const friends = getFriends();
    if (friends.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      return false;
    }

    friends.unshift({
      id: "u" + Date.now(),
      name: cleanName,
      avatar: cleanName.charAt(0),
      status: "नयाँ साथी"
    });

    return setFriends(friends);
  }

  function removeFriend(id) {
    return setFriends(getFriends().filter((friend) => friend.id !== id));
  }

  function getChats() {
    return read("chats", demoChats);
  }

  function sendMessage(chatId, text) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return false;

    const chats = getChats();
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return false;

    chat.messages.push({
      id: "m" + Date.now(),
      text: cleanText,
      fromMe: true,
      time: Date.now()
    });

    return write("chats", chats);
  }

  function createChat(friend) {
    const chats = getChats();
    let chat = chats.find((item) => item.userId === friend.id);

    if (!chat) {
      chat = {
        id: "c" + Date.now(),
        userId: friend.id,
        name: friend.name,
        avatar: friend.avatar || friend.name.charAt(0),
        messages: []
      };
      chats.unshift(chat);
      write("chats", chats);
    }

    return chat.id;
  }

  function getNotifications() {
    return read("notifications", [
      { id: "n1", text: "सुमन थापाले तपाईंको पोस्ट मन पराउनुभयो।", time: Date.now() - 1800000, read: false },
      { id: "n2", text: "रीता शर्माले तपाईंलाई साथी बन्न अनुरोध गर्नुभयो।", time: Date.now() - 7200000, read: false },
      { id: "n3", text: "तपाईंको नयाँ पोस्ट प्रकाशित भयो।", time: Date.now() - 86400000, read: true }
    ]);
  }

  function markNotificationsRead() {
    const notifications = getNotifications().map((item) => ({ ...item, read: true }));
    return write("notifications", notifications);
  }

  function getProfile() {
    return read("profile", {
      name: "हाम्रो संसार सदस्य",
      bio: "हाम्रो संसारमा स्वागत छ!",
      location: "",
      avatar: "ह"
    });
  }

  function saveProfile(profile) {
    const current = getProfile();
    return write("profile", { ...current, ...profile });
  }

  function getSavedPosts() {
    return read("savedPosts", []);
  }

  function toggleSavedPost(postId) {
    const saved = getSavedPosts();
    const exists = saved.includes(String(postId));
    const next = exists
      ? saved.filter((id) => id !== String(postId))
      : [...saved, String(postId)];

    write("savedPosts", next);
    return !exists;
  }

  global.HamroData = Object.freeze({
    getFriends, addFriend, removeFriend,
    getChats, sendMessage, createChat,
    getNotifications, markNotificationsRead,
    getProfile, saveProfile,
    getSavedPosts, toggleSavedPost
  });
})(window);
