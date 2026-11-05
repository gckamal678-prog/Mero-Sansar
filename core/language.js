"use strict";

/* Hamro Sansar — Nepali / English language controller */
(function (global) {
  const dictionaries = {
    ne: {
      appName: "हाम्रो संसार",
      tagline: "साथी जोडौँ, कुरा गरौँ",
      home: "होम",
      posts: "पोस्ट",
      create: "बनाउनुहोस्",
      messages: "सन्देश",
      profile: "प्रोफाइल",
      settings: "सेटिङ",
      stories: "स्टोरीहरू",
      addStory: "＋ स्टोरी",
      writePost: "तपाईं के सोच्दै हुनुहुन्छ?",
      photo: "फोटो",
      video: "भिडियो",
      feeling: "भावना",
      feed: "पोस्टहरू",
      latest: "नयाँ",
      emptyFeed: "अहिलेसम्म पोस्ट छैन। पहिलो पोस्ट तपाईं गर्नुहोस्!",
      searchPlaceholder: "साथी वा पोस्ट खोज्नुहोस्...",
      theme: "रङ्ग शैली",
      language: "भाषा",
      light: "Light",
      dark: "Dark",
      nepali: "नेपाली",
      english: "English",
      storiesLater: "स्टोरी सुविधा अर्को चरणमा जोडिनेछ।",
      commentsLater: "टिप्पणी सुविधा अर्को चरणमा जोडिनेछ।",
      messagesLater: "सन्देश सुविधा अर्को चरणमा जोडिनेछ।",
      profileLater: "प्रोफाइल सुविधा अर्को चरणमा थपिनेछ।",
      friendsLater: "साथी सुविधा क्रमशः थपिनेछ।",
      notifications: "सूचनाहरू",
      saved: "सेभ गरिएका पोस्टहरू",
      friends: "साथीहरू",
      search: "खोज्नुहोस्",
      publish: "प्रकाशित गर्नुहोस्",
      cancel: "रद्द",
      close: "बन्द",
      remove: "हटाउनुहोस्",
      delete: "मेटाउनुहोस्",
      change: "बदल्नुहोस्",
      addFriend: "साथी थप्नुहोस्",
      friendName: "साथीको नाम लेख्नुहोस्",
      noFriends: "अहिलेसम्म साथी छैन।",
      connectFriends: "साथी जोड्नुहोस् र कुराकानी सुरु गर्नुहोस्।",
      noNotifications: "अहिले नयाँ सूचना छैन।",
      noSavedPosts: "अहिलेसम्म सेभ गरिएको पोस्ट छैन।",
      appPreferences: "एपको प्राथमिकता व्यवस्थापन गर्नुहोस्।",
      themeDescription: "Light वा Dark mode",
      languageDescription: "एपको भाषा छान्नुहोस्।",
      notificationSettings: "सूचना",
      notificationDescription: "एपका सूचना देखाउने",
      compactMode: "Compact layout",
      compactDescription: "कम ठाउँमा सामग्री देखाउने",
      localData: "स्थानीय demo data",
      localDataDescription: "Friends, chats, notifications र profile demo data",
      clearDemoData: "Demo data हटाउनुहोस्",
      clearDemoConfirm: "स्थानीय demo data हटाउने?",
      resetSettings: "सेटिङ पूर्ववत्",
      resetSettingsConfirm: "सेटिङ पूर्ववत् गर्ने?",
      settingsSaved: "सेटिङ सुरक्षित भयो।",
      settingsReset: "सेटिङ पूर्ववत् भयो।",
      demoDataCleared: "Demo data हटाइयो।",
      on: "चालु",
      off: "बन्द",
      post: "पोस्ट",
      comment: "टिप्पणी",
      like: "लाइक",
      share: "शेयर",
      more: "थप",
      pageUnavailable: "यो पृष्ठ उपलब्ध छैन",
      moduleNotLoaded: "यस पृष्ठको module load भएको छैन।",
      pageError: "पृष्ठ खोल्न समस्या भयो",
      later: "अर्को चरणमा थपिनेछ।"
    },

    en: {
      appName: "Hamro Sansar",
      tagline: "Connect friends, share moments",
      home: "Home",
      posts: "Posts",
      create: "Create",
      messages: "Messages",
      profile: "Profile",
      settings: "Settings",
      stories: "Stories",
      addStory: "+ Story",
      writePost: "What are you thinking?",
      photo: "Photo",
      video: "Video",
      feeling: "Feeling",
      feed: "Posts",
      latest: "Latest",
      emptyFeed: "No posts yet. Be the first to post!",
      searchPlaceholder: "Search friends or posts...",
      theme: "Theme",
      language: "Language",
      light: "Light",
      dark: "Dark",
      nepali: "Nepali",
      english: "English",
      storiesLater: "Stories will be added in a later step.",
      commentsLater: "Comments will be added in a later step.",
      messagesLater: "Messaging will be added in a later step.",
      profileLater: "Profile features will be added in a later step.",
      friendsLater: "Friend features will be added gradually.",
      notifications: "Notifications",
      saved: "Saved posts",
      friends: "Friends",
      search: "Search",
      publish: "Publish",
      cancel: "Cancel",
      close: "Close",
      remove: "Remove",
      delete: "Delete",
      change: "Change",
      addFriend: "Add friend",
      friendName: "Enter friend's name",
      noFriends: "You have no friends added yet.",
      connectFriends: "Add friends and start connecting.",
      noNotifications: "There are no new notifications.",
      noSavedPosts: "There are no saved posts yet.",
      appPreferences: "Manage your app preferences.",
      themeDescription: "Light or Dark mode",
      languageDescription: "Choose the app language.",
      notificationSettings: "Notifications",
      notificationDescription: "Show app notifications",
      compactMode: "Compact layout",
      compactDescription: "Show content with less spacing",
      localData: "Local demo data",
      localDataDescription: "Friends, chats, notifications and profile demo data",
      clearDemoData: "Clear demo data",
      clearDemoConfirm: "Clear local demo data?",
      resetSettings: "Reset settings",
      resetSettingsConfirm: "Reset settings to default?",
      settingsSaved: "Settings saved.",
      settingsReset: "Settings reset.",
      demoDataCleared: "Demo data cleared.",
      on: "On",
      off: "Off",
      post: "Post",
      comment: "Comment",
      like: "Like",
      share: "Share",
      more: "More",
      pageUnavailable: "This page is unavailable",
      moduleNotLoaded: "This page module has not loaded.",
      pageError: "There was a problem opening this page",
      later: "Will be added in a later step."
    }
  };

  /*
   * Exact text translation map for existing HTML/page modules.
   * Dynamic/user-written post content is not translated.
   */
  const textMap = {
    ne: {
      "होम": "home",
      "पोस्ट": "posts",
      "बनाउनुहोस्": "create",
      "सन्देश": "messages",
      "प्रोफाइल": "profile",
      "सेटिङ": "settings",
      "स्टोरीहरू": "stories",
      "＋ स्टोरी": "addStory",
      "तपाईं के सोच्दै हुनुहुन्छ?": "writePost",
      "फोटो": "photo",
      "भिडियो": "video",
      "भावना": "feeling",
      "पोस्टहरू": "feed",
      "नयाँ": "latest",
      "अहिलेसम्म पोस्ट छैन। पहिलो पोस्ट तपाईं गर्नुहोस्!": "emptyFeed",
      "साथी वा पोस्ट खोज्नुहोस्...": "searchPlaceholder",
      "साथीहरू": "friends",
      "सूचनाहरू": "notifications",
      "सेभ गरिएका पोस्टहरू": "saved",
      "प्रकाशित गर्नुहोस्": "publish",
      "रद्द": "cancel",
      "बन्द": "close",
      "हटाउनुहोस्": "remove",
      "मेटाउनुहोस्": "delete",
      "बदल्नुहोस्": "change",
      "साथी थप्नुहोस्": "addFriend",
      "साथीको नाम लेख्नुहोस्": "friendName",
      "अहिलेसम्म साथी छैन।": "noFriends",
      "साथी जोड्नुहोस् र कुराकानी सुरु गर्नुहोस्।": "connectFriends",
      "अहिले नयाँ सूचना छैन।": "noNotifications",
      "अहिलेसम्म सेभ गरिएको पोस्ट छैन।": "noSavedPosts",
      "यो पृष्ठ उपलब्ध छैन": "pageUnavailable",
      "यस पृष्ठको module load भएको छैन।": "moduleNotLoaded",
      "पृष्ठ खोल्न समस्या भयो": "pageError"
    },
    en: {
      "Home": "home",
      "Posts": "posts",
      "Create": "create",
      "Messages": "messages",
      "Profile": "profile",
      "Settings": "settings",
      "Stories": "stories",
      "+ Story": "addStory",
      "What are you thinking?": "writePost",
      "Photo": "photo",
      "Video": "video",
      "Feeling": "feeling",
      "Posts": "feed",
      "Latest": "latest",
      "No posts yet. Be the first to post!": "emptyFeed",
      "Search friends or posts...": "searchPlaceholder",
      "Friends": "friends",
      "Notifications": "notifications",
      "Saved posts": "saved",
      "Publish": "publish",
      "Cancel": "cancel",
      "Close": "close",
      "Remove": "remove",
      "Delete": "delete",
      "Change": "change",
      "Add friend": "addFriend",
      "Enter friend's name": "friendName",
      "You have no friends added yet.": "noFriends",
      "Add friends and start connecting.": "connectFriends",
      "There are no new notifications.": "noNotifications",
      "There are no saved posts yet.": "noSavedPosts",
      "This page is unavailable": "pageUnavailable",
      "This page module has not loaded.": "moduleNotLoaded",
      "There was a problem opening this page": "pageError"
    }
  };

  function getLanguage() {
    try {
      const stored = localStorage.getItem("hs_language_v1");
      if (stored === "en" || stored === "ne") return stored;
    } catch {}

    const stateLanguage = global.HamroState?.state?.language;
    return stateLanguage === "en" ? "en" : "ne";
  }

  function translate(key, language = getLanguage()) {
    const selected = dictionaries[language] || dictionaries.ne;
    return selected[key] ?? dictionaries.ne[key] ?? key;
  }

  function translateTextNode(node, language) {
    const original = node.nodeValue;
    const trimmed = original.trim();
    if (!trimmed) return;

    const lookup = textMap[language]?.[trimmed];
    if (!lookup) return;

    const translated = translate(lookup, language);
    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    node.nodeValue = leading + translated + trailing;
  }

  function applyTranslations(root = document) {
    const language = getLanguage();

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root, language);
      return;
    }

    if (root.querySelectorAll) {
      root.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = translate(element.dataset.i18n, language);
      });

      root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        element.placeholder = translate(element.dataset.i18nPlaceholder, language);
      });

      root.querySelectorAll("[data-i18n-title]").forEach((element) => {
        element.title = translate(element.dataset.i18nTitle, language);
      });

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.parentElement) return NodeFilter.FILTER_REJECT;
            if (node.parentElement.closest("script, style, textarea, input, select, option")) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => translateTextNode(node, language));
    }

    document.documentElement.lang = language;
  }

  function setLanguage(language) {
    const selected = language === "en" ? "en" : "ne";

    try {
      localStorage.setItem("hs_language_v1", selected);
    } catch {}

    if (global.HamroState) {
      global.HamroState.setLanguage(selected);
    }

    applyTranslations(document);
    document.documentElement.lang = selected;

    global.dispatchEvent(new CustomEvent("hamro:language-change", {
      detail: { language: selected }
    }));

    return selected;
  }

  function initialize() {
    document.documentElement.lang = getLanguage();
    applyTranslations(document);

    if (global.HamroState?.subscribe) {
      global.HamroState.subscribe((state, changeName) => {
        if (changeName === "language-change") {
          try {
            localStorage.setItem("hs_language_v1", state.language);
          } catch {}
          applyTranslations(document);
        }
      });
    }

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length)) {
        applyTranslations(document);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  global.HamroLanguage = Object.freeze({
    translate,
    applyTranslations,
    getLanguage,
    setLanguage,
    initialize,
    dictionaries
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);
