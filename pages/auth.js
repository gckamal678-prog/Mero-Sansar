
"use strict";

/*
 * MERO SANSAR — NEPALI WELCOME & AUTH
 * Welcome, signup, login, password visibility and password recovery.
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
    loading: "कृपया पर्खनुहोस्...",
    footer: "हाम्रो संसार — आफ्नोपनको साझा चौतारी",
    back: "पछाडि जानुहोस्"
  };

  function getRoot() {
    return document.getElementById(ROOT_ID);
  }

  function toast(message, type = "info", duration = 3500) {
    if (global.KSKToast?.show) {
      global.KSKToast.show(message, type, duration);
    }
  }

  /*
   * Convert provider errors into clear Nepali messages.
   * Never display raw technical error messages to users.
   */
  function friendlyError(error, action = "login") {
    const message = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();

    if (
      /failed to fetch|network|connection|load failed|internet|timeout/.test(message)
    ) {
      return "इन्टरनेट जडानमा समस्या भयो। आफ्नो इन्टरनेट जाँच गरेर फेरि प्रयास गर्नुहोस्।";
    }

    if (
      /user already registered|already registered|already exists/.test(message) ||
      code.includes("user_already_exists")
    ) {
      return "यो इमेलबाट खाता पहिले नै खोलिएको छ। लगइन गर्नुहोस् वा अर्को इमेल प्रयोग गर्नुहोस्।";
    }

    if (
      /invalid login credentials|invalid credentials|invalid email or password/.test(message)
    ) {
      return "इमेल वा पासवर्ड मिलेन। दुवै जाँच गरेर फेरि प्रयास गर्नुहोस्।";
    }

    if (
      /email not confirmed|email_not_confirmed/.test(message) ||
      code.includes("email_not_confirmed")
    ) {
      return "तपाईंको इमेल पुष्टि भएको छैन। इमेलमा आएको पुष्टि निर्देशन पूरा गर्नुहोस्।";
    }

    if (
      /password should be at least|weak password|password is too short/.test(message)
    ) {
      return "पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।";
    }

    if (
      /rate limit|too many requests|email rate limit/.test(message)
    ) {
      return "धेरै पटक प्रयास भयो। केही समयपछि फेरि प्रयास गर्नुहोस्।";
    }

    if (
      /invalid email|email address is invalid/.test(message)
    ) {
      return "कृपया सही इमेल ठेगाना राख्नुहोस्।";
    }

    if (
      /signup is disabled|signups not allowed|registration disabled/.test(message)
    ) {
      return "अहिले नयाँ खाता खोल्ने सुविधा उपलब्ध छैन। पछि फेरि प्रयास गर्नुहोस्।";
    }

    if (action === "signup") {
      return "खाता खोल्न सकिएन। आफ्नो विवरण जाँच गरेर फेरि प्रयास गर्नुहोस्।";
    }

    if (action === "reset") {
      return "पासवर्ड परिवर्तन गर्ने इमेल पठाउन सकिएन। इमेल जाँच गरेर फेरि प्रयास गर्नुहोस्।";
    }

    if (action === "session") {
      return "प्रवेश प्रणालीमा समस्या भयो। पृष्ठ पुनः खोल्नुहोस्।";
    }

    return "लगइन गर्न सकिएन। इमेल र पासवर्ड जाँच गरेर फेरि प्रयास गर्नुहोस्।";
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

      .ksk-auth-password-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }

      .ksk-auth-password-wrap input {
        padding-right: 54px;
      }

      .ksk-auth-eye {
        position: absolute;
        right: 7px;
        top: 50%;
        transform: translateY(-50%);
        width: 39px;
        height: 37px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 9px;
        background: transparent;
        color: var(--color-muted, #64748b);
        font-size: 19px;
        cursor: pointer;
      }

      .ksk-auth-eye:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
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
    root.setAttribute("aria-label", "हाम्रो संसार प्रवेश");
    root.setAttribute("aria-modal", "true");

    document.body.appendChild(root);
    return root;
  }

  function brandMarkup() {
    return `
      <div class="ksk-auth-brand">
        <img class="ksk-auth-logo" src="Nepal.jpg" alt="हाम्रो संसार लोगो">
        <h1>हाम्रो संसार</h1>
      </div>
    `;
  }

  function footerMarkup() {
    return `<p class="ksk-auth-footer">${TEXT.footer}</p>`;
  }

  function passwordField(id, name, label, autocomplete, minlength = 8) {
    return `
      <div class="ksk-auth-field">
        <label for="${id}">${label}</label>
        <div class="ksk-auth-password-wrap">
          <input
            id="${id}"
            name="${name}"
            type="password"
            minlength="${minlength}"
            autocomplete="${autocomplete}"
            required
          >
          <button
            class="ksk-auth-eye"
            type="button"
            data-password-toggle="${id}"
            aria-label="पासवर्ड देखाउनुहोस्"
            aria-pressed="false"
            title="पासवर्ड देखाउनुहोस्"
          >👁</button>
        </div>
      </div>
    `;
  }

  function welcomeMarkup() {
    return `
      ${brandMarkup()}
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
      ${footerMarkup()}
    `;
  }

  function signupMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="welcome">
        ← ${TEXT.back}
      </button>

      ${brandMarkup()}

      <div class="ksk-auth-card">
        <h2>नयाँ सदस्य बन्नुहोस्</h2>
        <p class="ksk-auth-description">
          आफ्नो खाता बनाएर हाम्रो साझा संसारमा जोडिनुहोस्।
        </p>

        <form class="ksk-auth-form" id="kskSignupForm">
          <div class="ksk-auth-field">
            <label for="kskSignupName">तपाईंको पूरा नाम</label>
            <input id="kskSignupName" name="name" type="text"
              maxlength="60" autocomplete="name" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupEmail">इमेल ठेगाना</label>
            <input id="kskSignupEmail" name="email" type="email"
              maxlength="254" autocomplete="email" required>
          </div>

          ${passwordField(
            "kskSignupPassword",
            "password",
            "पासवर्ड",
            "new-password"
          )}

          ${passwordField(
            "kskSignupConfirm",
            "confirmPassword",
            "पासवर्ड फेरि लेख्नुहोस्",
            "new-password"
          )}

          <button class="ksk-auth-button nepal" type="submit">
            खाता खोल्नुहोस्
          </button>
        </form>

        <p class="ksk-auth-bottom">
          पहिल्यै खाता छ?
          <button type="button" data-auth-mode="login">लगइन गर्नुहोस्</button>
        </p>
      </div>

      ${footerMarkup()}
    `;
  }

  function loginMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="welcome">
        ← ${TEXT.back}
      </button>

      ${brandMarkup()}

      <div class="ksk-auth-card">
        <h2>फेरि स्वागत छ!</h2>
        <p class="ksk-auth-description">
          आफ्नो खातामा प्रवेश गरेर साथीहरूसँग जोडिनुहोस्।
        </p>

        <form class="ksk-auth-form" id="kskLoginForm">
          <div class="ksk-auth-field">
            <label for="kskLoginEmail">इमेल ठेगाना</label>
            <input id="kskLoginEmail" name="email" type="email"
              maxlength="254" autocomplete="email" required>
          </div>

          ${passwordField(
            "kskLoginPassword",
            "password",
            "पासवर्ड",
            "current-password",
            1
          )}

          <button class="ksk-auth-button" type="submit">
            लगइन गर्नुहोस्
          </button>

          <button class="ksk-auth-link" type="button" data-auth-mode="reset">
            पासवर्ड बिर्सनुभयो?
          </button>
        </form>

        <p class="ksk-auth-bottom">
          नयाँ हुनुहुन्छ?
          <button type="button" data-auth-mode="signup">खाता खोल्नुहोस्</button>
        </p>
      </div>

      ${footerMarkup()}
    `;
  }

  function resetMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="login">
        ← ${TEXT.back}
      </button>

      ${brandMarkup()}

      <div class="ksk-auth-card">
        <h2>पासवर्ड पुनः प्राप्त गर्नुहोस्</h2>
        <p class="ksk-auth-description">
          तपाईंको इमेलमा पासवर्ड परिवर्तन गर्ने निर्देशन पठाइनेछ।
        </p>

        <form class="ksk-auth-form" id="kskResetForm">
          <div class="ksk-auth-field">
            <label for="kskResetEmail">इमेल ठेगाना</label>
            <input id="kskResetEmail" name="email" type="email"
              maxlength="254" autocomplete="email" required>
          </div>

          <button class="ksk-auth-button" type="submit">
            इमेल पठाउनुहोस्
          </button>
        </form>
      </div>

      ${footerMarkup()}
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

    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent.trim();
    }

    button.disabled = state;
    button.textContent = state
      ? TEXT.loading
      : button.dataset.originalText;
  }

  function readForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function getAuth() {
    if (!global.KSKSupabase) {
      const error = new Error("प्रवेश प्रणाली तयार छैन।");
      error.code = "AUTH_NOT_READY";
      throw error;
    }

    return global.KSKSupabase;
  }

  async function handleSignup(form) {
    const values = readForm(form);

    if (values.password !== values.confirmPassword) {
      toast("दुवै पासवर्ड मिलेनन्। फेरि जाँच गर्नुहोस्।", "warning");
      return;
    }

    if (String(values.password).length < 8) {
      toast("पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।", "warning");
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
          detail: {
            user: result.user,
            session: result.session
          }
        }));
      } else {
        render("login");
        toast(
          "दर्ता सफल भयो। आफ्नो इमेलमा आएको पुष्टि निर्देशन पूरा गरेर लगइन गर्नुहोस्।",
          "success",
          6000
        );
      }

    } catch (error) {
      toast(friendlyError(error, "signup"), "error", 5000);

    } finally {
      setBusy(form, false);
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
      toast(friendlyError(error, "login"), "error", 5000);

    } finally {
      setBusy(form, false);
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
      toast(friendlyError(error, "reset"), "error", 5000);

    } finally {
      setBusy(form, false);
    }
  }

  function togglePassword(button) {
    const id = button.dataset.passwordToggle;
    const input = document.getElementById(id);

    if (!input) return;

    const visible = input.type === "password";

    input.type = visible ? "text" : "password";
    button.textContent = visible ? "🙈" : "👁";
    button.setAttribute(
      "aria-label",
      visible ? "पासवर्ड लुकाउनुहोस्" : "पासवर्ड देखाउनुहोस्"
    );
    button.setAttribute("aria-pressed", String(visible));
    button.title = visible
      ? "पासवर्ड लुकाउनुहोस्"
      : "पासवर्ड देखाउनुहोस्";
  }

  function handleClick(event) {
    const eye = event.target.closest("[data-password-toggle]");

    if (eye) {
      event.preventDefault();
      togglePassword(eye);
      return;
    }

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
