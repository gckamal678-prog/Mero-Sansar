
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
      /* PAGE */
      #otherPageText .ksk-msg-page {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: 850px !important;
        min-width: 0 !important;
        margin: 0 auto !important;
        padding: 4px !important;
      }

      #otherPageText .ksk-msg-page *,
      #otherPageText .ksk-msg-page *::before,
      #otherPageText .ksk-msg-page *::after {
        box-sizing: border-box !important;
      }

      /* CONVERSATION LIST */
      #otherPageText .ksk-msg-page:not(.ksk-wa-chat-page) > h3 {
        margin: 5px 0 16px !important;
        font-size: 21px !important;
      }

      #otherPageText .ksk-msg-toolbar {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 10px 0 !important;
      }

      #otherPageText .ksk-msg-toolbar .ksk-msg-search {
        display: block !important;
        flex: 1 1 0 !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 44px !important;
        margin: 0 !important;
      }

      #otherPageText .ksk-msg-toolbar [data-action="open-group-form"] {
        display: inline-flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: center !important;
        width: auto !important;
        min-width: 86px !important;
        min-height: 44px !important;
        padding: 8px 12px !important;
        white-space: nowrap !important;
      }

      #otherPageText .ksk-msg-tabs {
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 7px !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        padding: 4px 0 9px !important;
        scrollbar-width: none !important;
      }

      #otherPageText .ksk-msg-tabs::-webkit-scrollbar {
        display: none !important;
      }

      #otherPageText .ksk-msg-tab {
        flex: 0 0 auto !important;
        min-height: 38px !important;
      }

      #otherPageText .ksk-msg-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        width: 100% !important;
        overflow: visible !important;
        border: 1px solid var(--color-border, #29384d) !important;
        border-radius: 16px !important;
        background: var(--color-surface, #111e30) !important;
      }

      #otherPageText .ksk-msg-row {
        display: grid !important;
        grid-template-columns: 48px minmax(0, 1fr) 36px !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 72px !important;
        padding: 9px 11px !important;
        margin: 0 !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #29384d) !important;
        border-radius: 0 !important;
        background: transparent !important;
      }

      #otherPageText .ksk-msg-row:last-child {
        border-bottom: 0 !important;
      }

      #otherPageText .ksk-msg-avatar {
        display: inline-flex !important;
        flex: 0 0 48px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 48px !important;
        height: 48px !important;
        min-width: 48px !important;
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
        flex: initial !important;
        width: 100% !important;
        min-width: 0 !important;
        overflow: hidden !important;
        cursor: pointer !important;
      }

      #otherPageText .ksk-msg-row-title {
        display: block !important;
        overflow: hidden !important;
        font-size: 15px !important;
        font-weight: 750 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      #otherPageText .ksk-msg-row-subtitle {
        display: block !important;
        overflow: hidden !important;
        margin-top: 4px !important;
        font-size: 13px !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      #otherPageText .ksk-msg-unread {
        display: inline-block !important;
        width: 9px !important;
        height: 9px !important;
        min-width: 9px !important;
        margin-left: 5px !important;
        border-radius: 50% !important;
        background: #25d366 !important;
        font-size: 0 !important;
        color: transparent !important;
        vertical-align: middle !important;
      }

      /* CONVERSATION THREE-DOT MENUS */
      #otherPageText .ksk-msg-row > .ksk-msg-actions {
        display: none !important;
      }

      #otherPageText .ksk-msg-options,
      #otherPageText .ksk-wa-chat-menu {
        position: relative !important;
        display: block !important;
        flex: 0 0 36px !important;
        width: 36px !important;
        min-width: 36px !important;
      }

      #otherPageText .ksk-msg-options > summary,
      #otherPageText .ksk-wa-chat-menu > summary {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 36px !important;
        height: 40px !important;
        cursor: pointer !important;
        list-style: none !important;
        font-size: 24px !important;
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
        top: 40px !important;
        right: 0 !important;
        z-index: 80 !important;
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

      #otherPageText .ksk-msg-options-panel button,
      #otherPageText .ksk-wa-chat-menu-panel button {
        display: block !important;
        width: 100% !important;
        min-height: 38px !important;
        padding: 8px 10px !important;
        border: 0 !important;
        border-radius: 8px !important;
        background: transparent !important;
        color: var(--color-text, #e5e7eb) !important;
        text-align: left !important;
        font-size: 13px !important;
      }

      /* CHAT PAGE AND APP CARD */
      #otherPage .page-content-card:has(.ksk-wa-chat-page) {
        padding: 8px !important;
        min-height: 0 !important;
      }

      #otherPage .page-content-card:has(.ksk-wa-chat-page) > .other-page-heading {
        display: none !important;
      }

      #otherPageText:has(.ksk-wa-chat-page) {
        min-width: 0 !important;
        min-height: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page > .ksk-msg-detail {
        display: flex !important;
        flex: none !important;
        flex-direction: column !important;
        width: 100% !important;
        height: min(680px, calc(100dvh - var(--app-header-height, 60px) - var(--app-bottom-height, 78px) - 150px)) !important;
        min-height: 320px !important;
        max-height: 680px !important;
        min-width: 0 !important;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
        border: 1px solid var(--color-border, #29384d) !important;
        border-radius: 14px !important;
        background: var(--color-surface, #111e30) !important;
      }

      #otherPageText .ksk-wa-chat-page > [data-action="back"] {
        display: none !important;
      }

      /* CHAT HEADER */
      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header {
        display: flex !important;
        flex: 0 0 62px !important;
        align-items: center !important;
        gap: 9px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 62px !important;
        padding: 7px 10px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #29384d) !important;
        background: var(--color-surface, #111e30) !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > [data-action="back"] {
        display: inline-flex !important;
        flex: 0 0 34px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        min-width: 34px !important;
        height: 38px !important;
        min-height: 38px !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        font-size: 20px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > button[data-action="open-chat-profile"] {
        display: inline-flex !important;
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

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header-main strong {
        display: block !important;
        overflow: hidden !important;
        font-size: 15px !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-status {
        overflow: hidden !important;
        margin-top: 3px !important;
        font-size: 11px !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-chat-header > [data-action="block-user"] {
        display: none !important;
      }

      /* CHAT SEARCH */
      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar {
        display: flex !important;
        flex: 0 0 auto !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        gap: 7px !important;
        min-width: 0 !important;
        padding: 7px 9px !important;
        margin: 0 !important;
        border-bottom: 1px solid var(--color-border, #29384d) !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar .ksk-msg-search {
        flex: 1 1 0 !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 40px !important;
        padding: 8px 12px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar button {
        flex: 0 0 auto !important;
        min-height: 38px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-search-results {
        flex: 0 0 auto !important;
        max-height: 100px !important;
        overflow-y: auto !important;
        margin: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > [data-action="load-older"] {
        align-self: center !important;
        flex: 0 0 auto !important;
        min-height: 29px !important;
        padding: 3px 12px !important;
        margin: 4px 0 !important;
        border-radius: 20px !important;
        font-size: 11px !important;
      }

      /* MESSAGE HISTORY */
      #otherPageText .ksk-wa-chat-page .ksk-msg-history {
        display: flex !important;
        flex: 1 1 0 !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 7px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        padding: 11px 9px !important;
        margin: 0 !important;
        background: #0b141a !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
        display: block !important;
        position: relative !important;
        flex: 0 0 auto !important;
        align-self: flex-start !important;
        width: fit-content !important;
        max-width: min(84%, 560px) !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        padding: 8px 10px 6px !important;
        margin: 0 !important;
        border: 0 !important;
        border-radius: 11px !important;
        overflow-wrap: anywhere !important;
        white-space: pre-wrap !important;
        font-size: 14px !important;
        line-height: 1.45 !important;
        box-shadow: 0 1px 1px rgba(0,0,0,.14) !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-them {
        align-self: flex-start !important;
        border-top-left-radius: 4px !important;
        background: #202c33 !important;
        color: #e9edef !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-item.from-me {
        align-self: flex-end !important;
        border-top-right-radius: 4px !important;
        background: #005c4b !important;
        color: #e9edef !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-history-time {
        display: flex !important;
        justify-content: flex-end !important;
        align-items: center !important;
        gap: 4px !important;
        margin-top: 4px !important;
        font-size: 10px !important;
        line-height: 1.3 !important;
        opacity: .72 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-media {
        display: block !important;
        max-width: 100% !important;
        max-height: 280px !important;
        margin-top: 6px !important;
        border-radius: 9px !important;
        object-fit: contain !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-reply-preview {
        padding: 6px 8px !important;
        margin: 0 0 6px !important;
        border-left: 3px solid #25a58d !important;
        border-radius: 6px !important;
        background: rgba(37,165,141,.13) !important;
        font-size: 12px !important;
      }

      /* MESSAGE ACTION MENU */
      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-menu {
        position: relative !important;
        display: flex !important;
        justify-content: flex-end !important;
        margin-top: 5px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-menu > summary {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 28px !important;
        height: 25px !important;
        cursor: pointer !important;
        list-style: none !important;
        opacity: .8 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-menu > summary::-webkit-details-marker {
        display: none !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-menu > summary::before {
        content: "⋮";
        font-size: 20px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-menu-panel {
        position: absolute !important;
        right: 0 !important;
        bottom: 27px !important;
        z-index: 60 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        width: 128px !important;
        padding: 5px !important;
        border: 1px solid rgba(148,163,184,.3) !important;
        border-radius: 10px !important;
        background: #182630 !important;
        box-shadow: 0 6px 20px rgba(0,0,0,.3) !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-bubble-menu-panel button {
        display: block !important;
        width: 100% !important;
        min-height: 32px !important;
        padding: 6px 8px !important;
        border: 0 !important;
        border-radius: 6px !important;
        background: transparent !important;
        color: #e9edef !important;
        text-align: left !important;
        font-size: 12px !important;
      }

      /* REPLY STRIP AND COMPOSER */
      #otherPageText .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-reply-preview {
        flex: 0 0 auto !important;
        padding: 7px 10px !important;
        margin: 0 !important;
        border-top: 1px solid var(--color-border, #29384d) !important;
        border-bottom: 1px solid var(--color-border, #29384d) !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: flex-end !important;
        gap: 6px !important;
        width: 100% !important;
        min-width: 0 !important;
        padding: 8px !important;
        padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
        margin: 0 !important;
        border-top: 1px solid var(--color-border, #29384d) !important;
        background: var(--color-surface, #111e30) !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose {
        display: block !important;
        flex: 1 1 auto !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 42px !important;
        max-height: 105px !important;
        padding: 10px 13px !important;
        border-radius: 22px !important;
        resize: none !important;
        font-size: 14px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 5px !important;
        flex-wrap: nowrap !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
        display: inline-flex !important;
        flex: 0 0 38px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        min-height: 38px !important;
        padding: 0 !important;
        border: 1px solid var(--color-border, #34445a) !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: transparent !important;
        font-size: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label::before {
        content: "📎";
        color: var(--color-text, #e5e7eb);
        font-size: 17px !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions input[type="file"] {
        display: none !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
        display: inline-flex !important;
        flex: 0 0 42px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 42px !important;
        min-width: 42px !important;
        height: 42px !important;
        min-height: 42px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: #128c7e !important;
        color: #fff !important;
        font-size: 0 !important;
      }

      #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary::before {
        content: "➤";
        color: #fff;
        font-size: 20px !important;
      }

      @media (max-width: 600px) {
        #otherPageText .ksk-wa-chat-page > .ksk-msg-detail {
          height: min(680px, calc(100dvh - 60px - 78px - 150px)) !important;
          min-height: 300px !important;
        }

        #otherPageText .ksk-msg-row {
          grid-template-columns: 44px minmax(0, 1fr) 34px !important;
          gap: 9px !important;
          min-height: 68px !important;
          padding: 8px 9px !important;
        }

        #otherPageText .ksk-msg-row .ksk-msg-avatar {
          flex-basis: 44px !important;
          width: 44px !important;
          height: 44px !important;
          min-width: 44px !important;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-history-item {
          max-width: 86% !important;
          font-size: 13px !important;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-send-form {
          gap: 5px !important;
          padding: 7px !important;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
          flex-basis: 35px !important;
          width: 35px !important;
          min-height: 35px !important;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
          flex-basis: 39px !important;
          width: 39px !important;
          min-width: 39px !important;
          height: 39px !important;
          min-height: 39px !important;
        }
      }

      @media (max-width: 360px) {
        #otherPageText .ksk-msg-toolbar {
          gap: 5px !important;
        }

        #otherPageText .ksk-msg-toolbar [data-action="open-group-form"] {
          min-width: 74px !important;
          padding-inline: 8px !important;
          font-size: 12px !important;
        }

        #otherPageText .ksk-wa-chat-page .ksk-msg-compose-actions label {
          display: none !important;
        }
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

  function repairChatPages(root) {
    root.querySelectorAll(".ksk-msg-page").forEach(page => {
      const detail = page.querySelector(":scope > .ksk-msg-detail");

      page.classList.toggle("ksk-wa-chat-page", Boolean(detail));
      if (!detail) return;

      const header = detail.querySelector(":scope > .ksk-msg-chat-header");
      if (!header) return;

      /* Move Back into the same header as the profile. */
      const back = page.querySelector(':scope > [data-action="back"]');

      if (back && back.parentElement !== header) {
        header.prepend(back);
      }

      /* Move Block into the chat options menu. */
      const block = header.querySelector(':scope > [data-action="block-user"]');

      if (block && !header.querySelector(":scope > .ksk-wa-chat-menu")) {
        const panel = createMenu(
          header,
          "ksk-wa-chat-menu",
          "Chat options"
        );

        block.textContent = "Block";
        panel.appendChild(block);
      }

      /* Move Edit/Delete/Reply/Copy/Forward into each bubble menu. */
      detail.querySelectorAll(".ksk-msg-history-item").forEach(bubble => {
        const actions = bubble.querySelector(
          ":scope > .ksk-msg-bubble-actions"
        );

        if (!actions || bubble.querySelector(":scope > .ksk-msg-bubble-menu")) {
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
