
"use strict";

/*
 * KSK — GLOBAL ACTION MENU
 * Mero Sansar
 *
 * Shared progressive-disclosure menu for the entire application.
 *
 * HTML contract:
 *
 * <div class="ksk-action-menu">
 *   <button
 *     type="button"
 *     data-ksk-menu-trigger
 *     aria-controls="profile-menu"
 *     aria-label="More options"
 *   >⋮</button>
 *
 *   <div
 *     id="profile-menu"
 *     data-ksk-menu
 *     role="menu"
 *     hidden
 *   >
 *     <button type="button" role="menuitem"
 *       data-menu-action="edit">Edit</button>
 *     <button type="button" role="menuitem"
 *       data-menu-action="delete">Delete</button>
 *   </div>
 * </div>
 *
 * Listen for:
 * document.addEventListener("ksk:action-menu-select", handler)
 *
 * Event detail:
 * { action, value, menuId, trigger, item }
 */

(function (global) {
  "use strict";

  if (global.KSKActionMenu) return;

  const TRIGGER = "[data-ksk-menu-trigger]";
  const MENU = "[data-ksk-menu]";
  const ITEM = '[role="menuitem"]';

  let initialized = false;
  let activeMenu = null;
  let activeTrigger = null;

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function getMenu(trigger) {
    const id = trigger?.getAttribute("aria-controls");
    if (!id) return null;

    const menu = document.getElementById(id);

    if (!menu?.matches(MENU)) return null;

    return menu;
  }

  function getItems(menu) {
    if (!menu) return [];

    return $$(ITEM, menu).filter(item => {
      return (
        !item.disabled &&
        item.getAttribute("aria-disabled") !== "true" &&
        !item.hidden
      );
    });
  }

  function setExpanded(trigger, expanded) {
    if (!trigger) return;

    trigger.setAttribute(
      "aria-expanded",
      expanded ? "true" : "false"
    );
  }

  function close(menu = activeMenu, restoreFocus = false) {
    if (!menu) return false;

    const trigger = menu === activeMenu
      ? activeTrigger
      : null;

    menu.hidden = true;
    menu.classList.remove("is-open");

    setExpanded(trigger, false);

    if (menu === activeMenu) {
      activeMenu = null;
      activeTrigger = null;
    }

    if (
      restoreFocus &&
      trigger?.isConnected &&
      typeof trigger.focus === "function"
    ) {
      trigger.focus();
    }

    return true;
  }

  function closeAll(restoreFocus = false) {
    const openMenus = $$(MENU).filter(menu => !menu.hidden);

    openMenus.forEach(menu => {
      close(menu, false);
    });

    if (restoreFocus && activeTrigger?.isConnected) {
      activeTrigger.focus();
    }

    activeMenu = null;
    activeTrigger = null;

    return true;
  }

  function open(trigger, focusFirst = false) {
    if (!trigger?.matches(TRIGGER)) return false;

    const menu = getMenu(trigger);

    if (!menu) {
      console.warn(
        "KSKActionMenu: Menu not found for trigger.",
        trigger
      );
      return false;
    }

    closeAll(false);

    menu.hidden = false;
    menu.classList.add("is-open");

    setExpanded(trigger, true);

    activeMenu = menu;
    activeTrigger = trigger;

    if (focusFirst) {
      const first = getItems(menu)[0];
      first?.focus();
    }

    return true;
  }

  function toggle(trigger) {
    const menu = getMenu(trigger);

    if (!menu) return false;

    if (
      menu === activeMenu &&
      !menu.hidden
    ) {
      close(menu, false);
      return true;
    }

    return open(trigger, false);
  }

  function handleTriggerClick(event) {
    const trigger = event.target?.closest?.(TRIGGER);

    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();

    toggle(trigger);
  }

  function handleOutsidePointer(event) {
    if (!activeMenu) return;

    const target = event.target;

    if (
      activeMenu.contains(target) ||
      activeTrigger?.contains(target)
    ) {
      return;
    }

    closeAll(false);
  }

  function handleMenuClick(event) {
    const item = event.target?.closest?.(ITEM);

    if (!item || !activeMenu?.contains(item)) return;

    if (
      item.disabled ||
      item.getAttribute("aria-disabled") === "true"
    ) {
      event.preventDefault();
      return;
    }

    if (item.hasAttribute("data-ksk-menu-keep-open")) {
      return;
    }

    const detail = {
      action: item.getAttribute("data-menu-action") || "",
      value: item.getAttribute("data-menu-value") || "",
      menuId: activeMenu.id || "",
      trigger: activeTrigger,
      item
    };

    closeAll(false);

    document.dispatchEvent(
      new CustomEvent("ksk:action-menu-select", {
        bubbles: true,
        detail
      })
    );
  }

  function handleKeydown(event) {
    const trigger = event.target?.closest?.(TRIGGER);

    if (trigger) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        open(trigger, true);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        open(trigger, false);

        const items = getItems(activeMenu);
        items[items.length - 1]?.focus();
        return;
      }

      if (event.key === "Escape" && activeMenu) {
        event.preventDefault();
        closeAll(true);
        return;
      }
    }

    if (!activeMenu) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeAll(true);
      return;
    }

    const items = getItems(activeMenu);

    if (!items.length) return;

    const currentIndex = items.indexOf(
      document.activeElement
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();

      items[
        (currentIndex + 1 + items.length) % items.length
      ].focus();

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      items[
        (currentIndex - 1 + items.length) % items.length
      ].focus();

      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      items[0].focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1].focus();
      return;
    }

    if (event.key === "Tab") {
      closeAll(false);
    }
  }

  function ensureStyles() {
    if ($("#ksk-action-menu-styles")) return;

    const style = document.createElement("style");
    style.id = "ksk-action-menu-styles";

    style.textContent = `
      .ksk-action-menu {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      [data-ksk-menu] {
        position: absolute;
        z-index: 500;
        top: calc(100% + 7px);
        right: 0;

        width: max-content;
        min-width: 190px;
        max-width: min(290px, calc(100vw - 24px));
        max-height: min(70vh, 480px);
        overflow-y: auto;

        padding: 7px;
        border: 1px solid var(--color-border, #dbe2ea);
        border-radius: 14px;

        background: var(--color-surface, #fff);
        color: var(--color-text, #172033);

        box-shadow: var(--shadow-lg, 0 12px 32px rgba(0,0,0,.2));

        transform-origin: top right;
        animation: ksk-action-menu-in .14s ease;
      }

      [data-ksk-menu][hidden] {
        display: none !important;
      }

      [data-ksk-menu] [role="menuitem"] {
        width: 100%;
        min-height: 42px;

        display: flex;
        align-items: center;
        gap: 10px;

        padding: 9px 12px;
        border: 0;
        border-radius: 9px;

        background: transparent;
        color: var(--color-text, #172033);

        font: inherit;
        font-size: 14px;
        font-weight: 600;
        text-align: left;
        text-decoration: none;

        cursor: pointer;
      }

      [data-ksk-menu] [role="menuitem"]:hover,
      [data-ksk-menu] [role="menuitem"]:focus-visible {
        outline: none;
        background: var(--color-surface-hover, #f1f5f9);
      }

      [data-ksk-menu] [role="menuitem"].is-danger {
        color: var(--color-danger, #dc2626);
      }

      [data-ksk-menu] [role="menuitem"]:disabled,
      [data-ksk-menu] [role="menuitem"][aria-disabled="true"] {
        opacity: .5;
        cursor: not-allowed;
      }

      [data-ksk-menu] .ksk-menu-divider {
        height: 1px;
        margin: 6px 4px;
        background: var(--color-border, #dbe2ea);
      }

      @keyframes ksk-action-menu-in {
        from {
          opacity: 0;
          transform: translateY(-4px) scale(.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 480px) {
        [data-ksk-menu] {
          min-width: 180px;
          max-width: calc(100vw - 20px);
        }

        [data-ksk-menu] [role="menuitem"] {
          min-height: 44px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        [data-ksk-menu] {
          animation: none;
        }
      }
    `;

    (document.head || document.documentElement)
      .appendChild(style);
  }

  function initialize() {
    if (initialized) return true;

    if (!document.body) return false;

    ensureStyles();

    document.addEventListener(
      "click",
      handleTriggerClick
    );

    document.addEventListener(
      "click",
      handleMenuClick
    );

    document.addEventListener(
      "pointerdown",
      handleOutsidePointer,
      true
    );

    document.addEventListener(
      "keydown",
      handleKeydown
    );

    initialized = true;
    return true;
  }

  global.KSKActionMenu = Object.freeze({
    initialize,
    open,
    close,
    closeAll,
    toggle,
    isOpen: () => Boolean(activeMenu),
    getActiveMenu: () => activeMenu
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
