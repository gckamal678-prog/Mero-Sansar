
"use strict";

/*
 * MERO SANSAR — WELCOME & AUTHENTICATION
 * Nepali / English welcome, signup, login and password recovery.
 */

(function (global) {
  "use strict";

  if (global.KSKAuthPage) return;

  const ROOT_ID = "kskAuthRoot";
  const STYLE_ID = "kskAuthStyles";

  let initialized = false;
  let currentMode = "welcome";
  let busy = false;
  let pendingEmail = "";

  const translations = {
    ne: {
      app: "हाम्रो संसार",
      footer: "हाम्रो संसार — आफ्नोपनको साझा चौतारी",
      back: "पछाडि जानुहोस्",
      welcome: "स्वागत छ!",
      welcomeText: "आफ्ना मान्छेहरूसँग जोडिनुहोस्। मनका कुरा बाँड्नुहोस् र सम्बन्धलाई अझ नजिक बनाउनुहोस्। यो हो तपाईंको आफ्नै साझा चौतारी।",
      start: "नयाँ संसार सुरु गरौँ",
      login: "फेरि भेटौँ — लगइन गर्नुहोस्",
      note: "आफ्ना मान्छे, आफ्ना कुरा र आफ्नै संसार।",
      signupTitle: "नयाँ सदस्य बन्नुहोस्",
      signupText: "आफ्नो खाता बनाएर हाम्रो साझा संसारमा जोडिनुहोस्।",
      firstName: "तपाईंको नाम",
      lastName: "थर",
      birthDate: "जन्ममिति",
      gender: "लिङ्ग छान्नुहोस्",
      male: "पुरुष",
      female: "महिला",
      other: "अन्य",
      location: "सहर वा जिल्ला",
      locationHint: "घरको पूरा ठेगाना होइन, सहर वा जिल्ला लेख्नुहोस्।",
      email: "इमेल ठेगाना",
      password: "पासवर्ड",
      confirm: "पासवर्ड फेरि लेख्नुहोस्",
      create: "खाता खोल्नुहोस्",
      already: "पहिल्यै खाता छ?",
      newUser: "नयाँ हुनुहुन्छ?",
      loginTitle: "फेरि स्वागत छ!",
      loginText: "आफ्नो खातामा प्रवेश गरेर साथीहरूसँग जोडिनुहोस्।",
      loginButton: "लगइन गर्नुहोस्",
      forgot: "पासवर्ड बिर्सनुभयो?",
      resetTitle: "पासवर्ड पुनः प्राप्त गर्नुहोस्",
      resetText: "तपाईंको इमेलमा पासवर्ड परिवर्तन गर्ने निर्देशन पठाइनेछ।",
      sendEmail: "इमेल पठाउनुहोस्",
      loading: "कृपया पर्खनुहोस्...",
      showPassword: "पासवर्ड देखाउनुहोस्",
      hidePassword: "पासवर्ड लुकाउनुहोस्",
      language: "भाषा",
      nepali: "नेपाली",
      english: "English",
      mismatch: "दुवै पासवर्ड मिलेनन्। फेरि जाँच गर्नुहोस्।",
      weak: "पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।",
      emailSentTitle: "इमेल पुष्टि गर्नुहोस्",
      emailSent: "तपाईंको खाता तयार गर्ने प्रक्रिया सफल भयो। तपाईंको इमेलमा पुष्टि गर्ने सन्देश पठाइएको छ। इमेल खोलेर पुष्टि गर्ने लिङ्क थिच्नुहोस्। त्यसपछि लगइन गर्नुहोस्।",
      resend: "पुष्टि इमेल फेरि पठाउनुहोस्",
      resendDone: "पुष्टि इमेल फेरि पठाइएको छ। आफ्नो इमेल जाँच गर्नुहोस्।",
      resendFailed: "पुष्टि इमेल पठाउन सकिएन। केही समयपछि फेरि प्रयास गर्नुहोस्।",
      backLogin: "लगइन पृष्ठमा जानुहोस्",
      signupSuccess: "खाता सफलतापूर्वक तयार भयो। स्वागत छ!",
      loginSuccess: "स्वागत छ! तपाईं सफलतापूर्वक प्रवेश गर्नुभयो।",
      resetSuccess: "यदि यो इमेलमा खाता छ भने पासवर्ड परिवर्तन गर्ने निर्देशन पठाइएको छ।",
      network: "इन्टरनेट जडानमा समस्या भयो। आफ्नो इन्टरनेट जाँच गरेर फेरि प्रयास गर्नुहोस्।",
      exists: "यो इमेलबाट खाता पहिले नै खोलिएको छ। लगइन गर्नुहोस् वा अर्को इमेल प्रयोग गर्नुहोस्।",
      invalidLogin: "इमेल वा पासवर्ड मिलेन। दुवै जाँच गरेर फेरि प्रयास गर्नुहोस्।",
      unconfirmed: "तपाईंको इमेल पुष्टि भएको छैन। इमेलमा आएको पुष्टि निर्देशन पूरा गर्नुहोस्।",
      rateLimit: "धेरै पटक प्रयास भयो। केही समयपछि फेरि प्रयास गर्नुहोस्।",
      invalidEmail: "कृपया सही इमेल ठेगाना राख्नुहोस्।",
      signupDisabled: "अहिले नयाँ खाता खोल्ने सुविधा उपलब्ध छैन। पछि फेरि प्रयास गर्नुहोस्।",
      signupError: "खाता खोल्न सकिएन। आफ्नो विवरण जाँच गरेर फेरि प्रयास गर्नुहोस्।",
      resetError: "पासवर्ड परिवर्तन गर्ने इमेल पठाउन सकिएन। फेरि प्रयास गर्नुहोस्।",
      loginError: "लगइन गर्न सकिएन। इमेल र पासवर्ड जाँच गर्नुहोस्।",
      firstRequired: "कृपया आफ्नो नाम लेख्नुहोस्।",
      lastRequired: "कृपया आफ्नो थर लेख्नुहोस्।",
      birthRequired: "कृपया सही जन्ममिति छान्नुहोस्।",
      genderRequired: "कृपया लिङ्ग छान्नुहोस्।",
      locationRequired: "कृपया आफ्नो सहर वा जिल्ला लेख्नुहोस्।"
    },

    en: {
      app: "Hamro Sansar",
      footer: "Hamro Sansar — A place to feel connected",
      back: "Go back",
      welcome: "Welcome!",
      welcomeText: "Connect with your people. Share your thoughts and bring relationships closer. This is your own shared community.",
      start: "Create a new account",
      login: "Welcome back — Log in",
      note: "Your people, your stories, your world.",
      signupTitle: "Become a member",
      signupText: "Create your account and join our community.",
      firstName: "First name",
      lastName: "Last name",
      birthDate: "Date of birth",
      gender: "Select gender",
      male: "Male",
      female: "Female",
      other: "Other",
      location: "City or district",
      locationHint: "Enter your city or district, not your full home address.",
      email: "Email address",
      password: "Password",
      confirm: "Confirm password",
      create: "Create account",
      already: "Already have an account?",
      newUser: "New here?",
      loginTitle: "Welcome back!",
      loginText: "Log in to connect with your friends.",
      loginButton: "Log in",
      forgot: "Forgot password?",
      resetTitle: "Reset your password",
      resetText: "Instructions to reset your password will be sent to your email.",
      sendEmail: "Send email",
      loading: "Please wait...",
      showPassword: "Show password",
      hidePassword: "Hide password",
      language: "Language",
      nepali: "नेपाली",
      english: "English",
      mismatch: "The passwords do not match. Please check again.",
      weak: "Password must contain at least 8 characters.",
      emailSentTitle: "Confirm your email",
      emailSent: "Your registration was successful. A confirmation message has been sent to your email. Open it and click the confirmation link. Then log in.",
      resend: "Resend confirmation email",
      resendDone: "Confirmation email sent again. Please check your inbox.",
      resendFailed: "Could not send the confirmation email. Please try again later.",
      backLogin: "Go to login",
      signupSuccess: "Your account has been created successfully. Welcome!",
      loginSuccess: "Welcome! You have logged in successfully.",
      resetSuccess: "If an account exists for this email, password reset instructions have been sent.",
      network: "There is an internet connection problem. Check your connection and try again.",
      exists: "An account already exists with this email. Log in or use another email.",
      invalidLogin: "Email or password is incorrect. Please check both.",
      unconfirmed: "Your email is not confirmed. Please follow the confirmation instructions sent to your inbox.",
      rateLimit: "Too many attempts. Please try again later.",
      invalidEmail: "Please enter a valid email address.",
      signupDisabled: "New registrations are currently unavailable. Please try again later.",
      signupError: "Could not create your account. Check your details and try again.",
      resetError: "Could not send the password reset email. Please try again.",
      loginError: "Could not log in. Check your email and password.",
      firstRequired: "Please enter your first name.",
      lastRequired: "Please enter your last name.",
      birthRequired: "Please select a valid date of birth.",
      genderRequired: "Please select your gender.",
      locationRequired: "Please enter your city or district."
    }
  };

  function language() {
    const selected = global.KSKLanguage?.getLanguage?.();
    return selected === "en" ? "en" : "ne";
  }

  function t(key) {
    return translations[language()][key] || translations.ne[key] || key;
  }

  function setLanguage(value) {
    const selected = value === "en" ? "en" : "ne";

    if (global.KSKLanguage?.setLanguage) {
      global.KSKLanguage.setLanguage(selected);
    } else if (global.KSKSettings?.updateSettings) {
      global.KSKSettings.updateSettings({ language: selected });
    }

    render(currentMode);
  }

  function getRoot() {
    return document.getElementById(ROOT_ID);
  }

  function showMessage(message, type = "info") {
    const root = getRoot();
    if (!root) return;

    let panel = root.querySelector(".ksk-auth-message");

    if (!panel) {
      panel = document.createElement("div");
      panel.className = "ksk-auth-message";
      panel.setAttribute("role", "status");
      const shell = root.querySelector(".ksk-auth-shell");
      if (shell) shell.prepend(panel);
      else root.prepend(panel);
    }

    panel.className = `ksk-auth-message ${type}`;
    panel.textContent = message;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearMessage() {
    const panel = getRoot()?.querySelector(".ksk-auth-message");
    if (panel) {
      panel.hidden = true;
      panel.textContent = "";
    }
  }

  function friendlyError(error, action = "login") {
    const message = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();

    if (/failed to fetch|network|connection|load failed|internet|timeout/.test(message)) {
      return t("network");
    }

    if (/user already registered|already registered|already exists/.test(message) || code.includes("user_already_exists")) {
      return t("exists");
    }

    if (/invalid login credentials|invalid credentials|invalid email or password/.test(message)) {
      return t("invalidLogin");
    }

    if (/email not confirmed|email_not_confirmed/.test(message) || code.includes("email_not_confirmed")) {
      return t("unconfirmed");
    }

    if (/password should be at least|weak password|password is too short/.test(message)) {
      return t("weak");
    }

    if (/rate limit|too many requests|email rate limit/.test(message)) {
      return t("rateLimit");
    }

    if (/invalid email|email address is invalid/.test(message)) {
      return t("invalidEmail");
    }

    if (/signup is disabled|signups not allowed|registration disabled/.test(message)) {
      return t("signupDisabled");
    }

    if (action === "signup") return t("signupError");
    if (action === "reset") return t("resetError");
    return t("loginError");
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

      .ksk-auth-actions,
      .ksk-auth-form {
        display: grid;
        gap: 14px;
      }

      .ksk-auth-actions {
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

      .ksk-auth-field {
        display: grid;
        gap: 7px;
      }

      .ksk-auth-field label {
        font-size: 12px;
        font-weight: 800;
        color: var(--color-text-secondary, #475569);
      }

      .ksk-auth-field input,
      .ksk-auth-field select {
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

      .ksk-auth-field input:focus,
      .ksk-auth-field select:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37,99,235,.12);
      }

      .ksk-auth-field small {
        color: var(--color-muted, #64748b);
        font-size: 11px;
        line-height: 1.6;
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

      .ksk-auth-link,
      .ksk-auth-bottom button,
      .ksk-auth-resend {
        border: 0;
        padding: 5px;
        background: transparent;
        color: #2563eb;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .ksk-auth-link {
        display: block;
        width: fit-content;
        margin: 1px auto;
      }

      .ksk-auth-bottom {
        margin-top: 17px;
        color: var(--color-muted, #64748b);
        font-size: 12px;
        text-align: center;
        line-height: 1.9;
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

      .ksk-auth-language {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        margin: 0 auto 17px;
        font-size: 12px;
      }

      .ksk-auth-language button {
        padding: 7px 12px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 20px;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        font: inherit;
        cursor: pointer;
      }

      .ksk-auth-language button.active {
        border-color: #2563eb;
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 800;
      }

      .ksk-auth-message {
        margin: 0 0 14px;
        padding: 12px 14px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 12px;
        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);
        font-size: 13px;
        line-height: 1.8;
      }

      .ksk-auth-message.success {
        border-color: #86efac;
        background: #f0fdf4;
        color: #166534;
      }

      .ksk-auth-message.error {
        border-color: #fca5a5;
        background: #fef2f2;
        color: #991b1b;
      }

      .ksk-auth-message.warning {
        border-color: #fcd34d;
        background: #fffbeb;
        color: #92400e;
      }

      .ksk-auth-confirm {
        text-align: center;
      }

      .ksk-auth-confirm h2 {
        margin-bottom: 12px;
      }

      .ksk-auth-confirm p {
        color: var(--color-muted, #64748b);
        font-size: 13px;
        line-height: 1.9;
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

  function languageMarkup() {
    const selected = language();

    return `
      <div class="ksk-auth-language" aria-label="${t("language")}">
        <span>${t("language")}:</span>
        <button type="button" data-language="ne" class="${selected === "ne" ? "active" : ""}">नेपाली</button>
        <button type="button" data-language="en" class="${selected === "en" ? "active" : ""}">English</button>
      </div>
    `;
  }

  function brandMarkup() {
    return `
      <div class="ksk-auth-brand">
        <img class="ksk-auth-logo" src="Nepal.jpg" alt="${t("app")}">
        <h1>${t("app")}</h1>
      </div>
    `;
  }

  function footerMarkup() {
    return `<p class="ksk-auth-footer">${t("footer")}</p>`;
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
            aria-label="${t("showPassword")}"
            aria-pressed="false"
            title="${t("showPassword")}"
          >👁</button>
        </div>
      </div>
    `;
  }

  function welcomeMarkup() {
    return `
      ${languageMarkup()}
      ${brandMarkup()}
      <div class="ksk-auth-card">
        <h2>${t("welcome")}</h2>
        <p class="ksk-auth-description">${t("welcomeText")}</p>

        <div class="ksk-auth-actions">
          <button class="ksk-auth-button nepal" type="button" data-auth-mode="signup">
            ${t("start")}
          </button>
          <button class="ksk-auth-button secondary" type="button" data-auth-mode="login">
            ${t("login")}
          </button>
        </div>

        <p class="ksk-auth-note">${t("note")}</p>
      </div>
      ${footerMarkup()}
    `;
  }

  function signupMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="welcome">← ${t("back")}</button>
      ${languageMarkup()}
      ${brandMarkup()}

      <div class="ksk-auth-card">
        <h2>${t("signupTitle")}</h2>
        <p class="ksk-auth-description">${t("signupText")}</p>

        <form class="ksk-auth-form" id="kskSignupForm">
          <div class="ksk-auth-field">
            <label for="kskSignupFirstName">${t("firstName")}</label>
            <input id="kskSignupFirstName" name="firstName" type="text"
              maxlength="60" autocomplete="given-name" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupLastName">${t("lastName")}</label>
            <input id="kskSignupLastName" name="lastName" type="text"
              maxlength="60" autocomplete="family-name" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupBirthDate">${t("birthDate")}</label>
            <input id="kskSignupBirthDate" name="birthDate" type="date"
              max="${new Date().toISOString().slice(0, 10)}" required>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupGender">${t("gender")}</label>
            <select id="kskSignupGender" name="gender" required>
              <option value="">${t("gender")}</option>
              <option value="पुरुष">${t("male")}</option>
              <option value="महिला">${t("female")}</option>
              <option value="अन्य">${t("other")}</option>
            </select>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupLocation">${t("location")}</label>
            <input id="kskSignupLocation" name="location" type="text"
              maxlength="100" autocomplete="address-level2" required>
            <small>${t("locationHint")}</small>
          </div>

          <div class="ksk-auth-field">
            <label for="kskSignupEmail">${t("email")}</label>
            <input id="kskSignupEmail" name="email" type="email"
              maxlength="254" autocomplete="email" required>
          </div>

          ${passwordField("kskSignupPassword", "password", t("password"), "new-password")}
          ${passwordField("kskSignupConfirm", "confirmPassword", t("confirm"), "new-password")}

          <button class="ksk-auth-button nepal" type="submit">${t("create")}</button>
        </form>

        <p class="ksk-auth-bottom">
          ${t("already")}
          <button type="button" data-auth-mode="login">${t("loginButton")}</button>
        </p>
      </div>

      ${footerMarkup()}
    `;
  }

  function loginMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="welcome">← ${t("back")}</button>
      ${languageMarkup()}
      ${brandMarkup()}

      <div class="ksk-auth-card">
        <h2>${t("loginTitle")}</h2>
        <p class="ksk-auth-description">${t("loginText")}</p>

        <form class="ksk-auth-form" id="kskLoginForm">
          <div class="ksk-auth-field">
            <label for="kskLoginEmail">${t("email")}</label>
            <input id="kskLoginEmail" name="email" type="email"
              maxlength="254" autocomplete="email" required>
          </div>

          ${passwordField("kskLoginPassword", "password", t("password"), "current-password", 1)}

          <button class="ksk-auth-button" type="submit">${t("loginButton")}</button>

          <button class="ksk-auth-link" type="button" data-auth-mode="reset">
            ${t("forgot")}
          </button>
        </form>

        <p class="ksk-auth-bottom">
          ${t("newUser")}
          <button type="button" data-auth-mode="signup">${t("create")}</button>
        </p>
      </div>

      ${footerMarkup()}
    `;
  }

  function resetMarkup() {
    return `
      <button class="ksk-auth-back" type="button" data-auth-mode="login">← ${t("back")}</button>
      ${languageMarkup()}
      ${brandMarkup()}

      <div class="ksk-auth-card">
        <h2>${t("resetTitle")}</h2>
        <p class="ksk-auth-description">${t("resetText")}</p>

        <form class="ksk-auth-form" id="kskResetForm">
          <div class="ksk-auth-field">
            <label for="kskResetEmail">${t("email")}</label>
            <input id="kskResetEmail" name="email" type="email"
              maxlength="254" autocomplete="email" required>
          </div>

          <button class="ksk-auth-button" type="submit">${t("sendEmail")}</button>
        </form>
      </div>

      ${footerMarkup()}
    `;
  }

  function confirmationMarkup(email) {
    return `
      ${languageMarkup()}
      ${brandMarkup()}

      <div class="ksk-auth-card ksk-auth-confirm">
        <h2>${t("emailSentTitle")}</h2>
        <p>${t("emailSent")}</p>
        <p><strong>${escapeHTML(email)}</strong></p>

        <button class="ksk-auth-button nepal" type="button" data-resend-confirmation>
          ${t("resend")}
        </button>

        <button class="ksk-auth-link" type="button" data-auth-mode="login">
          ${t("backLogin")}
        </button>
      </div>

      ${footerMarkup()}
    `;
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function render(mode = "welcome") {
    const root = createRoot();

    currentMode = [
      "welcome",
      "signup",
      "login",
      "reset",
      "confirmation"
    ].includes(mode) ? mode : "welcome";

    const views = {
      welcome: welcomeMarkup,
      signup: signupMarkup,
      login: loginMarkup,
      reset: resetMarkup,
      confirmation: () => confirmationMarkup(pendingEmail)
    };

    root.innerHTML =
      '<div class="ksk-auth-shell">' +
      views[currentMode]() +
      '</div>';

    root.classList.add("is-visible");

    const firstInput = root.querySelector("input");
    if (firstInput) firstInput.focus({ preventScroll: true });

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
    button.textContent = state ? t("loading") : button.dataset.originalText;
  }

  function readForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function getAuth() {
    if (!global.KSKSupabase) {
      const error = new Error("Authentication service is not ready.");
      error.code = "AUTH_NOT_READY";
      throw error;
    }

    return global.KSKSupabase;
  }

  function validateSignup(values) {
    if (!String(values.firstName || "").trim()) {
      throw new Error(t("firstRequired"));
    }

    if (!String(values.lastName || "").trim()) {
      throw new Error(t("lastRequired"));
    }

    const date = String(values.birthDate || "");
    const parsed = new Date(`${date}T00:00:00Z`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date ||
      date > new Date().toISOString().slice(0, 10)
    ) {
      throw new Error(t("birthRequired"));
    }

    if (!["पुरुष", "महिला", "अन्य"].includes(values.gender)) {
      throw new Error(t("genderRequired"));
    }

    if (!String(values.location || "").trim()) {
      throw new Error(t("locationRequired"));
    }

    if (String(values.password || "").length < 8) {
      throw new Error(t("weak"));
    }

    if (values.password !== values.confirmPassword) {
      throw new Error(t("mismatch"));
    }
  }

  async function handleSignup(form) {
    const values = readForm(form);

    try {
      validateSignup(values);
    } catch (error) {
      showMessage(error.message, "warning");
      return;
    }

    setBusy(form, true);
    clearMessage();

    try {
      const result = await getAuth().signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        gender: values.gender,
        location: values.location,
        email: values.email,
        password: values.password
      });

      if (result.session) {
        showMessage(t("signupSuccess"), "success");

        global.dispatchEvent(new CustomEvent("ksk:auth-complete", {
          detail: {
            user: result.user,
            session: result.session
          }
        }));
      } else {
        pendingEmail = String(values.email || "").trim().toLowerCase();
        render("confirmation");
      }

    } catch (error) {
      showMessage(
        error.message && !error.code
          ? error.message
          : friendlyError(error, "signup"),
        "error"
      );

    } finally {
      busy = false;
      const currentForm = getRoot()?.querySelector("#kskSignupForm");
      if (currentForm) setBusy(currentForm, false);
    }
  }

  async function resendConfirmation() {
    if (busy || !pendingEmail) return;

    busy = true;

    const button = getRoot()?.querySelector("[data-resend-confirmation]");
    if (button) {
      button.disabled = true;
      button.textContent = t("loading");
    }

    try {
      const client = getAuth().getClient();
      const { error } = await client.auth.resend({
        type: "signup",
        email: pendingEmail
      });

      if (error) throw error;

      showMessage(t("resendDone"), "success");

    } catch (error) {
      showMessage(
        /rate limit|too many requests/i.test(String(error?.message || ""))
          ? t("rateLimit")
          : t("resendFailed"),
        "error"
      );

    } finally {
      busy = false;
      const currentButton = getRoot()?.querySelector("[data-resend-confirmation]");
      if (currentButton) {
        currentButton.disabled = false;
        currentButton.textContent = t("resend");
      }
    }
  }

  async function handleLogin(form) {
    const values = readForm(form);

    setBusy(form, true);
    clearMessage();

    try {
      const result = await getAuth().signIn({
        email: values.email,
        password: values.password
      });

      showMessage(t("loginSuccess"), "success");

      global.dispatchEvent(new CustomEvent("ksk:auth-complete", {
        detail: {
          user: result.user,
          session: result.session
        }
      }));

    } catch (error) {
      showMessage(friendlyError(error, "login"), "error");

    } finally {
      busy = false;
      const currentForm = getRoot()?.querySelector("#kskLoginForm");
      if (currentForm) setBusy(currentForm, false);
    }
  }

  async function handleReset(form) {
    const values = readForm(form);

    setBusy(form, true);
    clearMessage();

    try {
      const redirectURL = new URL(
        global.location.pathname,
        global.location.origin
      ).href;

      await getAuth().sendPasswordReset(values.email, redirectURL);

      render("login");
      showMessage(t("resetSuccess"), "success");

    } catch (error) {
      showMessage(friendlyError(error, "reset"), "error");

    } finally {
      busy = false;
      const currentForm = getRoot()?.querySelector("#kskResetForm");
      if (currentForm) setBusy(currentForm, false);
    }
  }

  function togglePassword(button) {
    const id = button.dataset.passwordToggle;
    const input = document.getElementById(id);

    if (!input) return;

    const visible = input.type === "password";

    input.type = visible ? "text" : "password";
    button.textContent = visible ? "🙈" : "👁";
    button.setAttribute("aria-label", visible ? t("hidePassword") : t("showPassword"));
    button.setAttribute("aria-pressed", String(visible));
    button.title = visible ? t("hidePassword") : t("showPassword");
  }

  function handleClick(event) {
    const eye = event.target.closest("[data-password-toggle]");

    if (eye) {
      event.preventDefault();
      togglePassword(eye);
      return;
    }

    const languageButton = event.target.closest("[data-language]");
    if (languageButton) {
      event.preventDefault();
      if (busy) return;
      setLanguage(languageButton.dataset.language);
      return;
    }

    const resend = event.target.closest("[data-resend-confirmation]");
    if (resend) {
      event.preventDefault();
      resendConfirmation();
      return;
    }

    const button = event.target.closest("[data-auth-mode]");
    if (!button) return;

    event.preventDefault();
    if (busy) return;

    clearMessage();
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
    pendingEmail = "";

    return true;
  }

  global.KSKAuthPage = Object.freeze({
    initialize,
    show,
    hide,
    render,
    destroy,
    getMode: () => currentMode,
    isVisible: () => Boolean(getRoot()?.classList.contains("is-visible"))
  });

})(window);
