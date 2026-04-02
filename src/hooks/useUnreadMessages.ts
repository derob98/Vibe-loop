"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DirectMessage } from "@/lib/supabase/types";

export function useUnreadMessages(currentUserId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const fetchCount = async () => {
    if (!currentUserId) return;

    const { count } = await supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", currentUserId)
      .eq("is_read", false);

    setUnreadCount(count ?? 0);
  };

  useEffect(() => {
    if (!currentUserId) return;
    fetchCount();

    const channel = supabase
      .channel(`unread:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          if (!msg.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => {
          // Ri-fetch il conteggio quando qualcosa viene marcato come letto
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { unreadCount };
}
