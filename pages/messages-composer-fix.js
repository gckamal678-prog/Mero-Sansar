
/* =========================================================
   MERO SANSAR — WHATSAPP STYLE CHAT COMPOSER
   Fix: Correct DOM selector, visible input, message scrolling,
   emoji, gallery, camera and conditional send button.
========================================================= */
(function () {
  "use strict";

  if (window.__MS_COMPOSER_FIX_V2__) return;
  window.__MS_COMPOSER_FIX_V2__ = true;

  const STYLE_ID = "ms-composer-fix-style-v2";

  const EMOJIS = [
    "😀","😃","😄","😁","😆","😂","🤣","😊",
    "😉","😍","🥰","😘","😎","😭","😢","😅",
    "🤔","😮","😴","🙏","👍","👏","❤️","💕",
    "🔥","🎉","🌹","💐","👌","🤗","😋","💯",
    "🙂","🙃","😇","🥳","🤩","😜","😔","😡",
    "💖","💗","💙","💚","💛","🫶","🤝","👋"
  ];

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .ksk-msg-page {
        min-width: 0 !important;
        width: 100% !important;
      }

      .ksk-msg-detail {
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
        min-height: 0 !important;
        box-sizing: border-box !important;
      }

      .ksk-msg-detail .ksk-msg-chat-header {
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      .ksk-msg-detail .ksk-msg-history {
        display: flex !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;
        gap: 10px !important;
        min-width: 0 !important;
        min-height: 180px !important;
        max-height: min(55vh, 620px) !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        scroll-behavior: smooth !important;
        padding: 8px 3px !important;
        box-sizing: border-box !important;
      }

      .ksk-msg-detail .ksk-msg-history-item {
        flex: 0 0 auto !important;
        width: fit-content !important;
        max-width: 86% !important;
        min-width: 70px !important;
        overflow-wrap: anywhere !important;
        box-sizing: border-box !important;
      }

      .ksk-msg-detail .ksk-msg-send-form {
        display: flex !important;
        flex: 0 0 auto !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 7px !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 8px 0 0 !important;
        padding: 7px !important;
        border: 1px solid #34434b !important;
        border-radius: 28px !important;
        background: #202c33 !important;
        box-sizing: border-box !important;
      }

      .ms-composer {
        display: flex !important;
        flex: 1 1 auto !important;
        flex-direction: row !important;
        align-items: flex-end !important;
        gap: 3px !important;
        min-width: 0 !important;
        padding: 0 4px !important;
        border: 0 !important;
        background: transparent !important;
      }

      .ms-composer > button {
        display: flex !important;
        flex: 0 0 36px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 36px !important;
        min-width: 36px !important;
        height: 40px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: #aebac1 !important;
        font-size: 23px !important;
        cursor: pointer !important;
      }

      .ms-composer textarea.ksk-msg-compose {
        display: block !important;
        flex: 1 1 auto !important;
        width: 1% !important;
        min-width: 0 !important;
        min-height: 40px !important;
        max-height: 110px !important;
        height: 40px !important;
        margin: 0 !important;
        padding: 10px 4px !important;
        resize: none !important;
        border: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #e9edef !important;
        font-size: 15px !important;
        line-height: 20px !important;
        box-sizing: border-box !important;
      }

      .ms-composer textarea.ksk-msg-compose::placeholder {
        color: #aebac1 !important;
        opacity: 1 !important;
      }

      .ms-composer input[type="file"] {
        display: none !important;
      }

      .ksk-msg-detail .ksk-msg-compose-actions {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .ksk-msg-detail .ksk-msg-compose-actions .ms-send {
        display: flex !important;
        flex: 0 0 45px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 45px !important;
        min-width: 45px !important;
        height: 45px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: #00a884 !important;
        color: #ffffff !important;
        font-size: 23px !important;
        cursor: pointer !important;
      }

      .ksk-msg-detail .ksk-msg-compose-actions .ms-send[hidden] {
        display: none !important;
      }

      .ms-emoji-panel {
        display: grid !important;
        grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
        gap: 4px !important;
        width: min(290px, 85vw) !important;
        max-height: 210px !important;
        overflow-y: auto !important;
        margin: 0 0 8px !important;
        padding: 9px !important;
        border: 1px solid #34434b !important;
        border-radius: 14px !important;
        background: #202c33 !important;
        box-sizing: border-box !important;
      }

      .ms-emoji-panel[hidden] {
        display: none !important;
      }

      .ms-emoji-panel button {
        min-width: 0 !important;
        min-height: 34px !important;
        padding: 2px !important;
        border: 0 !important;
        background: transparent !important;
        color: white !important;
        font-size: 21px !important;
      }

      @media (max-width: 600px) {
        .ksk-msg-detail {
          padding: 10px !important;
        }

        .ksk-msg-detail .ksk-msg-history {
          max-height: min(52vh, 520px) !important;
          min-height: 180px !important;
        }

        .ksk-msg-detail .ksk-msg-send-form {
          position: relative !important;
          bottom: auto !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function makeButton(text, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    return button;
  }

  function setup(form) {
    if (form.dataset.msComposerFix === "yes") return;

    const area = form.querySelector(".ksk-msg-compose");
    const actions = form.querySelector(".ksk-msg-compose-actions");
    const send = actions?.querySelector('[type="submit"]');
    const oldFile = actions?.querySelector("[data-media-file]");

    if (!area || !actions || !send || !oldFile) return;

    form.dataset.msComposerFix = "yes";

    const composer = document.createElement("div");
    composer.className = "ms-composer";

    const emojiButton = makeButton("☺", "Emoji");
    const galleryButton = makeButton("▧", "Gallery");
    const cameraButton = makeButton("◎", "Camera");

    const galleryInput = document.createElement("input");
    galleryInput.type = "file";
    galleryInput.accept = "image/*,video/*,.pdf,.doc,.docx";
    galleryInput.dataset.mediaFile = "";

    const cameraInput = document.createElement("input");
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.capture = "environment";
    cameraInput.dataset.mediaFile = "";

    const panel = document.createElement("div");
    panel.className = "ms-emoji-panel";
    panel.hidden = true;

    EMOJIS.forEach(value => {
      const button = makeButton(value, value);

      button.addEventListener("click", () => {
        const start = area.selectionStart ?? area.value.length;
        const end = area.selectionEnd ?? start;

        area.value =
          area.value.slice(0, start) +
          value +
          area.value.slice(end);

        area.focus();
        area.setSelectionRange(
          start + value.length,
          start + value.length
        );

        area.dispatchEvent(
          new Event("input", { bubbles: true })
        );

        panel.hidden = true;
      });

      panel.appendChild(button);
    });

    emojiButton.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });

    galleryButton.addEventListener("click", () => {
      galleryInput.click();
    });

    cameraButton.addEventListener("click", () => {
      cameraInput.click();
    });

    area.placeholder = "Message";
    area.rows = 1;

    send.className = "ms-send";
    send.textContent = "➤";
    send.setAttribute("aria-label", "Send message");

    composer.append(
      emojiButton,
      area,
      galleryButton,
      cameraButton,
      galleryInput,
      cameraInput
    );

    actions.replaceChildren(send);
    form.replaceChildren(panel, composer, actions);

    function updateComposer() {
      area.style.height = "40px";
      area.style.height =
        Math.min(area.scrollHeight, 110) + "px";

      const hasText = !!area.value.trim();
      const hasFile = !!form._msPendingFile;

      send.hidden = !(hasText || hasFile);
    }

    area.addEventListener("input", updateComposer);

    form._msUpdateComposer = updateComposer;
    updateComposer();
  }

  /*
    File selection is held until Send is pressed.
    Existing messages.js upload handler remains in use.
  */
  document.addEventListener("change", event => {
    const input = event.target;

    if (!input.matches(
      ".ms-composer input[data-media-file]"
    )) return;

    if (input.dataset.msApproved === "yes") {
      delete input.dataset.msApproved;
      return;
    }

    event.stopImmediatePropagation();

    const form = input.closest("[data-send-form]");
    if (!form) return;

    form._msPendingFile = input;
    form._msUpdateComposer?.();

  }, true);

  /*
    On Send with a selected file, pass it to the
    original upload handler.
  */
  document.addEventListener("click", event => {
    const button = event.target.closest(".ms-send");
    if (!button) return;

    const form = button.closest("[data-send-form]");
    if (!form || !form._msPendingFile) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const input = form._msPendingFile;
    form._msPendingFile = null;

    input.dataset.msApproved = "yes";
    input.dispatchEvent(
      new Event("change", { bubbles: true })
    );

    form._msUpdateComposer?.();
  }, true);

  function repair() {
    addStyles();

    /*
      IMPORTANT:
      Form is nested inside .ksk-msg-detail.
      It is NOT a direct child.
    */
    document.querySelectorAll(
      ".ksk-msg-detail form[data-send-form]"
    ).forEach(setup);
  }

  function start() {
    addStyles();
    repair();

    const observer = new MutationObserver(() => {
      repair();
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
})();
