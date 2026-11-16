
"use strict";

/*
 * MERO SANSAR — MESSENGER UI LAYER
 *
 * Design:
 * - Progressive Disclosure
 * - Minimalist / Clean UI
 * - Mobile-first responsive layout
 *
 * Keeps the existing Supabase Messenger API intact.
 * Does not add or modify audio/video calling or recording.
 */

(function (global) {
  "use strict";

  const API = global.KSKMessagesPage;

  if (!API || API.__cleanUILayerInstalled) return;

  const STYLE_ID = "ksk-messenger-clean-ui";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .ksk-msg-page {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
        padding: 2px 0 24px;
        color: var(--color-text, #172033);
        font-family: inherit;
      }

      .ksk-msg-page h3 {
        margin: 8px 0 14px;
        font-size: 19px;
        font-weight: 750;
        letter-spacing: -.3px;
      }

      .ksk-msg-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        margin: 12px 0;
      }

      .ksk-msg-search,
      .ksk-msg-compose,
      .ksk-msg-input {
        min-width: 0;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 12px;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        box-shadow: none;
      }

      .ksk-msg-search {
        flex: 1;
        min-height: 44px;
        padding: 10px 13px;
      }

      .ksk-msg-primary {
        min-height: 42px;
        border-radius: 11px;
        padding: 9px 14px;
        font-size: 13px;
        font-weight: 650;
      }

      .ksk-msg-secondary,
      .ksk-msg-action {
        min-height: 36px;
        border-radius: 10px;
        font-size: 12px;
      }

      .ksk-msg-tabs {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding: 3px 1px 10px;
        scrollbar-width: thin;
      }

      .ksk-msg-tab {
        min-height: 35px;
        padding: 7px 13px;
        white-space: nowrap;
        font-size: 12px;
      }

      .ksk-msg-list {
        display: grid;
        gap: 8px;
      }

      .ksk-msg-row {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
        padding: 11px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 14px;
        background: var(--color-surface, #fff);
        transition: border-color .15s ease, background .15s ease;
      }

      .ksk-msg-row:focus-within {
        border-color: var(--color-primary, #2563eb);
      }

      .ksk-msg-row-main {
        flex: 1;
        min-width: 0;
      }

      .ksk-msg-row-title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.45;
      }

      .ksk-msg-row-subtitle {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.5;
        opacity: .75;
      }

      .ksk-msg-avatar {
        flex: 0 0 43px;
        width: 43px;
        height: 43px;
      }

      /* Progressive disclosure */
      .ksk-msg-disclosure {
        min-width: 0;
        margin: 7px 0;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 11px;
        background: var(--color-surface, #fff);
      }

      .ksk-msg-disclosure > summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 38px;
        padding: 8px 11px;
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

      .ksk-msg-disclosure > summary::after {
        content: "+";
        font-size: 17px;
        line-height: 1;
      }

      .ksk-msg-disclosure[open] > summary::after {
        content: "−";
      }

      .ksk-msg-disclosure > summary:focus-visible {
        outline: 2px solid var(--color-primary, #2563eb);
        outline-offset: 2px;
        border-radius: 8px;
      }

      .ksk-msg-disclosure-body {
        padding: 8px;
        border-top: 1px solid var(--color-border, #e2e8f0);
      }

      .ksk-msg-conversation-options {
        flex: 0 0 auto;
        width: auto;
        max-width: 116px;
        margin: 0;
      }

      .ksk-msg-conversation-options > summary {
        min-height: 34px;
        padding: 6px 9px;
        white-space: nowrap;
      }

      .ksk-msg-conversation-options .ksk-msg-actions {
        display: grid;
        gap: 6px;
      }

      .ksk-msg-conversation-options .ksk-msg-action {
        width: 100%;
        text-align: center;
      }

      .ksk-msg-filter-disclosure {
        margin: 5px 0 10px;
      }

      .ksk-msg-filter-disclosure .ksk-msg-tabs {
        flex-wrap: wrap;
        overflow: visible;
        padding: 0;
      }

      .ksk-msg-search-disclosure {
        margin: 12px 0;
      }

      .ksk-msg-search-disclosure .ksk-msg-toolbar {
        margin: 0;
      }

      .ksk-msg-detail {
        padding: 12px;
        border-radius: 16px;
      }

      .ksk-msg-chat-header {
        gap: 10px;
        padding-bottom: 12px;
      }

      .ksk-msg-chat-header-main strong {
        font-size: 14px;
      }

      .ksk-msg-chat-status {
        font-size: 11px;
      }

      .ksk-msg-history {
        gap: 9px;
        min-height: 150px;
        max-height: min(62vh, 720px);
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 3px 1px;
      }

      .ksk-msg-history-item {
        max-width: min(86%, 560px);
        padding: 10px 12px;
        border-radius: 14px;
        font-size: 14px;
        line-height: 1.55;
      }

      .ksk-msg-history-item.from-me {
        border-color: transparent;
      }

      .ksk-msg-bubble-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .ksk-msg-bubble-actions button {
        min-height: 34px;
        padding: 7px 10px;
        border-radius: 9px;
        font-size: 12px;
      }

      .ksk-msg-message-options {
        width: fit-content;
        max-width: 100%;
        margin-top: 8px;
        border-color: transparent;
        background: transparent;
      }

      .ksk-msg-message-options > summary {
        min-height: 29px;
        padding: 4px 8px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        background: var(--color-surface, #fff);
      }

      .ksk-msg-message-options .ksk-msg-disclosure-body {
        padding: 7px 0 0;
        border: 0;
      }

      .ksk-msg-send-form {
        position: sticky;
        bottom: 0;
        z-index: 2;
        gap: 8px;
        padding-top: 10px;
        background: var(--color-surface, #fff);
      }

      .ksk-msg-compose {
        min-height: 48px;
        max-height: 150px;
        padding: 11px 12px;
        resize: vertical;
        font-size: 14px;
      }

      .ksk-msg-compose-actions {
        gap: 8px;
      }

      .ksk-msg-compose-actions label {
        min-height: 40px;
        border-radius: 10px;
        font-size: 12px;
      }

      .ksk-msg-compose-actions button {
        flex: 1;
      }

      .ksk-msg-empty {
        padding: 24px 14px;
        border-radius: 14px;
        font-size: 13px;
      }

      .ksk-msg-form {
        padding: 13px;
        border-radius: 14px;
      }

      .ksk-msg-friend-options {
        max-height: 230px;
      }

      .ksk-msg-search-results {
        gap: 7px;
      }

      .ksk-msg-search-result {
        padding: 10px;
        border-radius: 10px;
        font-size: 13px;
      }

      .ksk-msg-page button,
      .ksk-msg-page input,
      .ksk-msg-page textarea {
        font-family: inherit;
      }

      .ksk-msg-page button:focus-visible,
      .ksk-msg-page [role="button"]:focus-visible {
        outline: 2px solid var(--color-primary, #2563eb);
        outline-offset: 2px;
      }

      @media (max-width: 600px) {
        .ksk-msg-page h3 {
          font-size: 17px;
        }

        .ksk-msg-toolbar {
          flex-wrap: wrap;
        }

        .ksk-msg-toolbar > .ksk-msg-search {
          flex-basis: 100%;
        }

        .ksk-msg-row {
          padding: 9px;
        }

        .ksk-msg-conversation-options {
          max-width: 90px;
        }

        .ksk-msg-conversation-options > summary {
          padding: 6px;
          font-size: 11px;
        }

        .ksk-msg-detail {
          padding: 9px;
        }

        .ksk-msg-history {
          max-height: 58vh;
        }

        .ksk-msg-history-item {
          max-width: 94%;
          min-width: 70px;
        }

        .ksk-msg-chat-header > button {
          padding: 5px;
        }

        .ksk-msg-chat-header > .ksk-msg-secondary {
          padding: 7px;
          font-size: 11px;
        }

        .ksk-msg-compose-actions label {
          flex: 0 0 auto;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ksk-msg-row {
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

    let output = html;

    // Hide per-conversation actions until requested.
    output = output.replace(
      /<div class="ksk-msg-actions">([\s\S]*?)<\/div>/g,
      (match) => wrapDisclosure(
        match,
        "ksk-msg-conversation-options",
        "⋯ विकल्प"
      )
    );

    // Hide message actions until the user opens them.
    output = output.replace(
      /<div class="ksk-msg-bubble-actions">([\s\S]*?)<\/div>/g,
      (match) => wrapDisclosure(
        match,
        "ksk-msg-message-options",
        "थप"
      )
    );

    // Keep conversation filters available, but collapsed by default.
    output = output.replace(
      /<div class="ksk-msg-tabs">([\s\S]*?)<\/div>/g,
      (match) => wrapDisclosure(
        match,
        "ksk-msg-filter-disclosure",
        "कुराकानी फिल्टर"
      )
    );

    // Search inside a chat is an optional advanced action.
    output = output.replace(
      /<div class="ksk-msg-toolbar">\s*(<input[\s\S]*?data-message-content-search[\s\S]*?<\/button>)\s*<\/div>/g,
      (match) => wrapDisclosure(
        match,
        "ksk-msg-search-disclosure",
        "यस कुराकानीमा खोज्नुहोस्"
      )
    );

    return output;
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
    __cleanUILayerInstalled: {
      value: true
    }
  });

  global.KSKMessagesPage = Object.freeze(enhanced);

  addStyles();

})(window);
