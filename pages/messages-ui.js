"use strict";

/*
 * MERO SANSAR — WHATSAPP-LIKE MESSENGER UI
 * FULL REPLACEMENT: pages/messages-ui.js
 *
 * FIXES:
 * 1. Removed overlapping "Conversations" title and cleaned chat header.
 * 2. Message bubbles wrap content nicely without excessive empty vertical space.
 * 3. WhatsApp-like composer layout: Left Emoji, Center Input, Right Gallery & Camera (and dynamic Send button).
 * 4. Send button appears ONLY when text is typed or a media/file is selected.
 *
 * UI ONLY:
 * Supabase, realtime, messaging and event handlers untouched.
 */

(function () {
  "use strict";

  const STYLE_ID = "ksk-messenger-ui-v6";

  const OLD_STYLE_IDS = [
    "ksk-messenger-ui-v3",
    "ksk-messenger-ui-v4",
    "ksk-wa-messenger-final-style",
    "ksk-messenger-repair-v2",
    "ksk-messenger-ui-v5"
  ];

  let observer = null;
  let repairing = false;

  /* =========================================
     1. INSTALL STYLES
  ========================================= */

  function installStyles() {
    OLD_STYLE_IDS.forEach(id => {
      document.getElementById(id)?.remove();
    });

    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `

    /* =====================================
       GLOBAL MESSENGER
    ===================================== */

    #otherPageText .ksk-msg-page {
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 850px !important;
      min-width: 0 !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #0b141a !important;
      color: #e9edef !important;
    }

    #otherPageText .ksk-msg-page *,
    #otherPageText .ksk-msg-page *::before,
    #otherPageText .ksk-msg-page *::after {
      box-sizing: border-box !important;
    }


    /* =====================================
       HIDE OLD CONVERSATION PAGE
       WHEN CHAT IS ACTIVE
    ===================================== */

    #otherPageText.ksk-chat-active > .ksk-msg-page:not(.ksk-wa-chat-page) {
      display: none !important;
    }

    #otherPageText.ksk-chat-active > h3 {
      display: none !important;
    }


    /* =====================================
       CONVERSATION TITLE (Fix Overlap)
    ===================================== */

    #otherPageText .ksk-msg-page:not(.ksk-wa-chat-page) > h3 {
      margin: 12px 16px 10px !important;
      font-size: 22px !important;
      font-weight: 700 !important;
      color: #e9edef !important;
      display: block !important;
    }

    /* जब च्याट सक्रिय हुन्छ, मुख्य पृष्ठको h3 (Conversations) पूर्ण रूपमा लुकाउने */
    #otherPageText.ksk-chat-active h3 {
      display: none !important;
    }


    /* =====================================
       SEARCH TOOLBAR
    ===================================== */

    #otherPageText .ksk-msg-toolbar {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 8px !important;
      width: 100% !important;
      margin: 0 0 10px !important;
      padding: 0 12px !important;
    }

    #otherPageText .ksk-msg-toolbar .ksk-msg-search {
      flex: 1 1 0 !important;
      width: 1% !important;
      min-width: 0 !important;
      min-height: 40px !important;
      padding: 8px 16px !important;
      border: 0 !important;
      border-radius: 20px !important;
      background: #111b21 !important;
      color: #e9edef !important;
      font-size: 14px !important;
    }


    /* =====================================
       CHAT PAGE — MAIN LAYOUT
    ===================================== */

    #otherPageText .ksk-wa-chat-page {
      position: relative !important;
      isolation: isolate !important;
      z-index: 2 !important;

      display: flex !important;
      flex-direction: column !important;

      width: 100% !important;
      height: calc(100dvh - 120px) !important;
      min-height: 0 !important;
      max-height: calc(100dvh - 120px) !important;

      margin: 0 !important;
      padding: 0 !important;

      overflow: hidden !important;

      background: #0b141a !important;
      color: #e9edef !important;
    }

    #otherPageText .ksk-wa-chat-page > .ksk-msg-detail {
      position: relative !important;
      isolation: isolate !important;
      z-index: 2 !important;

      display: flex !important;
      flex-direction: column !important;

      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;

      overflow: hidden !important;

      background: #0b141a !important;
      border: 0 !important;
    }


    /* =====================================
       CHAT HEADER — CLEAN & FIXED
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header {
      position: relative !important;
      isolation: isolate !important;
      z-index: 20 !important;

      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;

      gap: 10px !important;

      width: 100% !important;
      min-width: 0 !important;
      min-height: 60px !important;
      height: 60px !important;
      flex: 0 0 60px !important;

      margin: 0 !important;
      padding: 8px 12px !important;

      background: #202c33 !important;
      border-bottom: 1px solid #222d34 !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > [data-action="back"] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 36px !important;
      height: 36px !important;
      border: 0 !important;
      background: transparent !important;
      color: #aebac1 !important;
      font-size: 22px !important;
      cursor: pointer !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      overflow: hidden !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main strong {
      display: block !important;
      font-size: 16px !important;
      color: #e9edef !important;
      font-weight: 500 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-status {
      font-size: 12px !important;
      color: #8696a0 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }


    /* =====================================
       MESSAGE HISTORY
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history {
      position: relative !important;
      z-index: 1 !important;

      display: flex !important;
      flex: 1 1 auto !important;
      flex-direction: column !important;
      align-items: stretch !important;

      gap: 8px !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;

      padding: 12px 16px !important;
      overflow-y: auto !important;
      background-color: #0b141a !important;
    }


    /* =====================================
       MESSAGE BUBBLES — NO EXCESSIVE SPACE
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
      position: relative !important;
      display: inline-block !important;

      width: fit-content !important;
      max-width: min(78%, 520px) !important;
      min-width: 60px !important;

      height: auto !important;
      min-height: unset !important;
      max-height: none !important;

      flex: 0 0 auto !important;

      margin: 2px 0 !important;
      padding: 8px 12px 22px 12px !important; /* तलपट्टि समय देखाउने ठाउँको लागि प्याडिङ */

      border-radius: 8px !important;
      font-size: 14px !important;
      line-height: 1.4 !important;

      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      white-space: pre-wrap !important;
    }

    /* Received Messages */
    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item:not(.from-me),
    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-them {
      align-self: flex-start !important;
      background: #202c33 !important;
      color: #e9edef !important;
      border-top-left-radius: 0 !important;
    }

    /* Sent Messages */
    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-me {
      align-self: flex-end !important;
      background: #005c4b !important;
      color: #e9edef !important;
      border-top-right-radius: 0 !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item > p {
      margin: 0 !important;
      padding: 0 !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item img {
      display: block !important;
      max-width: 100% !important;
      height: auto !important;
      border-radius: 6px !important;
      margin-top: 4px !important;
    }


    /* =====================================
       MESSAGE TIME
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-time {
      position: absolute !important;
      bottom: 4px !important;
      right: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 3px !important;
      font-size: 10px !important;
      color: rgba(255, 255, 255, 0.6) !important;
    }


    /* =====================================
       WHATSAPP-LIKE COMPOSER & DYNAMIC SEND
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
      position: relative !important;
      z-index: 10 !important;

      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;

      gap: 8px !important;
      width: 100% !important;
      min-height: 60px !important;
      padding: 8px 12px !important;

      background: #202c33 !important;
      border-top: 1px solid #222d34 !important;
    }

    /* बायाँ Emoji बटनको लागि ठाउँ वा कन्टेनर */
    #otherPageText .ksk-wa-chat-page .ksk-msg-emoji-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 40px !important;
      height: 40px !important;
      background: transparent !important;
      border: 0 !important;
      color: #8696a0 !important;
      font-size: 22px !important;
      cursor: pointer !important;
      flex: 0 0 40px !important;
    }

    /* बीचमा लेख्ने ठाउँ (Textarea) */
    #otherPageText .ksk-wa-chat-page .ksk-msg-compose {
      display: block !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      min-height: 40px !important;
      max-height: 100px !important;
      padding: 9px 12px !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: #2a3942 !important;
      color: #e9edef !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      resize: none !important;
    }

    /* दायाँ Gallery र Camera बटनहरू (Actions) */
    #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 6px !important;
      flex: 0 0 auto !important;
    }

    /* Gallery र Camera/File आइकनहरू */
    #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label,
    #otherPageText .ksk-wa-chat-page .ksk-msg-camera-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 38px !important;
      height: 38px !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      background: transparent !important;
      color: #8696a0 !important;
      font-size: 20px !important;
      cursor: pointer !important;
      border-radius: 50% !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label:hover,
    #otherPageText .ksk-wa-chat-page .ksk-msg-camera-btn:hover {
      background: rgba(255, 255, 255, 0.05) !important;
      color: #e9edef !important;
    }

    /* Send बटन सुरुमा लुकाउने (खाली अवस्थामा नदेखिने) */
    #otherPageText .ksk-wa-chat-page .ksk-msg-primary,
    #otherPageText .ksk-wa-chat-page button[type="submit"] {
      display: none !important;
    }

    /* जब टेक्स्ट लेखिन्छ वा फाइल छानिन्छ, तब Send बटन देखाउने कक्षा (Class) */
    #otherPageText .ksk-wa-chat-page.has-content .ksk-msg-primary,
    #otherPageText .ksk-wa-chat-page.has-content button[type="submit"] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 40px !important;
      height: 40px !important;
      padding: 0 12px !important;
      border-radius: 50% !important;
      background: #00a884 !important;
      color: #111b21 !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      border: 0 !important;
    }

    `;

    document.head.appendChild(style);
  }


  /* =========================================
     2. REPAIR CHAT PAGES & DYNAMIC SEND LOGIC
  ========================================= */

  function repairChatPages(root) {
    const pages = root.querySelectorAll(".ksk-msg-page");

    const activeChat = Array.from(pages).some(page => {
      return Boolean(page.querySelector(":scope > .ksk-msg-detail"));
    });

    if (root.id === "otherPageText") {
      root.classList.toggle("ksk-chat-active", activeChat);
    }

    pages.forEach(page => {
      const detail = page.querySelector(":scope > .ksk-msg-detail");
      page.classList.toggle("ksk-wa-chat-page", Boolean(detail));

      if (!detail) return;

      const header = detail.querySelector(":scope > .ksk-msg-chat-header");
      if (!header) return;

      const back = page.querySelector(':scope > [data-action="back"]');
      if (back && back.parentElement !== header) {
        header.prepend(back);
      }

      /* WhatsApp Composer Layout Enhancement & Dynamic Send Button */
      const form = detail.querySelector(".ksk-msg-send-form");
      if (form) {
        const textarea = form.querySelector(".ksk-msg-compose");
        const actionsContainer = form.querySelector(".ksk-msg-compose-actions");

        // बायाँ Emoji बटन थप्ने (यदि छैन भने)
        if (!form.querySelector(".ksk-msg-emoji-btn") && textarea) {
          const emojiBtn = document.createElement("button");
          emojiBtn.type = "button";
          emojiBtn.className = "ksk-msg-emoji-btn";
          emojiBtn.innerHTML = "😊";
          emojiBtn.title = "Emoji";
          form.insertBefore(emojiBtn, textarea);
        }

        // दायाँ Camera बटन थप्ने (यदि ग्यालरी/फाइल बाहेक क्यामेरा थप्नुपर्ने भए)
        if (actionsContainer && !actionsContainer.querySelector(".ksk-msg-camera-btn")) {
          const cameraBtn = document.createElement("button");
          cameraBtn.type = "button";
          cameraBtn.className = "ksk-msg-camera-btn";
          cameraBtn.innerHTML = "📷";
          cameraBtn.title = "Camera";
          actionsContainer.appendChild(cameraBtn);
        }

        // सामग्री (Text वा File) आधारमा Send बटन देखाउने/लुकाउने लजिक
        const checkContent = () => {
          const hasText = textarea && textarea.value.trim().length > 0;
          // फाइल वा मिडिया छानिած छ कि छैन जाँच्ने
          const fileInput = form.querySelector('input[type="file"]');
          const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;

          if (hasText || hasFile) {
            page.classList.add("has-content");
          } else {
            page.classList.remove("has-content");
          }
        };

        if (textarea && !textarea.dataset.listenerAdded) {
          textarea.dataset.listenerAdded = "true";
          textarea.addEventListener("input", checkContent);
        }

        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && !fileInput.dataset.listenerAdded) {
          fileInput.dataset.listenerAdded = "true";
          fileInput.addEventListener("change", checkContent);
        }

        checkContent();
      }
    });
  }


  /* =========================================
     3. REPAIR RUNNER
  ========================================= */

  function repair() {
    if (repairing) return;
    repairing = true;

    try {
      installStyles();
      const root = document.getElementById("otherPageText") || document;
      repairChatPages(root);
    } catch (error) {
      console.error("[KSK Messenger UI] Repair error:", error);
    } finally {
      repairing = false;
    }
  }


  /* =========================================
     4. START MUTATION OBSERVER
  ========================================= */

  function start() {
    repair();

    if (!document.body || !window.MutationObserver || observer) {
      return;
    }

    observer = new MutationObserver(() => {
      repair();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

})();
