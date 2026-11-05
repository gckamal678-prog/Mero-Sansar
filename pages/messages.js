"use strict";

(function (global) {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  global.HamroPages.register("messages", {
    render() {
      const chats = global.HamroData.getChats();

      return `
        <section class="hs-page">
          <div class="hs-page-heading">
            <h2>सन्देश</h2>
            <p>साथीहरूसँग text chat गर्नुहोस्।</p>
          </div>
          <div class="hs-list">
            ${chats.length
              ? chats.map((chat) => global.HamroMessageItem.render(chat)).join("")
              : `<div class="empty-state"><p>अहिलेसम्म सन्देश छैन। साथीबाट chat सुरु गर्नुहोस्।</p></div>`}
          </div>
        </section>
      `;
    },

    handle(action, data) {
      if (action === "open-chat") {
        global.HamroApp?.openChat(data.chatId);
      }
    }
  });

  global.HamroChatPage = {
    renderChat(chatId) {
      const chat = global.HamroData.getChats().find((item) => item.id === chatId);
      if (!chat) return `<div class="card"><p>Chat भेटिएन।</p></div>`;

      return `
        <section class="hs-page hs-chat-page">
          <div class="hs-chat-header">
            <button class="btn btn-secondary" data-hs-action="back-to-messages">‹ पछाडि</button>
            <div class="avatar">${esc(chat.avatar || chat.name.charAt(0))}</div>
            <strong>${esc(chat.name)}</strong>
          </div>

          <div class="hs-chat-messages">
            ${(chat.messages || []).map((message) => `
              <div class="hs-chat-bubble ${message.fromMe ? "mine" : "theirs"}">
                <p>${esc(message.text)}</p>
              </div>
            `).join("")}
          </div>

          <form class="hs-chat-form" data-hs-form="send-message"
            data-chat-id="${esc(chat.id)}">
            <input class="form-input" name="message"
              placeholder="सन्देश लेख्नुहोस्..." required maxlength="2000">
            <button class="btn btn-primary" type="submit">पठाउनुहोस्</button>
          </form>
        </section>
      `;
    }
  };

  document.addEventListener("submit", (event) => {
    const form = event.target.closest('[data-hs-form="send-message"]');
    if (!form) return;

    event.preventDefault();
    const text = new FormData(form).get("message");
    const chatId = form.dataset.chatId;

    if (global.HamroData.sendMessage(chatId, text)) {
      global.HamroApp?.openChat(chatId);
    }
  });
})(window);
