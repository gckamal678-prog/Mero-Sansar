
"use strict";

/*
 * MERO SANSAR — MESSENGER UI REPAIR
 * Full replacement: pages/messages-ui.js
 *
 * Does not replace or wrap KSKMessagesPage.
 * Does not change Supabase, messages, realtime or event handlers.
 */

(function () {
  "use strict";

  const STYLE_ID = "ksk-messenger-repair-v2";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* PAGE */
      .ksk-msg-page {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: 850px !important;
        min-width: 0 !important;
        margin: 0 auto !important;
        padding: 8px !important;
      }

      .ksk-msg-page *,
      .ksk-msg-page *::before,
      .ksk-msg-page *::after {
        box-sizing: border-box !important;
      }

      /* CONVERSATION LIST */
      .ksk-msg-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        width: 100% !important;
        overflow: hidden !important;
        border: 1px solid var(--color-border, #29384d) !important;
        border-radius: 16px !important;
      }

      .ksk-msg-row {
        display: grid !important;
        grid-template-columns: 50px minmax(0, 1fr) 38px !important;
        align-items: center !important;
        gap: 11px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 76px !important;
        padding: 10px 12px !important;
        margin: 0 !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #29384d) !important;
        border-radius: 0 !important;
      }

      .ksk-msg-row:last-child {
        border-bottom: 0 !important;
      }

      .ksk-msg-avatar {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: none !important;
        width: 50px !important;
        height: 50px !important;
        min-width: 50px !important;
        overflow: hidden !important;
        border-radius: 50% !important;
      }

      .ksk-msg-avatar img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }

      .ksk-msg-row-main {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        overflow: hidden !important;
        cursor: pointer !important;
      }

      .ksk-msg-row-title {
        display: block !important;
        overflow: hidden !important;
        font-size: 15px !important;
        font-weight: 750 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .ksk-msg-row-subtitle {
        display: block !important;
        overflow: hidden !important;
        margin-top: 5px !important;
        font-size: 13px !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      /* CONVERSATION OPTIONS MENU */
      .ksk-msg-row > .ksk-msg-actions {
        display: none !important;
      }

      .ksk-msg-options {
        position: relative !important;
        display: block !important;
        width: 38px !important;
        min-width: 38px !important;
      }

      .ksk-msg-options > summary {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        height: 42px !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        list-style: none !important;
        font-size: 25px !important;
      }

      .ksk-msg-options > summary::-webkit-details-marker {
        display: none !important;
      }

      .ksk-msg-options > summary::before {
        content: "⋮";
      }

      .ksk-msg-options-panel {
        position: absolute !important;
        top: 40px !important;
        right: 0 !important;
        z-index: 30 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        width: 150px !important;
        padding: 7px !important;
        border: 1px solid var(--color-border, #29384d) !important;
        border-radius: 12px !important;
        background: var(--color-surface, #111e30) !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.3) !important;
      }

      .ksk-msg-options-panel .ksk-msg-action {
        display: block !important;
        width: 100% !important;
        min-height: 38px !important;
        padding: 8px 10px !important;
        border: 0 !important;
        border-radius: 8px !important;
        background: transparent !important;
        text-align: left !important;
        font-size: 13px !important;
      }

      /* SEARCH AND TABS */
      .ksk-msg-toolbar {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
      }

      .ksk-msg-search {
        flex: 1 1 auto !important;
        width: 100% !important;
        min-width: 0 !important;
      }

      .ksk-msg-tabs {
        display: flex !important;
        gap: 7px !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        padding: 5px 0 10px !important;
      }

      .ksk-msg-tab {
        flex: 0 0 auto !important;
        min-height: 38px !important;
        border-radius: 22px !important;
      }

      /* CHAT PAGE */
      .ksk-msg-page:has(.ksk-msg-detail) {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        height: auto !important;
        min-height: 0 !important;
        padding: 5px !important;
      }

      .ksk-msg-page:has(.ksk-msg-detail) > [data-action="back"] {
        display: inline-flex !important;
        align-self: flex-start !important;
        flex: 0 0 auto !important;
        width: auto !important;
        min-height: 36px !important;
        margin: 0 0 5px !important;
        padding: 5px 10px !important;
        font-size: 12px !important;
      }

      .ksk-msg-detail {
        display: flex !important;
        flex: 0 0 auto !important;
        flex-direction: column !important;
        width: 100% !important;
        height: min(680px, calc(100dvh - 205px)) !important;
        min-height: 350px !important;
        min-width: 0 !important;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
        border: 1px solid var(--color-border, #29384d) !important;
        border-radius: 14px !important;
      }

      /* CHAT HEADER */
      .ksk-msg-chat-header {
        display: flex !important;
        flex: 0 0 64px !important;
        align-items: center !important;
        gap: 9px !important;
        width: 100% !important;
        min-height: 64px !important;
        padding: 7px 10px !important;
        overflow: visible !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #29384d) !important;
      }

      .ksk-msg-chat-header > button[data-action="open-chat-profile"] {
        display: flex !important;
        flex: 0 0 44px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 44px !important;
        min-width: 44px !important;
        height: 44px !important;
        min-height: 44px !important;
        padding: 0 !important;
        overflow: hidden !important;
        border: 0 !important;
        border-radius: 50% !important;
      }

      .ksk-msg-chat-header > button[data-action="open-chat-profile"] .ksk-msg-avatar {
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
      }

      .ksk-msg-chat-header-main {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      .ksk-msg-chat-header-main strong {
        display: block !important;
        overflow: hidden !important;
        font-size: 15px !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .ksk-msg-chat-status {
        overflow: hidden !important;
        margin-top: 3px !important;
        font-size: 11px !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      /* BLOCK BUTTON MOVED TO MENU */
      .ksk-msg-chat-header > [data-action="block-user"] {
        display: none !important;
      }

      /* CHAT MENU */
      .ksk-wa-chat-menu {
        position: relative !important;
        flex: 0 0 38px !important;
        width: 38px !important;
      }

      .ksk-wa-chat-menu > summary {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        height: 40px !important;
        cursor: pointer !important;
        list-style: none !important;
        font-size: 24px !important;
      }

      .ksk-wa-chat-menu > summary::-webkit-details-marker {
        display: none !important;
      }

      .ksk-wa-chat-menu > summary::before {
        content: "⋮";
      }

      .ksk-wa-chat-menu-panel {
        position: absolute !important;
        top: 40px !important;
        right: 0 !important;
        z-index: 40 !important;
        width: 140px !important;
        padding: 7px !important;
        border: 1px solid var(--color-border, #29384d) !important;
        border-radius: 11px !important;
        background: var(--color-surface, #111e30) !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.3) !important;
      }

      .ksk-wa-chat-menu-panel button {
        width: 100% !important;
        min-height: 38px !important;
        text-align: left !important;
      }

      /* CHAT SEARCH */
      .ksk-msg-detail > .ksk-msg-toolbar {
        flex: 0 0 auto !important;
        padding: 7px 9px !important;
        margin: 0 !important;
      }

      /* MESSAGE HISTORY */
      .ksk-msg-history {
        display: flex !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        padding: 12px 9px !important;
        margin: 0 !important;
        background: #0b141a !important;
      }

      .ksk-msg-history-item {
        display: block !important;
        flex: 0 0 auto !important;
        width: fit-content !important;
        max-width: 82% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        padding: 8px 10px 6px !important;
        margin: 0 !important;
        border-radius: 11px !important;
        overflow-wrap: anywhere !important;
        white-space: pre-wrap !important;
        font-size: 14px !important;
        line-height: 1.45 !important;
      }

      .ksk-msg-history-item.from-them {
        align-self: flex-start !important;
        border-top-left-radius: 4px !important;
        background: #202c33 !important;
        color: #e9edef !important;
      }

      .ksk-msg-history-item.from-me {
        align-self: flex-end !important;
        border-top-right-radius: 4px !important;
        background: #005c4b !important;
        color: #e9edef !important;
      }

      .ksk-msg-history-time {
        display: flex !important;
        justify-content: flex-end !important;
        gap: 4px !important;
        margin-top: 4px !important;
        font-size: 10px !important;
        opacity: .72 !important;
      }

      /* COMPOSER */
      .ksk-msg-send-form {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: flex-end !important;
        gap: 7px !important;
        width: 100% !important;
        min-width: 0 !important;
        padding: 8px !important;
        margin: 0 !important;
        border-top: 1px solid var(--color-border, #29384d) !important;
      }

      .ksk-msg-compose {
        flex: 1 1 auto !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 43px !important;
        max-height: 110px !important;
        padding: 10px 13px !important;
        border-radius: 22px !important;
        resize: none !important;
      }

      .ksk-msg-compose-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 6px !important;
      }

      .ksk-msg-compose-actions .ksk-msg-primary {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 43px !important;
        width: 43px !important;
        min-width: 43px !important;
        height: 43px !important;
        min-height: 43px !important;
        border-radius: 50% !important;
      }

      @media (max-width: 600px) {
        .ksk-msg-page:has(.ksk-msg-detail) {
          padding: 3px !important;
        }

        .ksk-msg-detail {
          height: calc(100dvh - 185px) !important;
          min-height: 330px !important;
        }

        .ksk-msg-row {
          grid-template-columns: 46px minmax(0, 1fr) 34px !important;
          gap: 9px !important;
          min-height: 70px !important;
          padding: 9px !important;
        }

        .ksk-msg-row .ksk-msg-avatar {
          width: 46px !important;
          height: 46px !important;
          min-width: 46px !important;
        }

        .ksk-msg-history-item {
          max-width: 86% !important;
          font-size: 13px !important;
        }

        .ksk-msg-send-form {
          gap: 5px !important;
          padding: 7px !important;
        }

        .ksk-msg-compose-actions {
          gap: 4px !important;
        }

        .ksk-msg-compose-actions .ksk-msg-primary {
          flex-basis: 40px !important;
          width: 40px !important;
          min-width: 40px !important;
          height: 40px !important;
          min-height: 40px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function makeMenu(container, className, label) {
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

  function repairConversationRows() {
    document.querySelectorAll(".ksk-msg-row").forEach(row => {
      if (row.querySelector(".ksk-msg-options")) return;

      const actions = row.querySelector(":scope > .ksk-msg-actions");
      if (!actions) return;

      const panel = makeMenu(row, "ksk-msg-options", "Conversation options");

      while (actions.firstChild) {
        panel.appendChild(actions.firstChild);
      }

      actions.remove();
    });
  }

  function repairChatHeader() {
    document.querySelectorAll(".ksk-msg-chat-header").forEach(header => {
      if (header.querySelector(".ksk-wa-chat-menu")) return;

      const block = header.querySelector(':scope > [data-action="block-user"]');
      if (!block) return;

      const panel = makeMenu(header, "ksk-wa-chat-menu", "Chat options");
      block.textContent = "Block";
      panel.appendChild(block);
    });
  }

  function repair() {
    installStyles();
    repairConversationRows();
    repairChatHeader();
  }

  function start() {
    repair();

    if (!document.body || !window.MutationObserver) return;

    const observer = new MutationObserver(() => repair());

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
