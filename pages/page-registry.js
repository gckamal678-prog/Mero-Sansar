"use strict";

(function (global) {
  const pages = Object.create(null);

  function register(name, pageModule) {
    if (!name || !pageModule || typeof pageModule.render !== "function") {
      console.error("Invalid page registration:", name);
      return;
    }
    pages[name] = pageModule;
  }

  function has(name) {
    return Boolean(pages[name]);
  }

  function render(name) {
    const page = pages[name];
    if (!page) return null;

    try {
      return page.render();
    } catch (error) {
      console.error("Page render error:", name, error);
      return `<div class="card"><h2>पृष्ठ खोल्न समस्या भयो</h2><p>${name}</p></div>`;
    }
  }

  function handle(action, data, root) {
    const page = pages[global.HamroState?.state.currentPage];
    if (page && typeof page.handle === "function") {
      page.handle(action, data, root);
    }
  }

  global.HamroPages = Object.freeze({ register, has, render, handle });
})(window);
