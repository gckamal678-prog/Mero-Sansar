
"use strict";

/*
 * MERO SANSAR — WHATSAPP-LIKE MESSENGER UI
 * FULL REPLACEMENT: pages/messages-ui.js
 *
 * FIXES:
 * 1. Chat header overlap
 * 2. Conversation title behind chat
 * 3. Message bubble excessive height
 * 4. Left/right message alignment
 * 5. File and Send horizontal layout
 * 6. Mobile chat height and scrolling
 *
 * UI ONLY:
 * Supabase, realtime, messaging and event handlers untouched.
 */

(function () {
  "use strict";

  const STYLE_ID = "ksk-messenger-ui-v5";

  const OLD_STYLE_IDS = [
    "ksk-messenger-ui-v3",
    "ksk-messenger-ui-v4",
    "ksk-wa-messenger-final-style",
    "ksk-messenger-repair-v2"
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
       WHEN CHAT IS OPEN
    ===================================== */

    #otherPageText.ksk-chat-active > .ksk-msg-page:not(.ksk-wa-chat-page) {
      display: none !important;
    }

    #otherPageText.ksk-chat-active > h3 {
      display: none !important;
    }


    /* =====================================
       CONVERSATION TITLE
    ===================================== */

    #otherPageText .ksk-msg-page:not(.ksk-wa-chat-page) > h3 {
      margin: 12px 16px 10px !important;
      font-size: 22px !important;
      font-weight: 700 !important;
      color: #e9edef !important;
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

    #otherPageText .ksk-msg-toolbar [data-action="open-group-form"] {
      display: inline-flex !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: 40px !important;
      padding: 6px 14px !important;
      border: 0 !important;
      border-radius: 20px !important;
      background: #00a884 !important;
      color: #111b21 !important;
      font-weight: 600 !important;
    }


    /* =====================================
       TABS
    ===================================== */

    #otherPageText .ksk-msg-tabs {
      display: flex !important;
      flex-direction: row !important;
      gap: 8px !important;
      overflow-x: auto !important;
      padding: 0 12px 10px !important;
      scrollbar-width: none !important;
    }

    #otherPageText .ksk-msg-tabs::-webkit-scrollbar {
      display: none !important;
    }

    #otherPageText .ksk-msg-tab {
      flex: 0 0 auto !important;
      min-height: 32px !important;
      padding: 6px 12px !important;
      border: 0 !important;
      border-radius: 16px !important;
      background: #111b21 !important;
      color: #8696a0 !important;
      font-size: 13px !important;
    }

    #otherPageText .ksk-msg-tab.active,
    #otherPageText .ksk-msg-tab:hover {
      background: #005c4b !important;
      color: #e9edef !important;
    }


    /* =====================================
       CONVERSATION LIST
    ===================================== */

    #otherPageText .ksk-msg-list {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      background: #0b141a !important;
    }

    #otherPageText .ksk-msg-row {
      display: grid !important;
      grid-template-columns: 48px minmax(0, 1fr) 36px !important;
      align-items: center !important;
      gap: 12px !important;
      width: 100% !important;
      min-height: 70px !important;
      padding: 8px 12px !important;
      border-bottom: 1px solid #222d34 !important;
      background: transparent !important;
    }

    #otherPageText .ksk-msg-row:hover {
      background: #202c33 !important;
    }

    #otherPageText .ksk-msg-avatar {
      display: inline-flex !important;
      width: 48px !important;
      height: 48px !important;
      border-radius: 50% !important;
      overflow: hidden !important;
    }

    #otherPageText .ksk-msg-avatar img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
    }

    #otherPageText .ksk-msg-row-main {
      min-width: 0 !important;
      overflow: hidden !important;
      cursor: pointer !important;
    }

    #otherPageText .ksk-msg-row-title {
      font-size: 15px !important;
      font-weight: 500 !important;
      color: #e9edef !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    #otherPageText .ksk-msg-row-subtitle {
      margin-top: 2px !important;
      font-size: 13px !important;
      color: #8696a0 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }


    /* =====================================
       THREE DOT MENUS
    ===================================== */

    #otherPageText .ksk-msg-row > .ksk-msg-actions {
      display: none !important;
    }

    #otherPageText .ksk-msg-options,
    #otherPageText .ksk-wa-chat-menu {
      position: relative !important;
      width: 36px !important;
      flex: 0 0 auto !important;
    }

    #otherPageText .ksk-msg-options > summary,
    #otherPageText .ksk-wa-chat-menu > summary {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 36px !important;
      height: 36px !important;
      cursor: pointer !important;
      list-style: none !important;
      font-size: 20px !important;
      color: #8696a0 !important;
      border-radius: 50% !important;
    }

    #otherPageText .ksk-msg-options > summary::-webkit-details-marker,
    #otherPageText .ksk-wa-chat-menu > summary::-webkit-details-marker {
      display: none !important;
    }

    #otherPageText .ksk-msg-options > summary::before,
    #otherPageText .ksk-wa-chat-menu > summary::before {
      content: "⋮";
    }

    #otherPageText .ksk-msg-options-panel,
    #otherPageText .ksk-wa-chat-menu-panel {
      position: absolute !important;
      top: 36px !important;
      right: 0 !important;
      z-index: 999 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
      width: 150px !important;
      padding: 6px !important;
      border: 1px solid #222d34 !important;
      border-radius: 8px !important;
      background: #233138 !important;
      box-shadow: 0 8px 24px rgba(0,0,0,.4) !important;
    }

    #otherPageText .ksk-msg-options-panel button,
    #otherPageText .ksk-wa-chat-menu-panel button {
      width: 100% !important;
      padding: 8px 10px !important;
      border: 0 !important;
      border-radius: 4px !important;
      background: transparent !important;
      color: #e9edef !important;
      text-align: left !important;
      font-size: 13px !important;
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
      height: calc(100dvh - 150px) !important;
      min-height: 0 !important;
      max-height: calc(100dvh - 150px) !important;

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
       CHAT HEADER — OVERLAP FIX
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

      overflow: visible !important;

      background: #202c33 !important;
      border-bottom: 1px solid #222d34 !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > [data-action="back"] {
      position: relative !important;
      z-index: 2 !important;

      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;

      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;

      flex: 0 0 36px !important;

      border: 0 !important;
      background: transparent !important;
      color: #aebac1 !important;
      font-size: 22px !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > button[data-action="open-chat-profile"] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;

      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;

      flex: 0 0 40px !important;

      border-radius: 50% !important;
      overflow: hidden !important;
      border: 0 !important;
      padding: 0 !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main {
      position: relative !important;
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
       CHAT SEARCH TOOLBAR
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar {
      position: relative !important;
      z-index: 5 !important;

      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;

      flex: 0 0 auto !important;
      min-height: 52px !important;

      margin: 0 !important;
      padding: 6px 12px !important;

      background: #111b21 !important;
      border-bottom: 1px solid #222d34 !important;
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

      overflow-x: hidden !important;
      overflow-y: auto !important;

      overscroll-behavior: contain !important;
      -webkit-overflow-scrolling: touch !important;

      background-color: #0b141a !important;
    }


    /* =====================================
       MESSAGE BUBBLES — HEIGHT FIX
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
      position: relative !important;

      display: block !important;

      width: fit-content !important;
      max-width: min(75%, 520px) !important;
      min-width: 0 !important;

      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;

      flex: 0 0 auto !important;

      margin: 0 !important;
      padding: 8px 12px 6px !important;

      border-radius: 8px !important;

      font-size: 14px !important;
      line-height: 1.4 !important;

      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      white-space: pre-wrap !important;
    }

    /* RECEIVED MESSAGES */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item:not(.from-me),
    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-them {
      align-self: flex-start !important;

      background: #202c33 !important;
      color: #e9edef !important;

      border-top-left-radius: 0 !important;
    }

    /* SENT MESSAGES */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-me {
      align-self: flex-end !important;

      background: #005c4b !important;
      color: #e9edef !important;

      border-top-right-radius: 0 !important;
    }

    /* MESSAGE CONTENT */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item > p {
      margin: 0 !important;
      padding: 0 !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item img {
      display: block !important;
      max-width: 100% !important;
      height: auto !important;
      object-fit: contain !important;
      border-radius: 6px !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item audio,
    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item video {
      display: block !important;
      max-width: 100% !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-item iframe {
      max-width: 100% !important;
    }


    /* =====================================
       MESSAGE TIME
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-history-time {
      display: inline-flex !important;
      float: right !important;
      align-items: center !important;

      gap: 3px !important;

      margin-left: 8px !important;
      margin-top: 4px !important;

      font-size: 11px !important;
      color: rgba(255,255,255,.6) !important;
    }


    /* =====================================
       MESSAGE OPTIONS
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-menu {
      position: absolute !important;
      top: 4px !important;
      right: 4px !important;
      z-index: 30 !important;
    }


    /* =====================================
       COMPOSER — MAIN FIX
    ===================================== */

    #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
      position: relative !important;
      z-index: 10 !important;

      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;

      gap: 8px !important;

      width: 100% !important;
      min-width: 0 !important;

      min-height: 64px !important;
      height: auto !important;

      flex: 0 0 auto !important;

      margin: 0 !important;
      padding: 8px 12px !important;

      background: #202c33 !important;
      border-top: 1px solid #222d34 !important;
    }


    /* MESSAGE INPUT */

    #otherPageText .ksk-wa-chat-page .ksk-msg-compose {
      display: block !important;

      flex: 1 1 0 !important;

      width: 1% !important;
      min-width: 0 !important;

      min-height: 44px !important;
      max-height: 100px !important;

      margin: 0 !important;
      padding: 10px 14px !important;

      border: 0 !important;
      border-radius: 8px !important;

      background: #2a3942 !important;
      color: #e9edef !important;

      font-size: 14px !important;
      line-height: 1.4 !important;

      resize: none !important;
    }


    /* FILE + SEND CONTAINER */

    #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions {
      display: flex !important;

      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: center !important;

      gap: 6px !important;

      width: auto !important;
      min-width: 0 !important;

      flex: 0 0 auto !important;

      margin: 0 !important;
      padding: 0 !important;
    }


    /* FILE BUTTON */

    #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
      display: inline-flex !important;

      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;

      flex: 0 0 40px !important;

      width: 40px !important;
      min-width: 40px !important;
      height: 42px !important;

      margin: 0 !important;
      padding: 2px !important;

      cursor: pointer !important;

      color: #8696a0 !important;
      font-size: 13px !important;
      text-align: center !important;
    }


    /* SEND BUTTON */

    #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
      display: inline-flex !important;

      flex-direction: row !important;
      align-items: center !important;
      justify-content: center !important;

      flex: 0 0 auto !important;

      min-width: 48px !important;
      width: auto !important;
      height: 42px !important;

      margin: 0 !important;
      padding: 0 12px !important;

      border: 0 !important;
      border-radius: 22px !important;

      background: #00a884 !important;
      color: #111b21 !important;

      font-weight: 600 !important;
      font-size: 14px !important;

      white-space: nowrap !important;
      cursor: pointer !important;
    }

    #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary:active {
      opacity: .8 !important;
    }


    /* =====================================
       MOBILE RESPONSIVE
    ===================================== */

    @media (max-width: 480px) {

      #otherPageText .ksk-wa-chat-page {
        width: 100% !important;
        max-width: 100% !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history {
        padding: 10px 12px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
        max-width: 82% !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
        gap: 5px !important;
        padding: 8px 8px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose {
        min-width: 0 !important;
        padding: 10px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions {
        gap: 3px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
        width: 34px !important;
        min-width: 34px !important;
        flex-basis: 34px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
        min-width: 42px !important;
        padding: 0 9px !important;
        font-size: 13px !important;
      }
    }

    `;

    document.head.appendChild(style);
  }


  /* =========================================
     2. CREATE OPTIONS MENU
  ========================================= */

  function createMenu(container, className, label) {

    const details = document.createElement("details");
    details.className = className;

    const summary = document.createElement("summary");
    summary.setAttribute("aria-label", label);

    const panel = document.createElement("div");
    panel.className = className + "-panel";

    details.append(summary, panel);
    container.appendChild(details);

    return panel;
  }


  /* =========================================
     3. REPAIR CONVERSATION ROWS
  ========================================= */

  function repairConversationRows(root) {

    root.querySelectorAll(".ksk-msg-row").forEach(row => {

      if (row.querySelector(":scope > .ksk-msg-options")) {
        return;
      }

      const actions = row.querySelector(
        ":scope > .ksk-msg-actions"
      );

      if (!actions) return;

      const panel = createMenu(
        row,
        "ksk-msg-options",
        "Conversation options"
      );

      while (actions.firstChild) {
        panel.appendChild(actions.firstChild);
      }

      actions.remove();
    });
  }


  /* =========================================
     4. REPAIR CHAT PAGES
  ========================================= */

  function repairChatPages(root) {

    const pages = root.querySelectorAll(".ksk-msg-page");

    const activeChat = Array.from(pages).some(page => {
      return Boolean(
        page.querySelector(":scope > .ksk-msg-detail")
      );
    });

    if (root.id === "otherPageText") {
      root.classList.toggle("ksk-chat-active", activeChat);
    }

    pages.forEach(page => {

      const detail = page.querySelector(
        ":scope > .ksk-msg-detail"
      );

      page.classList.toggle(
        "ksk-wa-chat-page",
        Boolean(detail)
      );

      if (!detail) return;

      /* Move back button into header */

      const header = detail.querySelector(
        ":scope > .ksk-msg-chat-header"
      );

      if (!header) return;

      const back = page.querySelector(
        ':scope > [data-action="back"]'
      );

      if (back && back.parentElement !== header) {
        header.prepend(back);
      }

      /* Block menu */

      const block = header.querySelector(
        ':scope > [data-action="block-user"]'
      );

      if (
        block &&
        !header.querySelector(":scope > .ksk-wa-chat-menu")
      ) {

        const panel = createMenu(
          header,
          "ksk-wa-chat-menu",
          "Chat options"
        );

        block.textContent = "Block";
        panel.appendChild(block);
      }

      /* Message menus */

      detail.querySelectorAll(
        ".ksk-msg-history-item"
      ).forEach(bubble => {

        const actions = bubble.querySelector(
          ":scope > .ksk-msg-bubble-actions"
        );

        if (
          !actions ||
          bubble.querySelector(":scope > .ksk-msg-bubble-menu")
        ) {
          return;
        }

        const panel = createMenu(
          bubble,
          "ksk-msg-bubble-menu",
          "Message options"
        );

        while (actions.firstChild) {
          panel.appendChild(actions.firstChild);
        }

        actions.remove();
      });

    });
  }


  /* =========================================
     5. REPAIR APPLICATION
  ========================================= */

  function repair() {

    if (repairing) return;

    repairing = true;

    try {

      installStyles();

      const root =
        document.getElementById("otherPageText") ||
        document;

      repairConversationRows(root);
      repairChatPages(root);

    } catch (error) {

      console.error(
        "[KSK Messenger UI] Repair error:",
        error
      );

    } finally {

      repairing = false;

    }
  }


  /* =========================================
     6. START OBSERVER
  ========================================= */

  function start() {

    repair();

    if (
      !document.body ||
      !window.MutationObserver ||
      observer
    ) {
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


  /* =========================================
     7. INITIALIZE
  ========================================= */

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );

  } else {

    start();

  }

})();
