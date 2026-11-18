
"use strict";

(function (global) {
  "use strict";

  if (global.KSKNotificationPushSettings) return;

  let observer = null;
  let currentStatus = null;
  let busy = false;

  const language = () =>
    global.KSKLanguage?.getLanguage?.() === "en";

  const text = (ne, en) => language() ? en : ne;

  function notify(message, type = "info") {
    global.KSKToast?.show?.(message, type);
  }

  function renderStatus(panel) {
    const status = panel.querySelector("[data-push-status]");
    const button = panel.querySelector("[data-push-toggle]");

    if (!status || !button) return;

    if (busy) {
      status.textContent = text(
        "Push स्थिति अपडेट हुँदैछ...",
        "Updating Push status..."
      );
      button.disabled = true;
      return;
    }

    if (!currentStatus) {
      status.textContent = text(
        "Push स्थिति जाँच हुँदैछ...",
        "Checking Push status..."
      );
      button.disabled = true;
      return;
    }

    if (!currentStatus.ok) {
      status.textContent = currentStatus.message ||
        text("Push उपलब्ध छैन।", "Push is unavailable.");

      button.textContent = text(
        "पुनः जाँच गर्नुहोस्",
        "Check again"
      );

      button.disabled = false;
      return;
    }

    const data = currentStatus.data;

    if (data.permission === "denied") {
      status.textContent = text(
        "ब्राउजरमा Notification अनुमति बन्द छ। ब्राउजर Settings मा अनुमति खोल्नुहोस्।",
        "Notification permission is blocked in browser settings."
      );
      button.textContent = text(
        "अनुमति बन्द छ",
        "Permission blocked"
      );
      button.disabled = true;
      return;
    }

    status.textContent = data.subscribed
      ? text(
          "यो डिभाइसमा Push Notification सक्रिय छ।",
          "Push notifications are enabled on this device."
        )
      : text(
          "यो डिभाइसमा Push Notification सक्रिय छैन।",
          "Push notifications are not enabled on this device."
        );

    button.textContent = data.subscribed
      ? text("Push बन्द गर्नुहोस्", "Turn Push off")
      : text("Push सक्रिय गर्नुहोस्", "Enable Push");

    button.disabled = false;
  }

  async function refresh() {
    const panel = document.getElementById("kskPushSettings");
    if (!panel) return;

    currentStatus = null;
    renderStatus(panel);

    const api = global.KSKSupabasePush;

    if (!api?.getStatus) {
      currentStatus = {
        ok: false,
        message: text(
          "Push सेवा लोड भएन।",
          "Push service did not load."
        )
      };
    } else {
      currentStatus = await api.getStatus();
    }

    renderStatus(panel);
  }

  function inject() {
    const settings = document.getElementById(
      "kskNotificationSettings"
    );

    if (!settings || settings.querySelector("#kskPushSettings")) {
      return;
    }

    const panel = document.createElement("section");
    panel.id = "kskPushSettings";
    panel.className = "ksk-push-settings";

    panel.innerHTML = `
      <h3>${text("📲 Background Notification", "📲 Background Notifications")}</h3>

      <p data-push-status>
        ${text("Push स्थिति जाँच हुँदैछ...", "Checking Push status...")}
      </p>

      <button
        type="button"
        class="ksk-notif-btn primary"
        data-push-toggle
        disabled>
        ${text("जाँच हुँदैछ...", "Checking...")}
      </button>

      <p class="ksk-notif-sound-note">
        ${text(
          "एप Background वा बन्द हुँदा पनि सूचना प्राप्त गर्न यो विकल्प सक्रिय गर्नुहोस्।",
          "Enable this to receive notifications while the app is in the background or closed."
        )}
      </p>
    `;

    settings.appendChild(panel);
    refresh();
  }

  async function handleClick(event) {
    const button = event.target?.closest?.("[data-push-toggle]");
    if (!button || busy) return;

    const api = global.KSKSupabasePush;

    if (!api) {
      notify(text("Push सेवा उपलब्ध छैन।", "Push service unavailable."), "error");
      return;
    }

    if (!currentStatus?.ok) {
      await refresh();
      return;
    }

    busy = true;
    const panel = document.getElementById("kskPushSettings");
    renderStatus(panel);

    try {
      /*
       * enable() is invoked directly from this click handler.
       * It requests permission before awaiting anything.
       */
      const operation = currentStatus.data.subscribed
        ? api.disable()
        : api.enable();

      const response = await operation;

      if (!response?.ok) {
        throw new Error(response?.message || text(
          "Push परिवर्तन गर्न सकिएन।",
          "Could not update Push settings."
        ));
      }

      notify(
        currentStatus.data.subscribed
          ? text("Push बन्द भयो।", "Push notifications disabled.")
          : text("Push सक्रिय भयो।", "Push notifications enabled."),
        "success"
      );

    } catch (error) {
      notify(
        error?.message || text("Push परिवर्तन असफल भयो।", "Push update failed."),
        "error"
      );
    } finally {
      busy = false;
      await refresh();
    }
  }

  function initialize() {
    if (observer) return true;

    document.addEventListener("click", handleClick);

    observer = new MutationObserver(() => {
      inject();
    });

    const start = () => {
      if (!document.body) return;

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      inject();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }

    global.addEventListener(
      "ksk:push-subscription-change",
      refresh
    );

    global.addEventListener("ksk:auth-change", refresh);

    return true;
  }

  global.KSKNotificationPushSettings = Object.freeze({
    initialize,
    refresh
  });

  initialize();

})(window);
