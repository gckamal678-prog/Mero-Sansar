"use strict";

/* Hamro Sansar — Shared Modal Controller */
(function (global) {
  let activeModal = null;
  let previousFocusElement = null;

  function closeModal() {
    if (!activeModal) return;

    activeModal.remove();
    activeModal = null;
    document.body.style.overflow = "";

    document.removeEventListener("keydown", handleKeydown);

    if (previousFocusElement && previousFocusElement.focus) {
      previousFocusElement.focus();
    }

    previousFocusElement = null;
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeModal();
  }

  function openModal({
    title = "",
    content = "",
    footer = "",
    closeOnBackdrop = true
  } = {}) {
    closeModal();
    previousFocusElement = document.activeElement;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h2 class="modal-title" data-modal-title></h2>
          <button type="button" class="icon-button"
            data-modal-close aria-label="Close">×</button>
        </header>
        <div class="modal-body" data-modal-body></div>
        <footer class="modal-footer" data-modal-footer></footer>
      </section>
    `;

    backdrop.querySelector("[data-modal-title]").textContent = title;

    const body = backdrop.querySelector("[data-modal-body]");
    const footerElement = backdrop.querySelector("[data-modal-footer]");

    if (content instanceof Node) body.appendChild(content);
    else body.innerHTML = String(content);

    if (footer instanceof Node) footerElement.appendChild(footer);
    else footerElement.innerHTML = String(footer);

    backdrop.addEventListener("click", (event) => {
      if (event.target.closest("[data-modal-close]")) {
        closeModal();
      } else if (closeOnBackdrop && event.target === backdrop) {
        closeModal();
      }
    });

    activeModal = backdrop;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeydown);

    backdrop.querySelector("[data-modal-close]")?.focus();

    return { close: closeModal, element: backdrop };
  }

  global.HamroModal = Object.freeze({
    openModal,
    closeModal,
    isModalOpen: () => Boolean(activeModal)
  });
})(window);
