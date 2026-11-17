/* MERO SANSAR — WHATSAPP STYLE COMPOSER FIX */
(function () {
  "use strict";

  if (window.__MS_COMPOSER_FIX__) return;
  window.__MS_COMPOSER_FIX__ = true;

  const STYLE = "ms-composer-fix-style";

  function addStyle() {
    if (document.getElementById(STYLE)) return;

    const css = document.createElement("style");
    css.id = STYLE;
    css.textContent = `
      .ksk-msg-send-form {
        display:flex!important;
        align-items:flex-end!important;
        gap:7px!important;
        padding:8px!important;
        margin:0!important;
        background:#0b141a!important;
      }

      .ms-composer {
        display:flex!important;
        flex:1 1 auto!important;
        align-items:flex-end!important;
        gap:4px!important;
        min-width:0!important;
        padding:5px 7px!important;
        border:1px solid #34434b!important;
        border-radius:28px!important;
        background:#202c33!important;
      }

      .ms-composer button {
        display:flex!important;
        flex:0 0 36px!important;
        align-items:center!important;
        justify-content:center!important;
        width:36px!important;
        min-width:36px!important;
        height:38px!important;
        padding:0!important;
        border:0!important;
        border-radius:50%!important;
        background:transparent!important;
        color:#aebac1!important;
        font-size:23px!important;
      }

      .ms-composer textarea {
        flex:1 1 auto!important;
        width:1%!important;
        min-width:0!important;
        height:38px!important;
        min-height:38px!important;
        max-height:110px!important;
        margin:0!important;
        padding:9px 3px!important;
        resize:none!important;
        border:0!important;
        outline:0!important;
        box-shadow:none!important;
        background:transparent!important;
        color:#e9edef!important;
        font-size:15px!important;
        line-height:20px!important;
      }

      .ms-composer input[type=file] {
        display:none!important;
      }

      .ksk-msg-compose-actions {
        display:flex!important;
        flex:0 0 auto!important;
        align-items:center!important;
        margin:0!important;
        padding:0!important;
      }

      .ksk-msg-compose-actions .ms-send {
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:45px!important;
        height:45px!important;
        min-width:45px!important;
        padding:0!important;
        border:0!important;
        border-radius:50%!important;
        background:#00a884!important;
        color:#062d26!important;
        font-size:23px!important;
      }

      .ksk-msg-compose-actions .ms-send[hidden] {
        display:none!important;
      }

      .ms-emoji-panel {
        position:absolute!important;
        bottom:70px!important;
        left:10px!important;
        z-index:100!important;
        display:grid!important;
        grid-template-columns:repeat(8,1fr)!important;
        gap:4px!important;
        width:min(290px,85vw)!important;
        max-height:210px!important;
        overflow:auto!important;
        padding:9px!important;
        border:1px solid #34434b!important;
        border-radius:14px!important;
        background:#202c33!important;
      }

      .ms-emoji-panel[hidden] {
        display:none!important;
      }

      .ms-emoji-panel button {
        min-height:34px!important;
        border:0!important;
        background:transparent!important;
        color:white!important;
        font-size:21px!important;
      }
    `;
    document.head.appendChild(css);
  }

  const emojis = [
    "😀","😃","😄","😁","😆","😂","🤣","😊",
    "😉","😍","🥰","😘","😎","😭","😢","😅",
    "🤔","😮","😴","🙏","👍","👏","❤️","💕",
    "🔥","🎉","🌹","💐","👌","🤗","😋","💯"
  ];

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

    const emoji = document.createElement("button");
    emoji.type = "button";
    emoji.textContent = "☺";
    emoji.setAttribute("aria-label", "Emoji");

    const gallery = document.createElement("button");
    gallery.type = "button";
    gallery.textContent = "▧";
    gallery.setAttribute("aria-label", "Gallery");

    const camera = document.createElement("button");
    camera.type = "button";
    camera.textContent = "◎";
    camera.setAttribute("aria-label", "Camera");

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

    emojis.forEach(value => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = value;
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

        area.dispatchEvent(new Event("input", { bubbles: true }));
        panel.hidden = true;
      });
      panel.appendChild(button);
    });

    emoji.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });

    gallery.addEventListener("click", () => galleryInput.click());
    camera.addEventListener("click", () => cameraInput.click());

    area.placeholder = "Message";
    area.rows = 1;

    send.className = "ms-send";
    send.textContent = "➤";
    send.hidden = true;

    composer.append(
      emoji,
      area,
      gallery,
      camera,
      galleryInput,
      cameraInput
    );

    actions.replaceChildren(send);
    form.replaceChildren(panel, composer, actions);

    function update() {
      area.style.height = "38px";
      area.style.height = Math.min(area.scrollHeight, 110) + "px";

      const hasFile = !!form._msPendingFile;
      send.hidden = !(area.value.trim() || hasFile);
    }

    area.addEventListener("input", update);

    form._msUpdateComposer = update;
    update();
  }

  /*
   * रोकिएको media change लाई Send थिचेपछि मात्र
   * पुरानो messages.js को upload handler सम्म पठाउँछ।
   */
  document.addEventListener("change", event => {
    const input = event.target;

    if (!input.matches(".ms-composer [data-media-file]")) return;

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

  document.addEventListener("click", event => {
    const send = event.target.closest(".ms-send");
    if (!send) return;

    const form = send.closest("[data-send-form]");
    if (!form || !form._msPendingFile) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const input = form._msPendingFile;
    form._msPendingFile = null;

    input.dataset.msApproved = "yes";
    input.dispatchEvent(new Event("change", { bubbles: true }));

    form._msUpdateComposer?.();
  }, true);

  function repair() {
    addStyle();

    document.querySelectorAll(
      ".ksk-msg-detail > form[data-send-form]"
    ).forEach(setup);
  }

  function start() {
    repair();

    new MutationObserver(repair).observe(document.body, {
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
