"use strict";

/* =========================================================
   KSK — GLOBAL LANGUAGE ENGINE
   Nepali / English Translation System
   Safe DOM Translation + Mutation Observer
========================================================= */

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
      connectFriends: "साथी جوड्नुहोस् र कुराकानी सुरु गर्नुहोस्।",
      noNotifications: "अहिले नयाँ सूचना छैन।",
      noSavedPosts: "अहिलेसम्म सेभ गरिएको पोस्ट छैन।",

      pageUnavailable: "यो पृष्ठ उपलब्ध छैन।",
      moduleNotLoaded: "यस पृष्ठको module load भएको छैन।",
      pageError: "पृष्ठ खोल्न समस्या भयो।",

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

      pageUnavailable: "This page is unavailable.",
      moduleNotLoaded: "This page module has not loaded.",
      pageError: "There was a problem opening this page.",

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

  let observer = null;
  let initialized = false;
  let stateUnsubscribe = null;

  function normalizeLanguage(language) {
    return language === "en" ? "en" : "ne";
  }

  /* LANGUAGE */

  function getLanguage() {
    if (global.KSKSettings) {
      return normalizeLanguage(
        global.KSKSettings.getSettings().language
      );
    }

    if (global.KSKState) {
      return normalizeLanguage(
        global.KSKState.getState().language
      );
    }

    try {
      const saved = global.localStorage.getItem("ksk_language_v1");

      if (saved === "ne" || saved === "en") {
        return saved;
      }
    } catch (error) {
      // Storage may be unavailable.
    }

    return "ne";
  }

  /* TRANSLATION */

  function translate(key, language = getLanguage()) {
    const selected = normalizeLanguage(language);

    return (
      dictionaries[selected]?.[key] ??
      dictionaries.ne[key] ??
      key
    );
  }

  function findKeyForText(text) {
    for (const key of Object.keys(dictionaries.ne)) {
      if (
        dictionaries.ne[key] === text ||
        dictionaries.en[key] === text
      ) {
        return key;
      }
    }

    return null;
  }

  /* TEXT NODE TRANSLATION */

  function translateTextNode(node, language) {
    const original = node.nodeValue;

    if (!original || !original.trim()) return;

    const key = findKeyForText(original.trim());

    if (!key) return;

    const translated = translate(key, language);

    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";

    const nextValue = leading + translated + trailing;

    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue;
    }
  }

  /* APPLY TRANSLATIONS */

  function applyTranslations(root = document) {
    if (!root) return;

    const language = getLanguage();

    if (root.matches?.("[data-i18n]")) {
      const key = root.dataset.i18n;
      const value = translate(key, language);

      if (root.textContent !== value) {
        root.textContent = value;
      }
    }

    if (root.matches?.("[data-i18n-placeholder]")) {
      const key = root.dataset.i18nPlaceholder;
      root.placeholder = translate(key, language);
    }

    if (root.querySelectorAll) {
      root.querySelectorAll("[data-i18n]").forEach(element => {
        const value = translate(element.dataset.i18n, language);

        if (element.textContent !== value) {
          element.textContent = value;
        }
      });

      root.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
        const value = translate(
          element.dataset.i18nPlaceholder,
          language
        );

        if (element.placeholder !== value) {
          element.placeholder = value;
        }
      });
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;

          if (!parent) {
            return NodeFilter.FILTER_REJECT;
          }

          if (
            parent.closest(
              "script, style, textarea, input, select, option, [data-no-translate]"
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.closest("[data-i18n]")) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(node => {
      translateTextNode(node, language);
    });

    document.documentElement.lang = language;
  }

  /* SET LANGUAGE */

  function setLanguage(language) {
    const selected = normalizeLanguage(language);

    if (global.KSKSettings) {
      global.KSKSettings.updateSettings({
        language: selected
      });
    } else if (global.KSKState) {
      global.KSKState.setLanguage(selected);
    } else {
      try {
        global.localStorage.setItem(
          "ksk_language_v1",
          selected
        );
      } catch (error) {
        console.warn("KSKLanguage: Language storage unavailable.");
      }
    }

    applyTranslations(document);

    global.dispatchEvent(
      new CustomEvent("ksk:language-change", {
        detail: { language: selected }
      })
    );

    return selected;
  }

  /* OBSERVE NEW CONTENT */

  function observeContent() {
    if (observer || !document.body) return;

    if (!("MutationObserver" in global)) return;

    observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            applyTranslations(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node, getLanguage());
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* INITIALIZE */

  function initialize() {
    if (initialized || !document.body) return;

    initialized = true;

    applyTranslations(document);
    observeContent();

    if (global.KSKState?.subscribe) {
      stateUnsubscribe = global.KSKState.subscribe(
        (state, changeName) => {
          if (changeName === "language-change") {
            applyTranslations(document);
          }
        }
      );
    }
  }

  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (typeof stateUnsubscribe === "function") {
      stateUnsubscribe();
      stateUnsubscribe = null;
    }

    initialized = false;
  }

  /* PUBLIC API */

  global.KSKLanguage = Object.freeze({
    translate,
    applyTranslations,
    getLanguage,
    setLanguage,
    initialize,
    destroy,
    dictionaries
  });

  /* START */

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
