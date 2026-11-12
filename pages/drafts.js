
"use strict";

/*
 * MERO SANSAR — LOCAL POST DRAFTS
 * - Text-only drafts stored in this browser.
 * - Create, edit, delete, copy and reopen in the existing Post Composer.
 * - Never publishes a post and does not modify KSKData/core/data.js.
 */
(function (global) {
  "use strict";

  if (global.KSKDraftsPage) return;

  const STORAGE_KEY = "ksk_post_drafts_v1";
  const STYLE_ID = "ksk-drafts-styles";
  const MAX_DRAFTS = 100;
  const MAX_TEXT = 10000;
  let overlay = null;
  let observer = null;
  let initialized = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const isEnglish = () => global.KSKLanguage?.getLanguage?.() === "en";
  const t = (ne, en) => isEnglish() ? en : ne;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function toast(message, type = "info") {
    const api = global.KSKToast;
    if (typeof api?.[type] === "function") api[type](message);
    else if (typeof api?.show === "function") api.show(message, type);
    else console.info(message);
  }

  function makeId() {
    const value = global.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `draft_${value}`;
  }

  function readState() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;

      if (!parsed || !Array.isArray(parsed.items)) {
        return { version: 1, items: [] };
      }

      return {
        version: 1,
        items: parsed.items
          .filter(item => item && typeof item === "object" && item.id)
          .slice(0, MAX_DRAFTS)
          .map(item => ({
            id: String(item.id),
            title: String(item.title || "").slice(0, 80),
            text: String(item.text || "").slice(0, MAX_TEXT),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
          }))
      };
    } catch (error) {
      console.error("Drafts could not be read.", error);
      return { version: 1, items: [] };
    }
  }

  function writeState(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        items: state.items.slice(0, MAX_DRAFTS)
      }));
      return true;
    } catch (error) {
      console.error("Drafts could not be saved.", error);
      toast(t(
        "Draft सुरक्षित गर्न सकिएन। Browser storage खाली गर्नुहोस्।",
        "Could not save the draft. Check available browser storage."
      ), "error");
      return false;
    }
  }

  function getDraft(id) {
    return readState().items.find(item => item.id === String(id)) || null;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(isEnglish() ? "en-US" : "ne-NP", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function ensureStyles() {
    if ($("#" + STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .ksk-drafts-trigger{
        display:inline-flex;align-items:center;gap:7px;
        min-height:38px;padding:8px 12px;
        border:1px solid var(--color-border);
        border-radius:10px;
        background:var(--color-surface-secondary);
        color:var(--color-text);font:inherit;
        font-size:12px;font-weight:750;cursor:pointer
      }
      .ksk-drafts-count{
        display:inline-grid;place-items:center;
        min-width:20px;height:20px;padding:0 5px;
        border-radius:99px;background:var(--color-primary);
        color:#fff;font-size:10px
      }
      .ksk-drafts-overlay{
        position:fixed;inset:0;z-index:10060;
        display:flex;align-items:center;justify-content:center;
        padding:14px;background:rgba(0,0,0,.64)
      }
      .ksk-drafts-dialog{
        width:min(100%,560px);max-height:90vh;overflow:auto;
        border:1px solid var(--color-border);
        border-radius:18px;padding:16px;
        background:var(--color-surface);color:var(--color-text);
        box-shadow:0 18px 60px rgba(0,0,0,.3)
      }
      .ksk-drafts-head{
        display:flex;align-items:center;
        justify-content:space-between;gap:10px;margin-bottom:14px
      }
      .ksk-drafts-head h2{margin:0;font-size:18px}
      .ksk-drafts-close{
        width:38px;height:38px;border:0;border-radius:50%;
        background:var(--color-surface-secondary);
        color:var(--color-text);font-size:22px;cursor:pointer
      }
      .ksk-drafts-note{
        padding:10px 12px;margin:0 0 12px;
        border:1px solid var(--color-border);border-radius:11px;
        background:var(--color-surface-secondary);
        color:var(--color-text-secondary);
        font-size:12px;line-height:1.5
      }
      .ksk-drafts-list{display:flex;flex-direction:column;gap:10px}
      .ksk-draft-item{
        padding:12px;border:1px solid var(--color-border);
        border-radius:13px;background:var(--color-surface-secondary)
      }
      .ksk-draft-item h3{
        margin:0 0 5px;font-size:14px;overflow-wrap:anywhere
      }
      .ksk-draft-item p{
        margin:0;color:var(--color-text-secondary);
        font-size:13px;line-height:1.5;
        white-space:pre-wrap;overflow-wrap:anywhere
      }
      .ksk-draft-meta{
        display:block;margin-top:8px;
        color:var(--color-muted);font-size:11px
      }
      .ksk-draft-actions{
        display:flex;flex-wrap:wrap;gap:7px;margin-top:11px
      }
      .ksk-draft-actions button,
      .ksk-drafts-form-actions button{
        min-height:38px;padding:8px 11px;
        border:1px solid var(--color-border);
        border-radius:9px;background:var(--color-surface);
        color:var(--color-text);font:inherit;
        font-size:12px;font-weight:700;cursor:pointer
      }
      .ksk-draft-actions .primary,
      .ksk-drafts-form-actions .primary{
        border-color:var(--color-primary);
        background:var(--color-primary);color:#fff
      }
      .ksk-draft-actions .danger{color:#dc2626}
      .ksk-drafts-form{display:flex;flex-direction:column;gap:10px}
      .ksk-drafts-form label{
        display:flex;flex-direction:column;gap:6px;
        font-size:13px;font-weight:700
      }
      .ksk-drafts-form input,
      .ksk-drafts-form textarea{
        width:100%;box-sizing:border-box;
        border:1px solid var(--color-border);
        border-radius:10px;padding:11px;
        background:var(--color-surface);
        color:var(--color-text);font:inherit
      }
      .ksk-drafts-form textarea{
        min-height:180px;resize:vertical;line-height:1.5
      }
      .ksk-drafts-counter{
        text-align:right;color:var(--color-muted);font-size:11px
      }
      .ksk-drafts-form-actions{
        display:flex;justify-content:flex-end;
        flex-wrap:wrap;gap:8px;margin-top:4px
      }
      .ksk-drafts-empty{
        padding:24px 12px;text-align:center;
        color:var(--color-text-secondary);
        border:1px dashed var(--color-border);
        border-radius:12px;font-size:13px
      }
      @media(max-width:420px){
        .ksk-draft-actions button{flex:1 1 auto}
        .ksk-drafts-dialog{padding:13px}
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function updateTriggerCount() {
    const trigger = $("[data-ksk-drafts-open]");
    if (!trigger) return;

    const count = readState().items.length;
    let badge = $("[data-ksk-drafts-count]", trigger);

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "ksk-drafts-count";
      badge.dataset.kskDraftsCount = "true";
      trigger.appendChild(badge);
    }

    badge.textContent = String(count);
    badge.hidden = count === 0;
    badge.style.display = count === 0 ? "none" : "inline-grid";

    trigger.setAttribute(
      "aria-label",
      t(`Drafts (${count})`, `Drafts (${count})`)
    );
  }

  function injectTrigger() {
    const composer = $("#homePage .composer-card .composer-actions");

    if (!composer || $("[data-ksk-drafts-open]", composer)) {
      return false;
    }

    ensureStyles();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ksk-drafts-trigger";
    button.dataset.kskDraftsOpen = "true";
    button.innerHTML = `📝 ${t("Drafts", "Drafts")}`;

    composer.appendChild(button);
    updateTriggerCount();

    return true;
  }

  function closeModal() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }

    document.removeEventListener("keydown", handleKeydown);
  }

  function showModal(title, content) {
    closeModal();

    overlay = document.createElement("div");
    overlay.className = "ksk-drafts-overlay";

    overlay.innerHTML = `
      <section class="ksk-drafts-dialog"
        role="dialog" aria-modal="true"
        aria-label="${escapeHTML(title)}">

        <header class="ksk-drafts-head">
          <h2>${escapeHTML(title)}</h2>
          <button type="button"
            class="ksk-drafts-close"
            data-drafts-close
            aria-label="${t("बन्द गर्नुहोस्", "Close")}">×</button>
        </header>

        <div data-drafts-body>${content}</div>
      </section>
    `;

    overlay.addEventListener("click", event => {
      if (
        event.target === overlay ||
        event.target.closest("[data-drafts-close]")
      ) {
        closeModal();
      }
    });

    document.body.appendChild(overlay);
    document.addEventListener("keydown", handleKeydown);
    $("[data-drafts-close]", overlay)?.focus();

    return overlay;
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeModal();
  }

  function renderList() {
    const items = readState().items.sort((a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
    );

    const rows = items.length
      ? items.map(item => {
          const preview = item.text.length > 220
            ? item.text.slice(0, 220) + "…"
            : item.text;

          return `
            <article class="ksk-draft-item">
              <h3>${escapeHTML(
                item.title || t("शीर्षक नभएको Draft", "Untitled draft")
              )}</h3>

              <p>${escapeHTML(preview)}</p>

              <span class="ksk-draft-meta">
                ${escapeHTML(formatDate(item.updatedAt))}
              </span>

              <div class="ksk-draft-actions">
                <button type="button" class="primary"
                  data-draft-use="${escapeHTML(item.id)}">
                  ${t("Post मा प्रयोग", "Use in Post")}
                </button>

                <button type="button"
                  data-draft-edit="${escapeHTML(item.id)}">
                  ${t("सम्पादन", "Edit")}
                </button>

                <button type="button"
                  data-draft-copy="${escapeHTML(item.id)}">
                  Copy
                </button>

                <button type="button" class="danger"
                  data-draft-delete="${escapeHTML(item.id)}">
                  ${t("मेटाउनुहोस्", "Delete")}
                </button>
              </div>
            </article>
          `;
        }).join("")
      : `
        <div class="ksk-drafts-empty">
          ${t(
            "अहिलेसम्म Draft छैन। नयाँ Draft बनाएर लेखाइ सुरक्षित गर्नुहोस्।",
            "No drafts yet. Create a draft to save your writing."
          )}
        </div>
      `;

    return `
      <p class="ksk-drafts-note">
        ${t(
          "Draft यही Browser/डिभाइसमा मात्र सुरक्षित हुन्छ। यसले आफैँ Post प्रकाशित गर्दैन। Draft मा अहिले Text मात्र सुरक्षित हुन्छ, फोटो होइन।",
          "Drafts are stored only in this browser/device. They are never published automatically. Drafts currently save text only, not photos."
        )}
      </p>

      <div class="ksk-draft-actions" style="margin:0 0 12px">
        <button type="button" class="primary" data-draft-new>
          ＋ ${t("नयाँ Draft", "New draft")}
        </button>
      </div>

      <div class="ksk-drafts-list">${rows}</div>
    `;
  }

  function openList() {
    showModal(t("मेरो Drafts", "My Drafts"), renderList());
  }

  function openEditor(id = "") {
    const existing = id ? getDraft(id) : null;
    const title = existing?.title || "";
    const text = existing?.text || "";

    const markup = `
      <form class="ksk-drafts-form" data-draft-form>

        <label>
          ${t("शीर्षक (वैकल्पिक)", "Title (optional)")}
          <input name="title" type="text" maxlength="80"
            value="${escapeHTML(title)}"
            placeholder="${t("Draft को शीर्षक", "Draft title")}">
        </label>

        <label>
          ${t("लेखाइ", "Writing")}
          <textarea name="text" maxlength="${MAX_TEXT}" required
            placeholder="${t(
              "आफ्नो लेखाइ यहाँ राख्नुहोस्...",
              "Write your post here..."
            )}">${escapeHTML(text)}</textarea>
        </label>

        <div class="ksk-drafts-counter" data-draft-counter>
          ${text.length} / ${MAX_TEXT}
        </div>

        <div class="ksk-drafts-form-actions">
          <button type="button" data-draft-back>
            ${t("फिर्ता", "Back")}
          </button>

          <button type="submit" class="primary">
            ${t("सुरक्षित गर्नुहोस्", "Save draft")}
          </button>
        </div>
      </form>
    `;

    const root = showModal(
      existing
        ? t("Draft सम्पादन", "Edit draft")
        : t("नयाँ Draft", "New draft"),
      markup
    );

    const form = $("[data-draft-form]", root);
    const textarea = $("textarea[name='text']", form);

    textarea?.focus();

    textarea?.addEventListener("input", () => {
      const counter = $("[data-draft-counter]", form);

      if (counter) {
        counter.textContent =
          `${textarea.value.length} / ${MAX_TEXT}`;
      }
    });

    form?.addEventListener("submit", event => {
      event.preventDefault();

      const nextText = String(textarea?.value || "").trim();

      if (!nextText) {
        toast(
          t("Draft खाली हुन सक्दैन।", "A draft cannot be empty."),
          "warning"
        );
        textarea?.focus();
        return;
      }

      const nextTitle = String(
        $("input[name='title']", form)?.value || ""
      ).trim().slice(0, 80);

      const state = readState();
      const now = new Date().toISOString();

      if (existing) {
        const index = state.items.findIndex(
          item => item.id === existing.id
        );

        if (index < 0) {
          toast(
            t("Draft भेटिएन। सूची पुनः खोल्नुहोस्.", "Draft not found. Reopen the list."),
            "error"
          );
          openList();
          return;
        }

        state.items[index] = {
          ...state.items[index],
          title: nextTitle,
          text: nextText.slice(0, MAX_TEXT),
          updatedAt: now
        };
      } else {
        if (state.items.length >= MAX_DRAFTS) {
          toast(
            t(
              `अधिकतम ${MAX_DRAFTS} Draft मात्र राख्न सकिन्छ।`,
              `You can keep up to ${MAX_DRAFTS} drafts.`
            ),
            "warning"
          );
          return;
        }

        state.items.unshift({
          id: makeId(),
          title: nextTitle,
          text: nextText.slice(0, MAX_TEXT),
          createdAt: now,
          updatedAt: now
        });
      }

      if (writeState(state)) {
        updateTriggerCount();
        toast(t("Draft सुरक्षित भयो।", "Draft saved."), "success");
        openList();
      }
    });
  }

  async function copyText(text) {
    try {
      if (
        global.navigator?.clipboard?.writeText &&
        global.isSecureContext
      ) {
        await global.navigator.clipboard.writeText(text);
        return true;
      }

      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";

      document.body.appendChild(field);
      field.select();

      const copied = document.execCommand("copy");
      field.remove();

      if (!copied) throw new Error("Copy command failed");

      return true;
    } catch (error) {
      console.warn("Draft copy failed.", error);
      return false;
    }
  }

  async function useDraft(id) {
    const draft = getDraft(id);

    if (!draft) {
      toast(t("Draft भेटिएन।", "Draft not found."), "error");
      openList();
      return;
    }

    closeModal();

    const opened = global.KSKApp?.openPostComposer?.();
    const textarea = $("#kskMediaPostText");

    if (opened && textarea) {
      textarea.value = draft.text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();

      toast(
        t(
          "Draft Post Composer मा खुल्यो। प्रकाशित गर्न Publish थिच्नुपर्छ।",
          "Draft opened in Post Composer. Press Publish only when you are ready."
        ),
        "success"
      );
      return;
    }

    const copied = await copyText(draft.text);

    toast(
      copied
        ? t("Draft कपी भयो।", "Draft copied.")
        : t("Composer उपलब्ध भएन र Copy पनि भएन।", "Composer unavailable and copy failed."),
      copied ? "success" : "error"
    );
  }

  async function handleClick(event) {
    const target = event.target?.closest?.("button");
    if (!target) return;

    if (target.matches("[data-ksk-drafts-open]")) {
      openList();
      return;
    }

    if (target.matches("[data-draft-new]")) {
      openEditor();
      return;
    }

    if (target.matches("[data-draft-back]")) {
      openList();
      return;
    }

    const use = target.closest("[data-draft-use]");
    if (use) {
      await useDraft(use.dataset.draftUse);
      return;
    }

    const edit = target.closest("[data-draft-edit]");
    if (edit) {
      openEditor(edit.dataset.draftEdit);
      return;
    }

    const copy = target.closest("[data-draft-copy]");
    if (copy) {
      const draft = getDraft(copy.dataset.draftCopy);
      if (!draft) return;

      const copied = await copyText(draft.text);

      toast(
        copied
          ? t("Draft कपी भयो।", "Draft copied.")
          : t("Copy गर्न सकिएन।", "Could not copy draft."),
        copied ? "success" : "error"
      );
      return;
    }

    const remove = target.closest("[data-draft-delete]");
    if (remove) {
      const draft = getDraft(remove.dataset.draftDelete);
      if (!draft) return;

      const confirmed = global.confirm(
        t("यो Draft मेटाउने हो?", "Delete this draft?")
      );

      if (!confirmed) return;

      const state = readState();
      state.items = state.items.filter(
        item => item.id !== draft.id
      );

      if (writeState(state)) {
        updateTriggerCount();
        toast(t("Draft मेटाइयो।", "Draft deleted."), "success");
        openList();
      }
    }
  }

  function initialize() {
    if (initialized || !document.body) return true;

    initialized = true;
    ensureStyles();
    injectTrigger();

    observer = new MutationObserver(() => injectTrigger());
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener("click", handleClick);

    global.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY) updateTriggerCount();
    });

    return true;
  }

  global.KSKDraftsPage = Object.freeze({
    initialize,
    open: openList,
    getDrafts: () => readState().items.map(item => ({ ...item }))
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})(window);
