
"use strict";

/*
 * MERO SANSAR — CONTENT SAFETY & MODERATION
 * Local-only text filtering, hide/report controls and restore tools.
 * Image files are not automatically classified.
 */

(function (global) {
  "use strict";
  if (global.KSKContentSafety) return;

  const STORAGE_KEY = "ksk_content_safety_v1";
  const STYLE_ID = "ksk-content-safety-styles";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const BLOCKED_TERMS = [
    "porn", "porno", "pornography", "xxx", "nude", "nudes", "nudity",
    "nsfw", "naked", "adult content", "explicit content", "sexual content",
    "sexually explicit", "erotic", "hentai", "blowjob", "handjob",
    "fuck", "fucking", "fucked", "motherfucker", "shit", "bullshit",
    "bitch", "bastard", "asshole", "dick", "pussy", "cunt",
    "whore", "slut", "rape", "rapist",

    "अश्लील", "पोर्न", "नग्न", "यौन सामग्री", "बलात्कार",
    "मुजी", "मुजि", "माचिक्ने", "रन्डी", "रण्डी",
    "लाडो", "लाँडो", "गाँड", "गान्ड", "गान्डु", "गाण्डु",
    "चिक्ने", "चिक", "बेश्या", "हरामी", "हरामि",
    "muji", "mujii", "mujy", "machikne", "machikney",
    "randi", "rundy", "lado", "laado", "gaand", "gand",
    "gandu", "gandoo", "chikne", "chikney", "chik",
    "besya", "beshya", "harami", "haraami", "boksi", "boksee"
  ];

  let observer = null;
  let queued = false;
  const photoConfirmedForms = new WeakSet();

  const english = () => global.KSKLanguage?.getLanguage?.() === "en";
  const t = (ne, en) => english() ? en : ne;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[c]);

  function notify(message, type = "info") {
    if (typeof global.KSKToast?.show === "function") {
      global.KSKToast.show(message, type);
    } else if (type === "error") {
      console.error(message);
    } else {
      console.info(message);
    }
  }

  function makeId() {
    try {
      if (global.crypto?.randomUUID) {
        return "safety_" + global.crypto.randomUUID();
      }
    } catch (e) {}

    return "safety_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function readState() {
    try {
      const v = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "{}");

      return {
        version: 1,
        hidden: Array.isArray(v.hidden) ? v.hidden : [],
        reports: Array.isArray(v.reports) ? v.reports : []
      };
    } catch (e) {
      return { version: 1, hidden: [], reports: [] };
    }
  }

  function saveState(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      global.dispatchEvent(new CustomEvent("ksk:content-safety-change"));
      return true;
    } catch (e) {
      notify(
        t("Safety सेटिङ सुरक्षित गर्न सकिएन।", "Could not save safety settings."),
        "error"
      );
      return false;
    }
  }

  function normalize(value) {
    return String(value ?? "").normalize("NFKC").toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function containsBlockedTerm(value) {
    const text = normalize(value);
    if (!text) return false;

    const tokens = text.match(/[a-z0-9]+/g) || [];
    const compactTokens = text.split(/\s+/)
      .map(part => part.replace(/[^a-z0-9]/g, ""))
      .filter(Boolean);

    return BLOCKED_TERMS.some(term => {
      const word = normalize(term);

      if (/^[a-z0-9 ]+$/.test(word)) {
        const wanted = word.split(/\s+/);

        if (wanted.length === 1) {
          return tokens.includes(wanted[0]) ||
            compactTokens.includes(wanted[0]);
        }

        for (let i = 0; i <= tokens.length - wanted.length; i++) {
          if (wanted.every((part, offset) => tokens[i + offset] === part)) {
            return true;
          }
        }

        return false;
      }

      return text.includes(word);
    });
  }

  function key(type, id) {
    return String(type) + ":" + String(id);
  }

  function isHidden(type, id) {
    return readState().hidden.some(x =>
      key(x.type, x.id) === key(type, id)
    );
  }

  function hideContent(type, id, label) {
    if (!["post", "story", "comment"].includes(type) || !id) {
      return false;
    }

    const state = readState();

    if (state.hidden.some(x =>
      key(x.type, x.id) === key(type, id)
    )) return true;

    state.hidden.unshift({
      type,
      id: String(id),
      label: String(label || type).slice(0, 100),
      createdAt: new Date().toISOString()
    });

    if (!saveState(state)) return false;

    scan();

    notify(
      t("यो सामग्री तपाईंको Feed बाट लुकाइयो।", "This content was hidden from your view."),
      "success"
    );

    return true;
  }

  function restoreContent(type, id) {
    const state = readState();
    const before = state.hidden.length;

    state.hidden = state.hidden.filter(x =>
      !(x.type === type && String(x.id) === String(id))
    );

    if (before === state.hidden.length || !saveState(state)) {
      return false;
    }

    scan();
    renderPanel();

    notify(
      t("लुकाइएको सामग्री पुनः देखाइयो।", "Content restored."),
      "success"
    );

    return true;
  }

  function reportContent(type, id, label) {
    if (!["post", "story", "comment"].includes(type) || !id) {
      return false;
    }

    const state = readState();

    if (state.reports.some(x =>
      x.type === type &&
      String(x.contentId) === String(id) &&
      x.status === "open"
    )) {
      notify(
        t(
          "यो सामग्री पहिल्यै Report गरिएको छ।",
          "This content has already been reported on this device."
        ),
        "info"
      );

      return false;
    }

    state.reports.unshift({
      id: makeId(),
      type,
      contentId: String(id),
      label: String(label || type).slice(0, 100),
      reason: "Inappropriate or unsafe content",
      status: "open",
      createdAt: new Date().toISOString()
    });

    if (!saveState(state)) return false;

    notify(
      t("Report यही डिभाइसमा सुरक्षित भयो।", "Report saved on this device."),
      "success"
    );

    return true;
  }

  function removeReport(id) {
    const state = readState();
    const before = state.reports.length;

    state.reports = state.reports.filter(x =>
      String(x.id) !== String(id)
    );

    if (before === state.reports.length || !saveState(state)) {
      return false;
    }

    renderPanel();
    return true;
  }

  function getPost(id) {
    return global.KSKData?.getPost?.(id) || null;
  }

  function getStory(id) {
    return (global.KSKData?.getStories?.(true) || []).find(x =>
      String(x?.id || "") === String(id || "")
    ) || null;
  }

  function addStyles() {
    if ($("#" + STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = [
      '[data-ksk-safety-hidden="true"]{display:none!important}',
      '.ksk-content-safety-actions{display:flex;flex-wrap:wrap;gap:7px;padding:7px 12px 10px;border-top:1px solid var(--color-border,#ddd)}',
      '.post-card>.ksk-content-safety-actions{display:none!important}',
      '.post-menu-actions .ksk-content-safety-actions{display:flex!important;flex-direction:column;border:0;padding:4px 0;margin-top:8px}',
      '.post-menu-actions .ksk-content-safety-actions button{width:100%;text-align:left;min-height:42px;font-size:14px}',
      '.ksk-content-safety-actions button{min-height:32px;padding:5px 9px;border:1px solid var(--color-border,#ddd);border-radius:8px;background:var(--color-surface-secondary,#f5f5f5);color:var(--color-text-secondary,#555);font:inherit;font-size:11px;font-weight:600;cursor:pointer}',
      '.ksk-content-safety-actions .ksk-safety-report{color:#b54747;border-color:rgba(181,71,71,.35)}',
      '.ksk-comment-safety-actions{display:inline-flex;gap:6px;margin-left:7px}',
      '.ksk-comment-safety-actions button{border:0;background:transparent;color:var(--color-text-secondary,#777);font:inherit;font-size:11px;cursor:pointer}',
      '.ksk-content-safety-panel{max-height:65vh;overflow:auto}',
      '.ksk-content-safety-panel h3{margin:14px 0 7px;font-size:15px}',
      '.ksk-content-safety-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--color-border,#ddd)}',
      '.ksk-content-safety-row>div{min-width:0;overflow-wrap:anywhere}',
      '.ksk-content-safety-row small{display:block;margin-top:3px;color:var(--color-text-secondary,#777);font-size:11px}',
      '.ksk-content-safety-row button{flex:0 0 auto;min-height:32px;padding:6px 9px;border:1px solid var(--color-border,#ddd);border-radius:8px;background:var(--color-surface-secondary,#f5f5f5);color:inherit;font:inherit;font-size:12px;cursor:pointer}',
      '.ksk-content-safety-note{padding:10px;border-radius:9px;background:var(--color-surface-secondary,#f5f5f5);color:var(--color-text-secondary,#777);font-size:12px;line-height:1.55}'
    ].join("");

    document.head.appendChild(style);
  }

  function actionsHTML(type, id) {
    return '<div class="ksk-content-safety-actions" data-ksk-safety-actions>' +
      '<button type="button" data-ksk-safety-action="hide" data-content-type="' +
      esc(type) + '" data-content-id="' + esc(id) + '">' +
      t("लुकाउनुहोस्", "Hide") +
      '</button>' +

      '<button type="button" class="ksk-safety-report" data-ksk-safety-action="report" data-content-type="' +
      esc(type) + '" data-content-id="' + esc(id) + '">' +
      t("Report", "Report") +
      '</button></div>';
  }

  function applyVisibility() {
    $$(".post-card[data-post-id]").forEach(card => {
      const id = card.dataset.postId;
      const post = getPost(id);
      const filtered = post && containsBlockedTerm(post.text);

      card.dataset.kskSafetyHidden =
        (isHidden("post", id) || filtered) ? "true" : "false";
    });

    $$(".ksk-comment[data-comment-id]").forEach(card => {
      const id = card.dataset.commentId;
      const text = $(".ksk-comment-text", card)?.textContent || "";

      card.dataset.kskSafetyHidden =
        (isHidden("comment", id) || containsBlockedTerm(text))
          ? "true"
          : "false";
    });

    $$("#storiesList [data-home-story-view]").forEach(card => {
      const id = card.dataset.homeStoryView;
      const story = getStory(id);
      const filtered = story && containsBlockedTerm(story.text);

      card.dataset.kskSafetyHidden =
        (isHidden("story", id) || filtered) ? "true" : "false";
    });

    const viewer = $(".ksk-story-feature-view");
    const reply = viewer && $("[data-home-story-reply]", viewer);
    const story = reply ? getStory(reply.dataset.homeStoryReply) : null;

    if (story && (
      isHidden("story", story.id) ||
      containsBlockedTerm(story.text)
    )) {
      global.KSKModal?.closeModal?.();
    }
  }

  // Post Hide/Report controls are placed inside the existing ⋯ menu only.
  function decoratePostMenus() {
    $$(".post-menu-actions").forEach(menu => {
      if ($("[data-ksk-safety-actions]", menu)) return;

      const trigger = $("[data-edit-post], [data-delete-post]", menu);
      const id = trigger?.dataset.editPost || trigger?.dataset.deletePost;

      if (id) {
        menu.insertAdjacentHTML("beforeend", actionsHTML("post", id));
      }
    });
  }

  function decorateComments() {
    $$(".ksk-comment[data-comment-id]").forEach(card => {
      if ($(".ksk-comment-safety-actions", card)) return;

      const id = card.dataset.commentId;
      const meta = $(".ksk-comment-meta", card);

      if (!id || !meta) return;

      const actions = document.createElement("span");
      actions.className = "ksk-comment-safety-actions";

      actions.innerHTML =
        '<button type="button" data-ksk-safety-action="hide" data-content-type="comment" data-content-id="' +
        esc(id) + '">' + t("लुकाउनुहोस्", "Hide") + '</button>' +

        '<button type="button" data-ksk-safety-action="report" data-content-type="comment" data-content-id="' +
        esc(id) + '">' + t("Report", "Report") + '</button>';

      meta.appendChild(actions);
    });
  }

  function decorateStoryViewer() {
    const viewer = $(".ksk-story-feature-view");
    if (!viewer) return;

    const form = $("[data-home-story-reply]", viewer);
    const id = form?.dataset.homeStoryReply;
    const actions = $(".ksk-story-view-actions", viewer);

    if (id && actions && !$("[data-ksk-safety-actions]", actions)) {
      actions.insertAdjacentHTML(
        "beforeend",
        actionsHTML("story", id)
      );
    }
  }

  function scan() {
    addStyles();
    decoratePostMenus();
    decorateComments();
    decorateStoryViewer();
    applyVisibility();
    injectShortcuts();
  }

  function queueScan() {
    if (queued) return;

    queued = true;

    global.setTimeout(() => {
      queued = false;
      scan();
    }, 0);
  }

  function openPhotoSafetyConfirmation(form, submitter) {
    const modalAPI = global.KSKModal;

    if (typeof modalAPI?.openModal !== "function") {
      notify(
        t(
          "फोटो सुरक्षा पुष्टि विन्डो उपलब्ध छैन। फोटो प्रकाशित गर्नुअघि कृपया फेरि प्रयास गर्नुहोस्।",
          "Photo safety confirmation is unavailable. Please try again before publishing."
        ),
        "error"
      );
      return false;
    }

    const modal = modalAPI.openModal({
      title: t("फोटो सुरक्षा पुष्टि", "Confirm photo safety"),
      content: `
        <div class="ksk-photo-safety-confirm">
          <p style="line-height:1.65;margin:0">
            ${t(
              "फोटोको स्वचालित जाँच हुँदैन। फोटो सुरक्षित, गैर-अश्लील र अरूको गोपनीयता उल्लङ्घन नगर्ने भएको पुष्टि गर्नुहोस्।",
              "Photos are not automatically scanned. Confirm that this image is safe, non-explicit, and does not violate anyone's privacy."
            )}
          </p>
        </div>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>
          ${t("रद्द गर्नुहोस्", "Cancel")}
        </button>
        <button type="button" class="btn btn-primary" data-confirm-photo-safety>
          ${t("पुष्टि गरी प्रकाशित गर्नुहोस्", "Confirm and publish")}
        </button>
      `
    });

    const confirmButton = modal?.element?.querySelector?.(
      "[data-confirm-photo-safety]"
    );

    if (!confirmButton) {
      modalAPI.closeModal?.();
      notify(
        t("पुष्टि विन्डो खोल्न सकिएन।", "Could not open the confirmation window."),
        "error"
      );
      return false;
    }

    confirmButton.addEventListener("click", () => {
      if (confirmButton.disabled) return;

      if (!form?.isConnected) {
        modalAPI.closeModal?.();
        return;
      }

      confirmButton.disabled = true;
      modalAPI.closeModal?.();

      photoConfirmedForms.add(form);

      try {
        if (typeof form.requestSubmit === "function") {
          if (submitter && submitter.form === form) {
            form.requestSubmit(submitter);
          } else {
            form.requestSubmit();
          }
        } else {
          photoConfirmedForms.delete(form);
          notify(
            t(
              "यो ब्राउजरले सुरक्षित रूपमा फारम पुनः पठाउन सकेन।",
              "This browser could not safely resubmit the form."
            ),
            "error"
          );
        }
      } catch (error) {
        photoConfirmedForms.delete(form);
        notify(
          t(
            "पोस्ट प्रकाशित गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।",
            "The post could not be submitted. Please try again."
          ),
          "error"
        );
      }
    });

    return true;
  }

  function handleSubmit(event) {
    const form = event.target;

    if (!(form instanceof global.HTMLFormElement)) return;

    const composer =
      form.id === "kskMediaPostForm" ||
      form.id === "kskMediaStoryForm";

    const comment = form.matches("[data-comment-form]");
    const reply = form.matches("[data-home-story-reply]");
    const editPost = form.id === "kskEditPostForm";

    if (!composer && !comment && !reply && !editPost) return;

    const textarea = $("textarea", form);
    const value = textarea?.value || "";

    if (containsBlockedTerm(value)) {
      event.preventDefault();
      event.stopImmediatePropagation();

      notify(
        t(
          "यो शब्द वा वाक्यांश Content Safety नियमसँग मेल खाँदैन। कृपया सम्पादन गर्नुहोस्।",
          "This text matches the content safety filter. Please edit it before submitting."
        ),
        "warning"
      );

      textarea?.focus();
      return;
    }

    if (composer) {
      const file = $("input[type=file]", form)?.files?.[0];

      if (file && !photoConfirmedForms.has(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPhotoSafetyConfirmation(form, event.submitter || null);
        return;
      }

      if (photoConfirmedForms.has(form)) {
        photoConfirmedForms.delete(form);
      }
    }
  }

  function handleClick(event) {
    const action = event.target?.closest?.("[data-ksk-safety-action]");

    if (action) {
      event.preventDefault();
      event.stopPropagation();

      const type = action.dataset.contentType;
      const id = action.dataset.contentId;

      const label =
        type === "post" ? (getPost(id)?.author || "Post") :
        type === "story" ? (getStory(id)?.author || "Story") :
        t("टिप्पणी", "Comment");

      if (action.dataset.kskSafetyAction === "hide") {
        hideContent(type, id, label);

        if (type === "story" && $(".ksk-story-feature-view")) {
          global.KSKModal?.closeModal?.();
        }
      } else {
        reportContent(type, id, label);
      }

      return;
    }

    const open = event.target?.closest?.("[data-ksk-open-safety-panel]");

    if (open) {
      event.preventDefault();
      openPanel();
      return;
    }

    const restore = event.target?.closest?.("[data-ksk-restore-content]");

    if (restore) {
      restoreContent(
        restore.dataset.contentType,
        restore.dataset.contentId
      );
      return;
    }

    const remove = event.target?.closest?.("[data-ksk-delete-report]");

    if (remove) {
      removeReport(remove.dataset.kskDeleteReport);
    }
  }

  function panelMarkup() {
    const state = readState();

    const hidden = state.hidden.length
      ? state.hidden.map(item =>
          '<div class="ksk-content-safety-row"><div><strong>' +
          esc(item.label || item.type) +
          '</strong><small>' +
          esc(item.type) + ' · ' + esc(item.id) +
          '</small></div><button type="button" data-ksk-restore-content data-content-type="' +
          esc(item.type) + '" data-content-id="' + esc(item.id) + '">' +
          t("फिर्ता", "Restore") +
          '</button></div>'
        ).join("")
      : '<p class="ksk-content-safety-note">' +
        t("लुकाइएको सामग्री छैन।", "No hidden content.") +
        '</p>';

    const reports = state.reports.length
      ? state.reports.map(item =>
          '<div class="ksk-content-safety-row"><div><strong>' +
          esc(item.label || item.type) +
          '</strong><small>' +
          esc(item.reason) + ' · ' + esc(item.status) +
          '</small></div><button type="button" data-ksk-delete-report="' +
          esc(item.id) + '">' +
          t("हटाउनुहोस्", "Remove") +
          '</button></div>'
        ).join("")
      : '<p class="ksk-content-safety-note">' +
        t("स्थानीय Report छैन।", "No local reports.") +
        '</p>';

    return '<div class="ksk-content-safety-panel"><p class="ksk-content-safety-note">' +
      t(
        "चयन गरिएका अपशब्द र अश्लील शब्द रोक्ने, लुकाइएका Post, Comment र Story फिर्ता देखाउने तथा स्थानीय Report व्यवस्थापन गर्ने सुविधा। Report यही ब्राउजरमा मात्र रहन्छ। फोटोको स्वचालित जाँच हुँदैन।",
        "Blocks selected abusive and explicit terms, restores hidden posts/comments/stories and manages local reports. Reports stay in this browser. Photos are not automatically scanned."
      ) +
      '</p><h3>' + t("लुकाइएको सामग्री", "Hidden content") +
      '</h3>' + hidden +
      '<h3>' + t("स्थानीय Reports", "Local reports") +
      '</h3>' + reports +
      '</div>';
  }

  function openPanel() {
    if (!global.KSKModal?.openModal) {
      notify(
        t("Content Safety Panel उपलब्ध छैन।", "Content Safety panel is unavailable."),
        "error"
      );
      return false;
    }

    global.KSKModal.openModal({
      title: t("Content Safety", "Content Safety"),
      content: panelMarkup(),
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>' +
        t("बन्द गर्नुहोस्", "Close") +
        '</button>'
    });

    return true;
  }

  function renderPanel() {
    const modal = global.KSKModal?.getActiveModal?.();
    const body = modal?.querySelector?.("[data-modal-body]");

    if (body?.querySelector(".ksk-content-safety-panel")) {
      body.innerHTML = panelMarkup();
    }
  }

  function injectShortcuts() {
    const menu = $(".ksk-settings-menu", $("#settingsBody") || document);

    if (menu && !$("#kskContentSafetyShortcut", menu)) {
      const button = document.createElement("button");

      button.type = "button";
      button.id = "kskContentSafetyShortcut";
      button.className = "ksk-safety-shortcut";
      button.dataset.kskOpenSafetyPanel = "true";

      button.innerHTML =
        '<span aria-hidden="true" style="font-size:22px">🛡️</span>' +
        '<span><strong>' + t("Content Safety", "Content Safety") +
        '</strong><small>' +
        t("लुकाइएको सामग्री र स्थानीय Report व्यवस्थापन", "Manage hidden content and local reports") +
        '</small></span><span aria-hidden="true" style="margin-left:auto">›</span>';

      menu.appendChild(button);
    }

    const safetyContent = $(".ksk-safety-content", $("#kskSafetyOverlay") || document);

    if (safetyContent && !$("#kskContentSafetyPanelButton", safetyContent)) {
      const button = document.createElement("button");

      button.type = "button";
      button.id = "kskContentSafetyPanelButton";
      button.className = "ksk-safe-button";
      button.dataset.kskOpenSafetyPanel = "true";
      button.style.margin = "10px 0";
      button.textContent = t(
        "Content Safety व्यवस्थापन",
        "Manage Content Safety"
      );

      const tabs = $(".ksk-safe-tabs", safetyContent);

      if (tabs) {
        tabs.insertAdjacentElement("afterend", button);
      } else {
        safetyContent.prepend(button);
      }
    }
  }

  function initialize() {
    addStyles();

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("click", handleClick, true);

    if (
      typeof global.MutationObserver === "function" &&
      document.body
    ) {
      observer = new global.MutationObserver(queueScan);

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    scan();
    return true;
  }

  global.KSKContentSafety = Object.freeze({
    initialize,
    open: openPanel,
    getState: readState,
    containsBlockedTerm,
    hideContent,
    reportContent,
    restoreContent
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
