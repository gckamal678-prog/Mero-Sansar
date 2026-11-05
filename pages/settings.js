"use strict";

(function (global) {
  global.HamroPages.register("settings", {
    render() {
      const theme = document.documentElement.dataset.theme || "light";

      return `
        <section class="hs-page">
          <div class="hs-page-heading">
            <h2>सेटिङ</h2>
            <p>एपको प्राथमिकता व्यवस्थापन गर्नुहोस्।</p>
          </div>

          <div class="card hs-settings-card">
            <div class="settings-row">
              <div>
                <div class="settings-label">रङ्ग शैली</div>
                <div class="settings-description">हाल ${theme === "dark" ? "Dark" : "Light"} mode</div>
              </div>
              <button class="btn btn-secondary" data-hs-action="toggle-theme">
                Theme बदल्नुहोस्
              </button>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">भाषा</div>
                <div class="settings-description">हाल नेपाली</div>
              </div>
              <span>नेपाली</span>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">स्थानीय डाटा</div>
                <div class="settings-description">पोस्ट र feature demo data यस उपकरणमा छन्।</div>
              </div>
              <button class="btn btn-danger" data-hs-action="clear-feature-data">
                Feature data हटाउनुहोस्
              </button>
            </div>
          </div>
        </section>
      `;
    },

    handle(action) {
      if (action === "toggle-theme") {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        if (global.HamroTheme?.setTheme) {
          global.HamroTheme.setTheme(next);
        } else {
          document.documentElement.dataset.theme = next;
          localStorage.setItem("hs_theme_v1", next);
        }
        global.HamroApp?.refreshPage();
      }

      if (action === "clear-feature-data") {
        if (!confirm("Friends, chats, notifications र profile demo data हटाउने?")) return;

        [
          "hs_feature_friends",
          "hs_feature_chats",
          "hs_feature_notifications",
          "hs_feature_profile",
          "hs_feature_savedPosts"
        ].forEach((key) => localStorage.removeItem(key));

        global.HamroApp?.refreshPage();
        global.HamroToast?.show("Feature demo data हटाइयो।");
      }
    }
  });
})(window);
