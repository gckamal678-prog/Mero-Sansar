/* =========================================================
   SETTINGS PAGE MODULE
   Mero-Sansar

   Connects the page layer with the existing
   KSKSettingsUI module.

   Does not create a duplicate settings interface.
   ========================================================= */

(function (global) {
  "use strict";

  if (global.KSKSettingsPage) {
    return;
  }

  const SETTINGS_UI = () => global.KSKSettingsUI || null;

  function initialize() {
    const settingsUI = SETTINGS_UI();

    if (typeof settingsUI?.initialize !== "function") {
      return false;
    }

    return settingsUI.initialize();
  }

  function open() {
    const settingsUI = SETTINGS_UI();

    if (typeof settingsUI?.open !== "function") {
      return false;
    }

    return settingsUI.open();
  }

  function close() {
    const settingsUI = SETTINGS_UI();

    if (typeof settingsUI?.close !== "function") {
      return false;
    }

    return settingsUI.close();
  }

  function render() {
    const settingsUI = SETTINGS_UI();

    if (typeof settingsUI?.render !== "function") {
      return false;
    }

    return settingsUI.render();
  }

  function getActiveSection() {
    const settingsUI = SETTINGS_UI();

    if (typeof settingsUI?.getActiveSection !== "function") {
      return "main";
    }

    return settingsUI.getActiveSection();
  }

  const api = Object.freeze({
    initialize,
    open,
    close,
    render,
    getActiveSection
  });

  global.KSKSettingsPage = api;

})(window);
