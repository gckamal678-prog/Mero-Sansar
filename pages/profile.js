"use strict";

(function (global) {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  global.HamroPages.register("profile", {
    render() {
      const profile = global.HamroData.getProfile();

      let posts = [];
      try {
        const value = JSON.parse(localStorage.getItem("hs_posts_v1") || "[]");
        posts = Array.isArray(value) ? value : [];
      } catch {}

      const name = profile.name || "हाम्रो संसार सदस्य";

      return `
        <section class="hs-page">
          <div class="hs-profile-card">
            <div class="hs-profile-avatar">
              ${esc(profile.avatar || name.charAt(0))}
            </div>

            <h2>${esc(name)}</h2>
            <p>${esc(profile.bio || "")}</p>

            ${profile.location
              ? `<small>📍 ${esc(profile.location)}</small>`
              : ""}

            <div class="hs-profile-stats">
              <span><strong>${posts.length}</strong> पोस्ट</span>
              <span><strong>${global.HamroData.getFriends().length}</strong> साथी</span>
            </div>

            <div class="hs-profile-links">
              <button class="btn btn-secondary" type="button" data-page="saved">
                🔖 सेभ पोस्ट
              </button>
              <button class="btn btn-secondary" type="button" data-page="notifications">
                🔔 सूचनाहरू
              </button>
              <button class="btn btn-secondary" type="button" data-page="settings">
                ⚙ सेटिङ
              </button>
            </div>
          </div>

          <form class="hs-profile-form" data-hs-form="save-profile">
            <h3>प्रोफाइल सम्पादन</h3>

            <label>
              नाम
              <input class="form-input" name="name" required maxlength="60"
                value="${esc(name)}">
            </label>

            <label>
              बारेमा
              <textarea class="form-textarea" name="bio" maxlength="240">${esc(profile.bio || "")}</textarea>
            </label>

            <label>
              स्थान
              <input class="form-input" name="location" maxlength="100"
                value="${esc(profile.location || "")}">
            </label>

            <button class="btn btn-primary" type="submit">
              परिवर्तन सुरक्षित गर्नुहोस्
            </button>
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
    const current = global.HamroData.getProfile();
    const name = String(values.name || "").trim();

    if (!name) {
      global.HamroToast?.show("नाम खाली राख्न मिल्दैन।");
      return;
    }

    global.HamroData.saveProfile({
      name,
      bio: String(values.bio || "").trim(),
      location: String(values.location || "").trim(),
      avatar: name.charAt(0) || current.avatar
    });

    global.HamroApp?.refreshPage();
    global.HamroToast?.show("प्रोफाइल सुरक्षित भयो।", "success");
  });
})(window);
