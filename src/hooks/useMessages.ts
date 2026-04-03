/**
 * Custom hook for managing chat messages with real-time updates
 * Handles fetching, sending, editing, deleting messages and reactions
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, MessageReaction } from "@/types/database";

export type ExtendedMessage = Message & {
  reactions?: MessageReaction[];
};

interface UseMessagesOptions {
  coupleId: string | null;
  userId: string | null;
}

interface UseMessagesReturn {
  messages: ExtendedMessage[];
  loading: boolean;
  sending: boolean;
  sendMessage: (content: string, metadata?: Record<string, unknown>) => Promise<void>;
  editMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, reactionId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  error: string | null;
}

export function useMessages({ coupleId, userId }: UseMessagesOptions): UseMessagesReturn {
  const supabase = createClient();
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages with reactions in a single optimized query
  const fetchMessages = useCallback(async () => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/messages?limit=100");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch messages");
      }

      const data = await response.json();

      // Fetch all reactions in parallel for the fetched messages
      const messageIds = data.data?.messages?.map((m: Message) => m.id) || [];
      const reactionsPromises = messageIds.map(async (msgId: string) => {
        const res = await fetch(`/api/messages/${msgId}/reactions`);
        if (res.ok) {
          const reactData = await res.json();
          return { messageId: msgId, reactions: reactData.data?.reactions || [] };
        }
        return { messageId: msgId, reactions: [] };
      });

      const reactionsResults = await Promise.all(reactionsPromises);
      const reactionsMap = new Map(
        reactionsResults.map(r => [r.messageId, r.reactions])
      );

      const messagesWithReactions = (data.data?.messages || []).map((msg: Message) => ({
        ...msg,
        reactions: reactionsMap.get(msg.id) || [],
      }));

      setMessages(messagesWithReactions);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  // Send a new message
  const sendMessage = useCallback(async (content: string, metadata?: Record<string, unknown>) => {
    if (!content.trim() && !metadata?.media_url) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          ...metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to send message");
      }

      const data = await response.json();

      // Optimistic update - add message immediately
      if (data.data?.message) {
        setMessages(prev => [data.data.message, ...prev]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
      throw err;
    } finally {
      setSending(false);
    }
  }, []);

  // Edit a message
  const editMessage = useCallback(async (id: string, content: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to edit message");
      }

      // Optimistic update
      setMessages(prev =>
        prev.map(msg =>
          msg.id === id ? { ...msg, content: content.trim(), edited_at: new Date().toISOString() } : msg
        )
      );
    } catch (err) {
      console.error("Error editing message:", err);
      setError(err instanceof Error ? err.message : "Failed to edit message");
      throw err;
    }
  }, []);

  // Delete a message
  const deleteMessage = useCallback(async (id: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to delete message");
      }

      // Optimistic update
      setMessages(prev => prev.filter(msg => msg.id !== id));
    } catch (err) {
      console.error("Error deleting message:", err);
      setError(err instanceof Error ? err.message : "Failed to delete message");
      throw err;
    }
  }, []);

  // Add a reaction to a message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to add reaction");
      }

      const data = await response.json();

      // Optimistic update
      if (data.data?.reaction) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions: [...(msg.reactions || []), data.data.reaction]
                }
              : msg
          )
        );
      }
    } catch (err) {
      console.error("Error adding reaction:", err);
      setError(err instanceof Error ? err.message : "Failed to add reaction");
    }
  }, []);

  // Remove a reaction from a message
  const removeReaction = useCallback(async (messageId: string, reactionId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/messages/${messageId}/reactions/${reactionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to remove reaction");
      }

      // Optimistic update
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: (msg.reactions || []).filter(r => r.id !== reactionId)
              }
            : msg
        )
      );
    } catch (err) {
      console.error("Error removing reaction:", err);
      setError(err instanceof Error ? err.message : "Failed to remove reaction");
    }
  }, []);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: "POST",
      });

      if (!response.ok) {
        console.error("Failed to mark message as read");
      }

      // Optimistic update
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, read_at: new Date().toISOString() } : msg
        )
      );
    } catch (err) {
      console.error("Error marking message as read:", err);
    }
  }, [userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!coupleId) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [{ ...newMessage, reactions: [] }, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id
                ? { ...updatedMessage, reactions: msg.reactions }
                : msg
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, fetchMessages, supabase]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    error,
  };
}
