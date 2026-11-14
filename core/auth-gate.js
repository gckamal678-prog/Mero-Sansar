
"use strict";

/* =========================================================
   MERO SANSAR — AUTHENTICATION GATE
   Welcome Splash → Login / Sign Up → Dashboard
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKAuthGate) return;

  const ROOT_ID = "ksk-auth-gate";
  const STYLE_ID = "ksk-auth-gate-style";

  let authReady = false;
  let splashGone = false;
  let currentMode = "login";
  let observer = null;

  // Dashboard लाई सुरुबाटै सुरक्षित राख्ने
  document.body.classList.add("ksk-auth-locked");

  function isEnglish() {
    return global.KSKLanguage?.getLanguage?.() === "en";
  }

  function t(ne, en) {
    return isEnglish() ? en : ne;
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
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
        padding: 22px 16px;
        box-sizing: border-box;
        background:
          radial-gradient(
            ellipse at 15% 10%,
            rgba(116, 91, 210, .24),
            transparent 42%
          ),
          radial-gradient(
            ellipse at 90% 90%,
            rgba(37, 170, 180, .18),
            transparent 40%
          ),
          linear-gradient(
            145deg,
            #090d20,
            #11152e 52%,
            #1a1033
          );
        color: #fff;
        font-family: inherit;
      }

      #${ROOT_ID} .ksk-gate-wrap {
        width: min(100%, 410px);
        margin: auto;
      }

      #${ROOT_ID} .ksk-gate-brand {
        text-align: center;
        margin-bottom: 22px;
      }

      #${ROOT_ID} .ksk-gate-logo {
        width: 66px;
        height: 66px;
        display: grid;
        place-items: center;
        margin: 0 auto 13px;
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 21px;
        background: linear-gradient(
          145deg,
          rgba(255,255,255,.20),
          rgba(255,255,255,.06)
        );
        box-shadow: 0 12px 35px rgba(0,0,0,.25);
        font-size: 30px;
      }

      #${ROOT_ID} .ksk-gate-brand h1 {
        margin: 0;
        color: #fff;
        font-size: 27px;
        font-weight: 850;
        letter-spacing: -.5px;
      }

      #${ROOT_ID} .ksk-gate-brand h1 span {
        background: linear-gradient(
          100deg,
          #e3d7ff,
          #b69aff,
          #83d8df
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      #${ROOT_ID} .ksk-gate-brand p {
        margin: 8px 0 0;
        color: rgba(239,235,250,.68);
        font-size: 12px;
        line-height: 1.7;
      }

      #${ROOT_ID} .ksk-gate-card {
        padding: 23px 20px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 22px;
        background: rgba(255,255,255,.97);
        color: #172033;
        box-shadow: 0 24px 75px rgba(0,0,0,.34);
      }

      #${ROOT_ID} .ksk-gate-card h2 {
        margin: 0;
        color: #172033;
        font-size: 21px;
        font-weight: 850;
      }

      #${ROOT_ID} .ksk-gate-subtitle {
        margin: 7px 0 18px;
        color: #647084;
        font-size: 12px;
        line-height: 1.7;
      }

      #${ROOT_ID} .ksk-gate-field {
        display: block;
        margin: 13px 0;
      }

      #${ROOT_ID} .ksk-gate-field span {
        display: block;
        margin-bottom: 7px;
        color: #344054;
        font-size: 12px;
        font-weight: 800;
      }

      #${ROOT_ID} .ksk-gate-field input {
        width: 100%;
        min-height: 47px;
        box-sizing: border-box;
        padding: 11px 13px;
        border: 1px solid #dce2ec;
        border-radius: 12px;
        outline: none;
        background: #f8f9fc;
        color: #172033;
        font: inherit;
        font-size: 14px;
      }

      #${ROOT_ID} .ksk-gate-field input:focus {
        border-color: #7660cf;
        box-shadow: 0 0 0 3px rgba(118,96,207,.13);
      }

      #${ROOT_ID} .ksk-gate-primary {
        width: 100%;
        min-height: 48px;
        margin-top: 9px;
        border: 0;
        border-radius: 12px;
        background: linear-gradient(105deg,#765bd0,#5d83d9);
        color: #fff;
        font: inherit;
        font-size: 13px;
        font-weight: 850;
        cursor: pointer;
      }

      #${ROOT_ID} .ksk-gate-secondary {
        width: 100%;
        min-height: 42px;
        margin-top: 12px;
        border: 1px solid #e0e4ed;
        border-radius: 11px;
        background: #f7f8fc;
        color: #5547a1;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
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
        font-weight: 800;
        text-align: center;
        cursor: pointer;
      }

      #${ROOT_ID} .ksk-gate-status {
        margin: 13px 0 0;
        padding: 11px;
        border: 1px solid #dce2ec;
        border-radius: 10px;
        background: #f7f8fc;
        color: #344054;
        font-size: 12px;
        line-height: 1.7;
        overflow-wrap: anywhere;
      }

      #${ROOT_ID} .ksk-gate-status[data-type="error"] {
        border-color: #e69a9a;
        color: #a32626;
        background: #fff5f5;
      }

      #${ROOT_ID} .ksk-gate-status[hidden] {
        display: none;
      }

      #${ROOT_ID} button:disabled,
      #${ROOT_ID} input:disabled {
        opacity: .6;
        cursor: wait;
      }

      #${ROOT_ID} .ksk-gate-footer {
        margin: 18px 0 0;
        color: rgba(226,217,247,.48);
        font-size: 10px;
        text-align: center;
        letter-spacing: 1px;
      }

      @media (max-width: 360px) {
        #${ROOT_ID} .ksk-gate-card {
          padding: 19px 15px;
        }

        #${ROOT_ID} .ksk-gate-brand h1 {
          font-size: 24px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     CREATE SCREEN
  ======================================================= */

  function createScreen() {
    if (document.getElementById(ROOT_ID)) return;

    const root = document.createElement("section");

    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute("aria-label", "Mero Sansar Login");

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
     FORM
  ======================================================= */

  function renderForm() {
    const card = document.getElementById("kskGateCard");
    if (!card) return;

    const signup = currentMode === "signup";

    card.innerHTML = `
      <h2>
        ${signup
          ? t("नयाँ खाता बनाउनुहोस्", "Create a new account")
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
              "आफ्नो खातामा प्रवेश गर्न Email र Password लेख्नुहोस्।",
              "Enter your email and password to access your account."
            )
        }
      </p>

      <form data-gate-form data-mode="${signup ? "signup" : "login"}">

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

        <label class="ksk-gate-field">
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

        <button class="ksk-gate-primary" type="submit">
          ${signup
            ? t("खाता बनाउनुहोस्", "Create account")
            : t("लगइन गर्नुहोस्", "Log in")
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
      ` : ""}

      <button
        type="button"
        class="ksk-gate-secondary"
        data-gate-action="toggle">
        ${signup
          ? t("पहिल्यै खाता छ? Login गर्नुहोस्", "Already have an account? Log in")
          : t("नयाँ प्रयोगकर्ता हुनुहुन्छ? Sign Up गर्नुहोस्", "New user? Sign up")
        }
      </button>

      <p
        class="ksk-gate-status"
        id="kskGateStatus"
        role="status"
        aria-live="polite"
        hidden></p>
    `;
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

    root.querySelectorAll("button, input").forEach(element => {
      element.disabled = Boolean(busy);
    });
  }

  /* =======================================================
     SIGN UP / LOGIN
  ======================================================= */

  async function handleSubmit(event) {
    const form = event.target.closest("[data-gate-form]");
    if (!form) return;

    event.preventDefault();

    const email = String(
      form.elements.email?.value || ""
    ).trim().toLowerCase();

    const password = String(
      form.elements.password?.value || ""
    );

    if (!email || !password) {
      showStatus(
        t(
          "इमेल र पासवर्ड दुवै आवश्यक छन्।",
          "Email and password are required."
        ),
        "error"
      );
      return;
    }

    if (password.length < 6) {
      showStatus(
        t(
          "पासवर्ड कम्तीमा ६ अक्षरको हुनुपर्छ।",
          "Password must contain at least 6 characters."
        ),
        "error"
      );
      return;
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

    const mode = form.dataset.mode;

    setBusy(true);

    showStatus(
      t("कृपया पर्खनुहोस्...", "Please wait..."),
      "info"
    );

    try {
      if (mode === "signup") {
        const result = await auth.signUp(email, password);

        if (result.confirmationRequired) {
          currentMode = "login";
          renderForm();

          showStatus(
            t(
              "खाता बनाउने अनुरोध सफल भयो। आफ्नो इमेलमा आएको Confirmation Link खोल्नुहोस्। त्यसपछि यहाँ Login गर्नुहोस्।",
              "Your account request was successful. Open the confirmation link sent to your email, then log in here."
            ),
            "info"
          );

          return;
        }

        syncAccess();

      } else {
        await auth.signIn(email, password);
        syncAccess();
      }

    } catch (error) {
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

    if (action === "toggle") {
      currentMode =
        currentMode === "login" ? "signup" : "login";

      renderForm();
      return;
    }

    if (action === "reset") {
      const emailInput = document.querySelector(
        "#kskGateCard [name='email']"
      );

      const email = String(emailInput?.value || "")
        .trim()
        .toLowerCase();

      if (!email) {
        showStatus(
          t(
            "पहिले आफ्नो इमेल ठेगाना लेख्नुहोस्।",
            "Enter your email address first."
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
          "info"
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
    splashGone = !splash;

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

    // Welcome Splash हटेपछि मात्र Login देखाउने
    root.hidden = !splashGone;
  }

  /* =======================================================
     WELCOME SPLASH WATCHER
  ======================================================= */

  function watchWelcomeSplash() {
    const splash = document.getElementById("welcomeSplash");

    if (!splash) {
      splashGone = true;
      syncAccess();
      return;
    }

    splashGone = false;

    observer = new MutationObserver(() => {
      const currentSplash =
        document.getElementById("welcomeSplash");

      if (!currentSplash) {
        splashGone = true;
        syncAccess();

        observer?.disconnect();
        observer = null;
      }
    });

    observer.observe(document.body, {
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

    // Auth SDK वा Internet समस्या भए जानकारी देखाउने
    global.setTimeout(() => {
      if (authReady) return;

      const card = document.getElementById("kskGateCard");

      if (card) {
        card.innerHTML = `
          <h2>${t("जडान हुन सकेन", "Connection unavailable")}</h2>
          <p class="ksk-gate-subtitle">
            ${t(
              "Authentication सेवा लोड हुन सकेन। इन्टरनेट जाँच गरेर पेज Refresh गर्नुहोस्।",
              "Authentication could not load. Check your internet connection and refresh the page."
            )}
          </p>
          <button
            class="ksk-gate-primary"
            type="button"
            onclick="location.reload()">
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
