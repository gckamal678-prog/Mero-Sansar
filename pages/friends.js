"use strict";

(function (global) {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  global.HamroPages.register("friends", {
    render() {
      const friends = global.HamroData.getFriends();

      return `
        <section class="hs-page">
          <div class="hs-page-heading">
            <h2>साथीहरू</h2>
            <p>साथी जोड्नुहोस् र कुराकानी सुरु गर्नुहोस्।</p>
          </div>

          <form class="hs-inline-form" data-hs-form="add-friend">
            <input class="form-input" name="friendName"
              placeholder="साथीको नाम लेख्नुहोस्" required maxlength="60">
            <button class="btn btn-primary" type="submit">साथी थप्नुहोस्</button>
          </form>

          <div class="hs-list">
            ${friends.length
              ? friends.map((friend) => global.HamroUserCard.render(friend)).join("")
              : `<div class="empty-state"><p>अहिलेसम्म साथी छैन।</p></div>`}
          </div>
        </section>
      `;
    },

    handle(action, data, root) {
      if (action === "remove-friend") {
        global.HamroData.removeFriend(data.userId);
        global.HamroApp?.refreshPage();
      }

      if (action === "message") {
        const friend = global.HamroData.getFriends()
          .find((item) => item.id === data.userId);
        if (!friend) return;

        const chatId = global.HamroData.createChat(friend);
        global.HamroApp?.openChat(chatId);
      }
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest('[data-hs-form="add-friend"]');
    if (!form) return;

    event.preventDefault();
    const name = new FormData(form).get("friendName");

    if (global.HamroData.addFriend(name)) {
      form.reset();
      global.HamroApp?.refreshPage();
      global.HamroToast?.show("साथी थपियो।");
    } else {
      global.HamroToast?.show("नाम खाली छ वा साथी पहिले नै छ।");
    }
  });
})(window);
