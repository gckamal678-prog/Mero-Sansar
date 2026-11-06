
"use strict";

/* =========================================================
   KSK LANGUAGE ENGINE
   Responsibility:
   - Nepali / English translations
   - Translate marked UI elements
   - Translate dynamically added UI
   - Keep user-generated content unchanged

   Data ownership:
   - KSKSettings owns saved language preference
   - KSKLanguage owns translation only
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKLanguage) return;

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
  let unsubscribeSettings = null;
  let unsubscribeState = null;

  /* =======================================================
     LANGUAGE HELPERS
  ======================================================= */

  function normalizeLanguage(language) {
    return language === "en" ? "en" : "ne";
  }

  function getLanguage() {
    if (global.KSKSettings?.getSettings) {
      return normalizeLanguage(
        global.KSKSettings.getSettings().language
      );
    }

    if (global.KSKState?.getState) {
      return normalizeLanguage(
        global.KSKState.getState().language
      );
    }

    return document.documentElement.lang === "en"
      ? "en"
      : "ne";
  }

  function translate(key, language = getLanguage()) {
    if (typeof key !== "string") return "";

    const selected = normalizeLanguage(language);

    return (
      dictionaries[selected][key] ??
      dictionaries.ne[key] ??
      key
    );
  }

  /* =======================================================
     ELEMENT TRANSLATION
  ======================================================= */

  function translateElement(element, language) {
    if (!element || element.nodeType !== 1) return;

    if (element.hasAttribute("data-i18n")) {
      const key = element.getAttribute("data-i18n");

      const value = translate(key, language);

      if (element.textContent !== value) {
        element.textContent = value;
      }
    }

    if (element.hasAttribute("data-i18n-placeholder")) {
      const key = element.getAttribute("data-i18n-placeholder");

      const value = translate(key, language);

      if (element.placeholder !== value) {
        element.placeholder = value;
      }
    }

    if (element.hasAttribute("data-i18n-title")) {
      const key = element.getAttribute("data-i18n-title");

      element.setAttribute(
        "title",
        translate(key, language)
      );
    }

    if (element.hasAttribute("data-i18n-aria-label")) {
      const key = element.getAttribute("data-i18n-aria-label");

      element.setAttribute(
        "aria-label",
        translate(key, language)
      );
    }
  }

  /* =======================================================
     APPLY TRANSLATIONS

     Only explicitly marked interface elements are translated.
     Posts, comments, messages and profile content are untouched.
  ======================================================= */

  function applyTranslations(root = document) {
    if (!root) return false;

    const language = getLanguage();

    if (root.nodeType === 1) {
      translateElement(root, language);
    }

    if (root.querySelectorAll) {
      root.querySelectorAll(
        "[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]"
      ).forEach(element => {
        translateElement(element, language);
      });
    }

    document.documentElement.lang = language;

    return true;
  }

  /* =======================================================
     SET LANGUAGE

     KSKSettings is the single source of saved preference.
  ======================================================= */

  function setLanguage(language) {
    const selected = normalizeLanguage(language);

    if (global.KSKSettings?.getSettings) {
      const current = getLanguage();

      if (current !== selected) {
        global.KSKSettings.updateSettings({
          language: selected
        });
      }
    } else if (global.KSKState?.setLanguage) {
      global.KSKState.setLanguage(selected);
    }

    applyTranslations(document);

    global.dispatchEvent(
      new CustomEvent("ksk:language-change", {
        detail: {
          language: selected
        }
      })
    );

    return selected;
  }

  /* =======================================================
     DYNAMIC UI OBSERVER

     Watches newly added interface elements only.
     Does not rewrite arbitrary text nodes.
  ======================================================= */

  function observeContent() {
    if (observer || !document.body) return;

    if (!global.MutationObserver) return;

    observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            applyTranslations(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* =======================================================
     SETTINGS SYNCHRONIZATION
  ======================================================= */

  function bindSettings() {
    if (global.KSKSettings?.subscribeSettings) {
      unsubscribeSettings =
        global.KSKSettings.subscribeSettings(settings => {
          const language = normalizeLanguage(
            settings?.language
          );

          if (
            document.documentElement.lang !== language
          ) {
            applyTranslations(document);
          }
        });

      return;
    }

    if (global.KSKState?.subscribe) {
      unsubscribeState = global.KSKState.subscribe(
        (state, changeName) => {
          if (
            changeName === "language-change" ||
            changeName === "settings-change"
          ) {
            applyTranslations(document);
          }
        }
      );
    }
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initialize() {
    if (initialized || !document.body) return false;

    initialized = true;

    applyTranslations(document);
    observeContent();
    bindSettings();

    global.dispatchEvent(
      new CustomEvent("ksk:language-ready", {
        detail: {
          language: getLanguage()
        }
      })
    );

    return true;
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (typeof unsubscribeSettings === "function") {
      unsubscribeSettings();
      unsubscribeSettings = null;
    }

    if (typeof unsubscribeState === "function") {
      unsubscribeState();
      unsubscribeState = null;
    }

    initialized = false;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKLanguage = Object.freeze({
    translate,
    applyTranslations,
    getLanguage,
    setLanguage,
    initialize,
    destroy,
    dictionaries
  });

  /* =======================================================
     START
  ======================================================= */

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
