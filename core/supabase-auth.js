"use strict";

/* =========================================================
   MERO SANSAR — SUPABASE AUTHENTICATION
   Email + Password
   Login / Signup / Logout / Password Reset
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSupabaseAuth) return;

  const SUPABASE_URL =
    "https://sacyjxnobzunrwzxhwjs.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_IikjX5V1uUuhVuCUt569nw_ORYE5cQH";

  const SUPABASE_SDK_URL =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const PANEL_ID = "ksk-supabase-auth-panel";
  const STYLE_ID = "ksk-supabase-auth-style";

  let client = null;
  let session = null;
  let initialized = false;
  let sdkPromise = null;
  let observer = null;
  let currentMode = "login";

  /* =======================================================
     LANGUAGE
  ======================================================= */

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function getSettingsBody() {
    return document.getElementById("settingsBody");
  }

  function isAccountOpen() {
    return (
      global.KSKSettingsUI?.getActiveSection?.() === "account"
    );
  }

  function getErrorMessage(error) {
    return String(
      error?.message ||
      t(
        "अनुरोध पूरा हुन सकेन। फेरि प्रयास गर्नुहोस्।",
        "The request could not be completed. Please try again."
      )
    );
  }

  function getEmail(form) {
    return String(
      new FormData(form).get("email") || ""
    ).trim().toLowerCase();
  }

  function getPassword(form) {
    return String(
      new FormData(form).get("password") || ""
    );
  }

  function setStatus(message, type = "info") {
    const status = document.querySelector(
      "#" + PANEL_ID + " [data-auth-status]"
    );

    if (!status) return;

    status.textContent = message;
    status.dataset.type = type;
    status.hidden = !message;
  }

  function setBusy(busy) {
    const panel = document.getElementById(PANEL_ID);

    if (!panel) return;

    panel.querySelectorAll("button, input").forEach(element => {
      element.disabled = Boolean(busy);
    });

    panel.classList.toggle("ksk-auth-busy", Boolean(busy));
  }

  function notify(message, type = "info") {
    const toast = global.KSKToast;

    if (typeof toast?.show === "function") {
      toast.show(message, type);
      return;
    }

    if (type === "success") {
      toast?.success?.(message);
    } else if (type === "error") {
      toast?.error?.(message);
    } else {
      console.info(message);
    }
  }

  /* =======================================================
     LOAD SUPABASE SDK
  ======================================================= */

  function loadSDK() {
    if (global.supabase?.createClient) {
      return Promise.resolve(global.supabase);
    }

    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src = SUPABASE_SDK_URL;
      script.async = true;
      script.dataset.kskSupabaseSdk = "true";

      script.onload = () => {
        if (global.supabase?.createClient) {
          resolve(global.supabase);
        } else {
          reject(new Error("Supabase SDK उपलब्ध भएन।"));
        }
      };

      script.onerror = () => {
        reject(new Error(
          "Supabase SDK लोड भएन। इन्टरनेट जडान जाँच गर्नुहोस्।"
        ));
      };

      document.head.appendChild(script);
    });

    return sdkPromise;
  }

  /* =======================================================
     INITIALIZE CLIENT
  ======================================================= */

  async function initializeClient() {
    if (client) return client;

    const sdk = await loadSDK();

    client = sdk.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    const result = await client.auth.getSession();

    if (result.error) throw result.error;

    session = result.data?.session || null;

    client.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession || null;

      global.setTimeout(() => {
        renderPanel(true);

        global.dispatchEvent(
          new CustomEvent("ksk:auth-change", {
            detail: {
              user: session?.user || null
            }
          })
        );
      }, 0);
    });

    return client;
  }

  /* =======================================================
     AUTH API
  ======================================================= */

  async function signUp(email, password) {
    const api = await initializeClient();

    const result = await api.auth.signUp({
      email,
      password
    });

    if (result.error) throw result.error;

    session = result.data?.session || null;

    return {
      user: result.data?.user || null,
      session,
      confirmationRequired: !session
    };
  }

  async function signIn(email, password) {
    const api = await initializeClient();

    const result = await api.auth.signInWithPassword({
      email,
      password
    });

    if (result.error) throw result.error;

    session = result.data?.session || null;

    return {
      user: result.data?.user || null,
      session
    };
  }

  async function signOut() {
    const api = await initializeClient();

    const result = await api.auth.signOut();

    if (result.error) throw result.error;

    session = null;

    renderPanel(true);

    return true;
  }

  async function resetPassword(email) {
    const api = await initializeClient();

    const redirectTo =
      global.location.origin +
      global.location.pathname;

    const result = await api.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    );

    if (result.error) throw result.error;

    return true;
  }

  /* =======================================================
     STYLES
  ======================================================= */

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");

    style.id = STYLE_ID;

    style.textContent = `
      #${PANEL_ID} {
        margin: 12px 0;
        padding: 15px;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: var(--color-surface);
        color: var(--color-text);
        box-shadow: var(--shadow-xs);
      }

      #${PANEL_ID} .ksk-auth-heading {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 13px;
      }

      #${PANEL_ID} .ksk-auth-icon {
        width: 39px;
        height: 39px;
        flex: 0 0 39px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: var(--color-primary-soft);
        font-size: 19px;
      }

      #${PANEL_ID} .ksk-auth-heading strong {
        display: block;
        font-size: 14px;
        font-weight: 800;
      }

      #${PANEL_ID} .ksk-auth-heading small {
        display: block;
        margin-top: 3px;
        color: var(--color-muted);
        font-size: 11px;
        line-height: 1.5;
      }

      #${PANEL_ID} .ksk-auth-field {
        display: block;
        margin: 11px 0;
      }

      #${PANEL_ID} .ksk-auth-field span {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 700;
      }

      #${PANEL_ID} .ksk-auth-field input {
        box-sizing: border-box;
        width: 100%;
        min-height: 43px;
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        outline: none;
        background: var(--color-surface-secondary);
        color: var(--color-text);
        font: inherit;
        font-size: 13px;
      }

      #${PANEL_ID} .ksk-auth-field input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-soft);
      }

      #${PANEL_ID} .ksk-auth-primary,
      #${PANEL_ID} .ksk-auth-secondary {
        width: 100%;
        min-height: 42px;
        margin-top: 9px;
        padding: 10px 12px;
        border-radius: 10px;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      #${PANEL_ID} .ksk-auth-primary {
        border: 1px solid var(--color-primary);
        background: var(--color-primary);
        color: white;
      }

      #${PANEL_ID} .ksk-auth-secondary {
        border: 1px solid var(--color-border);
        background: var(--color-surface-secondary);
        color: var(--color-text);
      }

      #${PANEL_ID} .ksk-auth-link {
        display: block;
        width: 100%;
        margin-top: 12px;
        padding: 5px;
        border: 0;
        background: transparent;
        color: var(--color-primary);
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        cursor: pointer;
      }

      #${PANEL_ID} .ksk-auth-status {
        margin: 11px 0 0;
        padding: 10px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface-secondary);
        color: var(--color-text);
        font-size: 11px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      #${PANEL_ID} .ksk-auth-status[data-type="error"] {
        border-color: var(--color-danger);
      }

      #${PANEL_ID} .ksk-auth-status[hidden] {
        display: none;
      }

      #${PANEL_ID} .ksk-auth-user {
        padding: 11px;
        border-radius: 10px;
        background: var(--color-surface-secondary);
        overflow-wrap: anywhere;
      }

      #${PANEL_ID} .ksk-auth-user strong {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
      }

      #${PANEL_ID} .ksk-auth-user small {
        color: var(--color-muted);
        font-size: 11px;
      }

      #${PANEL_ID} .ksk-auth-busy {
        opacity: .72;
      }

      #${PANEL_ID} button:disabled,
      #${PANEL_ID} input:disabled {
        opacity: .6;
        cursor: wait;
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     PANEL HTML
  ======================================================= */

  function renderLoadingPanel() {
    return `
      <div id="${PANEL_ID}">
        <div class="ksk-auth-heading">
          <span class="ksk-auth-icon">🔐</span>
          <span>
            <strong>${t("सुरक्षित खाता", "Secure Account")}</strong>
            <small>${t(
              "Supabase Authentication जोडिँदैछ...",
              "Connecting to Supabase Authentication..."
            )}</small>
          </span>
        </div>
        <p class="ksk-settings-info">
          ${t("कृपया केही क्षण पर्खनुहोस्।", "Please wait a moment.")}
        </p>
      </div>
    `;
  }

  function renderLoginPanel() {
    const signup = currentMode === "signup";

    return `
      <div id="${PANEL_ID}">
        <div class="ksk-auth-heading">
          <span class="ksk-auth-icon">🔐</span>
          <span>
            <strong>${signup
              ? t("नयाँ खाता बनाउनुहोस्", "Create an account")
              : t("आफ्नो खातामा प्रवेश गर्नुहोस्", "Sign in to your account")
            }</strong>
            <small>${t(
              "Email र Password प्रयोग गरेर सुरक्षित रूपमा जोडिनुहोस्।",
              "Connect securely using your email and password."
            )}</small>
          </span>
        </div>

        <form data-auth-form data-auth-mode="${signup ? "signup" : "login"}">
          <label class="ksk-auth-field">
            <span>${t("इमेल ठेगाना", "Email address")}</span>
            <input
              type="email"
              name="email"
              autocomplete="email"
              maxlength="254"
              placeholder="name@example.com"
              required>
          </label>

          <label class="ksk-auth-field">
            <span>${t("पासवर्ड", "Password")}</span>
            <input
              type="password"
              name="password"
              autocomplete="${signup ? "new-password" : "current-password"}"
              minlength="6"
              maxlength="128"
              placeholder="${t("कम्तीमा ६ अक्षर", "At least 6 characters")}"
              required>
          </label>

          <button class="ksk-auth-primary" type="submit">
            ${signup
              ? t("खाता बनाउनुहोस्", "Create account")
              : t("लगइन गर्नुहोस्", "Log in")
            }
          </button>
        </form>

        <button
          type="button"
          class="ksk-auth-link"
          data-auth-action="toggle">
          ${signup
            ? t("पहिल्यै खाता छ? लगइन गर्नुहोस्", "Already have an account? Log in")
            : t("नयाँ हुनुहुन्छ? खाता बनाउनुहोस्", "New here? Create an account")
          }
        </button>

        ${!signup ? `
          <button
            type="button"
            class="ksk-auth-link"
            data-auth-action="reset">
            ${t("पासवर्ड बिर्सनुभयो?", "Forgot password?")}
          </button>
        ` : ""}

        <p
          class="ksk-auth-status"
          data-auth-status
          role="status"
          aria-live="polite"
          hidden></p>
      </div>
    `;
  }

  function renderSignedInPanel() {
    const email = session?.user?.email || "";

    return `
      <div id="${PANEL_ID}">
        <div class="ksk-auth-heading">
          <span class="ksk-auth-icon">✓</span>
          <span>
            <strong>${t("खाता जडान भयो", "Account connected")}</strong>
            <small>${t(
              "तपाईं Supabase मा लगइन हुनुहुन्छ।",
              "You are signed in to Supabase."
            )}</small>
          </span>
        </div>

        <div class="ksk-auth-user">
          <strong>${t("लगइन गरिएको इमेल", "Signed-in email")}</strong>
          <small>${escapeHTML(email)}</small>
        </div>

        <button
          type="button"
          class="ksk-auth-secondary"
          data-auth-action="logout">
          ${t("लगआउट गर्नुहोस्", "Log out")}
        </button>

        <p
          class="ksk-auth-status"
          data-auth-status
          role="status"
          aria-live="polite"
          hidden></p>
      </div>
    `;
  }

  /* =======================================================
     RENDER PANEL

     Important:
     Existing panel is not recreated unnecessarily.
     This prevents MutationObserver loops.
  ======================================================= */

  function renderPanel(force = false) {
    if (!isAccountOpen()) return false;

    const body = getSettingsBody();

    if (!body) return false;

    const oldPanel = document.getElementById(PANEL_ID);

    if (oldPanel && !force) {
      return true;
    }

    if (oldPanel) oldPanel.remove();

    let html;

    if (!client) {
      html = renderLoadingPanel();
    } else if (session?.user) {
      html = renderSignedInPanel();
    } else {
      html = renderLoginPanel();
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    const panel = wrapper.firstElementChild;
    const info = body.querySelector(".ksk-settings-info");

    if (info) {
      info.insertAdjacentElement("afterend", panel);
    } else {
      body.appendChild(panel);
    }

    return true;
  }

  /* =======================================================
     FORM SUBMISSION
  ======================================================= */

  async function handleSubmit(event) {
    const form = event.target.closest("[data-auth-form]");

    if (!form) return;

    event.preventDefault();

    const email = getEmail(form);
    const password = getPassword(form);
    const mode = form.dataset.authMode;

    if (!email || !password) {
      setStatus(
        t(
          "इमेल र पासवर्ड दुवै आवश्यक छन्।",
          "Email and password are required."
        ),
        "error"
      );
      return;
    }

    if (password.length < 6) {
      setStatus(
        t(
          "पासवर्ड कम्तीमा ६ अक्षरको हुनुपर्छ।",
          "Password must be at least 6 characters."
        ),
        "error"
      );
      return;
    }

    setBusy(true);

    setStatus(
      t("प्रक्रिया हुँदैछ...", "Please wait..."),
      "info"
    );

    try {
      if (mode === "signup") {
        const result = await signUp(email, password);

        if (result.confirmationRequired) {
          currentMode = "login";
          renderPanel(true);

          setStatus(
            t(
              "खाता बनाउने अनुरोध सफल भयो। आफ्नो इमेलमा आएको Confirmation Link खोल्नुहोस्, त्यसपछि लगइन गर्नुहोस्।",
              "Account created. Open the confirmation link sent to your email, then log in."
            ),
            "success"
          );

          return;
        }

        renderPanel(true);

        notify(
          t("खाता सफलतापूर्वक बन्यो।", "Account created successfully."),
          "success"
        );

      } else {
        await signIn(email, password);

        renderPanel(true);

        notify(
          t("लगइन सफल भयो।", "Login successful."),
          "success"
        );
      }

    } catch (error) {
      setStatus(getErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     CLICK ACTIONS
  ======================================================= */

  async function handleClick(event) {
    const button = event.target.closest("[data-auth-action]");

    if (!button) return;

    const action = button.dataset.authAction;

    if (action === "toggle") {
      currentMode =
        currentMode === "login" ? "signup" : "login";

      renderPanel(true);
      return;
    }

    if (action === "logout") {
      button.disabled = true;

      try {
        await signOut();

        notify(
          t("लगआउट सफल भयो।", "You have been logged out."),
          "success"
        );

      } catch (error) {
        setStatus(getErrorMessage(error), "error");
        button.disabled = false;
      }

      return;
    }

    if (action === "reset") {
      const form = document.querySelector(
        "#" + PANEL_ID + " [data-auth-form]"
      );

      const email = form ? getEmail(form) : "";

      if (!email) {
        setStatus(
          t(
            "पहिले आफ्नो इमेल ठेगाना लेख्नुहोस्।",
            "Enter your email address first."
          ),
          "error"
        );

        form?.querySelector('[name="email"]')?.focus();
        return;
      }

      button.disabled = true;

      try {
        await resetPassword(email);

        setStatus(
          t(
            "पासवर्ड परिवर्तन गर्ने Link तपाईंको इमेलमा पठाइयो।",
            "A password reset link has been sent to your email."
          ),
          "success"
        );

      } catch (error) {
        setStatus(getErrorMessage(error), "error");
      } finally {
        button.disabled = false;
      }
    }
  }

  /* =======================================================
     SETTINGS OBSERVER
  ======================================================= */

  function observeSettings() {
    const body = getSettingsBody();

    if (!body || observer) return;

    observer = new MutationObserver(() => {
      if (isAccountOpen()) {
        /*
         * renderPanel() does nothing when the panel
         * already exists. This prevents observer loops.
         */
        renderPanel(false);
      }
    });

    observer.observe(body, {
      childList: true,
      subtree: true
    });

    body.addEventListener("submit", handleSubmit);
    body.addEventListener("click", handleClick);
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  async function initialize() {
    if (initialized) return true;

    initialized = true;

    ensureStyles();
    observeSettings();

    try {
      await initializeClient();

      renderPanel(false);

      global.dispatchEvent(
        new CustomEvent("ksk:auth-ready", {
          detail: {
            user: session?.user || null
          }
        })
      );

      return true;

    } catch (error) {
      console.error(
        "Mero Sansar Authentication initialization failed:",
        error
      );

      if (isAccountOpen()) {
        const body = getSettingsBody();

        if (body) {
          const oldPanel = document.getElementById(PANEL_ID);
          oldPanel?.remove();

          const panel = document.createElement("div");

          panel.id = PANEL_ID;
          panel.className = "ksk-settings-info";
          panel.textContent = getErrorMessage(error);

          body.appendChild(panel);
        }
      }

      return false;
    }
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  global.KSKSupabaseAuth = Object.freeze({

    initialize,

    getClient() {
      return client;
    },

    getSession() {
      return session;
    },

    getUser() {
      return session?.user || null;
    },

    isAuthenticated() {
      return Boolean(session?.user);
    },

    signUp,
    signIn,
    signOut,
    resetPassword,

    render() {
      return renderPanel(true);
    }

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
