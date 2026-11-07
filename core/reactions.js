
"use strict";

/* =========================================================
   KSK REACTIONS
   Responsibility:
   - Facebook-style post reaction picker
   - Select, change and remove reactions
   - Persist reactions through KSKData
   - Shared like emoji animation for posts and comments
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
  let activeTriggerButton = null;

  const ANIMATION_STYLE_ID = "ksk-like-animation-style";

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

  /* =========================================
     LIKE EMOJI ANIMATION
  ========================================= */

  function installAnimationStyles() {
    if (document.getElementById(ANIMATION_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");

    style.id = ANIMATION_STYLE_ID;

    style.textContent = `
      @keyframes ksk-like-float {
        0% {
          opacity: 0;
          transform: translate(-50%, -20%) scale(0.35) rotate(-15deg);
        }

        20% {
          opacity: 1;
          transform: translate(-50%, -65%) scale(1.3) rotate(8deg);
        }

        45% {
          opacity: 1;
          transform: translate(-50%, -100%) scale(1) rotate(-5deg);
        }

        100% {
          opacity: 0;
          transform: translate(-50%, -190%) scale(0.7) rotate(12deg);
        }
      }

      .ksk-like-animation {
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        font-size: 38px;
        line-height: 1;
        animation: ksk-like-float 850ms ease-out forwards;
        filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2));
        will-change: transform, opacity;
      }

      @media (prefers-reduced-motion: reduce) {
        .ksk-like-animation {
          animation-duration: 1ms;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function showLikeAnimationAt(rect, emoji = "❤️") {
    if (!rect || !document.body) return false;

    installAnimationStyles();

    const animation = document.createElement("span");

    animation.className = "ksk-like-animation";
    animation.textContent = emoji;
    animation.setAttribute("aria-hidden", "true");

    animation.style.left = `${rect.left + rect.width / 2}px`;
    animation.style.top = `${rect.top + rect.height / 2}px`;

    document.body.appendChild(animation);

    global.setTimeout(() => {
      animation.remove();
    }, 950);

    return true;
  }

  function showLikeAnimation(button, emoji = "❤️") {
    if (!button?.getBoundingClientRect) return false;

    return showLikeAnimationAt(
      button.getBoundingClientRect(),
      emoji
    );
  }

  /* =========================================
     PICKER
  ========================================= */

  function closePicker() {
    if (activePicker) {
      activePicker.remove();
    }

    activePicker = null;
    activeTriggerButton = null;
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

    activeTriggerButton = button;

    positionPicker(button, picker);
  }

  /* =========================================
     SAVE REACTION
  ========================================= */

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

    // Changing an existing reaction.
    if (current) {
      counts[current] = Math.max(
        0,
        Number(counts[current] || 0) - 1
      );
    } else if (!post.liked) {
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

  /* =========================================
     EVENTS
  ========================================= */

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

      const triggerButton = activeTriggerButton;
      const post = getPost(postId);

      const previousReaction = post?.myReaction || "";

      const animationRect =
        triggerButton?.getBoundingClientRect?.() || null;

      const success = selectReaction(postId, emoji);

      closePicker();

      if (success) {
        // Do not animate when the user removes a reaction.
        if (previousReaction !== emoji && animationRect) {
          showLikeAnimationAt(animationRect, emoji);
        }

        refreshFeed();
      }

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

  /* =========================================
     INITIALIZATION
  ========================================= */

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

  /* =========================================
     PUBLIC API
  ========================================= */

  global.KSKReactions = Object.freeze({
    initialize,
    destroy,
    closePicker,
    selectReaction,

    // Shared animation API for comments and other UI.
    showLikeAnimation,

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
