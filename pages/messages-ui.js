"use strict";

/*
 * MERO SANSAR — WHATSAPP-LIKE MESSENGER PRESENTATION
 * Full replacement: pages/messages-ui.js
 * UI-only: preserves KSKMessagesPage, Supabase and realtime handlers.
 */
(function () {
  "use strict";

  const STYLE_ID = "ksk-messenger-ui-v3";
  const OLD_STYLE_IDS = [
    "ksk-wa-messenger-final-style",
    "ksk-messenger-repair-v2"
  ];

  let observer = null;
  let repairing = false;

  function installStyles() {
    OLD_STYLE_IDS.forEach(id => document.getElementById(id)?.remove());
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* PAGE BACKGROUND & LAYOUT */
      #otherPageText .ksk-msg-page {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: 850px !important;
        min-width: 0 !important;
        margin: 0 auto !important;
        padding: 4px !important;
        background: #0b141a !important;
        color: #e9edef !important;
      }

      #otherPageText .ksk-msg-page *,
      #otherPageText .ksk-msg-page *::before,
      #otherPageText .ksk-msg-page *::after {
        box-sizing: border-box !important;
      }

      /* CONVERSATION LIST HEADER & SEARCH */
      #otherPageText .ksk-msg-page:not(.ksk-wa-chat-page) > h3 {
        margin: 10px 12px 14px !important;
        font-size: 24px !important;
        font-weight: 700 !important;
        color: #e9edef !important;
      }

      #otherPageText .ksk-msg-toolbar {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 0 12px !important;
        padding: 0 8px !important;
      }

      #otherPageText .ksk-msg-toolbar .ksk-msg-search {
        display: block !important;
        flex: 1 1 0 !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 42px !important;
        padding: 8px 16px 8px 36px !important;
        border: 0 !important;
        border-radius: 24px !important;
        background: #111b21 !important;
        color: #e9edef !important;
        font-size: 14px !important;
      }

      #otherPageText .ksk-msg-toolbar [data-action="open-group-form"] {
        display: inline-flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: center !important;
        width: auto !important;
        min-width: 80px !important;
        min-height: 40px !important;
        padding: 8px 14px !important;
        border: 0 !important;
        border-radius: 20px !important;
        background: #00a884 !important;
        color: #111b21 !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
      }

      /* WHATSAPP STYLE TABS (All, Unread, Favorites, Groups, etc.) */
      #otherPageText .ksk-msg-tabs {
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        padding: 0 8px 12px !important;
        scrollbar-width: none !important;
      }

      #otherPageText .ksk-msg-tabs::-webkit-scrollbar {
        display: none !important;
      }

      #otherPageText .ksk-msg-tab {
        flex: 0 0 auto !important;
        min-height: 34px !important;
        padding: 6px 14px !important;
        border: 0 !important;
        border-radius: 18px !important;
        background: #111b21 !important;
        color: #8696a0 !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
      }

      #otherPageText .ksk-msg-tab.active,
      #otherPageText .ksk-msg-tab:hover {
        background: #005c4b !important;
        color: #e9edef !important;
      }

      /* CONVERSATION LIST ROWS */
      #otherPageText .ksk-msg-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        width: 100% !important;
        overflow: visible !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: #0b141a !important;
      }

      #otherPageText .ksk-msg-row {
        display: grid !important;
        grid-template-columns: 50px minmax(0, 1fr) 36px !important;
        align-items: center !important;
        gap: 12px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 72px !important;
        padding: 10px 12px !important;
        margin: 0 !important;
        border: 0 !important;
        border-bottom: 1px solid #222d34 !important;
        background: transparent !important;
      }

      #otherPageText .ksk-msg-row:hover {
        background: #202c33 !important;
      }

      #otherPageText .ksk-msg-avatar {
        display: inline-flex !important;
        flex: 0 0 50px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 50px !important;
        height: 50px !important;
        min-width: 50px !important;
        overflow: hidden !important;
        border-radius: 50% !important;
      }

      #otherPageText .ksk-msg-avatar img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }

      #otherPageText .ksk-msg-row-main {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        overflow: hidden !important;
        cursor: pointer !important;
      }

      #otherPageText .ksk-msg-row-title {
        display: block !important;
        overflow: hidden !important;
        font-size: 16px !important;
        font-weight: 500 !important;
        color: #e9edef !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      #otherPageText .ksk-msg-row-subtitle {
        display: block !important;
        overflow: hidden !important;
        margin-top: 3px !important;
        font-size: 13px !important;
        color: #8696a0 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      #otherPageText .ksk-msg-unread {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 20px !important;
        height: 20px !important;
        padding: 0 6px !important;
        margin-left: 6px !important;
        border-radius: 10px !important;
        background: #00a884 !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #111b21 !important;
      }

      /* THREE-DOT OPTIONS MENU */
      #otherPageText .ksk-msg-row > .ksk-msg-actions {
        display: none !important;
      }

      #otherPageText .ksk-msg-options,
      #otherPageText .ksk-wa-chat-menu {
        position: relative !important;
        display: block !important;
        width: 36px !important;
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

      #otherPageText .ksk-msg-options > summary:hover,
      #otherPageText .ksk-wa-chat-menu > summary:hover {
        background: #222d34 !important;
        color: #e9edef !important;
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
        z-index: 80 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        width: 160px !important;
        padding: 6px !important;
        border: 1px solid #222d34 !important;
        border-radius: 8px !important;
        background: #233138 !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.4) !important;
      }

      #otherPageText .ksk-msg-options-panel button,
      #otherPageText .ksk-wa-chat-menu-panel button {
        display: block !important;
        width: 100% !important;
        min-height: 36px !important;
        padding: 8px 12px !important;
        border: 0 !important;
        border-radius: 4px !important;
        background: transparent !important;
        color: #e9edef !important;
        text-align: left !important;
        font-size: 13px !important;
      }

      #otherPageText .ksk-msg-options-panel button:hover,
      #otherPageText .ksk-wa-chat-menu-panel button:hover {
        background: #182229 !important;
      }

      /* CHAT DETAIL PAGE */
      #otherPageText .ksk-wa-chat-page {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #0b141a !important;
      }

      #otherPageText .ksk-wa-chat-page > .ksk-msg-detail {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        height: 100dvh !important;
        max-height: 100dvh !important;
        background: #0b141a !important;
        border: 0 !important;
      }

      /* CHAT HEADER */
      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100% !important;
        min-height: 60px !important;
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
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > button[data-action="open-chat-profile"] {
        display: inline-flex !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        overflow: hidden !important;
        border: 0 !important;
        padding: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main {
        flex: 1 1 auto !important;
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

      /* MESSAGE HISTORY (CHAT BODY) */
      #otherPageText .ksk-wa-chat-page .ksk-msg-history {
        display: flex !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;
        gap: 6px !important;
        width: 100% !important;
        padding: 12px 16px !important;
        overflow-y: auto !important;
        background-color: #0b141a !important;
        background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px) !important;
        background-size: 24px 24px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
        display: block !important;
        position: relative !important;
        max-width: 80% !important;
        padding: 8px 12px 6px !important;
        border-radius: 8px !important;
        font-size: 14.5px !important;
        line-height: 1.45 !important;
        word-break: break-word !important;
        white-space: pre-wrap !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-them {
        align-self: flex-start !important;
        background: #202c33 !important;
        color: #e9edef !important;
        border-top-left-radius: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-me {
        align-self: flex-end !important;
        background: #005c4b !important;
        color: #e9edef !important;
        border-top-right-radius: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-time {
        display: inline-flex !important;
        float: right !important;
        align-items: center !important;
        gap: 3px !important;
        margin-left: 8px !important;
        margin-top: 4px !important;
        font-size: 11px !important;
        color: rgba(255, 255, 255, 0.6) !important;
        line-height: 15px !important;
      }

      /* CHAT INPUT / COMPOSER */
      #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
        display: flex !important;
        align-items: flex-end !important;
        gap: 8px !important;
        width: 100% !important;
        padding: 10px 16px !important;
        background: #202c33 !important;
        border-top: 1px solid #222d34 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose {
        flex: 1 1 auto !important;
        min-height: 42px !important;
        max-height: 120px !important;
        padding: 10px 16px !important;
        border: 0 !important;
        border-radius: 8px !important;
        background: #2a3942 !important;
        color: #e9edef !important;
        font-size: 15px !important;
        resize: none !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 40px !important;
        height: 40px !important;
        cursor: pointer !important;
        color: #8696a0 !important;
        font-size: 20px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 42px !important;
        height: 42px !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: #00a884 !important;
        color: #111b21 !important;
        font-size: 18px !important;
        cursor: pointer !important;
      }
    `;

    document.head.appendChild(style);
  }

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

  function repairConversationRows(root) {
    root.querySelectorAll(".ksk-msg-row").forEach(row => {
      if (row.querySelector(":scope > .ksk-msg-options")) return;

      const actions = row.querySelector(":scope > .ksk-msg-actions");
      if (!actions) return;

      const panel = createMenu(row, "ksk-msg-options", "Conversation options");

      while (actions.firstChild) {
        panel.appendChild(actions.firstChild);
      }

      actions.remove();
    });
  }

  function repairChatPages(root) {
    root.querySelectorAll(".ksk-msg-page").forEach(page => {
      const detail = page.querySelector(":scope > .ksk-msg-detail");

      page.classList.toggle("ksk-wa-chat-page", Boolean(detail));
      if (!detail) return;

      const header = detail.querySelector(":scope > .ksk-msg-chat-header");
      if (!header) return;

      const back = page.querySelector(':scope > [data-action="back"]');
      if (back && back.parentElement !== header) {
        header.prepend(back);
      }

      const block = header.querySelector(':scope > [data-action="block-user"]');
      if (block && !header.querySelector(":scope > .ksk-wa-chat-menu")) {
        const panel = createMenu(header, "ksk-wa-chat-menu", "Chat options");
        block.textContent = "Block";
        panel.appendChild(block);
      }

      detail.querySelectorAll(".ksk-msg-history-item").forEach(bubble => {
        const actions = bubble.querySelector(":scope > .ksk-msg-bubble-actions");
        if (!actions || bubble.querySelector(":scope > .ksk-msg-bubble-menu")) {
          return;
        }

        const panel = createMenu(bubble, "ksk-msg-bubble-menu", "Message options");
        while (actions.firstChild) {
          panel.appendChild(actions.firstChild);
        }
        actions.remove();
      });
    });
  }

  function repair() {
    if (repairing) return;
    repairing = true;
    try {
      installStyles();
      const root = document.getElementById("otherPageText") || document;
      repairConversationRows(root);
      repairChatPages(root);
    } finally {
      repairing = false;
    }
  }

  function start() {
    repair();
    if (!document.body || !window.MutationObserver || observer) return;
    observer = new MutationObserver(() => repair());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
