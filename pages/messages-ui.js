
"use strict";

/*
 * MERO SANSAR — WHATSAPP STYLE MESSENGER UI
 * Complete replacement: pages/messages-ui.js
 *
 * Keeps the existing KSKMessagesPage and Supabase APIs.
 * Does not change message sending, realtime, receipts or storage.
 */

(function (global) {
  "use strict";

  const Original = global.KSKMessagesPage;

  if (!Original || Original.__waMessengerUI) return;

  const STYLE_ID = "ksk-wa-messenger-final-style";
  let observer = null;

  function installStyles() {
    let style = document.getElementById(STYLE_ID);
    if (style) return;

    style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* ======================================
         GENERAL MESSENGER
      ====================================== */

      #otherPageText .ksk-msg-page {
        width: 100%;
        max-width: 850px;
        min-width: 0;
        margin: 0 auto;
        padding: 8px 0 16px;
        color: var(--color-text, #e5e7eb);
      }

      #otherPageText .ksk-msg-page *,
      #otherPageText .ksk-msg-page *::before,
      #otherPageText .ksk-msg-page *::after {
        box-sizing: border-box;
      }

      #otherPageText .ksk-msg-page h3 {
        margin: 8px 0 18px;
        font-size: 22px;
        font-weight: 800;
      }

      /* ======================================
         CONVERSATION LIST
      ====================================== */

      #otherPageText .ksk-msg-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        overflow: hidden;
        border: 1px solid var(--color-border, #29384d);
        border-radius: 17px;
        background: var(--color-surface, #111e30);
      }

      #otherPageText .ksk-msg-row {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        gap: 12px;
        min-width: 0;
        min-height: 76px;
        padding: 11px 13px;
        border: 0;
        border-bottom: 1px solid var(--color-border, #29384d);
        border-radius: 0;
        background: transparent;
      }

      #otherPageText .ksk-msg-row:last-child {
        border-bottom: 0;
      }

      #otherPageText .ksk-msg-avatar {
        flex: 0 0 50px;
        width: 50px;
        height: 50px;
        min-width: 50px;
        overflow: hidden;
        border-radius: 50%;
      }

      #otherPageText .ksk-msg-avatar img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #otherPageText .ksk-msg-row-main {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        cursor: pointer;
      }

      #otherPageText .ksk-msg-row-title {
        overflow: hidden;
        font-size: 15px;
        font-weight: 750;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #otherPageText .ksk-msg-row-subtitle {
        overflow: hidden;
        margin-top: 5px;
        font-size: 13px;
        line-height: 1.4;
        color: var(--color-muted, #94a3b8);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #otherPageText .ksk-msg-row .ksk-msg-actions {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: nowrap;
        gap: 4px;
      }

      #otherPageText .ksk-msg-row .ksk-msg-action {
        min-height: 34px;
        padding: 5px 8px;
        font-size: 11px;
      }

      #otherPageText .ksk-msg-unread {
        display: inline-flex;
        width: 9px;
        height: 9px;
        min-width: 9px;
        margin-left: 5px;
        border-radius: 50%;
        background: #25d366;
        font-size: 0;
        color: transparent;
      }

      /* ======================================
         SEARCH AND TABS
      ====================================== */

      #otherPageText .ksk-msg-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        gap: 8px;
        min-width: 0;
        margin: 12px 0;
      }

      #otherPageText .ksk-msg-search {
        flex: 1 1 auto;
        width: 100%;
        min-width: 0;
        min-height: 44px;
        padding: 10px 14px;
        border: 1px solid var(--color-border, #29384d);
        border-radius: 24px;
        background: var(--color-surface-secondary, #18263a);
        color: var(--color-text, #e5e7eb);
        font-size: 13px;
      }

      #otherPageText .ksk-msg-tabs {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 4px 0 10px;
        scrollbar-width: thin;
      }

      #otherPageText .ksk-msg-tab {
        flex: 0 0 auto;
        min-height: 37px;
        padding: 7px 14px;
        border-radius: 25px;
        font-size: 12px;
      }

      /* ======================================
         CHAT WINDOW
      ====================================== */

      #otherPageText .ksk-wa-chat-page {
        display: block;
        width: 100%;
        max-width: 850px;
        padding: 0;
        margin: 0 auto;
      }

      #otherPageText .ksk-wa-chat-page > .ksk-msg-detail {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: min(740px, calc(100dvh - 210px));
        min-height: 390px;
        min-width: 0;
        overflow: hidden;
        padding: 0;
        margin: 0;
        border: 1px solid var(--color-border, #29384d);
        border-radius: 16px;
        background: var(--color-surface, #111e30);
      }

      /* ======================================
         CHAT HEADER
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header {
        position: relative;
        z-index: 3;
        display: flex;
        flex: 0 0 66px;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-width: 0;
        min-height: 66px;
        padding: 8px 12px;
        border: 0;
        border-bottom: 1px solid var(--color-border, #29384d);
        background: var(--color-surface, #111e30);
      }

      #otherPageText .ksk-wa-chat-page .ksk-wa-back {
        display: inline-flex;
        flex: 0 0 36px;
        align-items: center;
        justify-content: center;
        width: 36px;
        min-width: 36px;
        height: 40px;
        min-height: 40px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--color-text, #e5e7eb);
        font-size: 0;
      }

      #otherPageText .ksk-wa-chat-page .ksk-wa-back::before {
        content: "←";
        font-size: 23px;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > button[data-action="open-chat-profile"] {
        display: inline-flex;
        flex: 0 0 44px;
        align-items: center;
        justify-content: center;
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
        padding: 0;
        overflow: hidden;
        border: 0;
        border-radius: 50%;
        background: transparent;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > button[data-action="open-chat-profile"] .ksk-msg-avatar {
        width: 44px;
        height: 44px;
        min-width: 44px;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main strong {
        display: block;
        overflow: hidden;
        font-size: 15px;
        font-weight: 750;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-status {
        overflow: hidden;
        margin-top: 3px;
        color: var(--color-muted, #94a3b8);
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ======================================
         HEADER MORE MENU
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-wa-more {
        position: relative;
        flex: 0 0 40px;
        width: 40px;
      }

      #otherPageText .ksk-wa-chat-page .ksk-wa-more > summary {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        color: var(--color-text, #e5e7eb);
        cursor: pointer;
        font-size: 25px;
        list-style: none;
      }

      #otherPageText .ksk-wa-chat-page .ksk-wa-more > summary::-webkit-details-marker {
        display: none;
      }

      #otherPageText .ksk-wa-chat-page .ksk-wa-more > summary::before {
        content: "⋮";
      }

      #otherPageText .ksk-wa-chat-page .ksk-wa-more-panel {
        position: absolute;
        top: 43px;
        right: 0;
        z-index: 20;
        min-width: 135px;
        padding: 7px;
        border: 1px solid var(--color-border, #29384d);
        border-radius: 12px;
        background: var(--color-surface, #111e30);
        box-shadow: 0 8px 24px rgba(0,0,0,.25);
      }

      #otherPageText .ksk-wa-chat-page .ksk-wa-more-panel button {
        width: 100%;
        min-height: 38px;
        padding: 8px 10px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text, #e5e7eb);
        text-align: left;
        font-size: 13px;
      }

      /* ======================================
         GROUP CONTROLS
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar {
        flex: 0 0 auto;
        margin: 0;
        padding: 7px 10px;
        border-bottom: 1px solid var(--color-border, #29384d);
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar:has([data-action="toggle-group-members"]) {
        flex-wrap: wrap;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar .ksk-msg-secondary {
        min-height: 34px;
        padding: 6px 10px;
        font-size: 11px;
      }

      /* ======================================
         MESSAGE HISTORY
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-msg-history {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        width: 100%;
        min-width: 0;
        min-height: 0;
        max-height: none;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 14px 11px;
        margin: 0;
        background: #0b141a;
        scrollbar-width: thin;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history > .ksk-msg-empty {
        align-self: center;
        width: 100%;
        margin: auto 0;
        border: 0;
        background: transparent;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
        display: block;
        flex: 0 0 auto;
        width: fit-content;
        max-width: min(82%, 560px);
        min-width: 0;
        height: auto;
        min-height: 0;
        padding: 8px 11px 6px;
        margin: 0;
        border: 0;
        border-radius: 12px;
        background: #202c33;
        color: #e9edef;
        font-size: 14px;
        line-height: 1.5;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        box-shadow: 0 1px 1px rgba(0,0,0,.12);
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-them {
        align-self: flex-start;
        border-top-left-radius: 4px;
        background: #202c33;
        color: #e9edef;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-me {
        align-self: flex-end;
        border-top-right-radius: 4px;
        background: #005c4b;
        color: #e9edef;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.deleted {
        opacity: .75;
        font-style: italic;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-time {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 4px;
        margin-top: 5px;
        font-size: 10px;
        line-height: 1.3;
        opacity: .7;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-status {
        color: #8bd3f7;
        font-size: 10px;
        white-space: nowrap;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-media {
        display: block;
        max-width: 100%;
        max-height: 280px;
        margin-top: 7px;
        border-radius: 9px;
        object-fit: contain;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-reply-preview {
        padding: 7px 9px;
        margin: 0 0 7px;
        border-left: 3px solid #25a58d;
        border-radius: 6px;
        background: rgba(37,165,141,.12);
        font-size: 12px;
      }

      /* ======================================
         MESSAGE OPTIONS
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 6px;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-actions button {
        min-height: 29px;
        padding: 4px 8px;
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 7px;
        background: rgba(255,255,255,.08);
        color: inherit;
        font-size: 10px;
      }

      /* ======================================
         SEARCH RESULTS / OLDER MESSAGES
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-msg-search-results {
        flex: 0 0 auto;
        max-height: 125px;
        overflow-y: auto;
        padding: 5px 10px;
        margin: 0;
        background: var(--color-surface, #111e30);
      }

      #otherPageText .ksk-wa-chat-page [data-action="load-older"] {
        flex: 0 0 auto;
        align-self: center;
        min-height: 30px;
        padding: 4px 12px;
        margin: 6px 0;
        border-radius: 20px;
        font-size: 11px;
      }

      /* ======================================
         REPLY BAR
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-reply-preview {
        flex: 0 0 auto;
        padding: 9px 12px;
        margin: 0;
        border-top: 1px solid var(--color-border, #29384d);
        border-bottom: 1px solid var(--color-border, #29384d);
        border-left: 3px solid #25a58d;
        border-radius: 0;
        background: var(--color-surface, #111e30);
        font-size: 12px;
      }

      /* ======================================
         MESSAGE COMPOSER
      ====================================== */

      #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
        position: relative;
        z-index: 2;
        display: flex;
        flex: 0 0 auto;
        align-items: flex-end;
        gap: 7px;
        width: 100%;
        min-width: 0;
        padding: 9px 10px;
        padding-bottom: calc(9px + env(safe-area-inset-bottom, 0px));
        margin: 0;
        border-top: 1px solid var(--color-border, #29384d);
        background: var(--color-surface, #111e30);
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose {
        display: block;
        flex: 1 1 auto;
        width: 100%;
        min-width: 0;
        min-height: 43px;
        max-height: 115px;
        padding: 11px 15px;
        border: 1px solid var(--color-border, #34445a);
        border-radius: 23px;
        background: var(--color-surface-secondary, #18263a);
        color: var(--color-text, #e5e7eb);
        font-size: 14px;
        line-height: 1.4;
        resize: none;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        flex-wrap: nowrap;
        gap: 6px;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
        display: inline-flex;
        flex: 0 0 40px;
        align-items: center;
        justify-content: center;
        width: 40px;
        min-height: 40px;
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--color-border, #34445a);
        border-radius: 50%;
        background: transparent;
        color: transparent;
        font-size: 0;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label::before {
        content: "📎";
        color: var(--color-text, #e5e7eb);
        font-size: 18px;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions input[type="file"] {
        display: none;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
        display: inline-flex;
        flex: 0 0 44px;
        align-items: center;
        justify-content: center;
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: #128c7e;
        color: transparent;
        font-size: 0;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary::before {
        content: "➤";
        color: white;
        font-size: 20px;
      }

      /* ======================================
         DARK / LIGHT THEME SUPPORT
      ====================================== */

      html[data-theme="light"] #otherPageText .ksk-wa-chat-page .ksk-msg-history {
        background: #efeae2;
      }

      html[data-theme="light"] #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-them {
        background: #ffffff;
        color: #172033;
      }

      html[data-theme="light"] #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-me {
        background: #d9fdd3;
        color: #173b2c;
      }

      html[data-theme="light"] #otherPageText .ksk-wa-chat-page .ksk-msg-status {
        color: #1684c7;
      }

      /* ======================================
         MOBILE
      ====================================== */

      @media (max-width: 600px) {
        #otherPageText .ksk-msg-page {
          padding: 4px 0 10px;
        }

        #otherPageText .ksk-wa-chat-page {
          padding: 0;
        }

        #otherPageText .ksk-wa-chat-page > .ksk-msg-detail {
          height: calc(100dvh - 175px);
          min-height: 340px;
          border-radius: 12px;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header {
          flex-basis: 60px;
          min-height: 60px;
          padding: 7px 8px;
          gap: 7px;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-history {
          padding: 12px 9px;
          gap: 8px;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
          max-width: 86%;
          min-width: 0;
          padding: 8px 10px 6px;
          font-size: 13px;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
          gap: 5px;
          padding: 7px 7px;
          padding-bottom: calc(7px + env(safe-area-inset-bottom, 0px));
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-compose {
          min-height: 41px;
          padding: 10px 12px;
          font-size: 13px;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions {
          gap: 5px;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
          flex-basis: 36px;
          width: 36px;
          min-height: 36px;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
          flex-basis: 40px;
          width: 40px;
          min-width: 40px;
          height: 40px;
          min-height: 40px;
        }

        #otherPageText .ksk-msg-row {
          min-height: 70px;
          padding: 9px 10px;
        }

        #otherPageText .ksk-msg-row .ksk-msg-actions {
          gap: 3px;
        }
      }

      @media (max-height: 600px) {
        #otherPageText .ksk-wa-chat-page > .ksk-msg-detail {
          height: calc(100dvh - 125px);
          min-height: 260px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function moveChatControls() {
    const root = document.getElementById("otherPageText");
    if (!root) return;

    root.querySelectorAll(".ksk-msg-page").forEach(page => {
      const detail = page.querySelector(".ksk-msg-detail");

      page.classList.toggle("ksk-wa-chat-page", Boolean(detail));
      page.classList.toggle("ksk-wa-list-page", !detail);

      if (!detail) return;

      const header = detail.querySelector(".ksk-msg-chat-header");
      if (!header) return;

      /* Move Back button into the chat header. */
      const back = page.querySelector(':scope > [data-action="back"]');

      if (back && back.parentElement !== header) {
        back.classList.add("ksk-wa-back");
        header.prepend(back);
      }

      /* Put Block inside the three-dot menu. */
      const block = header.querySelector('[data-action="block-user"]');

      if (block && !header.querySelector(".ksk-wa-more")) {
        const menu = document.createElement("details");
        menu.className = "ksk-wa-more";

        const summary = document.createElement("summary");
        summary.setAttribute("aria-label", "More chat options");

        const panel = document.createElement("div");
        panel.className = "ksk-wa-more-panel";

        block.textContent = "Block";
        panel.appendChild(block);
        menu.append(summary, panel);
        header.appendChild(menu);
      }

      /* Ensure the chat detail is the only chat container. */
      detail.classList.add("ksk-wa-chat-detail");
    });
  }

  function installObserver() {
    if (observer || !global.MutationObserver || !document.body) return;

    observer = new MutationObserver(() => {
      moveChatControls();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    moveChatControls();
  }

  function renderWithStyles(method, context, args) {
    const result = method.apply(context, args);
    installStyles();

    if (typeof result === "string") {
      return result;
    }

    return result;
  }

  const Enhanced = Object.create(Original);

  Object.defineProperties(Enhanced, {
    render: {
      enumerable: true,
      value: function () {
        return renderWithStyles(Original.render, Original, arguments);
      }
    },

    renderChat: {
      enumerable: true,
      value: function () {
        return renderWithStyles(Original.renderChat, Original, arguments);
      }
    },

    renderConversationList: {
      enumerable: true,
      value: function () {
        return renderWithStyles(
          Original.renderConversationList,
          Original,
          arguments
        );
      }
    },

    __waMessengerUI: {
      value: true
    }
  });

  global.KSKMessagesPage = Enhanced;

  function start() {
    installStyles();
    installObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

})(window);
