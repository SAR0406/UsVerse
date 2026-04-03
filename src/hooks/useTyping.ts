/**
 * Custom hook for managing typing indicators in chat
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface TypingIndicator {
  userId: string;
  typing: boolean;
}

interface UseTypingOptions {
  coupleId: string | null;
  userId: string | null;
  partnerName?: string;
}

interface UseTypingReturn {
  isPartnerTyping: boolean;
  partnerTypingText: string;
  notifyTyping: () => void;
  stopTyping: () => void;
}

export function useTyping({ coupleId, userId, partnerName = "Partner" }: UseTypingOptions): UseTypingReturn {
  const supabase = createClient();
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);

  const partnerTypingText = isPartnerTyping ? `${partnerName} is typing...` : "";

  // Notify partner that user is typing
  const notifyTyping = useCallback(() => {
    if (!coupleId || !userId) return;

    const now = Date.now();
    // Throttle typing events to every 2 seconds
    if (now - lastTypingTimeRef.current < 2000) return;

    lastTypingTimeRef.current = now;

    const channel = supabase.channel(`typing-${coupleId}`);
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, typing: true },
    });

    // Auto-stop typing after 3 seconds if no further input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [coupleId, userId, supabase]);

  // Stop typing notification
  const stopTyping = useCallback(() => {
    if (!coupleId || !userId) return;

    const channel = supabase.channel(`typing-${coupleId}`);
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, typing: false },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [coupleId, userId, supabase]);

  // Subscribe to partner's typing events
  useEffect(() => {
    if (!coupleId || !userId) return;

    const channel = supabase
      .channel(`typing-${coupleId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as TypingIndicator;

        // Only show typing indicator for partner, not self
        if (data.userId !== userId) {
          setIsPartnerTyping(data.typing);

          // Auto-clear typing indicator after 5 seconds
          if (data.typing) {
            setTimeout(() => {
              setIsPartnerTyping(false);
            }, 5000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [coupleId, userId, supabase]);

  return {
    isPartnerTyping,
    partnerTypingText,
    notifyTyping,
    stopTyping,
  };
}
