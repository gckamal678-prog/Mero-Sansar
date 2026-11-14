
"use strict";

/*
 * MERO SANSAR — SUPABASE REACTIONS
 *
 * POST REACTIONS:
 * - Supabase database persistence
 * - Add, change and remove reactions
 * - Live reaction counts
 * - Current user's reaction state
 * - Realtime updates from other users
 *
 * COMMENT REACTIONS:
 * - Disabled until comment reaction database is ready
 *
 * DATA SOURCE: Supabase only
 */

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

  const TABLE = "post_reactions";
  const ANIMATION_STYLE_ID = "ksk-like-animation-style";
  const REALTIME_CHANNEL = "ksk-post-reactions-live";

  let activePicker = null;
  let activeTriggerButton = null;
  let activeRequest = 0;

  let realtimeChannel = null;
  let realtimeClient = null;
  let realtimeUserId = "";
  let realtimeStarting = false;

  const pendingPostUpdates = new Map();

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function showMessage(message, type = "error") {
    if (typeof global.KSKToast?.show === "function") {
      global.KSKToast.show(message, type);
      return;
    }

    console.warn(message);
  }

  /* =========================================
     SUPABASE CONTEXT
  ========================================= */

  async function getSupabaseContext() {
    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      throw new Error("Supabase Authentication उपलब्ध छैन।");
    }

    if (typeof auth.initialize === "function") {
      const initialized = await auth.initialize();

      if (!initialized) {
        throw new Error("Supabase Authentication सुरु हुन सकेन।");
      }
    }

    if (!auth.isAuthenticated?.()) {
      throw new Error("Reaction गर्न Login गर्नुहोस्।");
    }

    const client = auth.getClient?.();
    const user = auth.getUser?.();

    if (!client || !user?.id) {
      throw new Error("Supabase User उपलब्ध छैन।");
    }

    return { client, user };
  }

  /* =========================================
     CLOUD POSTS
  ========================================= */

  function getPost(postId) {
    const posts = global.KSKHomePage?.getPosts?.();

    if (!Array.isArray(posts)) return null;

    return posts.find(post =>
      String(post?.id || "") === String(postId || "")
    ) || null;
  }

  function updatePostReactionState(postId, rows, userId) {
    const post = getPost(postId);

    if (!post) return false;

    const counts = {};
    let myReaction = "";

    (Array.isArray(rows) ? rows : []).forEach(row => {
      const emoji = String(row?.emoji || "");

      if (!REACTIONS.some(item => item.emoji === emoji)) {
        return;
      }

      counts[emoji] = (counts[emoji] || 0) + 1;

      if (String(row?.user_id || "") === String(userId)) {
        myReaction = emoji;
      }
    });

    post.reactionCounts = counts;
    post.myReaction = myReaction;
    post.liked = Boolean(myReaction);

    post.likes = Object.values(counts).reduce(
      (total, count) => total + count,
      0
    );

    return true;
  }

  async function loadPostReactions(postId) {
    const { client, user } = await getSupabaseContext();

    const { data, error } = await client
      .from(TABLE)
      .select("user_id, emoji")
      .eq("post_id", postId);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];

    updatePostReactionState(postId, rows, user.id);

    return {
      rows,
      myReaction: rows.find(row =>
        String(row.user_id) === String(user.id)
      )?.emoji || "",
      likes: rows.length
    };
  }

  /* =========================================
     REFRESH UI
  ========================================= */

  function refreshFeed() {
    if (typeof global.KSKHomePage?.renderFeed === "function") {
      global.KSKHomePage.renderFeed();
      return true;
    }

    if (typeof global.KSKApp?.refreshCurrentPage === "function") {
      global.KSKApp.refreshCurrentPage();
      return true;
    }

    return false;
  }

  /* =========================================
     REALTIME REACTION UPDATES
  ========================================= */

  async function syncRealtimePost(postId) {
    const id = String(postId || "");

    if (!id) return false;

    // एउटै पोस्टका लगातार Realtime घटनालाई क्रमबद्ध गर्ने।
    const previous = pendingPostUpdates.get(id) || Promise.resolve();

    const current = previous
      .catch(() => {})
      .then(async () => {
        try {
          await loadPostReactions(id);

          if (getPost(id)) {
            refreshFeed();
          }

          return true;

        } catch (error) {
          console.warn(
            "Realtime reaction refresh failed:",
            error
          );

          return false;
        }
      });

    pendingPostUpdates.set(id, current);

    try {
      return await current;
    } finally {
      if (pendingPostUpdates.get(id) === current) {
        pendingPostUpdates.delete(id);
      }
    }
  }

  async function stopRealtime() {
    const oldChannel = realtimeChannel;
    const oldClient = realtimeClient;

    realtimeChannel = null;
    realtimeClient = null;
    realtimeUserId = "";

    if (oldChannel && oldClient?.removeChannel) {
      try {
        await oldClient.removeChannel(oldChannel);
      } catch (error) {
        console.warn(
          "Reaction Realtime cleanup failed:",
          error
        );
      }
    }

    return true;
  }

  async function startRealtime() {
    if (realtimeStarting) return false;

    realtimeStarting = true;

    try {
      const { client, user } = await getSupabaseContext();

      if (
        realtimeChannel &&
        realtimeClient === client &&
        realtimeUserId === user.id
      ) {
        return true;
      }

      await stopRealtime();

      const channel = client
        .channel(REALTIME_CHANNEL)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLE
          },
          payload => {
            const postId =
              payload?.new?.post_id ||
              payload?.old?.post_id ||
              "";

            if (postId) {
              syncRealtimePost(postId);
            }
          }
        );

      realtimeChannel = channel;
      realtimeClient = client;
      realtimeUserId = user.id;

      await channel.subscribe(status => {
        if (status === "SUBSCRIBED") {
          console.info("Reaction Realtime connected.");
        }

        if (status === "CHANNEL_ERROR") {
          console.warn("Reaction Realtime channel error.");
        }

        if (status === "TIMED_OUT") {
          console.warn("Reaction Realtime connection timed out.");
        }

        if (status === "CLOSED") {
          console.warn("Reaction Realtime channel closed.");
        }
      });

      return true;

    } catch (error) {
      console.warn(
        "Reaction Realtime could not start:",
        error
      );

      await stopRealtime();

      return false;

    } finally {
      realtimeStarting = false;
    }
  }

  /* =========================================
     EMOJI ANIMATION
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
        filter: drop-shadow(0 3px 5px rgba(0,0,0,0.2));
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

    animation.style.left =
      `${rect.left + rect.width / 2}px`;

    animation.style.top =
      `${rect.top + rect.height / 2}px`;

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
    activeRequest += 1;

    if (activePicker) {
      activePicker.remove();
    }

    activePicker = null;
    activeTriggerButton = null;

    return true;
  }

  function renderPicker(postId, currentReaction = "") {
    closePicker();

    const picker = document.createElement("div");

    picker.className = "ksk-reaction-picker";
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "पोस्ट Reaction छान्नुहोस्");

    picker.dataset.contextType = "post";
    picker.dataset.postId = postId;

    picker.innerHTML = REACTIONS.map(item => {
      const selected = currentReaction === item.emoji;

      return `
        <button
          type="button"
          class="ksk-reaction-option ${selected ? "is-selected" : ""}"
          data-ksk-reaction="${escapeHTML(item.emoji)}"
          aria-label="${escapeHTML(item.label)}"
          aria-pressed="${selected}"
          title="${escapeHTML(item.label)}"
        >${item.emoji}</button>
      `;
    }).join("");

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
        global.innerWidth - width - 10
      )
    );

    const top = Math.max(
      10,
      rect.top - picker.offsetHeight - 9
    );

    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  }

  async function openPicker(button) {
    const postId = button?.dataset?.postId;

    if (!postId) return false;

    const post = getPost(postId);

    if (!post) {
      showMessage("पोस्ट उपलब्ध छैन।");
      return false;
    }

    closePicker();

    const currentRequest = activeRequest;

    try {
      await loadPostReactions(postId);

      if (currentRequest !== activeRequest) {
        return false;
      }

      const picker = renderPicker(
        postId,
        post.myReaction || ""
      );

      activeTriggerButton = button;

      positionPicker(button, picker);

      return true;

    } catch (error) {
      console.error("Reaction load failed:", error);

      showMessage(
        error?.message || "Reaction लोड गर्न सकिएन।"
      );

      return false;
    }
  }

  /* =========================================
     SAVE POST REACTION
  ========================================= */

  async function selectReaction(postId, emoji) {
    const post = getPost(postId);

    if (!post) {
      showMessage("पोस्ट उपलब्ध छैन।");
      return false;
    }

    const valid = REACTIONS.some(
      item => item.emoji === emoji
    );

    if (!valid) return false;

    try {
      const { client, user } = await getSupabaseContext();

      const { data: existing, error: readError } = await client
        .from(TABLE)
        .select("id, emoji")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (readError) throw readError;

      if (existing?.emoji === emoji) {
        const { error } = await client
          .from(TABLE)
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;

      } else {
        const { error } = await client
          .from(TABLE)
          .upsert(
            {
              post_id: postId,
              user_id: user.id,
              emoji,
              updated_at: new Date().toISOString()
            },
            {
              onConflict: "post_id,user_id"
            }
          );

        if (error) throw error;
      }

      // Database बाट वास्तविक अवस्था पुनः लोड गर्ने।
      await loadPostReactions(postId);

      return true;

    } catch (error) {
      console.error("Reaction save failed:", error);

      showMessage(
        error?.message || "Reaction सुरक्षित गर्न सकिएन।"
      );

      return false;
    }
  }

  /* =========================================
     COMMENT REACTION
  ========================================= */

  async function selectCommentReaction(
    postId,
    commentId,
    emoji
  ) {
    showMessage(
      "Comment Reaction सुविधा अझै तयार भएको छैन।"
    );

    return false;
  }

  /* =========================================
     HANDLE REACTION SELECTION
  ========================================= */

  async function handleReactionSelection(option) {
    if (!activePicker || !activePicker.contains(option)) {
      return false;
    }

    const postId = activePicker.dataset.postId;
    const emoji = option.dataset.kskReaction;
    const triggerButton = activeTriggerButton;

    const animationRect =
      triggerButton?.getBoundingClientRect?.() || null;

    const post = getPost(postId);
    const previousReaction = post?.myReaction || "";

    activePicker
      .querySelectorAll("button")
      .forEach(button => {
        button.disabled = true;
      });

    const success = await selectReaction(postId, emoji);

    closePicker();

    if (!success) return false;

    if (
      previousReaction !== emoji &&
      animationRect
    ) {
      showLikeAnimationAt(animationRect, emoji);
    }

    refreshFeed();

    return true;
  }

  /* =========================================
     DOCUMENT EVENTS
  ========================================= */

  function onDocumentClick(event) {
    const target = event.target;

    if (!target?.closest) return;

    const option = target.closest("[data-ksk-reaction]");

    if (option && activePicker?.contains(option)) {
      event.preventDefault();
      event.stopImmediatePropagation();

      handleReactionSelection(option);
      return;
    }

    const commentReactionButton = target.closest(
      "[data-comment-reaction]"
    );

    if (commentReactionButton) {
      event.preventDefault();
      event.stopImmediatePropagation();

      showMessage(
        "Comment Reaction सुविधा अझै तयार भएको छैन।"
      );

      return;
    }

    const postReactionButton = target.closest(
      '[data-post-action="like"]'
    );

    if (postReactionButton) {
      event.preventDefault();
      event.stopImmediatePropagation();

      openPicker(postReactionButton);
      return;
    }

    if (
      activePicker &&
      !activePicker.contains(target)
    ) {
      closePicker();
    }
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      closePicker();
    }
  }

  /* =========================================
     AUTH EVENTS
  ========================================= */

  function onAuthChange(event) {
    const user = event.detail?.user;

    if (!user?.id) {
      stopRealtime();
      closePicker();
      return;
    }

    startRealtime();
  }

  function onAuthReady(event) {
    const user = event.detail?.user;

    if (user?.id) {
      startRealtime();
    } else {
      stopRealtime();
    }
  }

  /* =========================================
     INITIALIZATION
  ========================================= */

  function initialize() {
    document.removeEventListener(
      "click",
      onDocumentClick,
      true
    );

    document.addEventListener(
      "click",
      onDocumentClick,
      true
    );

    document.removeEventListener(
      "keydown",
      onKeyDown
    );

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    global.removeEventListener(
      "resize",
      closePicker
    );

    global.addEventListener(
      "resize",
      closePicker
    );

    global.removeEventListener(
      "scroll",
      closePicker,
      true
    );

    global.addEventListener(
      "scroll",
      closePicker,
      true
    );

    global.removeEventListener(
      "ksk:auth-change",
      onAuthChange
    );

    global.addEventListener(
      "ksk:auth-change",
      onAuthChange
    );

    global.removeEventListener(
      "ksk:auth-ready",
      onAuthReady
    );

    global.addEventListener(
      "ksk:auth-ready",
      onAuthReady
    );

    // पेज खुलिसकेपछि पनि Login अवस्था जाँच्ने।
    startRealtime();

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

    global.removeEventListener(
      "resize",
      closePicker
    );

    global.removeEventListener(
      "scroll",
      closePicker,
      true
    );

    global.removeEventListener(
      "ksk:auth-change",
      onAuthChange
    );

    global.removeEventListener(
      "ksk:auth-ready",
      onAuthReady
    );

    closePicker();
    stopRealtime();

    return true;
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  global.KSKReactions = Object.freeze({
    initialize,
    destroy,
    closePicker,

    selectReaction,
    selectCommentReaction,

    showLikeAnimation,

    loadPostReactions,

    startRealtime,
    stopRealtime,

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

  console.info(
    "KSK Supabase Reactions loaded."
  );

})(window);
