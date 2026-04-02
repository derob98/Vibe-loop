"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type FriendshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "blocked";

interface UseFriendshipReturn {
  status: FriendshipStatus;
  loading: boolean;
  sendRequest: () => Promise<void>;
  acceptRequest: () => Promise<void>;
  declineRequest: () => Promise<void>;
  removeOrCancel: () => Promise<void>;
}

export function useFriendship(
  targetUserId: string | null,
  currentUserId: string | null
): UseFriendshipReturn {
  const [status, setStatus] = useState<FriendshipStatus>("none");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchStatus = useCallback(async () => {
    if (!targetUserId || !currentUserId) return;
    if (targetUserId === currentUserId) return;

    const { data } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUserId})`
      )
      .maybeSingle();

    if (!data) {
      setStatus("none");
    } else if (data.status === "accepted") {
      setStatus("accepted");
    } else if (data.status === "blocked") {
      setStatus("blocked");
    } else if (data.requester_id === currentUserId) {
      setStatus("pending_sent");
    } else {
      setStatus("pending_received");
    }
  }, [targetUserId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const sendRequest = async () => {
    if (!targetUserId || !currentUserId) return;
    setLoading(true);
    await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
      status: "pending",
    });
    setStatus("pending_sent");
    setLoading(false);
  };

  const acceptRequest = async () => {
    if (!targetUserId || !currentUserId) return;
    setLoading(true);
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester_id", targetUserId)
      .eq("addressee_id", currentUserId);
    setStatus("accepted");
    setLoading(false);
  };

  const declineRequest = async () => {
    if (!targetUserId || !currentUserId) return;
    setLoading(true);
    await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("requester_id", targetUserId)
      .eq("addressee_id", currentUserId);
    setStatus("none");
    setLoading(false);
  };

  const removeOrCancel = async () => {
    if (!targetUserId || !currentUserId) return;
    setLoading(true);
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentUserId})`
      );
    setStatus("none");
    setLoading(false);
  };

  return { status, loading, sendRequest, acceptRequest, declineRequest, removeOrCancel };
}
