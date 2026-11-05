/* Hamro Sansar — Shared Modal Controller */

let activeModal = null;
let previousFocusElement = null;

function createModalElement() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "presentation");

  backdrop.innerHTML = `
    <section
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hs-modal-title"
    >
      <header class="modal-header">
        <h2 class="modal-title" id="hs-modal-title"></h2>
        <button
          type="button"
          class="icon-button"
          data-modal-close
          aria-label="Close dialog"
        >×</button>
      </header>

      <div class="modal-body" data-modal-body></div>

      <footer class="modal-footer" data-modal-footer></footer>
    </section>
  `;

  return backdrop;
}

function closeModal() {
  if (!activeModal) return;

  activeModal.remove();
  activeModal = null;

  document.body.style.overflow = "";

  if (
    previousFocusElement &&
    typeof previousFocusElement.focus === "function"
  ) {
    previousFocusElement.focus();
  }

  previousFocusElement = null;
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    closeModal();
  }
}

export function openModal({
  title = "",
  content = "",
  footer = "",
  closeOnBackdrop = true
} = {}) {
  closeModal();

  previousFocusElement = document.activeElement;

  const modal = createModalElement();

  modal.querySelector("#hs-modal-title").textContent = title;

  const body = modal.querySelector("[data-modal-body]");
  const footerElement = modal.querySelector("[data-modal-footer]");

  if (content instanceof Node) {
    body.appendChild(content);
  } else {
    body.innerHTML = String(content);
  }

  if (footer instanceof Node) {
    footerElement.appendChild(footer);
  } else {
    footerElement.innerHTML = String(footer);
  }

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) {
      closeModal();
      return;
    }

    if (closeOnBackdrop && event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", handleModalKeydown);

  activeModal = modal;
  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  const closeButton = modal.querySelector("[data-modal-close]");
  closeButton?.focus();

  return {
    close: closeModal,
    element: modal
  };
}

export function closeActiveModal() {
  document.removeEventListener("keydown", handleModalKeydown);
  closeModal();
}

export function isModalOpen() {
  return Boolean(activeModal);
}
