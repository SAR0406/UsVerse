/**
 * Custom hook for managing online presence in chat
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface PresenceState {
  userId: string;
  online: boolean;
  lastSeen?: string;
}

interface UsePresenceOptions {
  coupleId: string | null;
  userId: string | null;
}

interface UsePresenceReturn {
  isPartnerOnline: boolean;
  partnerLastSeen: string | null;
  updatePresence: () => void;
}

export function usePresence({ coupleId, userId }: UsePresenceOptions): UsePresenceReturn {
  const supabase = createClient();
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);

  // Update user's own presence
  const updatePresence = useCallback(() => {
    if (!coupleId || !userId) return;

    const channel = supabase.channel(`presence-${coupleId}`);
    channel.send({
      type: "broadcast",
      event: "presence",
      payload: { userId, online: true, lastSeen: new Date().toISOString() },
    });
  }, [coupleId, userId, supabase]);

  // Subscribe to presence updates
  useEffect(() => {
    if (!coupleId || !userId) return;

    // Send initial presence
    updatePresence();

    // Send presence every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    const channel = supabase
      .channel(`presence-${coupleId}`)
      .on("broadcast", { event: "presence" }, (payload) => {
        const data = payload.payload as PresenceState;

        // Only track partner's presence, not self
        if (data.userId !== userId) {
          setIsPartnerOnline(data.online);
          setPartnerLastSeen(data.lastSeen || null);

          // Auto-mark offline after 45 seconds of no updates
          if (data.online) {
            setTimeout(() => {
              setIsPartnerOnline(false);
            }, 45000);
          }
        }
      })
      .subscribe();

    // Send offline status when leaving
    return () => {
      const offlineChannel = supabase.channel(`presence-${coupleId}`);
      offlineChannel.send({
        type: "broadcast",
        event: "presence",
        payload: { userId, online: false, lastSeen: new Date().toISOString() },
      });
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [coupleId, userId, supabase, updatePresence]);

  return {
    isPartnerOnline,
    partnerLastSeen,
    updatePresence,
  };
}
