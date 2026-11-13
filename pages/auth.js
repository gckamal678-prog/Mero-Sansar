
"use strict";

/*
 * MERO SANSAR — NEPALI WELCOME & AUTH INTERFACE
 *
 * Features:
 * - Original Nepali welcome screen
 * - Sign up
 * - Sign in
 * - Password recovery
 * - Responsive layout
 *
 * Authentication provider: KSKSupabase
 * This module does not initialize the main application.
 */

(function (global) {
  "use strict";

  if (global.KSKAuthPage) return;

  const ROOT_ID = "kskAuthRoot";
  const STYLE_ID = "kskAuthStyles";

  let initialized = false;
  let currentMode = "welcome";
  let busy = false;

  const TEXT = {
    welcome: "आफ्नोपन जोड्ने, सम्बन्ध बढाउने",
    description: "आफ्ना मान्छे, आफ्ना कुरा र आफ्नै संसार — अब एउटै ठाउँमा।",
    join: "नयाँ खाता खोल्नुहोस्",
    login: "आफ्नो खातामा प्रवेश गर्नुहोस्",
    name: "तपाईंको पूरा नाम",
    email: "इमेल ठेगाना",
    password: "पासवर्ड",
    confirm: "पासवर्ड फेरि लेख्नुहोस्",
    signup: "खाता खोल्नुहोस्",
    signin: "लगइन गर्नुहोस्",
    forgot: "पासवर्ड बिर्सनुभयो?",
    back: "पछाडि जानुहोस्",
    haveAccount: "पहिल्यै खाता छ?",
    noAccount: "नयाँ हुनुहुन्छ?",
    loginLink: "लगइन गर्नुहोस्",
    signupLink: "खाता खोल्नुहोस्",
    resetTitle: "पासवर्ड पुनः प्राप्त गर्नुहोस्",
    resetDescription: "तपाईंको इमेलमा पासवर्ड परिवर्तन गर्ने निर्देशन पठाइनेछ।",
    sendReset: "इमेल पठाउनुहोस्",
    loading: "कृपया पर्खनुहोस्...",
    footer: "हाम्रो संसार — आफ्नोपनको साझा चौतारी",
    terms: "आफ्नो खाता सुरक्षित राख्न बलियो पासवर्ड प्रयोग गर्नुहोस्।"
  };

  function getRoot() {
    return document.getElementById(ROOT_ID);
  }

  function toast(message, type = "info") {
    if (global.KSKToast?.show) {
      global.KSKToast.show(message, type);
    } else {
      console.info(message);
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        inset: 0;
        z-index: 99990;
        display: none;
        overflow-y: auto;
        padding: 22px 16px;
        background:
          radial-gradient(ellipse at 10% 5%, rgba(37,99,235,.10), transparent 42%),
          radial-gradient(ellipse at 90% 90%, rgba(220,38,38,.09), transparent 42%),
          var(--color-background, #f4f7fb);
        color: var(--color-text, #172033);
        font-family: var(--font-main, "Noto Sans Devanagari", sans-serif);
        -webkit-overflow-scrolling: touch;
      }

      #${ROOT_ID}.is-visible {
        display: grid;
        place-items: center;
      }

      #${ROOT_ID} *,
      #${ROOT_ID} *::before,
      #${ROOT_ID} *::after {
        box-sizing: border-box;
      }

      .ksk-auth-shell {
        width: min(100%, 440px);
        margin: auto;
      }

      .ksk-auth-brand {
        text-align: center;
        margin-bottom: 22px;
      }

      .ksk-auth-logo {
        width: 76px;
        height: 76px;
        display: block;
        margin: 0 auto 12px;
        object-fit: cover;
        border-radius: 23px;
        border: 3px solid #fff;
        box-shadow: 0 8px 25px rgba(15,23,42,.13);
      }

      .ksk-auth-brand h1 {
        margin: 0;
        font-size: clamp(25px, 7vw, 32px);
        line-height: 1.5;
        font-weight: 900;
        letter-spacing: -.5px;
      }

      .ksk-auth-brand p {
        margin: 5px 0 0;
        color: var(--color-muted, #64748b);
        font-size: 13px;
      }

      .ksk-auth-flag {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin: 15px auto 0;
      }

      .ksk-auth-flag span {
        width: 31px;
        height: 4px;
        border-radius: 10px;
      }

      .ksk-auth-flag span:nth-child(1),
      .ksk-auth-flag span:nth-child(3) {
        background: #dc2626;
      }

      .ksk-auth-flag span:nth-child(2) {
        background: #2563eb;
      }

      .ksk-auth-card {
        padding: 25px 21px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 24px;
        background: var(--color-surface, #fff);
        box-shadow: 0 15px 45px rgba(15,23,42,.08);
      }

      .ksk-auth-card h2 {
        margin: 0 0 8px;
        font-size: 21px;
        font-weight: 900;
        text-align: center;
      }

      .ksk-auth-description {
        margin: 0 auto 22px;
        max-width: 340px;
        color: var(--color-muted, #64748b);
        font-size: 13px;
        line-height: 1.9;
        text-align: center;
      }

      .ksk-auth-actions {
        display: grid;
        gap: 11px;
      }

      .ksk-auth-button {
        width: 100%;
        min-height: 49px;
        padding: 12px 16px;
        border: 1px solid transparent;
        border-radius: 13px;
        background: #2563eb;
        color: #fff;
        font: inherit;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        transition: transform .15s ease, opacity .15s ease;
      }

      .ksk-auth-button:active {
        transform: scale(.985);
      }

      .ksk-auth-button:disabled {
        opacity: .6;
        cursor: wait;
      }

      .ksk-auth-button.secondary {
        border-color: var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
      }

      .ksk-auth-button.nepal {
        background: #dc2626;
      }

      .ksk-auth-form {
        display: grid;
        gap: 14px;
      }

      .ksk-auth-field {
        display: grid;
        gap: 7px;
      }

      .ksk-auth-field label {
        font-size: 12px;
        font-weight: 800;
        color: var(--color-text-secondary, #475569);
      }

      .ksk-auth-field input {
        width: 100%;
        min-height: 47px;
        padding: 11px 13px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 11px;
        outline: none;
        background: var(--color-surface-secondary, #f8fafc);
        color: var(--color-text, #172033);
        font: inherit;
        font-size: 14px;
      }

      .ksk-auth-field input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37,99,235,.12);
      }

      .ksk-auth-link {
        display: block;
        width: fit-content;
        margin: 1px auto;
        padding: 5px;
        border: 0;
        background: transparent;
        color: #2563eb;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .ksk-auth-bottom {
        margin-top: 17px;
        color: var(--color-muted, #64748b);
        font-size: 12px;
        text-align: center;
        line-height: 1.9;
      }

      .ksk-auth-bottom button {
        border: 0;
        padding: 3px;
        background: transparent;
        color: #2563eb;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      .ksk-auth-note {
        margin: 14px 0 0;
        color: var(--color-muted, #64748b);
        font-size: 11px;
        line-height: 1.8;
        text-align: center;
      }

      .ksk-auth-footer {
        margin: 19px 0 0;
        color: var(--color-muted, #64748b);
        font-size: 11px;
        text-align: center;
      }

      .ksk-auth-back {
        display: block;
        margin: 0 auto 15px;
        padding: 7px 10px;
        border: 0;
        background: transparent;
        color: var(--color-muted, #64748b);
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }

      @media (max-width: 380px) {
        #${ROOT_ID} {
          padding: 16px 12px;
        }

        .ksk-auth-card {
          padding: 21px 16px;
        }

        .ksk-auth-logo {
          width: 66px;
          height: 66px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${ROOT_ID} *,
        #${ROOT_ID} *::before,
        #${ROOT_ID} *::after {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createRoot() {
    let root = getRoot();

    if (root) return root;

    root = document.createElement("section");
    root.id = ROOT_ID;
    root.setAttribute("aria-label", "Mero Sansar प्रवेश");

    document.body.appendChild(root);

    return root;
  }

  function welcomeMarkup() {
    return `
      <div class="ksk-auth-brand">
        <img class="ksk-auth-logo" src="Nepal.jpg" alt="हाम्रो संसार लोगो">
        <h1>हाम्रो संसार</h1>
        <p>आफ्नोपन जोड्ने, सम्बन्ध बढाउने</p>
        <div class="ksk-auth-flag" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div class="ksk-auth-card">
        <h2>स्वागत छ!</h2>
        <p class="ksk-auth-description">
          आफ्ना मान्छेहरूसँग जोडिनुहोस्।
          मनका कुरा बाँड्नुहोस् र सम्बन्धलाई अझ नजिक बनाउनुहोस्।
          यो हो तपाईंको आफ्नै साझा चौतारी।
        </p>

        <div class="ksk-auth-actions">
          <button class="ksk-auth-button nepal" type="button" data-auth-mode="signup">
            नयाँ संसार सुरु गरौँ
          </button>

          <button class="ksk-auth-button secondary" type="button" data-auth-mode="login">
            फेरि भेटौँ — लगइन गर्नुहोस्
          </button>
        </div>

        <p class="ksk-auth-note">
          आफ्ना मान्छे, आफ्ना कुरा र आफ्नै संसार।
        </p>
      </div>

      <p class="ksk-auth-footer">${TEXT.footer}</p>
    `;
  }

  function signupMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="welcome">← ${TEXT.back}</button>

      <div class="ksk-auth-brand">
        <img class="ksk-auth-logo" src="Nepal.jpg" alt="हाम्रो संसार लोगो">
        <h1>हाम्रो संसार</h1>
      </div>

      <div class="ksk-auth-card">
        <h2>नयाँ सदस्य बन्नुहोस्</h2>
        <p class="ksk-auth-description">
          आफ्नो खाता बनाएर हाम्रो साझा संसारमा जोडिनुहोस्।
        </p>

        <form class="ksk-auth-form" id="kskSignupForm">
          <div class="ksk-auth-field">
            <label for="kskSignupName">${TEXT.name}</label>
            <input id="kskSignupName" name="name" type="text" maxlength="60" autocomplete="name" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupEmail">${TEXT.email}</label>
            <input id="kskSignupEmail" name="email" type="email" maxlength="254" autocomplete="email" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupPassword">${TEXT.password}</label>
            <input id="kskSignupPassword" name="password" type="password" minlength="8" autocomplete="new-password" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupConfirm">${TEXT.confirm}</label>
            <input id="kskSignupConfirm" name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required>
          </div>

          <button class="ksk-auth-button nepal" type="submit">${TEXT.signup}</button>
        </form>

        <p class="ksk-auth-bottom">
          ${TEXT.haveAccount}
          <button type="button" data-auth-mode="login">${TEXT.loginLink}</button>
        </p>
      </div>

      <p class="ksk-auth-footer">${TEXT.footer}</p>
    `;
  }

  function loginMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="welcome">← ${TEXT.back}</button>

      <div class="ksk-auth-brand">
        <img class="ksk-auth-logo" src="Nepal.jpg" alt="हाम्रो संसार लोगो">
        <h1>हाम्रो संसार</h1>
      </div>

      <div class="ksk-auth-card">
        <h2>फेरि स्वागत छ!</h2>
        <p class="ksk-auth-description">
          आफ्नो खातामा प्रवेश गरेर साथीहरूसँग जोडिनुहोस्।
        </p>

        <form class="ksk-auth-form" id="kskLoginForm">
          <div class="ksk-auth-field">
            <label for="kskLoginEmail">${TEXT.email}</label>
            <input id="kskLoginEmail" name="email" type="email" maxlength="254" autocomplete="email" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskLoginPassword">${TEXT.password}</label>
            <input id="kskLoginPassword" name="password" type="password" autocomplete="current-password" required>
          </div>

          <button class="ksk-auth-button" type="submit">${TEXT.signin}</button>
          <button class="ksk-auth-link" type="button" data-auth-mode="reset">${TEXT.forgot}</button>
        </form>

        <p class="ksk-auth-bottom">
          ${TEXT.noAccount}
          <button type="button" data-auth-mode="signup">${TEXT.signupLink}</button>
        </p>
      </div>

      <p class="ksk-auth-footer">${TEXT.footer}</p>
    `;
  }

  function resetMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="login">← ${TEXT.back}</button>

      <div class="ksk-auth-brand">
        <img class="ksk-auth-logo" src="Nepal.jpg" alt="हाम्रो संसार लोगो">
        <h1>हाम्रो संसार</h1>
      </div>

      <div class="ksk-auth-card">
        <h2>${TEXT.resetTitle}</h2>
        <p class="ksk-auth-description">${TEXT.resetDescription}</p>

        <form class="ksk-auth-form" id="kskResetForm">
          <div class="ksk-auth-field">
            <label for="kskResetEmail">${TEXT.email}</label>
            <input id="kskResetEmail" name="email" type="email" maxlength="254" autocomplete="email" required>
          </div>

          <button class="ksk-auth-button" type="submit">${TEXT.sendReset}</button>
        </form>
      </div>

      <p class="ksk-auth-footer">${TEXT.footer}</p>
    `;
  }

  function render(mode = "welcome") {
    const root = createRoot();

    currentMode = [
      "welcome",
      "signup",
      "login",
      "reset"
    ].includes(mode) ? mode : "welcome";

    const views = {
      welcome: welcomeMarkup,
      signup: signupMarkup,
      login: loginMarkup,
      reset: resetMarkup
    };

    root.innerHTML =
      '<div class="ksk-auth-shell">' +
      views[currentMode]() +
      '</div>';

    root.classList.add("is-visible");

    const firstInput = root.querySelector("input");

    if (firstInput) {
      firstInput.focus({ preventScroll: true });
    }

    return true;
  }

  function setBusy(form, state) {
    if (!form) return;

    busy = state;

    const button = form.querySelector(
      'button[type="submit"]'
    );

    if (!button) return;

    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.disabled = state;

    button.textContent = state
      ? TEXT.loading
      : button.dataset.originalText;
  }

  function readForm(form) {
    return Object.fromEntries(
      new FormData(form).entries()
    );
  }

  function getAuth() {
    const auth = global.KSKSupabase;

    if (!auth) {
      throw new Error(
        "प्रवेश प्रणाली तयार छैन। कृपया केही समयपछि फेरि प्रयास गर्नुहोस्।"
      );
    }

    return auth;
  }

  async function handleSignup(form) {
    const values = readForm(form);

    if (values.password !== values.confirmPassword) {
      toast("दुवै पासवर्ड मिलेनन्। फेरि जाँच गर्नुहोस्।", "warning");
      return;
    }

    setBusy(form, true);

    try {
      const result = await getAuth().signUp({
        name: values.name,
        email: values.email,
        password: values.password
      });

      if (result.session) {
        toast("खाता सफलतापूर्वक तयार भयो। स्वागत छ!", "success");
        global.dispatchEvent(new CustomEvent("ksk:auth-complete", {
          detail: { user: result.user, session: result.session }
        }));
      } else {
        render("login");
        toast("दर्ता सफल भयो। इमेलमा आएको पुष्टि निर्देशन पूरा गरेर लगइन गर्नुहोस्।", "success");
      }

    } catch (error) {
      toast(error.message || "खाता खोल्न सकिएन। फेरि प्रयास गर्नुहोस्।", "error");
    } finally {
      busy = false;
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = false;
    }
  }

  async function handleLogin(form) {
    const values = readForm(form);

    setBusy(form, true);

    try {
      const result = await getAuth().signIn({
        email: values.email,
        password: values.password
      });

      toast("स्वागत छ! तपाईं सफलतापूर्वक प्रवेश गर्नुभयो।", "success");

      global.dispatchEvent(new CustomEvent("ksk:auth-complete", {
        detail: {
          user: result.user,
          session: result.session
        }
      }));

    } catch (error) {
      toast(error.message || "लगइन गर्न सकिएन। इमेल र पासवर्ड जाँच गर्नुहोस्।", "error");
    } finally {
      busy = false;
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = false;
    }
  }

  async function handleReset(form) {
    const values = readForm(form);

    setBusy(form, true);

    try {
      const redirectURL = new URL(
        global.location.pathname,
        global.location.origin
      ).href;

      await getAuth().sendPasswordReset(
        values.email,
        redirectURL
      );

      render("login");

      toast(
        "यदि यो इमेलमा खाता छ भने पासवर्ड परिवर्तन गर्ने निर्देशन पठाइएको छ।",
        "success",
        6000
      );

    } catch (error) {
      toast(error.message || "इमेल पठाउन सकिएन। फेरि प्रयास गर्नुहोस्।", "error");
    } finally {
      busy = false;
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = false;
    }
  }

  function handleClick(event) {
    const button = event.target.closest("[data-auth-mode]");

    if (!button) return;

    event.preventDefault();

    if (busy) return;

    render(button.dataset.authMode);
  }

  function handleSubmit(event) {
    const form = event.target;

    if (!form || !form.id) return;

    event.preventDefault();

    if (busy) return;

    if (form.id === "kskSignupForm") {
      handleSignup(form);
    } else if (form.id === "kskLoginForm") {
      handleLogin(form);
    } else if (form.id === "kskResetForm") {
      handleReset(form);
    }
  }

  function initialize(options = {}) {
    if (initialized) return true;

    injectStyles();
    createRoot();

    const root = getRoot();

    root.addEventListener("click", handleClick);
    root.addEventListener("submit", handleSubmit);

    initialized = true;

    if (options.show !== false) {
      render(options.mode || "welcome");
    }

    return true;
  }

  function show(mode = "welcome") {
    if (!initialized) initialize({ show: false });
    return render(mode);
  }

  function hide() {
    const root = getRoot();

    if (!root) return false;

    root.classList.remove("is-visible");

    return true;
  }

  function destroy() {
    const root = getRoot();

    if (root) {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("submit", handleSubmit);
      root.remove();
    }

    document.getElementById(STYLE_ID)?.remove();

    initialized = false;
    busy = false;

    return true;
  }

  global.KSKAuthPage = Object.freeze({
    initialize,
    show,
    hide,
    render,
    destroy,
    getMode: () => currentMode,
    isVisible: () => Boolean(
      getRoot()?.classList.contains("is-visible")
    )
  });

})(window);
