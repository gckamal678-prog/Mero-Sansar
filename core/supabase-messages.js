
"use strict";

/*
 * MERO SANSAR — SUPABASE MESSAGES
 * Direct Chat + Group Chat + Live Messages
 *
 * Dependency:
 * - core/supabase-auth.js
 *
 * Tables:
 * - conversations
 * - conversation_members
 * - messages
 */

(function (global) {
  "use strict";

  if (global.KSKSupabaseMessages) return;

  const TABLE = {
    conversations: "conversations",
    members: "conversation_members",
    messages: "messages",
    profiles: "profiles"
  };

  let realtimeChannel = null;
  let realtimeUserId = "";
  let startingRealtime = false;

  function result(ok, code, data = null, message = "") {
    return { ok, code, data, message };
  }

  function getAuth() {
    return global.KSKSupabaseAuth || null;
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

  function errorMessage(error) {
    return String(
      error?.message ||
      error?.details ||
      "Messages अनुरोध पूरा हुन सकेन।"
    );
  }

  function notify(action, detail = {}) {
    global.dispatchEvent(
      new CustomEvent("ksk:messages-cloud-change", {
        detail: { action, ...detail }
      })
    );
  }

  function normalizeMessage(row, userId) {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      text: row.content || "",
      fromMe: row.sender_id === userId,
      createdAt: row.created_at,
      editedAt: row.edited_at || null
    };
  }

  async function getProfiles(client, userIds) {
    const ids = [...new Set(
      (userIds || []).filter(Boolean)
    )];

    if (!ids.length) return {};

    const { data, error } = await client
      .from(TABLE.profiles)
      .select("id,name,first_name,last_name,avatar_url")
      .in("id", ids);

    if (error) throw error;

    const profiles = {};

    (data || []).forEach(profile => {
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

  /* =========================================
     LOAD CONVERSATIONS
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

      const ids = memberships.map(
        item => item.conversation_id
      );

      if (!ids.length) {
        return result(true, "CONVERSATIONS_LOADED", []);
      }

      const conversationsResult = await client
        .from(TABLE.conversations)
        .select(
          "id,type,title,created_by,created_at,updated_at,last_message_at"
        )
        .in("id", ids)
        .order("last_message_at", { ascending: false });

      if (conversationsResult.error) {
        throw conversationsResult.error;
      }

      const conversations = conversationsResult.data || [];

      const [membersResult, messagesResult] = await Promise.all([
        client
          .from(TABLE.members)
          .select("conversation_id,user_id,role")
          .in("conversation_id", ids),

        client
          .from(TABLE.messages)
          .select(
            "id,conversation_id,sender_id,content,created_at,edited_at"
          )
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(500)
      ]);

      if (membersResult.error) throw membersResult.error;
      if (messagesResult.error) throw messagesResult.error;

      const members = membersResult.data || [];
      const messages = messagesResult.data || [];

      const userIds = members.map(item => item.user_id);
      const profiles = await getProfiles(client, userIds);

      const latestMessages = {};

      messages.forEach(message => {
        if (!latestMessages[message.conversation_id]) {
          latestMessages[message.conversation_id] =
            normalizeMessage(message, user.id);
        }
      });

      const membershipMap = {};

      memberships.forEach(item => {
        membershipMap[item.conversation_id] = item;
      });

      const output = conversations.map(conversation => {
        const conversationMembers = members
          .filter(item =>
            item.conversation_id === conversation.id
          )
          .map(item => ({
            id: item.user_id,
            role: item.role,
            name: profiles[item.user_id]?.name || "सदस्य",
            avatar: profiles[item.user_id]?.avatar || ""
          }));

        const others = conversationMembers.filter(
          item => item.id !== user.id
        );

        const directPerson = others[0] || {};

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
          lastMessage:
            latestMessages[conversation.id] || null,
          lastMessageAt:
            latestMessages[conversation.id]?.createdAt ||
            conversation.last_message_at,
          lastReadAt:
            membershipMap[conversation.id]?.last_read_at || null,
          createdAt: conversation.created_at
        };
      });

      return result(
        true,
        "CONVERSATIONS_LOADED",
        output
      );

    } catch (error) {
      console.error("Messages load failed:", error);

      return result(
        false,
        "CONVERSATIONS_LOAD_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     LOAD MESSAGES
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
        Math.max(1, Number(options.limit) || 50)
      );

      const { data, error } = await client
        .from(TABLE.messages)
        .select(
          "id,conversation_id,sender_id,content,created_at,edited_at"
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const messages = (data || [])
        .map(item => normalizeMessage(item, user.id))
        .reverse();

      return result(true, "MESSAGES_LOADED", messages);

    } catch (error) {
      console.error("Message history failed:", error);

      return result(
        false,
        "MESSAGES_LOAD_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     CREATE DIRECT CHAT
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

      return result(
        true,
        "DIRECT_CHAT_CREATED",
        data
      );

    } catch (error) {
      console.error("Direct chat creation failed:", error);

      return result(
        false,
        "DIRECT_CHAT_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     CREATE GROUP CHAT
  ========================================= */

  async function createGroup(memberIds, title) {
    try {
      const { client, user } = await getContext();

      const ids = [...new Set(
        (Array.isArray(memberIds) ? memberIds : [])
          .map(id => String(id || "").trim())
          .filter(id => id && id !== user.id)
      )];

      const name = String(title || "").trim().slice(0, 60);

      if (!name) {
        throw new Error("Group को नाम लेख्नुहोस्।");
      }

      if (ids.length < 2) {
        throw new Error(
          "Group बनाउन कम्तीमा दुई जना साथी छान्नुहोस्।"
        );
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

      return result(
        true,
        "GROUP_CREATED",
        data
      );

    } catch (error) {
      console.error("Group creation failed:", error);

      return result(
        false,
        "GROUP_CREATE_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     SEND MESSAGE
  ========================================= */

  async function sendMessage(conversationId, content) {
    try {
      const { client, user } = await getContext();

      const id = String(conversationId || "").trim();
      const text = String(content || "").trim();

      if (!id) {
        throw new Error("कुराकानी छान्नुहोस्।");
      }

      if (!text) {
        throw new Error("सन्देश लेख्नुहोस्।");
      }

      if (text.length > 5000) {
        throw new Error("सन्देश बढीमा 5000 अक्षरको हुनुपर्छ।");
      }

      const { data, error } = await client
        .from(TABLE.messages)
        .insert({
          conversation_id: id,
          sender_id: user.id,
          content: text
        })
        .select(
          "id,conversation_id,sender_id,content,created_at,edited_at"
        )
        .single();

      if (error) throw error;

      const message = normalizeMessage(data, user.id);

      notify("message-sent", {
        conversationId: id,
        message
      });

      return result(
        true,
        "MESSAGE_SENT",
        message,
        "सन्देश पठाइयो।"
      );

    } catch (error) {
      console.error("Send message failed:", error);

      return result(
        false,
        "MESSAGE_SEND_FAILED",
        null,
        errorMessage(error)
      );
    }
  }

  /* =========================================
     REALTIME
  ========================================= */

  async function stopRealtime() {
    const auth = getAuth();
    const client = auth?.getClient?.();

    const oldChannel = realtimeChannel;

    realtimeChannel = null;
    realtimeUserId = "";

    if (oldChannel && client?.removeChannel) {
      try {
        await client.removeChannel(oldChannel);
      } catch (error) {
        console.warn("Messages Realtime cleanup failed:", error);
      }
    }

    return true;
  }

  async function startRealtime() {
    if (startingRealtime) return false;

    let context;

    try {
      context = await getContext();
    } catch (_) {
      await stopRealtime();
      return false;
    }

    const { client, user } = context;

    if (
      realtimeChannel &&
      realtimeUserId === user.id
    ) {
      return true;
    }

    startingRealtime = true;

    try {
      await stopRealtime();

      const channel = client
        .channel("ksk-messages-" + user.id)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLE.messages
          },
          payload => {
            notify("realtime-message", {
              eventType: payload?.eventType || "",
              message:
                payload?.new ||
                payload?.old ||
                null
            });
          }
        );

      realtimeChannel = channel;
      realtimeUserId = user.id;

      channel.subscribe(status => {
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.warn(
            "Messages Realtime status:",
            status
          );
        }
      });

      return true;

    } catch (error) {
      console.error("Messages Realtime failed:", error);

      realtimeChannel = null;
      realtimeUserId = "";

      return false;

    } finally {
      startingRealtime = false;
    }
  }

  /* =========================================
     INITIALIZE
  ========================================= */

  async function initialize() {
    try {
      const { user } = await getContext();

      await startRealtime();

      return result(
        true,
        "MESSAGES_READY",
        { userId: user.id }
      );

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

  global.KSKSupabaseMessages = Object.freeze({
    initialize,
    getConversations,
    getMessages,
    createDirectChat,
    createGroup,
    sendMessage,
    startRealtime,
    stopRealtime
  });

})(window);
