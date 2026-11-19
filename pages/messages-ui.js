/* =========================================================
   MERO SANSAR — WHATSAPP CHAT UI + COMPOSER
   FULL REPLACEMENT
   File: pages/messages-ui.js
========================================================= */

(function () {
  "use strict";

  if (window.__MERO_SANSAR_WA_CHAT_UI__) return;
  window.__MERO_SANSAR_WA_CHAT_UI__ = true;

  // पुरानो composer-fix script सँग दोहोरो काम हुन नदिने
  window.MS_COMPOSER_FIX_V3 = true;

  const STYLE_ID = "mero-sansar-wa-chat-style";
  let holdTimer = null;
  let heldBubble = null;
  let observer = null;

  const GALLERY_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <path d="m21 15-5-5L5 21"></path>
    </svg>`;

  const CAMERA_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"></path>
      <circle cx="12" cy="13" r="3.5"></circle>
    </svg>`;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* ================================================
         MERO SANSAR — CHAT UI
         Theme-aware WhatsApp style layout
      ================================================ */

      .ksk-msg-row {
        position: relative !important;
        align-items: flex-start !important;
        overflow: visible !important;
      }

      .ksk-msg-row-main {
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      /* CONVERSATION MENU */

      .ksk-msg-row-menu {
        position: relative !important;
        flex: 0 0 36px !important;
        width: 36px !important;
        margin-left: auto !important;
      }

      .ksk-msg-row-menu > summary {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 36px !important;
        height: 36px !important;
        border: 1px solid var(--color-border) !important;
        border-radius: 50% !important;
        background: var(--color-surface) !important;
        color: var(--color-text) !important;
        font-size: 22px !important;
        cursor: pointer !important;
        list-style: none !important;
      }

      .ksk-msg-row-menu > summary::-webkit-details-marker {
        display: none !important;
      }

      .ksk-msg-row-menu-panel {
        position: absolute !important;
        top: 40px !important;
        right: 0 !important;
        z-index: 200 !important;
        min-width: 150px !important;
        padding: 7px !important;
        border: 1px solid var(--color-border) !important;
        border-radius: var(--radius-md) !important;
        background: var(--color-surface) !important;
        box-shadow: var(--shadow-md) !important;
      }

      .ksk-msg-row-menu-panel .ksk-msg-actions {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 3px !important;
      }

      .ksk-msg-row-menu-panel .ksk-msg-action {
        width: 100% !important;
        min-height: 38px !important;
        padding: 8px 10px !important;
        border: 0 !important;
        border-radius: var(--radius-sm) !important;
        background: transparent !important;
        color: var(--color-text) !important;
        text-align: left !important;
      }

      .ksk-msg-row-menu-panel .ksk-msg-action:hover {
        background: var(--color-surface-hover) !important;
      }

      /* REMOVE EXTRA PAGE TITLE */

      #otherPageText:has(.ksk-msg-detail) > h1,
      #otherPageText:has(.ksk-msg-detail) > h2,
      #otherPageText:has(.ksk-msg-detail) > h3 {
        display: none !important;
      }

      #otherPageText:has(.ksk-msg-detail) {
        min-width: 0 !important;
        min-height: 0 !important;
        overflow-x: hidden !important;
      }

      .ksk-msg-page:has(> .ksk-msg-detail) {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }

      /* CHAT CONTAINER */

      .ksk-msg-detail,
      .ksk-msg-detail * {
        box-sizing: border-box !important;
      }

      .ksk-msg-page:has(> .ksk-msg-detail) > .ksk-msg-detail {
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
        overflow: hidden !important;
        border: 1px solid var(--color-border) !important;
        border-radius: var(--radius-md) !important;
        background: var(--color-surface) !important;
        color: var(--color-text) !important;
      }

      /* FIXED CHAT HEADER */

      .ksk-msg-detail > .ksk-msg-chat-header {
        position: relative !important;
        z-index: 10 !important;
        display: flex !important;
        flex: 0 0 65px !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 65px !important;
        margin: 0 !important;
        padding: 8px 12px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border) !important;
        background: var(--color-surface) !important;
      }

      .ksk-msg-chat-header .ksk-msg-back {
        display: inline-flex !important;
        flex: 0 0 38px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        min-width: 38px !important;
        height: 38px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: var(--color-text) !important;
        font-size: 23px !important;
      }

      .ksk-msg-profile-button {
        display: inline-flex !important;
        flex: 0 0 46px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 46px !important;
        min-width: 46px !important;
        height: 46px !important;
        padding: 0 !important;
        overflow: hidden !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
      }

      .ksk-msg-profile-button .ksk-msg-avatar {
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
      }

      .ksk-msg-chat-header-main {
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      .ksk-msg-chat-header-main strong {
        display: block !important;
        overflow: hidden !important;
        color: var(--color-text) !important;
        font-size: 16px !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
      }

      .ksk-msg-chat-status {
        margin-top: 2px !important;
        color: var(--color-muted) !important;
        font-size: 12px !important;
      }

      /* THREE DOT CHAT MENU */

      .ksk-wa-chat-options {
        position: relative !important;
        flex: 0 0 38px !important;
        margin-left: auto !important;
      }

      .ksk-wa-chat-options > summary {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        height: 38px !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: var(--color-text) !important;
        font-size: 24px !important;
        cursor: pointer !important;
        list-style: none !important;
      }

      .ksk-wa-chat-options > summary::-webkit-details-marker {
        display: none !important;
      }

      .ksk-wa-chat-options[open] > summary {
        background: var(--color-surface-hover) !important;
      }

      .ksk-wa-chat-options-panel {
        position: absolute !important;
        top: 43px !important;
        right: 0 !important;
        z-index: 300 !important;
        display: grid !important;
        min-width: 190px !important;
        padding: 7px !important;
        border: 1px solid var(--color-border) !important;
        border-radius: var(--radius-md) !important;
        background: var(--color-surface) !important;
        box-shadow: var(--shadow-md) !important;
      }

      .ksk-wa-chat-options-panel button {
        width: 100% !important;
        min-height: 42px !important;
        padding: 10px 12px !important;
        border: 0 !important;
        border-radius: var(--radius-sm) !important;
        background: transparent !important;
        color: var(--color-text) !important;
        text-align: left !important;
        font: inherit !important;
        font-size: 14px !important;
        cursor: pointer !important;
      }

      .ksk-wa-chat-options-panel button:hover {
        background: var(--color-surface-hover) !important;
      }

      /* MESSAGE SEARCH */

      .ksk-msg-detail > .ksk-msg-toolbar {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 8px 10px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--color-border) !important;
        background: var(--color-surface) !important;
      }

      .ksk-msg-detail .ksk-msg-search {
        flex: 1 1 auto !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 40px !important;
        margin: 0 !important;
        padding: 9px 13px !important;
        border: 1px solid var(--color-border) !important;
        border-radius: var(--radius-pill) !important;
        background: var(--color-surface-secondary) !important;
        color: var(--color-text) !important;
        font-size: 14px !important;
      }

      /* ONLY MESSAGE AREA SCROLLS */

      .ksk-msg-detail > .ksk-msg-history {
        display: flex !important;
        flex: 1 1 0 !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 12px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        background: var(--color-background) !important;
      }

      .ksk-msg-history-item {
        position: relative !important;
        display: block !important;
        flex: 0 0 auto !important;
        width: fit-content !important;
        max-width: min(82%, 520px) !important;
        min-width: 65px !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 0 !important;
        padding: 8px 11px 6px !important;
        overflow-wrap: anywhere !important;
        border: 1px solid var(--color-border) !important;
        border-radius: 12px !important;
        background: var(--color-surface) !important;
        color: var(--color-text) !important;
        font-size: 14px !important;
        line-height: 1.45 !important;
        user-select: none !important;
        -webkit-user-select: none !important;
      }

      .ksk-msg-history-item.from-me {
        align-self: flex-end !important;
        border-color: var(--color-primary) !important;
        border-top-right-radius: 3px !important;
        background: var(--color-primary-soft) !important;
        color: var(--color-text) !important;
      }

      .ksk-msg-history-item.from-them {
        align-self: flex-start !important;
        border-top-left-radius: 3px !important;
      }

      .ksk-msg-history-item.deleted {
        opacity: .7 !important;
      }

      .ksk-msg-history-time {
        display: block !important;
        margin-top: 5px !important;
        color: var(--color-muted) !important;
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
        border-radius: var(--radius-sm) !important;
      }

      .ksk-msg-bubble-actions {
        display: none !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
        margin-top: 9px !important;
        padding-top: 7px !important;
        border-top: 1px solid var(--color-border) !important;
      }

      .ksk-msg-history-item.ksk-wa-actions-open
      .ksk-msg-bubble-actions {
        display: flex !important;
      }

      .ksk-msg-bubble-actions button {
        flex: 1 1 auto !important;
        min-height: 34px !important;
        padding: 6px 9px !important;
        border: 1px solid var(--color-border) !important;
        border-radius: var(--radius-sm) !important;
        background: var(--color-surface-secondary) !important;
        color: var(--color-text) !important;
        font-size: 12px !important;
      }

      /* REPLY PREVIEW */

      .ksk-msg-detail > .ksk-msg-reply-preview {
        flex: 0 0 auto !important;
        margin: 5px 9px 0 !important;
        padding: 8px 10px !important;
        border-left: 3px solid var(--color-primary) !important;
        border-radius: var(--radius-sm) !important;
        background: var(--color-surface-secondary) !important;
        color: var(--color-text) !important;
      }

      /* FIXED BOTTOM COMPOSER */

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
        min-height: 64px !important;
        margin: 0 !important;
        padding: 8px 9px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
        border: 0 !important;
        border-top: 1px solid var(--color-border) !important;
        background: var(--color-surface) !important;
      }

      .ksk-wa-composer {
        display: flex !important;
        flex: 1 1 auto !important;
        align-items: flex-end !important;
        gap: 3px !important;
        min-width: 0 !important;
        min-height: 48px !important;
        padding: 4px 5px !important;
        border: 1px solid var(--color-border) !important;
        border-radius: var(--radius-pill) !important;
        background: var(--color-surface-secondary) !important;
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
        color: var(--color-muted) !important;
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
        min-height: 38px !important;
        height: 38px !important;
        max-height: 110px !important;
        margin: 0 !important;
        padding: 9px 3px !important;
        resize: none !important;
        overflow-y: auto !important;
        border: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: var(--color-text) !important;
        font-size: 14px !important;
        line-height: 20px !important;
      }

      .ksk-msg-detail .ksk-msg-compose:focus {
        border: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
      }

      .ksk-msg-compose-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 2px !important;
        width: auto !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .ksk-wa-send {
        display: inline-flex !important;
        flex: 0 0 45px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 45px !important;
        min-width: 45px !important;
        height: 45px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: var(--color-primary) !important;
        color: #fff !important;
        font-size: 22px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .ksk-wa-send[hidden],
      .ksk-wa-file-input {
        display: none !important;
      }

      /* RESPONSIVE */

      @media (max-width: 520px) {
        .ksk-msg-page:has(> .ksk-msg-detail) > .ksk-msg-detail {
          border-right: 0 !important;
          border-left: 0 !important;
          border-radius: 0 !important;
        }

        .ksk-msg-history-item {
          max-width: 86% !important;
        }

        .ksk-msg-detail > .ksk-msg-history {
          padding: 9px !important;
        }

        .ksk-msg-detail > .ksk-msg-send-form {
          gap: 5px !important;
          padding-right: 6px !important;
          padding-left: 6px !important;
        }

        .ksk-wa-composer {
          gap: 1px !important;
          padding-right: 3px !important;
          padding-left: 3px !important;
        }

        .ksk-wa-tool {
          flex-basis: 30px !important;
          width: 30px !important;
          min-width: 30px !important;
        }

        .ksk-wa-send {
          flex-basis: 43px !important;
          width: 43px !important;
          min-width: 43px !important;
          height: 43px !important;
        }
      }

      /* KEYBOARD / SHORT VIEWPORT */

      @media (max-height: 520px) {
        .ksk-msg-detail > .ksk-msg-chat-header {
          flex-basis: 54px !important;
          min-height: 54px !important;
        }

        .ksk-msg-detail > .ksk-msg-send-form {
          min-height: 56px !important;
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }
      }
    `;

    document.head.appendChild(style);
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

  /* MOVE EXISTING ACTIONS INTO THREE-DOT MENU.
     Existing Pin/Archive/Mute handlers remain attached. */
  function repairConversationMenus() {
    document.querySelectorAll(".ksk-msg-row").forEach(row => {
      const actions = row.querySelector(":scope > .ksk-msg-actions");

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

    area.style.height = "38px";
    area.style.height = Math.min(area.scrollHeight, 110) + "px";

    send.hidden = !area.value.trim();
  }

  function buildComposer(form) {
    if (form.dataset.waReady === "yes") return;

    const area = form.querySelector(".ksk-msg-compose");
    const oldActions = form.querySelector(".ksk-msg-compose-actions");
    const send = oldActions?.querySelector('[type="submit"]');
    const originalFile = oldActions?.querySelector('input[type="file"][data-media-file]');

    if (!area || !oldActions || !send) return;

    form.dataset.waReady = "yes";

    const shell = document.createElement("div");
    shell.className = "ksk-wa-composer";

    const galleryInput = originalFile || document.createElement("input");
    galleryInput.type = "file";
    galleryInput.accept = "image/*,video/*,.pdf,.doc,.docx";
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

        if (block && !header.querySelector(".ksk-wa-chat-options")) {
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
        ":scope > form[data-send-form]"
      );

      if (form) buildComposer(form);
    });
  }

  function showMessageActions(bubble) {
    if (!bubble || !bubble.querySelector(".ksk-msg-bubble-actions")) {
      return;
    }

    document.querySelectorAll(
      ".ksk-msg-history-item.ksk-wa-actions-open"
    ).forEach(item => {
      if (item !== bubble) item.classList.remove("ksk-wa-actions-open");
    });

    bubble.classList.add("ksk-wa-actions-open");
  }

  function stopHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    heldBubble = null;
  }

  /* LONG PRESS MESSAGE ACTIONS */

  document.addEventListener("pointerdown", event => {
    const bubble = event.target.closest(".ksk-msg-history-item");

    if (!bubble || event.target.closest("button,a,input,video")) return;

    stopHold();
    heldBubble = bubble;

    holdTimer = setTimeout(() => {
      if (heldBubble === bubble) {
        showMessageActions(bubble);
        if (navigator.vibrate) navigator.vibrate(25);
      }
    }, 480);
  }, { passive: true });

  document.addEventListener("pointerup", stopHold, { passive: true });
  document.addEventListener("pointercancel", stopHold, { passive: true });
  document.addEventListener("pointermove", stopHold, { passive: true });

  document.addEventListener("contextmenu", event => {
    const bubble = event.target.closest(".ksk-msg-history-item");
    if (!bubble) return;

    event.preventDefault();
    showMessageActions(bubble);
  });

  /* GALLERY / CAMERA / MENU INTERACTIONS */

  document.addEventListener("click", event => {
    const menuSummary = event.target.closest(
      ".ksk-msg-row-menu > summary"
    );

    if (menuSummary) {
      const currentMenu = menuSummary.parentElement;

      document.querySelectorAll(
        ".ksk-msg-row-menu[open]"
      ).forEach(menu => {
        if (menu !== currentMenu) menu.removeAttribute("open");
      });

      return;
    }

    const gallery = event.target.closest("[data-wa-gallery]");
    if (gallery) {
      gallery.closest("[data-send-form]")
        ?.querySelector('input[data-media-file]:not([capture])')
        ?.click();
      return;
    }

    const camera = event.target.closest("[data-wa-camera]");
    if (camera) {
      camera.closest("[data-send-form]")
        ?.querySelector('input[data-media-file][capture]')
        ?.click();
      return;
    }

    if (event.target.closest(".ksk-msg-bubble-actions")) {
      const bubble = event.target.closest(".ksk-msg-history-item");
      if (bubble) {
        setTimeout(() => {
          bubble.classList.remove("ksk-wa-actions-open");
        }, 150);
      }
      return;
    }

    if (!event.target.closest(".ksk-msg-history-item")) {
      document.querySelectorAll(
        ".ksk-msg-history-item.ksk-wa-actions-open"
      ).forEach(item => {
        item.classList.remove("ksk-wa-actions-open");
      });
    }

    if (!event.target.closest(".ksk-msg-row-menu")) {
      document.querySelectorAll(
        ".ksk-msg-row-menu[open]"
      ).forEach(menu => menu.removeAttribute("open"));
    }
  });

  /* TEXTAREA RESIZE */

  document.addEventListener("input", event => {
    if (!event.target.matches(".ksk-msg-compose")) return;

    const form = event.target.closest("[data-send-form]");
    if (form) resizeComposer(form);
  });

  /* FILE SELECTED:
     Keep the original data-media-file event flowing to messages.js.
     Do not stop propagation or upload a second time. */

  document.addEventListener("change", event => {
    if (!event.target.matches(".ksk-wa-file-input")) return;

    const form = event.target.closest("[data-send-form]");
    const send = form?.querySelector(".ksk-wa-send");

    if (send && event.target.files?.length) {
      send.hidden = false;
    }
  });

  /* CLOSE MENUS AND MESSAGE ACTIONS */

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    document.querySelectorAll(
      ".ksk-msg-history-item.ksk-wa-actions-open"
    ).forEach(item => {
      item.classList.remove("ksk-wa-actions-open");
    });

    document.querySelectorAll(
      ".ksk-msg-row-menu[open],.ksk-wa-chat-options[open]"
    ).forEach(menu => menu.removeAttribute("open"));
  });

  /* REPAIR DYNAMICALLY RENDERED CHAT UI */

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
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

})();
