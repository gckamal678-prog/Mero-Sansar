
"use strict";

/*
 * KSK COMMENTS BRIDGE
 * Connects post comment buttons to KSKComments.
 * Must load after core/comments.js and before app.js.
 */

(function (global) {
  if (global.KSKCommentsBridge) return;

  const STYLE_ID = "ksk-comments-styles";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .ksk-comments-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
      }

      .ksk-comments-list {
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-height: 48vh;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 2px 2px 10px;
      }

      .ksk-comment-main {
        display: flex;
        align-items: flex-start;
        gap: 9px;
      }

      .ksk-comment-avatar {
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
        border-radius: 50%;
        object-fit: cover;
      }

      .ksk-comment-avatar-fallback {
        display: grid;
        place-items: center;
        background: var(--color-primary);
        color: white;
        font-weight: 800;
      }

      .ksk-comment-body {
        flex: 1;
        min-width: 0;
      }

      .ksk-comment-bubble {
        display: inline-block;
        max-width: 100%;
        padding: 10px 13px;
        border-radius: 16px;
        background: var(--color-surface-secondary);
        overflow-wrap: anywhere;
      }

      .ksk-comment-author {
        display: block;
        margin-bottom: 4px;
        color: var(--color-text);
        font-size: 13px;
        font-weight: 800;
      }

      .ksk-comment-text {
        color: var(--color-text);
        font-size: 14px;
        line-height: 1.55;
        white-space: normal;
      }

      .ksk-comment-reply-to {
        display: block;
        margin: 2px 0 5px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }

      .ksk-comment-mention {
        color: var(--color-primary);
        font-weight: 800;
      }

      .ksk-comment-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding: 5px 8px;
      }

      .ksk-comment-time {
        color: var(--color-muted);
        font-size: 10px;
      }

      .ksk-comment-action {
        padding: 2px 0;
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .ksk-comment-action:hover,
      .ksk-comment-action.is-liked {
        color: var(--color-primary);
      }

      .ksk-comment-delete {
        color: var(--color-danger);
      }

      .ksk-comment-replies {
        display: flex;
        flex-direction: column;
        gap: 13px;
        margin: 10px 0 0 10px;
        padding-left: 12px;
        border-left: 2px solid var(--color-border);
      }

      .ksk-comments-empty {
        padding: 32px 12px;
        text-align: center;
        color: var(--color-text-secondary);
      }

      .ksk-comments-empty > div {
        margin-bottom: 8px;
        font-size: 32px;
      }

      .ksk-comments-empty p {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
      }

      .ksk-comment-composer {
        position: sticky;
        bottom: 0;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        background: var(--color-surface);
      }

      .ksk-comment-form {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .ksk-comment-input {
        width: 100%;
        min-height: 76px;
        max-height: 150px;
        resize: vertical;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 13px;
        outline: none;
        background: var(--color-surface-secondary);
        color: var(--color-text);
        font: inherit;
        font-size: 13px;
        line-height: 1.5;
      }

      .ksk-comment-input:focus {
        border-color: var(--color-primary);
      }

      .ksk-comment-composer-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .ksk-comment-hint {
        color: var(--color-muted);
        font-size: 10px;
      }

      .ksk-reply-indicator {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 9px;
        padding: 8px 10px;
        border-radius: 9px;
        background: var(--color-surface-secondary);
        color: var(--color-text-secondary);
        font-size: 12px;
      }

      .ksk-reply-indicator button {
        border: 0;
        background: transparent;
        color: var(--color-text);
        font-size: 20px;
        cursor: pointer;
      }

      .ksk-mention-suggestions {
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-height: 180px;
        overflow-y: auto;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        background: var(--color-surface);
        box-shadow: var(--shadow-md);
      }

      .ksk-mention-option {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        padding: 8px;
        border: 0;
        border-radius: 9px;
        background: transparent;
        color: var(--color-text);
        text-align: left;
        cursor: pointer;
      }

      .ksk-mention-option:hover {
        background: var(--color-surface-hover);
      }

      .ksk-mention-option .ksk-comment-avatar {
        width: 28px;
        height: 28px;
        flex-basis: 28px;
      }

      .ksk-mention-empty {
        padding: 12px;
        color: var(--color-muted);
        font-size: 12px;
      }

      @media (max-width: 480px) {
        .modal-backdrop {
          padding: 8px;
        }

        .ksk-comments-list {
          max-height: 52vh;
        }

        .ksk-comment-replies {
          margin-left: 4px;
          padding-left: 9px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function handleCommentClick(event) {
    const button = event.target.closest(
      '[data-post-action="comment"]'
    );

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const postId = button.dataset.postId;

    if (!postId) return;

    if (!global.KSKComments?.open) {
      global.KSKToast?.error?.(
        "टिप्पणी सुविधा अहिले उपलब्ध छैन।"
      );
      return;
    }

    global.KSKComments.open(postId);
  }

  function initialize() {
    addStyles();

    // Capture phase prevents the old app.js placeholder handler.
    document.addEventListener(
      "click",
      handleCommentClick,
      true
    );
  }

  global.KSKCommentsBridge = Object.freeze({
    initialize,
    addStyles
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
