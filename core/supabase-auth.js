
"use strict";

/* =========================================================
   MERO SANSAR — VERIFIED EMAIL AUTHENTICATION
   Email + Password
   Mandatory Email Confirmation
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSupabaseAuth) return;

  const SUPABASE_URL =
    "https://sacyjxnobzunrwzxhwjs.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_IikjX5V1uUuhVuCUt569nw_ORYE5cQH";

  const SDK_URL =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const PANEL_ID = "ksk-supabase-auth-panel";
  const STYLE_ID = "ksk-supabase-auth-style";

  let client = null;
  let session = null;
  let sdkPromise = null;
  let initialized = false;
  let observer = null;
  let currentMode = "login";

  function t(ne, en) {
    return global.KSKLanguage?.getLanguage?.() === "en"
      ? en : ne;
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[c]);
  }

  function isVerified(user) {
    return Boolean(
      user?.email_confirmed_at ||
      user?.confirmed_at
    );
  }

  function isAuthenticated() {
    return Boolean(
      session?.user && isVerified(session.user)
    );
  }

  function getSettingsBody() {
    return document.getElementById("settingsBody");
  }

  function isAccountOpen() {
    return global.KSKSettingsUI?.getActiveSection?.() === "account";
  }

  function getErrorMessage(error) {
    return String(error?.message || t(
      "अनुरोध पूरा हुन सकेन। फेरि प्रयास गर्नुहोस्।",
      "The request could not be completed. Please try again."
    ));
  }

  function getEmail(form) {
    return String(new FormData(form).get("email") || "")
      .trim().toLowerCase();
  }

  function getPassword(form) {
    return String(new FormData(form).get("password") || "");
  }

  function setStatus(message, type = "info") {
    const status = document.querySelector(
      `#${PANEL_ID} [data-auth-status]`
    );

    if (!status) return;

    status.textContent = message;
    status.dataset.type = type;
    status.hidden = !message;
  }

  function setBusy(busy) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.querySelectorAll("button,input").forEach(el => {
      el.disabled = Boolean(busy);
    });
  }

  function notify(message, type = "info") {
    const toast = global.KSKToast;

    if (typeof toast?.show === "function") {
      toast.show(message, type);
    } else {
      console.info(message);
    }
  }

  /* SDK */

  function loadSDK() {
    if (global.supabase?.createClient) {
      return Promise.resolve(global.supabase);
    }

    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;

      script.onload = () => {
        if (global.supabase?.createClient) {
          resolve(global.supabase);
        } else {
          reject(new Error("Supabase SDK उपलब्ध भएन।"));
        }
      };

      script.onerror = () => reject(
        new Error("Supabase SDK लोड भएन। इन्टरनेट जाँच गर्नुहोस्।")
      );

      document.head.appendChild(script);
    });

    return sdkPromise;
  }

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

    // पुरानो वा पुष्टि नभएको Session लाई पहुँच नदिने
    if (session?.user && !isVerified(session.user)) {
      await client.auth.signOut();
      session = null;
    }

    client.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession || null;

      if (session?.user && !isVerified(session.user)) {
        session = null;

        global.setTimeout(() => {
          client.auth.signOut();
        }, 0);
      }

      global.setTimeout(() => {
        renderPanel(true);

        global.dispatchEvent(new CustomEvent(
          "ksk:auth-change",
          { detail: { user: session?.user || null } }
        ));
      }, 0);
    });

    return client;
  }

  /* SIGN UP */

  async function signUp(email, password) {
    const api = await initializeClient();

    const result = await api.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          global.location.origin + global.location.pathname
      }
    });

    if (result.error) throw result.error;

    session = result.data?.session || null;

    // Email confirmation अनिवार्य हुनुपर्छ।
    // Supabase मा confirmation बन्द छ भने पनि प्रवेश रोक्ने।
    if (session && !isVerified(result.data?.user)) {
      await api.auth.signOut();
      session = null;
    }

    if (session && !isVerified(session.user)) {
      await api.auth.signOut();
      session = null;
    }

    return {
      user: result.data?.user || null,
      session,
      confirmationRequired: !isVerified(result.data?.user)
    };
  }

  /* LOGIN */

  async function signIn(email, password) {
    const api = await initializeClient();

    const result = await api.auth.signInWithPassword({
      email,
      password
    });

    if (result.error) throw result.error;

    const user = result.data?.user;
    const newSession = result.data?.session;

    if (!isVerified(user)) {
      await api.auth.signOut();
      session = null;

      throw new Error(t(
        "तपाईंको इमेल पुष्टि भएको छैन। इमेलमा आएको Confirmation Link खोल्नुहोस्।",
        "Your email is not verified. Open the confirmation link sent to your email."
      ));
    }

    if (!newSession) {
      throw new Error(t(
        "Login Session प्राप्त भएन। फेरि प्रयास गर्नुहोस्।",
        "Login session was not received. Please try again."
      ));
    }

    session = newSession;

    global.dispatchEvent(new CustomEvent(
      "ksk:auth-change",
      { detail: { user } }
    ));

    return {
      user,
      session
    };
  }

  /* LOGOUT */

  async function signOut() {
    const api = await initializeClient();

    const result = await api.auth.signOut();

    if (result.error) throw result.error;

    session = null;
    renderPanel(true);

    global.dispatchEvent(new CustomEvent(
      "ksk:auth-change",
      { detail: { user: null } }
    ));

    return true;
  }

  /* PASSWORD RESET */

  async function resetPassword(email) {
    const api = await initializeClient();

    const result = await api.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          global.location.origin + global.location.pathname
      }
    );

    if (result.error) throw result.error;
    return true;
  }

  /* STYLES */

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${PANEL_ID} {
        margin:12px 0;
        padding:15px;
        border:1px solid var(--color-border);
        border-radius:15px;
        background:var(--color-surface);
        color:var(--color-text);
      }

      #${PANEL_ID} .ksk-auth-heading {
        display:flex;
        align-items:center;
        gap:10px;
        margin-bottom:13px;
      }

      #${PANEL_ID} .ksk-auth-icon {
        width:39px;
        height:39px;
        display:grid;
        place-items:center;
        border-radius:12px;
        background:var(--color-primary-soft);
        font-size:19px;
      }

      #${PANEL_ID} .ksk-auth-heading strong {
        display:block;
        font-size:14px;
        font-weight:800;
      }

      #${PANEL_ID} .ksk-auth-heading small {
        display:block;
        margin-top:3px;
        color:var(--color-muted);
        font-size:11px;
        line-height:1.5;
      }

      #${PANEL_ID} .ksk-auth-field {
        display:block;
        margin:11px 0;
      }

      #${PANEL_ID} .ksk-auth-field span {
        display:block;
        margin-bottom:6px;
        font-size:12px;
        font-weight:700;
      }

      #${PANEL_ID} .ksk-auth-field input {
        box-sizing:border-box;
        width:100%;
        min-height:43px;
        padding:10px 12px;
        border:1px solid var(--color-border);
        border-radius:10px;
        background:var(--color-surface-secondary);
        color:var(--color-text);
        font:inherit;
        font-size:13px;
      }

      #${PANEL_ID} .ksk-auth-primary,
      #${PANEL_ID} .ksk-auth-secondary {
        width:100%;
        min-height:42px;
        margin-top:9px;
        padding:10px 12px;
        border-radius:10px;
        font:inherit;
        font-size:12px;
        font-weight:800;
        cursor:pointer;
      }

      #${PANEL_ID} .ksk-auth-primary {
        border:1px solid var(--color-primary);
        background:var(--color-primary);
        color:white;
      }

      #${PANEL_ID} .ksk-auth-secondary {
        border:1px solid var(--color-border);
        background:var(--color-surface-secondary);
        color:var(--color-text);
      }

      #${PANEL_ID} .ksk-auth-link {
        display:block;
        width:100%;
        margin-top:12px;
        padding:5px;
        border:0;
        background:transparent;
        color:var(--color-primary);
        font:inherit;
        font-size:12px;
        font-weight:700;
        text-align:center;
        cursor:pointer;
      }

      #${PANEL_ID} .ksk-auth-status {
        margin:11px 0 0;
        padding:10px;
        border:1px solid var(--color-border);
        border-radius:9px;
        background:var(--color-surface-secondary);
        font-size:11px;
        line-height:1.6;
        overflow-wrap:anywhere;
      }

      #${PANEL_ID} .ksk-auth-status[data-type="error"] {
        border-color:var(--color-danger);
      }

      #${PANEL_ID} .ksk-auth-status[hidden] {
        display:none;
      }

      #${PANEL_ID} .ksk-auth-user {
        padding:11px;
        border-radius:10px;
        background:var(--color-surface-secondary);
        overflow-wrap:anywhere;
      }

      #${PANEL_ID} button:disabled,
      #${PANEL_ID} input:disabled {
        opacity:.6;
        cursor:wait;
      }
    `;

    document.head.appendChild(style);
  }

  /* PANEL HTML */

  function renderLoginPanel() {
    const signup = currentMode === "signup";

    return `
      <div id="${PANEL_ID}">
        <div class="ksk-auth-heading">
          <span class="ksk-auth-icon">🔐</span>
          <span>
            <strong>${signup
              ? t("नयाँ खाता बनाउनुहोस्", "Create an account")
              : t("आफ्नो खातामा प्रवेश गर्नुहोस्", "Sign in")
            }</strong>
            <small>${t(
              "इमेल पुष्टि गरेर सुरक्षित रूपमा जोडिनुहोस्।",
              "Verify your email to join securely."
            )}</small>
          </span>
        </div>

        <form data-auth-form data-auth-mode="${signup ? "signup" : "login"}">
          <label class="ksk-auth-field">
            <span>${t("इमेल ठेगाना", "Email address")}</span>
            <input type="email" name="email"
              autocomplete="email" maxlength="254"
              placeholder="name@example.com" required>
          </label>

          <label class="ksk-auth-field">
            <span>${t("पासवर्ड", "Password")}</span>
            <input type="password" name="password"
              autocomplete="${signup ? "new-password" : "current-password"}"
              minlength="6" maxlength="128"
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

        <button type="button" class="ksk-auth-link"
          data-auth-action="toggle">
          ${signup
            ? t("पहिल्यै खाता छ? Login गर्नुहोस्", "Already registered? Log in")
            : t("नयाँ प्रयोगकर्ता? Sign Up गर्नुहोस्", "New user? Sign up")
          }
        </button>

        ${!signup ? `
          <button type="button" class="ksk-auth-link"
            data-auth-action="reset">
            ${t("पासवर्ड बिर्सनुभयो?", "Forgot password?")}
          </button>
        ` : ""}

        <p class="ksk-auth-status" data-auth-status
          role="status" aria-live="polite" hidden></p>
      </div>
    `;
  }

  function renderSignedInPanel() {
    return `
      <div id="${PANEL_ID}">
        <div class="ksk-auth-heading">
          <span class="ksk-auth-icon">✓</span>
          <span>
            <strong>${t("खाता पुष्टि भयो", "Verified account")}</strong>
            <small>${t("तपाईं लगइन हुनुहुन्छ।", "You are signed in.")}</small>
          </span>
        </div>

        <div class="ksk-auth-user">
          <strong>${t("पुष्टि गरिएको इमेल", "Verified email")}</strong>
          <small>${escapeHTML(session?.user?.email || "")}</small>
        </div>

        <button type="button" class="ksk-auth-secondary"
          data-auth-action="logout">
          ${t("लगआउट गर्नुहोस्", "Log out")}
        </button>

        <p class="ksk-auth-status" data-auth-status
          role="status" aria-live="polite" hidden></p>
      </div>
    `;
  }

  function renderPanel(force = false) {
    if (!isAccountOpen()) return false;

    const body = getSettingsBody();
    if (!body) return false;

    const old = document.getElementById(PANEL_ID);

    if (old && !force) return true;
    old?.remove();

    const wrapper = document.createElement("div");

    wrapper.innerHTML = isAuthenticated()
      ? renderSignedInPanel()
      : renderLoginPanel();

    const panel = wrapper.firstElementChild;
    const info = body.querySelector(".ksk-settings-info");

    if (info) info.insertAdjacentElement("afterend", panel);
    else body.appendChild(panel);

    return true;
  }

  /* FORM */

  async function handleSubmit(event) {
    const form = event.target.closest("[data-auth-form]");
    if (!form) return;

    event.preventDefault();

    const email = getEmail(form);
    const password = getPassword(form);
    const mode = form.dataset.authMode;

    if (!email || password.length < 6) {
      setStatus(t(
        "सही इमेल र कम्तीमा ६ अक्षरको पासवर्ड राख्नुहोस्।",
        "Enter a valid email and a password of at least 6 characters."
      ), "error");
      return;
    }

    setBusy(true);
    setStatus(t("कृपया पर्खनुहोस्...", "Please wait..."));

    try {
      if (mode === "signup") {
        const result = await signUp(email, password);

        if (result.confirmationRequired) {
          currentMode = "login";
          renderPanel(true);

          setStatus(t(
            "खाता अनुरोध सफल भयो। आफ्नो इमेल Inbox वा Spam मा आएको Confirmation Link खोल्नुहोस्। इमेल पुष्टि भएपछि मात्र Login गर्न सकिन्छ।",
            "Signup request received. Check your inbox or spam folder for the confirmation link. You can log in only after verifying your email."
          ), "success");

          return;
        }

        throw new Error(t(
          "इमेल पुष्टि आवश्यक छ। Supabase Dashboard मा Email Confirmations सक्षम गर्नुहोस्।",
          "Email verification is required. Enable Email Confirmations in Supabase Dashboard."
        ));
      }

      await signIn(email, password);
      renderPanel(true);

      notify(t("लगइन सफल भयो।", "Login successful."), "success");

    } catch (error) {
      setStatus(getErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  /* BUTTONS */

  async function handleClick(event) {
    const button = event.target.closest("[data-auth-action]");
    if (!button) return;

    const action = button.dataset.authAction;

    if (action === "toggle") {
      currentMode = currentMode === "login" ? "signup" : "login";
      renderPanel(true);
      return;
    }

    if (action === "logout") {
      button.disabled = true;

      try {
        await signOut();
        notify(t("लगआउट सफल भयो।", "Logged out successfully."), "success");
      } catch (error) {
        setStatus(getErrorMessage(error), "error");
        button.disabled = false;
      }

      return;
    }

    if (action === "reset") {
      const form = document.querySelector(
        `#${PANEL_ID} [data-auth-form]`
      );

      const email = form ? getEmail(form) : "";

      if (!email) {
        setStatus(t(
          "पहिले इमेल ठेगाना लेख्नुहोस्।",
          "Enter your email address first."
        ), "error");
        form?.querySelector('[name="email"]')?.focus();
        return;
      }

      button.disabled = true;

      try {
        await resetPassword(email);
        setStatus(t(
          "पासवर्ड परिवर्तन गर्ने Link इमेलमा पठाइएको छ।",
          "A password reset link has been sent."
        ), "success");
      } catch (error) {
        setStatus(getErrorMessage(error), "error");
      } finally {
        button.disabled = false;
      }
    }
  }

  /* SETTINGS */

  function observeSettings() {
    const body = getSettingsBody();
    if (!body || observer) return;

    observer = new MutationObserver(() => {
      if (isAccountOpen()) renderPanel(false);
    });

    observer.observe(body, {
      childList: true,
      subtree: true
    });

    body.addEventListener("submit", handleSubmit);
    body.addEventListener("click", handleClick);
  }

  /* INITIALIZE */

  async function initialize() {
    if (initialized) return true;

    initialized = true;
    ensureStyles();
    observeSettings();

    try {
      await initializeClient();

      renderPanel(false);

      global.dispatchEvent(new CustomEvent(
        "ksk:auth-ready",
        { detail: { user: isAuthenticated() ? session.user : null } }
      ));

      return true;

    } catch (error) {
      console.error("Authentication initialization failed:", error);

      global.dispatchEvent(new CustomEvent(
        "ksk:auth-ready",
        { detail: { user: null, error: getErrorMessage(error) } }
      ));

      return false;
    }
  }

  /* PUBLIC API */

  global.KSKSupabaseAuth = Object.freeze({
    initialize,

    getClient() {
      return client;
    },

    getSession() {
      return isAuthenticated() ? session : null;
    },

    getUser() {
      return isAuthenticated() ? session.user : null;
    },

    isAuthenticated,

    signUp,
    signIn,
    signOut,
    resetPassword,

    render() {
      return renderPanel(true);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

})(window);
