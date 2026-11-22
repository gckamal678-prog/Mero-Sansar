
/* =========================================================
   MERO SANSAR — MESSAGES UI
   File: pages/messages-ui.js

   UI responsibilities only.
   Supabase and message actions remain in messages.js.
========================================================= */

(function (global) {
  "use strict";

  if (global.__MERO_SANSAR_WA_CHAT_UI__) return;
  global.__MERO_SANSAR_WA_CHAT_UI__ = true;
  global.MS_COMPOSER_FIX_V3 = true;

  const STYLE_ID = "mero-sansar-wa-chat-style";

  let observer = null;
  let holdTimer = null;
  let heldMessage = null;

  const GALLERY_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <path d="m21 15-5-5L5 21"></path>
    </svg>
  `;

  const CAMERA_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"></path>
      <circle cx="12" cy="13" r="3.5"></circle>
    </svg>
  `;

  function addStyles() {
    let style = document.getElementById(STYLE_ID);

    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `

      /* PAGE — REMOVE OUTER CARD */

      #otherPage:has(#otherPageText > .ksk-msg-page) {
        position: relative !important;
        inset: auto !important;
        transform: none !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #otherPage:has(#otherPageText > .ksk-msg-page)
      .other-page-heading {
        display: none !important;
      }

      #otherPage:has(#otherPageText > .ksk-msg-page)
      .page-content-card {
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #otherPageText:has(> .ksk-msg-page) {
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      #otherPageText > .ksk-msg-page {
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      .ksk-msg-page,
      .ksk-msg-page *,
      .ksk-msg-page *::before,
      .ksk-msg-page *::after {
        box-sizing: border-box !important;
      }

      /* CONVERSATION TITLE */

      #otherPageText > .ksk-msg-page > h3 {
        display: block !important;
        position: relative !important;
        width: 100% !important;
        min-height: 32px !important;
        margin: 0 0 12px !important;
        padding: 4px 0 !important;
        border: 0 !important;
        background: transparent !important;
        color: var(--color-text, #e5e7eb) !important;
        font-size: 19px !important;
        font-weight: 750 !important;
        line-height: 1.5 !important;
        white-space: normal !important;
        overflow: visible !important;
        overflow-wrap: anywhere !important;
      }

      /* SEARCH */

      .ksk-msg-page > .ksk-msg-toolbar {
        position: relative !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100% !important;
        margin: 8px 0 14px !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      .ksk-msg-page > .ksk-msg-toolbar
      [data-message-search] {
        flex: 1 1 100% !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 46px !important;
        margin: 0 !important;
        padding: 10px 10px 10px 42px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #475569) !important;
        border-radius: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        background-color: transparent !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-4-4'/%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: 10px center !important;
        background-size: 21px 21px !important;
        color: var(--color-text, #e5e7eb) !important;
        font: inherit !important;
      }

      /* CONVERSATION LIST */

      .ksk-msg-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .ksk-msg-row {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 12px 0 !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #334155) !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .ksk-msg-row-main {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      .ksk-msg-row-subtitle {
        margin-top: 4px !important;
        color: var(--color-muted, #94a3b8) !important;
        font-size: 13px !important;
        overflow-wrap: anywhere !important;
      }

      .ksk-msg-avatar {
        flex: 0 0 46px !important;
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
        border: 0 !important;
        border-radius: 50% !important;
      }

      /* MENUS */

      .ksk-msg-row-menu,
      .ksk-wa-chat-options {
        position: relative !important;
        flex: 0 0 38px !important;
        width: 38px !important;
        margin-left: auto !important;
      }

      .ksk-msg-row-menu > summary,
      .ksk-wa-chat-options > summary {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        height: 38px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: var(--color-text, #e5e7eb) !important;
        font-size: 23px !important;
        cursor: pointer !important;
        list-style: none !important;
      }

      .ksk-msg-row-menu > summary::-webkit-details-marker,
      .ksk-wa-chat-options > summary::-webkit-details-marker {
        display: none !important;
      }

      .ksk-msg-row-menu-panel,
      .ksk-wa-chat-options-panel {
        position: absolute !important;
        top: 40px !important;
        right: 0 !important;
        z-index: 300 !important;
        display: flex !important;
        flex-direction: column !important;
        min-width: 155px !important;
        padding: 5px 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: var(--color-background, #0f172a) !important;
        box-shadow: none !important;
      }

      .ksk-msg-row-menu-panel .ksk-msg-actions {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
      }

      .ksk-msg-row-menu-panel .ksk-msg-action,
      .ksk-wa-chat-options-panel button {
        width: 100% !important;
        min-height: 40px !important;
        padding: 9px 12px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #334155) !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: var(--color-text, #e5e7eb) !important;
        text-align: left !important;
        font: inherit !important;
      }

      
      /* CHAT AREA — FIX VIEWPORT HEIGHT */

      #otherPage:has(#otherPageText > .ksk-msg-page > .ksk-msg-detail) {
        position: relative !important;
        inset: auto !important;
        transform: none !important;
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;

        height: calc(
          100dvh
          - var(--app-header-height, 66px)
          - var(--app-bottom-height, 78px)
        ) !important;

        max-height: calc(
          100dvh
          - var(--app-header-height, 66px)
          - var(--app-bottom-height, 78px)
        ) !important;

        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }


      #otherPage:has(#otherPageText > .ksk-msg-page > .ksk-msg-detail)
      .page-content-card,
      #otherPageText:has(> .ksk-msg-page > .ksk-msg-detail),
      #otherPageText > .ksk-msg-page:has(> .ksk-msg-detail) {
        display: flex !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }

      .ksk-msg-detail {
        display: flex !important;
        flex: 1 1 0 !important;
        flex-direction: column !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }

      /* CHAT HEADER */

      .ksk-msg-chat-header {
        display: flex !important;
        flex: 0 0 62px !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 62px !important;
        margin: 0 !important;
        padding: 6px 0 !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #334155) !important;
        background: transparent !important;
      }

      .ksk-msg-back,
      .ksk-msg-profile-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
      }

      .ksk-msg-back {
        width: 38px !important;
        height: 38px !important;
        padding: 0 !important;
      }

      .ksk-msg-profile-button {
        width: 46px !important;
        height: 46px !important;
        padding: 0 !important;
        overflow: hidden !important;
      }

      .ksk-msg-profile-button .ksk-msg-avatar {
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
      }

      .ksk-msg-chat-header-main {
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      .ksk-msg-chat-header-main strong {
        display: block !important;
        overflow: hidden !important;
        color: var(--color-text, #e5e7eb) !important;
        font-size: 16px !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
      }

      .ksk-msg-chat-status {
        margin-top: 2px !important;
        color: var(--color-muted, #94a3b8) !important;
        font-size: 12px !important;
      }

      .ksk-msg-chat-status [data-typing-indicator] {
        color: #22c55e !important;
        font-weight: 700 !important;
      }

      /* CHAT SEARCH */

      .ksk-msg-detail > .ksk-msg-toolbar {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 7px 0 !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #334155) !important;
        background: transparent !important;
      }

      .ksk-msg-detail .ksk-msg-search {
        flex: 1 1 auto !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 40px !important;
        margin: 0 !important;
        padding: 8px 10px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border, #334155) !important;
        border-radius: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        color: var(--color-text, #e5e7eb) !important;
      }

      /* MESSAGE HISTORY */

      .ksk-msg-detail > .ksk-msg-history {
        display: flex !important;
        flex: 1 1 0 !important;
        flex-direction: column-reverse !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 12px 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .ksk-msg-history-item {
        position: relative !important;
        display: block !important;
        flex: 0 0 auto !important;
        width: fit-content !important;
        max-width: min(82%, 520px) !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 0 !important;
        padding: 9px 12px !important;
        border: 1px solid rgba(148, 163, 184, .24) !important;
        border-radius: 16px !important;
        background: #263449 !important;
        box-shadow: none !important;
        color: #f1f5f9 !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        overflow-wrap: anywhere !important;
        user-select: none !important;
        -webkit-user-select: none !important;
      }

      .ksk-msg-history-item.from-me {
        align-self: flex-end !important;
        border-color: rgba(59, 130, 246, .35) !important;
        border-radius: 16px 16px 4px 16px !important;
        background: #174477 !important;
        color: #eff6ff !important;
        text-align: left !important;
      }

      .ksk-msg-history-item.from-them {
        align-self: flex-start !important;
        border-color: rgba(148, 163, 184, .28) !important;
        border-radius: 16px 16px 16px 4px !important;
        background: #263449 !important;
        color: #f1f5f9 !important;
        text-align: left !important;
      }

      .ksk-msg-history-item.deleted {
        opacity: .7 !important;
      }

      .ksk-msg-history-time {
        display: block !important;
        margin-top: 4px !important;
        color: var(--color-muted, #94a3b8) !important;
        font-size: 10px !important;
        text-align: right !important;
      }

      .ksk-msg-media {
        display: block !important;
        max-width: 100% !important;
        max-height: 280px !important;
        height: auto !important;
        margin-top: 6px !important;
        object-fit: contain !important;
        border: 0 !important;
        border-radius: 8px !important;
      }

      .ksk-msg-bubble-actions {
        display: none !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin-top: 7px !important;
        padding: 6px 0 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      .ksk-msg-history-item.ksk-wa-actions-open
      .ksk-msg-bubble-actions {
        display: flex !important;
      }

      .ksk-msg-bubble-actions button {
        min-height: 34px !important;
        padding: 6px 8px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: var(--color-primary, #60a5fa) !important;
        font-size: 12px !important;
      }

      /* REPLY / SEARCH / GROUP */

      .ksk-msg-detail > .ksk-msg-reply-preview,
      .ksk-msg-search-result,
      .ksk-msg-search-results,
      .ksk-msg-form,
      .ksk-msg-friend-options,
      .ksk-msg-friend-option,
      .ksk-msg-empty,
      .ksk-msg-note {
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .ksk-msg-detail > .ksk-msg-reply-preview {
        flex: 0 0 auto !important;
        margin: 5px 0 0 !important;
        padding: 7px 10px !important;
        border-left: 2px solid var(--color-primary, #60a5fa) !important;
        color: var(--color-text, #e5e7eb) !important;
      }

      .ksk-msg-search-results {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        margin: 8px 0 !important;
      }

      .ksk-msg-search-result {
        padding: 9px 0 !important;
        border-bottom: 1px solid var(--color-border, #334155) !important;
        color: var(--color-text, #e5e7eb) !important;
      }

      .ksk-msg-form {
        margin: 10px 0 !important;
        padding: 8px 0 !important;
      }

      .ksk-msg-friend-option {
        padding: 9px 0 !important;
        border-bottom: 1px solid var(--color-border, #334155) !important;
      }

      .ksk-msg-empty,
      .ksk-msg-note {
        margin: 12px 0 !important;
        padding: 12px 0 !important;
        text-align: center !important;
      }

      /* COMPOSER — NO EXTRA EMPTY HEIGHT */

      .ksk-msg-detail > .ksk-msg-send-form {
        position: relative !important;
        z-index: 5 !important;
        display: flex !important;
        flex: 0 0 auto !important;
        flex-direction: row !important;
        align-items: flex-end !important;
        gap: 7px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 2px 0 calc(
          2px + env(safe-area-inset-bottom, 0px)
        ) !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .ksk-wa-composer {
        display: flex !important;
        flex: 1 1 auto !important;
        align-items: flex-end !important;
        gap: 3px !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .ksk-wa-tool {
        display: inline-flex !important;
        flex: 0 0 34px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        min-width: 34px !important;
        height: 38px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: var(--color-muted, #94a3b8) !important;
        cursor: pointer !important;
      }

      .ksk-wa-tool svg {
        display: block !important;
        width: 21px !important;
        height: 21px !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 1.8 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }

      .ksk-msg-detail .ksk-msg-compose {
        display: block !important;
        flex: 1 1 auto !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 34px !important;
        height: 34px !important;
        max-height: 110px !important;
        margin: 0 !important;
        padding: 7px 3px !important;
        resize: none !important;
        overflow-y: auto !important;
        border: 0 !important;
        border-radius: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        color: var(--color-text, #e5e7eb) !important;
        font-size: 14px !important;
        line-height: 20px !important;
      }

      .ksk-msg-compose-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 2px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      .ksk-wa-send {
        display: inline-flex !important;
        flex: 0 0 42px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 42px !important;
        min-width: 42px !important;
        height: 42px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: var(--color-primary, #3b82f6) !important;
        color: #fff !important;
        font-size: 21px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .ksk-wa-send[hidden],
      .ksk-wa-file-input {
        display: none !important;
      }

      @media (max-width: 520px) {
        .ksk-msg-detail > .ksk-msg-history {
          padding: 9px 0 !important;
        }

        .ksk-msg-detail > .ksk-msg-send-form {
          gap: 4px !important;
        }

        .ksk-wa-composer {
          gap: 1px !important;
        }

        .ksk-wa-tool {
          flex-basis: 30px !important;
          width: 30px !important;
          min-width: 30px !important;
        }

        .ksk-wa-send {
          flex-basis: 40px !important;
          width: 40px !important;
          min-width: 40px !important;
          height: 40px !important;
        }
      }

      @media (max-height: 520px) {
        .ksk-msg-chat-header {
          flex-basis: 54px !important;
          min-height: 54px !important;
        }

        .ksk-msg-detail > .ksk-msg-send-form {
          min-height: 0 !important;
          padding-top: 2px !important;
          padding-bottom: 2px !important;
        }
      }
    `;
  }

  function makeButton(className, label, icon) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
    return button;
  }

  function repairConversationMenus() {
    document.querySelectorAll(".ksk-msg-row").forEach(row => {
      const actions = row.querySelector(
        ":scope > .ksk-msg-actions"
      );

      if (!actions || row.dataset.menuReady === "yes") return;

      const menu = document.createElement("details");
      menu.className = "ksk-msg-row-menu";

      const summary = document.createElement("summary");
      summary.textContent = "⋮";
      summary.setAttribute("aria-label", "Conversation options");
      summary.title = "Conversation options";

      const panel = document.createElement("div");
      panel.className = "ksk-msg-row-menu-panel";

      panel.appendChild(actions);
      menu.append(summary, panel);
      row.appendChild(menu);

      row.dataset.menuReady = "yes";
    });
  }

  function resizeComposer(form) {
    const area = form.querySelector(".ksk-msg-compose");
    const send = form.querySelector(".ksk-wa-send");

    if (!area || !send) return;

    area.style.height = "34px";
    area.style.height =
      Math.max(34, Math.min(area.scrollHeight, 110)) + "px";

    send.hidden = !area.value.trim();
  }

  function buildComposer(form) {
    if (form.dataset.waReady === "yes") return;

    const area = form.querySelector(".ksk-msg-compose");

    const oldActions = form.querySelector(
      ".ksk-msg-compose-actions"
    );

    const send = oldActions?.querySelector(
      '[type="submit"]'
    );

    const originalFile = oldActions?.querySelector(
      'input[type="file"][data-media-file]'
    );

    if (!area || !oldActions || !send) return;

    form.dataset.waReady = "yes";

    const shell = document.createElement("div");
    shell.className = "ksk-wa-composer";

    const galleryInput =
      originalFile || document.createElement("input");

    galleryInput.type = "file";
    galleryInput.accept =
      "image/*,video/*,.pdf,.doc,.docx";

    galleryInput.dataset.mediaFile = "";
    galleryInput.className = "ksk-wa-file-input";
    galleryInput.removeAttribute("capture");

    const cameraInput = document.createElement("input");

    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.capture = "environment";
    cameraInput.dataset.mediaFile = "";
    cameraInput.className = "ksk-wa-file-input";
    cameraInput.setAttribute("aria-label", "Take a photo");

    const galleryButton = makeButton(
      "ksk-wa-tool",
      "Gallery",
      GALLERY_ICON
    );

    galleryButton.dataset.waGallery = "yes";

    const cameraButton = makeButton(
      "ksk-wa-tool",
      "Camera",
      CAMERA_ICON
    );

    cameraButton.dataset.waCamera = "yes";

    area.placeholder = "Message";
    area.setAttribute("aria-label", "Write a message");
    area.rows = 1;

    send.className = "ksk-wa-send";
    send.textContent = "➤";
    send.setAttribute("aria-label", "Send message");

    shell.append(
      galleryButton,
      cameraButton,
      area,
      galleryInput,
      cameraInput
    );

    oldActions.replaceChildren(send);
    form.replaceChildren(shell, oldActions);

    resizeComposer(form);
  }

  function repairChat() {
    addStyles();
    repairConversationMenus();

    document.querySelectorAll(".ksk-msg-detail").forEach(detail => {
      const header = detail.querySelector(
        ":scope > .ksk-msg-chat-header"
      );

      if (header) {
        const block = header.querySelector(
          ':scope > [data-action="block-user"]'
        );

        if (
          block &&
          !header.querySelector(".ksk-wa-chat-options")
        ) {
          const menu = document.createElement("details");
          menu.className = "ksk-wa-chat-options";

          const summary = document.createElement("summary");
          summary.textContent = "⋮";
          summary.setAttribute("aria-label", "Chat options");

          const panel = document.createElement("div");
          panel.className = "ksk-wa-chat-options-panel";

          block.textContent = "Block";

          panel.appendChild(block);
          menu.append(summary, panel);
          header.appendChild(menu);
        }
      }

      const form = detail.querySelector(
        ':scope > form[data-send-form]'
      );

      if (form) buildComposer(form);
    });
  }

  function showMessageActions(message) {
    if (
      !message ||
      !message.querySelector(".ksk-msg-bubble-actions")
    ) {
      return;
    }

    document.querySelectorAll(
      ".ksk-msg-history-item.ksk-wa-actions-open"
    ).forEach(item => {
      if (item !== message) {
        item.classList.remove("ksk-wa-actions-open");
      }
    });

    message.classList.add("ksk-wa-actions-open");
  }

  function stopHold() {
    if (holdTimer) {
      global.clearTimeout(holdTimer);
      holdTimer = null;
    }

    heldMessage = null;
  }

  document.addEventListener("pointerdown", event => {
    const message = event.target.closest?.(
      ".ksk-msg-history-item"
    );

    if (
      !message ||
      event.target.closest?.("button,a,input,video")
    ) {
      return;
    }

    stopHold();
    heldMessage = message;

    holdTimer = global.setTimeout(() => {
      if (heldMessage === message) {
        showMessageActions(message);

        if (global.navigator?.vibrate) {
          global.navigator.vibrate(25);
        }
      }
    }, 480);
  }, { passive: true });

  document.addEventListener("pointerup", stopHold, {
    passive: true
  });

  document.addEventListener("pointercancel", stopHold, {
    passive: true
  });

  document.addEventListener("pointermove", stopHold, {
    passive: true
  });

  document.addEventListener("contextmenu", event => {
    const message = event.target.closest?.(
      ".ksk-msg-history-item"
    );

    if (!message) return;

    event.preventDefault();
    showMessageActions(message);
  });

  document.addEventListener("click", event => {
    const menuSummary = event.target.closest?.(
      ".ksk-msg-row-menu > summary"
    );

    if (menuSummary) {
      const currentMenu = menuSummary.parentElement;

      document.querySelectorAll(
        ".ksk-msg-row-menu[open]"
      ).forEach(menu => {
        if (menu !== currentMenu) {
          menu.removeAttribute("open");
        }
      });

      return;
    }

    const gallery = event.target.closest?.(
      "[data-wa-gallery]"
    );

    if (gallery) {
      gallery.closest("[data-send-form]")
        ?.querySelector(
          'input[data-media-file]:not([capture])'
        )
        ?.click();

      return;
    }

    const camera = event.target.closest?.(
      "[data-wa-camera]"
    );

    if (camera) {
      camera.closest("[data-send-form]")
        ?.querySelector(
          'input[data-media-file][capture]'
        )
        ?.click();

      return;
    }

    if (
      event.target.closest?.(".ksk-msg-bubble-actions")
    ) {
      const message = event.target.closest(
        ".ksk-msg-history-item"
      );

      if (message) {
        global.setTimeout(() => {
          message.classList.remove("ksk-wa-actions-open");
        }, 150);
      }

      return;
    }

    if (
      !event.target.closest?.(".ksk-msg-history-item")
    ) {
      document.querySelectorAll(
        ".ksk-msg-history-item.ksk-wa-actions-open"
      ).forEach(item => {
        item.classList.remove("ksk-wa-actions-open");
      });
    }

    if (!event.target.closest?.(".ksk-msg-row-menu")) {
      document.querySelectorAll(
        ".ksk-msg-row-menu[open]"
      ).forEach(menu => {
        menu.removeAttribute("open");
      });
    }

    if (!event.target.closest?.(".ksk-wa-chat-options")) {
      document.querySelectorAll(
        ".ksk-wa-chat-options[open]"
      ).forEach(menu => {
        menu.removeAttribute("open");
      });
    }
  });

  document.addEventListener("input", event => {
    if (!event.target.matches?.(".ksk-msg-compose")) return;

    const form = event.target.closest("[data-send-form]");

    if (form) resizeComposer(form);
  });

  document.addEventListener("change", event => {
    if (!event.target.matches?.(".ksk-wa-file-input")) return;

    const form = event.target.closest("[data-send-form]");
    const send = form?.querySelector(".ksk-wa-send");

    if (send && event.target.files?.length) {
      send.hidden = false;
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    document.querySelectorAll(
      ".ksk-msg-history-item.ksk-wa-actions-open"
    ).forEach(item => {
      item.classList.remove("ksk-wa-actions-open");
    });

    document.querySelectorAll(
      ".ksk-msg-row-menu[open],.ksk-wa-chat-options[open]"
    ).forEach(menu => {
      menu.removeAttribute("open");
    });
  });

  function start() {
    if (!document.body) return;

    repairChat();

    if (observer) return;

    observer = new MutationObserver(() => {
      repairChat();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

})(window);
