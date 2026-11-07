
"use strict";

/*
 * KSK COMMENTS MODULE
 * Facebook-style Comments, Replies and Mentions
 *
 * Dependencies:
 * core/data.js
 * core/modal.js
 * core/reactions.js
 *
 * Public API:
 * KSKComments.open(postId)
 * KSKComments.refresh()
 * KSKComments.close()
 */

(function (global) {
  const MAX_COMMENT_LENGTH = 3000;

  let activePostId = null;
  let activeModal = null;
  let replyTarget = null;
  let editTarget = null;
  let deletingComment = false;

  // Prevent duplicate event listeners on the same modal body.
  const boundBodies = new WeakSet();

  /* =========================================
     HELPERS
  ========================================= */

  function data() {
    return global.KSKData;
  }

  function escapeHTML(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function text(value, limit = 3000) {
    return String(value ?? "").trim().slice(0, limit);
  }

  function isEnglish() {
    const language = global.KSKLanguage;

    if (typeof language?.getLanguage === "function") {
      return language.getLanguage() === "en";
    }

    return document.documentElement.lang === "en";
  }

  function t(nepali, english) {
    return isEnglish() ? english : nepali;
  }

  function toast(message, type = "info") {
    if (global.KSKToast?.show) {
      global.KSKToast.show(message, type);
    }
  }

  function profile() {
    return data()?.getProfile?.() || {};
  }

  function currentUser() {
    const user = profile();
    const name = text(user.name || "सदस्य", 60);

    return {
      id: text(user.id || user.userId || "", 120),
      name,
      avatar: text(user.avatar || "", 200000),
      initial: name.charAt(0) || "स"
    };
  }

  function friends() {
    return data()?.getFriends?.() || [];
  }

  function makeId() {
    return data()?.makeId?.("mention") ||
      `mention_${Date.now()}`;
  }

  function formatDate(date) {
    if (!date) return "";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return "";

    return new Intl.DateTimeFormat(
      isEnglish() ? "en-IN" : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    ).format(value);
  }

  function getComments() {
    return data()?.getComments?.(activePostId) || [];
  }

  function getComment(id) {
    return data()?.getComment?.(activePostId, id) || null;
  }

  function getAvatarHTML(author, avatar, initial) {
    if (avatar) {
      return `
        <img
          class="ksk-comment-avatar"
          src="${escapeHTML(avatar)}"
          alt="${escapeHTML(author)}"
          loading="lazy"
        >
      `;
    }

    return `
      <span
        class="ksk-comment-avatar ksk-comment-avatar-fallback"
        aria-label="${escapeHTML(author)}"
      >
        ${escapeHTML(initial || author?.charAt(0) || "स")}
      </span>
    `;
  }

  function getAuthor(comment) {
    return escapeHTML(comment.author || "सदस्य");
  }

  function getMentionedFriends(commentText) {
    const availableFriends = friends();
    const found = [];

    availableFriends.forEach(friend => {
      const name = text(friend.name, 60);

      if (!name) return;

      const escaped = name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(
        `(^|\\s)@${escaped}(?=\\s|$|[.,!?])`,
        "i"
      );

      if (regex.test(commentText)) {
        found.push({
          id: String(friend.id || ""),
          name
        });
      }
    });

    return found;
  }

  /* =========================================
     MENTION RENDERING
  ========================================= */

  function renderMentionText(value) {
    const safe = escapeHTML(value || "");
    const availableFriends = friends();

    if (!availableFriends.length) {
      return safe.replace(/\n/g, "<br>");
    }

    let output = safe;

    availableFriends.forEach(friend => {
      const name = text(friend.name, 60);

      if (!name) return;

      const escapedName = name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(
        `(^|\\s)(@${escapedName})(?=\\s|$|[.,!?])`,
        "gi"
      );

      output = output.replace(
        regex,
        '$1<span class="ksk-comment-mention">$2</span>'
      );
    });

    return output.replace(/\n/g, "<br>");
  }

  function renderMentionSuggestions(query) {
    const list = friends();
    const search = text(query, 60).toLowerCase();

    const matches = list.filter(friend =>
      text(friend.name, 60)
        .toLowerCase()
        .includes(search)
    ).slice(0, 6);

    if (!matches.length) {
      return `
        <div class="ksk-mention-empty">
          ${t("साथी भेटिएन।", "No friends found.")}
        </div>
      `;
    }

    return matches.map(friend => `
      <button
        type="button"
        class="ksk-mention-option"
        data-mention-id="${escapeHTML(friend.id || "")}"
        data-mention-name="${escapeHTML(friend.name)}"
      >
        ${getAvatarHTML(
          friend.name,
          friend.avatar,
          friend.name?.charAt(0)
        )}

        <span>${escapeHTML(friend.name)}</span>
      </button>
    `).join("");
  }

  /* =========================================
     COMMENT TREE
  ========================================= */

  function renderComment(comment, allComments, depth = 0) {
    const id = escapeHTML(comment.id);
    const postId = escapeHTML(activePostId);

    const children = allComments.filter(
      item =>
        String(item.parentId || "") === String(comment.id)
    );

    const user = currentUser();

    const isMine =
      (comment.authorId && user.id &&
        String(comment.authorId) === String(user.id)) ||
      (
        !comment.authorId &&
        String(comment.author || "") === user.name
      );

    const replyLabel = comment.replyTo
      ? `<span class="ksk-comment-reply-to">
           ${t("जवाफ दिँदै", "replying to")}
           @${escapeHTML(comment.replyTo)}
         </span>`
      : "";

    const currentReaction = REACTION_EMOJI(
      comment.myReaction
    );

    return `
      <article
        class="ksk-comment"
        data-comment-id="${id}"
        style="--comment-depth:${Math.min(depth, 3)}"
      >

        <div class="ksk-comment-main">

          ${getAvatarHTML(
            comment.author,
            comment.avatar,
            comment.authorInitial
          )}

          <div class="ksk-comment-body">

            <div class="ksk-comment-bubble">

              <strong class="ksk-comment-author">
                ${getAuthor(comment)}
              </strong>

              ${replyLabel}

              <div class="ksk-comment-text">
                ${renderMentionText(comment.text)}
              </div>

            </div>

            <div class="ksk-comment-meta">

              <span class="ksk-comment-time">
                ${escapeHTML(formatDate(comment.createdAt))}
                ${comment.editedAt
                  ? ` · ${t("सम्पादन गरिएको", "Edited")}`
                  : ""}
              </span>

              <button
                type="button"
                class="ksk-comment-action ${comment.liked ? "is-liked" : ""}"
                data-comment-like="${id}"
              >
                ${comment.liked ? "❤️" : "♡"}
                ${Number(comment.likes || 0)}
              </button>

              <button
                type="button"
                class="ksk-comment-action ksk-comment-reaction-button"
                data-comment-reaction
                data-post-id="${postId}"
                data-comment-id="${id}"
                aria-label="${t("टिप्पणीमा Reaction दिनुहोस्", "React to comment")}"
                title="${t("Reaction छान्नुहोस्", "Choose reaction")}"
              >
                ${currentReaction || "☺️"}
              </button>

              <button
                type="button"
                class="ksk-comment-action"
                data-comment-reply="${id}"
              >
                ${t("जवाफ", "Reply")}
              </button>

              ${isMine ? `
                <button
                  type="button"
                  class="ksk-comment-action"
                  data-comment-edit="${id}"
                >
                  ${t("सम्पादन", "Edit")}
                </button>

                <button
                  type="button"
                  class="ksk-comment-action ksk-comment-delete"
                  data-comment-delete="${id}"
                >
                  ${t("मेटाउनुहोस्", "Delete")}
                </button>
              ` : ""}

            </div>

            ${children.length ? `
              <div class="ksk-comment-replies">
                ${children.map(child =>
                  renderComment(child, allComments, depth + 1)
                ).join("")}
              </div>
            ` : ""}

          </div>

        </div>

      </article>
    `;
  }

  function REACTION_EMOJI(value) {
    const allowed = [
      "🌹",
      "😘",
      "😢",
      "😠",
      "🤓"
    ];

    return allowed.includes(value) ? value : "";
  }

  function renderCommentList() {
    const comments = getComments();

    const rootComments = comments.filter(
      comment => !comment.parentId
    );

    if (!rootComments.length) {
      return `
        <div class="ksk-comments-empty">
          <div>💬</div>
          <p>
            ${t(
              "अहिलेसम्म कुनै टिप्पणी छैन। पहिलो टिप्पणी गर्नुहोस्!",
              "No comments yet. Be the first to comment!"
            )}
          </p>
        </div>
      `;
    }

    return rootComments.map(comment =>
      renderComment(comment, comments)
    ).join("");
  }

  /* =========================================
     COMPOSER
  ========================================= */

  function renderComposer() {
    const editing = Boolean(editTarget);

    const target = replyTarget
      ? getComment(replyTarget)
      : null;

    return `
      <section class="ksk-comment-composer">

        ${target ? `
          <div class="ksk-reply-indicator">
            <span>
              ${t("जवाफ दिँदै:", "Replying to:")}
              <strong>${getAuthor(target)}</strong>
            </span>

            <button
              type="button"
              data-cancel-reply
              aria-label="${t("जवाफ रद्द", "Cancel reply")}"
            >×</button>
          </div>
        ` : ""}

        ${editing ? `
          <div class="ksk-reply-indicator">
            <span>${t("टिप्पणी सम्पादन गर्दै", "Editing comment")}</span>

            <button
              type="button"
              data-cancel-edit
            >×</button>
          </div>
        ` : ""}

        <form class="ksk-comment-form" data-comment-form>

          <textarea
            class="ksk-comment-input"
            data-comment-input
            rows="2"
            maxlength="${MAX_COMMENT_LENGTH}"
            placeholder="${escapeHTML(
              editing
                ? t("टिप्पणी परिवर्तन गर्नुहोस्...", "Edit your comment...")
                : t("टिप्पणी लेख्नुहोस्... @ टाइप गरेर साथी Tag गर्नुहोस्", "Write a comment... Type @ to mention a friend")
            )}"
            required>${editing
              ? escapeHTML(getComment(editTarget)?.text || "")
              : ""
            }</textarea>

          <div
            class="ksk-mention-suggestions hidden"
            data-mention-suggestions
          ></div>

          <div class="ksk-comment-composer-footer">

            <span class="ksk-comment-hint">
              ${t("@ टाइप गर्दा साथीहरू देखिन्छन्", "Type @ to mention friends")}
            </span>

            <button
              type="submit"
              class="btn btn-primary"
              data-comment-submit
            >
              ${editing
                ? t("अपडेट", "Update")
                : t("प्रकाशित", "Comment")
              }
            </button>

          </div>

        </form>

      </section>
    `;
  }

  /* =========================================
     MODAL CONTENT
  ========================================= */

  function renderModal() {
    if (!activeModal?.element) return;

    const body = activeModal.element.querySelector(
      "[data-modal-body]"
    );

    if (!body) return;

    body.innerHTML = `
      <div class="ksk-comments-panel">

        <div class="ksk-comments-list" data-comments-list>
          ${renderCommentList()}
        </div>

        ${renderComposer()}

      </div>
    `;

    // Do not bind listeners here.
    // The modal body is the same DOM element after every render.
    // Binding here repeatedly causes duplicate listeners and UI lag.
  }

  /* =========================================
     MENTION INPUT EVENTS
  ========================================= */

  function updateMentionSuggestions(input) {
    const container = activeModal?.element?.querySelector(
      "[data-mention-suggestions]"
    );

    if (!container) return;

    const cursor = input.selectionStart;
    const beforeCursor = input.value.slice(0, cursor);

    const match = beforeCursor.match(
      /(?:^|\s)@([^\s@]*)$/
    );

    if (!match) {
      container.classList.add("hidden");
      container.innerHTML = "";
      return;
    }

    const query = match[1] || "";

    container.innerHTML = renderMentionSuggestions(query);
    container.classList.remove("hidden");
  }

  function insertMention(name) {
    const input = activeModal?.element?.querySelector(
      "[data-comment-input]"
    );

    if (!input) return;

    const cursor = input.selectionStart;
    const before = input.value.slice(0, cursor);
    const after = input.value.slice(cursor);

    const match = before.match(
      /(?:^|\s)@([^\s@]*)$/
    );

    if (!match) return;

    const start = before.length - match[0].length;
    const prefix = before.slice(0, start);

    const insertion =
      `${match[0].startsWith(" ") ? " " : ""}@${name} `;

    input.value = prefix + insertion + after;

    const nextCursor = (prefix + insertion).length;

    input.focus();
    input.setSelectionRange(nextCursor, nextCursor);

    const suggestions = activeModal.element.querySelector(
      "[data-mention-suggestions]"
    );

    suggestions?.classList.add("hidden");
  }

  /* =========================================
     COMMENT ACTIONS
  ========================================= */

  function setReply(commentId) {
    const comment = getComment(commentId);

    if (!comment) return;

    replyTarget = comment.id;
    editTarget = null;

    renderModal();

    activeModal?.element
      ?.querySelector("[data-comment-input]")
      ?.focus();
  }

  function cancelReply() {
    replyTarget = null;
    renderModal();
  }

  function setEdit(commentId) {
    const comment = getComment(commentId);

    if (!comment) return;

    const user = currentUser();

    const allowed =
      (comment.authorId && user.id &&
        String(comment.authorId) === String(user.id)) ||
      (
        !comment.authorId &&
        String(comment.author || "") === user.name
      );

    if (!allowed) {
      toast(
        t(
          "आफ्नो टिप्पणी मात्र सम्पादन गर्न सकिन्छ।",
          "You can only edit your own comment."
        ),
        "warning"
      );
      return;
    }

    editTarget = comment.id;
    replyTarget = null;

    renderModal();

    activeModal?.element
      ?.querySelector("[data-comment-input]")
      ?.focus();
  }

  function cancelEdit() {
    editTarget = null;
    renderModal();
  }

  function submitComment(event) {
    event.preventDefault();

    const input = activeModal?.element?.querySelector(
      "[data-comment-input]"
    );

    const value = text(input?.value, MAX_COMMENT_LENGTH);

    if (!value) {
      toast(
        t("टिप्पणी लेख्नुहोस्।", "Please write a comment."),
        "warning"
      );
      return;
    }

    if (editTarget) {
      const result = data()?.updateComment?.(
        activePostId,
        editTarget,
        { text: value }
      );

      if (!result) {
        toast(
          t(
            "टिप्पणी परिवर्तन गर्न सकिएन।",
            "Could not update comment."
          ),
          "error"
        );
        return;
      }

      editTarget = null;

      toast(
        t("टिप्पणी परिवर्तन भयो।", "Comment updated."),
        "success"
      );

      renderModal();
      return;
    }

    const user = currentUser();
    const mentions = getMentionedFriends(value);

    const result = data()?.addComment?.(
      activePostId,
      {
        author: user.name,
        authorId: user.id,
        authorInitial: user.initial,
        avatar: user.avatar,
        text: value,
        mentions
      },
      {
        parentId: replyTarget || null,
        replyTo: replyTarget
          ? getComment(replyTarget)?.author || ""
          : ""
      }
    );

    if (!result) {
      toast(
        t(
          "टिप्पणी प्रकाशित गर्न सकिएन।",
          "Could not publish comment."
        ),
        "error"
      );
      return;
    }

    replyTarget = null;

    toast(
      t("टिप्पणी प्रकाशित भयो।", "Comment published."),
      "success"
    );

    renderModal();
  }

  function likeComment(commentId, button) {
    const comment = getComment(commentId);

    const shouldAnimate = Boolean(
      comment && !comment.liked
    );

    const result = data()?.toggleCommentLike?.(
      activePostId,
      commentId
    );

    if (!result) return;

    if (shouldAnimate) {
      global.KSKReactions?.showLikeAnimation?.(
        button,
        "❤️"
      );
    }

    renderModal();
  }

  function removeComment(commentId) {
    if (deletingComment) return;

    const confirmed = global.confirm(
      t(
        "यो टिप्पणी र यसका सबै जवाफ मेटाउने हो?",
        "Delete this comment and all its replies?"
      )
    );

    if (!confirmed) return;

    deletingComment = true;

    try {
      const result = data()?.deleteComment?.(
        activePostId,
        commentId
      );

      if (!result) {
        toast(
          t(
            "टिप्पणी मेटाउन सकिएन।",
            "Could not delete comment."
          ),
          "error"
        );
        return;
      }

      if (String(replyTarget) === String(commentId)) {
        replyTarget = null;
      }

      if (String(editTarget) === String(commentId)) {
        editTarget = null;
      }

      toast(
        t("टिप्पणी मेटाइयो।", "Comment deleted."),
        "success"
      );

      renderModal();

    } catch (error) {
      console.error("KSK comment delete failed:", error);

      toast(
        t(
          "टिप्पणी मेटाउँदा समस्या आयो।",
          "An error occurred while deleting the comment."
        ),
        "error"
      );

    } finally {
      deletingComment = false;
    }
  }

  /* =========================================
     MODAL EVENT BINDING
     Bind exactly once per modal body.
  ========================================= */

  function bindModalEvents() {
    const body = activeModal?.element?.querySelector(
      "[data-modal-body]"
    );

    if (!body || boundBodies.has(body)) return;

    boundBodies.add(body);

    body.addEventListener("submit", event => {
      if (event.target.matches("[data-comment-form]")) {
        submitComment(event);
      }
    });

    body.addEventListener("input", event => {
      if (event.target.matches("[data-comment-input]")) {
        updateMentionSuggestions(event.target);
      }
    });

    body.addEventListener("click", event => {
      const target = event.target.closest("button");

      if (!target || !body.contains(target)) return;

      if (target.hasAttribute("data-mention-id")) {
        insertMention(
          target.getAttribute("data-mention-name")
        );
        return;
      }

      if (target.hasAttribute("data-comment-reply")) {
        setReply(
          target.getAttribute("data-comment-reply")
        );
        return;
      }

      if (target.hasAttribute("data-comment-edit")) {
        setEdit(
          target.getAttribute("data-comment-edit")
        );
        return;
      }

      if (target.hasAttribute("data-comment-delete")) {
        removeComment(
          target.getAttribute("data-comment-delete")
        );
        return;
      }

      if (target.hasAttribute("data-comment-like")) {
        likeComment(
          target.getAttribute("data-comment-like"),
          target
        );
        return;
      }

      if (target.hasAttribute("data-cancel-reply")) {
        cancelReply();
        return;
      }

      if (target.hasAttribute("data-cancel-edit")) {
        cancelEdit();
      }
    });
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  function open(postId) {
    const post = data()?.getPost?.(postId);

    if (!post) {
      toast(
        t("पोस्ट भेटिएन।", "Post not found."),
        "error"
      );
      return false;
    }

    if (!global.KSKModal?.openModal) {
      toast(
        t(
          "Modal सुविधा उपलब्ध छैन।",
          "Modal is unavailable."
        ),
        "error"
      );
      return false;
    }

    activePostId = String(postId);
    replyTarget = null;
    editTarget = null;
    deletingComment = false;

    activeModal = global.KSKModal.openModal({
      title: t("टिप्पणीहरू", "Comments"),
      content: "",
      closeButtonLabel: t("बन्द गर्नुहोस्", "Close")
    });

    if (!activeModal) {
      activePostId = null;
      return false;
    }

    renderModal();

    bindModalEvents();

    return true;
  }

  function refresh() {
    if (!activePostId || !activeModal) return false;

    if (!activeModal.element?.isConnected) {
      close();
      return false;
    }

    renderModal();

    return true;
  }

  function close() {
    if (activeModal) {
      activeModal.close();
    }

    activeModal = null;
    activePostId = null;
    replyTarget = null;
    editTarget = null;
    deletingComment = false;
  }

  global.KSKComments = Object.freeze({
    open,
    refresh,
    close
  });

})(window);
