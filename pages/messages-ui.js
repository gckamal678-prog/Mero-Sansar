
"use strict";

/*
 * MERO SANSAR — WHATSAPP STYLE MESSENGER UI
 * UI-only layer. Existing Messenger and Supabase APIs remain unchanged.
 */

(function (global) {
  "use strict";

  const API = global.KSKMessagesPage;

  if (!API || API.__whatsappUILayerInstalled) return;

  const STYLE_ID = "ksk-messenger-whatsapp-ui";
  let observer = null;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* =========================================
         SHARED
      ========================================= */

      .ksk-msg-page {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        margin: 0 auto;
        padding: 4px 0 20px;
        color: var(--color-text, #172033);
        font-family: inherit;
      }

      .ksk-msg-page *,
      .ksk-msg-page *::before,
      .ksk-msg-page *::after {
        box-sizing: border-box;
      }

      .ksk-msg-page h3 {
        margin: 8px 0 16px;
        font-size: 20px;
        font-weight: 800;
      }

      .ksk-msg-page button,
      .ksk-msg-page input,
      .ksk-msg-page textarea {
        font-family: inherit;
      }

      .ksk-msg-page button:focus-visible,
      .ksk-msg-page [role="button"]:focus-visible {
        outline: 2px solid var(--color-primary, #2563eb);
        outline-offset: 3px;
      }

      .ksk-msg-search,
      .ksk-msg-compose,
      .ksk-msg-input {
        min-width: 0;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 13px;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        box-shadow: none;
        font: inherit;
      }

      .ksk-msg-search {
        flex: 1;
        min-height: 44px;
        padding: 10px 14px;
      }

      .ksk-msg-primary {
        min-height: 42px;
        padding: 9px 15px;
        border: 0;
        border-radius: 12px;
        background: var(--color-primary, #2563eb);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .ksk-msg-secondary,
      .ksk-msg-action {
        min-height: 36px;
        padding: 7px 11px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 10px;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        font-size: 12px;
        cursor: pointer;
      }

      .ksk-msg-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        margin: 12px 0;
      }

      .ksk-msg-empty {
        padding: 26px 16px;
        border: 1px dashed var(--color-border, #e2e8f0);
        border-radius: 15px;
        color: var(--color-muted, #64748b);
        text-align: center;
      }

      /* =========================================
         CHAT LIST — WHATSAPP STYLE
      ========================================= */

      .ksk-wa-list-page {
        max-width: 850px;
      }

      .ksk-wa-list-page h3 {
        margin: 8px 0 16px;
        font-size: 21px;
        font-weight: 800;
      }

      .ksk-wa-list-page .ksk-msg-toolbar {
        margin: 12px 0;
      }

      .ksk-wa-list-page .ksk-msg-tabs {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 4px 1px 12px;
        scrollbar-width: thin;
      }

      .ksk-wa-list-page .ksk-msg-tab {
        flex: 0 0 auto;
        min-height: 36px;
        padding: 7px 14px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 30px;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        font-size: 12px;
        font-weight: 650;
        white-space: nowrap;
      }

      .ksk-wa-list-page .ksk-msg-tab.is-active {
        border-color: #128c7e;
        background: #128c7e;
        color: #fff;
      }

      .ksk-wa-list-page .ksk-msg-list {
        display: grid;
        gap: 0;
        overflow: visible;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 16px;
        background: var(--color-surface, #fff);
      }

      .ksk-wa-list-page .ksk-msg-row {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 12px;
        min-width: 0;
        min-height: 76px;
        padding: 11px 13px;
        border: 0;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        border-radius: 0;
        background: transparent;
        transition: background .15s ease;
      }

      .ksk-wa-list-page .ksk-msg-row:last-child {
        border-bottom: 0;
      }

      .ksk-wa-list-page .ksk-msg-row:active {
        background: var(--color-surface-hover, #f1f5f9);
      }

      .ksk-wa-list-page .ksk-msg-avatar {
        flex: 0 0 52px;
        width: 52px;
        height: 52px;
        min-width: 52px;
        border-radius: 50%;
      }

      .ksk-wa-list-page .ksk-msg-row-main {
        flex: 1;
        min-width: 0;
        cursor: pointer;
      }

      .ksk-wa-list-page .ksk-msg-row-title {
        display: block;
        overflow: hidden;
        color: var(--color-text, #172033);
        font-size: 14px;
        font-weight: 750;
        line-height: 1.5;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ksk-wa-list-page .ksk-msg-row-subtitle {
        display: -webkit-box;
        overflow: hidden;
        margin-top: 3px;
        color: var(--color-muted, #64748b);
        font-size: 12px;
        line-height: 1.45;
        overflow-wrap: anywhere;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }

      .ksk-wa-list-page .ksk-msg-unread {
        display: inline-flex;
        width: 9px;
        min-width: 9px;
        height: 9px;
        margin-left: 5px;
        padding: 0;
        border-radius: 50%;
        background: #25a56a;
        color: transparent;
        font-size: 0;
        vertical-align: middle;
      }

      .ksk-msg-disclosure {
        position: relative;
        min-width: 0;
        margin: 0;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 11px;
        background: var(--color-surface, #fff);
      }

      .ksk-msg-disclosure > summary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 36px;
        padding: 6px 10px;
        color: var(--color-muted, #64748b);
        font-size: 12px;
        font-weight: 650;
        cursor: pointer;
        list-style: none;
        user-select: none;
      }

      .ksk-msg-disclosure > summary::-webkit-details-marker {
        display: none;
      }

      .ksk-msg-disclosure > summary:focus-visible {
        outline: 2px solid var(--color-primary, #2563eb);
        outline-offset: 2px;
      }

      .ksk-msg-disclosure-body {
        padding: 8px;
        border-top: 1px solid var(--color-border, #e2e8f0);
      }

      .ksk-msg-conversation-options {
        flex: 0 0 auto;
        width: 42px;
        border: 0;
        background: transparent;
      }

      .ksk-msg-conversation-options > summary {
        min-height: 38px;
        padding: 4px;
        font-size: 0;
      }

      .ksk-msg-conversation-options > summary::before {
        content: "⋮";
        color: var(--color-muted, #64748b);
        font-size: 25px;
        line-height: 1;
      }

      .ksk-msg-conversation-options > summary::after {
        display: none;
      }

      .ksk-msg-conversation-options .ksk-msg-disclosure-body {
        position: absolute;
        top: 40px;
        right: 0;
        z-index: 20;
        width: 145px;
        padding: 7px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 12px;
        background: var(--color-surface, #fff);
        box-shadow: 0 8px 24px rgba(15, 23, 42, .16);
      }

      .ksk-msg-conversation-options .ksk-msg-actions {
        display: grid;
        gap: 5px;
      }

      .ksk-msg-conversation-options .ksk-msg-action {
        width: 100%;
        text-align: left;
      }

      /* =========================================
         CHAT SCREEN
      ========================================= */

      .ksk-wa-chat-page {
        width: 100%;
        max-width: 900px;
        margin-inline: auto;
        padding: 0;
      }

      .ksk-wa-chat-page .ksk-msg-detail {
        display: flex;
        flex-direction: column;
        min-width: 0;
        height: min(76dvh, 820px);
        min-height: 430px;
        overflow: hidden;
        padding: 0;
        margin: 0;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 16px;
        background: var(--color-surface, #fff);
        box-shadow: 0 3px 15px rgba(15, 23, 42, .05);
      }

      .ksk-wa-chat-page .ksk-msg-chat-header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 65px;
        padding: 9px 12px;
        border: 0;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
      }

      .ksk-wa-chat-page .ksk-wa-back {
        flex: 0 0 38px;
        width: 38px;
        min-width: 38px;
        min-height: 38px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: var(--color-text, #172033);
        font-size: 20px;
      }

      .ksk-wa-chat-page .ksk-msg-chat-header > button:not(.ksk-wa-back) {
        flex: 0 0 44px;
        width: 44px;
        min-width: 44px;
        min-height: 44px;
        padding: 0;
        border: 0;
        background: transparent;
      }

      .ksk-wa-chat-page .ksk-msg-chat-header .ksk-msg-avatar {
        width: 44px;
        height: 44px;
        min-width: 44px;
      }

      .ksk-wa-chat-page .ksk-msg-chat-header-main {
        flex: 1;
        min-width: 0;
      }

      .ksk-wa-chat-page .ksk-msg-chat-header-main strong {
        display: block;
        overflow: hidden;
        font-size: 14px;
        font-weight: 750;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ksk-wa-chat-page .ksk-msg-chat-status {
        overflow: hidden;
        margin-top: 2px;
        color: var(--color-muted, #64748b);
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ksk-wa-chat-page .ksk-msg-chat-status:has(span:not(:empty)) {
        color: #128c7e;
      }

      .ksk-wa-chat-page .ksk-msg-chat-header > button[data-action="block-user"] {
        flex: 0 0 auto;
        width: auto;
        min-width: 0;
        min-height: 34px;
        padding: 6px 9px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 9px;
        font-size: 11px;
      }

      .ksk-wa-chat-page .ksk-msg-history {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        gap: 9px;
        min-width: 0;
        min-height: 100px;
        max-height: none;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 15px 12px;
        margin: 0;
        background-color: #efeae2;
        background-image:
          radial-gradient(rgba(15, 23, 42, .045) .7px, transparent .7px);
        background-size: 18px 18px;
        scrollbar-width: thin;
      }

      .ksk-wa-chat-page .ksk-msg-history-item {
        position: relative;
        width: fit-content;
        max-width: min(82%, 560px);
        min-width: 76px;
        padding: 9px 11px 7px;
        border: 0;
        border-radius: 13px;
        background: #fff;
        color: #172033;
        font-size: 14px;
        line-height: 1.55;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        box-shadow: 0 1px 1px rgba(15, 23, 42, .08);
      }

      .ksk-wa-chat-page .ksk-msg-history-item.from-them {
        align-self: flex-start;
        border-top-left-radius: 4px;
        background: #fff;
        color: #172033;
      }

      .ksk-wa-chat-page .ksk-msg-history-item.from-me {
        align-self: flex-end;
        border-top-right-radius: 4px;
        border-color: transparent;
        background: #d9fdd3;
        color: #173b2c;
      }

      .ksk-wa-chat-page .ksk-msg-history-item.deleted {
        opacity: .8;
        font-style: italic;
      }

      .ksk-wa-chat-page .ksk-msg-history-time {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        margin-top: 5px;
        color: inherit;
        opacity: .65;
        font-size: 10px;
        line-height: 1.3;
      }

      .ksk-wa-chat-page .ksk-msg-status {
        margin-left: 3px;
        color: #64748b;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
      }

      .ksk-wa-chat-page .ksk-msg-history-item.from-me .ksk-msg-status {
        color: #1684c7;
      }

      .ksk-wa-chat-page .ksk-msg-reply-preview {
        padding: 7px 9px;
        margin: 0 0 7px;
        border-left: 3px solid #128c7e;
        border-radius: 7px;
        background: rgba(18, 140, 126, .09);
        color: inherit;
        font-size: 12px;
      }

      .ksk-wa-chat-page .ksk-msg-media {
        max-width: 100%;
        max-height: 300px;
        margin-top: 7px;
        border-radius: 9px;
        object-fit: contain;
      }

      .ksk-wa-chat-page .ksk-msg-message-options {
        width: fit-content;
        max-width: 100%;
        margin-top: 5px;
        border: 0;
        background: transparent;
      }

      .ksk-wa-chat-page .ksk-msg-message-options > summary {
        justify-content: flex-end;
        min-height: 25px;
        padding: 3px 6px;
        border: 0;
        background: transparent;
        color: inherit;
        opacity: .65;
        font-size: 10px;
      }

      .ksk-wa-chat-page .ksk-msg-message-options > summary::after {
        display: none;
      }

      .ksk-wa-chat-page .ksk-msg-message-options .ksk-msg-disclosure-body {
        padding: 5px 0 0;
        border: 0;
      }

      .ksk-wa-chat-page .ksk-msg-bubble-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .ksk-wa-chat-page .ksk-msg-bubble-actions button {
        min-height: 32px;
        padding: 6px 9px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        font-size: 11px;
      }

      /* =========================================
         CHAT SEARCH / GROUP CONTROLS
      ========================================= */

      .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar {
        flex: 0 0 auto;
        gap: 7px;
        padding: 8px 10px;
        margin: 0;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
      }

      .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar .ksk-msg-search {
        min-height: 38px;
        padding: 7px 11px;
        border-radius: 20px;
        font-size: 12px;
      }

      .ksk-wa-chat-page .ksk-msg-detail > .ksk-msg-toolbar .ksk-msg-secondary {
        min-height: 34px;
        padding: 6px 9px;
        font-size: 11px;
      }

      .ksk-wa-chat-page [data-action="load-older"] {
        flex: 0 0 auto;
        align-self: center;
        min-height: 30px;
        padding: 4px 10px;
        margin: 6px 0;
        border-radius: 20px;
        font-size: 11px;
      }

      .ksk-wa-chat-page .ksk-msg-search-results {
        flex: 0 0 auto;
        max-height: 140px;
        overflow-y: auto;
        padding: 5px 10px;
        margin: 0;
        background: var(--color-surface, #fff);
      }

      .ksk-wa-chat-page .ksk-msg-search-result {
        padding: 8px;
        border-radius: 9px;
        font-size: 12px;
      }

      .ksk-wa-chat-page .ksk-msg-reply-preview {
        flex: 0 0 auto;
        margin: 0;
        padding: 9px 12px;
        border-top: 1px solid var(--color-border, #e2e8f0);
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        border-left: 3px solid #128c7e;
        border-radius: 0;
        background: var(--color-surface, #fff);
        font-size: 12px;
      }

      /* =========================================
         WHATSAPP COMPOSER
      ========================================= */

      .ksk-wa-chat-page .ksk-msg-send-form {
        position: relative;
        z-index: 2;
        display: flex;
        flex: 0 0 auto;
        align-items: flex-end;
        gap: 7px;
        min-width: 0;
        padding: 9px 10px;
        padding-bottom: calc(9px + env(safe-area-inset-bottom, 0px));
        margin: 0;
        border-top: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
      }

      .ksk-wa-chat-page .ksk-msg-compose {
        flex: 1 1 auto;
        width: 100%;
        min-width: 0;
        min-height: 44px;
        max-height: 120px;
        padding: 11px 15px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 24px;
        background: var(--color-surface-secondary, #f8fafc);
        font-size: 14px;
        line-height: 1.45;
        resize: none;
      }

      .ksk-wa-chat-page .ksk-msg-compose-actions {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 7px;
      }

      .ksk-wa-chat-page .ksk-msg-compose-actions label {
        display: inline-flex;
        flex: 0 0 42px;
        align-items: center;
        justify-content: center;
        width: 42px;
        min-height: 42px;
        padding: 0;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 50%;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        font-size: 0;
        cursor: pointer;
      }

      .ksk-wa-chat-page .ksk-msg-compose-actions label::before {
        content: "📎";
        font-size: 19px;
      }

      .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
        display: inline-flex;
        flex: 0 0 44px;
        align-items: center;
        justify-content: center;
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
        padding: 0;
        border-radius: 50%;
        background: #128c7e;
        color: #fff;
        font-size: 0;
      }

      .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary::after {
        content: "➤";
        font-size: 19px;
        line-height: 1;
      }

      .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary:disabled {
        opacity: .6;
      }

      /* =========================================
         GROUP / OTHER FORMS
      ========================================= */

      .ksk-msg-form {
        padding: 13px;
        margin: 10px 0;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 14px;
        background: var(--color-surface, #fff);
      }

      .ksk-msg-friend-options {
        display: grid;
        gap: 7px;
        max-height: 230px;
        overflow: auto;
        margin: 10px 0;
      }

      .ksk-msg-friend-option {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px;
        border-radius: 9px;
        background: var(--color-surface-secondary, #f8fafc);
      }

      /* =========================================
         DARK THEME
      ========================================= */

      html[data-theme="dark"] .ksk-wa-chat-page .ksk-msg-history {
        background-color: #0b141a;
        background-image:
          radial-gradient(rgba(255, 255, 255, .035) .7px, transparent .7px);
      }

      html[data-theme="dark"] .ksk-wa-chat-page .ksk-msg-history-item.from-them {
        background: #202c33;
        color: #e9edef;
      }

      html[data-theme="dark"] .ksk-wa-chat-page .ksk-msg-history-item.from-me {
        background: #005c4b;
        color: #e9edef;
      }

      html[data-theme="dark"] .ksk-wa-chat-page .ksk-msg-history-item.from-me .ksk-msg-status {
        color: #7dd3fc;
      }

      html[data-theme="dark"] .ksk-wa-chat-page .ksk-msg-reply-preview {
        background: rgba(18, 140, 126, .16);
      }

      /* =========================================
         MOBILE
      ========================================= */

      @media (max-width: 600px) {
        .ksk-msg-page {
          padding: 2px 0 12px;
        }

        .ksk-wa-list-page h3 {
          margin: 6px 0 12px;
          font-size: 19px;
        }

        .ksk-wa-list-page .ksk-msg-row {
          min-height: 72px;
          padding: 9px 10px;
        }

        .ksk-wa-list-page .ksk-msg-avatar {
          flex-basis: 49px;
          width: 49px;
          height: 49px;
          min-width: 49px;
        }

        .ksk-wa-chat-page {
          padding: 0;
        }

        .ksk-wa-chat-page .ksk-msg-detail {
          height: calc(100dvh - 160px);
          min-height: 350px;
          border-radius: 12px;
        }

        .ksk-wa-chat-page .ksk-msg-chat-header {
          min-height: 59px;
          padding: 7px 8px;
          gap: 7px;
        }

        .ksk-wa-chat-page .ksk-wa-back {
          flex-basis: 32px;
          width: 32px;
          min-width: 32px;
        }

        .ksk-wa-chat-page .ksk-msg-history {
          padding: 12px 9px;
          gap: 8px;
        }

        .ksk-wa-chat-page .ksk-msg-history-item {
          max-width: 88%;
          min-width: 68px;
          padding: 8px 10px 6px;
          font-size: 13px;
        }

        .ksk-wa-chat-page .ksk-msg-send-form {
          gap: 5px;
          padding: 7px 7px;
          padding-bottom: calc(7px + env(safe-area-inset-bottom, 0px));
        }

        .ksk-wa-chat-page .ksk-msg-compose {
          min-height: 42px;
          padding: 10px 12px;
          font-size: 13px;
        }

        .ksk-wa-chat-page .ksk-msg-compose-actions {
          gap: 5px;
        }

        .ksk-wa-chat-page .ksk-msg-compose-actions label {
          flex-basis: 38px;
          width: 38px;
          min-height: 38px;
        }

        .ksk-wa-chat-page .ksk-msg-compose-actions .ksk-msg-primary {
          flex-basis: 40px;
          width: 40px;
          min-width: 40px;
          height: 40px;
          min-height: 40px;
        }
      }

      @media (max-height: 600px) {
        .ksk-wa-chat-page .ksk-msg-detail {
          height: calc(100dvh - 115px);
          min-height: 280px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ksk-wa-list-page .ksk-msg-row {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function wrapDisclosure(html, className, label) {
    return `
      <details class="ksk-msg-disclosure ${className}">
        <summary>${label}</summary>
        <div class="ksk-msg-disclosure-body">
          ${html}
        </div>
      </details>
    `;
  }

  function decorate(html) {
    if (typeof html !== "string" || !html) return html;

    if (html.includes("ksk-wa-chat-page") ||
        html.includes("ksk-wa-list-page")) {
      return html;
    }

    let output = html;
    const isChat = output.includes('class="ksk-msg-detail"');

    output = output.replace(
      '<section class="ksk-msg-page">',
      isChat
        ? '<section class="ksk-msg-page ksk-wa-chat-page">'
        : '<section class="ksk-msg-page ksk-wa-list-page">'
    );

    if (isChat) {
      output = output.replace(
        /<button class="ksk-msg-secondary"\s+type="button"\s+data-action="back">([\s\S]*?)<\/button>\s*<div class="ksk-msg-detail">\s*<div class="ksk-msg-chat-header">/,
        '<div class="ksk-msg-detail"><div class="ksk-msg-chat-header"><button class="ksk-msg-secondary ksk-wa-back" type="button" data-action="back">$1</button>'
      );
    }

    output = output.replace(
      /<div class="ksk-msg-actions">([\s\S]*?)<\/div>/g,
      match => wrapDisclosure(
        match,
        "ksk-msg-conversation-options",
        "विकल्प"
      )
    );

    output = output.replace(
      /<div class="ksk-msg-bubble-actions">([\s\S]*?)<\/div>/g,
      match => wrapDisclosure(
        match,
        "ksk-msg-message-options",
        "थप"
      )
    );

    return output;
  }

  function wrapMountedElement(element, className, label) {
    if (!element || element.parentElement?.classList.contains(
      "ksk-msg-disclosure-body"
    )) {
      return;
    }

    const details = document.createElement("details");
    details.className = "ksk-msg-disclosure " + className;

    const summary = document.createElement("summary");
    summary.textContent = label;

    const body = document.createElement("div");
    body.className = "ksk-msg-disclosure-body";

    element.parentNode.insertBefore(details, element);
    details.append(summary, body);
    body.appendChild(element);
  }

  function enhanceMountedPage() {
    const root = document.getElementById("otherPageText");
    if (!root) return;

    root.querySelectorAll(".ksk-msg-page").forEach(page => {
      const isChat = Boolean(page.querySelector(".ksk-msg-detail"));

      page.classList.toggle("ksk-wa-chat-page", isChat);
      page.classList.toggle("ksk-wa-list-page", !isChat);

      if (isChat) {
        const back = page.querySelector('[data-action="back"]');
        const header = page.querySelector(".ksk-msg-chat-header");

        if (back && header && back.parentElement !== header) {
          back.classList.add("ksk-wa-back");
          header.prepend(back);
        }
      }

      page.querySelectorAll(".ksk-msg-actions").forEach(element => {
        wrapMountedElement(
          element,
          "ksk-msg-conversation-options",
          "विकल्प"
        );
      });

      page.querySelectorAll(".ksk-msg-bubble-actions").forEach(element => {
        wrapMountedElement(
          element,
          "ksk-msg-message-options",
          "थप"
        );
      });
    });
  }

  function installObserver() {
    if (observer || !global.MutationObserver) return;

    observer = new MutationObserver(() => {
      enhanceMountedPage();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    enhanceMountedPage();
  }

  function wrappedRender() {
    addStyles();
    return decorate(API.render.apply(API, arguments));
  }

  function wrappedRenderChat() {
    addStyles();
    return decorate(API.renderChat.apply(API, arguments));
  }

  const enhanced = Object.create(API);

  Object.defineProperties(enhanced, {
    render: {
      value: wrappedRender,
      enumerable: true
    },
    renderChat: {
      value: wrappedRenderChat,
      enumerable: true
    },
    __whatsappUILayerInstalled: {
      value: true
    }
  });

  global.KSKMessagesPage = Object.freeze(enhanced);

  function initializeLayer() {
    addStyles();
    installObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeLayer,
      { once: true }
    );
  } else {
    initializeLayer();
  }

})(window);
