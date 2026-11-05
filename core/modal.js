
"use strict";

/* =========================================================
   KSK MODAL CONTROLLER
   Single Data Layer Architecture
   Namespace: window.KSKModal
========================================================= */

(function (global) {
  let activeModal = null;
  let previousFocusElement = null;
  let previousBodyOverflow = "";

  const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  function getFocusableElements(modal) {
    if (!modal) return [];

    return Array.from(
      modal.querySelectorAll(FOCUSABLE_SELECTOR)
    ).filter(element => {
      return element.getAttribute("aria-hidden") !== "true";
    });
  }

  function handleKeydown(event) {
    if (!activeModal) return;

    // Escape: Close modal
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    // Tab: Keep keyboard focus inside modal
    if (event.key === "Tab") {
      const focusable = getFocusableElements(activeModal);

      if (!focusable.length) {
        event.preventDefault();
        activeModal.querySelector(".modal")?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function closeModal() {
    if (!activeModal) return;

    const modalToClose = activeModal;

    activeModal = null;

    document.removeEventListener(
      "keydown",
      handleKeydown
    );

    modalToClose.remove();

    document.body.style.overflow = previousBodyOverflow;

    // Restore previous focus
    if (
      previousFocusElement &&
      previousFocusElement.isConnected &&
      typeof previousFocusElement.focus === "function"
    ) {
      previousFocusElement.focus();
    }

    previousFocusElement = null;
    previousBodyOverflow = "";
  }

  function insertContent(container, content) {
    if (!container) return;

    if (content instanceof global.Node) {
      container.appendChild(content);
      return;
    }

    container.innerHTML = String(content ?? "");
  }

  function openModal({
    title = "",
    content = "",
    footer = "",
    closeOnBackdrop = true,
    closeButtonLabel = "Close"
  } = {}) {

    // Close any previously opened modal
    closeModal();

    previousFocusElement = document.activeElement;
    previousBodyOverflow = document.body.style.overflow;

    const backdrop = document.createElement("div");

    backdrop.className = "modal-backdrop";

    backdrop.innerHTML = `
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ksk-modal-title"
        tabindex="-1"
      >
        <header class="modal-header">
          <h2
            class="modal-title"
            id="ksk-modal-title"
            data-modal-title
          ></h2>

          <button
            type="button"
            class="icon-button"
            data-modal-close
            aria-label="${escapeAttribute(closeButtonLabel)}"
          >
            ×
          </button>
        </header>

        <div
          class="modal-body"
          data-modal-body
        ></div>

        <footer
          class="modal-footer"
          data-modal-footer
        ></footer>
      </section>
    `;

    const titleElement = backdrop.querySelector(
      "[data-modal-title]"
    );

    const bodyElement = backdrop.querySelector(
      "[data-modal-body]"
    );

    const footerElement = backdrop.querySelector(
      "[data-modal-footer]"
    );

    titleElement.textContent = String(title);

    insertContent(bodyElement, content);
    insertContent(footerElement, footer);

    // Close button and backdrop click
    backdrop.addEventListener("click", function (event) {

      if (event.target.closest("[data-modal-close]")) {
        closeModal();
        return;
      }

      if (
        closeOnBackdrop &&
        event.target === backdrop
      ) {
        closeModal();
      }
    });

    activeModal = backdrop;

    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";

    document.addEventListener(
      "keydown",
      handleKeydown
    );

    // Initial focus
    const closeButton = backdrop.querySelector(
      "[data-modal-close]"
    );

    if (closeButton) {
      closeButton.focus();
    }

    return Object.freeze({
      close: closeModal,
      element: backdrop
    });
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getActiveModal() {
    return activeModal;
  }

  function isModalOpen() {
    return Boolean(activeModal);
  }

  // Public KSK Modal API
  global.KSKModal = Object.freeze({

    openModal,
    closeModal,

    isModalOpen,
    getActiveModal

  });

})(window);
