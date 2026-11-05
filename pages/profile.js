"use strict";

(function (global) {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  global.HamroPages.register("profile", {
    render() {
      const profile = global.HamroData.getProfile();
      const posts = (() => {
        try {
          const value = JSON.parse(localStorage.getItem("hs_posts_v1") || "[]");
          return Array.isArray(value) ? value : [];
        } catch {
          return [];
        }
      })();

      return `
        <section class="hs-page">
          <div class="hs-profile-card">
            <div class="hs-profile-avatar">${esc(profile.avatar || profile.name.charAt(0))}</div>
            <h2>${esc(profile.name)}</h2>
            <p>${esc(profile.bio)}</p>
            ${profile.location ? `<small>📍 ${esc(profile.location)}</small>` : ""}
            <div class="hs-profile-stats">
              <span><strong>${posts.length}</strong> पोस्ट</span>
              <span><strong>${global.HamroData.getFriends().length}</strong> साथी</span>
            </div>
          </div>

          <form class="hs-profile-form" data-hs-form="save-profile">
            <h3>प्रोफाइल सम्पादन</h3>
            <label>नाम
              <input class="form-input" name="name" required maxlength="60"
                value="${esc(profile.name)}">
            </label>
            <label>बारेमा
              <textarea class="form-textarea" name="bio" maxlength="240">${esc(profile.bio)}</textarea>
            </label>
            <label>स्थान
              <input class="form-input" name="location" maxlength="100"
                value="${esc(profile.location)}">
            </label>
            <button class="btn btn-primary" type="submit">परिवर्तन सुरक्षित गर्नुहोस्</button>
          </form>
        </section>
      `;
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest('[data-hs-form="save-profile"]');
    if (!form) return;

    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const profile = global.HamroData.getProfile();

    global.HamroData.saveProfile({
      ...values,
      avatar: values.name?.trim().charAt(0) || profile.avatar
    });

    global.HamroApp?.refreshPage();
    global.HamroToast?.show("प्रोफाइल सुरक्षित भयो।");
  });
})(window);
