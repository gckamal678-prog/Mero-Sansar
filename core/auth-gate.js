
"use strict";

/* =========================================================
   MERO SANSAR — PREMIUM AUTHENTICATION GATE
   Welcome Splash → Sign Up → Email Verification → Login
   Supabase Email + Password + Profile Metadata
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKAuthGate) return;

  const ROOT_ID = "ksk-auth-gate";
  const STYLE_ID = "ksk-auth-gate-style";

  let authReady = false;
  let currentMode = "login";
  let splashObserver = null;

  document.body.classList.add("ksk-auth-locked");

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  /* =======================================================
     STYLES
  ======================================================= */

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      body.ksk-auth-locked {
        overflow: hidden !important;
      }

      body.ksk-auth-locked > .app-header,
      body.ksk-auth-locked > .app-main,
      body.ksk-auth-locked > #bottomNav,
      body.ksk-auth-locked > #settingsModal,
      body.ksk-auth-locked > #toastContainer {
        display: none !important;
      }

      #${ROOT_ID}[hidden] {
        display: none !important;
      }

      #${ROOT_ID} {
        position: fixed;
        inset: 0;
        z-index: 99998;
        display: grid;
        place-items: center;
        overflow-y: auto;
        padding: 24px 16px;
        box-sizing: border-box;
        background:
          radial-gradient(ellipse at 12% 12%, rgba(139,92,246,.27), transparent 38%),
          radial-gradient(ellipse at 90% 88%, rgba(34,211,238,.17), transparent 38%),
          linear-gradient(145deg,#080c1b 0%,#11152d 52%,#1c1235 100%);
        color: #fff;
        font-family: inherit;
      }

      #${ROOT_ID} * {
        box-sizing: border-box;
      }

      #${ROOT_ID} .ksk-gate-wrap {
        width: min(100%, 450px);
        margin: auto;
        animation: kskGateAppear .55s ease both;
      }

      @keyframes kskGateAppear {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      #${ROOT_ID} .ksk-gate-brand {
        text-align: center;
        margin-bottom: 22px;
      }

      #${ROOT_ID} .ksk-gate-logo {
        width: 70px;
        height: 70px;
        display: grid;
        place-items: center;
        margin: 0 auto 13px;
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 23px;
        background: linear-gradient(
          145deg,
          rgba(255,255,255,.2),
          rgba(255,255,255,.05)
        );
        box-shadow:
          0 14px 40px rgba(0,0,0,.3),
          inset 0 1px rgba(255,255,255,.2);
        font-size: 31px;
      }

      #${ROOT_ID} .ksk-gate-brand h1 {
        margin: 0;
        color: #fff;
        font-size: 29px;
        font-weight: 900;
        letter-spacing: -.7px;
      }

      #${ROOT_ID} .ksk-gate-brand h1 span {
        background: linear-gradient(
          100deg,
          #e8dcff,
          #b69aff,
          #8de5e5
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      #${ROOT_ID} .ksk-gate-brand p {
        margin: 8px 0 0;
        color: rgba(239,235,250,.7);
        font-size: 12px;
        line-height: 1.7;
      }

      #${ROOT_ID} .ksk-gate-card {
        padding: 25px 21px 21px;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 25px;
        background: rgba(255,255,255,.97);
        color: #172033;
        box-shadow: 0 25px 80px rgba(0,0,0,.4);
      }

      #${ROOT_ID} .ksk-gate-topline {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 13px;
        color: #7660c9;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1.4px;
        text-transform: uppercase;
      }

      #${ROOT_ID} .ksk-gate-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #27b89b;
        box-shadow: 0 0 0 4px rgba(39,184,155,.12);
      }

      #${ROOT_ID} .ksk-gate-card h2 {
        margin: 0;
        color: #172033;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: -.4px;
      }

      #${ROOT_ID} .ksk-gate-subtitle {
        margin: 8px 0 19px;
        color: #69758a;
        font-size: 12px;
        line-height: 1.75;
      }

      #${ROOT_ID} .ksk-gate-field {
        display: block;
        margin: 13px 0;
      }

      #${ROOT_ID} .ksk-gate-field > span {
        display: block;
        margin-bottom: 7px;
        color: #344054;
        font-size: 12px;
        font-weight: 850;
      }

      #${ROOT_ID} .ksk-gate-field input,
      #${ROOT_ID} .ksk-gate-field select {
        display: block;
        width: 100%;
        min-height: 47px;
        padding: 11px 13px;
        border: 1px solid #dfe4ed;
        border-radius: 12px;
        outline: none;
        background: #f8f9fc;
        color: #172033;
        font: inherit;
        font-size: 13px;
        transition: border-color .2s, box-shadow .2s;
      }

      #${ROOT_ID} .ksk-gate-field input:focus,
      #${ROOT_ID} .ksk-gate-field select:focus {
        border-color: #8068d8;
        background: #fff;
        box-shadow: 0 0 0 4px rgba(128,104,216,.13);
      }

      #${ROOT_ID} .ksk-gate-field input::placeholder {
        color: #a1a9b8;
      }

      #${ROOT_ID} .ksk-gate-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 11px;
      }

      #${ROOT_ID} .ksk-gate-input-wrap {
        position: relative;
      }

      #${ROOT_ID} .ksk-gate-input-wrap input {
        padding-right: 45px;
      }

      #${ROOT_ID} .ksk-gate-eye {
        position: absolute;
        top: 50%;
        right: 8px;
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        transform: translateY(-50%);
        border: 0;
        border-radius: 9px;
        background: transparent;
        color: #69758a;
        cursor: pointer;
      }

      #${ROOT_ID} .ksk-gate-eye:hover {
        background: #eeebfa;
        color: #6753b6;
      }

      #${ROOT_ID} .ksk-gate-eye svg {
        width: 19px;
        height: 19px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      #${ROOT_ID} .ksk-gate-hint {
        margin: 6px 0 0;
        color: #8a94a6;
        font-size: 10px;
        line-height: 1.5;
      }

      #${ROOT_ID} .ksk-gate-primary {
        width: 100%;
        min-height: 50px;
        margin-top: 10px;
        border: 0;
        border-radius: 13px;
        background: linear-gradient(105deg,#765bd0,#5d83d9);
        color: #fff;
        font: inherit;
        font-size: 13px;
        font-weight: 900;
        box-shadow: 0 9px 20px rgba(105,83,190,.23);
        cursor: pointer;
        transition: transform .2s, filter .2s;
      }

      #${ROOT_ID} .ksk-gate-primary:hover {
        filter: brightness(1.07);
        transform: translateY(-1px);
      }

      #${ROOT_ID} .ksk-gate-secondary {
        width: 100%;
        min-height: 45px;
        margin-top: 13px;
        border: 1px solid #e1e5ed;
        border-radius: 12px;
        background: #f8f9fc;
        color: #5547a1;
        font: inherit;
        font-size: 12px;
        font-weight: 850;
        cursor: pointer;
      }

      #${ROOT_ID} .ksk-gate-link {
        display: block;
        width: 100%;
        margin-top: 13px;
        padding: 5px;
        border: 0;
        background: transparent;
        color: #6252b5;
        font: inherit;
        font-size: 12px;
        font-weight: 850;
        text-align: center;
        cursor: pointer;
      }

      #${ROOT_ID} .ksk-gate-status {
        margin: 14px 0 0;
        padding: 11px 12px;
        border: 1px solid #dce2ec;
        border-radius: 11px;
        background: #f7f8fc;
        color: #344054;
        font-size: 12px;
        line-height: 1.7;
        overflow-wrap: anywhere;
      }

      #${ROOT_ID} .ksk-gate-status[data-type="error"] {
        border-color: #e8aaaa;
        color: #a32626;
        background: #fff5f5;
      }

      #${ROOT_ID} .ksk-gate-status[data-type="success"] {
        border-color: #a6dfc6;
        color: #176b4d;
        background: #effbf5;
      }

      #${ROOT_ID} .ksk-gate-status[hidden] {
        display: none;
      }

      #${ROOT_ID} button:disabled,
      #${ROOT_ID} input:disabled,
      #${ROOT_ID} select:disabled {
        opacity: .6;
        cursor: wait;
      }

      #${ROOT_ID} .ksk-gate-security {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 17px;
        color: rgba(226,217,247,.7);
        font-size: 10px;
      }

      #${ROOT_ID} .ksk-gate-security svg {
        width: 13px;
        height: 13px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
      }

      #${ROOT_ID} .ksk-gate-footer {
        margin: 19px 0 0;
        color: rgba(226,217,247,.48);
        font-size: 10px;
        text-align: center;
        letter-spacing: 1.2px;
      }

      @media (max-width: 380px) {
        #${ROOT_ID} {
          padding: 16px 11px;
        }

        #${ROOT_ID} .ksk-gate-card {
          padding: 20px 15px;
        }

        #${ROOT_ID} .ksk-gate-brand h1 {
          font-size: 25px;
        }

        #${ROOT_ID} .ksk-gate-grid {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${ROOT_ID} .ksk-gate-wrap {
          animation: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     PASSWORD ICON
  ======================================================= */

  function eyeIcon(open) {
    return open
      ? `<svg viewBox="0 0 24 24" aria-hidden="true">
           <path d="M3 3l18 18"/>
           <path d="M10.6 10.6a2 2 0 002.8 2.8"/>
           <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.4-2.3 3.5"/>
           <path d="M6.2 6.2C3.9 7.7 2.8 10 2.5 12c1 2.8 4.5 7 9.5 7 1.2 0 2.3-.2 3.3-.7"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true">
           <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/>
           <circle cx="12" cy="12" r="3"/>
         </svg>`;
  }

  function passwordField(name, label, autocomplete, hint = "") {
    return `
      <label class="ksk-gate-field">
        <span>${label}</span>
        <div class="ksk-gate-input-wrap">
          <input
            type="password"
            name="${name}"
            autocomplete="${autocomplete}"
            minlength="6"
            maxlength="128"
            placeholder="${t("कम्तीमा ६ अक्षर", "At least 6 characters")}"
            required>

          <button
            type="button"
            class="ksk-gate-eye"
            data-gate-action="eye"
            data-target="${name}"
            aria-label="${t("पासवर्ड देखाउनुहोस्", "Show password")}"
            aria-pressed="false">
            ${eyeIcon(false)}
          </button>
        </div>
        ${hint ? `<p class="ksk-gate-hint">${hint}</p>` : ""}
      </label>
    `;
  }

  /* =======================================================
     CREATE AUTH SCREEN
  ======================================================= */

  function createScreen() {
    if (document.getElementById(ROOT_ID)) return;

    const root = document.createElement("section");

    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute(
      "aria-label",
      "Mero Sansar Authentication"
    );

    root.innerHTML = `
      <div class="ksk-gate-wrap">

        <div class="ksk-gate-brand">
          <div class="ksk-gate-logo">🌐</div>

          <h1>हाम्रो <span>संसार</span></h1>

          <p>
            ${t(
              "आफ्नो संसारमा जोडिनुहोस्। साथी बनाउनुहोस् र कुराकानी गर्नुहोस्।",
              "Connect with your world. Make friends and share conversations."
            )}
          </p>
        </div>

        <div class="ksk-gate-card" id="kskGateCard"></div>

        <div class="ksk-gate-security">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2"/>
            <path d="M8 10V7a4 4 0 018 0v3"/>
            <path d="M12 14v3"/>
          </svg>

          ${t(
            "सुरक्षित Email Authentication",
            "Secure email authentication"
          )}
        </div>

        <p class="ksk-gate-footer">
          MERO SANSAR · YOUR COMMUNITY
        </p>

      </div>
    `;

    document.body.appendChild(root);

    root.addEventListener("submit", handleSubmit);
    root.addEventListener("click", handleClick);

    renderForm();
  }

  /* =======================================================
     FORM RENDERING
  ======================================================= */

  function renderForm(message = "", messageType = "info") {
    const card = document.getElementById("kskGateCard");
    if (!card) return;

    const signup = currentMode === "signup";

    card.innerHTML = `
      <div class="ksk-gate-topline">
        <span class="ksk-gate-dot"></span>
        ${signup
          ? "JOIN OUR COMMUNITY"
          : "WELCOME BACK"
        }
      </div>

      <h2>
        ${signup
          ? t("नयाँ खाता बनाउनुहोस्", "Create your account")
          : t("फेरि स्वागत छ!", "Welcome back!")
        }
      </h2>

      <p class="ksk-gate-subtitle">
        ${signup
          ? t(
              "Mero Sansar मा जोडिन आफ्नो विवरण भर्नुहोस्।",
              "Enter your details to join Mero Sansar."
            )
          : t(
              "आफ्नो खातामा सुरक्षित रूपमा प्रवेश गर्नुहोस्।",
              "Sign in securely to your account."
            )
        }
      </p>

      <form
        data-gate-form
        data-mode="${signup ? "signup" : "login"}">

        ${signup ? `
          <div class="ksk-gate-grid">

            <label class="ksk-gate-field">
              <span>${t("नाम", "First name")}</span>
              <input
                type="text"
                name="first_name"
                maxlength="40"
                autocomplete="given-name"
                placeholder="${t("आफ्नो नाम", "First name")}"
                required>
            </label>

            <label class="ksk-gate-field">
              <span>${t("थर", "Last name")}</span>
              <input
                type="text"
                name="last_name"
                maxlength="40"
                autocomplete="family-name"
                placeholder="${t("आफ्नो थर", "Last name")}"
                required>
            </label>

          </div>

          <label class="ksk-gate-field">
            <span>${t("जन्ममिति", "Date of birth")}</span>
            <input
              type="date"
              name="birth_date"
              autocomplete="bday"
              max="${new Date().toISOString().slice(0, 10)}"
              required>
          </label>

          <label class="ksk-gate-field">
            <span>${t("लिङ्ग", "Gender")}</span>
            <select name="gender" required>
              <option value="">
                ${t("लिङ्ग छान्नुहोस्", "Select gender")}
              </option>
              <option value="पुरुष">
                ${t("पुरुष", "Male")}
              </option>
              <option value="महिला">
                ${t("महिला", "Female")}
              </option>
              <option value="अन्य">
                ${t("अन्य", "Other")}
              </option>
            </select>
          </label>
        ` : ""}

        <label class="ksk-gate-field">
          <span>${t("इमेल ठेगाना", "Email address")}</span>
          <input
            type="email"
            name="email"
            autocomplete="email"
            maxlength="254"
            placeholder="name@example.com"
            required>
        </label>

        ${passwordField(
          "password",
          t("पासवर्ड", "Password"),
          signup ? "new-password" : "current-password"
        )}

        ${signup ? passwordField(
          "confirmPassword",
          t("पासवर्ड फेरि लेख्नुहोस्", "Confirm password"),
          "new-password",
          t(
            "दुवै पासवर्ड ठ्याक्कै मिल्नुपर्छ।",
            "Both passwords must match exactly."
          )
        ) : ""}

        <button class="ksk-gate-primary" type="submit">
          ${signup
            ? t("खाता बनाउनुहोस् →", "Create account →")
            : t("लगइन गर्नुहोस् →", "Log in →")
          }
        </button>

      </form>

      ${!signup ? `
        <button
          type="button"
          class="ksk-gate-link"
          data-gate-action="reset">
          ${t("पासवर्ड बिर्सनुभयो?", "Forgot password?")}
        </button>
      ` : `
        <p class="ksk-gate-hint" style="text-align:center;margin-top:12px">
          ${t(
            "खाता बनाएपछि तपाईंको इमेलमा पुष्टि गर्ने Link पठाइनेछ।",
            "A verification link will be sent to your email after signup."
          )}
        </p>
      `}

      <button
        type="button"
        class="ksk-gate-secondary"
        data-gate-action="toggle">
        ${signup
          ? t("पहिल्यै खाता छ? Login गर्नुहोस्", "Already have an account? Log in")
          : t("नयाँ प्रयोगकर्ता हुनुहुन्छ? Sign Up गर्नुहोस्", "New here? Sign up")
        }
      </button>

      <p
        class="ksk-gate-status"
        id="kskGateStatus"
        role="status"
        aria-live="polite"
        ${message ? "" : "hidden"}>${escapeHTML(message)}</p>
    `;

    const status = document.getElementById("kskGateStatus");

    if (status && message) {
      status.dataset.type = messageType;
    }
  }

  function showStatus(message, type = "info") {
    const status = document.getElementById("kskGateStatus");
    if (!status) return;

    status.textContent = message;
    status.dataset.type = type;
    status.hidden = !message;
  }

  function setBusy(busy) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    root.querySelectorAll("button, input, select").forEach(element => {
      element.disabled = Boolean(busy);
    });
  }

  /* =======================================================
     VALIDATION
  ======================================================= */

  function emailIsValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function isValidBirthDate(value) {
    if (!value) return false;

    const parts = value.split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return false;
    }

    const [year, month, day] = parts;

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date <= today;
  }

  /* =======================================================
     SIGN UP — SEND REQUIRED PROFILE METADATA
  ======================================================= */

  async function registerUser(email, password, metadata) {
    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      throw new Error(
        t(
          "Authentication प्रणाली लोड भएन।",
          "Authentication system is unavailable."
        )
      );
    }

    await auth.initialize();

    const client = auth.getClient();

    if (!client) {
      throw new Error(
        t(
          "Supabase जडान हुन सकेन।",
          "Could not connect to Supabase."
        )
      );
    }

    /*
      These metadata keys must match the existing
      public.handle_new_user() database function exactly:

      first_name
      last_name
      birth_date
      gender
    */

    const result = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          birth_date: metadata.birth_date,
          gender: metadata.gender
        },

        emailRedirectTo:
          global.location.origin + global.location.pathname
      }
    });

    if (result.error) {
      throw result.error;
    }

    const user = result.data?.user || null;
    const session = result.data?.session || null;

    /*
      Email confirmation must be required.
      Do not allow an unverified account into the app.
    */

    const verified = Boolean(
      user?.email_confirmed_at ||
      user?.confirmed_at
    );

    if (session || verified) {
      try {
        await auth.signOut();
      } catch (error) {
        console.error(
          "Could not clear signup session:",
          error
        );
      }

      throw new Error(
        t(
          "इमेल पुष्टि आवश्यक छ। Supabase मा Confirm email सक्रिय भएको जाँच गर्नुहोस्।",
          "Email verification is required. Check that Confirm email is enabled in Supabase."
        )
      );
    }

    return {
      user,
      confirmationRequired: Boolean(user)
    };
  }

  /* =======================================================
     FORM SUBMISSION
  ======================================================= */

  async function handleSubmit(event) {
    const form = event.target.closest("[data-gate-form]");
    if (!form) return;

    event.preventDefault();

    const email = String(form.elements.email?.value || "")
      .trim()
      .toLowerCase();

    const password = String(
      form.elements.password?.value || ""
    );

    const mode = form.dataset.mode;

    if (!emailIsValid(email)) {
      showStatus(
        t(
          "कृपया सही इमेल ठेगाना लेख्नुहोस्।",
          "Please enter a valid email address."
        ),
        "error"
      );
      return;
    }

    if (password.length < 6) {
      showStatus(
        t(
          "पासवर्ड कम्तीमा ६ अक्षरको हुनुपर्छ।",
          "Password must be at least 6 characters."
        ),
        "error"
      );
      return;
    }

    let metadata = null;

    if (mode === "signup") {
      const firstName = String(
        form.elements.first_name?.value || ""
      ).trim();

      const lastName = String(
        form.elements.last_name?.value || ""
      ).trim();

      const birthDate = String(
        form.elements.birth_date?.value || ""
      ).trim();

      const gender = String(
        form.elements.gender?.value || ""
      ).trim();

      const confirmPassword = String(
        form.elements.confirmPassword?.value || ""
      );

      if (!firstName || !lastName) {
        showStatus(
          t(
            "नाम र थर अनिवार्य छन्।",
            "First name and last name are required."
          ),
          "error"
        );
        return;
      }

      if (firstName.length > 40 || lastName.length > 40) {
        showStatus(
          t(
            "नाम र थर ४० अक्षरभन्दा लामो हुनु हुँदैन।",
            "Names must not exceed 40 characters."
          ),
          "error"
        );
        return;
      }

      if (!isValidBirthDate(birthDate)) {
        showStatus(
          t(
            "सही जन्ममिति छान्नुहोस्।",
            "Please select a valid date of birth."
          ),
          "error"
        );
        return;
      }

      if (!["पुरुष", "महिला", "अन्य"].includes(gender)) {
        showStatus(
          t(
            "कृपया लिङ्ग छान्नुहोस्।",
            "Please select your gender."
          ),
          "error"
        );
        return;
      }

      if (password !== confirmPassword) {
        showStatus(
          t(
            "दुवै पासवर्ड मिलेनन्। फेरि जाँच गर्नुहोस्।",
            "Passwords do not match. Please check again."
          ),
          "error"
        );
        return;
      }

      metadata = {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        gender
      };
    }

    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      showStatus(
        t(
          "Authentication प्रणाली लोड भएन। पेज Refresh गर्नुहोस्।",
          "Authentication did not load. Please refresh the page."
        ),
        "error"
      );
      return;
    }

    setBusy(true);

    showStatus(
      t("कृपया पर्खनुहोस्...", "Please wait...")
    );

    try {
      if (mode === "signup") {
        const result = await registerUser(
          email,
          password,
          metadata
        );

        if (!result.confirmationRequired) {
          throw new Error(
            t(
              "खाता पुष्टि गर्न सकिएन। फेरि प्रयास गर्नुहोस्।",
              "Account confirmation could not be started. Please try again."
            )
          );
        }

        currentMode = "login";

        renderForm(
          t(
            "खाता सफलतापूर्वक बनाउने अनुरोध पठाइयो! आफ्नो इमेल Inbox वा Spam मा आएको Confirmation Link खोल्नुहोस्। इमेल पुष्टि भएपछि मात्र Login गर्न सक्नुहुन्छ।",
            "Your signup request was successful! Open the confirmation link sent to your inbox or spam folder. You can log in after verifying your email."
          ),
          "success"
        );

        return;
      }

      await auth.signIn(email, password);

      syncAccess();

    } catch (error) {
      console.error("Authentication error:", error);

      showStatus(
        error?.message ||
        t(
          "प्रक्रिया सफल भएन। विवरण जाँचेर फेरि प्रयास गर्नुहोस्।",
          "The request failed. Check your details and try again."
        ),
        "error"
      );

    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     BUTTON ACTIONS
  ======================================================= */

  async function handleClick(event) {
    const button = event.target.closest("[data-gate-action]");
    if (!button) return;

    const action = button.dataset.gateAction;

    if (action === "eye") {
      const targetName = button.dataset.target;

      const input = document.querySelector(
        `#${ROOT_ID} [name="${targetName}"]`
      );

      if (!input) return;

      const reveal = input.type === "password";

      input.type = reveal ? "text" : "password";

      button.innerHTML = eyeIcon(reveal);

      button.setAttribute(
        "aria-label",
        reveal
          ? t("पासवर्ड लुकाउनुहोस्", "Hide password")
          : t("पासवर्ड देखाउनुहोस्", "Show password")
      );

      button.setAttribute(
        "aria-pressed",
        String(reveal)
      );

      return;
    }

    if (action === "toggle") {
      currentMode =
        currentMode === "login" ? "signup" : "login";

      renderForm();
      return;
    }

    if (action === "reload") {
      global.location.reload();
      return;
    }

    if (action === "reset") {
      const emailInput = document.querySelector(
        `#${ROOT_ID} [name="email"]`
      );

      const email = String(emailInput?.value || "")
        .trim()
        .toLowerCase();

      if (!emailIsValid(email)) {
        showStatus(
          t(
            "पहिले सही इमेल ठेगाना लेख्नुहोस्।",
            "Enter a valid email address first."
          ),
          "error"
        );

        emailInput?.focus();
        return;
      }

      button.disabled = true;

      try {
        await global.KSKSupabaseAuth.resetPassword(email);

        showStatus(
          t(
            "पासवर्ड परिवर्तन गर्ने Link तपाईंको इमेलमा पठाइएको छ।",
            "A password reset link has been sent to your email."
          ),
          "success"
        );

      } catch (error) {
        showStatus(
          error?.message ||
          t("अनुरोध सफल भएन।", "The request failed."),
          "error"
        );

      } finally {
        button.disabled = false;
      }
    }
  }

  /* =======================================================
     ACCESS CONTROL
  ======================================================= */

  function syncAccess() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const splash = document.getElementById("welcomeSplash");
    const splashGone = !splash;

    if (!authReady) {
      root.hidden = true;
      document.body.classList.add("ksk-auth-locked");
      return;
    }

    const authenticated =
      global.KSKSupabaseAuth?.isAuthenticated?.() === true;

    if (authenticated) {
      root.hidden = true;
      document.body.classList.remove("ksk-auth-locked");
      return;
    }

    document.body.classList.add("ksk-auth-locked");

    /*
      Keep the existing Welcome Splash visible.
      Show authentication only after the splash disappears.
    */

    root.hidden = !splashGone;
  }

  function watchWelcomeSplash() {
    const splash = document.getElementById("welcomeSplash");

    if (!splash) {
      syncAccess();
      return;
    }

    splashObserver = new MutationObserver(() => {
      if (!document.getElementById("welcomeSplash")) {
        syncAccess();

        splashObserver?.disconnect();
        splashObserver = null;
      }
    });

    splashObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initialize() {
    addStyles();
    createScreen();
    watchWelcomeSplash();

    global.addEventListener("ksk:auth-ready", () => {
      authReady = true;
      syncAccess();
    });

    global.addEventListener("ksk:auth-change", () => {
      authReady = true;
      syncAccess();
    });

    global.setTimeout(() => {
      if (authReady) return;

      const card = document.getElementById("kskGateCard");

      if (card) {
        card.innerHTML = `
          <h2>
            ${t("जडान हुन सकेन", "Connection unavailable")}
          </h2>

          <p class="ksk-gate-subtitle">
            ${t(
              "Authentication सेवा लोड हुन सकेन। इन्टरनेट जाँच गरेर पेज Refresh गर्नुहोस्।",
              "Authentication could not load. Check your connection and refresh."
            )}
          </p>

          <button
            class="ksk-gate-primary"
            type="button"
            data-gate-action="reload">
            ${t("फेरि प्रयास गर्नुहोस्", "Try again")}
          </button>
        `;
      }
    }, 15000);
  }

  global.KSKAuthGate = Object.freeze({
    initialize,
    refresh: syncAccess
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
