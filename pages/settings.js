
/* =========================================================
   SETTINGS PAGE MODULE
   MERO SANSAR — SETTINGS + SAFETY & PRIVACY CENTER

   Safety features are local-only until backend integration.
   Does not modify core/data.js or existing social data APIs.
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSettingsPage) return;

  const SETTINGS_UI = () => global.KSKSettingsUI || null;

  function open() {
    const ui = SETTINGS_UI();
    return typeof ui?.open === "function" ? ui.open() : false;
  }

  function close() {
    const ui = SETTINGS_UI();
    return typeof ui?.close === "function" ? ui.close() : false;
  }

  function render() {
    const ui = SETTINGS_UI();
    return typeof ui?.render === "function" ? ui.render() : false;
  }

  function getActiveSection() {
    const ui = SETTINGS_UI();
    return typeof ui?.getActiveSection === "function"
      ? ui.getActiveSection()
      : "main";
  }

  global.KSKSettingsPage = Object.freeze({
    open,
    close,
    render,
    getActiveSection
  });

})(window);


/* =========================================================
   KSK SAFETY & PRIVACY CENTER
   LocalStorage prototype — no server moderation.
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSafetyPage) return;

  const STORAGE_KEY = "ksk_safety_privacy_v1";
  const STYLE_ID = "ksk-safety-center-styles";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  let overlay = null;
  let initialized = false;
  let observer = null;

  /* =======================================================
     HELPERS
  ======================================================= */

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function normalizeId(value) {
    if (
      typeof value !== "string" &&
      typeof value !== "number"
    ) {
      return "";
    }

    const id = String(value).trim();

    if (
      !id ||
      id.length > 128 ||
      /[\u0000-\u001f\u007f]/.test(id)
    ) {
      return "";
    }

    return id;
  }

  function makeId(prefix) {
    try {
      if (global.crypto?.randomUUID) {
        return prefix + "_" + global.crypto.randomUUID();
      }
    } catch (error) {}

    return prefix + "_" +
      Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 10);
  }

  function notify(message, type = "info") {
    const toast = global.KSKToast;

    if (typeof toast?.show === "function") {
      toast.show(message, type);
      return;
    }

    if (type === "error") {
      console.error(message);
    } else {
      console.info(message);
    }
  }

  function currentUserId() {
    return normalizeId(
      global.KSKSocialData?.getLocalUserId?.() || ""
    );
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return t("मिति उपलब्ध छैन", "Date unavailable");
    }

    try {
      return new Intl.DateTimeFormat(
        isEnglish() ? "en" : "ne",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      ).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  /* =======================================================
     LOCAL SAFETY STORAGE
  ======================================================= */

  function emptyState() {
    return {
      version: 1,
      restricted: [],
      muted: [],
      reports: []
    };
  }

  function readState() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (!raw) return emptyState();

      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        parsed.version !== 1
      ) {
        return emptyState();
      }

      return {
        version: 1,

        restricted: Array.isArray(parsed.restricted)
          ? parsed.restricted
              .filter(item => normalizeId(item?.userId))
              .map(item => ({
                userId: normalizeId(item.userId),
                createdAt: String(item.createdAt || "")
              }))
          : [],

        muted: Array.isArray(parsed.muted)
          ? parsed.muted
              .filter(item => normalizeId(item?.userId))
              .map(item => ({
                userId: normalizeId(item.userId),
                createdAt: String(item.createdAt || "")
              }))
          : [],

        reports: Array.isArray(parsed.reports)
          ? parsed.reports
              .filter(item =>
                item &&
                normalizeId(item.id) &&
                normalizeId(item.targetUserId)
              )
              .map(item => ({
                id: normalizeId(item.id),
                targetUserId: normalizeId(item.targetUserId),
                reporterUserId: normalizeId(item.reporterUserId),
                reason: String(item.reason || "other").slice(0, 40),
                details: String(item.details || "").slice(0, 1000),
                status: [
                  "open",
                  "reviewed",
                  "dismissed"
                ].includes(item.status)
                  ? item.status
                  : "open",
                createdAt: String(item.createdAt || ""),
                updatedAt: String(item.updatedAt || "")
              }))
          : []
      };

    } catch (error) {
      console.error("Safety storage read failed:", error);
      return emptyState();
    }
  }

  function saveState(state) {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      global.dispatchEvent(
        new CustomEvent("ksk:safety-change", {
          detail: { timestamp: Date.now() }
        })
      );

      return true;

    } catch (error) {
      console.error("Safety storage save failed:", error);

      notify(
        t(
          "Safety डाटा सुरक्षित गर्न सकिएन।",
          "Could not save safety data."
        ),
        "error"
      );

      return false;
    }
  }

  /* =======================================================
     PRIVACY PREFERENCES
  ======================================================= */

  function getPrivacy() {
    return global.KSKSettings?.getSettings?.()?.privacy || {};
  }

  function updatePrivacy(path, value) {
    const result = global.KSKSettings?.updateSetting?.(
      "privacy." + path,
      value
    );

    if (!result) {
      notify(
        t(
          "Privacy सेटिङ सुरक्षित गर्न सकिएन।",
          "Could not save privacy setting."
        ),
        "error"
      );
      return false;
    }

    notify(
      t("Privacy सेटिङ सुरक्षित भयो।", "Privacy setting saved."),
      "success"
    );

    return true;
  }

  function visibilityOptions(selected) {
    const options = [
      {
        value: "everyone",
        label: t("सबैजना", "Everyone")
      },
      {
        value: "friends",
        label: t("साथीहरू", "Friends")
      },
      {
        value: "nobody",
        label: t("कोही पनि होइन", "Nobody")
      }
    ];

    return options.map(option => `
      <option
        value="${option.value}"
        ${selected === option.value ? "selected" : ""}>
        ${escapeHTML(option.label)}
      </option>
    `).join("");
  }

  function privacySelect(key, title, description) {
    const privacy = getPrivacy();
    const selected = privacy[key] || "everyone";

    return `
      <label class="ksk-safe-setting">
        <span class="ksk-safe-setting-copy">
          <strong>${title}</strong>
          <small>${description}</small>
        </span>

        <select
          class="ksk-safe-select"
          data-safe-privacy="${key}">
          ${visibilityOptions(selected)}
        </select>
      </label>
    `;
  }

  function privacyToggle(key, title, description) {
    const privacy = getPrivacy();
    const checked = privacy[key] !== false;

    return `
      <label class="ksk-safe-setting">
        <span class="ksk-safe-setting-copy">
          <strong>${title}</strong>
          <small>${description}</small>
        </span>

        <input
          type="checkbox"
          class="ksk-safe-checkbox"
          data-safe-privacy="${key}"
          ${checked ? "checked" : ""}>
      </label>
    `;
  }

  function renderPrivacy() {
    return `
      <section class="ksk-safe-card">
        <div class="ksk-safe-section-title">
          <h3>${t("गोपनीयता प्राथमिकता", "Privacy preferences")}</h3>
          <p>
            ${t(
              "आफ्नो प्रोफाइल र उपलब्ध जानकारीको दृश्यता छान्नुहोस्।",
              "Choose who can see your profile and available information."
            )}
          </p>
        </div>

        ${privacySelect(
          "profileVisibility",
          t("प्रोफाइल दृश्यता", "Profile visibility"),
          t("तपाईंको प्रोफाइल कसले हेर्न सक्छ", "Who can view your profile")
        )}

        ${privacySelect(
          "showProfilePhoto",
          t("प्रोफाइल फोटो", "Profile photo"),
          t("प्रोफाइल फोटो कसले हेर्न सक्छ", "Who can see your profile photo")
        )}

        ${privacySelect(
          "showAbout",
          t("About जानकारी", "About information"),
          t("About विवरण कसले हेर्न सक्छ", "Who can see your About information")
        )}

        ${privacySelect(
          "lastSeen",
          t("अन्तिम पटक सक्रिय", "Last seen"),
          t("अन्तिम सक्रिय समयको दृश्यता", "Visibility of last active time")
        )}

        ${privacySelect(
          "onlineStatus",
          t("अनलाइन स्थिति", "Online status"),
          t("अनलाइन स्थिति कसले देख्न सक्छ", "Who can see your online status")
        )}

        ${privacyToggle(
          "readReceipts",
          "Read Receipts",
          t("सन्देश पढिएको जानकारी देखाउने प्राथमिकता", "Preference for showing message read status")
        )}

        ${privacyToggle(
          "allowFriendRequests",
          t("साथी अनुरोध", "Friend requests"),
          t("साथी अनुरोध प्राप्त गर्ने प्राथमिकता", "Preference for receiving friend requests")
        )}

        <div class="ksk-safe-note">
          ${t(
            "महत्त्वपूर्ण: यी विकल्पहरू अहिले यस ब्राउजरमा मात्र सुरक्षित हुन्छन्। हालको Prototype मा सबै पोस्ट, प्रोफाइल वा सन्देशमा server-side पहुँच नियन्त्रण लागू भएको छैन।",
            "Important: These preferences are stored only in this browser. Server-side access control is not yet enforced across posts, profiles or messages."
          )}
        </div>
      </section>
    `;
  }

  /* =======================================================
     RESTRICT / MUTE / BLOCK LISTS
  ======================================================= */

  function addLocalUserAction(type, userId) {
    const id = normalizeId(userId);
    const ownId = currentUserId();

    if (!id) {
      return {
        ok: false,
        code: "INVALID_USER_ID"
      };
    }

    if (ownId && id === ownId) {
      return {
        ok: false,
        code: "SELF_ACTION"
      };
    }

    const state = readState();
    const list = type === "restrict"
      ? state.restricted
      : state.muted;

    if (list.some(item => item.userId === id)) {
      return {
        ok: false,
        code: "ALREADY_EXISTS"
      };
    }

    list.push({
      userId: id,
      createdAt: new Date().toISOString()
    });

    if (!saveState(state)) {
      return {
        ok: false,
        code: "SAVE_FAILED"
      };
    }

    return {
      ok: true,
      code: "SAVED"
    };
  }

  function removeLocalUserAction(type, userId) {
    const id = normalizeId(userId);
    if (!id) return false;

    const state = readState();
    const key = type === "restrict"
      ? "restricted"
      : "muted";

    const next = state[key].filter(
      item => item.userId !== id
    );

    if (next.length === state[key].length) {
      return false;
    }

    state[key] = next;
    return saveState(state);
  }

  function renderUserList(type, items) {
    const title = type === "restrict"
      ? t("Restrict गरिएका ID", "Restricted IDs")
      : t("Mute गरिएका ID", "Muted IDs");

    const empty = type === "restrict"
      ? t("कुनै ID Restrict गरिएको छैन।", "No restricted IDs.")
      : t("कुनै ID Mute गरिएको छैन।", "No muted IDs.");

    return `
      <section class="ksk-safe-card">
        <div class="ksk-safe-section-title">
          <h3>${title} (${items.length})</h3>
        </div>

        ${
          items.length
            ? items.map(item => `
                <div class="ksk-safe-list-row">
                  <div class="ksk-safe-list-copy">
                    <strong>${escapeHTML(item.userId)}</strong>
                    <small>${escapeHTML(formatDate(item.createdAt))}</small>
                  </div>

                  <button
                    type="button"
                    class="ksk-safe-button secondary"
                    data-safe-remove="${type}"
                    data-user-id="${escapeHTML(item.userId)}">
                    ${t("हटाउनुहोस्", "Remove")}
                  </button>
                </div>
              `).join("")
            : `<p class="ksk-safe-empty">${empty}</p>`
        }
      </section>
    `;
  }

  function renderBlockedList() {
    const userId = currentUserId();
    const blocked = global.KSKSocialData?.getBlockedUsers?.(userId) || [];

    return `
      <section class="ksk-safe-card">
        <div class="ksk-safe-section-title">
          <h3>
            ${t("Block गरिएका ID", "Blocked IDs")}
            (${blocked.length})
          </h3>
          <p>
            ${t(
              "Block/Unblock Friends प्रणालीको स्थानीय सुविधा हो।",
              "Block and unblock use the existing local Friends system."
            )}
          </p>
        </div>

        ${
          blocked.length
            ? blocked.map(item => `
                <div class="ksk-safe-list-row">
                  <div class="ksk-safe-list-copy">
                    <strong>${escapeHTML(item.userId)}</strong>
                    <small>${escapeHTML(formatDate(item.createdAt))}</small>
                  </div>

                  <button
                    type="button"
                    class="ksk-safe-button secondary"
                    data-safe-unblock="${escapeHTML(item.userId)}">
                    ${t("Unblock", "Unblock")}
                  </button>
                </div>
              `).join("")
            : `<p class="ksk-safe-empty">
                ${t("कुनै Block गरिएको ID छैन।", "No blocked IDs.")}
              </p>`
        }
      </section>
    `;
  }

  /* =======================================================
     REPORTS
  ======================================================= */

  const REPORT_REASONS = [
    ["harassment", "दुव्र्यवहार / Harassment"],
    ["spam", "Spam"],
    ["impersonation", "नक्कली परिचय / Impersonation"],
    ["inappropriate", "अनुचित सामग्री / Inappropriate content"],
    ["privacy", "गोपनीयता उल्लङ्घन / Privacy concern"],
    ["other", "अन्य / Other"]
  ];

  function renderReportForm() {
    return `
      <section class="ksk-safe-card">
        <div class="ksk-safe-section-title">
          <h3>${t("प्रयोगकर्ता Report गर्नुहोस्", "Report a user")}</h3>
          <p>
            ${t(
              "समस्या भएको Profile ID र कारण लेख्नुहोस्।",
              "Enter the profile ID and choose a reason."
            )}
          </p>
        </div>

        <form data-safe-report-form>
          <label class="ksk-safe-field">
            <span>${t("प्रयोगकर्ता Profile ID", "User profile ID")}</span>
            <input
              type="text"
              name="targetUserId"
              maxlength="128"
              autocomplete="off"
              required
              placeholder="${t("Profile ID लेख्नुहोस्", "Enter profile ID")}">
          </label>

          <label class="ksk-safe-field">
            <span>${t("Report को कारण", "Reason for report")}</span>
            <select name="reason" required>
              <option value="">${t("कारण छान्नुहोस्", "Choose a reason")}</option>
              ${REPORT_REASONS.map(item => `
                <option value="${item[0]}">${escapeHTML(item[1])}</option>
              `).join("")}
            </select>
          </label>

          <label class="ksk-safe-field">
            <span>${t("थप विवरण (ऐच्छिक)", "Additional details (optional)")}</span>
            <textarea
              name="details"
              rows="3"
              maxlength="1000"
              placeholder="${t("समस्या छोटकरीमा लेख्नुहोस्", "Briefly describe the concern")}"></textarea>
          </label>

          <button type="submit" class="ksk-safe-button primary">
            ${t("Report सुरक्षित गर्नुहोस्", "Save report")}
          </button>
        </form>

        <div class="ksk-safe-note">
          ${t(
            "यो Report हाल यही ब्राउजरमा मात्र सुरक्षित हुन्छ। व्यवस्थापन टोली वा Server मा पठाइँदैन।",
            "This report is saved only in this browser. It is not sent to a moderation team or server."
          )}
        </div>
      </section>
    `;
  }

  function reasonLabel(reason) {
    const item = REPORT_REASONS.find(row => row[0] === reason);
    return item ? item[1] : t("अन्य", "Other");
  }

  function statusLabel(status) {
    const labels = {
      open: t("नयाँ", "Open"),
      reviewed: t("हेरिएको", "Reviewed"),
      dismissed: t("बन्द गरिएको", "Dismissed")
    };

    return labels[status] || labels.open;
  }

  function renderModeration() {
    const reports = readState().reports.slice().sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    );

    return `
      <section class="ksk-safe-card">
        <div class="ksk-safe-section-title">
          <h3>
            ${t("स्थानीय Moderation Queue", "Local moderation queue")}
            (${reports.length})
          </h3>
          <p>
            ${t(
              "यस ब्राउजरमा सुरक्षित गरिएका Report मात्र यहाँ देखिन्छन्।",
              "Only reports saved in this browser appear here."
            )}
          </p>
        </div>

        ${
          reports.length
            ? reports.map(report => `
                <article class="ksk-safe-report">
                  <div class="ksk-safe-report-head">
                    <strong>${escapeHTML(report.targetUserId)}</strong>
                    <span class="ksk-safe-status ${report.status}">
                      ${escapeHTML(statusLabel(report.status))}
                    </span>
                  </div>

                  <p class="ksk-safe-report-reason">
                    ${escapeHTML(reasonLabel(report.reason))}
                  </p>

                  ${
                    report.details
                      ? `<p class="ksk-safe-report-details">${escapeHTML(report.details)}</p>`
                      : ""
                  }

                  <small>
                    ${escapeHTML(formatDate(report.createdAt))}
                  </small>

                  <div class="ksk-safe-report-actions">
                    <button
                      type="button"
                      class="ksk-safe-button secondary"
                      data-safe-report-status="reviewed"
                      data-report-id="${escapeHTML(report.id)}">
                      ${t("Reviewed", "Reviewed")}
                    </button>

                    <button
                      type="button"
                      class="ksk-safe-button secondary"
                      data-safe-report-status="dismissed"
                      data-report-id="${escapeHTML(report.id)}">
                      ${t("Dismiss", "Dismiss")}
                    </button>

                    <button
                      type="button"
                      class="ksk-safe-button danger"
                      data-safe-delete-report="${escapeHTML(report.id)}">
                      ${t("Delete", "Delete")}
                    </button>
                  </div>
                </article>
              `).join("")
            : `<p class="ksk-safe-empty">
                ${t("अहिलेसम्म कुनै स्थानीय Report छैन।", "There are no local reports yet.")}
              </p>`
        }

        <div class="ksk-safe-note">
          ${t(
            "यो वास्तविक Admin Panel होइन। Report समीक्षा स्थिति यही ब्राउजरमा मात्र परिवर्तन हुन्छ।",
            "This is not a real admin panel. Report review statuses change only in this browser."
          )}
        </div>
      </section>
    `;
  }

  /* =======================================================
     USER CONTROL FORM
  ======================================================= */

  function renderUserControls() {
    return `
      <section class="ksk-safe-card">
        <div class="ksk-safe-section-title">
          <h3>${t("प्रयोगकर्ता नियन्त्रण", "User controls")}</h3>
          <p>
            ${t(
              "स्थानीय Profile ID प्रयोग गरेर Restrict, Mute वा Block गर्नुहोस्।",
              "Use a local profile ID to restrict, mute or block."
            )}
          </p>
        </div>

        <form data-safe-user-form>
          <label class="ksk-safe-field">
            <span>${t("Profile ID", "Profile ID")}</span>
            <input
              type="text"
              name="userId"
              maxlength="128"
              autocomplete="off"
              required
              placeholder="${t("अर्को Profile ID", "Other profile ID")}">
          </label>

          <div class="ksk-safe-action-row">
            <button
              type="submit"
              class="ksk-safe-button secondary"
              data-safe-user-action="restrict">
              ${t("Restrict", "Restrict")}
            </button>

            <button
              type="submit"
              class="ksk-safe-button secondary"
              data-safe-user-action="mute">
              ${t("Mute", "Mute")}
            </button>

            <button
              type="submit"
              class="ksk-safe-button danger"
              data-safe-user-action="block">
              ${t("Block", "Block")}
            </button>
          </div>
        </form>

        <div class="ksk-safe-note">
          ${t(
            "Restrict र Mute ले अहिले स्थानीय सूची मात्र बनाउँछन्; Feed, Comment वा Message स्वतः फिल्टर गर्दैनन्। Block ले Friends प्रणालीको स्थानीय सम्बन्ध रेकर्ड प्रयोग गर्छ।",
            "Restrict and Mute currently create local lists only; they do not automatically filter feeds, comments or messages. Block uses the existing local Friends relationship record."
          )}
        </div>
      </section>
    `;
  }

  /* =======================================================
     STYLES
  ======================================================= */

  function ensureStyles() {
    if ($("#" + STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .ksk-safety-overlay {
        position:fixed;
        inset:0;
        z-index:10050;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:14px;
        background:rgba(0,0,0,.64);
      }

      .ksk-safety-dialog {
        width:min(760px,100%);
        max-height:min(92vh,900px);
        overflow:auto;
        background:var(--color-surface,#fff);
        color:var(--color-text,#222);
        border:1px solid var(--color-border,#ddd);
        border-radius:18px;
        box-shadow:0 18px 60px rgba(0,0,0,.28);
      }

      .ksk-safety-header {
        position:sticky;
        top:0;
        z-index:2;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:15px 17px;
        background:var(--color-surface,#fff);
        border-bottom:1px solid var(--color-border,#ddd);
      }

      .ksk-safety-header h2 {
        margin:0;
        font-size:19px;
      }

      .ksk-safety-close {
        width:38px;
        height:38px;
        border:0;
        border-radius:50%;
        background:var(--color-surface-secondary,#eee);
        color:inherit;
        font-size:24px;
        cursor:pointer;
      }

      .ksk-safety-content {
        display:flex;
        flex-direction:column;
        gap:13px;
        padding:15px;
      }

      .ksk-safe-intro {
        padding:13px;
        border:1px solid var(--color-border,#ddd);
        border-radius:13px;
        background:var(--color-surface-secondary,#f7f7f7);
        font-size:13px;
        line-height:1.6;
      }

      .ksk-safe-tabs {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:6px;
      }

      .ksk-safe-tab {
        min-height:42px;
        padding:8px 5px;
        border:1px solid var(--color-border,#ddd);
        border-radius:10px;
        background:var(--color-surface,#fff);
        color:inherit;
        font-size:13px;
        font-weight:700;
        cursor:pointer;
      }

      .ksk-safe-tab.active {
        border-color:var(--color-primary,#3478f6);
        background:var(--color-primary-soft,#eaf1ff);
        color:var(--color-primary,#245fc0);
      }

      .ksk-safe-card {
        padding:14px;
        border:1px solid var(--color-border,#ddd);
        border-radius:14px;
        background:var(--color-surface,#fff);
      }

      .ksk-safe-section-title h3 {
        margin:0 0 5px;
        font-size:16px;
      }

      .ksk-safe-section-title p {
        margin:0 0 12px;
        color:var(--color-text-secondary,var(--color-muted,#777));
        font-size:13px;
        line-height:1.5;
      }

      .ksk-safe-setting {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 0;
        border-top:1px solid var(--color-border,#ddd);
      }

      .ksk-safe-setting-copy {
        display:flex;
        flex-direction:column;
        gap:4px;
        min-width:0;
      }

      .ksk-safe-setting-copy strong {
        font-size:14px;
      }

      .ksk-safe-setting-copy small {
        color:var(--color-text-secondary,var(--color-muted,#777));
        font-size:12px;
        line-height:1.4;
      }

      .ksk-safe-select,
      .ksk-safe-field input,
      .ksk-safe-field select,
      .ksk-safe-field textarea {
        width:100%;
        min-width:0;
        padding:10px 11px;
        border:1px solid var(--color-border,#ccc);
        border-radius:9px;
        background:var(--color-surface,#fff);
        color:inherit;
        font:inherit;
        font-size:14px;
      }

      .ksk-safe-setting .ksk-safe-select {
        width:145px;
        flex:0 0 145px;
      }

      .ksk-safe-checkbox {
        width:20px;
        height:20px;
        flex:0 0 20px;
        accent-color:var(--color-primary,#3478f6);
      }

      .ksk-safe-field {
        display:flex;
        flex-direction:column;
        gap:6px;
        margin:12px 0;
      }

      .ksk-safe-field > span {
        font-size:13px;
        font-weight:700;
      }

      .ksk-safe-field textarea {
        resize:vertical;
      }

      .ksk-safe-button {
        min-height:38px;
        padding:8px 12px;
        border:1px solid var(--color-border,#ccc);
        border-radius:9px;
        background:var(--color-surface-secondary,#f5f5f5);
        color:inherit;
        font-size:13px;
        font-weight:700;
        cursor:pointer;
      }

      .ksk-safe-button.primary {
        border-color:var(--color-primary,#3478f6);
        background:var(--color-primary,#3478f6);
        color:#fff;
      }

      .ksk-safe-button.danger {
        border-color:#c64a4a;
        color:#b52f2f;
      }

      .ksk-safe-action-row,
      .ksk-safe-report-actions {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
      }

      .ksk-safe-note {
        margin-top:12px;
        padding:10px;
        border-radius:9px;
        background:var(--color-surface-secondary,#f5f5f5);
        color:var(--color-text-secondary,var(--color-muted,#777));
        font-size:12px;
        line-height:1.6;
      }

      .ksk-safe-list-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding:10px 0;
        border-top:1px solid var(--color-border,#ddd);
      }

      .ksk-safe-list-copy {
        display:flex;
        flex-direction:column;
        gap:4px;
        min-width:0;
        overflow-wrap:anywhere;
      }

      .ksk-safe-list-copy strong {
        font-size:13px;
      }

      .ksk-safe-list-copy small,
      .ksk-safe-report small {
        color:var(--color-text-secondary,var(--color-muted,#777));
        font-size:11px;
      }

      .ksk-safe-empty {
        margin:8px 0 0;
        color:var(--color-text-secondary,var(--color-muted,#777));
        font-size:13px;
      }

      .ksk-safe-report {
        padding:12px 0;
        border-top:1px solid var(--color-border,#ddd);
      }

      .ksk-safe-report-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        overflow-wrap:anywhere;
      }

      .ksk-safe-report-head strong {
        font-size:13px;
      }

      .ksk-safe-status {
        padding:4px 8px;
        border-radius:20px;
        background:var(--color-surface-secondary,#eee);
        font-size:11px;
        font-weight:700;
      }

      .ksk-safe-status.reviewed {
        color:#26734d;
      }

      .ksk-safe-status.dismissed {
        color:var(--color-muted,#777);
      }

      .ksk-safe-report-reason {
        margin:8px 0 4px;
        font-size:13px;
        font-weight:700;
      }

      .ksk-safe-report-details {
        margin:5px 0 8px;
        font-size:13px;
        line-height:1.5;
        overflow-wrap:anywhere;
      }

      .ksk-safety-shortcut {
        width:100%;
        display:flex;
        align-items:center;
        gap:12px;
        margin-top:10px;
        padding:13px;
        border:1px solid var(--color-border,#ddd);
        border-radius:12px;
        background:var(--color-surface-secondary,#f7f7f7);
        color:inherit;
        text-align:left;
        cursor:pointer;
      }

      .ksk-safety-shortcut strong {
        display:block;
        font-size:14px;
      }

      .ksk-safety-shortcut small {
        display:block;
        margin-top:3px;
        color:var(--color-text-secondary,var(--color-muted,#777));
        font-size:12px;
      }

      @media(max-width:480px) {
        .ksk-safety-overlay {
          padding:0;
          align-items:flex-end;
        }

        .ksk-safety-dialog {
          width:100%;
          max-height:94vh;
          border-radius:18px 18px 0 0;
        }

        .ksk-safety-content {
          padding:12px;
        }

        .ksk-safe-setting .ksk-safe-select {
          width:125px;
          flex-basis:125px;
        }

        .ksk-safe-tabs {
          gap:4px;
        }

        .ksk-safe-tab {
          font-size:12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  let activeTab = "privacy";

  function render() {
    if (!overlay) return false;

    const state = readState();

    const tabs = [
      ["privacy", t("Privacy", "Privacy")],
      ["controls", t("नियन्त्रण", "Controls")],
      ["reports", t("Report", "Reports")]
    ];

    let content = "";

    if (activeTab === "privacy") {
      content = renderPrivacy();

    } else if (activeTab === "controls") {
      content = `
        ${renderUserControls()}
        ${renderUserList("restrict", state.restricted)}
        ${renderUserList("mute", state.muted)}
        ${renderBlockedList()}
      `;

    } else {
      content = `
        ${renderReportForm()}
        ${renderModeration()}
      `;
    }

    overlay.innerHTML = `
      <section
        class="ksk-safety-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kskSafetyTitle">

        <header class="ksk-safety-header">
          <h2 id="kskSafetyTitle">
            🛡️ ${t("Safety & Privacy Center", "Safety & Privacy Center")}
          </h2>

          <button
            type="button"
            class="ksk-safety-close"
            data-safe-close
            aria-label="${t("बन्द गर्नुहोस्", "Close")}">
            ×
          </button>
        </header>

        <div class="ksk-safety-content">
          <div class="ksk-safe-intro">
            ${t(
              "आफ्नो गोपनीयता प्राथमिकता व्यवस्थापन गर्नुहोस्, प्रयोगकर्ता नियन्त्रण गर्नुहोस् र समस्या Report गर्नुहोस्। अहिलेका Safety र Moderation रेकर्ड यही ब्राउजरमा मात्र सुरक्षित हुन्छन्।",
              "Manage privacy preferences, user controls and reports. Safety and moderation records currently remain in this browser only."
            )}
          </div>

          <nav class="ksk-safe-tabs" aria-label="Safety sections">
            ${tabs.map(tab => `
              <button
                type="button"
                class="ksk-safe-tab ${activeTab === tab[0] ? "active" : ""}"
                data-safe-tab="${tab[0]}">
                ${tab[1]}
              </button>
            `).join("")}
          </nav>

          ${content}
        </div>
      </section>
    `;

    return true;
  }

  /* =======================================================
     OPEN / CLOSE
  ======================================================= */

  function open() {
    ensureStyles();

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "ksk-safety-overlay";
      overlay.id = "kskSafetyOverlay";
      overlay.setAttribute("aria-hidden", "false");

      document.body.appendChild(overlay);

      overlay.addEventListener("click", handleClick);
      overlay.addEventListener("change", handleChange);
      overlay.addEventListener("submit", handleSubmit);
    }

    activeTab = "privacy";
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");

    render();

    $(" [data-safe-close]".trim(), overlay)?.focus();

    return true;
  }

  function close() {
    if (!overlay) return false;

    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");

    return true;
  }

  /* =======================================================
     ACTION HANDLERS
  ======================================================= */

  function handleClick(event) {
    const closeButton = event.target.closest("[data-safe-close]");

    if (closeButton || event.target === overlay) {
      close();
      return;
    }

    const tab = event.target.closest("[data-safe-tab]");

    if (tab) {
      activeTab = tab.dataset.safeTab;
      render();
      return;
    }

    const remove = event.target.closest("[data-safe-remove]");

    if (remove) {
      const type = remove.dataset.safeRemove;
      const id = remove.dataset.userId;

      if (removeLocalUserAction(type, id)) {
        notify(
          t("स्थानीय सूचीबाट हटाइयो।", "Removed from local list."),
          "success"
        );
        render();
      }
      return;
    }

    const unblock = event.target.closest("[data-safe-unblock]");

    if (unblock) {
      const userId = unblock.dataset.safeUnblock;
      const ownId = currentUserId();

      const result = global.KSKSocialData?.unblockUser?.(
        ownId,
        userId
      );

      if (result?.ok) {
        notify(
          t("स्थानीय रूपमा Unblock भयो।", "Unblocked locally."),
          "success"
        );
        render();
      } else {
        notify(
          t("Unblock गर्न सकिएन।", "Could not unblock this ID."),
          "error"
        );
      }
      return;
    }

    const statusButton = event.target.closest(
      "[data-safe-report-status]"
    );

    if (statusButton) {
      updateReportStatus(
        statusButton.dataset.reportId,
        statusButton.dataset.safeReportStatus
      );
      return;
    }

    const deleteReport = event.target.closest(
      "[data-safe-delete-report]"
    );

    if (deleteReport) {
      deleteLocalReport(deleteReport.dataset.safeDeleteReport);
    }
  }

  function handleChange(event) {
    const control = event.target.closest("[data-safe-privacy]");

    if (!control) return;

    const key = control.dataset.safePrivacy;
    const value = control.type === "checkbox"
      ? control.checked
      : control.value;

    updatePrivacy(key, value);
  }

  function handleSubmit(event) {
    const userForm = event.target.closest("[data-safe-user-form]");

    if (userForm) {
      event.preventDefault();

      const formData = new FormData(userForm);
      const userId = normalizeId(formData.get("userId"));

      const submitter = event.submitter;
      const action = submitter?.dataset.safeUserAction || "";

      if (!userId) {
        notify(
          t("मान्य Profile ID लेख्नुहोस्।", "Enter a valid profile ID."),
          "error"
        );
        return;
      }

      if (action === "restrict" || action === "mute") {
        const result = addLocalUserAction(action, userId);

        if (result.ok) {
          notify(
            action === "restrict"
              ? t("ID स्थानीय रूपमा Restrict सूचीमा थपियो।", "ID added to the local restricted list.")
              : t("ID स्थानीय रूपमा Mute सूचीमा थपियो।", "ID added to the local muted list."),
            "success"
          );
          render();
        } else {
          notify(
            result.code === "ALREADY_EXISTS"
              ? t("यो ID सूचीमा पहिल्यै छ।", "This ID is already on the list.")
              : t("यो कार्य गर्न सकिएन।", "Could not complete this action."),
            "error"
          );
        }
        return;
      }

      if (action === "block") {
        const ownId = currentUserId();

        if (!ownId) {
          notify(
            t("स्थानीय Profile ID उपलब्ध छैन।", "Local profile ID is unavailable."),
            "error"
          );
          return;
        }

        const result = global.KSKSocialData?.blockUser?.(
          ownId,
          userId
        );

        if (result?.ok) {
          notify(
            t("प्रयोगकर्ता स्थानीय रूपमा Block भयो।", "User blocked locally."),
            "success"
          );
          render();
        } else {
          notify(
            t("Block गर्न सकिएन। ID जाँच गर्नुहोस्।", "Could not block this ID. Check the ID."),
            "error"
          );
        }
      }

      return;
    }

    const reportForm = event.target.closest("[data-safe-report-form]");

    if (reportForm) {
      event.preventDefault();

      const formData = new FormData(reportForm);
      const targetUserId = normalizeId(formData.get("targetUserId"));
      const reason = String(formData.get("reason") || "");
      const details = String(formData.get("details") || "")
        .trim()
        .slice(0, 1000);

      const ownId = currentUserId();

      if (!targetUserId) {
        notify(
          t("मान्य Profile ID लेख्नुहोस्।", "Enter a valid profile ID."),
          "error"
        );
        return;
      }

      if (ownId && targetUserId === ownId) {
        notify(
          t("आफैँलाई Report गर्न मिल्दैन।", "You cannot report yourself."),
          "error"
        );
        return;
      }

      if (!REPORT_REASONS.some(item => item[0] === reason)) {
        notify(
          t("Report को कारण छान्नुहोस्।", "Choose a report reason."),
          "error"
        );
        return;
      }

      const state = readState();

      state.reports.unshift({
        id: makeId("report"),
        targetUserId,
        reporterUserId: ownId,
        reason,
        details,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (saveState(state)) {
        notify(
          t("Report यस ब्राउजरमा सुरक्षित भयो।", "Report saved in this browser."),
          "success"
        );
        render();
      }
    }
  }

  /* =======================================================
     REPORT MANAGEMENT
  ======================================================= */

  function updateReportStatus(reportId, status) {
    if (!["reviewed", "dismissed"].includes(status)) {
      return false;
    }

    const state = readState();
    const report = state.reports.find(
      item => item.id === reportId
    );

    if (!report) return false;

    report.status = status;
    report.updatedAt = new Date().toISOString();

    if (saveState(state)) {
      notify(
        t("स्थानीय Report स्थिति अपडेट भयो।", "Local report status updated."),
        "success"
      );
      render();
      return true;
    }

    return false;
  }

  function deleteLocalReport(reportId) {
    const state = readState();
    const next = state.reports.filter(
      item => item.id !== reportId
    );

    if (next.length === state.reports.length) {
      return false;
    }

    state.reports = next;

    if (saveState(state)) {
      notify(
        t("स्थानीय Report हटाइयो।", "Local report deleted."),
        "success"
      );
      render();
      return true;
    }

    return false;
  }

  /* =======================================================
     SETTINGS MENU SHORTCUT
     Add Safety Center entry after Settings UI renders.
  ======================================================= */

  function injectSettingsShortcut() {
    const body = $("#settingsBody");
    if (!body) return false;

    const menu = $(".ksk-settings-menu", body);

    if (menu && !$("#kskSafetySettingsShortcut", menu)) {
      const button = document.createElement("button");

      button.type = "button";
      button.id = "kskSafetySettingsShortcut";
      button.className = "ksk-safety-shortcut";
      button.setAttribute("data-open-safety-center", "");

      button.innerHTML = `
        <span aria-hidden="true" style="font-size:23px">🛡️</span>
        <span>
          <strong>${t("Safety & Privacy Center", "Safety & Privacy Center")}</strong>
          <small>${t("Report, Restrict, Mute र Privacy व्यवस्थापन", "Manage reports, restrictions, mutes and privacy")}</small>
        </span>
        <span aria-hidden="true" style="margin-left:auto">›</span>
      `;

      menu.appendChild(button);
      return true;
    }

    return false;
  }

  function handleDocumentClick(event) {
    const button = event.target.closest("[data-open-safety-center]");

    if (!button) return;

    event.preventDefault();

    global.KSKSettingsPage?.close?.();
    open();
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && overlay?.style.display !== "none") {
      close();
    }
  }

  function handleStorage(event) {
    if (event.key === STORAGE_KEY && overlay?.style.display !== "none") {
      render();
    }
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function initialize() {
    if (initialized) return true;

    initialized = true;

    ensureStyles();

    const body = $("#settingsBody");

    if (body && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        injectSettingsShortcut();
      });

      observer.observe(body, {
        childList: true,
        subtree: true
      });

      injectSettingsShortcut();
    }

    document.addEventListener(
      "click",
      handleDocumentClick
    );

    document.addEventListener(
      "keydown",
      handleKeydown
    );

    global.addEventListener(
      "storage",
      handleStorage
    );

    global.addEventListener(
      "ksk:safety-change",
      () => {
        if (overlay?.style.display !== "none") {
          render();
        }
      }
    );

    return true;
  }

  const api = Object.freeze({
    initialize,
    open,
    close,
    render,
    getState: readState
  });

  global.KSKSafetyPage = api;

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
