"use strict";

/*
 * MERO SANSAR — SUPABASE CONNECTED PROFILE PAGE
 */

(function (global) {
  "use strict";

  if (global.KSKProfilePage) return;

  const VALID_TABS = new Set(["posts", "photos", "about"]);
  const STYLE_ID = "ksk-profile-upgrade-styles";

  let remoteProfile = null;
  let remoteLoadPromise = null;
  let viewingUserId = "";
  let profilePosts = [];
  let profilePostsPromise = null;
  let profileRequestToken = 0;
  let profileLoadState = "idle";

  /* BIRTHDAY + WORK/STUDY STATE */

  let birthdaySettings = null;
  let profileBirthday = null;
  let profileExperiences = [];
  let profileDetailsPromise = null;
  let profileDetailsRequestToken = 0;
  let profileDetailsLoadedFor = "";

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function t(nepali, english) {
    return isEnglish() ? english : nepali;
  }

  function escapeHTML(value) {
    if (global.KSKUtils?.escapeHTML) {
      return global.KSKUtils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  /* STYLES */

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .profile-section {
        width:100%;
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:14px;
      }

      .profile-section.is-public-profile .profile-main-actions,
      .profile-section.is-public-profile .profile-tools-card {
        display:none !important;
      }

      .profile-section.is-public-profile .profile-avatar,
      .profile-section.is-public-profile .ksk-profile-cover {
        pointer-events:none;
        cursor:default;
      }

      .profile-section .profile-card {
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:11px;
        min-width:0;
        padding:22px 16px 18px;
        text-align:center;
        overflow:hidden;
      }

      .profile-section .ksk-profile-cover {
        width:100%;
        height:150px;
        position:relative;
        overflow:hidden;
        border-radius:14px;
        background:linear-gradient(135deg,#243b55,#141e30);
        cursor:pointer;
        margin-bottom:2px;
        display:block;
        outline-offset:3px;
      }

      .profile-section .ksk-profile-cover:focus-visible,
      .profile-section .profile-avatar:focus-visible {
        outline:3px solid var(--color-primary);
      }

      .profile-section .ksk-profile-cover-empty {
        width:100%;
        height:100%;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        color:#fff;
        font-size:30px;
      }

      .profile-section .ksk-profile-cover-label {
        font-size:12px;
        font-weight:750;
        letter-spacing:.2px;
      }

      .profile-section .ksk-profile-cover img {
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }

      .profile-section .profile-card .profile-avatar {
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        cursor:pointer;
        position:relative;
        width:max-content;
        max-width:100%;
        margin:0 auto 4px;
        padding:0 !important;
        background:transparent !important;
        border:0 !important;
        border-radius:0 !important;
        box-shadow:none !important;
        outline-offset:4px;
      }

      .profile-section .profile-avatar .avatar {
        width:104px !important;
        height:104px !important;
        min-width:104px;
        min-height:104px;
        flex:0 0 104px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:50% !important;
        font-size:34px;
        border:4px solid var(--color-surface);
        box-shadow:0 0 0 2px var(--color-primary-soft);
        box-sizing:border-box;
      }

      .profile-section .profile-avatar .avatar img,
      .profile-section .profile-avatar img {
        width:100%;
        height:100%;
        display:block;
        object-fit:cover;
        border-radius:50% !important;
      }

      /* Hide camera icons and the photo-change hint.
         The photo click handlers remain active. */

      .profile-section .ksk-profile-photo-hint,
      .profile-section .ksk-profile-avatar-hint,
      .profile-section .profile-avatar-label {
        display:none !important;
      }

      .profile-section .profile-card h2 {
        max-width:100%;
        margin:2px 0 0;
        color:var(--color-text);
        font-size:22px;
        font-weight:850;
        line-height:1.3;
        overflow-wrap:anywhere;
      }

      .profile-section .profile-card > p {
        max-width:560px;
        margin:0;
        color:var(--color-text-secondary);
        font-size:13px;
        line-height:1.55;
        overflow-wrap:anywhere;
      }

      .profile-section .profile-post-count {
        color:var(--color-muted);
        font-size:12px;
        font-weight:750;
      }

      /* EDIT PROFILE + SETTINGS */

      .profile-section .profile-main-actions {
        width:min(100%,480px);
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        margin-top:7px;
      }

      .profile-section .profile-action-btn {
        min-width:0;
        min-height:50px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        padding:11px 12px;
        border:1px solid var(--color-border);
        border-radius:14px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
        transition:transform .18s ease, border-color .18s ease;
      }

      .profile-section .profile-action-btn:active,
      .profile-section .profile-tool-grid button:active {
        transform:scale(.98);
      }

      .profile-section .profile-action-btn.primary {
        border-color:transparent;
        background:var(--color-primary);
        color:#fff;
        box-shadow:0 5px 14px rgba(37,99,235,.18);
      }

      .profile-section .profile-action-btn span:first-child {
        font-size:16px;
      }

      /* PROFILE TOOLS */

      .profile-section .profile-tools-card {
        min-width:0;
        padding:16px;
        border:1px solid var(--color-border);
        border-radius:17px;
        background:var(--color-surface);
      }

      .profile-section .profile-tools-heading {
        display:flex;
        align-items:flex-start;
        gap:10px;
        margin:0 0 14px;
      }

      .profile-section .profile-tools-heading::before {
        content:"🧰";
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:grid;
        place-items:center;
        border-radius:11px;
        background:var(--color-surface-secondary);
        font-size:17px;
      }

      .profile-section .profile-tools-heading h3 {
        margin:0;
        color:var(--color-text);
        font-size:15px;
        font-weight:850;
      }

      .profile-section .profile-tools-heading p {
        margin:4px 0 0;
        color:var(--color-muted);
        font-size:11px;
        line-height:1.5;
      }

      .profile-section .profile-tool-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
      }

      .profile-section .profile-tool-grid button {
        min-width:0;
        min-height:58px;
        display:flex;
        align-items:center;
        gap:9px;
        padding:11px 12px;
        border:1px solid var(--color-border);
        border-radius:13px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:12px;
        font-weight:750;
        line-height:1.4;
        text-align:left;
        overflow-wrap:anywhere;
        cursor:pointer;
        transition:transform .18s ease, border-color .18s ease, background .18s ease;
      }

      .profile-section .profile-tool-grid button:hover {
        border-color:var(--color-primary);
        background:var(--color-primary-soft);
      }

      .profile-section .profile-tool-grid button:focus-visible,
      .profile-section .profile-action-btn:focus-visible {
        outline:2px solid var(--color-primary);
        outline-offset:3px;
      }

      .profile-section .profile-tool-note {
        margin:12px 2px 0;
        color:var(--color-muted);
        font-size:10px;
        line-height:1.5;
      }

      /* PROFILE TABS */

      .profile-section .profile-tabs {
        width:100%;
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:5px;
        padding:5px;
        border:1px solid var(--color-border);
        border-radius:13px;
        background:var(--color-surface);
      }

      .profile-section .profile-tab {
        min-width:0;
        min-height:42px;
        padding:8px 5px;
        border:1px solid transparent;
        border-radius:10px;
        background:transparent;
        color:var(--color-muted);
        font-size:12px;
        font-weight:750;
        cursor:pointer;
      }

      .profile-section .profile-tab.is-active {
        border-color:var(--color-primary);
        background:var(--color-primary-soft);
        color:var(--color-primary);
      }

      /* FACEBOOK STYLE — AT A GLANCE */

      .profile-section .profile-at-glance {
        width:100%;
        min-width:0;
        padding:16px;
        border:1px solid var(--color-border);
        border-radius:16px;
        background:var(--color-surface);
      }

      .profile-section .profile-at-glance-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:12px;
      }

      .profile-section .profile-at-glance-heading h3 {
        margin:0;
        color:var(--color-text);
        font-size:17px;
        font-weight:850;
      }

      .profile-section .profile-at-glance-see-all {
        border:0;
        padding:6px 0 6px 8px;
        background:transparent;
        color:var(--color-primary);
        font:inherit;
        font-size:12px;
        font-weight:750;
        cursor:pointer;
      }

      .profile-section .profile-glance-row {
        display:flex;
        align-items:flex-start;
        gap:13px;
        padding:12px 0;
        border-bottom:1px solid var(--color-border);
      }

      .profile-section .profile-glance-row:last-child {
        border-bottom:0;
      }

      .profile-section .profile-glance-icon {
        width:34px;
        height:34px;
        flex:0 0 34px;
        display:grid;
        place-items:center;
        color:var(--color-text);
        font-size:23px;
      }

      .profile-section .profile-glance-content {
        min-width:0;
        flex:1;
        color:var(--color-text);
        font-size:13px;
        line-height:1.55;
        overflow-wrap:anywhere;
      }

      .profile-section .profile-glance-content strong {
        font-weight:800;
      }

      .profile-section .profile-glance-content small {
        display:block;
        margin-top:2px;
        color:var(--color-muted);
        font-size:11px;
      }

      .profile-section .profile-glance-edit {
        flex:0 0 auto;
        border:0;
        padding:5px;
        background:transparent;
        color:var(--color-primary);
        font:inherit;
        font-size:11px;
        font-weight:750;
        cursor:pointer;
      }

      .profile-section .profile-glance-empty {
        padding:12px 0;
        color:var(--color-muted);
        font-size:12px;
      }

      .profile-section .profile-tab-panel {
        width:100%;
        min-width:0;
      }

      .profile-section .profile-posts {
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      /* BIRTHDAY + WORK/STUDY */

      .profile-section .profile-detail-card {
        min-width:0;
        padding:15px;
        border:1px solid var(--color-border);
        border-radius:15px;
        background:var(--color-surface);
      }

      .profile-section .profile-detail-heading {
        display:flex;
        align-items:center;
        gap:9px;
        margin-bottom:12px;
        color:var(--color-text);
        font-size:14px;
        font-weight:850;
      }

      .profile-section .profile-detail-heading > span {
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        border-radius:10px;
        background:var(--color-surface-secondary);
        font-size:17px;
      }

      .profile-section .profile-detail-value {
        color:var(--color-text);
        font-size:15px;
        font-weight:750;
      }

      .profile-section .profile-detail-meta {
        margin-top:5px;
        color:var(--color-muted);
        font-size:11px;
        line-height:1.5;
      }

      .profile-section .profile-detail-empty {
        margin:0;
        color:var(--color-muted);
        font-size:12px;
      }

      .profile-section .profile-experience-item {
        display:flex;
        align-items:flex-start;
        gap:11px;
        padding:12px 0;
        border-bottom:1px solid var(--color-border);
      }

      .profile-section .profile-experience-item:last-child {
        border-bottom:0;
      }

      .profile-section .profile-experience-icon {
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:grid;
        place-items:center;
        border-radius:10px;
        background:var(--color-surface-secondary);
      }

      .profile-section .profile-experience-content {
        min-width:0;
        flex:1;
      }

      .profile-section .profile-experience-content small {
        display:block;
        margin-bottom:3px;
        color:var(--color-muted);
        font-size:10px;
      }

      .profile-section .profile-experience-content strong {
        display:block;
        color:var(--color-text);
        font-size:14px;
        overflow-wrap:anywhere;
      }

      .profile-section .profile-experience-content p {
        margin:3px 0 0;
        color:var(--color-text-secondary);
        font-size:12px;
        overflow-wrap:anywhere;
      }

      .profile-section .profile-experience-description {
        margin-top:7px;
        color:var(--color-text-secondary);
        font-size:12px;
        line-height:1.5;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
      }

      /* BIRTHDAY + EXPERIENCE EDIT FORMS */

      .profile-section .profile-detail-actions {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        margin-left:auto;
      }

      .profile-section .profile-detail-btn {
        min-height:34px;
        padding:7px 11px;
        border:1px solid var(--color-border);
        border-radius:9px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:11px;
        font-weight:750;
        cursor:pointer;
      }

      .profile-section .profile-detail-btn.primary {
        border-color:var(--color-primary);
        background:var(--color-primary);
        color:#fff;
      }

      .profile-section .profile-detail-btn.danger {
        color:#dc2626;
      }

      .profile-section .profile-detail-heading {
        flex-wrap:wrap;
      }

      .profile-section .profile-experience-actions {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        margin-top:9px;
      }

      #ksk-profile-details-dialog {
        width:min(94%,520px);
        max-width:520px;
        max-height:88vh;
        padding:0;
        overflow:auto;
        border:1px solid var(--color-border);
        border-radius:18px;
        background:var(--color-surface);
        color:var(--color-text);
        box-shadow:0 20px 70px rgba(0,0,0,.3);
      }

      #ksk-profile-details-dialog::backdrop {
        background:rgba(0,0,0,.62);
        backdrop-filter:blur(3px);
      }

      #ksk-profile-details-dialog .profile-dialog-header {
        position:sticky;
        top:0;
        z-index:2;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:16px;
        border-bottom:1px solid var(--color-border);
        background:var(--color-surface);
      }

      #ksk-profile-details-dialog .profile-dialog-header strong {
        font-size:16px;
        font-weight:850;
      }

      #ksk-profile-details-dialog .profile-dialog-close {
        width:34px;
        height:34px;
        border:0;
        border-radius:9px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font-size:20px;
        cursor:pointer;
      }

      #ksk-profile-details-dialog .profile-dialog-body {
        padding:16px;
      }

      #ksk-profile-details-dialog .profile-form {
        display:flex;
        flex-direction:column;
        gap:13px;
      }

      #ksk-profile-details-dialog .profile-form-field {
        display:flex;
        flex-direction:column;
        gap:6px;
      }

      #ksk-profile-details-dialog .profile-form-field label {
        color:var(--color-text);
        font-size:12px;
        font-weight:750;
      }

      #ksk-profile-details-dialog .profile-form-field input,
      #ksk-profile-details-dialog .profile-form-field select,
      #ksk-profile-details-dialog .profile-form-field textarea {
        width:100%;
        min-width:0;
        min-height:44px;
        padding:10px 12px;
        border:1px solid var(--color-border);
        border-radius:10px;
        outline:none;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:13px;
        box-sizing:border-box;
      }

      #ksk-profile-details-dialog .profile-form-field textarea {
        min-height:90px;
        resize:vertical;
      }

      #ksk-profile-details-dialog .profile-form-field input:focus,
      #ksk-profile-details-dialog .profile-form-field select:focus,
      #ksk-profile-details-dialog .profile-form-field textarea:focus {
        border-color:var(--color-primary);
      }

      #ksk-profile-details-dialog .profile-form-check {
        display:flex;
        align-items:center;
        gap:9px;
        color:var(--color-text);
        font-size:12px;
        font-weight:650;
      }

      #ksk-profile-details-dialog .profile-form-check input {
        width:18px;
        height:18px;
        accent-color:var(--color-primary);
      }

      #ksk-profile-details-dialog .profile-form-actions {
        display:flex;
        gap:9px;
        margin-top:5px;
      }

      #ksk-profile-details-dialog .profile-form-actions button {
        flex:1;
        min-height:45px;
        border:1px solid var(--color-border);
        border-radius:11px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
      }

      #ksk-profile-details-dialog .profile-form-actions button[type="submit"] {
        border-color:var(--color-primary);
        background:var(--color-primary);
        color:#fff;
      }

      #ksk-profile-details-dialog .profile-form-actions button:disabled {
        opacity:.55;
        cursor:wait;
      }

      /* ABOUT */

      .profile-section .profile-about-card {
        min-width:0;
        padding:15px;
      }

      .profile-section .profile-about-list {
        display:flex;
        flex-direction:column;
      }

      .profile-section .profile-about-item {
        display:flex;
        align-items:flex-start;
        gap:12px;
        padding:13px 2px;
        border-bottom:1px solid var(--color-border);
      }

      .profile-section .profile-about-item:last-child {
        border-bottom:0;
      }

      .profile-section .profile-about-icon {
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:grid;
        place-items:center;
        border-radius:11px;
        background:var(--color-surface-secondary);
      }

      .profile-section .profile-about-item > div {
        min-width:0;
        flex:1;
      }

      .profile-section .profile-about-item small {
        display:block;
        margin-bottom:3px;
        color:var(--color-muted);
        font-size:11px;
        font-weight:750;
      }

      .profile-section .profile-about-item p {
        margin:0;
        color:var(--color-text);
        font-size:14px;
        overflow-wrap:anywhere;
        white-space:pre-wrap;
      }

      @media(max-width:480px) {
        .profile-section {
          gap:11px;
        }

        .profile-section .profile-card {
          padding:18px 12px 15px;
        }

        .profile-section .profile-avatar .avatar {
          width:88px !important;
          height:88px !important;
          min-width:88px;
          min-height:88px;
          flex-basis:88px;
        }

        .profile-section .profile-card h2 {
          font-size:19px;
        }

        .profile-section .profile-tools-card {
          padding:12px;
        }
      }

      @media(max-width:340px) {
        .profile-section .profile-tool-grid {
          grid-template-columns:1fr;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  /* BIRTHDAY API */

  async function getMyBirthdaySettings() {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.getMyBirthdaySettings !== "function") {
      throw new Error("Birthday settings API उपलब्ध छैन।");
    }

    const result = await api.getMyBirthdaySettings();
    birthdaySettings = result || null;

    return birthdaySettings;
  }

  async function updateMyBirthdaySettings(settings) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.updateMyBirthdaySettings !== "function") {
      throw new Error("Birthday update API उपलब्ध छैन।");
    }

    const result = await api.updateMyBirthdaySettings(settings);

    birthdaySettings = await getMyBirthdaySettings();

    refreshProfilePage();

    return result;
  }

  async function getProfileBirthday(userId) {
    const id = String(userId || "").trim();

    if (!id) return null;

    const api = global.KSKSupabaseProfile;

    if (typeof api?.getProfileBirthday !== "function") {
      throw new Error("Profile birthday API उपलब्ध छैन।");
    }

    profileBirthday = await api.getProfileBirthday(id);

    return profileBirthday;
  }

  /* WORK / STUDY EXPERIENCE API */

  async function getMyExperiences() {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.getMyExperiences !== "function") {
      throw new Error("Experience API उपलब्ध छैन।");
    }

    const result = await api.getMyExperiences();

    profileExperiences = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];

    return profileExperiences;
  }

  async function getProfileExperiences(userId) {
    const id = String(userId || "").trim();

    if (!id) return [];

    const api = global.KSKSupabaseProfile;

    if (typeof api?.getProfileExperiences !== "function") {
      throw new Error("Profile experience API उपलब्ध छैन।");
    }

    const result = await api.getProfileExperiences(id);

    profileExperiences = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];

    return profileExperiences;
  }

  async function addMyExperience(values) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.addMyExperience !== "function") {
      throw new Error("Add experience API उपलब्ध छैन।");
    }

    const result = await api.addMyExperience(values);

    await getMyExperiences();
    refreshProfilePage();

    return result;
  }

  async function updateMyExperience(id, values) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.updateMyExperience !== "function") {
      throw new Error("Update experience API उपलब्ध छैन।");
    }

    const result = await api.updateMyExperience(id, values);

    await getMyExperiences();
    refreshProfilePage();

    return result;
  }

  async function deleteMyExperience(id) {
    const api = global.KSKSupabaseProfile;

    if (typeof api?.deleteMyExperience !== "function") {
      throw new Error("Delete experience API उपलब्ध छैन।");
    }

    const result = await api.deleteMyExperience(id);

    await getMyExperiences();
    refreshProfilePage();

    return result;
  }

  /* LOAD BIRTHDAY + WORK/STUDY DETAILS */

  async function loadProfileDetails(userId, ownProfile) {
    const profileKey = ownProfile
      ? "my-profile"
      : `user:${String(userId || "").trim()}`;

    if (!ownProfile && !userId) return;

    // एउटै प्रोफाइलको डेटा बारम्बार लोड हुन नदिने
    if (profileDetailsLoadedFor === profileKey) return;

    // अघिल्लो request चलिरहेको छ भने दोहोर्‍याएर नचलाउने
    if (profileDetailsPromise) return profileDetailsPromise;

    profileDetailsLoadedFor = profileKey;

    const requestToken = ++profileDetailsRequestToken;

    profileDetailsPromise = (async () => {
      try {
        const results = ownProfile
          ? await Promise.allSettled([
              getMyBirthdaySettings(),
              getMyExperiences()
            ])
          : await Promise.allSettled([
              getProfileBirthday(userId),
              getProfileExperiences(userId)
            ]);

        if (requestToken !== profileDetailsRequestToken) return;

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.warn(
              index === 0
                ? "Birthday details could not load."
                : "Work/Study details could not load.",
              result.reason
            );
          }
        });
      } finally {
        if (requestToken === profileDetailsRequestToken) {
          profileDetailsPromise = null;
          refreshProfilePage();
        }
      }
    })();

    return profileDetailsPromise;
  }

  /* PROFILE DATA */

  function getLocalProfile() {
    return global.KSKData?.getProfile?.() || {};
  }

  function getProfile() {
    if (remoteProfile) return remoteProfile;
    return viewingUserId ? {} : getLocalProfile();
  }

  function getCurrentUserId() {
    return String(
      global.KSKSupabaseAuth?.getUser?.()?.id || ""
    ).trim();
  }

  function isOwnProfile(user = getProfile()) {
    const currentId = getCurrentUserId();
    const profileId = String(user?.id || user?.userId || "").trim();

    if (!currentId) return !viewingUserId;

    return !viewingUserId ||
      viewingUserId === currentId ||
      (profileId && profileId === currentId);
  }

  function normalizeRemoteProfile(profile) {
    if (!profile) return null;

    const firstName = String(profile.firstName || "").trim();
    const lastName = String(profile.lastName || "").trim();

    const fullName = [firstName, lastName]
      .filter(Boolean)
      .join(" ");

    return {
      ...profile,
      name: String(profile.name || fullName || "").trim(),
      bio: profile.bio || "",
      location: profile.location || "",
      avatar: profile.avatar || "",
      cover: profile.cover || "",
      joinedAt: profile.createdAt || ""
    };
  }

  function saveRemoteProfileToCache(profile) {
    const current = getLocalProfile();

    const values = {
      name: profile.name || "",
      bio: profile.bio || "",
      location: profile.location || "",
      avatar: profile.avatar || "",
      cover: profile.cover || ""
    };

    const changed = Object.keys(values).some(
      key => String(current[key] || "") !== String(values[key] || "")
    );

    if (!changed) return false;

    global.KSKData?.saveProfile?.(values);
    return true;
  }

  function refreshProfilePage() {
    if (global.KSKNavigation?.getCurrentPage?.() === "profile") {
      global.KSKNavigation?.refreshCurrentPage?.();
    }

    global.KSKProfileMediaUI?.refresh?.();
  }

  /* LOAD PROFILE FROM SUPABASE */

  function loadSupabaseProfile() {
    if (remoteLoadPromise) return remoteLoadPromise;

    const api = global.KSKSupabaseProfile;
    if (!api) return Promise.resolve(null);

    const requestedId = String(viewingUserId || "").trim();
    const currentId = getCurrentUserId();

    const requestToken = ++profileRequestToken;

    const isOtherUser = Boolean(
      requestedId && requestedId !== currentId
    );

    const loader = isOtherUser
      ? api.getProfileById
      : api.getMyProfile;

    if (typeof loader !== "function") {
      return Promise.resolve(null);
    }

    profileLoadState = "loading";

    remoteLoadPromise = Promise.resolve(
      isOtherUser
        ? loader.call(api, requestedId)
        : loader.call(api)
    )
      .then(async result => {
        if (requestToken !== profileRequestToken) return null;

        if (!result) {
          remoteProfile = null;
          profilePosts = [];
          profileLoadState = "not-found";
          remoteLoadPromise = null;
          refreshProfilePage();
          return null;
        }

        remoteProfile = normalizeRemoteProfile(result);
        profileLoadState = "loaded";

        if (isOtherUser) {
          await loadProfilePosts(requestedId, requestToken);
        } else {
          saveRemoteProfileToCache(remoteProfile);
        }

        if (requestToken === profileRequestToken) {
          refreshProfilePage();
        }

        console.info("KSK Profile: Supabase profile loaded.");

        return remoteProfile;
      })
      .catch(error => {
        if (requestToken === profileRequestToken) {
          remoteLoadPromise = null;
          profileLoadState = "error";
          refreshProfilePage();
        }

        console.warn(
          "KSK Profile: Supabase profile could not be loaded.",
          error
        );

        return null;
      });

    return remoteLoadPromise;
  }

  /* LOAD SELECTED USER'S POSTS */

  async function loadProfilePosts(userId, requestToken) {
    const api = global.KSKSupabasePosts;

    if (!api?.getFeed || !userId) {
      profilePosts = [];
      return [];
    }

    if (profilePostsPromise) {
      return profilePostsPromise;
    }

    profilePostsPromise = api.getFeed({ limit: 100 })
      .then(response => {
        if (requestToken !== profileRequestToken) return [];

        if (!response?.ok) {
          throw new Error(
            response?.message || "प्रोफाइलका पोस्ट लोड भएनन्।"
          );
        }

        const rows = Array.isArray(response.data)
          ? response.data
          : [];

        profilePosts = rows.filter(post =>
          String(post?.authorId || "") === String(userId)
        );

        return profilePosts;
      })
      .catch(error => {
        console.warn(
          "Profile posts could not be loaded.",
          error
        );

        profilePosts = [];
        return [];
      })
      .finally(() => {
        profilePostsPromise = null;
      });

    return profilePostsPromise;
  }

  /* NAVIGATION PROFILE ID */

  function handleProfileNavigation(event) {
    const detail = event?.detail || {};

    if (detail.page !== "profile") return;

    const nextId = String(
      detail.options?.profileUserId || ""
    ).trim();

    if (nextId === viewingUserId) return;

    viewingUserId = nextId;
    remoteProfile = null;
    remoteLoadPromise = null;
    profilePosts = [];
    profilePostsPromise = null;
    profileLoadState = "idle";
    profileRequestToken += 1;
    profileDetailsLoadedFor = "";
    profileDetailsPromise = null;
    profileDetailsRequestToken += 1;

    birthdaySettings = null;
    profileBirthday = null;
    profileExperiences = [];
  }

  /* POSTS AND FRIENDS */

  function getPosts() {
    const posts = global.KSKData?.getPosts?.();
    return Array.isArray(posts) ? posts : [];
  }

  function getFriends() {
    const friends = global.KSKData?.getFriends?.();
    return Array.isArray(friends) ? friends : [];
  }

  function getDisplayName(user) {
    return String(
      user?.name || t("तपाईंको प्रोफाइल", "Your Profile")
    );
  }

  function renderAvatar(user) {
    const name = String(user?.name || "").trim();
    const avatar = String(user?.avatar || "").trim();

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(avatar)) {
      return `
        <div class="avatar avatar-xl">
          <img
            src="${escapeHTML(avatar)}"
            alt="${escapeHTML(name)}"
            loading="lazy">
        </div>
      `;
    }

    return `
      <div class="avatar avatar-xl">
        ${escapeHTML(name.charAt(0) || "स")}
      </div>
    `;
  }

  function getProfilePosts(user, posts) {
    const safePosts = Array.isArray(posts) ? posts : [];
    const userId = String(user?.id || "");
    const userName = String(user?.name || "").trim();

    return safePosts.filter(post => {
      if (!post || typeof post !== "object") return false;

      const authorId = String(post.authorId || "");

      if (userId && authorId) {
        return authorId === userId;
      }

      const author = String(post.author || "").trim();

      if (userName && author === userName) return true;

      return !userId && !userName && author === "तपाईं";
    });
  }

  function isPhotoPost(post) {
    if (!post || typeof post !== "object") return false;

    const mediaType = String(
      post.mediaType || post.media?.type || ""
    ).trim().toLowerCase();

    if (["video", "audio", "voice", "music"].includes(mediaType)) {
      return false;
    }

    if (post.video || post.videoUrl || post.audio || post.audioUrl) {
      return false;
    }

    return Boolean(
      post.mediaId ||
      post.mediaData ||
      post.image ||
      post.imageUrl ||
      post.mediaUrl ||
      post.photo ||
      post.media
    );
  }

  function renderPostList(posts, options = {}) {
    if (!posts.length) {
      return `<div class="empty-state">${t(
        "तपाईंले अहिलेसम्म पोस्ट गर्नुभएको छैन।",
        "You have not published any posts."
      )}</div>`;
    }

    if (typeof options.renderPost === "function") {
      return posts.map(post => options.renderPost(post)).join("");
    }

    return posts.map(post => `
      <article class="card post-card">
        <div class="post-header">
          <strong>${escapeHTML(post.author || "")}</strong>
        </div>

        ${post.text
          ? `<div class="post-content">${escapeHTML(post.text)}</div>`
          : ""
        }

        <small class="post-time">
          ${escapeHTML(
            global.KSKUtils?.formatDateTime?.(
              post.createdAt,
              isEnglish() ? "en" : "ne"
            ) || ""
          )}
        </small>
      </article>
    `).join("");
  }

  /* PROFILE LINK */

  function getProfileLink() {
    try {
      const currentURL = new URL(global.location.href);
      currentURL.hash = "profile";
      return currentURL.toString();
    } catch (error) {
      return "";
    }
  }

  function showToast(message, type = "success") {
    const toast = global.KSKToast;

    if (typeof toast?.[type] === "function") {
      toast[type](message);
    } else if (typeof toast?.show === "function") {
      toast.show(message, type);
    }
  }

  async function copyProfileLink(button) {
    const link = getProfileLink();

    if (!link) {
      showToast(
        t("प्रोफाइल लिंक उपलब्ध भएन।", "Profile link is unavailable."),
        "error"
      );

      return false;
    }

    let copied = false;

    try {
      if (
        global.isSecureContext &&
        global.navigator?.clipboard?.writeText
      ) {
        await global.navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch (error) {
      copied = false;
    }

    if (!copied && document.body) {
      const field = document.createElement("textarea");

      field.value = link;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";

      document.body.appendChild(field);
      field.select();

      try {
        copied = Boolean(document.execCommand("copy"));
      } catch (error) {
        copied = false;
      }

      field.remove();
    }

    showToast(
      copied
        ? t("प्रोफाइल लिंक कपी भयो।", "Profile link copied.")
        : t("प्रोफाइल लिंक कपी गर्न सकिएन।", "Could not copy profile link."),
      copied ? "success" : "error"
    );

    button?.blur();

    return copied;
  }

  /* ABOUT */

  function renderAbout(user) {
    const joinedAt = user?.joinedAt
      ? global.KSKUtils?.formatDateTime?.(
          user.joinedAt,
          isEnglish() ? "en" : "ne"
        ) || user.joinedAt
      : "";

    const rows = [
      user?.bio
        ? {
            icon: "📝",
            label: t("परिचय", "Bio"),
            value: user.bio
          }
        : null,

      user?.location
        ? {
            icon: "📍",
            label: t("स्थान", "Location"),
            value: user.location
          }
        : null,

      joinedAt
        ? {
            icon: "📅",
            label: t("सदस्य बनेको मिति", "Joined"),
            value: joinedAt
          }
        : null
    ].filter(Boolean);

    if (!rows.length) {
      return `<div class="empty-state">${t(
        "अहिलेसम्म About जानकारी थपिएको छैन।",
        "No About information yet."
      )}</div>`;
    }

    return `
      <div class="profile-about-list">
        ${rows.map(row => `
          <div class="profile-about-item">
            <span class="profile-about-icon" aria-hidden="true">
              ${row.icon}
            </span>

            <div>
              <small>${escapeHTML(row.label)}</small>
              <p>${escapeHTML(row.value)}</p>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* =========================================================
     FACEBOOK STYLE — AT A GLANCE
  ========================================================= */

  function getFeaturedExperience(type) {
    const items = Array.isArray(profileExperiences)
      ? profileExperiences.filter(item => item.type === type)
      : [];

    return items.sort((a, b) => {
      if (Boolean(a.isCurrent) !== Boolean(b.isCurrent)) {
        return a.isCurrent ? -1 : 1;
      }

      return String(b.startDate || "")
        .localeCompare(String(a.startDate || ""));
    })[0] || null;
  }

  function renderAtAGlance(user, ownProfile) {
    const birthdayData = ownProfile
      ? birthdaySettings
      : profileBirthday;

    const birthdayText = ownProfile
      ? formatBirthday(
          birthdayData,
          Boolean(birthdayData?.showBirthYear)
        )
      : formatBirthday(
          birthdayData,
          Boolean(birthdayData?.birthYear)
        );

    const work = getFeaturedExperience("work");
    const study = getFeaturedExperience("study");

    const rows = [];

    if (user?.location) {
      rows.push({
        icon: "📍",
        value: `${t("बसोबास", "Lives in")} ${user.location}`
      });
    }

    if (birthdayText) {
      rows.push({
        icon: "🎂",
        value: `${t("जन्म", "Born")} ${birthdayText}`,
        edit: ownProfile
          ? `<button type="button"
               class="profile-glance-edit"
               data-edit-birthday>
               ${t("सम्पादन", "Edit")}
             </button>`
          : ""
      });
    } else if (ownProfile) {
      rows.push({
        icon: "🎂",
        value: t("जन्ममिति थप्नुहोस्", "Add birthday"),
        edit: `<button type="button"
                 class="profile-glance-edit"
                 data-edit-birthday>
                 ${t("थप्नुहोस्", "Add")}
               </button>`
      });
    }

    if (work) {
      rows.push({
        icon: "💼",
        value: `${t("काम गर्नुहुन्छ", "Works at")} ${
          work.organizationName || work.roleTitle || ""
        }`,
        sub: work.roleTitle || "",
        edit: ownProfile
          ? `<button type="button"
               class="profile-glance-edit"
               data-edit-experience="${escapeHTML(work.id)}">
               ${t("सम्पादन", "Edit")}
             </button>`
          : ""
      });
    } else if (ownProfile) {
      rows.push({
        icon: "💼",
        value: t("कामको विवरण थप्नुहोस्", "Add work"),
        edit: `<button type="button"
                 class="profile-glance-edit"
                 data-add-experience="work">
                 ${t("थप्नुहोस्", "Add")}
               </button>`
      });
    }

    if (study) {
      rows.push({
        icon: "🎓",
        value: `${t("अध्ययन", "Studied at")} ${
          study.organizationName || study.roleTitle || ""
        }`,
        sub: study.roleTitle || "",
        edit: ownProfile
          ? `<button type="button"
               class="profile-glance-edit"
               data-edit-experience="${escapeHTML(study.id)}">
               ${t("सम्पादन", "Edit")}
             </button>`
          : ""
      });
    } else if (ownProfile) {
      rows.push({
        icon: "🎓",
        value: t("अध्ययनको विवरण थप्नुहोस्", "Add education"),
        edit: `<button type="button"
                 class="profile-glance-edit"
                 data-add-experience="study">
                 ${t("थप्नुहोस्", "Add")}
               </button>`
      });
    }

    return `
      <section class="profile-at-glance">
        <div class="profile-at-glance-heading">
          <h3>${t("एक नजरमा", "At a glance")}</h3>

          <button
            type="button"
            class="profile-at-glance-see-all"
            data-see-all-profile-details>
            ${t("सबै हेर्नुहोस्", "See all")}
          </button>
        </div>

        ${rows.length
          ? rows.map(row => `
              <div class="profile-glance-row">
                <span class="profile-glance-icon"
                      aria-hidden="true">
                  ${row.icon}
                </span>

                <div class="profile-glance-content">
                  ${escapeHTML(row.value)}
                  ${row.sub
                    ? `<small>${escapeHTML(row.sub)}</small>`
                    : ""
                  }
                </div>

                ${row.edit || ""}
              </div>
            `).join("")
          : `
            <div class="profile-glance-empty">
              ${t(
                "प्रोफाइल विवरण उपलब्ध छैन।",
                "No profile details available."
              )}
            </div>
          `
        }
      </section>
    `;
  }

  function openAtAGlanceDetails(ownProfile) {
    const content = `
      ${renderBirthdaySection(ownProfile)}
      ${renderExperienceSection(ownProfile)}
    `;

    openProfileDetailsDialog(
      t("प्रोफाइल विवरण", "Profile Details"),
      content
    );
  }

  /* =========================================================
     BIRTHDAY + WORK / STUDY DISPLAY AND EDIT
  ========================================================= */

  function formatBirthday(data, showYear = false) {
    if (!data) return "";

    let month = null;
    let day = null;
    let year = null;

    if (data.dateOfBirth) {
      const parts = String(data.dateOfBirth).split("-");

      if (parts.length === 3) {
        year = Number(parts[0]);
        month = Number(parts[1]);
        day = Number(parts[2]);
      }
    } else {
      month = Number(data.birthMonth);
      day = Number(data.birthDay);
      year = data.birthYear
        ? Number(data.birthYear)
        : null;
    }

    if (
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return "";
    }

    const date = new Date(
      year || 2000,
      month - 1,
      day
    );

    if (
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "";
    }

    const options = {
      month: "long",
      day: "numeric"
    };

    if (showYear && year) {
      options.year = "numeric";
    }

    // सधैँ AD / Gregorian मिति
    return date.toLocaleDateString("en-US", options);
  }

  function getBirthdayVisibilityLabel(value) {
    const labels = {
      public: t("सबैले देख्न सक्छन्", "Public"),
      friends: t("साथीहरूले मात्र", "Friends"),
      only_me: t("मात्र म", "Only me")
    };

    return labels[value] || labels.only_me;
  }

  function getTodayISO() {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  /* =========================================================
     MODAL
  ========================================================= */

  function getProfileDetailsDialog() {
    let dialog = document.getElementById(
      "ksk-profile-details-dialog"
    );

    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "ksk-profile-details-dialog";

      document.body.appendChild(dialog);
    }

    return dialog;
  }

  function openProfileDetailsDialog(title, content) {
    const dialog = getProfileDetailsDialog();

    dialog.innerHTML = `
      <div class="profile-dialog-header">
        <strong>${escapeHTML(title)}</strong>

        <button
          type="button"
          class="profile-dialog-close"
          data-close-profile-dialog
          aria-label="${t("बन्द गर्नुहोस्", "Close")}">
          ×
        </button>
      </div>

      <div class="profile-dialog-body">
        ${content}
      </div>
    `;

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeProfileDetailsDialog() {
    const dialog = document.getElementById(
      "ksk-profile-details-dialog"
    );

    if (!dialog) return;

    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  /* =========================================================
     BIRTHDAY FORM
  ========================================================= */

  function openBirthdayEditor() {
    const data = birthdaySettings || {};

    const visibility = [
      "public",
      "friends",
      "only_me"
    ].includes(data.birthdayVisibility)
      ? data.birthdayVisibility
      : "only_me";

    const content = `
      <form
        class="profile-form"
        data-profile-details-form
        data-form-type="birthday">

        <div class="profile-form-field">
          <label for="profile-birthday-date">
            ${t("जन्ममिति (AD)", "Date of Birth (AD)")}
          </label>

          <input
            id="profile-birthday-date"
            type="date"
            name="dateOfBirth"
            value="${escapeHTML(data.dateOfBirth || "")}"
            max="${getTodayISO()}"
            required>
        </div>

        <div class="profile-form-field">
          <label for="profile-birthday-visibility">
            ${t("जन्मदिनको गोपनीयता", "Birthday Privacy")}
          </label>

          <select
            id="profile-birthday-visibility"
            name="birthdayVisibility">

            <option value="public" ${visibility === "public" ? "selected" : ""}>
              ${t("सबैले देख्न सक्छन्", "Public")}
            </option>

            <option value="friends" ${visibility === "friends" ? "selected" : ""}>
              ${t("साथीहरूले मात्र", "Friends")}
            </option>

            <option value="only_me" ${visibility === "only_me" ? "selected" : ""}>
              ${t("मात्र म", "Only me")}
            </option>
          </select>
        </div>

        <label class="profile-form-check">
          <input
            type="checkbox"
            name="showBirthYear"
            ${data.showBirthYear ? "checked" : ""}>

          <span>
            ${t(
              "मेरो जन्मवर्ष पनि देखाउने",
              "Show my birth year"
            )}
          </span>
        </label>

        <div class="profile-form-actions">
          <button type="button" data-close-profile-dialog>
            ${t("रद्द गर्नुहोस्", "Cancel")}
          </button>

          <button type="submit">
            ${t("सुरक्षित गर्नुहोस्", "Save")}
          </button>
        </div>
      </form>
    `;

    openProfileDetailsDialog(
      t("जन्ममिति सम्पादन", "Edit Birthday"),
      content
    );
  }

  function renderBirthdaySection(ownProfile) {
    const data = ownProfile
      ? birthdaySettings
      : profileBirthday;

    const birthdayText = ownProfile
      ? formatBirthday(data, Boolean(data?.showBirthYear))
      : formatBirthday(data, Boolean(data?.birthYear));

    return `
      <section class="profile-detail-card">

        <div class="profile-detail-heading">
          <span>🎂</span>

          <strong>
            ${t("जन्मदिन", "Birthday")}
          </strong>

          ${ownProfile ? `
            <div class="profile-detail-actions">
              <button
                type="button"
                class="profile-detail-btn primary"
                data-edit-birthday>
                ${t("सम्पादन", "Edit")}
              </button>
            </div>
          ` : ""}
        </div>

        ${birthdayText
          ? `
            <div class="profile-detail-value">
              ${escapeHTML(birthdayText)}
            </div>
          `
          : `
            <p class="profile-detail-empty">
              ${ownProfile
                ? t("जन्ममिति थपिएको छैन।", "Birthday has not been added.")
                : ""
              }
            </p>
          `
        }

        ${ownProfile && data?.dateOfBirth ? `
          <div class="profile-detail-meta">
            ${t("गोपनीयता", "Privacy")}:
            ${escapeHTML(
              getBirthdayVisibilityLabel(
                data.birthdayVisibility
              )
            )}
          </div>
        ` : ""}

      </section>
    `;
  }

  /* =========================================================
     EXPERIENCE DATE
  ========================================================= */

  function formatExperienceDate(value) {
    if (!value) return "";

    const parts = String(value).split("-");

    if (parts.length !== 3) return "";

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const date = new Date(year, month - 1, day);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    });
  }

  /* =========================================================
     EXPERIENCE FORM
  ========================================================= */

  function openExperienceEditor(type, experienceId = "") {
    const normalizedType = String(type || "").toLowerCase();

    if (!["work", "study"].includes(normalizedType)) {
      return;
    }

    const existing = experienceId
      ? profileExperiences.find(item =>
          String(item.id) === String(experienceId)
        )
      : null;

    if (experienceId && !existing) {
      showToast(
        t("विवरण भेटिएन।", "Experience not found."),
        "error"
      );
      return;
    }

    const isWork = normalizedType === "work";

    const title = isWork
      ? t("कामको विवरण", "Work Experience")
      : t("अध्ययनको विवरण", "Education");

    const organizationLabel = isWork
      ? t("कम्पनी / संस्थाको नाम", "Company / Organization")
      : t("विद्यालय / कलेजको नाम", "School / College");

    const roleLabel = isWork
      ? t("पद / काम", "Position / Job Title")
      : t("तह / विषय", "Level / Subject");

    const visibility = [
      "public",
      "friends",
      "only_me"
    ].includes(existing?.visibility)
      ? existing.visibility
      : "only_me";

    const content = `
      <form
        class="profile-form"
        data-profile-details-form
        data-form-type="experience"
        data-experience-id="${escapeHTML(existing?.id || "")}">

        <input
          type="hidden"
          name="type"
          value="${normalizedType}">

        <div class="profile-form-field">
          <label>
            ${organizationLabel}
          </label>

          <input
            type="text"
            name="organizationName"
            maxlength="120"
            value="${escapeHTML(existing?.organizationName || "")}"
            placeholder="${escapeHTML(organizationLabel)}"
            required>
        </div>

        <div class="profile-form-field">
          <label>
            ${roleLabel}
          </label>

          <input
            type="text"
            name="roleTitle"
            maxlength="120"
            value="${escapeHTML(existing?.roleTitle || "")}"
            placeholder="${escapeHTML(roleLabel)}"
            required>
        </div>

        <div class="profile-form-field">
          <label>
            ${t("विवरण (वैकल्पिक)", "Description (Optional)")}
          </label>

          <textarea
            name="description"
            maxlength="500"
            placeholder="${t(
              "थप जानकारी लेख्नुहोस्...",
              "Add more information..."
            )}">${escapeHTML(existing?.description || "")}</textarea>
        </div>

        <div class="profile-form-field">
          <label>
            ${t("सुरु मिति", "Start Date")}
          </label>

          <input
            type="date"
            name="startDate"
            max="${getTodayISO()}"
            value="${escapeHTML(existing?.startDate || "")}">
        </div>

        <label class="profile-form-check">
          <input
            type="checkbox"
            name="isCurrent"
            data-experience-current
            ${existing?.isCurrent ? "checked" : ""}>

          <span>
            ${isWork
              ? t("अहिले पनि यहीँ काम गर्दैछु", "I currently work here")
              : t("अहिले पनि यहीँ अध्ययन गर्दैछु", "I currently study here")
            }
          </span>
        </label>

        <div class="profile-form-field">
          <label>
            ${t("अन्त्य मिति", "End Date")}
          </label>

          <input
            type="date"
            name="endDate"
            max="${getTodayISO()}"
            value="${escapeHTML(existing?.endDate || "")}"
            ${existing?.isCurrent ? "disabled" : ""}>
        </div>

        <div class="profile-form-field">
          <label>
            ${t("गोपनीयता", "Privacy")}
          </label>

          <select name="visibility">
            <option value="public" ${visibility === "public" ? "selected" : ""}>
              ${t("सबैले देख्न सक्छन्", "Public")}
            </option>

            <option value="friends" ${visibility === "friends" ? "selected" : ""}>
              ${t("साथीहरूले मात्र", "Friends")}
            </option>

            <option value="only_me" ${visibility === "only_me" ? "selected" : ""}>
              ${t("मात्र म", "Only me")}
            </option>
          </select>
        </div>

        <div class="profile-form-actions">
          <button type="button" data-close-profile-dialog>
            ${t("रद्द गर्नुहोस्", "Cancel")}
          </button>

          <button type="submit">
            ${existing
              ? t("अपडेट गर्नुहोस्", "Update")
              : t("थप्नुहोस्", "Add")
            }
          </button>
        </div>
      </form>
    `;

    openProfileDetailsDialog(
      existing
        ? t("विवरण सम्पादन", "Edit Details")
        : isWork
          ? t("कामको अनुभव थप्नुहोस्", "Add Work Experience")
          : t("अध्ययन थप्नुहोस्", "Add Education"),
      content
    );
  }

  /* =========================================================
     EXPERIENCE DISPLAY
  ========================================================= */

  function renderExperienceItem(item, ownProfile) {
    const isWork = item.type === "work";

    const title = isWork
      ? t("काम", "Work")
      : t("अध्ययन", "Study");

    const start = formatExperienceDate(item.startDate);

    const end = item.isCurrent
      ? t("हालसम्म", "Present")
      : formatExperienceDate(item.endDate);

    const dateRange = [start, end]
      .filter(Boolean)
      .join(" – ");

    return `
      <article class="profile-experience-item">

        <div class="profile-experience-icon">
          ${isWork ? "💼" : "🎓"}
        </div>

        <div class="profile-experience-content">

          <small>${title}</small>

          <strong>
            ${escapeHTML(item.roleTitle || "")}
          </strong>

          <p>
            ${escapeHTML(item.organizationName || "")}
          </p>

          ${dateRange ? `
            <div class="profile-detail-meta">
              ${escapeHTML(dateRange)}
            </div>
          ` : ""}

          ${item.description ? `
            <div class="profile-experience-description">
              ${escapeHTML(item.description)}
            </div>
          ` : ""}

          ${ownProfile ? `
            <div class="profile-experience-actions">

              <button
                type="button"
                class="profile-detail-btn"
                data-edit-experience="${escapeHTML(item.id)}">
                ${t("सम्पादन", "Edit")}
              </button>

              <button
                type="button"
                class="profile-detail-btn danger"
                data-delete-experience="${escapeHTML(item.id)}">
                ${t("हटाउनुहोस्", "Delete")}
              </button>

            </div>
          ` : ""}

        </div>
      </article>
    `;
  }

  function renderExperienceSection(ownProfile) {
    const items = Array.isArray(profileExperiences)
      ? profileExperiences
      : [];

    const workItems = items.filter(item => item.type === "work");
    const studyItems = items.filter(item => item.type === "study");

    return `
      <section class="profile-detail-card">

        <div class="profile-detail-heading">
          <span>💼</span>

          <strong>
            ${t("कामको अनुभव", "Work Experience")}
          </strong>

          ${ownProfile ? `
            <div class="profile-detail-actions">
              <button
                type="button"
                class="profile-detail-btn primary"
                data-add-experience="work">
                + ${t("थप्नुहोस्", "Add")}
              </button>
            </div>
          ` : ""}
        </div>

        ${workItems.length
          ? workItems.map(item =>
              renderExperienceItem(item, ownProfile)
            ).join("")
          : `
            <p class="profile-detail-empty">
              ${t("कामको विवरण छैन।", "No work details added.")}
            </p>
          `
        }

      </section>

      <section class="profile-detail-card">

        <div class="profile-detail-heading">
          <span>🎓</span>

          <strong>
            ${t("शिक्षा", "Education")}
          </strong>

          ${ownProfile ? `
            <div class="profile-detail-actions">
              <button
                type="button"
                class="profile-detail-btn primary"
                data-add-experience="study">
                + ${t("थप्नुहोस्", "Add")}
              </button>
            </div>
          ` : ""}
        </div>

        ${studyItems.length
          ? studyItems.map(item =>
              renderExperienceItem(item, ownProfile)
            ).join("")
          : `
            <p class="profile-detail-empty">
              ${t("अध्ययनको विवरण छैन।", "No study details added.")}
            </p>
          `
        }

      </section>
    `;
  }

  /* =========================================================
     FORM SUBMIT
  ========================================================= */

  async function handleProfileDetailsSubmit(event) {
    const form = event.target;

    if (!form?.matches?.("[data-profile-details-form]")) {
      return;
    }

    event.preventDefault();

    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (submitButton?.disabled) return;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = t(
        "सुरक्षित हुँदैछ...",
        "Saving..."
      );
    }

    try {
      const formData = new FormData(form);
      const formType = form.dataset.formType;

      if (formType === "birthday") {
        await updateMyBirthdaySettings({
          dateOfBirth: String(
            formData.get("dateOfBirth") || ""
          ),

          birthdayVisibility: String(
            formData.get("birthdayVisibility") || "only_me"
          ),

          showBirthYear: form.elements.showBirthYear.checked
        });

        closeProfileDetailsDialog();

        showToast(
          t(
            "जन्मदिन सेटिङ सुरक्षित भयो।",
            "Birthday settings saved."
          ),
          "success"
        );

        return;
      }

      if (formType === "experience") {
        const payload = {
          type: String(formData.get("type") || ""),

          organizationName: String(
            formData.get("organizationName") || ""
          ).trim(),

          roleTitle: String(
            formData.get("roleTitle") || ""
          ).trim(),

          description: String(
            formData.get("description") || ""
          ).trim(),

          startDate: String(
            formData.get("startDate") || ""
          ),

          endDate: String(
            formData.get("endDate") || ""
          ),

          isCurrent: form.elements.isCurrent.checked,

          visibility: String(
            formData.get("visibility") || "only_me"
          )
        };

        const experienceId = String(
          form.dataset.experienceId || ""
        ).trim();

        if (experienceId) {
          await updateMyExperience(experienceId, payload);
        } else {
          await addMyExperience(payload);
        }

        closeProfileDetailsDialog();

        showToast(
          experienceId
            ? t("विवरण अपडेट भयो।", "Details updated.")
            : t("विवरण थपियो।", "Details added."),
          "success"
        );
      }

    } catch (error) {
      console.error(
        "Profile details save failed:",
        error
      );

      showToast(
        error?.message ||
          t(
            "विवरण सुरक्षित गर्न सकिएन।",
            "Could not save details."
          ),
        "error"
      );

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = t(
          "फेरि प्रयास गर्नुहोस्",
          "Try Again"
        );
      }
    }
  }

  /* =========================================================
     EXPERIENCE DELETE
  ========================================================= */

  async function removeExperience(experienceId) {
    const id = String(experienceId || "").trim();

    if (!id) return;

    const confirmed = global.confirm(
      t(
        "यो विवरण हटाउने निश्चित गर्नुहुन्छ?",
        "Are you sure you want to delete this detail?"
      )
    );

    if (!confirmed) return;

    try {
      await deleteMyExperience(id);

      showToast(
        t("विवरण हटाइयो।", "Details deleted."),
        "success"
      );

    } catch (error) {
      console.error(
        "Experience delete failed:",
        error
      );

      showToast(
        error?.message ||
          t(
            "विवरण हटाउन सकिएन।",
            "Could not delete details."
          ),
        "error"
      );
    }
  }

  /* MAIN RENDER */

  function render(options = {}) {
    options = options && typeof options === "object"
      ? options
      : {};

    ensureStyles();

    const requestedId = String(
      options.profileUserId || viewingUserId || ""
    ).trim();

    if (requestedId !== viewingUserId) {
      viewingUserId = requestedId;
      remoteProfile = null;
      remoteLoadPromise = null;
      profilePosts = [];
      profilePostsPromise = null;
      profileLoadState = "idle";
      profileRequestToken += 1;
      profileDetailsLoadedFor = "";
      profileDetailsPromise = null;
      profileDetailsRequestToken += 1;

      birthdaySettings = null;
      profileBirthday = null;
      profileExperiences = [];
    }

    loadSupabaseProfile();

    const currentUserId = getCurrentUserId();
    const viewingAnotherUser = Boolean(
      viewingUserId && viewingUserId !== currentUserId
    );

    if (viewingAnotherUser && !remoteProfile) {
      const message = profileLoadState === "loading" || profileLoadState === "idle"
        ? t("प्रोफाइल लोड हुँदैछ…", "Loading profile…")
        : profileLoadState === "not-found"
          ? t("यो प्रोफाइल उपलब्ध छैन वा हेर्ने अनुमति छैन।", "This profile is unavailable or you do not have permission to view it.")
          : t("प्रोफाइल लोड हुन सकेन। कृपया फेरि प्रयास गर्नुहोस्।", "Could not load this profile. Please try again.");

      return `
        <section class="profile-section is-public-profile" data-profile-section>
          <div class="card empty-state" role="status" aria-live="polite">
            ${escapeHTML(message)}
            ${profileLoadState === "error" ? `
              <button type="button" data-retry-public-profile>
                ${t("फेरि प्रयास गर्नुहोस्", "Try again")}
              </button>
            ` : ""}
          </div>
        </section>
      `;
    }

    const user = options.user && typeof options.user === "object"
      ? options.user
      : getProfile();

    const ownProfile = isOwnProfile(user);

    if (ownProfile && currentUserId) {
      loadProfileDetails(currentUserId, true);
    } else if (!ownProfile && viewingUserId) {
      loadProfileDetails(viewingUserId, false);
    }

    const allPosts = Array.isArray(options.posts)
      ? options.posts
      : (ownProfile ? getPosts() : profilePosts);

    const posts = getProfilePosts(user, allPosts);
    const photos = posts.filter(isPhotoPost);

    const activeTab = VALID_TABS.has(options.activeTab)
      ? options.activeTab
      : "posts";

    return `
      <section class="profile-section${ownProfile ? "" : " is-public-profile"}" data-profile-section>

        <section class="card profile-card" aria-label="${t(
          ownProfile ? "मेरो प्रोफाइल" : "प्रोफाइल",
          ownProfile ? "My profile" : "Profile"
        )}">

          <div
            class="ksk-profile-cover"
            role="${ownProfile ? "button" : "img"}"
            ${ownProfile ? 'tabindex="0"' : ""}
            aria-label="${t("Cover फोटो", "Cover photo")}"
          >
            <div class="ksk-profile-cover-empty">
              <span class="ksk-profile-cover-icon">🌄</span>
              <span class="ksk-profile-cover-label">
                ${ownProfile
                  ? t("Cover फोटो राख्नुहोस्", "Add cover photo")
                  : t("Cover फोटो", "Cover photo")
                }
              </span>
            </div>
          </div>

          <div
            class="profile-avatar"
            role="${ownProfile ? "button" : "img"}"
            ${ownProfile ? 'tabindex="0"' : ""}
            aria-label="${escapeHTML(getDisplayName(user))}"
          >
            ${renderAvatar(user)}
          </div>

          <h2>${escapeHTML(getDisplayName(user))}</h2>

          ${user.bio ? `<p>${escapeHTML(user.bio)}</p>` : ""}

          ${user.location
            ? `<p>📍 ${escapeHTML(user.location)}</p>`
            : ""
          }

          <div class="profile-post-count">
            ${posts.length} ${t("पोस्ट", "Posts")}
          </div>

          ${ownProfile ? `
            <div class="profile-main-actions">
              <button class="profile-action-btn primary" type="button" data-edit-profile>
                <span>✏️</span>
                <span>${t("प्रोफाइल सम्पादन", "Edit Profile")}</span>
              </button>

              <button class="profile-action-btn" type="button" data-open-settings>
                <span>⚙️</span>
                <span>${t("सेटिङ", "Settings")}</span>
              </button>
            </div>
          ` : ""}

        </section>

        ${ownProfile ? `
          <section class="card profile-tools-card">
            <div class="profile-tools-heading">
              <div>
                <h3>${t("प्रोफाइलका सुविधा", "Profile Tools")}</h3>
                <p>${t(
                  "आफ्नो प्रोफाइल र सामग्री व्यवस्थापन गर्नुहोस्।",
                  "Manage your profile and saved content."
                )}</p>
              </div>
            </div>

            <div class="profile-tool-grid" data-profile-extras>
              <button type="button" data-copy-profile-link>
                🔗 ${t("प्रोफाइल लिंक कपी", "Copy Profile Link")}
              </button>

              <button type="button" data-page="saved">
                🔖 ${t("सेभ गरिएका पोस्ट", "Saved Posts")}
              </button>
            </div>

            <p class="profile-tool-note">
              ${t(
                "QR, उपलब्धि र Insights का विकल्पहरू यही सेक्सनमा देखिन्छन्।",
                "QR, achievements and insights appear in this section."
              )}
            </p>
          </section>
        ` : ""}

        <div class="profile-tabs" role="tablist">
          <button
            class="profile-tab${activeTab === "posts" ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${activeTab === "posts"}"
            data-profile-tab="posts">
            ${t("पोस्टहरू", "Posts")}
          </button>

          <button
            class="profile-tab${activeTab === "photos" ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${activeTab === "photos"}"
            data-profile-tab="photos">
            ${t("फोटोहरू", "Photos")}
          </button>

          <button
            class="profile-tab${activeTab === "about" ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${activeTab === "about"}"
            data-profile-tab="about">
            ${t("परिचय", "About")}
          </button>
        </div>

        ${renderAtAGlance(user, ownProfile)}

        <div
          class="profile-tab-panel${activeTab === "posts" ? "" : " hidden"}"
          data-profile-panel="posts"
          role="tabpanel">
          <div class="profile-posts">
            ${renderPostList(posts, options)}
          </div>
        </div>

        <div
          class="profile-tab-panel${activeTab === "photos" ? "" : " hidden"}"
          data-profile-panel="photos"
          role="tabpanel">
          <div class="profile-posts">
            ${photos.length
              ? renderPostList(photos, options)
              : `<div class="empty-state">${t(
                  "अहिलेसम्म कुनै फोटो पोस्ट गरिएको छैन।",
                  "No photos shared yet."
                )}</div>`
            }
          </div>
        </div>

        <div
          class="profile-tab-panel${activeTab === "about" ? "" : " hidden"}"
          data-profile-panel="about"
          role="tabpanel">
          <div class="card profile-about-card">
            ${renderAbout(user)}
          </div>
        </div>

      </section>
    `;
  }

  /* =========================================================
     TABS AND CLICK HANDLERS
  ========================================================= */

  function switchTab(button) {
    const section = button.closest("[data-profile-section]");
    const selected = button.dataset.profileTab;

    if (!section || !VALID_TABS.has(selected)) return false;

    section.querySelectorAll("[data-profile-tab]").forEach(tab => {
      const active = tab === button;

      tab.classList.toggle("is-active", active);
      tab.setAttribute(
        "aria-selected",
        active ? "true" : "false"
      );
    });

    section.querySelectorAll("[data-profile-panel]").forEach(panel => {
      panel.classList.toggle(
        "hidden",
        panel.dataset.profilePanel !== selected
      );
    });

    return true;
  }

  function handleClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const closeButton = target.closest(
      "[data-close-profile-dialog]"
    );

    if (closeButton) {
      event.preventDefault();
      closeProfileDetailsDialog();
      return;
    }

    const retryButton = target.closest(
      "[data-retry-public-profile]"
    );

    if (retryButton) {
      event.preventDefault();
      remoteLoadPromise = null;
      profileLoadState = "idle";
      loadSupabaseProfile();
      refreshProfilePage();
      return;
    }

    const tab = target.closest("[data-profile-tab]");

    if (tab) {
      switchTab(tab);
      return;
    }

    const seeAllDetailsButton = target.closest(
      "[data-see-all-profile-details]"
    );

    if (seeAllDetailsButton) {
      event.preventDefault();

      openAtAGlanceDetails(
        isOwnProfile(getProfile())
      );

      return;
    }

    const birthdayButton = target.closest(
      "[data-edit-birthday]"
    );

    if (birthdayButton) {
      event.preventDefault();
      openBirthdayEditor();
      return;
    }

    const addExperienceButton = target.closest(
      "[data-add-experience]"
    );

    if (addExperienceButton) {
      event.preventDefault();

      openExperienceEditor(
        addExperienceButton.dataset.addExperience
      );

      return;
    }

    const editExperienceButton = target.closest(
      "[data-edit-experience]"
    );

    if (editExperienceButton) {
      event.preventDefault();

      const item = profileExperiences.find(experience =>
        String(experience.id) ===
        String(editExperienceButton.dataset.editExperience)
      );

      if (item) {
        openExperienceEditor(
          item.type,
          item.id
        );
      }

      return;
    }

    const deleteExperienceButton = target.closest(
      "[data-delete-experience]"
    );

    if (deleteExperienceButton) {
      event.preventDefault();

      removeExperience(
        deleteExperienceButton.dataset.deleteExperience
      );

      return;
    }

    const copyButton = target.closest(
      "[data-copy-profile-link]"
    );

    if (copyButton) {
      event.preventDefault();
      copyProfileLink(copyButton);
    }
  }

  function handleProfileDetailsChange(event) {
    const checkbox = event.target;

    if (!checkbox?.matches?.("[data-experience-current]")) {
      return;
    }

    const form = checkbox.closest(
      "[data-profile-details-form]"
    );

    const endDate = form?.querySelector(
      '[name="endDate"]'
    );

    if (!endDate) return;

    endDate.disabled = checkbox.checked;

    if (checkbox.checked) {
      endDate.value = "";
    }
  }

  document.addEventListener("click", handleClick);

  document.addEventListener(
    "submit",
    handleProfileDetailsSubmit
  );

  document.addEventListener(
    "change",
    handleProfileDetailsChange
  );

  global.addEventListener(
    "ksk:navigate",
    handleProfileNavigation
  );

  /* PUBLIC API */

  global.KSKProfilePage = Object.freeze({
    render,
    getProfile,
    getProfilePosts,
    getProfileLink,
    isPhotoPost,

    getMyBirthdaySettings,
    updateMyBirthdaySettings,
    getProfileBirthday,

    getMyExperiences,
    getProfileExperiences,
    addMyExperience,
    updateMyExperience,
    deleteMyExperience,

    refreshFromSupabase() {
      remoteLoadPromise = null;
      profilePostsPromise = null;
      return loadSupabaseProfile();
    },

    openUserProfile(userId) {
      const id = String(userId || "").trim();
      if (!id) return false;

      const navigation = global.KSKNavigation;

      if (typeof navigation?.navigate === "function") {
        return navigation.navigate("profile", {
          profileUserId: id,
          source: "comment-author"
        });
      }

      global.dispatchEvent(new CustomEvent("ksk:navigate-request", {
        detail: {
          page: "profile",
          options: {
            profileUserId: id,
            source: "comment-author"
          }
        }
      }));

      return true;
    },

    getViewingUserId() {
      return viewingUserId;
    }
  });

})(window);
