"use strict";

/* Shared Nepali / English translation system */

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
      theme: "Theme",
      language: "भाषा",
      light: "Light",
      dark: "Dark",
      nepali: "नेपाली",
      english: "English",
      postPublished: "पोस्ट प्रकाशित भयो।",
      enterPost: "पोस्ट गर्न केही लेख्नुहोस् वा फोटो/भिडियो छान्नुहोस्।",
      mediaSelected: "मिडिया छानियो।",
      mediaRemoved: "मिडिया हटाइयो।",
      notificationsEmpty: "अहिले नयाँ सूचना छैन।",
      storiesLater: "स्टोरी सुविधा अर्को चरणमा जोडिनेछ।",
      messagesLater: "सन्देश सुविधा backend जोडिएपछि उपलब्ध हुनेछ।",
      backendLater: "यो सुविधा backend जोडिएपछि उपलब्ध हुनेछ।",
      commentPrompt: "आफ्नो टिप्पणी लेख्नुहोस्:",
      commentAdded: "टिप्पणी थपियो।",
      shareReady: "पोस्ट share गर्न तयार छ।",
      noSearchResults: "खोजीअनुसार पोस्ट भेटिएन।"
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
      postPublished: "Post published.",
      enterPost: "Write something or choose a photo/video.",
      mediaSelected: "Media selected.",
      mediaRemoved: "Media removed.",
      notificationsEmpty: "There are no new notifications.",
      storiesLater: "Stories will be added in a later step.",
      messagesLater: "Messaging will be available after backend integration.",
      backendLater: "This feature will be available after backend integration.",
      commentPrompt: "Write your comment:",
      commentAdded: "Comment added.",
      shareReady: "Post is ready to share.",
      noSearchResults: "No matching posts found."
    }
  };

  function getLanguage() {
    const state = global.HamroState?.state;
    return state?.language === "en" ? "en" : "ne";
  }

  function translate(key, language) {
    const selectedLanguage = language || getLanguage();
    const selectedDictionary = dictionaries[selectedLanguage] || dictionaries.ne;

    return selectedDictionary[key] ||
      dictionaries.ne[key] ||
      key;
  }

  function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      element.textContent = translate(key);
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.dataset.i18nPlaceholder;
      element.placeholder = translate(key);
    });

    document.documentElement.lang = getLanguage();
  }

  global.HamroLanguage = Object.freeze({
    translate,
    applyTranslations,
    getLanguage,
    dictionaries
  });
})(window);
