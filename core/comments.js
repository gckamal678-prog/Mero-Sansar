
"use strict";

/*
 * MERO SANSAR — SUPABASE LIVE COMMENTS
 *
 * Features:
 * - Supabase comments and nested replies
 * - Edit / Delete own comments
 * - Comment likes and emoji reactions
 * - Supabase friends based @mentions
 * - Realtime updates
 * - Automatic feed notification after comment create/delete
 *
 * DATA SOURCE: SUPABASE ONLY
 */

(function (global) {
  "use strict";

  if (global.KSKComments) return;

  const COMMENTS_TABLE = "post_comments";
  const REACTIONS_TABLE = "comment_reactions";
  const MAX_COMMENT_LENGTH = 3000;

  const EMOJIS = ["❤️", "🌹", "😘", "😢", "😠", "🤓"];

  let activePostId = null;
  let activeModal = null;
  let activeChannel = null;

  let comments = [];
  let reactions = [];
  let mentionFriends = [];

  let replyTarget = null;
  let editTarget = null;
  let busy = false;
  let loading = false;

  const boundBodies = new WeakSet();

  /* =========================================
     HELPERS
  ========================================= */

  function t(ne, en) {
    return global.KSKLanguage?.getLanguage?.() === "en"
      ? en
      : ne;
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function cleanText(value, limit = MAX_COMMENT_LENGTH) {
    return String(value ?? "").trim().slice(0, limit);
  }

  function toast(message, type = "info") {
    global.KSKToast?.show?.(message, type);
  }

  /*
   * Notify the home feed after a comment count changes.
   * pages/home.js listens for this event and refreshes
   * the cloud feed without requiring a manual page refresh.
   */
  function notifyFeedCommentChange(action = "comment-change") {
    const postId = String(activePostId || "").trim();

    if (!postId) return false;

    try {
      global.dispatchEvent(
        new CustomEvent("ksk:posts-cloud-change", {
          detail: {
            action,
            postId,
            source: "comments"
          }
        })
      );

      return true;
    } catch (error) {
      console.error("Feed comment notification failed:", error);
      return false;
    }
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(
      global.KSKLanguage?.getLanguage?.() === "en"
        ? "en-IN"
        : "ne-NP",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    ).format(date);
  }

  function getComment(id) {
    return comments.find(item =>
      String(item.id) === String(id)
    ) || null;
  }

  function getMyReaction(commentId) {
    const authUser = global.KSKSupabaseAuth?.getUser?.();

    return reactions.find(item =>
      String(item.comment_id) === String(commentId) &&
      String(item.user_id) === String(authUser?.id || "")
    ) || null;
  }

  function getCommentReactions(commentId) {
    return reactions.filter(item =>
      String(item.comment_id) === String(commentId)
    );
  }

  function getReactionCount(commentId) {
    return getCommentReactions(commentId).filter(item =>
      item.emoji === "❤️"
    ).length;
  }

  function getAvatarHTML(name, avatar, initial) {
    if (avatar) {
      return `
        <img
          class="ksk-comment-avatar"
          src="${escapeHTML(avatar)}"
          alt="${escapeHTML(name)}"
          loading="lazy"
        >
      `;
    }

    return `
      <span class="ksk-comment-avatar ksk-comment-avatar-fallback">
        ${escapeHTML(initial || name?.charAt(0) || "स")}
      </span>
    `;
  }

  /* =========================================
     SUPABASE FRIENDS / MENTIONS
  ========================================= */

  function getFriends() {
    return Array.isArray(mentionFriends)
      ? mentionFriends
      : [];
  }

  async function loadMentionFriends() {
    const friendsAPI = global.KSKSupabaseFriends;

    if (!friendsAPI?.getDashboard) {
      mentionFriends = [];

      console.warn("Supabase Friends API unavailable.");

      return false;
    }

    try {
      const response = await friendsAPI.getDashboard();

      if (!response?.ok) {
        mentionFriends = [];

        console.warn(
          "Mention friends could not load:",
          response?.message || response?.code
        );

        return false;
      }

      const rows = Array.isArray(response.data?.friends)
        ? response.data.friends
        : [];

      mentionFriends = rows
        .map(friend => ({
          id: String(friend.id || friend.userId || ""),
          name: cleanText(friend.name, 60),
          avatar: String(
            friend.avatarUrl || friend.avatar || ""
          ).trim()
        }))
        .filter(friend =>
          friend.id &&
          friend.name
        );

      return true;

    } catch (error) {
      mentionFriends = [];

      console.error("Mention friends loading failed:", error);

      return false;
    }
  }

  function escapeRegExp(value) {
    return String(value).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  }

  function getMentionedFriends(value) {
    const found = [];

    getFriends().forEach(friend => {
      const name = cleanText(friend.name, 60);

      if (!name) return;

      const regex = new RegExp(
        `(^|\\s)@${escapeRegExp(name)}(?=\\s|$|[.,!?])`,
        "i"
      );

      if (regex.test(value)) {
        found.push({
          id: String(friend.id),
          name
        });
      }
    });

    return found;
  }

  function renderMentionText(value) {
    let output = escapeHTML(value || "");

    getFriends().forEach(friend => {
      const name = cleanText(friend.name, 60);

      if (!name) return;

      const regex = new RegExp(
        `(^|\\s)(@${escapeRegExp(name)})(?=\\s|$|[.,!?])`,
        "gi"
      );

      output = output.replace(
        regex,
        '$1<span class="ksk-comment-mention">$2</span>'
      );
    });

    return output.replace(/\n/g, "<br>");
  }

  function getAuthor(comment) {
    return escapeHTML(comment.author || "सदस्य");
  }

  function isMine(comment) {
    const user = global.KSKSupabaseAuth?.getUser?.();

    return Boolean(
      user?.id &&
      String(comment.authorId) === String(user.id)
    );
  }

  /* =========================================
     SUPABASE CONTEXT
  ========================================= */

  async function getContext() {
    const auth = global.KSKSupabaseAuth;

    if (!auth) {
      throw new Error("Supabase Authentication उपलब्ध छैन।");
    }

    const initialized = await auth.initialize();

    if (!initialized || !auth.isAuthenticated()) {
      throw new Error("पहिले आफ्नो खातामा Login गर्नुहोस्।");
    }

    const client = auth.getClient();
    const user = auth.getUser();

    if (!client || !user?.id) {
      throw new Error("Login User प्राप्त भएन।");
    }

    return { client, user };
  }

  async function getAuthorProfile() {
    const profileAPI = global.KSKSupabaseProfile;

    if (!profileAPI?.getMyProfile) {
      throw new Error("Supabase Profile सेवा उपलब्ध छैन।");
    }

    const profile = await profileAPI.getMyProfile();

    if (!profile) {
      throw new Error("आफ्नो Profile प्राप्त गर्न सकिएन।");
    }

    const name = cleanText(profile.name, 120);

    if (!name) {
      throw new Error("आफ्नो Profile मा नाम राख्नुहोस्।");
    }

    return {
      name,
      avatar: String(profile.avatar || "").trim()
    };
  }

  /* =========================================
     LOAD COMMENTS AND REACTIONS
  ========================================= */

  async function loadComments() {
    if (!activePostId) return false;

    const { client } = await getContext();

    const { data: commentRows, error: commentError } =
      await client
        .from(COMMENTS_TABLE)
        .select([
          "id",
          "post_id",
          "user_id",
          "parent_id",
          "content",
          "mentions",
          "author_name",
          "author_avatar_url",
          "created_at",
          "updated_at"
        ].join(","))
        .eq("post_id", activePostId)
        .order("created_at", { ascending: true });

    if (commentError) throw commentError;

    const rows = Array.isArray(commentRows)
      ? commentRows
      : [];

    comments = rows.map(row => {
      const parent = rows.find(item =>
        String(item.id) === String(row.parent_id || "")
      );

      return {
        id: row.id,
        postId: row.post_id,
        authorId: row.user_id,
        parentId: row.parent_id || null,
        author: row.author_name || "सदस्य",
        avatar: row.author_avatar_url || "",
        authorInitial: String(
          row.author_name || "स"
        ).charAt(0),
        text: row.content || "",
        mentions: Array.isArray(row.mentions)
          ? row.mentions
          : [],
        replyTo: parent?.author_name || "",
        createdAt: row.created_at,
        editedAt:
          row.updated_at !== row.created_at
            ? row.updated_at
            : ""
      };
    });

    const commentIds = comments.map(item =>
      String(item.id)
    );

    if (!commentIds.length) {
      reactions = [];
      return true;
    }

    const { data: reactionRows, error: reactionError } =
      await client
        .from(REACTIONS_TABLE)
        .select("id,comment_id,user_id,emoji")
        .in("comment_id", commentIds);

    if (reactionError) throw reactionError;

    reactions = Array.isArray(reactionRows)
      ? reactionRows
      : [];

    return true;
  }

  /* =========================================
     COMMENT TREE
  ========================================= */

  function renderComment(comment, childrenByParent, depth = 0) {
    const id = escapeHTML(comment.id);

    const children =
      childrenByParent.get(String(comment.id)) || [];

    const mine = isMine(comment);
    const myReaction = getMyReaction(comment.id);
    const heartCount = getReactionCount(comment.id);

    const emojiOptions = EMOJIS.map(emoji => `
      <button
        type="button"
        data-comment-emoji="${escapeHTML(emoji)}"
        data-comment-id="${id}"
        aria-label="${escapeHTML(emoji)}"
      >${emoji}</button>
    `).join("");

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

              ${comment.replyTo ? `
                <span class="ksk-comment-reply-to">
                  ${t("जवाफ दिँदै", "replying to")}
                  @${escapeHTML(comment.replyTo)}
                </span>
              ` : ""}

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
                class="ksk-comment-action ${myReaction?.emoji === "❤️" ? "is-liked" : ""}"
                data-comment-like="${id}"
              >
                ${myReaction?.emoji === "❤️" ? "❤️" : "♡"}
                ${heartCount}
              </button>

              <button
                type="button"
                class="ksk-comment-action ksk-comment-reaction-button"
                data-comment-reaction-open="${id}"
              >
                ${escapeHTML(myReaction?.emoji || "☺️")}
              </button>

              <div
                class="ksk-comment-reaction-picker hidden"
                data-comment-reaction-picker="${id}"
              >
                ${emojiOptions}
              </div>

              <button
                type="button"
                class="ksk-comment-action"
                data-comment-reply="${id}"
              >
                ${t("जवाफ", "Reply")}
              </button>

              ${mine ? `
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
                  renderComment(
                    child,
                    childrenByParent,
                    depth + 1
                  )
                ).join("")}
              </div>
            ` : ""}

          </div>
        </div>
      </article>
    `;
  }

  function renderCommentList() {
    if (loading) {
      return `
        <div class="ksk-comments-empty">
          ${t("टिप्पणीहरू लोड हुँदैछन्...", "Loading comments...")}
        </div>
      `;
    }

    if (!comments.length) {
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

    const childrenByParent = new Map();
    const roots = [];

    comments.forEach(comment => {
      const parentId = String(comment.parentId || "");

      if (!parentId) {
        roots.push(comment);
        return;
      }

      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }

      childrenByParent.get(parentId).push(comment);
    });

    return roots.map(comment =>
      renderComment(comment, childrenByParent)
    ).join("");
  }

  /* =========================================
     MENTION SUGGESTIONS
  ========================================= */

  function renderMentionSuggestions(query) {
    const search = cleanText(query, 60).toLowerCase();

    const matches = getFriends().filter(friend =>
      cleanText(friend.name, 60)
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

  function updateMentionSuggestions(input) {
    const container = activeModal?.element?.querySelector(
      "[data-mention-suggestions]"
    );

    if (!container) return;

    const before = input.value.slice(0, input.selectionStart);
    const match = before.match(/(?:^|\s)@([^\s@]*)$/);

    if (!match) {
      container.classList.add("hidden");
      container.innerHTML = "";
      return;
    }

    container.innerHTML = renderMentionSuggestions(match[1] || "");
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

    const match = before.match(/(?:^|\s)@([^\s@]*)$/);

    if (!match) return;

    const start = before.length - match[0].length;
    const prefix = before.slice(0, start);

    const insertion =
      `${match[0].startsWith(" ") ? " " : ""}@${name} `;

    input.value = prefix + insertion + after;

    const nextCursor = (prefix + insertion).length;

    input.focus();
    input.setSelectionRange(nextCursor, nextCursor);

    activeModal.element
      .querySelector("[data-mention-suggestions]")
      ?.classList.add("hidden");
  }

  /* =========================================
     COMPOSER
  ========================================= */

  function renderComposer() {
    const editing = Boolean(editTarget);
    const target = replyTarget ? getComment(replyTarget) : null;
    const edited = editTarget ? getComment(editTarget) : null;

    return `
      <section class="ksk-comment-composer">

        ${target ? `
          <div class="ksk-reply-indicator">
            <span>
              ${t("जवाफ दिँदै:", "Replying to:")}
              <strong>${getAuthor(target)}</strong>
            </span>
            <button type="button" data-cancel-reply>×</button>
          </div>
        ` : ""}

        ${editing ? `
          <div class="ksk-reply-indicator">
            <span>${t("टिप्पणी सम्पादन गर्दै", "Editing comment")}</span>
            <button type="button" data-cancel-edit>×</button>
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
                : t(
                    "टिप्पणी लेख्नुहोस्... @ टाइप गरेर साथी Tag गर्नुहोस्",
                    "Write a comment... Type @ to mention a friend"
                  )
            )}"
            required
          >${editing ? escapeHTML(edited?.text || "") : ""}</textarea>

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
              ${busy ? "disabled" : ""}
            >
              ${busy
                ? t("कृपया पर्खनुहोस्...", "Please wait...")
                : editing
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
     MODAL RENDER
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
  }

  /* =========================================
     REFRESH FROM DATABASE
  ========================================= */

  async function refreshFromDatabase() {
    if (!activePostId || !activeModal) return false;

    try {
      await loadComments();

      if (!activeModal) return false;

      renderModal();
      return true;

    } catch (error) {
      console.error("Comments refresh failed:", error);

      toast(
        t(
          "टिप्पणीहरू लोड गर्न सकिएन।",
          "Could not load comments."
        ),
        "error"
      );

      return false;
    }
  }

  /* =========================================
     REALTIME
  ========================================= */

  async function subscribeRealtime() {
    const { client } = await getContext();

    if (activeChannel) {
      await client.removeChannel(activeChannel);
      activeChannel = null;
    }

    const postId = activePostId;

    activeChannel = client
      .channel(`ksk-comments-${postId}-${Date.now()}`)

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: COMMENTS_TABLE,
          filter: `post_id=eq.${postId}`
        },
        () => {
          if (String(activePostId) === String(postId)) {
            refreshFromDatabase();
            notifyFeedCommentChange("comment-realtime");
          }
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: REACTIONS_TABLE
        },
        () => {
          if (String(activePostId) === String(postId)) {
            refreshFromDatabase();
          }
        }
      )

      .subscribe(status => {
        console.info("Comments realtime status:", status);
      });
  }

  async function stopRealtime() {
    if (!activeChannel) return;

    const channel = activeChannel;
    activeChannel = null;

    try {
      const auth = global.KSKSupabaseAuth;
      const client = auth?.getClient?.();

      if (client) {
        await client.removeChannel(channel);
      }
    } catch (error) {
      console.warn("Comments realtime cleanup failed:", error);
    }
  }

  /* =========================================
     REPLY AND EDIT
  ========================================= */

  function setReply(commentId) {
    if (!getComment(commentId)) return;

    replyTarget = commentId;
    editTarget = null;

    renderModal();

    activeModal?.element
      ?.querySelector("[data-comment-input]")
      ?.focus();
  }

  function setEdit(commentId) {
    const comment = getComment(commentId);

    if (!comment || !isMine(comment)) {
      toast(
        t(
          "आफ्नो टिप्पणी मात्र सम्पादन गर्न सकिन्छ।",
          "You can only edit your own comment."
        ),
        "warning"
      );
      return;
    }

    editTarget = commentId;
    replyTarget = null;

    renderModal();

    activeModal?.element
      ?.querySelector("[data-comment-input]")
      ?.focus();
  }

  /* =========================================
     CREATE / UPDATE COMMENT
  ========================================= */

  async function submitComment(event) {
    event.preventDefault();

    if (busy) return;

    const input = activeModal?.element?.querySelector(
      "[data-comment-input]"
    );

    const value = cleanText(input?.value);

    if (!value) {
      toast(
        t("टिप्पणी लेख्नुहोस्।", "Please write a comment."),
        "warning"
      );
      return;
    }

    busy = true;
    renderModal();

    try {
      const { client, user } = await getContext();

      if (editTarget) {
        const comment = getComment(editTarget);

        if (!comment || !isMine(comment)) {
          throw new Error("आफ्नो टिप्पणी मात्र सम्पादन गर्न सकिन्छ।");
        }

        const { data, error } = await client
          .from(COMMENTS_TABLE)
          .update({
            content: value,
            mentions: getMentionedFriends(value)
          })
          .eq("id", editTarget)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("टिप्पणी अपडेट भएन।");

        editTarget = null;

        toast(
          t("टिप्पणी परिवर्तन भयो।", "Comment updated."),
          "success"
        );

      } else {
        const profile = await getAuthorProfile();

        const payload = {
          post_id: activePostId,
          user_id: user.id,
          parent_id: replyTarget || null,
          content: value,
          mentions: getMentionedFriends(value),
          author_name: profile.name,
          author_avatar_url: profile.avatar || null
        };

        const { error } = await client
          .from(COMMENTS_TABLE)
          .insert(payload);

        if (error) throw error;

        replyTarget = null;

        /*
         * Immediately notify the home feed after the
         * Supabase insert succeeds. The feed listener
         * can now reload the updated comment count.
         */
        notifyFeedCommentChange("comment-created");

        toast(
          t("टिप्पणी प्रकाशित भयो।", "Comment published."),
          "success"
        );
      }

      await refreshFromDatabase();

    } catch (error) {
      console.error("Comment submit failed:", error);

      toast(
        error?.message || t(
          "टिप्पणी प्रकाशित गर्न सकिएन।",
          "Could not publish comment."
        ),
        "error"
      );

    } finally {
      busy = false;
      renderModal();
    }
  }

  /* =========================================
     LIKE / EMOJI REACTION
  ========================================= */

  async function setCommentReaction(commentId, emoji) {
    if (!EMOJIS.includes(emoji)) return false;

    try {
      const { client, user } = await getContext();

      if (!getComment(commentId)) return false;

      const existing = getMyReaction(commentId);

      if (existing?.emoji === emoji) {
        const { error } = await client
          .from(REACTIONS_TABLE)
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        if (error) throw error;

      } else {
        const { error } = await client
          .from(REACTIONS_TABLE)
          .upsert(
            {
              comment_id: commentId,
              user_id: user.id,
              emoji
            },
            {
              onConflict: "comment_id,user_id"
            }
          );

        if (error) throw error;
      }

      await refreshFromDatabase();
      return true;

    } catch (error) {
      console.error("Comment reaction failed:", error);

      toast(
        t(
          "Reaction सुरक्षित गर्न सकिएन।",
          "Could not save reaction."
        ),
        "error"
      );

      return false;
    }
  }

  /* =========================================
     DELETE COMMENT
  ========================================= */

  async function removeComment(commentId) {
    if (busy) return;

    const comment = getComment(commentId);

    if (!comment || !isMine(comment)) {
      toast(
        t(
          "आफ्नो टिप्पणी मात्र मेटाउन सकिन्छ।",
          "You can only delete your own comment."
        ),
        "warning"
      );
      return;
    }

    const confirmed = global.confirm(
      t(
        "यो टिप्पणी र यसका सबै जवाफ मेटाउने हो?",
        "Delete this comment and all its replies?"
      )
    );

    if (!confirmed) return;

    busy = true;

    try {
      const { client, user } = await getContext();

      const { error } = await client
        .from(COMMENTS_TABLE)
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;

      if (String(replyTarget) === String(commentId)) {
        replyTarget = null;
      }

      if (String(editTarget) === String(commentId)) {
        editTarget = null;
      }

      /*
       * Notify the feed immediately after successful
       * deletion so its displayed count can be refreshed.
       */
      notifyFeedCommentChange("comment-deleted");

      toast(
        t("टिप्पणी मेटाइयो।", "Comment deleted."),
        "success"
      );

      await refreshFromDatabase();

    } catch (error) {
      console.error("Comment delete failed:", error);

      toast(
        error?.message || t(
          "टिप्पणी मेटाउन सकिएन।",
          "Could not delete comment."
        ),
        "error"
      );

    } finally {
      busy = false;
      renderModal();
    }
  }

  /* =========================================
     EVENT BINDING
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
        setReply(target.getAttribute("data-comment-reply"));
        return;
      }

      if (target.hasAttribute("data-comment-edit")) {
        setEdit(target.getAttribute("data-comment-edit"));
        return;
      }

      if (target.hasAttribute("data-comment-delete")) {
        removeComment(target.getAttribute("data-comment-delete"));
        return;
      }

      if (target.hasAttribute("data-comment-like")) {
        const id = target.getAttribute("data-comment-like");

        setCommentReaction(id, "❤️");
        return;
      }

      if (target.hasAttribute("data-comment-reaction-open")) {
        const id = target.getAttribute("data-comment-reaction-open");

        const picker = body.querySelector(
          `[data-comment-reaction-picker="${CSS.escape(id)}"]`
        );

        if (picker) {
          picker.classList.toggle("hidden");
        }
        return;
      }

      if (target.hasAttribute("data-comment-emoji")) {
        const id = target.getAttribute("data-comment-id");
        const emoji = target.getAttribute("data-comment-emoji");

        setCommentReaction(id, emoji);
        return;
      }

      if (target.hasAttribute("data-cancel-reply")) {
        replyTarget = null;
        renderModal();
        return;
      }

      if (target.hasAttribute("data-cancel-edit")) {
        editTarget = null;
        renderModal();
      }
    });
  }

  /* =========================================
     PUBLIC API
  ========================================= */

  async function open(postId) {
    const id = String(postId || "").trim();

    if (!id) return false;

    const posts = global.KSKHomePage?.getPosts?.() || [];

    const postExists = posts.some(post =>
      String(post.id) === id
    );

    if (!postExists) {
      toast(
        t("पोस्ट भेटिएन।", "Post not found."),
        "error"
      );
      return false;
    }

    if (!global.KSKModal?.openModal) {
      toast(
        t("Modal सुविधा उपलब्ध छैन।", "Modal is unavailable."),
        "error"
      );
      return false;
    }

    try {
      await getContext();

      await stopRealtime();

      // Cloud friends load for @mentions.
      // Mention loading failure must not block comments.
      mentionFriends = [];
      await loadMentionFriends();

      activePostId = id;
      replyTarget = null;
      editTarget = null;
      comments = [];
      reactions = [];
      loading = true;

      activeModal = global.KSKModal.openModal({
        title: t("टिप्पणीहरू", "Comments"),
        content: "",
        closeButtonLabel: t("बन्द गर्नुहोस्", "Close")
      });

      if (!activeModal) {
        activePostId = null;
        loading = false;
        return false;
      }

      renderModal();
      bindModalEvents();

      await loadComments();

      loading = false;
      renderModal();

      await subscribeRealtime();

      return true;

    } catch (error) {
      console.error("Comments open failed:", error);

      loading = false;

      toast(
        error?.message || t(
          "टिप्पणीहरू खोल्न सकिएन।",
          "Could not open comments."
        ),
        "error"
      );

      return false;
    }
  }

  async function refresh() {
    return await refreshFromDatabase();
  }

  async function close() {
    await stopRealtime();

    if (activeModal) {
      activeModal.close();
    }

    activeModal = null;
    activePostId = null;

    comments = [];
    reactions = [];
    mentionFriends = [];

    replyTarget = null;
    editTarget = null;

    busy = false;
    loading = false;
  }

  global.KSKComments = Object.freeze({
    open,
    refresh,
    close
  });

  console.info("KSK Supabase Live Comments loaded.");

})(window);
