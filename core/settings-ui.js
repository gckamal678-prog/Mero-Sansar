"use strict";

/* =========================================================
   KSK SETTINGS UI
   Responsibility:
   - Settings interface
   - Settings navigation
   - Settings actions
   - Import / Export / Reset

   Data owner: KSKSettings
   Theme owner: KSKTheme
   Language owner: KSKLanguage
========================================================= */

(function (global) {

  if (global.KSKSettingsUI) return;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const SETTINGS = () => global.KSKSettings;
  const THEME = () => global.KSKTheme;
  const LANG = () => global.KSKLanguage;

  let activeSection = "main";
  let initialized = false;

  const sectionNames = {
    main: ["सेटिङ", "Settings"],
    account: ["खाता", "Account"],
    privacy: ["गोपनीयता", "Privacy"],
    notifications: ["सूचनाहरू", "Notifications"],
    appearance: ["रूपरङ", "Appearance"],
    profile: ["प्रोफाइल", "Profile"],
    chats: ["च्याट", "Chats"],
    data: ["डेटा र स्टोरेज", "Data and Storage"],
    language: ["भाषा", "Language"],
    help: ["सहयोग", "Help"],
    about: ["एपको बारेमा", "About"]
  };

  /* =======================================================
     COMMON HELPERS
  ======================================================= */

  function isEnglish() {
    return LANG()?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function getSettings() {
    const settings = SETTINGS()?.getSettings?.();

    return settings && typeof settings === "object"
      ? settings
      : {};
  }

  function saveSetting(path, value) {
    if (!SETTINGS()?.updateSetting) {
      return false;
    }

    return SETTINGS().updateSetting(path, value);
  }

  function notify(type, message) {
    const toast = global.KSKToast;

    if (type === "success") {
      toast?.success?.(message);
    } else {
      toast?.error?.(message);
    }
  }

  /* =======================================================
     HTML BUILDERS
  ======================================================= */

  function icon(symbol) {
    return `
      <span class="ksk-setting-icon" aria-hidden="true">
        ${symbol}
      </span>
    `;
  }

  function row(title, description, symbol, section) {
    return `
      <button
        type="button"
        class="ksk-setting-menu-row"
        data-settings-section="${section}">

        ${icon(symbol)}

        <span class="ksk-setting-row-copy ksk-settings-row-copy">
          <strong>${title}</strong>
          <small>${description}</small>
        </span>

        <span class="ksk-setting-chevron" aria-hidden="true">
          ›
        </span>

      </button>
    `;
  }

  function toggleRow(title, description, path, checked) {
    return `
      <div class="ksk-setting-option">

        <span class="ksk-setting-row-copy ksk-settings-row-copy">
          <strong>${title}</strong>
          <small>${description}</small>
        </span>

        <label class="ksk-switch">
          <input
            type="checkbox"
            data-settings-toggle="${path}"
            ${checked ? "checked" : ""}>

          <span class="ksk-switch-track"></span>
        </label>

      </div>
    `;
  }

  function selectRow(title, description, path, value, options) {
    return `
      <label class="ksk-setting-option ksk-setting-select-option">

        <span class="ksk-setting-row-copy ksk-settings-row-copy">
          <strong>${title}</strong>
          <small>${description}</small>
        </span>

        <select
          class="ksk-setting-select"
          data-settings-select="${path}">

          ${options.map(option => `
            <option
              value="${escapeHTML(option.value)}"
              ${value === option.value ? "selected" : ""}>
              ${escapeHTML(option.label)}
            </option>
          `).join("")}

        </select>

      </label>
    `;
  }

  function backButton() {
    return `
      <button
        type="button"
        class="ksk-settings-back"
        data-settings-back>

        ‹
        <span>${t("सेटिङ", "Settings")}</span>

      </button>
    `;
  }

  function sectionHeader(title, description = "") {
    return `
      <div class="ksk-settings-section-heading">

        <h3>${title}</h3>

        ${description
          ? `<p>${description}</p>`
          : ""}

      </div>
    `;
  }

  function card(content) {
    return `
      <div class="ksk-settings-card">
        ${content}
      </div>
    `;
  }

  /* =======================================================
     MAIN MENU
  ======================================================= */

  function renderMain() {
    const s = getSettings();

    const appearance = s.theme === "dark"
      ? t("डार्क मोड", "Dark mode")
      : t("लाइट मोड", "Light mode");

    const language = s.language === "en"
      ? "English"
      : "नेपाली";

    return `

      <div class="ksk-settings-profile-shortcut">

        <div class="ksk-settings-avatar">
          👤
        </div>

        <div>
          <strong>${t("तपाईंको प्रोफाइल", "Your profile")}</strong>
          <small>
            ${t(
              "प्रोफाइल विवरण व्यवस्थापन गर्नुहोस्",
              "Manage your profile details"
            )}
          </small>
        </div>

        <button
          type="button"
          data-settings-section="profile"
          aria-label="${t("प्रोफाइल", "Profile")}">
          ›
        </button>

      </div>

      <div class="ksk-settings-menu">

        ${row(
          t("खाता", "Account"),
          t("खाता र व्यक्तिगत जानकारी", "Account and personal information"),
          "🔐",
          "account"
        )}

        ${row(
          t("गोपनीयता", "Privacy"),
          t("तपाईंको जानकारी कसले हेर्न सक्छ", "Control who can see your information"),
          "🛡️",
          "privacy"
        )}

        ${row(
          t("सूचनाहरू", "Notifications"),
          t("सन्देश र अन्य सूचनाको नियन्त्रण", "Message and activity notifications"),
          "🔔",
          "notifications"
        )}

        ${row(
          t("रूपरङ", "Appearance"),
          appearance,
          "🎨",
          "appearance"
        )}

        ${row(
          t("प्रोफाइल", "Profile"),
          t("प्रोफाइल देखिने विकल्पहरू", "Profile display preferences"),
          "👤",
          "profile"
        )}

        ${row(
          t("च्याट", "Chats"),
          t("च्याटको शैली र लेख्ने विकल्प", "Chat style and typing options"),
          "💬",
          "chats"
        )}

        ${row(
          t("डेटा र स्टोरेज", "Data and Storage"),
          t("मिडिया र डेटा प्राथमिकता", "Media and data preferences"),
          "📦",
          "data"
        )}

        ${row(
          t("भाषा", "Language"),
          language,
          "🌐",
          "language"
        )}

        ${row(
          t("सहयोग", "Help"),
          t("सहयोग र सुझाव", "Help and feedback"),
          "❔",
          "help"
        )}

        ${row(
          t("एपको बारेमा", "About"),
          t("हाम्रो संसारको जानकारी", "About Hamro Sansar"),
          "ℹ️",
          "about"
        )}

      </div>
    `;
  }

  /* =======================================================
     ACCOUNT
  ======================================================= */

  function renderAccount() {
    const s = getSettings();

    return `
      ${backButton()}

      ${sectionHeader(
        t("खाता", "Account"),
        t("तपाईंको खाता सम्बन्धी विकल्पहरू", "Manage account-related preferences")
      )}

      ${card(
        toggleRow(
          t("साथी अनुरोध स्वीकार गर्ने", "Allow friend requests"),
          t("अन्य सदस्यले साथी अनुरोध पठाउन सक्नेछन्", "Allow other members to send friend requests"),
          "privacy.allowFriendRequests",
          s.privacy?.allowFriendRequests
        )
      )}

      <div class="ksk-settings-info">
        ${t(
          "लगइन, पासवर्ड परिवर्तन र खाता व्यवस्थापन सुरक्षित Authentication प्रणाली जोडिएपछि उपलब्ध हुनेछ।",
          "Login, password changes and account management require secure authentication."
        )}
      </div>
    `;
  }

  /* =======================================================
     PRIVACY
  ======================================================= */

  function renderPrivacy() {
    const p = getSettings().privacy || {};

    const visibility = [
      { value: "everyone", label: t("सबैजना", "Everyone") },
      { value: "friends", label: t("साथीहरू", "Friends") },
      { value: "nobody", label: t("कोही पनि होइन", "Nobody") }
    ];

    return `
      ${backButton()}

      ${sectionHeader(
        t("गोपनीयता", "Privacy"),
        t("तपाईंको जानकारी कसले हेर्न सक्छ छान्नुहोस्", "Choose who can see your information")
      )}

      ${card(`

        ${selectRow(
          t("प्रोफाइल दृश्यता", "Profile visibility"),
          t("तपाईंको प्रोफाइल कसले हेर्न सक्छ", "Who can view your profile"),
          "privacy.profileVisibility",
          p.profileVisibility,
          visibility
        )}

        ${selectRow(
          t("अन्तिम पटक सक्रिय", "Last seen"),
          t("तपाईं अन्तिम पटक सक्रिय भएको समय", "When you were last active"),
          "privacy.lastSeen",
          p.lastSeen,
          visibility
        )}

        ${selectRow(
          t("अनलाइन स्थिति", "Online status"),
          t("तपाईं अनलाइन भएको स्थिति", "Your online status"),
          "privacy.onlineStatus",
          p.onlineStatus,
          visibility
        )}

        ${selectRow(
          t("प्रोफाइल फोटो", "Profile photo"),
          t("प्रोफाइल फोटो कसले देख्ने", "Who can see your profile photo"),
          "privacy.showProfilePhoto",
          p.showProfilePhoto,
          visibility
        )}

        ${selectRow(
          t("बारेमा", "About"),
          t("तपाईंको About विवरण कसले देख्ने", "Who can see your About information"),
          "privacy.showAbout",
          p.showAbout,
          visibility
        )}

        ${toggleRow(
          "Read Receipts",
          t("सन्देश पढिएको जानकारी देखाउने", "Show when messages have been read"),
          "privacy.readReceipts",
          p.readReceipts
        )}

        ${toggleRow(
          t("साथी अनुरोध", "Friend requests"),
          t("साथी अनुरोध प्राप्त गर्न अनुमति दिने", "Allow incoming friend requests"),
          "privacy.allowFriendRequests",
          p.allowFriendRequests
        )}

      `)}

      <div class="ksk-settings-info">
        ${t(
          "यी विकल्पहरू यस डिभाइसमा सुरक्षित हुन्छन्। सबै सदस्यमा लागू गर्न Server-side access control आवश्यक हुन्छ।",
          "These preferences are stored on this device. Server-side access control is required to enforce them for all members."
        )}
      </div>
    `;
  }

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  function renderNotifications() {
    const s = getSettings();
    const n = s.notificationPreferences || {};

    return `
      ${backButton()}

      ${sectionHeader(
        t("सूचनाहरू", "Notifications"),
        t("कुन प्रकारका सूचना प्राप्त गर्ने छान्नुहोस्", "Choose which notifications you receive")
      )}

      ${card(`

        ${toggleRow(
          t("सबै सूचनाहरू", "All notifications"),
          t("सूचनाहरू पूर्ण रूपमा सक्रिय वा बन्द गर्ने", "Turn all notifications on or off"),
          "notifications",
          s.notifications
        )}

        <div class="ksk-settings-divider"></div>

        ${toggleRow(
          t("सन्देशहरू", "Messages"),
          t("नयाँ सन्देश आउँदा", "When a new message arrives"),
          "notificationPreferences.messages",
          n.messages
        )}

        ${toggleRow(
          t("साथीहरू", "Friends"),
          t("साथी अनुरोध र गतिविधि", "Friend requests and activity"),
          "notificationPreferences.friends",
          n.friends
        )}

        ${toggleRow(
          t("कमेन्टहरू", "Comments"),
          t("पोस्टमा कमेन्ट आउँदा", "When someone comments on your post"),
          "notificationPreferences.comments",
          n.comments
        )}

        ${toggleRow(
          "Likes",
          t("पोस्टमा Like आउँदा", "When someone likes your post"),
          "notificationPreferences.likes",
          n.likes
        )}

        ${toggleRow(
          t("स्टोरीहरू", "Stories"),
          t("स्टोरी सम्बन्धी गतिविधि", "Story activity"),
          "notificationPreferences.stories",
          n.stories
        )}

        <div class="ksk-settings-divider"></div>

        ${toggleRow(
          t("सूचना आवाज", "Notification sound"),
          t("सूचना आउँदा आवाज बजाउने", "Play a sound for notifications"),
          "notificationPreferences.sound",
          n.sound
        )}

        ${toggleRow(
          "Vibration",
          t("सूचना आउँदा कम्पन गराउने", "Vibrate for notifications"),
          "notificationPreferences.vibration",
          n.vibration
        )}

      `)}

      <div class="ksk-settings-info">
        ${t(
          "यी प्राथमिकताहरू सुरक्षित हुन्छन्। वास्तविक Push Notification का लागि सेवा र Device permission आवश्यक हुन्छ।",
          "These preferences are saved. Real push notifications require a notification service and device permission."
        )}
      </div>
    `;
  }

  /* =======================================================
     APPEARANCE
  ======================================================= */

  function renderAppearance() {
    const s = getSettings();

    return `
      ${backButton()}

      ${sectionHeader(
        t("रूपरङ", "Appearance"),
        t("एपको दृश्य शैली परिवर्तन गर्नुहोस्", "Customize the app appearance")
      )}

      ${card(`

        ${selectRow(
          "Theme",
          t("लाइट वा डार्क मोड छान्नुहोस्", "Choose light or dark mode"),
          "theme",
          s.theme,
          [
            { value: "light", label: t("लाइट", "Light") },
            { value: "dark", label: t("डार्क", "Dark") }
          ]
        )}

        ${toggleRow(
          "Compact Mode",
          t("कम ठाउँमा बढी सामग्री देखाउने", "Show more content in less space"),
          "compactMode",
          s.compactMode
        )}

      `)}
    `;
  }

  /* =======================================================
     PROFILE PREFERENCES
  ======================================================= */

  function renderProfile() {
    const p = getSettings().profilePreferences || {};

    return `
      ${backButton()}

      ${sectionHeader(
        t("प्रोफाइल", "Profile"),
        t("प्रोफाइलमा देखिने विवरण छान्नुहोस्", "Choose what appears on your profile")
      )}

      ${card(`

        ${toggleRow(
          "Bio",
          t("प्रोफाइलमा आफ्नो परिचय देखाउने", "Display your biography"),
          "profilePreferences.showBio",
          p.showBio
        )}

        ${toggleRow(
          "Location",
          t("प्रोफाइलमा स्थान देखाउने", "Display your location"),
          "profilePreferences.showLocation",
          p.showLocation
        )}

        ${toggleRow(
          "Post Count",
          t("प्रोफाइलमा पोस्ट संख्या देखाउने", "Display your post count"),
          "profilePreferences.showPostCount",
          p.showPostCount
        )}

      `)}

      <div class="ksk-settings-info">
        ${t(
          "यी विकल्पहरू सुरक्षित हुन्छन्। सार्वजनिक प्रोफाइलमा लागू गर्न Profile UI सँग जोड्नुपर्नेछ।",
          "These preferences are saved. The public profile display must also be connected to these options."
        )}
      </div>
    `;
  }

  /* =======================================================
     CHATS
  ======================================================= */

  function renderChats() {
    const c = getSettings().chat || {};

    return `
      ${backButton()}

      ${sectionHeader(
        t("च्याट", "Chats"),
        t("सन्देश लेख्ने र च्याटको शैली व्यवस्थापन गर्नुहोस्", "Manage chat appearance and typing preferences")
      )}

      ${card(`

        ${selectRow(
          "Font Size",
          t("सन्देशको अक्षर आकार", "Message text size"),
          "chat.fontSize",
          c.fontSize,
          [
            { value: "small", label: t("सानो", "Small") },
            { value: "medium", label: t("मध्यम", "Medium") },
            { value: "large", label: t("ठूलो", "Large") }
          ]
        )}

        ${toggleRow(
          t("Enter बाट सन्देश पठाउने", "Enter to send"),
          t("Enter थिच्दा सन्देश पठाउने", "Send a message when Enter is pressed"),
          "chat.enterToSend",
          c.enterToSend
        )}

        ${toggleRow(
          "Link Preview",
          t("लिङ्कको Preview देखाउने", "Show previews for shared links"),
          "chat.linkPreviews",
          c.linkPreviews
        )}

        ${selectRow(
          "Chat Wallpaper",
          t("च्याटको पृष्ठभूमि", "Chat background"),
          "chat.wallpaper",
          c.wallpaper,
          [
            { value: "default", label: "Default" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" }
          ]
        )}

      `)}
    `;
  }

  /* =======================================================
     DATA AND STORAGE
  ======================================================= */

  function renderData() {
    const d = getSettings().data || {};

    return `
      ${backButton()}

      ${sectionHeader(
        t("डेटा र स्टोरेज", "Data and Storage"),
        t("मिडिया र डेटा प्रयोगको प्राथमिकता", "Manage media and data preferences")
      )}

      ${card(`

        ${toggleRow(
          t("फोटो Auto Download", "Auto-download photos"),
          t("फोटो स्वतः डाउनलोड गर्ने प्राथमिकता", "Preference for automatic photo downloads"),
          "data.autoDownloadImages",
          d.autoDownloadImages
        )}

        ${toggleRow(
          t("भिडियो Auto Download", "Auto-download videos"),
          t("भिडियो स्वतः डाउनलोड गर्ने प्राथमिकता", "Preference for automatic video downloads"),
          "data.autoDownloadVideos",
          d.autoDownloadVideos
        )}

        ${toggleRow(
          t("मिडिया Device मा Save", "Save media to device"),
          t("मिडिया Device मा सुरक्षित गर्ने प्राथमिकता", "Preference for saving media to the device"),
          "data.saveMediaToDevice",
          d.saveMediaToDevice
        )}

      `)}

      ${card(`

        <div class="ksk-settings-storage-actions">

          <button type="button" data-settings-action="export">
            📤 ${t("सेटिङ Export गर्नुहोस्", "Export settings")}
          </button>

          <button type="button" data-settings-action="import">
            📥 ${t("सेटिङ Import गर्नुहोस्", "Import settings")}
          </button>

          <button type="button" data-settings-action="reset">
            ↺ ${t("सेटिङ Reset गर्नुहोस्", "Reset settings")}
          </button>

        </div>

      `)}

      <input
        type="file"
        id="kskSettingsImportFile"
        accept=".json,application/json"
        hidden>

      <div class="ksk-settings-info">
        ${t(
          "Auto Download र Device मा Save हाल प्राथमिकता मात्र हुन्। वास्तविक Media Download व्यवहार प्रदान गर्नुपर्नेछ।",
          "Auto-download and save-to-device are preferences only until connected to the media system."
        )}
      </div>
    `;
  }

  /* =======================================================
     LANGUAGE
  ======================================================= */

  function renderLanguage() {
    const language = getSettings().language;

    return `
      ${backButton()}

      ${sectionHeader(
        t("भाषा", "Language"),
        t("एप प्रयोग गर्ने भाषा छान्नुहोस्", "Choose your app language")
      )}

      ${card(
        selectRow(
          t("एपको भाषा", "App language"),
          t("नेपाली वा अंग्रेजी", "Nepali or English"),
          "language",
          language,
          [
            { value: "ne", label: "नेपाली" },
            { value: "en", label: "English" }
          ]
        )
      )}
    `;
  }

  /* =======================================================
     HELP
  ======================================================= */

  function renderHelp() {
    return `
      ${backButton()}

      ${sectionHeader(
        t("सहयोग", "Help"),
        t("हाम्रो संसार प्रयोग गर्दा सहयोग", "Help using Hamro Sansar")
      )}

      ${card(`
        <div class="ksk-settings-info">
          ${t(
            "सुझाव वा समस्या भए एपको व्यवस्थापन टोलीलाई जानकारी दिनुहोस्।",
            "Contact the app management team if you have a suggestion or problem."
          )}
        </div>
      `)}
    `;
  }

  /* =======================================================
     ABOUT
  ======================================================= */

  function renderAbout() {
    return `
      ${backButton()}

      ${sectionHeader(
        t("हाम्रो संसार", "Hamro Sansar"),
        t("साथी जोडौँ, कुरा गरौँ", "Connect with friends")
      )}

      <div class="ksk-settings-about">

        <div class="ksk-settings-about-logo">
          🌏
        </div>

        <h3>हाम्रो संसार</h3>

        <p>
          ${t(
            "साथी जोडौँ, कुरा गरौँ。",
            "Connect with friends and talk."
          )}
        </p>

        <small>KSK Social App</small>

      </div>
    `;
  }

  /* =======================================================
     SECTION ROUTER
  ======================================================= */

  const renderers = {
    main: renderMain,
    account: renderAccount,
    privacy: renderPrivacy,
    notifications: renderNotifications,
    appearance: renderAppearance,
    profile: renderProfile,
    chats: renderChats,
    data: renderData,
    language: renderLanguage,
    help: renderHelp,
    about: renderAbout
  };

  function getSectionContent() {
    const renderer = renderers[activeSection] || renderMain;
    return renderer();
  }

  /* =======================================================
     RENDER
  ======================================================= */

  function render() {
    const modal = $("#settingsModal");

    if (!modal) return false;

    const body = $("#settingsBody", modal) ||
      $(".modal-body", modal);

    if (!body) return false;

    const title = $("#settingsTitle", modal);

    if (title) {
      title.textContent =
        sectionNames[activeSection]?.[isEnglish() ? 1 : 0] ||
        t("सेटिङ", "Settings");
    }

    body.innerHTML = getSectionContent();

    modal.classList.add("ksk-settings-active");

    return true;
  }

  /* =======================================================
     OPEN / CLOSE
  ======================================================= */

  function open() {
    const modal = $("#settingsModal");

    if (!modal) return false;

    activeSection = "main";

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    return render();
  }

  function close() {
    const modal = $("#settingsModal");

    if (!modal) return false;

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("ksk-settings-active");

    return true;
  }

  /* =======================================================
     EXPORT SETTINGS
  ======================================================= */

  function exportSettings() {
    const data = SETTINGS()?.exportSettings?.();

    if (!data) {
      notify(
        "error",
        t("सेटिङ Export गर्न सकिएन।", "Could not export settings.")
      );
      return false;
    }

    const blob = new Blob([data], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ksk-settings-backup.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    global.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return true;
  }

  /* =======================================================
     IMPORT SETTINGS
  ======================================================= */

  function importSettingsFile(file) {
    if (!file) return false;

    const reader = new FileReader();

    reader.onload = () => {
      const success = SETTINGS()?.importSettings?.(
        String(reader.result || "")
      );

      if (success) {
        activeSection = "data";
        render();

        notify(
          "success",
          t(
            "सेटिङ सफलतापूर्वक Import भयो।",
            "Settings imported successfully."
          )
        );
      } else {
        notify(
          "error",
          t(
            "यो Backup फाइल मान्य छैन।",
            "This backup file is invalid."
          )
        );
      }
    };

    reader.onerror = () => {
      notify(
        "error",
        t("फाइल पढ्न सकिएन।", "Could not read the file.")
      );
    };

    reader.readAsText(file);

    return true;
  }

  /* =======================================================
     RESET SETTINGS
  ======================================================= */

  function resetSettings() {
    const confirmed = global.confirm(
      t(
        "सबै सेटिङ Default अवस्थामा फर्काउने हो?",
        "Reset all settings to their defaults?"
      )
    );

    if (!confirmed) return false;

    const result = SETTINGS()?.resetSettings?.();

    if (!result) {
      notify(
        "error",
        t("सेटिङ Reset गर्न सकिएन।", "Could not reset settings.")
      );
      return false;
    }

    activeSection = "main";
    render();

    notify(
      "success",
      t("सेटिङ Reset भयो।", "Settings reset successfully.")
    );

    return true;
  }

  /* =======================================================
     CHANGE HANDLERS
  ======================================================= */

  function handleClick(event) {
    const sectionButton = event.target.closest(
      "[data-settings-section]"
    );

    if (sectionButton) {
      const section = sectionButton.dataset.settingsSection;

      if (!renderers[section]) return;

      activeSection = section;
      render();
      return;
    }

    if (event.target.closest("[data-settings-back]")) {
      activeSection = "main";
      render();
      return;
    }

    const action = event.target.closest(
      "[data-settings-action]"
    );

    if (!action) return;

    const type = action.dataset.settingsAction;

    if (type === "export") {
      exportSettings();
    }

    if (type === "import") {
      $("#kskSettingsImportFile")?.click();
    }

    if (type === "reset") {
      resetSettings();
    }
  }

  function handleChange(event) {
    const toggle = event.target.closest(
      "[data-settings-toggle]"
    );

    if (toggle) {
      saveSetting(
        toggle.dataset.settingsToggle,
        toggle.checked
      );
      return;
    }

    const select = event.target.closest(
      "[data-settings-select]"
    );

    if (!select) return;

    const path = select.dataset.settingsSelect;
    const value = select.value;

    /* Language module owns language changes and persistence. */
    if (path === "language") {
      LANG()?.setLanguage?.(value);
      return;
    }

    /* Theme module applies the visual theme.
       KSKSettings remains the saved data owner. */
    if (path === "theme") {
      THEME()?.setTheme?.(value);
    }

    saveSetting(path, value);
  }

  function handleFileChange(event) {
    if (event.target.id !== "kskSettingsImportFile") {
      return;
    }

    importSettingsFile(event.target.files?.[0]);

    event.target.value = "";
  }

  /* =======================================================
     SETTINGS CHANGE EVENTS
  ======================================================= */

  function handleSettingsChange() {
    const modal = $("#settingsModal");

    if (modal && !modal.classList.contains("hidden")) {
      render();
    }
  }

  function handleLanguageChange() {
    const modal = $("#settingsModal");

    if (modal && !modal.classList.contains("hidden")) {
      render();
    }
  }

  /* =======================================================
     PROFILE MANAGE BUTTON
     Independent click handling
  ======================================================= */

  function handleManageButtonClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const button = target.closest("[data-open-settings]");

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    open();
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initialize() {
    if (initialized) return true;

    const modal = $("#settingsModal");

    if (!modal) {
      return false;
    }

    initialized = true;

    /* Profile Manage button:
       Capture phase मा स्वतन्त्र रूपमा क्लिक समात्ने। */
    document.addEventListener(
      "click",
      handleManageButtonClick,
      true
    );

    modal.addEventListener("click", handleClick);
    modal.addEventListener("change", handleChange);
    modal.addEventListener("change", handleFileChange);

    global.addEventListener(
      "ksk:settings-change",
      handleSettingsChange
    );

    global.addEventListener(
      "ksk:language-change",
      handleLanguageChange
    );

    return true;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKSettingsUI = Object.freeze({

    initialize,
    open,
    close,
    render,

    getActiveSection() {
      return activeSection;
    }

  });

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
