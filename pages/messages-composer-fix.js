
/* =========================================================
   MERO SANSAR — MESSENGER UI
   Clean composer, responsive keyboard layout,
   automatic latest-message scroll and conversation menu.
   ========================================================= */

(function (global) {
  "use strict";

  if (global.__MERO_SANSAR_CHAT_UI_V2__) return;
  global.__MERO_SANSAR_CHAT_UI_V2__ = true;

  const STYLE_ID = "mero-sansar-wa-chat-style";
  let observer = null;
  let holdTimer = null;
  let heldBubble = null;
  let activeHistory = null;
  let lastChatId = "";
  let userScrolledUp = false;
  let forceBottom = false;
  let scrollFrame = 0;

  const SVG = {
    gallery: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    camera: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h-4L8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>'
  };

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
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

      .ksk-msg-detail,
      .ksk-msg-detail * {
        box-sizing:border-box!important;
      }

      .ksk-msg-page:has(.ksk-msg-detail) > .ksk-msg-detail {
        display:flex!important;
        flex-direction:column!important;
        width:100%!important;
        height:calc(var(--ms-visual-height, 100dvh) - 155px)!important;
        min-height:260px!important;
        max-height:calc(var(--ms-visual-height, 100dvh) - 155px)!important;
        min-width:0!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        border:1px solid #26343c!important;
        border-radius:14px!important;
        background:#0b141a!important;
        color:#e9edef!important;
      }

      .ksk-msg-detail > .ksk-msg-chat-header {
        position:relative!important;
        z-index:5!important;
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

      .ksk-wa-chat-options,
      .ksk-wa-row-options {
        position:relative!important;
        flex:0 0 38px!important;
        margin-left:auto!important;
      }

      .ksk-wa-chat-options > summary,
      .ksk-wa-row-options > summary {
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:38px!important;
        height:38px!important;
        list-style:none!important;
        color:#cbd5e1!important;
        cursor:pointer!important;
      }

      .ksk-wa-chat-options > summary::-webkit-details-marker,
      .ksk-wa-row-options > summary::-webkit-details-marker {
        display:none!important;
      }

      .ksk-wa-chat-options-panel,
      .ksk-wa-row-options-panel {
        position:absolute!important;
        top:42px!important;
        right:0!important;
        z-index:30!important;
        min-width:145px!important;
        padding:6px!important;
        border:1px solid #34434b!important;
        border-radius:11px!important;
        background:#202c33!important;
        box-shadow:0 8px 24px #0008!important;
      }

      .ksk-wa-chat-options-panel button,
      .ksk-wa-row-options-panel button {
        display:block!important;
        width:100%!important;
        min-height:39px!important;
        padding:8px 11px!important;
        border:0!important;
        border-radius:7px!important;
        background:transparent!important;
        color:#e9edef!important;
        text-align:left!important;
        font:inherit!important;
        font-size:13px!important;
      }

      .ksk-wa-chat-options-panel button:active,
      .ksk-wa-row-options-panel button:active {
        background:#34434b!important;
      }

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
        min-height:38px!important;
        margin:0!important;
        padding:6px!important;
        border:0!important;
        border-bottom:1px solid #26343c!important;
        border-radius:0!important;
        background:#111b21!important;
        color:#aebac1!important;
      }

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
        max-width:min(84%,520px)!important;
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

      .ksk-msg-detail > .ksk-msg-reply-preview {
        flex:0 0 auto!important;
        margin:5px 9px 0!important;
        padding:8px 10px!important;
        border-left:3px solid #00a884!important;
        border-radius:7px!important;
        background:#202c33!important;
        color:#e9edef!important;
      }

      .ksk-msg-detail > .ksk-msg-send-form {
        position:relative!important;
        z-index:5!important;
        display:flex!important;
        flex:0 0 auto!important;
        align-items:flex-end!important;
        gap:7px!important;
        width:100%!important;
        min-width:0!important;
        min-height:62px!important;
        margin:0!important;
        padding:7px 8px calc(7px + env(safe-area-inset-bottom,0px))!important;
        background:#0b141a!important;
        border:0!important;
        border-top:1px solid #26343c!important;
      }

      .ksk-wa-composer {
        display:flex!important;
        flex:1 1 auto!important;
        align-items:center!important;
        gap:5px!important;
        min-width:0!important;
        min-height:48px!important;
        padding:4px 8px!important;
        border:1px solid #34434b!important;
        border-radius:25px!important;
        background:#202c33!important;
      }

      .ksk-wa-tool {
        display:inline-flex!important;
        flex:0 0 38px!important;
        align-items:center!important;
        justify-content:center!important;
        width:38px!important;
        min-width:38px!important;
        height:40px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:50%!important;
        background:transparent!important;
        color:#aebac1!important;
        cursor:pointer!important;
      }

      .ksk-wa-tool:active {
        background:#34434b!important;
        color:#e9edef!important;
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
      }

      .ksk-wa-send svg {
        display:block;
      }

      .ksk-wa-send[hidden] {
        display:none!important;
      }

      .ksk-wa-file-input {
        display:none!important;
      }

      @media(max-width:520px) {
        .ksk-msg-page:has(.ksk-msg-detail) > .ksk-msg-detail {
          height:calc(var(--ms-visual-height, 100dvh) - 148px)!important;
          max-height:calc(var(--ms-visual-height, 100dvh) - 148px)!important;
          min-height:220px!important;
          border-radius:0!important;
        }

        .ksk-msg-detail > .ksk-msg-history {
          padding:9px!important;
        }

        .ksk-msg-detail > .ksk-msg-send-form {
          gap:5px!important;
          padding-left:6px!important;
          padding-right:6px!important;
        }

        .ksk-wa-composer {
          gap:2px!important;
          padding-left:4px!important;
          padding-right:4px!important;
        }

        .ksk-wa-tool {
          flex-basis:34px!important;
          width:34px!important;
          min-width:34px!important;
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

  function updateViewportHeight() {
    const height = global.visualViewport?.height || global.innerHeight;
    document.documentElement.style.setProperty(
      "--ms-visual-height",
      `${Math.round(height)}px`
    );
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

    const galleryInput = document.createElement("input");
    galleryInput.type = "file";
    galleryInput.accept = "image/*,video/*,.pdf,.doc,.docx";
    galleryInput.dataset.mediaFile = "";
    galleryInput.className = "ksk-wa-file-input";
    galleryInput.setAttribute("aria-label", "Choose file");

    const cameraInput = document.createElement("input");
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.capture = "environment";
    cameraInput.dataset.mediaFile = "";
    cameraInput.className = "ksk-wa-file-input";
    cameraInput.setAttribute("aria-label", "Take photo");

    const galleryButton = document.createElement("button");
    galleryButton.type = "button";
    galleryButton.className = "ksk-wa-tool";
    galleryButton.dataset.waGallery = "yes";
    galleryButton.title = "Gallery";
    galleryButton.setAttribute("aria-label", "Gallery");
    galleryButton.innerHTML = SVG.gallery;

    const cameraButton = document.createElement("button");
    cameraButton.type = "button";
    cameraButton.className = "ksk-wa-tool";
    cameraButton.dataset.waCamera = "yes";
    cameraButton.title = "Camera";
    cameraButton.setAttribute("aria-label", "Camera");
    cameraButton.innerHTML = SVG.camera;

    area.placeholder = "Message";
    area.setAttribute("aria-label", "Write a message");
    area.rows = 1;

    send.className = "ksk-wa-send";
    send.innerHTML = SVG.send;
    send.setAttribute("aria-label", "Send message");

    shell.append(galleryButton, area, cameraButton);

    oldActions.replaceChildren(galleryInput, cameraInput, send);
    form.replaceChildren(shell, oldActions);

    resizeComposer(form);
  }

  function buildMenu(container, className, label, buttons, moveButtons) {
    if (!container || container.querySelector(`.${className}`)) return;

    const menu = document.createElement("details");
    menu.className = className;

    const summary = document.createElement("summary");
    summary.setAttribute("aria-label", label);
    summary.title = label;
    summary.innerHTML = SVG.menu;

    const panel = document.createElement("div");
    panel.className = className + "-panel";

    moveButtons.forEach(button => {
      if (button) panel.appendChild(button);
    });

    menu.append(summary, panel);
    container.appendChild(menu);
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

        if (block) {
          block.textContent = "Block";
          buildMenu(
            header,
            "ksk-wa-chat-options",
            "Chat options",
            null,
            [block]
          );
        }
      }

      const form = detail.querySelector(
        ':scope > form[data-send-form]'
      );

      if (form) buildComposer(form);
    });

    document.querySelectorAll(".ksk-msg-row").forEach(row => {
      const actions = row.querySelector(":scope > .ksk-msg-actions");
      if (!actions) return;

      const buttons = Array.from(
        actions.querySelectorAll(":scope > button[data-action]")
      );

      if (!buttons.length) return;

      const menu = document.createElement("details");
      menu.className = "ksk-wa-row-options";

      const summary = document.createElement("summary");
      summary.setAttribute("aria-label", "Conversation options");
      summary.title = "Conversation options";
      summary.innerHTML = SVG.menu;

      const panel = document.createElement("div");
      panel.className = "ksk-wa-row-options-panel";

      buttons.forEach(button => panel.appendChild(button));
      menu.append(summary, panel);

      actions.replaceWith(menu);
    });
  }

  function scrollToLatest(history) {
    if (!history) return;

    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      history.scrollTop = history.scrollHeight;
    });
  }

  function inspectChat() {
    const history = document.querySelector(
      ".ksk-msg-detail > .ksk-msg-history"
    );

    const chatId = String(
      global.KSKMessagesPage?.getActiveChatId?.() || ""
    );

    if (!history || !chatId) {
      activeHistory = null;
      lastChatId = "";
      userScrolledUp = false;
      return;
    }

    if (history !== activeHistory) {
      const changedChat = chatId !== lastChatId;

      activeHistory = history;
      lastChatId = chatId;

      if (changedChat || forceBottom || !userScrolledUp) {
        scrollToLatest(history);
      }

      forceBottom = false;

      history.addEventListener("scroll", () => {
        const distance =
          history.scrollHeight -
          history.clientHeight -
          history.scrollTop;

        userScrolledUp = distance > 130;
      }, { passive: true });
    }
  }

  function stopHold() {
    if (holdTimer) {
      global.clearTimeout(holdTimer);
      holdTimer = null;
    }

    heldBubble = null;
  }

  document.addEventListener("pointerdown", event => {
    const bubble = event.target.closest(".ksk-msg-history-item");

    if (!bubble || event.target.closest("button,a,input,video")) return;

    stopHold();
    heldBubble = bubble;

    holdTimer = global.setTimeout(() => {
      if (heldBubble === bubble) {
        document.querySelectorAll(
          ".ksk-msg-history-item.ksk-wa-actions-open"
        ).forEach(item => item.classList.remove("ksk-wa-actions-open"));

        bubble.classList.add("ksk-wa-actions-open");
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

    document.querySelectorAll(
      ".ksk-msg-history-item.ksk-wa-actions-open"
    ).forEach(item => item.classList.remove("ksk-wa-actions-open"));

    bubble.classList.add("ksk-wa-actions-open");
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

    const openChat = event.target.closest('[data-action="open-chat"]');
    if (openChat) {
      forceBottom = true;
      userScrolledUp = false;
    }

    if (event.target.closest('[data-action="load-older"]')) {
      userScrolledUp = true;
    }

    if (event.target.closest(".ksk-msg-bubble-actions")) {
      const bubble = event.target.closest(".ksk-msg-history-item");
      if (bubble) {
        global.setTimeout(
          () => bubble.classList.remove("ksk-wa-actions-open"),
          150
        );
      }
      return;
    }

    if (!event.target.closest(".ksk-msg-history-item")) {
      document.querySelectorAll(
        ".ksk-msg-history-item.ksk-wa-actions-open"
      ).forEach(item => item.classList.remove("ksk-wa-actions-open"));
    }

    if (!event.target.closest("details")) {
      document.querySelectorAll(
        ".ksk-wa-chat-options[open],.ksk-wa-row-options[open]"
      ).forEach(menu => menu.removeAttribute("open"));
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
    if (event.key !== "Escape") return;

    document.querySelectorAll(
      ".ksk-wa-chat-options[open],.ksk-wa-row-options[open]"
    ).forEach(menu => menu.removeAttribute("open"));

    document.querySelectorAll(
      ".ksk-msg-history-item.ksk-wa-actions-open"
    ).forEach(item => item.classList.remove("ksk-wa-actions-open"));
  });

  function start() {
    addStyles();
    updateViewportHeight();
    repairChat();
    inspectChat();

    if (observer || !document.body) return;

    observer = new MutationObserver(() => {
      repairChat();
      inspectChat();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    global.addEventListener("resize", updateViewportHeight);

    global.visualViewport?.addEventListener(
      "resize",
      updateViewportHeight
    );

    global.visualViewport?.addEventListener(
      "scroll",
      updateViewportHeight
    );

    global.addEventListener("pageshow", updateViewportHeight);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

})(window);
