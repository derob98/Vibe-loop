"use client";

import { UserPlus, UserCheck, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FriendshipStatus } from "@/hooks/useFriendship";

interface FriendButtonProps {
  status: FriendshipStatus;
  loading: boolean;
  onSend: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onRemove: () => void;
  className?: string;
}

export function FriendButton({
  status,
  loading,
  onSend,
  onAccept,
  onDecline,
  onRemove,
  className,
}: FriendButtonProps) {
  if (status === "accepted") {
    return (
      <Button
        variant="secondary"
        size="sm"
        loading={loading}
        onClick={onRemove}
        className={className}
      >
        <UserCheck size={14} />
        Amici
      </Button>
    );
  }

  if (status === "pending_sent") {
    return (
      <Button
        variant="ghost"
        size="sm"
        loading={loading}
        onClick={onRemove}
        className={className}
      >
        <Clock size={14} />
        Richiesta inviata
      </Button>
    );
  }

  if (status === "pending_received") {
    return (
      <div className={`flex gap-2 ${className ?? ""}`}>
        <Button variant="primary" size="sm" loading={loading} onClick={onAccept}>
          <UserCheck size={14} />
          Accetta
        </Button>
        <Button variant="ghost" size="sm" loading={loading} onClick={onDecline}>
          <UserX size={14} />
          Rifiuta
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      size="sm"
      loading={loading}
      onClick={onSend}
      className={className}
    >
      <UserPlus size={14} />
      Aggiungi amico
    </Button>
  );
}
