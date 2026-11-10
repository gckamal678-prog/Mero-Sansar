
"use strict";

/* =========================================================
   KSK MODAL CONTROLLER
   Secure HTML Rendering + Sanitization
   Single Data Layer Architecture
   Namespace: window.KSKModal

   Security:
   - HTML Allowlist Sanitization
   - Blocks inline event handlers
   - Blocks javascript: URLs
   - Blocks dangerous HTML elements
   - Preserves existing Modal API
   - Supports canvas-based image cropping
   - Supports external form-associated submit buttons
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


  /* =========================================================
     ALLOWED HTML ELEMENTS
  ========================================================= */

  const ALLOWED_TAGS = new Set([

    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "button",
    "canvas",
    "caption",
    "code",
    "div",
    "em",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "i",
    "img",
    "input",
    "label",
    "legend",
    "li",
    "ol",
    "option",
    "p",
    "pre",
    "section",
    "select",
    "small",
    "span",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "textarea",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul"

  ]);


  /* =========================================================
     DANGEROUS ELEMENTS
  ========================================================= */

  const BLOCKED_TAGS = new Set([

    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "applet",
    "base",
    "meta",
    "link",
    "frame",
    "frameset",
    "noscript",
    "template",
    "svg",
    "math",
    "foreignobject"

  ]);


  /* =========================================================
     ALLOWED ATTRIBUTES
  ========================================================= */

  const ALLOWED_ATTRIBUTES = new Set([

    "id",
    "class",
    "title",
    "role",
    "tabindex",
    "dir",
    "lang",

    "href",
    "target",
    "rel",

    "src",
    "alt",
    "width",
    "height",
    "loading",

    "type",
    "name",
    "value",
    "placeholder",
    "checked",
    "selected",
    "disabled",
    "readonly",
    "required",
    "multiple",
    "min",
    "max",
    "step",
    "maxlength",
    "minlength",
    "autocomplete",

    "rows",
    "cols",
    "for",
    "form",
    "colspan",
    "rowspan",
    "scope",

    "action"

  ]);


  /* =========================================================
     SAFE URL VALIDATION
  ========================================================= */

  function isSafeURL(value, attributeName) {

    const raw = String(value ?? "").trim();

    if (!raw) return false;

    // Block control characters and whitespace obfuscation.
    if (/[\u0000-\u0020\u007f]/.test(raw)) {
      return false;
    }

    // Reject encoded or malformed URL schemes.
    if (/%[0-9a-f]{2}/i.test(raw)) {
      try {
        const decoded = decodeURIComponent(raw);

        if (/^\s*(javascript|vbscript|data|file):/i.test(decoded)) {
          return false;
        }

      } catch (error) {
        return false;
      }
    }

    // Images may use Blob URLs.
    if (
      attributeName === "src" &&
      /^blob:/i.test(raw)
    ) {
      return true;
    }

    // Permit normal relative URLs.
    if (
      raw.startsWith("/") ||
      raw.startsWith("./") ||
      raw.startsWith("../") ||
      raw.startsWith("#") ||
      raw.startsWith("?")
    ) {
      return true;
    }

    try {

      const url = new URL(
        raw,
        global.location.href
      );

      if (
        url.protocol === "https:" ||
        url.protocol === "http:"
      ) {
        return true;
      }

      if (
        attributeName === "href" &&
        (
          url.protocol === "mailto:" ||
          url.protocol === "tel:"
        )
      ) {
        return true;
      }

    } catch (error) {
      return false;
    }

    return false;
  }


  /* =========================================================
     ATTRIBUTE SANITIZATION
  ========================================================= */

  function isAllowedAttribute(name, value) {

    const attr = name.toLowerCase();

    // Never permit inline JavaScript handlers.
    if (attr.startsWith("on")) {
      return false;
    }

    // Never permit style injection.
    if (attr === "style") {
      return false;
    }

    // Permit harmless ARIA attributes.
    if (attr.startsWith("aria-")) {
      return true;
    }

    // Permit application data attributes.
    if (attr.startsWith("data-")) {
      return true;
    }

    if (!ALLOWED_ATTRIBUTES.has(attr)) {
      return false;
    }

    if (
      attr === "href" ||
      attr === "src" ||
      attr === "action"
    ) {
      return isSafeURL(value, attr);
    }

    if (
      attr === "target" &&
      value !== "_blank" &&
      value !== "_self"
    ) {
      return false;
    }

    return true;
  }


  /* =========================================================
     HTML SANITIZER

     HTML is parsed in an inert template and rebuilt
     using only approved elements and attributes.
  ========================================================= */

  function sanitizeHTML(html) {

    const template = document.createElement("template");

    template.innerHTML = String(html ?? "");

    const fragment = document.createDocumentFragment();

    function sanitizeNode(source, destination) {

      for (const node of Array.from(source.childNodes)) {

        // Preserve plain text.
        if (node.nodeType === global.Node.TEXT_NODE) {

          destination.appendChild(
            document.createTextNode(node.textContent)
          );

          continue;
        }

        // Ignore comments and unsupported node types.
        if (node.nodeType !== global.Node.ELEMENT_NODE) {
          continue;
        }

        const tag = node.localName.toLowerCase();

        // Completely remove dangerous elements.
        if (BLOCKED_TAGS.has(tag)) {
          continue;
        }

        // Unknown harmless elements are unwrapped.
        if (!ALLOWED_TAGS.has(tag)) {

          sanitizeNode(node, destination);

          continue;
        }

        const cleanElement = document.createElement(tag);

        // Copy only approved attributes.
        for (const attribute of Array.from(node.attributes)) {

          const name = attribute.name.toLowerCase();
          const value = attribute.value;

          if (!isAllowedAttribute(name, value)) {
            continue;
          }

          cleanElement.setAttribute(name, value);
        }

        // Prevent reverse-tabnabbing.
        if (
          tag === "a" &&
          cleanElement.getAttribute("target") === "_blank"
        ) {

          const existingRel =
            cleanElement.getAttribute("rel") || "";

          const relValues = new Set(
            existingRel.split(/\s+/).filter(Boolean)
          );

          relValues.add("noopener");
          relValues.add("noreferrer");

          cleanElement.setAttribute(
            "rel",
            Array.from(relValues).join(" ")
          );
        }

        // Recursively sanitize children.
        sanitizeNode(node, cleanElement);

        destination.appendChild(cleanElement);
      }
    }

    sanitizeNode(template.content, fragment);

    return fragment;
  }


  /* =========================================================
     CONTENT INSERTION

     DOM Nodes remain supported.
     HTML strings are sanitized before insertion.
  ========================================================= */

  function insertContent(container, content) {

    if (!container) return;

    if (content instanceof global.Node) {

      container.appendChild(content);

      return;
    }

    container.appendChild(
      sanitizeHTML(String(content ?? ""))
    );
  }


  /* =========================================================
     FOCUS MANAGEMENT
  ========================================================= */

  function getFocusableElements(modal) {

    if (!modal) return [];

    return Array.from(
      modal.querySelectorAll(FOCUSABLE_SELECTOR)
    ).filter(element => {

      return (
        element.getAttribute("aria-hidden") !== "true" &&
        element.getAttribute("tabindex") !== "-1"
      );

    });
  }


  /* =========================================================
     KEYBOARD HANDLING
  ========================================================= */

  function handleKeydown(event) {

    if (!activeModal) return;

    // Escape: Close modal.
    if (event.key === "Escape") {

      event.preventDefault();

      closeModal();

      return;
    }

    // Tab: Keep keyboard focus inside modal.
    if (event.key === "Tab") {

      const focusable = getFocusableElements(
        activeModal
      );

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


  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  function closeModal() {

    if (!activeModal) return;

    const modalToClose = activeModal;

    activeModal = null;

    document.removeEventListener(
      "keydown",
      handleKeydown
    );

    modalToClose.remove();

    document.body.style.overflow =
      previousBodyOverflow;

    // Restore previous focus.
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


  /* =========================================================
     OPEN MODAL
  ========================================================= */

  function openModal({

    title = "",
    content = "",
    footer = "",
    closeOnBackdrop = true,
    closeButtonLabel = "Close"

  } = {}) {

    // Close previously opened modal.
    closeModal();

    previousFocusElement = document.activeElement;

    previousBodyOverflow =
      document.body.style.overflow;

    const backdrop = document.createElement("div");

    backdrop.className = "modal-backdrop";

    // Static trusted application markup only.
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
            aria-label="Close"
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

    const closeButton = backdrop.querySelector(
      "[data-modal-close]"
    );

    // Safe title insertion.
    titleElement.textContent = String(title ?? "");

    // Safe close button label.
    closeButton.setAttribute(
      "aria-label",
      String(closeButtonLabel ?? "Close")
    );

    // Sanitize dynamic content and footer.
    insertContent(bodyElement, content);

    insertContent(footerElement, footer);

    // Close button and backdrop click.
    backdrop.addEventListener("click", function (event) {

      const target = event.target;

      if (
        target instanceof global.Element &&
        target.closest("[data-modal-close]")
      ) {

        closeModal();

        return;
      }

      if (
        closeOnBackdrop &&
        target === backdrop
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

    // Initial focus.
    if (closeButton) {
      closeButton.focus();
    }

    // Preserve existing API.
    return Object.freeze({

      close: closeModal,

      element: backdrop

    });
  }


  /* =========================================================
     PUBLIC API
  ========================================================= */

  function getActiveModal() {

    return activeModal;
  }


  function isModalOpen() {

    return Boolean(activeModal);
  }


  global.KSKModal = Object.freeze({

    openModal,

    closeModal,

    isModalOpen,

    getActiveModal

  });


})(window);
