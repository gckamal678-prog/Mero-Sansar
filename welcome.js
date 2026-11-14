
/* ==========================================
   MERO SANSAR — WELCOME SPLASH CONTROLLER
========================================== */

(function () {
  "use strict";

  function initWelcomeSplash() {
    const splash = document.getElementById("welcomeSplash");
    const startButton = document.getElementById("welcomeStartButton");

    if (!splash) return;

    document.body.classList.add("welcome-splash-active");

    let closed = false;

    function closeWelcomeSplash() {
      if (closed) return;

      closed = true;

      splash.classList.add("welcome-splash-leaving");
      document.body.classList.remove("welcome-splash-active");

      window.setTimeout(function () {
        splash.hidden = true;
        splash.remove();
      }, 500);
    }

    if (startButton) {
      startButton.addEventListener("click", closeWelcomeSplash);
    }

    // Automatic fallback
    window.setTimeout(closeWelcomeSplash, 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWelcomeSplash);
  } else {
    initWelcomeSplash();
  }

})();
