
"use strict";

/* =========================================================
   KSK REACTIONS
   Responsibility:
   - Facebook-style post reaction picker
   - Select, change and remove reactions
   - Persist reactions through KSKData

   Does NOT:
   - Own post data
   - Own the feed renderer
   - Manage comments
========================================================= */

(function (global) {
  "use strict";

  if (global.KSKReactions) return;

  const REACTIONS = [
    { emoji: "🌹", label: "Rose" },
    { emoji: "😘", label: "Love" },
    { emoji: "😢", label: "Sad" },
    { emoji: "😠", label: "Angry" },
    { emoji: "🤓", label: "Smart" }
  ];

  let activePicker = null;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function getPost(id) {
    return global.KSKData?.getPost?.(id) || null;
  }

  function closePicker() {
    if (!activePicker) return;

    activePicker.remove();
    activePicker = null;
  }

  function renderPicker(postId, currentReaction = "") {
    closePicker();

    const picker = document.createElement("div");

    picker.className = "ksk-reaction-picker";
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "पोस्ट Reaction छान्नुहोस्");
    picker.dataset.postId = postId;

    picker.innerHTML = REACTIONS.map(item => `
      <button
        type="button"
        class="ksk-reaction-option ${
          currentReaction === item.emoji ? "is-selected" : ""
        }"
        data-ksk-reaction="${escapeHTML(item.emoji)}"
        aria-label="${escapeHTML(item.label)}"
        aria-pressed="${currentReaction === item.emoji}"
        title="${escapeHTML(item.label)}"
      >${item.emoji}</button>
    `).join("");

    document.body.appendChild(picker);

    activePicker = picker;

    return picker;
  }

  function positionPicker(button, picker) {
    const rect = button.getBoundingClientRect();
    const width = picker.offsetWidth || 250;

    const left = Math.max(
      10,
      Math.min(
        rect.left + rect.width / 2 - width / 2,
        window.innerWidth - width - 10
      )
    );

    const top = Math.max(
      10,
      rect.top - picker.offsetHeight - 9
    );

    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  }

  function openPicker(button) {
    const postId = button.dataset.postId;

    if (!postId) return;

    const post = getPost(postId);

    if (!post) return;

    const picker = renderPicker(
      postId,
      post.myReaction || ""
    );

    positionPicker(button, picker);
  }

  function selectReaction(postId, emoji) {
    const post = getPost(postId);

    if (!post) return false;

    const valid = REACTIONS.some(
      item => item.emoji === emoji
    );

    if (!valid) return false;

    const current = post.myReaction || "";

    const counts = {
      ...(post.reactionCounts || {})
    };

    let likes = Math.max(
      0,
      Number(post.likes || 0)
    );

    // Same reaction selected again: remove it.
    if (current === emoji) {
      counts[emoji] = Math.max(
        0,
        Number(counts[emoji] || 0) - 1
      );

      likes = Math.max(0, likes - 1);

      return Boolean(
        global.KSKData.updatePost(postId, {
          myReaction: "",
          reactionCounts: counts,
          liked: false,
          likes
        })
      );
    }

    // New reaction or changing an existing reaction.
    if (current) {
      counts[current] = Math.max(
        0,
        Number(counts[current] || 0) - 1
      );
    } else if (!post.liked) {
      // Do not increase likes again for legacy liked posts.
      likes += 1;
    }

    counts[emoji] = Number(counts[emoji] || 0) + 1;

    return Boolean(
      global.KSKData.updatePost(postId, {
        myReaction: emoji,
        reactionCounts: counts,
        liked: true,
        likes
      })
    );
  }

  function refreshFeed() {
    global.KSKApp?.refreshCurrentPage?.();
  }

  function onDocumentClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const reactionButton = target.closest(
      '[data-post-action="like"]'
    );

    if (reactionButton) {
      event.preventDefault();
      event.stopImmediatePropagation();

      openPicker(reactionButton);
      return;
    }

    const option = target.closest(
      "[data-ksk-reaction]"
    );

    if (option && activePicker?.contains(option)) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const postId = activePicker.dataset.postId;
      const emoji = option.dataset.kskReaction;

      const success = selectReaction(postId, emoji);

      closePicker();

      if (success) refreshFeed();

      return;
    }

    if (activePicker && !activePicker.contains(target)) {
      closePicker();
    }
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      closePicker();
    }
  }

  function initialize() {
    document.addEventListener(
      "click",
      onDocumentClick,
      true
    );

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    window.addEventListener(
      "resize",
      closePicker
    );

    window.addEventListener(
      "scroll",
      closePicker,
      true
    );

    return true;
  }

  function destroy() {
    document.removeEventListener(
      "click",
      onDocumentClick,
      true
    );

    document.removeEventListener(
      "keydown",
      onKeyDown
    );

    window.removeEventListener(
      "resize",
      closePicker
    );

    window.removeEventListener(
      "scroll",
      closePicker,
      true
    );

    closePicker();
  }

  global.KSKReactions = Object.freeze({
    initialize,
    destroy,
    closePicker,
    selectReaction,

    getReactions() {
      return REACTIONS.slice();
    }
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
