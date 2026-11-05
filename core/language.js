"use strict";

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
      friends: "साथीहरू",
      notifications: "सूचनाहरू",
      saved: "सेभ गरिएका पोस्टहरू",
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
      pageUnavailable: "यो पृष्ठ उपलब्ध छैन",
      moduleNotLoaded: "यस पृष्ठको module load भएको छैन।",
      pageError: "पृष्ठ खोल्न समस्या भयो",
      theme: "रङ्ग शैली",
      language: "भाषा",
      light: "Light",
      dark: "Dark",
      nepali: "नेपाली",
      english: "English",
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
      resetSettings: "सेटिङ पूर्ववत्",
      storiesLater: "स्टोरी सुविधा अर्को चरणमा जोडिनेछ।",
      commentsLater: "टिप्पणी सुविधा अर्को चरणमा जोडिनेछ।",
      messagesLater: "सन्देश सुविधा अर्को चरणमा जोडिनेछ।",
      profileLater: "प्रोफाइल सुविधा अर्को चरणमा थपिनेछ।",
      friendsLater: "साथी सुविधा क्रमशः थपिनेछ।",
      settingsSaved: "सेटिङ सुरक्षित भयो।",
      settingsReset: "सेटिङ पूर्ववत् भयो।",
      demoDataCleared: "Demo data हटाइयो।",
      clearDemoConfirm: "स्थानीय demo data हटाउने?",
      resetSettingsConfirm: "सेटिङ पूर्ववत् गर्ने?"
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
      friends: "Friends",
      notifications: "Notifications",
      saved: "Saved posts",
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
      pageUnavailable: "This page is unavailable",
      moduleNotLoaded: "This page module has not loaded.",
      pageError: "There was a problem opening this page",
      theme: "Theme",
      language: "Language",
      light: "Light",
      dark: "Dark",
      nepali: "Nepali",
      english: "English",
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
      resetSettings: "Reset settings",
      storiesLater: "Stories will be added in a later step.",
      commentsLater: "Comments will be added in a later step.",
      messagesLater: "Messaging will be added in a later step.",
      profileLater: "Profile features will be added in a later step.",
      friendsLater: "Friend features will be added gradually.",
      settingsSaved: "Settings saved.",
      settingsReset: "Settings reset.",
      demoDataCleared: "Demo data cleared.",
      clearDemoConfirm: "Clear local demo data?",
      resetSettingsConfirm: "Reset settings to default?"
    }
  };

  function getLanguage() {
    try {
      const saved = localStorage.getItem("hs_language_v1");
      if (saved === "ne" || saved === "en") return saved;
    } catch {}

    return global.HamroState?.state?.language === "en" ? "en" : "ne";
  }

  function translate(key, language = getLanguage()) {
    return dictionaries[language]?.[key] ??
      dictionaries.ne[key] ??
      key;
  }

  function findKeyForText(text) {
    for (const key of Object.keys(dictionaries.ne)) {
      if (dictionaries.ne[key] === text || dictionaries.en[key] === text) {
        return key;
      }
    }
    return null;
  }

  function translateTextNode(node, language) {
    const original = node.nodeValue;
    const trimmed = original.trim();
    if (!trimmed) return;

    const key = findKeyForText(trimmed);
    if (!key) return;

    const translated = translate(key, language);
    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    node.nodeValue = leading + translated + trailing;
  }

  function applyTranslations(root = document) {
    const language = getLanguage();

    if (root.querySelectorAll) {
      root.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = translate(element.dataset.i18n, language);
      });

      root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        element.placeholder = translate(element.dataset.i18nPlaceholder, language);
      });

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest("script, style, textarea, input, select, option")) {
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
