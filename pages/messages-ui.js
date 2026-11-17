/* =========================================================
   MERO SANSAR — WHATSAPP CHAT UI
   File: pages/messages-ui.js

   Existing Supabase messaging, send, edit, delete, reply,
   forward and media-upload functions remain untouched.
========================================================= */

(function () {
  "use strict";

  if (window.__MERO_SANSAR_WA_CHAT_UI__) return;
  window.__MERO_SANSAR_WA_CHAT_UI__ = true;

  const STYLE_ID = "mero-sansar-wa-chat-style";
  const EMOJIS = [
    "😀","😃","😄","😁","😆","😂","🤣","😊",
    "😉","😍","🥰","😘","😎","😭","😢","😅",
    "🤔","😮","😴","🙏","👍","👏","❤️","💕",
    "🔥","🎉","🌹","💐","👌","🤗","😋","💯"
  ];

  let holdTimer = null;
  let heldBubble = null;
  let observer = null;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* Remove the duplicate Conversations heading behind chat */
      #otherPageText:has(.ksk-msg-detail) > h1,
      #otherPageText:has(.ksk-msg-detail) > h2,
      #otherPageText:has(.ksk-msg-detail) > h3 {
        display:none!important;
      }

      #otherPageText:has(.ksk-msg-detail) {
        min-width:0!important;
        overflow-x:hidden!important;
      }

      .ksk-msg-page:has(.ksk-msg-detail) {
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        margin:0!important;
        padding:0!important;
      }

      .ksk-msg-page:has(.ksk-msg-detail) > .ksk-msg-detail {
        display:flex!important;
        flex-direction:column!important;
        width:100%!important;
        height:calc(100dvh - 155px)!important;
        min-height:350px!important;
        max-height:calc(100dvh - 155px)!important;
        min-width:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        border:1px solid #26343c!important;
        border-radius:14px!important;
        background:#0b141a!important;
        color:#e9edef!important;
      }

      .ksk-msg-detail,
      .ksk-msg-detail * {
        box-sizing:border-box!important;
      }

      /* Chat header */
      .ksk-msg-detail > .ksk-msg-chat-header {
        position:relative!important;
        z-index:3!important;
        display:flex!important;
        flex:0 0 65px!important;
        align-items:center!important;
        gap:10px!important;
        width:100%!important;
        min-height:65px!important;
        margin:0!important;
        padding:8px 12px!important;
        background:#202c33!important;
        border:0!important;
        border-bottom:1px solid #34434b!important;
      }

      .ksk-msg-chat-header > button[data-action="open-chat-profile"] {
        flex:0 0 46px!important;
        width:46px!important;
        min-width:46px!important;
        height:46px!important;
        padding:0!important;
        overflow:hidden!important;
        border:0!important;
        border-radius:50%!important;
        background:transparent!important;
      }

      .ksk-msg-chat-header .ksk-msg-avatar {
        width:46px!important;
        height:46px!important;
        min-width:46px!important;
      }

      .ksk-msg-chat-header-main {
        flex:1 1 auto!important;
        min-width:0!important;
      }

      .ksk-msg-chat-header-main strong {
        display:block!important;
        overflow:hidden!important;
        color:#e9edef!important;
        font-size:16px!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
      }

      .ksk-msg-chat-status {
        color:#aebac1!important;
        font-size:12px!important;
      }

      /* Keep Block in a small menu */
      .ksk-wa-chat-options {
        position:relative!important;
        flex:0 0 38px!important;
        margin-left:auto!important;
      }

      .ksk-wa-chat-options > summary {
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:38px!important;
        height:38px!important;
        list-style:none!important;
        color:#e9edef!important;
        font-size:23px!important;
        cursor:pointer!important;
      }

      .ksk-wa-chat-options > summary::-webkit-details-marker {
        display:none!important;
      }

      .ksk-wa-chat-options-panel {
        position:absolute!important;
        top:42px!important;
        right:0!important;
        z-index:20!important;
        min-width:125px!important;
        padding:7px!important;
        border:1px solid #34434b!important;
        border-radius:10px!important;
        background:#202c33!important;
        box-shadow:0 8px 24px #0008!important;
      }

      .ksk-wa-chat-options-panel button {
        width:100%!important;
        min-height:38px!important;
        border:0!important;
        background:transparent!important;
        color:#e9edef!important;
        text-align:left!important;
      }

      /* Search area */
      .ksk-msg-detail > .ksk-msg-toolbar {
        display:flex!important;
        flex:0 0 auto!important;
        align-items:center!important;
        gap:7px!important;
        margin:0!important;
        padding:7px 9px!important;
        background:#111b21!important;
        border:0!important;
        border-bottom:1px solid #26343c!important;
      }

      .ksk-msg-detail .ksk-msg-search {
        flex:1 1 auto!important;
        width:1%!important;
        min-width:0!important;
        min-height:40px!important;
        margin:0!important;
        padding:9px 13px!important;
        border:1px solid #34434b!important;
        border-radius:22px!important;
        background:#202c33!important;
        color:#e9edef!important;
        font-size:13px!important;
      }

      .ksk-msg-detail > [data-action="load-older"] {
        flex:0 0 auto!important;
        width:100%!important;
        min-height:42px!important;
        margin:0!important;
        padding:8px!important;
        border:0!important;
        border-bottom:1px solid #26343c!important;
        border-radius:0!important;
        background:#111b21!important;
        color:#aebac1!important;
      }

      /* Message history takes remaining space */
      .ksk-msg-detail > .ksk-msg-history {
        display:flex!important;
        flex:1 1 0!important;
        flex-direction:column!important;
        align-items:stretch!important;
        gap:7px!important;
        width:100%!important;
        min-width:0!important;
        min-height:0!important;
        margin:0!important;
        padding:12px 10px!important;
        overflow-x:hidden!important;
        overflow-y:auto!important;
        overscroll-behavior:contain!important;
        -webkit-overflow-scrolling:touch!important;
        background:#0b141a!important;
      }

      .ksk-msg-history-item {
        position:relative!important;
        display:block!important;
        flex:0 0 auto!important;
        width:fit-content!important;
        max-width:min(82%,520px)!important;
        min-width:65px!important;
        height:auto!important;
        min-height:0!important;
        margin:0!important;
        padding:8px 11px 6px!important;
        overflow-wrap:anywhere!important;
        border:0!important;
        border-radius:9px!important;
        font-size:14px!important;
        line-height:1.45!important;
        user-select:none!important;
        -webkit-user-select:none!important;
      }

      .ksk-msg-history-item.from-me {
        align-self:flex-end!important;
        background:#005c4b!important;
        color:#e9edef!important;
        border-top-right-radius:2px!important;
      }

      .ksk-msg-history-item.from-them {
        align-self:flex-start!important;
        background:#202c33!important;
        color:#e9edef!important;
        border-top-left-radius:2px!important;
      }

      .ksk-msg-history-item.deleted {
        opacity:.75!important;
      }

      .ksk-msg-history-time {
        display:block!important;
        margin-top:5px!important;
        color:#b5c4c9!important;
        font-size:10px!important;
        text-align:right!important;
      }

      .ksk-msg-media {
        display:block!important;
        max-width:100%!important;
        max-height:280px!important;
        height:auto!important;
        margin-top:6px!important;
        object-fit:contain!important;
        border-radius:8px!important;
      }

      /* Message actions appear only after long press */
      .ksk-msg-bubble-actions {
        display:none!important;
        flex-wrap:wrap!important;
        gap:5px!important;
        margin-top:9px!important;
        padding-top:7px!important;
        border-top:1px solid #ffffff30!important;
      }

      .ksk-msg-history-item.ksk-wa-actions-open
      .ksk-msg-bubble-actions {
        display:flex!important;
      }

      .ksk-msg-bubble-actions button {
        flex:1 1 auto!important;
        min-height:34px!important;
        padding:6px 9px!important;
        border:1px solid #ffffff30!important;
        border-radius:8px!important;
        background:#ffffff12!important;
        color:#e9edef!important;
        font-size:12px!important;
      }

      /* Reply preview */
      .ksk-msg-detail > .ksk-msg-reply-preview {
        flex:0 0 auto!important;
        margin:5px 9px 0!important;
        padding:8px 10px!important;
        border-left:3px solid #00a884!important;
        border-radius:7px!important;
        background:#202c33!important;
        color:#e9edef!important;
      }

      /* WhatsApp-style composer */
      .ksk-msg-detail > .ksk-msg-send-form {
        position:relative!important;
        z-index:5!important;
        display:flex!important;
        flex:0 0 auto!important;
        align-items:flex-end!important;
        gap:7px!important;
        width:100%!important;
        min-width:0!important;
        min-height:64px!important;
        margin:0!important;
        padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px))!important;
        background:#0b141a!important;
        border:0!important;
        border-top:1px solid #26343c!important;
      }

      .ksk-wa-composer {
        display:flex!important;
        flex:1 1 auto!important;
        align-items:flex-end!important;
        gap:3px!important;
        min-width:0!important;
        min-height:48px!important;
        padding:4px 5px!important;
        border:1px solid #34434b!important;
        border-radius:25px!important;
        background:#202c33!important;
      }

      .ksk-wa-tool {
        display:inline-flex!important;
        flex:0 0 34px!important;
        align-items:center!important;
        justify-content:center!important;
        width:34px!important;
        min-width:34px!important;
        height:38px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:50%!important;
        background:transparent!important;
        color:#aebac1!important;
        font-size:22px!important;
        cursor:pointer!important;
      }

      .ksk-msg-detail .ksk-msg-compose {
        display:block!important;
        flex:1 1 auto!important;
        width:1%!important;
        min-width:0!important;
        min-height:38px!important;
        height:38px!important;
        max-height:110px!important;
        margin:0!important;
        padding:9px 3px!important;
        resize:none!important;
        overflow-y:auto!important;
        border:0!important;
        outline:0!important;
        box-shadow:none!important;
        border-radius:0!important;
        background:transparent!important;
        color:#e9edef!important;
        font-size:14px!important;
        line-height:20px!important;
      }

      .ksk-msg-detail .ksk-msg-compose:focus {
        border:0!important;
        outline:0!important;
        box-shadow:none!important;
      }

      .ksk-msg-compose-actions {
        display:flex!important;
        flex:0 0 auto!important;
        align-items:center!important;
        gap:2px!important;
        width:auto!important;
        min-width:0!important;
        margin:0!important;
        padding:0!important;
      }

      .ksk-wa-send {
        display:inline-flex!important;
        flex:0 0 45px!important;
        align-items:center!important;
        justify-content:center!important;
        width:45px!important;
        min-width:45px!important;
        height:45px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:50%!important;
        background:#00a884!important;
        color:#062d26!important;
        font-size:22px!important;
        font-weight:800!important;
      }

      .ksk-wa-send[hidden],
      .ksk-wa-emoji-panel[hidden] {
        display:none!important;
      }

      .ksk-wa-file-input {
        display:none!important;
      }

      .ksk-wa-emoji-panel {
        position:absolute!important;
        left:8px!important;
        bottom:calc(100% + 7px)!important;
        z-index:30!important;
        display:grid!important;
        grid-template-columns:repeat(8,1fr)!important;
        gap:3px!important;
        width:min(300px,calc(100vw - 30px))!important;
        max-height:220px!important;
        overflow-y:auto!important;
        padding:8px!important;
        border:1px solid #34434b!important;
        border-radius:13px!important;
        background:#202c33!important;
        box-shadow:0 8px 25px #0008!important;
      }

      .ksk-wa-emoji-panel button {
        min-height:34px!important;
        border:0!important;
        border-radius:6px!important;
        background:transparent!important;
        color:white!important;
        font-size:21px!important;
      }

      @media(max-width:520px) {
        .ksk-msg-page:has(.ksk-msg-detail) > .ksk-msg-detail {
          height:calc(100dvh - 148px)!important;
          max-height:calc(100dvh - 148px)!important;
          border-radius:0!important;
        }

        .ksk-msg-detail > .ksk-msg-history {
          padding:9px!important;
        }

        .ksk-msg-history-item {
          max-width:84%!important;
        }

        .ksk-msg-detail > .ksk-msg-send-form {
          gap:5px!important;
          padding-left:6px!important;
          padding-right:6px!important;
        }

        .ksk-wa-composer {
          gap:1px!important;
          padding-left:3px!important;
          padding-right:3px!important;
        }

        .ksk-wa-tool {
          flex-basis:30px!important;
          width:30px!important;
          min-width:30px!important;
          font-size:20px!important;
        }

        .ksk-wa-send {
          flex-basis:43px!important;
          width:43px!important;
          min-width:43px!important;
          height:43px!important;
        }
      }
    `;

    document.head.appendChild(style);
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

    if (!area || !oldActions || !send) return;

    form.dataset.waReady = "yes";

    const shell = document.createElement("div");
    shell.className = "ksk-wa-composer";

    const emojiButton = document.createElement("button");
    emojiButton.type = "button";
    emojiButton.className = "ksk-wa-tool";
    emojiButton.dataset.waEmojiToggle = "yes";
    emojiButton.setAttribute("aria-label", "Emoji");
    emojiButton.title = "Emoji";
    emojiButton.textContent = "☺";

    const emojiPanel = document.createElement("div");
    emojiPanel.className = "ksk-wa-emoji-panel";
    emojiPanel.hidden = true;

    EMOJIS.forEach(emoji => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.waEmoji = emoji;
      button.textContent = emoji;
      emojiPanel.appendChild(button);
    });

    const galleryInput = document.createElement("input");
    galleryInput.type = "file";
    galleryInput.accept = "image/*,video/*,.pdf,.doc,.docx";
    galleryInput.dataset.mediaFile = "";
    galleryInput.className = "ksk-wa-file-input";
    galleryInput.setAttribute("aria-label", "Choose from gallery");

    const cameraInput = document.createElement("input");
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.capture = "environment";
    cameraInput.dataset.mediaFile = "";
    cameraInput.className = "ksk-wa-file-input";
    cameraInput.setAttribute("aria-label", "Take a photo");

    const galleryButton = document.createElement("button");
    galleryButton.type = "button";
    galleryButton.className = "ksk-wa-tool";
    galleryButton.dataset.waGallery = "yes";
    galleryButton.title = "Gallery";
    galleryButton.setAttribute("aria-label", "Gallery");
    galleryButton.textContent = "▧";

    const cameraButton = document.createElement("button");
    cameraButton.type = "button";
    cameraButton.className = "ksk-wa-tool";
    cameraButton.dataset.waCamera = "yes";
    cameraButton.title = "Camera";
    cameraButton.setAttribute("aria-label", "Camera");
    cameraButton.textContent = "◎";

    area.placeholder = "Message";
    area.setAttribute("aria-label", "Write a message");
    area.rows = 1;

    send.className = "ksk-wa-send";
    send.textContent = "➤";
    send.setAttribute("aria-label", "Send message");

    shell.append(
      emojiButton,
      area,
      galleryButton,
      cameraButton
    );

    oldActions.replaceChildren(
      galleryInput,
      cameraInput,
      send
    );

    form.replaceChildren(
      emojiPanel,
      shell,
      oldActions
    );

    resizeComposer(form);
  }

  function repairChat() {
    addStyles();

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

  document.addEventListener("click", event => {
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

    const emojiToggle = event.target.closest("[data-wa-emoji-toggle]");
    if (emojiToggle) {
      const panel = emojiToggle.closest("[data-send-form]")
        ?.querySelector(".ksk-wa-emoji-panel");

      if (panel) panel.hidden = !panel.hidden;
      return;
    }

    const emojiButton = event.target.closest("[data-wa-emoji]");
    if (emojiButton) {
      const form = emojiButton.closest("[data-send-form]");
      const area = form?.querySelector(".ksk-msg-compose");

      if (!area) return;

      const start = area.selectionStart ?? area.value.length;
      const end = area.selectionEnd ?? start;
      const emoji = emojiButton.dataset.waEmoji || "";

      area.value =
        area.value.slice(0, start) +
        emoji +
        area.value.slice(end);

      area.focus();
      area.setSelectionRange(
        start + emoji.length,
        start + emoji.length
      );

      resizeComposer(form);
      area.dispatchEvent(new Event("input", { bubbles: true }));

      const panel = form.querySelector(".ksk-wa-emoji-panel");
      if (panel) panel.hidden = true;
      return;
    }

    if (event.target.closest(".ksk-msg-bubble-actions")) {
      const bubble = event.target.closest(".ksk-msg-history-item");
      if (bubble) {
        setTimeout(() => bubble.classList.remove("ksk-wa-actions-open"), 150);
      }
      return;
    }

    if (!event.target.closest(".ksk-msg-history-item")) {
      document.querySelectorAll(
        ".ksk-msg-history-item.ksk-wa-actions-open"
      ).forEach(item => item.classList.remove("ksk-wa-actions-open"));
    }
  });

  document.addEventListener("input", event => {
    if (!event.target.matches(".ksk-msg-compose")) return;

    const form = event.target.closest("[data-send-form]");
    if (form) resizeComposer(form);
  });

  document.addEventListener("change", event => {
    if (!event.target.matches(".ksk-wa-file-input")) return;

    const form = event.target.closest("[data-send-form]");
    const send = form?.querySelector(".ksk-wa-send");

    if (send && event.target.files?.length) {
      send.hidden = false;
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".ksk-wa-emoji-panel").forEach(panel => {
        panel.hidden = true;
      });

      document.querySelectorAll(
        ".ksk-msg-history-item.ksk-wa-actions-open"
      ).forEach(item => item.classList.remove("ksk-wa-actions-open"));
    }
  });

  function start() {
    repairChat();

    if (observer || !document.body) return;

    observer = new MutationObserver(() => repairChat());
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
