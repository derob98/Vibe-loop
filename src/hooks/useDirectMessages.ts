"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DirectMessage, Profile } from "@/lib/supabase/types";

export interface ConversationItem {
  friend: Profile;
  lastMessage: DirectMessage | null;
  unreadCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// useConversations — lista conversazioni con amici (messaggiati + non)
// ─────────────────────────────────────────────────────────────────────────────
export function useConversations(currentUserId: string | null) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    // 1. Fetch amici accettati
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(
        `requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`
      )
      .eq("status", "accepted");

    if (!friendships || friendships.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const friendIds = friendships.map((f) =>
      f.requester_id === currentUserId ? f.addressee_id : f.requester_id
    );

    // 2. Fetch profili degli amici
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds);

    if (!profiles) {
      setLoading(false);
      return;
    }

    // 3. Per ogni amico, prendi l'ultimo messaggio e il conteggio non letti
    const items: ConversationItem[] = await Promise.all(
      profiles.map(async (friend) => {
        const { data: lastMsgs } = await supabase
          .from("direct_messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${currentUserId})`
          )
          .order("created_at", { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", currentUserId)
          .eq("sender_id", friend.id)
          .eq("is_read", false);

        return {
          friend,
          lastMessage: lastMsgs?.[0] ?? null,
          unreadCount: count ?? 0,
        };
      })
    );

    // Ordina: prima chi ha messaggi (per recenza), poi chi non ha messaggi
    items.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return (
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
      );
    });

    setConversations(items);
    setLoading(false);
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime: aggiorna la lista quando arrivano nuovi messaggi
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`conversations:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  return { conversations, loading, refresh: fetchConversations };
}

// ─────────────────────────────────────────────────────────────────────────────
// useMessages — messaggi di una conversazione specifica + realtime
// ─────────────────────────────────────────────────────────────────────────────
export function useMessages(
  currentUserId: string | null,
  friendId: string | null
) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !friendId) return;

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true })
      .limit(50);

    setMessages(data ?? []);
    setLoading(false);
  }, [currentUserId, friendId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(async () => {
    if (!currentUserId || !friendId) return;

    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", friendId)
      .eq("is_read", false);
  }, [currentUserId, friendId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUserId || !friendId) return;
    setLoading(true);
    fetchMessages().then(() => markAsRead());
  }, [currentUserId, friendId, fetchMessages, markAsRead]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUserId || !friendId) return;

    const channelName = `dm:${[currentUserId, friendId].sort().join("-")}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          const isRelevant =
            (msg.sender_id === currentUserId && msg.receiver_id === friendId) ||
            (msg.sender_id === friendId && msg.receiver_id === currentUserId);

          if (isRelevant) {
            setMessages((prev) => {
              // Evita duplicati
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Marca come letto se sono il destinatario
            if (msg.receiver_id === currentUserId) {
              void supabase
                .from("direct_messages")
                .update({ is_read: true })
                .eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, friendId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!currentUserId || !friendId || !content.trim()) return false;

      setSending(true);
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: currentUserId,
        receiver_id: friendId,
        content: content.trim(),
      });
      setSending(false);

      return !error;
    },
    [currentUserId, friendId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { messages, loading, sending, sendMessage };
}
