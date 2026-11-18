/* =========================================================
MERO SANSAR — WHATSAPP STYLE CHAT COMPOSER (FIXED V3)
========================================================= */
(function () {
"use strict";

if (window.MS_COMPOSER_FIX_V3) return;
window.MS_COMPOSER_FIX_V3 = true;

const STYLE_ID = "ms-composer-fix-style-v3";

function addStyles() {
if (document.getElementById(STYLE_ID)) return;

const style = document.createElement("style");
style.id = STYLE_ID;
style.textContent = `
  .ksk-msg-page { min-width: 0 !important; width: 100% !important; }
  .ksk-msg-detail { display: flex !important; flex-direction: column !important; min-width: 0 !important; min-height: 0 !important; box-sizing: border-box !important; height: 100% !important; }
  .ksk-msg-detail .ksk-msg-chat-header { flex: 0 0 auto !important; min-width: 0 !important; }
  
  /* Chat History & Scrolling Fixes */
  .ksk-msg-detail .ksk-msg-history {
    display: flex !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 10px !important;
    min-width: 0 !important;
    min-height: 150px !important;
    max-height: calc(100dvh - 180px) !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    -webkit-overflow-scrolling: touch !important;
    scroll-behavior: smooth !important;
    padding: 8px 12px !important;
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

  /* Send Form & Composer */
  .ksk-msg-detail .ksk-msg-send-form {
    display: flex !important;
    flex: 0 0 auto !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 8px !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 8px 0 0 !important;
    padding: 6px 10px !important;
    border: 1px solid #34434b !important;
    border-radius: 28px !important;
    background: #202c33 !important;
    box-sizing: border-box !important;
  }
  .ms-composer {
    display: flex !important;
    flex: 1 1 auto !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 6px !important;
    min-width: 0 !important;
    padding: 0 !important;
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
    height: 36px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 50% !important;
    background: transparent !important;
    color: #aebac1 !important;
    cursor: pointer !important;
  }
  .ms-composer > button svg {
    width: 22px !important;
    height: 22px !important;
    fill: currentColor !important;
  }
  .ms-composer textarea.ksk-msg-compose {
    display: block !important;
    flex: 1 1 auto !important;
    width: 1% !important;
    min-width: 0 !important;
    min-height: 38px !important;
    max-height: 110px !important;
    height: 38px !important;
    margin: 0 !important;
    padding: 8px 4px !important;
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
  .ms-composer input[type="file"] { display: none !important; }

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
    flex: 0 0 42px !important;
    align-items: center !important;
    justify-content: center !important;
    width: 42px !important;
    min-width: 42px !important;
    height: 42px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 50% !important;
    background: #00a884 !important;
    color: #ffffff !important;
    font-size: 20px !important;
    cursor: pointer !important;
  }
  .ksk-msg-detail .ksk-msg-compose-actions .ms-send[hidden] {
    display: none !important;
  }

  /* Three-Dot Menu Styles for Conversations/User List */
  .ms-chat-menu-wrapper {
    position: relative !important;
    display: inline-flex !important;
    align-items: center !important;
    margin-left: auto !important;
  }
  .ms-chat-menu-btn {
    background: transparent !important;
    border: none !important;
    color: #aebac1 !important;
    font-size: 20px !important;
    cursor: pointer !important;
    padding: 8px !important;
    border-radius: 50% !important;
  }
  .ms-chat-dropdown {
    position: absolute !important;
    right: 0 !important;
    top: 100% !important;
    background: #232d36 !important;
    border: 1px solid #34434b !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    display: none !important;
    flex-direction: column !important;
    z-index: 999 !important;
    min-width: 120px !important;
    padding: 4px 0 !important;
  }
  .ms-chat-dropdown.show {
    display: flex !important;
  }
  .ms-chat-dropdown button {
    background: transparent !important;
    border: none !important;
    color: #e9edef !important;
    padding: 8px 16px !important;
    text-align: left !important;
    font-size: 14px !important;
    cursor: pointer !important;
  }
  .ms-chat-dropdown button:hover {
    background: #182229 !important;
  }

  @media (max-width: 600px) {
    .ksk-msg-detail { padding: 4px !important; }
    .ksk-msg-detail .ksk-msg-history { max-height: calc(100dvh - 160px) !important; }
  }
`;
document.head.appendChild(style);
}

// आधुनिक SVG आइकनहरू (Gallery र Camera को लागि)
const GALLERY_SVG = `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/></svg>`;
const CAMERA_SVG = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`;

function makeIconButton(svgContent, label) {
const button = document.createElement("button");
button.type = "button";
button.innerHTML = svgContent;
button.setAttribute("aria-label", label);
return button;
}

function setup(form) {
if (form.dataset.msComposerFix === "yes") return;

const area = form.querySelector(".ksk-msg-compose");
const actions = form.querySelector(".ksk-msg-compose-actions");
const send = actions?.querySelector('[type="submit"]');
if (!area || !actions || !send) return;

form.dataset.msComposerFix = "yes";

const composer = document.createElement("div");
composer.className = "ms-composer";

const galleryButton = makeIconButton(GALLERY_SVG, "Gallery");
const cameraButton = makeIconButton(CAMERA_SVG, "Camera");

const galleryInput = document.createElement("input");
galleryInput.type = "file";
galleryInput.accept = "image/*,video/*,.pdf,.doc,.docx";
galleryInput.dataset.mediaFile = "";

const cameraInput = document.createElement("input");
cameraInput.type = "file";
cameraInput.accept = "image/*";
cameraInput.capture = "environment";
cameraInput.dataset.mediaFile = "";

galleryButton.addEventListener("click", () => galleryInput.click());
cameraButton.addEventListener("click", () => cameraInput.click());

area.placeholder = "Message";
area.rows = 1;

send.className = "ms-send";
send.textContent = "➤";
send.setAttribute("aria-label", "Send message");

// Emoji बटन हटाइएको छ, केवल gallery र camera राखिएको छ
composer.append(galleryButton, cameraButton, area, galleryInput, cameraInput);
actions.replaceChildren(send);
form.replaceChildren(composer, actions);

function updateComposer() {
  area.style.height = "38px";
  area.style.height = Math.min(area.scrollHeight, 110) + "px";
  const hasText = !!area.value.trim();
  const hasFile = !!form._msPendingFile;
  send.hidden = !(hasText || hasFile);
}

area.addEventListener("input", updateComposer);
form._msUpdateComposer = updateComposer;
updateComposer();
}

// नयाँ च्याट खुल्दा वा मेसेज लोड हुँदा अन्तिम मेसेजमा स्क्रोल गर्ने (Scroll to bottom)
function scrollToBottom() {
const history = document.querySelector(".ksk-msg-detail .ksk-msg-history");
if (history) {
  history.scrollTop = history.scrollHeight;
}
}

// युजर कार्डहरूमा Pin, Archive, Mute लाई तीन-डट (Three-dot) मेनुमा रूपान्तरण गर्ने
function setupChatMenus() {
// उदाहरणका लागि कन्भर्सेसन वा युजर लिस्ट आइटमहरू खोज्ने (तपाईंको DOM अनुसारको क्लास मिलाउन सकिन्छ)
const chatItems = document.querySelectorAll(".ksk-msg-chat-item, .conversation-item, [data-conversation-id]");
chatItems.forEach(item => {
  if (item.querySelector(".ms-chat-menu-wrapper")) return;

  // यदि पहिले देखि बाहिर बटनहरू छन् भने तिनलाई लुकाउने वा हटाउने
  const oldActionBtns = item.querySelectorAll("button:not(.ms-chat-menu-btn)");
  
  const wrapper = document.createElement("div");
  wrapper.className = "ms-chat-menu-wrapper";

  const menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.className = "ms-chat-menu-btn";
  menuBtn.textContent = "⋮";
  menuBtn.setAttribute("aria-label", "Options");

  const dropdown = document.createElement("div");
  dropdown.className = "ms-chat-dropdown";

  const pinBtn = document.createElement("button");
  pinBtn.textContent = "Pin";
  pinBtn.onclick = (e) => { e.stopPropagation(); /* Pin logic */ dropdown.classList.remove("show"); };

  const archiveBtn = document.createElement("button");
  archiveBtn.textContent = "Archive";
  archiveBtn.onclick = (e) => { e.stopPropagation(); /* Archive logic */ dropdown.classList.remove("show"); };

  const muteBtn = document.createElement("button");
  muteBtn.textContent = "Mute";
  muteBtn.onclick = (e) => { e.stopPropagation(); /* Mute logic */ dropdown.classList.remove("show"); };

  dropdown.append(pinBtn, archiveBtn, muteBtn);

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // अन्य खुलेका ड्रपडाउन बन्द गर्ने
    document.querySelectorAll(".ms-chat-dropdown").forEach(d => {
      if (d !== dropdown) d.classList.remove("show");
    });
    dropdown.classList.toggle("show");
  });

  wrapper.append(menuBtn, dropdown);
  
  // युजरको दायाँ साइडमा जोड्ने
  const targetContainer = item.querySelector(".flex, .user-info, .chat-info") || item;
  targetContainer.appendChild(wrapper);
});
}

// बाहिर क्लिक गर्दा ड्रपडाउन बन्द हुने
document.addEventListener("click", () => {
document.querySelectorAll(".ms-chat-dropdown").forEach(d => d.classList.remove("show"));
});

document.addEventListener("change", event => {
const input = event.target;
if (!input.matches(".ms-composer input[data-media-file]")) return;
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
const button = event.target.closest(".ms-send");
if (!button) return;
const form = button.closest("[data-send-form]");
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
addStyles();
document.querySelectorAll(".ksk-msg-detail form[data-send-form]").forEach(setup);
scrollToBottom();
setupChatMenus();
}

function start() {
addStyles();
repair();

const observer = new MutationObserver(() => {
  repair();
});
observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
start();
}
})();
