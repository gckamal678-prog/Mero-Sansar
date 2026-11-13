
"use strict";

/*
 * MERO SANSAR — ACCESSIBILITY PATCH
 *
 * - Custom Settings Reset confirmation
 * - Keyboard focus trap for Profile Extras dialogs
 * - Restore focus after dialog close
 * - Reset dialog state on close button and Escape
 */

(function (global) {
  "use strict";

  if (global.KSKAccessibility) return;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  let previousProfileTrigger = null;
  let profileDialogWasOpen = false;
  let observer = null;
  let resetDialogOpen = false;

  const t = (ne, en) =>
    global.KSKLanguage?.getLanguage?.() === "en" ? en : ne;

  function notify(message, type = "info") {
    const toast = global.KSKToast;

    if (typeof toast?.[type] === "function") {
      toast[type](message);
    } else {
      toast?.show?.(message, type);
    }
  }

  function getFocusable(container) {
    if (!container) return [];

    return Array.from(
      container.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element =>
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
    );
  }

  /* SETTINGS RESET */

  function openResetConfirmation() {
    if (resetDialogOpen || !global.KSKModal?.openModal) {
      return false;
    }

    resetDialogOpen = true;

    const content = `
      <div class="ksk-accessibility-confirm">
        <p>
          ${t(
            "सबै सेटिङ Default अवस्थामा फर्किनेछन्। यो कार्यपछि तपाईंका हालका सेटिङहरू पुनः प्राप्त गर्न सकिँदैन।",
            "All settings will return to their defaults. Your current settings cannot be restored afterward."
          )}
        </p>
        <p>
          <strong>
            ${t("के तपाईं निश्चित हुनुहुन्छ?", "Are you sure?")}
          </strong>
        </p>
      </div>
    `;

    const footer = `
      <div class="ksk-accessibility-actions">
        <button type="button"
          class="btn btn-secondary"
          data-ksk-reset-cancel>
          ${t("रद्द गर्नुहोस्", "Cancel")}
        </button>

        <button type="button"
          class="btn btn-primary"
          data-ksk-reset-confirm>
          ${t("सेटिङ Reset गर्नुहोस्", "Reset settings")}
        </button>
      </div>
    `;

    global.KSKModal.openModal({
      title: t("सेटिङ Reset", "Reset Settings"),
      content,
      footer,
      closeOnBackdrop: false,
      closeButtonLabel: t("बन्द गर्नुहोस्", "Close")
    });

    return true;
  }

  function closeResetConfirmation() {
    if (!resetDialogOpen) return;

    resetDialogOpen = false;
    global.KSKModal?.closeModal?.();
  }

  function confirmReset() {
    const reset = global.KSKSettings?.resetSettings;

    if (typeof reset !== "function") {
      closeResetConfirmation();

      notify(
        t("सेटिङ Reset गर्न सकिएन।", "Could not reset settings."),
        "error"
      );

      return;
    }

    const result = reset();

    closeResetConfirmation();

    if (!result) {
      notify(
        t(
          "सेटिङ सुरक्षित गर्न सकिएन। फेरि प्रयास गर्नुहोस्।",
          "Settings could not be saved. Please try again."
        ),
        "error"
      );
      return;
    }

    global.KSKSettingsUI?.render?.();

    notify(
      t(
        "सेटिङ Default अवस्थामा फर्काइयो।",
        "Settings restored to defaults."
      ),
      "success"
    );
  }

  /* PROFILE EXTRAS FOCUS */

  function getProfileDialog() {
    return $(".ksk-profile-extra-overlay");
  }

  function handleProfileFocus(event) {
    const dialog = getProfileDialog();
    if (!dialog) return;

    const focusable = getFocusable(dialog);

    if (!focusable.length) {
      event.preventDefault();
      dialog.querySelector(
        ".ksk-profile-extra-dialog"
      )?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (
      event.shiftKey &&
      (
        document.activeElement === first ||
        !dialog.contains(document.activeElement)
      )
    ) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (
      !event.shiftKey &&
      (
        document.activeElement === last ||
        !dialog.contains(document.activeElement)
      )
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(event) {
    if (resetDialogOpen && event.key === "Escape") {
      // Modal's own keyboard handler will close it.
      resetDialogOpen = false;
      return;
    }

    if (event.key === "Tab" && getProfileDialog()) {
      handleProfileFocus(event);
    }
  }

  function rememberProfileTrigger(event) {
    const trigger = event.target?.closest?.(
      '[data-profile-extra-open="qr"], [data-profile-extra-open="badges"]'
    );

    if (trigger) {
      previousProfileTrigger = trigger;
    }
  }

  function watchProfileDialog() {
    if (!global.MutationObserver || observer) return;

    observer = new MutationObserver(() => {
      const isOpen = Boolean(getProfileDialog());

      if (isOpen) {
        profileDialogWasOpen = true;
        return;
      }

      if (profileDialogWasOpen) {
        profileDialogWasOpen = false;

        const trigger = previousProfileTrigger;
        previousProfileTrigger = null;

        if (
          trigger &&
          trigger.isConnected &&
          typeof trigger.focus === "function"
        ) {
          trigger.focus();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* CLICK HANDLING */

  function handleClick(event) {
    const target = event.target;
    if (!target?.closest) return;

    // Allow the modal's own close handler to run,
    // but clear our reset state first.
    if (
      resetDialogOpen &&
      target.closest("[data-modal-close]")
    ) {
      resetDialogOpen = false;
      return;
    }

    const resetButton = target.closest(
      '[data-settings-action="reset"]'
    );

    if (resetButton) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openResetConfirmation();
      return;
    }

    if (target.closest("[data-ksk-reset-cancel]")) {
      event.preventDefault();
      closeResetConfirmation();
      return;
    }

    if (target.closest("[data-ksk-reset-confirm]")) {
      event.preventDefault();
      confirmReset();
    }
  }

  /* STYLES */

  function ensureStyles() {
    if ($("#ksk-accessibility-style")) return;

    const style = document.createElement("style");
    style.id = "ksk-accessibility-style";

    style.textContent = `
      .ksk-accessibility-confirm {
        line-height: 1.65;
        color: var(--color-text, inherit);
      }

      .ksk-accessibility-confirm p {
        margin: 0 0 12px;
      }

      .ksk-accessibility-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 9px;
      }

      .ksk-accessibility-actions button {
        min-height: 42px;
        padding: 9px 15px;
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
      }

      .ksk-accessibility-actions button:focus-visible,
      .ksk-profile-extra-dialog button:focus-visible {
        outline: 3px solid var(--color-primary, #2563eb);
        outline-offset: 3px;
      }

      .ksk-profile-extra-dialog {
        outline: none;
      }

      @media (max-width: 380px) {
        .ksk-accessibility-actions {
          flex-direction: column-reverse;
        }

        .ksk-accessibility-actions button {
          width: 100%;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ksk-accessibility-confirm *,
        .ksk-accessibility-actions * {
          scroll-behavior: auto !important;
          animation: none !important;
          transition: none !important;
        }
      }
    `;

    (document.head || document.documentElement)
      .appendChild(style);
  }

  /* INITIALIZE */

  function initialize() {
    if (!document.body) return false;

    ensureStyles();
    watchProfileDialog();

    document.removeEventListener(
      "click",
      rememberProfileTrigger,
      true
    );

    document.addEventListener(
      "click",
      rememberProfileTrigger,
      true
    );

    document.removeEventListener(
      "click",
      handleClick,
      true
    );

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    document.removeEventListener(
      "keydown",
      handleKeydown,
      true
    );

    document.addEventListener(
      "keydown",
      handleKeydown,
      true
    );

    return true;
  }

  global.KSKAccessibility = Object.freeze({
    initialize
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
