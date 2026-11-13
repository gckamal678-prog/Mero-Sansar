
"use strict";

/*
 * MERO SANSAR — FINAL POLISH PATCH
 * Story reaction flicker fix
 * QR image sharing
 * Fully localized PWA release notes
 * Optional notification sound
 *
 * Local-only. Does not modify KSKData or core/data.js.
 */

(function (global) {
  "use strict";

  if (global.KSKFinalPolish) return;

  const STORY_KEY = "ksk_home_story_features_v1";
  const NOTIFICATION_KEY = "ksk_notifications_ui_v1";
  const QR_ENDPOINT = "https://api.qrserver.com/v1/create-qr-code/";

  const $ = (selector, root = document) => root.querySelector(selector);

  const language = () =>
    global.KSKLanguage?.getLanguage?.() === "en" ? "en" : "ne";

  const t = (ne, en) => language() === "en" ? en : ne;

  function toast(message, type = "info") {
    const api = global.KSKToast;

    if (typeof api?.[type] === "function") {
      api[type](message);
    } else {
      api?.show?.(message, type);
    }
  }

  function readJSON(key, fallback) {
    try {
      const value = global.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Final polish: local setting read failed", error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Final polish: local setting save failed", error);
      toast(t(
        "सेटिङ सुरक्षित गर्न सकिएन।",
        "Could not save this setting."
      ), "error");
      return false;
    }
  }

  /* =====================================================
     1. STORY REACTION — NO MODAL REOPEN
  ===================================================== */

  function handleStoryReaction(event) {
    const button = event.target?.closest?.(
      "[data-home-story-reaction][data-story-id]"
    );

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const storyId = String(button.dataset.storyId || "");
    const emoji = String(button.dataset.homeStoryReaction || "");

    const allowed = ["❤️", "👍", "😂", "😮", "😢"];

    if (!storyId || !allowed.includes(emoji)) return;

    const profile = global.KSKData?.getProfile?.() || {};
    const viewerId = String(profile.id || "local-device");

    const state = readJSON(STORY_KEY, {
      version: 1,
      items: {}
    });

    if (
      !state ||
      typeof state !== "object" ||
      !state.items ||
      typeof state.items !== "object"
    ) {
      toast(
        t(
          "Story प्रतिक्रिया सुरक्षित गर्न सकिएन।",
          "Could not save the Story reaction."
        ),
        "error"
      );
      return;
    }

    const feature =
      state.items[storyId] &&
      typeof state.items[storyId] === "object"
        ? state.items[storyId]
        : {};

    const reactions =
      feature.reactions &&
      typeof feature.reactions === "object"
        ? { ...feature.reactions }
        : {};

    if (reactions[viewerId] === emoji) {
      delete reactions[viewerId];
    } else {
      reactions[viewerId] = emoji;
    }

    state.items[storyId] = {
      ...feature,
      reactions
    };

    state.version = 1;

    if (!writeJSON(STORY_KEY, state)) return;

    const view = button.closest(".ksk-story-feature-view");

    if (!view) return;

    const counts = {};

    Object.values(reactions).forEach(value => {
      if (allowed.includes(value)) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    view.querySelectorAll(
      "[data-home-story-reaction]"
    ).forEach(item => {
      const selected =
        reactions[viewerId] === item.dataset.homeStoryReaction;

      item.classList.toggle("is-selected", selected);

      item.setAttribute(
        "aria-pressed",
        selected ? "true" : "false"
      );
    });

    const countLine = view.querySelector(
      ".ksk-story-reaction-row + .ksk-story-meta-line"
    );

    if (countLine) {
      const summary = Object.keys(counts)
        .map(key => key + " " + counts[key])
        .join(" · ");

      countLine.textContent = summary ||
        t(
          "अहिलेसम्म कुनै प्रतिक्रिया छैन।",
          "No reactions yet"
        );
    }
  }

  /* =====================================================
     2. QR — SHARE THE ACTUAL PNG IMAGE
  ===================================================== */

  function profileURL() {
    try {
      const url = new URL(global.location.href);
      url.hash = "profile";
      return url.toString();
    } catch (_) {
      return "";
    }
  }

  function qrImageURL(link) {
    return QR_ENDPOINT +
      "?size=640x640&margin=16&format=png&data=" +
      encodeURIComponent(link);
  }

  async function shareQR(event) {
    const button = event.target?.closest?.(
      "[data-profile-extra-share]"
    );

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const link = profileURL();

    if (!link) {
      toast(
        t(
          "प्रोफाइल लिंक उपलब्ध भएन।",
          "Profile link is unavailable."
        ),
        "error"
      );
      return;
    }

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = t(
      "QR तयार हुँदैछ…",
      "Preparing QR…"
    );

    try {
      const response = await fetch(qrImageURL(link), {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit"
      });

      if (!response.ok) {
        throw new Error(
          "QR image request failed: " + response.status
        );
      }

      const blob = await response.blob();

      if (!blob.type.includes("image")) {
        throw new Error("QR service did not return an image.");
      }

      const file = new File(
        [blob],
        "mero-sansar-profile-qr.png",
        { type: "image/png" }
      );

      const shareData = {
        files: [file],
        title: t(
          "मेरो संसार प्रोफाइल QR",
          "Mero Sansar Profile QR"
        ),
        text: t(
          "मेरो प्रोफाइल खोल्न यो QR स्क्यान गर्नुहोस्।",
          "Scan this QR code to open my profile."
        )
      };

      if (
        typeof navigator.share === "function" &&
        (
          !navigator.canShare ||
          navigator.canShare({ files: [file] })
        )
      ) {
        await navigator.share(shareData);

        toast(
          t("QR फोटो Share गरियो।", "QR image shared."),
          "success"
        );

        return;
      }

      const objectURL = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectURL;
      anchor.download = "mero-sansar-profile-qr.png";
      anchor.style.display = "none";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      global.setTimeout(
        () => URL.revokeObjectURL(objectURL),
        15000
      );

      toast(
        t(
          "QR फोटो डाउनलोड हुँदैछ। त्यसपछि Gallery बाट Share गर्नुहोस्।",
          "QR image is downloading. Share it from your Gallery."
        ),
        "success"
      );

    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("QR image sharing failed:", error);

        // QR service को CORS अनुमति नहुँदा पनि
        // QR फोटो छुट्टै खोल्ने fallback।
        const fallback = document.createElement("a");

        fallback.href = qrImageURL(link);
        fallback.target = "_blank";
        fallback.rel = "noopener noreferrer";
        fallback.click();

        toast(
          t(
            "QR फोटो छुट्टै खोलिएको छ। त्यसलाई सुरक्षित गरी Share गर्नुहोस्।",
            "The QR image was opened separately. Save it and share it."
          ),
          "warning"
        );
      }
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  /* =====================================================
     3. RELEASE NOTES — ONE LANGUAGE AT A TIME
  ===================================================== */

  const RELEASE_NOTES = {
    ne: [
      [
        "प्रोफाइल",
        "प्रोफाइलका बटन, तथ्याङ्क र उपयोगी साधनहरू व्यवस्थित।"
      ],
      [
        "साथीहरू",
        "साथी अनुरोध, साथी सूची, फलोअर र फलो गर्ने सूची सुधार।"
      ],
      [
        "स्टोरी",
        "स्टोरी हेर्ने, प्रतिक्रिया दिने, जवाफ लेख्ने, सङ्ग्रह र हाइलाइट सुविधा सुधार।"
      ],
      [
        "सुरक्षा",
        "सामग्री लुकाउने, उजुरी गर्ने र गोपनीयता विकल्प थप व्यवस्थित।"
      ],
      [
        "मस्यौदा र विवरण",
        "मस्यौदा सुरक्षित गर्ने र आफ्नो गतिविधि हेर्ने सुविधा।"
      ],
      [
        "डेटा बचत",
        "फोटो लोड हुने तरिका र कम डेटा प्रयोग गर्ने विकल्प सुधार।"
      ],
      [
        "सन्देश र सूचना",
        "सन्देश सूची, सूचना वर्गीकरण र सूचना व्यवस्थापन सुधार।"
      ],
      [
        "मोबाइल र एप अपडेट",
        "मोबाइल दृश्य, सन्देश पपअप, अफलाइन प्रयोग र अपडेट प्रक्रिया सुधार।"
      ]
    ],

    en: [
      [
        "Profile",
        "Profile buttons, statistics and useful tools reorganized."
      ],
      [
        "Friends",
        "Friend requests, friend lists, followers and following improved."
      ],
      [
        "Stories",
        "Story viewing, reactions, replies, archive and highlights improved."
      ],
      [
        "Safety",
        "Content hiding, reporting and privacy options reorganized."
      ],
      [
        "Drafts and insights",
        "Save drafts and review activity on this device."
      ],
      [
        "Data saver",
        "Image loading and low-data options improved."
      ],
      [
        "Messages and notifications",
        "Conversation lists, notification grouping and controls improved."
      ],
      [
        "Mobile and app updates",
        "Mobile layout, toast messages, offline use and update flow improved."
      ]
    ]
  };

  function refreshReleaseNotes() {
    const panel = $("#pwaUpdateDetails");

    if (!panel) return;

    const heading = panel.querySelector("h3");

    if (heading) {
      heading.textContent = t(
        "यस अपडेटमा भएका सुधारहरू",
        "Improvements in this update"
      );
    }

    let list = panel.querySelector(".pwa-update-notes");

    if (!list) {
      list = document.createElement("ul");
      list.className = "pwa-update-notes";

      const inner =
        panel.querySelector(".pwa-update-details-inner") ||
        panel;

      inner.appendChild(list);
    }

    list.replaceChildren();

    RELEASE_NOTES[language()].forEach(([title, description]) => {
      const item = document.createElement("li");
      const strong = document.createElement("strong");
      const span = document.createElement("span");

      strong.textContent = title;
      span.textContent = description;

      item.append(strong, span);
      list.appendChild(item);
    });
  }

  /* =====================================================
     4. NOTIFICATION SOUND — OPTIONAL LOCAL ALERT
  ===================================================== */

  let audioContext = null;
  let audioUnlocked = false;
  let soundObserver = null;

  function notificationPreferences() {
    const saved = readJSON(NOTIFICATION_KEY, {});

    return saved && typeof saved === "object"
      ? saved
      : {};
  }

  function saveSoundPreference(enabled) {
    const prefs = notificationPreferences();

    prefs.soundEnabled = Boolean(enabled);

    return writeJSON(NOTIFICATION_KEY, prefs);
  }

  function ensureAudioContext() {
    const AudioContextClass =
      global.AudioContext ||
      global.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    return audioContext;
  }

  async function playNotificationSound(unlock = false) {
    try {
      const context = ensureAudioContext();

      if (!context) {
        toast(
          t(
            "यो ब्राउजरमा सूचना आवाज उपलब्ध छैन।",
            "Notification sound is unavailable in this browser."
          ),
          "warning"
        );

        return false;
      }

      if (context.state === "suspended") {
        await context.resume();
      }

      if (context.state !== "running") return false;

      audioUnlocked = true;

      const now = context.currentTime + 0.025;
      const master = context.createGain();

      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(
        0.12,
        now + 0.025
      );
      master.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.62
      );

      master.connect(context.destination);

      [[660, 0], [880, 0.16]].forEach(
        ([frequency, offset]) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();

          oscillator.type = "sine";

          oscillator.frequency.setValueAtTime(
            frequency,
            now + offset
          );

          gain.gain.setValueAtTime(
            0.0001,
            now + offset
          );

          gain.gain.exponentialRampToValueAtTime(
            0.75,
            now + offset + 0.018
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + offset + 0.22
          );

          oscillator.connect(gain);
          gain.connect(master);

          oscillator.start(now + offset);
          oscillator.stop(now + offset + 0.24);
        }
      );

      return true;

    } catch (error) {
      console.warn(
        "Notification sound could not play:",
        error
      );

      if (unlock) {
        toast(
          t(
            "आवाज सुरु भएन। फोनको Media Volume जाँच गर्नुहोस्।",
            "Sound could not start. Check your phone's media volume."
          ),
          "warning"
        );
      }

      return false;
    }
  }

  function injectSoundControls() {
    const panel = $("#kskNotificationSettings");

    const types = $(
      "#kskNotificationTypeSettings",
      panel || document
    );

    if (
      !panel ||
      !types ||
      panel.querySelector("[data-ksk-sound-controls]")
    ) {
      return;
    }

    const prefs = notificationPreferences();

    const wrap = document.createElement("div");

    wrap.dataset.kskSoundControls = "true";
    wrap.className = "ksk-notif-sound-controls";

    wrap.innerHTML = `
      <div class="ksk-notif-setting-row">
        <label for="kskNotificationSound">
          <strong>
            ${t(
              "सूचना आउँदा आवाज बजाउने",
              "Play a sound for new notifications"
            )}
          </strong>
        </label>

        <input
          id="kskNotificationSound"
          type="checkbox"
          data-ksk-notification-sound
          ${prefs.soundEnabled === true ? "checked" : ""}>
      </div>

      <div class="ksk-notif-sound-test-row">
        <button
          type="button"
          class="ksk-notif-btn"
          data-ksk-notification-sound-test>
          ${t("आवाज परीक्षण गर्नुहोस्", "Test sound")}
        </button>

        <span>
          ${t(
            "छोटो दुई-सुरको घण्टी बज्छ। आवाज फोनको Media Volume बाट नियन्त्रण हुन्छ।",
            "Plays a short two-tone chime. Volume is controlled by your phone's media volume."
          )}
        </span>
      </div>

      <p class="ksk-notif-meta">
        ${t(
          "आवाज नयाँ सूचना एप खुला हुँदा प्राप्त भएमा मात्र बज्छ। एप बन्द हुँदा Push सूचना र आवाजका लागि पछि Server र Push सेवा चाहिन्छ।",
          "Sound plays only for new notifications received while the app is open. Background push alerts require a server and push service later."
        )}
      </p>
    `;

    if (!$("#ksk-notif-sound-style")) {
      const style = document.createElement("style");

      style.id = "ksk-notif-sound-style";

      style.textContent = `
        .ksk-notif-sound-controls {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--border-color, #ddd);
        }

        .ksk-notif-sound-test-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
          margin: 8px 0;
        }

        .ksk-notif-sound-test-row span {
          flex: 1;
          min-width: 160px;
          font-size: 11px;
          line-height: 1.45;
          opacity: .75;
        }

        .ksk-notif-sound-controls .ksk-notif-meta {
          line-height: 1.5;
        }
      `;

      document.head.appendChild(style);
    }

    types.insertAdjacentElement("afterend", wrap);
  }

  function notificationType(item) {
    const raw = String(
      item?.type || item?.category || "other"
    ).toLowerCase();

    if (raw.includes("story") && raw.includes("reply")) {
      return "story_reply";
    }

    if (raw.includes("story") && raw.includes("react")) {
      return "story_reaction";
    }

    if (
      raw.includes("friend") &&
      (raw.includes("request") || raw.includes("accept"))
    ) {
      return raw.includes("accept")
        ? "friend_accepted"
        : "friend_request";
    }

    if (raw.includes("follow")) return "follower";
    if (raw.includes("comment")) return "post_comment";
    if (raw.includes("like")) return "post_like";
    if (raw.includes("message")) return "message";
    if (raw.includes("group")) return "group_activity";
    if (raw.includes("system")) return "system";

    return raw in (notificationPreferences().types || {})
      ? raw
      : "other";
  }

  function handleNewNotification(event) {
    const detail = event.detail || {};

    if (
      detail.action !== "add" ||
      !detail.item
    ) {
      return;
    }

    if (
      !String(detail.collection || "")
        .toLowerCase()
        .includes("notification")
    ) {
      return;
    }

    const prefs = notificationPreferences();

    if (
      prefs.enabled === false ||
      prefs.soundEnabled !== true
    ) {
      return;
    }

    const type = notificationType(detail.item);

    if (prefs.types && prefs.types[type] === false) {
      return;
    }

    if (audioUnlocked) {
      playNotificationSound(false);
    }
  }

  function handleSoundControl(event) {
    const toggle = event.target?.closest?.(
      "[data-ksk-notification-sound]"
    );

    if (toggle) {
      saveSoundPreference(toggle.checked);

      if (toggle.checked) {
        playNotificationSound(true).then(ok => {
          if (ok) {
            toast(
              t(
                "सूचना आवाज सुरु भयो।",
                "Notification sound enabled."
              ),
              "success"
            );
          }
        });
      } else {
        toast(
          t(
            "सूचना आवाज बन्द गरियो।",
            "Notification sound disabled."
          ),
          "info"
        );
      }

      return;
    }

    const test = event.target?.closest?.(
      "[data-ksk-notification-sound-test]"
    );

    if (test) {
      event.preventDefault();

      playNotificationSound(true).then(ok => {
        if (ok) {
          toast(
            t(
              "यो सूचना आवाज हो।",
              "This is the notification sound."
            ),
            "success"
          );
        }
      });
    }
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  function initialize() {
    document.addEventListener(
      "click",
      handleStoryReaction,
      true
    );

    document.addEventListener(
      "click",
      shareQR,
      true
    );

    document.addEventListener(
      "change",
      handleSoundControl,
      true
    );

    document.addEventListener(
      "click",
      handleSoundControl,
      true
    );

    global.addEventListener(
      "ksk:data-change",
      handleNewNotification
    );

    global.addEventListener(
      "ksk:language-change",
      refreshReleaseNotes
    );

    refreshReleaseNotes();
    injectSoundControls();

    if (global.MutationObserver && document.body) {
      soundObserver = new MutationObserver(() => {
        injectSoundControls();
      });

      soundObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    return true;
  }

  global.KSKFinalPolish = Object.freeze({
    initialize,
    refreshReleaseNotes,

    playNotificationSound: () =>
      playNotificationSound(true)
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
