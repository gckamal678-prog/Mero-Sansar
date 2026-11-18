"use strict";

/*
 * MERO SANSAR — SUPABASE MESSENGER SERVICE
 * conversations, history, pagination, messages,
 * receipts, groups, preferences, media, search,
 * realtime, typing and presence.
 *
 * Requires:
 *   core/supabase-auth.js
 */

(function (global) {
  "use strict";

  if (global.KSKSupabaseMessages) return;

  const TABLE = {
    conversations: "conversations",
    members: "conversation_members",
    messages: "messages",
    receipts: "message_receipts",
    preferences: "chat_preferences",
    presence: "chat_presence",
    profiles: "profiles"
  };

  const BUCKET = "chat-media";
  const PAGE_SIZE = 50;
  const MAX_MESSAGE = 5000;
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  let realtimeChannel = null;
  let realtimeClient = null;
  let realtimeUserId = "";
  let realtimeStartPromise = null;

  let presenceChannel = null;
  let presenceReady = null;
  let activePresenceConversation = "";
  let globalPresenceChannel = null;
  let globalPresenceClient = null;
  let globalPresenceUserId = "";
  let globalPresenceReady = null;
  let typingTimers = new Map();
  let typingUsers = new Set();
  let lastPresenceWrite = 0;

  function result(ok, code, data = null, message = "") {
    return { ok, code, data, message };
  }

  function getAuth() {
    return global.KSKSupabaseAuth || null;
  }

  function errorMessage(error) {
    return String(
      error?.message ||
      error?.details ||
      "Messenger अनुरोध पूरा हुन सकेन।"
    );
  }

  async function getContext() {
    const auth = getAuth();

    if (!auth?.initialize) {
      throw new Error("Supabase Auth उपलब्ध छैन।");
    }

    const initialized = await auth.initialize();

    if (!initialized || !auth.isAuthenticated?.()) {
      throw new Error("पहिले आफ्नो खातामा लगइन गर्नुहोस्।");
    }

    const client = auth.getClient?.();
    const user = auth.getUser?.();

    if (!client || !user?.id) {
      throw new Error("लगइन Session प्राप्त भएन।");
    }

    return { client, user };
  }

  function notify(action, detail = {}) {
    global.dispatchEvent(new CustomEvent(
      "ksk:messages-cloud-change",
      { detail: { action, ...detail } }
    ));
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function uniqueIds(values) {
    return [...new Set(
      safeArray(values)
        .map(value => String(value || "").trim())
        .filter(Boolean)
    )];
  }

  function normalizeMessage(row, userId) {
    if (!row) return null;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      text: row.content || "",
      content: row.content || "",
      type: row.message_type || "text",
      mediaPath: row.media_path || null,
      mediaName: row.media_name || null,
      mediaMime: row.media_mime || null,
      mediaSize: row.media_size || null,
      replyToId: row.reply_to_id || null,
      forwardedFromId: row.forwarded_from_id || null,
      deletedAt: row.deleted_at || null,
      deletedForEveryone: Boolean(row.deleted_for_everyone),
      fromMe: row.sender_id === userId,
      createdAt: row.created_at,
      editedAt: row.edited_at || null,
      receipts: row.receipts || []
    };
  }

  async function getProfiles(client, userIds) {
    const ids = uniqueIds(userIds);

    if (!ids.length) return {};

    const { data, error } = await client
      .from(TABLE.profiles)
      .select("id,name,first_name,last_name,avatar_url")
      .in("id", ids);

    if (error) throw error;

    const profiles = {};

    safeArray(data).forEach(profile => {
      profiles[profile.id] = {
        id: profile.id,
        name:
          profile.name ||
          [profile.first_name, profile.last_name]
            .filter(Boolean).join(" ") ||
          "Mero Sansar User",
        avatar: profile.avatar_url || ""
      };
    });

    return profiles;
  }

  function messageColumns() {
    return [
      "id",
      "conversation_id",
      "sender_id",
      "content",
      "message_type",
      "media_path",
      "media_name",
      "media_mime",
      "media_size",
      "reply_to_id",
      "forwarded_from_id",
      "deleted_at",
      "deleted_for_everyone",
      "created_at",
      "edited_at"
    ].join(",");
  }

  /* =========================================
     CONVERSATIONS
  ========================================= */

  async function getConversations() {
    try {
      const { client, user } = await getContext();

      const membership = await client
        .from(TABLE.members)
        .select("conversation_id,last_read_at,role")
        .eq("user_id", user.id);

      if (membership.error) throw membership.error;

      const memberships = membership.data || [];
      const ids = memberships.map(x => x.conversation_id);

      if (!ids.length) {
        return result(true, "CONVERSATIONS_LOADED", []);
      }

      const [
        conversationResult,
        memberResult,
        messageResult,
        preferenceResult
      ] = await Promise.all([
        client.from(TABLE.conversations)
          .select("id,type,title,created_by,created_at,updated_at,last_message_at")
          .in("id", ids)
          .order("last_message_at", { ascending: false }),

        client.from(TABLE.members)
          .select("conversation_id,user_id,role,last_read_at")
          .in("conversation_id", ids),

        client.from(TABLE.messages)
          .select(messageColumns())
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(500),

        client.from(TABLE.preferences)
          .select("conversation_id,is_pinned,is_archived,is_muted")
          .eq("user_id", user.id)
          .in("conversation_id", ids)
      ]);

      if (conversationResult.error) throw conversationResult.error;
      if (memberResult.error) throw memberResult.error;
      if (messageResult.error) throw messageResult.error;
      if (preferenceResult.error) throw preferenceResult.error;

      const conversations = conversationResult.data || [];
      const members = memberResult.data || [];
      const messages = messageResult.data || [];
      const preferences = preferenceResult.data || [];

      const profiles = await getProfiles(
        client,
        members.map(x => x.user_id)
      );

      const latest = {};

      messages.forEach(message => {
        if (!latest[message.conversation_id]) {
          latest[message.conversation_id] =
            normalizeMessage(message, user.id);
        }
      });

      const membershipMap = {};

      memberships.forEach(item => {
        membershipMap[item.conversation_id] = item;
      });

      const preferenceMap = {};

      preferences.forEach(item => {
        preferenceMap[item.conversation_id] = item;
      });

      const output = conversations.map(conversation => {
        const conversationMembers = members
          .filter(item => item.conversation_id === conversation.id)
          .map(item => ({
            id: item.user_id,
            role: item.role,
            name: profiles[item.user_id]?.name || "सदस्य",
            avatar: profiles[item.user_id]?.avatar || "",
            lastReadAt: item.last_read_at || null
          }));

        const others = conversationMembers.filter(
          item => item.id !== user.id
        );

        const directPerson = others[0] || {};
        const preference = preferenceMap[conversation.id] || {};

        return {
          id: conversation.id,
          type: conversation.type,
          title: conversation.title || "",
          name: conversation.type === "group"
            ? conversation.title || "Group"
            : directPerson.name || "कुराकानी",
          avatar: directPerson.avatar || "",
          userId: directPerson.id || "",
          members: conversationMembers,
          messages: [],
          lastMessage: latest[conversation.id] || null,
          lastMessageAt:
            latest[conversation.id]?.createdAt ||
            conversation.last_message_at,
          lastReadAt:
            membershipMap[conversation.id]?.last_read_at || null,
          role: membershipMap[conversation.id]?.role || "member",
          isPinned: Boolean(preference.is_pinned),
          isArchived: Boolean(preference.is_archived),
          isMuted: Boolean(preference.is_muted),
          createdAt: conversation.created_at
        };
      });

      return result(true, "CONVERSATIONS_LOADED", output);
    } catch (error) {
      console.error("Messenger conversations:", error);
      return result(
        false,
        "CONVERSATIONS_LOAD_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     MESSAGE HISTORY + PAGINATION
  ========================================= */

  async function getMessages(conversationId, options = {}) {
    try {
      const { client, user } = await getContext();
      const id = String(conversationId || "").trim();

      if (!id) {
        throw new Error("Conversation ID उपलब्ध छैन।");
      }

      const limit = Math.min(
        100,
        Math.max(1, Number(options.limit) || PAGE_SIZE)
      );

      let query = client
        .from(TABLE.messages)
        .select(messageColumns())
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);

      const cursor = options.before;

      if (cursor && typeof cursor === "object") {
        const createdAt = String(
          cursor.createdAt || cursor.created_at || ""
        );

        const messageId = String(cursor.id || "");

        if (
          !createdAt ||
          !/^[0-9a-f-]{36}$/i.test(messageId)
        ) {
          throw new Error("पुरानो सन्देशको Cursor मान्य छैन।");
        }

        query = query.or(
          "created_at.lt." + createdAt +
          ",and(created_at.eq." + createdAt + ",id.lt." + messageId + ")"
        );
      } else if (cursor) {
        query = query.lt("created_at", String(cursor));
      }

      const { data, error } = await query;

      if (error) throw error;

      const messages = (data || [])
        .map(row => normalizeMessage(row, user.id))
        .reverse();

      return result(true, "MESSAGES_LOADED", messages);
    } catch (error) {
      return result(
        false,
        "MESSAGES_LOAD_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function getOlderMessages(
    conversationId,
    before,
    limit = PAGE_SIZE
  ) {
    if (!before) {
      return result(
        false,
        "CURSOR_REQUIRED",
        null,
        "पुरानो सन्देशको Cursor आवश्यक छ।"
      );
    }

    return getMessages(conversationId, { before, limit });
  }

  /* =========================================
     CREATE CONVERSATIONS
  ========================================= */

  async function createDirectChat(friendId) {
    try {
      const { client, user } = await getContext();
      const id = String(friendId || "").trim();

      if (!id || id === user.id) {
        throw new Error("मान्य साथी छान्नुहोस्।");
      }

      const { data, error } = await client.rpc(
        "create_conversation",
        {
          p_member_ids: [id],
          p_type: "direct",
          p_title: null
        }
      );

      if (error) throw error;

      notify("conversation-created", {
        conversationId: data
      });

      return result(true, "DIRECT_CHAT_CREATED", data);
    } catch (error) {
      return result(
        false,
        "DIRECT_CHAT_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function createGroup(memberIds, title) {
    try {
      const { client, user } = await getContext();

      const ids = uniqueIds(memberIds)
        .filter(id => id !== user.id);

      const name = String(title || "").trim().slice(0, 60);

      if (!name) {
        throw new Error("Group को नाम लेख्नुहोस्।");
      }

      if (ids.length < 2) {
        throw new Error("कम्तीमा दुई जना साथी छान्नुहोस्।");
      }

      const { data, error } = await client.rpc(
        "create_conversation",
        {
          p_member_ids: ids,
          p_type: "group",
          p_title: name
        }
      );

      if (error) throw error;

      notify("group-created", {
        conversationId: data
      });

      return result(true, "GROUP_CREATED", data);
    } catch (error) {
      return result(
        false,
        "GROUP_CREATE_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function manageGroupMember(
    conversationId,
    action,
    memberId
  ) {
    try {
      const { client } = await getContext();

      const allowed = [
        "add",
        "remove",
        "promote",
        "demote"
      ];

      if (!allowed.includes(action)) {
        throw new Error("अमान्य Group कार्य।");
      }

      const { data, error } = await client.rpc(
        "manage_group_member",
        {
          p_conversation_id: conversationId,
          p_action: action,
          p_member_id: memberId
        }
      );

      if (error) throw error;

      notify("group-members-changed", {
        conversationId,
        action,
        memberId
      });

      return result(true, "GROUP_MEMBER_UPDATED", data);
    } catch (error) {
      return result(
        false,
        "GROUP_MEMBER_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     SEND / EDIT / DELETE / REPLY / FORWARD
  ========================================= */

  async function insertMessage(client, user, payload) {
    const row = {
      conversation_id: payload.conversationId,
      sender_id: user.id,
      content: payload.content || "",
      message_type: payload.type || "text",
      media_path: payload.mediaPath || null,
      media_name: payload.mediaName || null,
      media_mime: payload.mediaMime || null,
      media_size: payload.mediaSize || null,
      reply_to_id: payload.replyToId || null,
      forwarded_from_id: payload.forwardedFromId || null
    };

    const { data, error } = await client
      .from(TABLE.messages)
      .insert(row)
      .select(messageColumns())
      .single();

    if (error) throw error;

    const message = normalizeMessage(data, user.id);

    notify("message-sent", {
      conversationId: payload.conversationId,
      message
    });

    return message;
  }

  async function sendMessage(
    conversationId,
    content,
    options = {}
  ) {
    try {
      const { client, user } = await getContext();

      const text = String(content || "").trim();
      const id = String(conversationId || "").trim();

      if (!id) {
        throw new Error("कुराकानी छान्नुहोस्।");
      }

      if (!text) {
        throw new Error("सन्देश लेख्नुहोस्।");
      }

      if (text.length > MAX_MESSAGE) {
        throw new Error("सन्देश बढीमा 5000 अक्षरको हुनुपर्छ।");
      }

      const message = await insertMessage(client, user, {
        conversationId: id,
        content: text,
        type: "text",
        replyToId: options.replyToId || null,
        forwardedFromId: options.forwardedFromId || null
      });

      return result(
        true,
        "MESSAGE_SENT",
        message,
        "सन्देश पठाइयो।"
      );
    } catch (error) {
      return result(
        false,
        "MESSAGE_SEND_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function editMessage(messageId, content) {
    try {
      const { client, user } = await getContext();
      const text = String(content || "").trim();

      if (!messageId || !text || text.length > MAX_MESSAGE) {
        throw new Error("सन्देश वा सामग्री मान्य छैन।");
      }

      const { data, error } = await client
        .from(TABLE.messages)
        .update({
          content: text,
          edited_at: new Date().toISOString()
        })
        .eq("id", messageId)
        .eq("sender_id", user.id)
        .select(messageColumns())
        .single();

      if (error) throw error;

      const message = normalizeMessage(data, user.id);

      notify("message-edited", { message });

      return result(true, "MESSAGE_EDITED", message);
    } catch (error) {
      return result(
        false,
        "MESSAGE_EDIT_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function deleteMessage(
    messageId,
    forEveryone = true
  ) {
    try {
      const { client, user } = await getContext();

      if (!messageId) {
        throw new Error("Message ID उपलब्ध छैन।");
      }

      if (forEveryone) {
        const { data, error } = await client
          .from(TABLE.messages)
          .update({
            deleted_at: new Date().toISOString(),
            deleted_for_everyone: true,
            content: ""
          })
          .eq("id", messageId)
          .eq("sender_id", user.id)
          .select("id,conversation_id,deleted_at")
          .single();

        if (error) throw error;

        notify("message-deleted", { message: data });

        return result(true, "MESSAGE_DELETED", data);
      }

      const { error } = await client
        .from(TABLE.messages)
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user.id);

      if (error) throw error;

      notify("message-deleted", { messageId });

      return result(
        true,
        "MESSAGE_DELETED",
        { id: messageId }
      );
    } catch (error) {
      return result(
        false,
        "MESSAGE_DELETE_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function replyMessage(
    conversationId,
    content,
    replyToId
  ) {
    if (!replyToId) {
      return result(
        false,
        "REPLY_TARGET_REQUIRED",
        null,
        "जवाफ दिने सन्देश छान्नुहोस्।"
      );
    }

    return sendMessage(
      conversationId,
      content,
      { replyToId }
    );
  }

  async function forwardMessage(
    messageId,
    targetConversationId
  ) {
    try {
      const { client, user } = await getContext();

      const { data: original, error } = await client
        .from(TABLE.messages)
        .select(messageColumns())
        .eq("id", messageId)
        .single();

      if (error) throw error;

      if (original.deleted_for_everyone) {
        throw new Error("मेटाइएको सन्देश Forward गर्न मिल्दैन।");
      }

      const message = await insertMessage(client, user, {
        conversationId: targetConversationId,
        content: original.content || "",
        type: original.message_type || "text",
        mediaPath: original.media_path,
        mediaName: original.media_name,
        mediaMime: original.media_mime,
        mediaSize: original.media_size,
        forwardedFromId: original.id
      });

      return result(
        true,
        "MESSAGE_FORWARDED",
        message
      );
    } catch (error) {
      return result(
        false,
        "MESSAGE_FORWARD_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function copyMessage(messageId) {
    try {
      const { client } = await getContext();

      const { data, error } = await client
        .from(TABLE.messages)
        .select("content,deleted_for_everyone")
        .eq("id", messageId)
        .single();

      if (error) throw error;

      if (data.deleted_for_everyone) {
        throw new Error("यो सन्देश उपलब्ध छैन।");
      }

      if (!global.navigator?.clipboard?.writeText) {
        throw new Error("यो उपकरणमा Copy सुविधा उपलब्ध छैन।");
      }

      await global.navigator.clipboard.writeText(
        data.content || ""
      );

      return result(true, "MESSAGE_COPIED", true);
    } catch (error) {
      return result(
        false,
        "MESSAGE_COPY_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     READ / DELIVERED RECEIPTS
  ========================================= */

  async function markDelivered(messageId) {
    try {
      const { client, user } = await getContext();

      if (!messageId) {
        throw new Error("Message ID उपलब्ध छैन।");
      }

      const { data: existing, error: readError } = await client
        .from(TABLE.receipts)
        .select("read_at")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (readError) throw readError;

      const now = new Date().toISOString();

      const { error } = await client
        .from(TABLE.receipts)
        .upsert({
          message_id: messageId,
          user_id: user.id,
          delivered_at: now,
          read_at: existing?.read_at || null
        }, {
          onConflict: "message_id,user_id"
        });

      if (error) throw error;

      notify("message-delivered", {
        messageId,
        userId: user.id
      });

      return result(true, "MESSAGE_DELIVERED");
    } catch (error) {
      return result(
        false,
        "DELIVERY_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function markRead(conversationId) {
    try {
      const { client, user } = await getContext();
      const id = String(conversationId || "").trim();

      if (!id) {
        throw new Error("Conversation ID उपलब्ध छैन।");
      }

      const now = new Date().toISOString();
      const batchSize = 500;

      let offset = 0;
      let totalMarked = 0;

      while (true) {
        const { data: messages, error: messageError } = await client
          .from(TABLE.messages)
          .select("id")
          .eq("conversation_id", id)
          .neq("sender_id", user.id)
          .eq("deleted_for_everyone", false)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + batchSize - 1);

        if (messageError) throw messageError;

        const ids = (messages || [])
          .map(item => item.id)
          .filter(Boolean);

        if (!ids.length) break;

        const {
          data: existingRows,
          error: receiptReadError
        } = await client
          .from(TABLE.receipts)
          .select("message_id,delivered_at,read_at")
          .eq("user_id", user.id)
          .in("message_id", ids);

        if (receiptReadError) throw receiptReadError;

        const existingMap = new Map(
          (existingRows || []).map(row => [
            row.message_id,
            row
          ])
        );

        const rows = ids.map(messageId => {
          const old = existingMap.get(messageId);

          return {
            message_id: messageId,
            user_id: user.id,
            delivered_at: old?.delivered_at || now,
            read_at: old?.read_at || now
          };
        });

        const { error: receiptError } = await client
          .from(TABLE.receipts)
          .upsert(rows, {
            onConflict: "message_id,user_id"
          });

        if (receiptError) throw receiptError;

        totalMarked += ids.length;

        if (ids.length < batchSize) break;

        offset += batchSize;
      }

      const { error: memberError } = await client
        .from(TABLE.members)
        .update({ last_read_at: now })
        .eq("conversation_id", id)
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      notify("conversation-read", {
        conversationId: id,
        userId: user.id,
        readAt: now,
        count: totalMarked
      });

      return result(true, "CONVERSATION_READ", {
        conversationId: id,
        readAt: now,
        count: totalMarked
      });
    } catch (error) {
      return result(
        false,
        "MARK_READ_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function getMessageReceipts(messageId) {
    try {
      const { client } = await getContext();

      const { data, error } = await client
        .from(TABLE.receipts)
        .select("message_id,user_id,delivered_at,read_at")
        .eq("message_id", messageId);

      if (error) throw error;

      return result(
        true,
        "RECEIPTS_LOADED",
        data || []
      );
    } catch (error) {
      return result(
        false,
        "RECEIPTS_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     CHAT PREFERENCES
  ========================================= */

  async function updateChatPreferences(
    conversationId,
    changes = {}
  ) {
    try {
      const { client, user } = await getContext();

      const row = {
        conversation_id: conversationId,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      [
        "is_pinned",
        "is_archived",
        "is_muted"
      ].forEach(key => {
        if (typeof changes[key] === "boolean") {
          row[key] = changes[key];
        }
      });

      const { data, error } = await client
        .from(TABLE.preferences)
        .upsert(row, {
          onConflict: "user_id,conversation_id"
        })
        .select()
        .single();

      if (error) throw error;

      notify("chat-preferences-changed", {
        conversationId,
        preferences: data
      });

      return result(
        true,
        "PREFERENCES_UPDATED",
        data
      );
    } catch (error) {
      return result(
        false,
        "PREFERENCES_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     MEDIA / FILE
  ========================================= */

  function validateFile(file) {
    if (!file) {
      throw new Error("फाइल छान्नुहोस्।");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("फाइल 50 MB भन्दा सानो हुनुपर्छ।");
    }

    const allowed = [
      "image/",
      "video/",
      "audio/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument"
    ];

    if (!allowed.some(type => file.type.startsWith(type))) {
      throw new Error("यो फाइल प्रकार पठाउन अनुमति छैन।");
    }
  }

  async function uploadMedia(
    conversationId,
    file,
    type
  ) {
    try {
      const { client, user } = await getContext();

      validateFile(file);

      const safeName = String(file.name || "upload")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 100);

      const path = [
        conversationId,
        user.id,
        Date.now() + "_" + safeName
      ].join("/");

      const {
        data: upload,
        error: uploadError
      } = await client
        .storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream"
        });

      if (uploadError) throw uploadError;

      const messageType = type ||
        (file.type.startsWith("image/") ? "image" :
          file.type.startsWith("video/") ? "video" :
            file.type.startsWith("audio/") ? "voice" : "file");

      const message = await insertMessage(client, user, {
        conversationId,
        content: "",
        type: messageType,
        mediaPath: upload.path || path,
        mediaName: file.name || safeName,
        mediaMime: file.type || "",
        mediaSize: file.size
      });

      return result(true, "MEDIA_SENT", message);
    } catch (error) {
      return result(
        false,
        "MEDIA_SEND_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function getMediaUrl(path, expiresIn = 3600) {
    try {
      const { client } = await getContext();

      if (!path) {
        throw new Error("Media path उपलब्ध छैन।");
      }

      const { data, error } = await client
        .storage
        .from(BUCKET)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;

      return result(
        true,
        "MEDIA_URL_READY",
        data?.signedUrl || ""
      );
    } catch (error) {
      return result(
        false,
        "MEDIA_URL_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  async function deleteMedia(path) {
    try {
      const { client } = await getContext();

      if (!path) {
        throw new Error("Media path उपलब्ध छैन।");
      }

      const { error } = await client
        .storage
        .from(BUCKET)
        .remove([path]);

      if (error) throw error;

      return result(true, "MEDIA_DELETED", true);
    } catch (error) {
      return result(
        false,
        "MEDIA_DELETE_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     MESSAGE / CONVERSATION SEARCH
  ========================================= */

  async function searchMessages(
    conversationId,
    term,
    limit = 50
  ) {
    try {
      const { client, user } = await getContext();
      const query = String(term || "").trim();

      if (query.length < 2) {
        throw new Error("खोज्न कम्तीमा दुई अक्षर लेख्नुहोस्।");
      }

      let request = client
        .from(TABLE.messages)
        .select(messageColumns())
        .ilike(
          "content",
          "%" + query.replace(/[%_]/g, "") + "%"
        )
        .eq("deleted_for_everyone", false)
        .order("created_at", { ascending: false })
        .limit(Math.min(100, Math.max(1, limit)));

      if (conversationId) {
        request = request.eq(
          "conversation_id",
          conversationId
        );
      }

      const { data, error } = await request;

      if (error) throw error;

      return result(
        true,
        "MESSAGES_SEARCHED",
        (data || []).map(row =>
          normalizeMessage(row, user.id)
        )
      );
    } catch (error) {
      return result(
        false,
        "MESSAGE_SEARCH_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     PRESENCE + TYPING
  ========================================= */

  async function updateLastSeen() {
    try {
      const { client, user } = await getContext();
      const now = Date.now();

      if (now - lastPresenceWrite < 60000) {
        return true;
      }

      const iso = new Date(now).toISOString();

      const { error } = await client
        .from(TABLE.presence)
        .upsert({
          user_id: user.id,
          last_seen_at: iso,
          updated_at: iso
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      lastPresenceWrite = now;

      return true;
    } catch (error) {
      console.warn("Presence update:", error);
      return false;
    }
  }

  async function startGlobalPresence() {
    try {
      if (global.navigator?.onLine === false) return false;

      const { client, user } = await getContext();

      if (
        globalPresenceChannel &&
        globalPresenceClient === client &&
        globalPresenceUserId === user.id
      ) {
        return globalPresenceReady
          ? await globalPresenceReady
          : false;
      }

      await stopGlobalPresence();

      const channel = client.channel(
        "ksk-global-presence",
        {
          config: {
            presence: { key: user.id }
          }
        }
      );

      channel.on("presence", { event: "sync" }, () => {
        if (globalPresenceChannel !== channel) return;

        notify("global-presence-sync", {
          state: channel.presenceState()
        });
      });

      globalPresenceChannel = channel;
      globalPresenceClient = client;
      globalPresenceUserId = user.id;

      const readyPromise = new Promise(resolve => {
        let settled = false;
        let timeoutId = global.setTimeout(
          () => finish(false),
          15000
        );

        function finish(value) {
          if (settled) return;
          settled = true;

          if (timeoutId !== null) {
            global.clearTimeout(timeoutId);
            timeoutId = null;
          }

          resolve(value);
        }

        channel.subscribe(async status => {
          if (globalPresenceChannel !== channel) {
            finish(false);
            return;
          }

          if (status === "SUBSCRIBED") {
            try {
              const tracked = await channel.track({
                userId: user.id,
                onlineAt: new Date().toISOString()
              });

              if (globalPresenceChannel !== channel) {
                finish(false);
                return;
              }

              await updateLastSeen();

              finish(
                tracked === "ok" ||
                tracked === undefined
              );
            } catch (error) {
              console.warn("Global Presence track:", error);
              finish(false);
            }

            return;
          }

          if (
            ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)
          ) {
            notify("global-presence-sync", { state: {} });
            finish(false);
          }
        });
      });

      globalPresenceReady = readyPromise;

      const ready = await readyPromise;

      if (!ready && globalPresenceChannel === channel) {
        await stopGlobalPresence();
      }

      return ready;

    } catch (error) {
      console.warn("Global Presence:", error);
      return false;
    }
  }

  async function stopGlobalPresence() {
    const old = globalPresenceChannel;
    const client = globalPresenceClient;

    globalPresenceChannel = null;
    globalPresenceClient = null;
    globalPresenceUserId = "";
    globalPresenceReady = null;

    notify("global-presence-sync", { state: {} });

    if (old && client?.removeChannel) {
      try {
        await client.removeChannel(old);
      } catch (error) {
        console.warn("Global Presence cleanup:", error);
      }
    }

    return true;
  }

  async function startPresence(conversationId) {
    try {
      const id = String(conversationId || "").trim();

      if (!id) {
        throw new Error("Conversation ID उपलब्ध छैन।");
      }

      const { client, user } = await getContext();

      if (
        presenceChannel &&
        activePresenceConversation === id &&
        presenceReady
      ) {
        return await presenceReady;
      }

      await stopPresence();

      const channel = client.channel(
        "ksk-chat-presence-" + id,
        {
          config: {
            presence: { key: user.id }
          }
        }
      );

      channel
        .on("presence", { event: "sync" }, () => {
          notify("presence-sync", {
            conversationId: id,
            state: channel.presenceState()
          });
        })
        .on("broadcast", { event: "typing" }, payload => {
          const detail = payload?.payload || {};

          if (!detail.userId || detail.userId === user.id) {
            return;
          }

          notify("typing-change", {
            conversationId: id,
            userId: detail.userId,
            typing: Boolean(detail.typing)
          });
        });

      presenceChannel = channel;
      activePresenceConversation = id;

      presenceReady = new Promise(resolve => {
        let settled = false;

        const finish = value => {
          if (!settled) {
            settled = true;
            resolve(value);
          }
        };

        channel.subscribe(async status => {
          if (status === "SUBSCRIBED") {
            try {
              const tracked = await channel.track({
                userId: user.id,
                onlineAt: new Date().toISOString()
              });

              await updateLastSeen();

              finish(
                tracked === "ok" ||
                tracked === undefined
              );
            } catch (error) {
              console.warn("Presence track:", error);
              finish(false);
            }
          } else if (
            ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)
          ) {
            finish(false);
          }
        });
      });

      const ready = await presenceReady;

      if (!ready && presenceChannel === channel) {
        await stopPresence();
      }

      return ready;
    } catch (error) {
      console.warn("Presence channel:", error);
      return false;
    }
  }

  async function stopPresence() {
    const client = getAuth()?.getClient?.();
    const old = presenceChannel;

    presenceChannel = null;
    activePresenceConversation = "";
    presenceReady = null;

    if (old && client?.removeChannel) {
      try {
        await client.removeChannel(old);
      } catch (_) {}
    }

    return true;
  }

  async function sendTyping(
    conversationId,
    typing = true
  ) {
    try {
      const id = String(conversationId || "").trim();

      if (!id) return false;

      if (
        !presenceChannel ||
        activePresenceConversation !== id
      ) {
        if (!(await startPresence(id))) {
          return false;
        }
      } else if (
        presenceReady &&
        !(await presenceReady)
      ) {
        return false;
      }

      const channel = presenceChannel;

      if (
        !channel ||
        activePresenceConversation !== id
      ) {
        return false;
      }

      const { user } = await getContext();

      const response = await channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: user.id,
          typing: Boolean(typing),
          sentAt: Date.now()
        }
      });

      return (
        response === "ok" ||
        response === undefined
      );
    } catch (error) {
      console.warn("Typing event:", error);
      return false;
    }
  }

  /* =========================================
     REALTIME
  ========================================= */

  async function stopRealtime() {
    const old = realtimeChannel;
    const client = realtimeClient || getAuth()?.getClient?.();

    realtimeChannel = null;
    realtimeClient = null;
    realtimeUserId = "";

    if (old && client?.removeChannel) {
      try {
        await client.removeChannel(old);
      } catch (error) {
        console.warn("Realtime cleanup:", error);
      }
    }

    await stopPresence();
    await stopGlobalPresence();

    return true;
  }

  async function startRealtime() {
    if (realtimeStartPromise) {
      return realtimeStartPromise;
    }

    realtimeStartPromise = (async () => {
      let context;

      try {
        context = await getContext();
      } catch (error) {
        await stopRealtime();
        return false;
      }

      const { client, user } = context;

      if (
        realtimeChannel &&
        realtimeClient === client &&
        realtimeUserId === user.id
      ) {
        await startGlobalPresence();
        return true;
      }

      await stopRealtime();

      let channel = null;
      let timeoutId = null;

      try {
        const subscribed = await new Promise(resolve => {
          let settled = false;

          const finish = value => {
            if (settled) return;
            settled = true;

            if (timeoutId !== null) {
              global.clearTimeout(timeoutId);
              timeoutId = null;
            }

            resolve(value);
          };

          channel = client
            .channel("ksk-messages-" + user.id)
            .on("postgres_changes", {
              event: "*",
              schema: "public",
              table: TABLE.messages
            }, payload => {
              notify("realtime-message", {
                eventType: payload?.eventType || "",
                message: payload?.new || payload?.old || null
              });
            })
            .on("postgres_changes", {
              event: "*",
              schema: "public",
              table: TABLE.receipts
            }, payload => {
              notify("realtime-receipt", {
                eventType: payload?.eventType || "",
                receipt: payload?.new || payload?.old || null
              });
            })
            .on("postgres_changes", {
              event: "*",
              schema: "public",
              table: TABLE.members
            }, payload => {
              notify("realtime-members", {
                eventType: payload?.eventType || "",
                member: payload?.new || payload?.old || null
              });
            });

          realtimeChannel = channel;
          realtimeClient = client;
          realtimeUserId = user.id;

          timeoutId = global.setTimeout(() => {
            console.warn("Messenger Realtime: subscription timeout");
            notify("realtime-error", { status: "TIMED_OUT" });
            finish(false);
          }, 15000);

          channel.subscribe(status => {
            if (settled) return;

            if (status === "SUBSCRIBED") {
              notify("realtime-connected", {
                userId: user.id
              });
              finish(true);
              return;
            }

            if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              console.warn("Messenger Realtime:", status);
              notify("realtime-error", { status });
              finish(false);
            }
          });
        });

        if (!subscribed) {
          if (realtimeChannel === channel) {
            realtimeChannel = null;
            realtimeClient = null;
            realtimeUserId = "";
          }

          if (channel && client.removeChannel) {
            try {
              await client.removeChannel(channel);
            } catch (error) {
              console.warn("Realtime failed-channel cleanup:", error);
            }
          }

          return false;
        }

        await updateLastSeen();
        await startGlobalPresence();
        return true;

      } catch (error) {
        console.error("Messenger Realtime:", error);

        if (realtimeChannel === channel) {
          realtimeChannel = null;
          realtimeClient = null;
          realtimeUserId = "";
        }

        if (channel && client.removeChannel) {
          try {
            await client.removeChannel(channel);
          } catch (_) {}
        }

        return false;
      }
    })().finally(() => {
      realtimeStartPromise = null;
    });

    return realtimeStartPromise;
  }

  /* =========================================
     INITIALIZE + AUTH EVENTS
  ========================================= */

  async function initialize() {
    try {
      const { user } = await getContext();

      await startRealtime();
      await updateLastSeen();

      return result(true, "MESSAGES_READY", {
        userId: user.id
      });
    } catch (error) {
      return result(
        false,
        "MESSAGES_NOT_READY",
        null,
        errorMessage(error)
      );
    }
  }

  global.addEventListener("ksk:auth-change", event => {
    if (!event.detail?.user) {
      stopRealtime();
    } else {
      startRealtime();
    }
  });

  global.addEventListener("online", () => {
    startRealtime();
    startGlobalPresence();
    updateLastSeen();
  });

  global.addEventListener("offline", () => {
    stopGlobalPresence();
    notify("global-presence-sync", { state: {} });
  });

  global.addEventListener("pagehide", () => {
    stopPresence();
    stopGlobalPresence();
  });

  /* =========================================
     PUBLIC API
  ========================================= */

  global.KSKSupabaseMessages = Object.freeze({
    initialize,

    getConversations,
    getMessages,
    getOlderMessages,

    createDirectChat,
    createGroup,
    manageGroupMember,

    sendMessage,
    editMessage,
    deleteMessage,
    replyMessage,
    forwardMessage,
    copyMessage,

    markDelivered,
    markRead,
    getMessageReceipts,

    updateChatPreferences,

    uploadMedia,
    getMediaUrl,
    deleteMedia,

    searchMessages,

    startPresence,
    stopPresence,
    startGlobalPresence,
    stopGlobalPresence,
    sendTyping,
    updateLastSeen,

    startRealtime,
    stopRealtime
  });

})(window);
