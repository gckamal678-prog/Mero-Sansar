
"use strict";
(function (global) {
  "use strict";
  if (global.KSKProfileExtras) return;

  const STYLE_ID = "ksk-profile-extras-style";
  const QR_ENDPOINT = "https://api.qrserver.com/v1/create-qr-code/";
  let observer = null;
  let modal = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const english = () => global.KSKLanguage?.getLanguage?.() === "en";
  const t = (ne, en) => english() ? en : ne;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[ch]);
  }

  function notify(message, type) {
    if (typeof global.KSKToast?.show === "function") global.KSKToast.show(message, type || "info");
    else console.info(message);
  }

  function getProfile() {
    return global.KSKProfilePage?.getProfile?.() || global.KSKData?.getProfile?.() || {};
  }

  function getProfileLink() {
    try {
      const url = new URL(global.location.href);
      url.hash = "profile";
      return url.toString();
    } catch (error) { return ""; }
  }

  function getOwnPosts() {
    const all = global.KSKData?.getPosts?.();
    if (!Array.isArray(all)) return [];
    const user = getProfile();
    if (global.KSKProfilePage?.getProfilePosts) {
      return global.KSKProfilePage.getProfilePosts(user, all);
    }
    const id = String(user?.id || "");
    const name = String(user?.name || "");
    return all.filter(post =>
      (id && String(post?.authorId || "") === id) ||
      (!id && name && String(post?.author || "") === name)
    );
  }

  function getFriends() {
    const list = global.KSKData?.getFriends?.();
    return Array.isArray(list) ? list : [];
  }

  function getAchievements() {
    const user = getProfile();
    const postCount = getOwnPosts().length;
    const friendCount = getFriends().length;
    const hasName = Boolean(String(user?.name || "").trim());
    const hasAvatar = Boolean(String(user?.avatar || user?.avatarMediaId || "").trim());
    const hasBio = Boolean(String(user?.bio || "").trim());
    const hasExtra = Boolean(String(user?.location || user?.website || "").trim());
    const complete = hasName && hasAvatar && hasBio && hasExtra;

    return [
      {id:"profile-start",icon:"👤",title:t("प्रोफाइल सुरु","Profile started"),description:t("प्रोफाइल नाम उपलब्ध छ।","A profile name is set."),earned:hasName},
      {id:"profile-complete",icon:"✨",title:t("पूर्ण प्रोफाइल","Complete profile"),description:t("फोटो, परिचय र थप जानकारी राख्नुहोस्।","Add a photo, bio and one more detail."),earned:complete},
      {id:"first-post",icon:"📝",title:t("पहिलो पोस्ट","First post"),description:t("आफ्नो पहिलो पोस्ट प्रकाशित गर्नुहोस्।","Publish your first post."),earned:postCount >= 1},
      {id:"ten-posts",icon:"✍️",title:t("सक्रिय लेखक","Active creator"),description:t("१० वटा पोस्ट प्रकाशित गर्नुहोस्।","Publish 10 posts."),earned:postCount >= 10},
      {id:"first-friend",icon:"🤝",title:t("पहिलो साथी","First friend"),description:t("पहिलो साथी जोड्नुहोस्।","Connect with your first friend."),earned:friendCount >= 1},
      {id:"five-friends",icon:"🌱",title:t("समुदाय निर्माता","Community builder"),description:t("५ जना साथी जोड्नुहोस्।","Connect with 5 friends."),earned:friendCount >= 5}
    ];
  }

  function ensureStyles() {
    if ($("#" + STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".ksk-profile-extras{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 4px;padding:14px}",
      ".ksk-profile-extra-button{min-height:48px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-surface-secondary);color:var(--color-text);font:inherit;font-weight:750;padding:10px;cursor:pointer}",
      ".ksk-profile-extra-button:hover{border-color:var(--color-primary)}",
      ".ksk-profile-extra-overlay{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.62)}",
      ".ksk-profile-extra-dialog{width:min(100%,420px);max-height:min(88vh,720px);overflow:auto;border:1px solid var(--color-border);border-radius:18px;padding:18px;background:var(--color-surface);color:var(--color-text);box-shadow:0 18px 60px rgba(0,0,0,.28)}",
      ".ksk-profile-extra-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}",
      ".ksk-profile-extra-head h3{margin:0;font-size:18px}",
      ".ksk-profile-extra-close{width:38px;height:38px;border:0;border-radius:50%;background:var(--color-surface-secondary);color:var(--color-text);font-size:22px;cursor:pointer}",
      ".ksk-profile-qr-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}",
      ".ksk-profile-qr-image{width:240px;height:240px;max-width:100%;object-fit:contain;padding:10px;background:#fff;border-radius:12px}",
      ".ksk-profile-extra-note{color:var(--color-muted);font-size:12px;line-height:1.55}",
      ".ksk-profile-extra-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}",
      ".ksk-profile-extra-action{min-height:42px;border:0;border-radius:10px;padding:9px 14px;background:var(--color-primary);color:#fff;font:inherit;font-weight:700;cursor:pointer}",
      ".ksk-profile-extra-action.secondary{background:var(--color-surface-secondary);color:var(--color-text);border:1px solid var(--color-border)}",
      ".ksk-profile-badge-list{display:flex;flex-direction:column;gap:9px}",
      ".ksk-profile-badge{display:flex;align-items:center;gap:11px;padding:11px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-surface-secondary)}",
      ".ksk-profile-badge.is-locked{opacity:.55}",
      ".ksk-profile-badge-icon{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:50%;background:var(--color-surface);font-size:22px}",
      ".ksk-profile-badge-copy{min-width:0;flex:1}",
      ".ksk-profile-badge-copy strong{display:block;font-size:14px}",
      ".ksk-profile-badge-copy small{display:block;color:var(--color-muted);font-size:12px;margin-top:3px}",
      ".ksk-profile-badge-status{font-size:11px;font-weight:800;white-space:nowrap;color:var(--color-primary)}",
      "@media(max-width:380px){.ksk-profile-extras{grid-template-columns:1fr}.ksk-profile-badge-status{white-space:normal;text-align:right}}"
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  function inject() {
    const host = $("#otherPageText");
    const section = host?.querySelector(".profile-section");
    const card = section?.querySelector(".profile-card");
    if (!section || !card || section.querySelector("[data-profile-extras]")) return false;
    ensureStyles();
    card.insertAdjacentHTML("afterend",
      '<section class="card ksk-profile-extras" data-profile-extras aria-label="' + esc(t("प्रोफाइलका थप सुविधा","Profile extras")) + '">' +
      '<button type="button" class="ksk-profile-extra-button" data-profile-extra-open="qr">▦ ' + t("मेरो QR प्रोफाइल","My QR Profile") + '</button>' +
      '<button type="button" class="ksk-profile-extra-button" data-profile-extra-open="badges">🏅 ' + t("उपलब्धि ब्याज","Achievement Badges") + '</button>' +
      '</section>');
    return true;
  }

  function closeModal() {
    if (modal) { modal.remove(); modal = null; }
    document.removeEventListener("keydown", handleKeydown);
  }

  function showModal(title, content) {
    closeModal();
    modal = document.createElement("div");
    modal.className = "ksk-profile-extra-overlay";
    modal.innerHTML =
      '<section class="ksk-profile-extra-dialog" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<header class="ksk-profile-extra-head"><h3>' + esc(title) + '</h3>' +
      '<button type="button" class="ksk-profile-extra-close" data-profile-extra-close aria-label="' + t("बन्द गर्नुहोस्","Close") + '">×</button></header>' +
      content + '</section>';
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target.closest("[data-profile-extra-close]")) closeModal();
    });
    document.body.appendChild(modal);
    document.addEventListener("keydown", handleKeydown);
    modal.querySelector("[data-profile-extra-close]")?.focus();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeModal();
  }

  function openQR() {
    const link = getProfileLink();
    if (!link) { notify(t("प्रोफाइल लिंक उपलब्ध भएन।","Profile link is unavailable."),"error"); return; }
    const qrURL = QR_ENDPOINT + "?size=240x240&margin=12&format=png&data=" + encodeURIComponent(link);
    showModal(t("मेरो QR प्रोफाइल","My QR Profile"),
      '<div class="ksk-profile-qr-wrap">' +
      '<img class="ksk-profile-qr-image" src="' + esc(qrURL) + '" alt="' + t("प्रोफाइल खोल्ने QR कोड","QR code for opening this profile") + '" referrerpolicy="no-referrer" loading="eager">' +
      '<p>' + t("यो QR स्क्यान गर्दा प्रोफाइल लिंक खुल्छ।","Scan this QR code to open the profile link.") + '</p>' +
      '<div class="ksk-profile-extra-actions"><button type="button" class="ksk-profile-extra-action" data-profile-extra-copy>' + t("लिंक कपी","Copy profile link") + '</button>' +
      '<button type="button" class="ksk-profile-extra-action secondary" data-profile-extra-share>Share</button></div>' +
      '<p class="ksk-profile-extra-note">' +
      t("QR बनाउन profile link QRServer सेवामा पठाइन्छ। यो सेवाले QR image बनाउँछ; तपाईंको नाम वा अन्य प्रोफाइल विवरण पठाइँदैन।","The profile link is sent to QRServer to create the QR image. Your name and other profile details are not sent.") +
      '</p></div>');
  }

  function openBadges() {
    const list = getAchievements();
    const earned = list.filter(item => item.earned).length;
    const rows = list.map(item =>
      '<article class="ksk-profile-badge' + (item.earned ? "" : " is-locked") + '">' +
      '<span class="ksk-profile-badge-icon" aria-hidden="true">' + item.icon + '</span>' +
      '<span class="ksk-profile-badge-copy"><strong>' + esc(item.title) + '</strong><small>' + esc(item.description) + '</small></span>' +
      '<span class="ksk-profile-badge-status">' + (item.earned ? t("प्राप्त","Earned") : t("बाँकी","Locked")) + '</span></article>'
    ).join("");
    showModal(t("उपलब्धि ब्याज","Achievement badges"),
      '<p class="ksk-profile-extra-note">' + earned + " / " + list.length + " " + t("उपलब्धि प्राप्त","achievements earned") + '</p>' +
      '<div class="ksk-profile-badge-list">' + rows + '</div>' +
      '<p class="ksk-profile-extra-note">' +
      t("यी उपलब्धिहरू यस ब्राउजरमा उपलब्ध प्रोफाइल, पोस्ट र साथीको तथ्याङ्कबाट गणना हुन्छन्। यी Verified वा आधिकारिक ब्याज होइनन्।","Achievements are calculated from profile, post and friend data available in this browser. They are not verified or official badges.") +
      '</p>');
  }

  async function copyLink() {
    const link = getProfileLink();
    if (!link) return false;
    try {
      if (global.navigator?.clipboard?.writeText && global.isSecureContext) {
        await global.navigator.clipboard.writeText(link);
      } else {
        const field = document.createElement("textarea");
        field.value = link;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Clipboard copy failed");
      }
      notify(t("प्रोफाइल लिंक कपी भयो।","Profile link copied."),"success");
      return true;
    } catch (error) {
      notify(t("लिंक कपी गर्न सकिएन।","Could not copy the link."),"error");
      return false;
    }
  }

  async function shareLink() {
    const link = getProfileLink();
    if (!link) return;
    if (typeof global.navigator?.share === "function") {
      try {
        await global.navigator.share({title:t("मेरो संसार प्रोफाइल","My Mero Sansar profile"),url:link});
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  function handleClick(event) {
    const trigger = event.target?.closest?.("[data-profile-extra-open]");
    if (trigger) {
      if (trigger.dataset.profileExtraOpen === "qr") openQR();
      if (trigger.dataset.profileExtraOpen === "badges") openBadges();
      return;
    }
    if (event.target?.closest?.("[data-profile-extra-copy]")) { copyLink(); return; }
    if (event.target?.closest?.("[data-profile-extra-share]")) shareLink();
  }

  function initialize() {
    if (observer || !document.body) return;
    ensureStyles();
    const host = $("#otherPageText") || document.body;
    observer = new MutationObserver(() => inject());
    observer.observe(host, {childList:true,subtree:true});
    inject();
    document.addEventListener("click", handleClick);
  }

  global.KSKProfileExtras = Object.freeze({
    initialize:initialize,
    refresh:inject,
    getAchievements:getAchievements,
    getProfileLink:getProfileLink
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",initialize,{once:true});
  } else {
    initialize();
  }
})(window);
