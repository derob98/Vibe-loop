"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, Plus, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { clsx } from "clsx";
import { format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useDirectMessages";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm", { locale: it });
  if (isYesterday(d)) return "Ieri";
  return format(d, "dd/MM", { locale: it });
}

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, loading } = useConversations(user?.id ?? null);
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    const name =
      c.friend.full_name ?? c.friend.username ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = conversations.reduce(
    (acc, c) => acc + c.unreadCount,
    0
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Chat</h1>
            <p className="text-white/50 text-sm mt-0.5">
              {totalUnread > 0
                ? `${totalUnread} non ${totalUnread === 1 ? "letto" : "letti"}`
                : "Tutti aggiornati"}
            </p>
          </div>
          <button
            onClick={() => router.push("/friends")}
            className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-600/30 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Cerca conversazioni..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10 text-sm"
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        )}

        {/* Conversation list */}
        {!loading && (
          <div className="space-y-1">
            {filtered.map(({ friend, lastMessage, unreadCount }) => (
              <button
                key={friend.id}
                onClick={() => router.push(`/chat/${friend.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:bg-white/5"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={friend.avatar_url}
                    name={friend.full_name ?? friend.username}
                    size="md"
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-600 border-2 border-[#0a0a0f]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        "font-medium text-sm truncate",
                        unreadCount > 0 ? "text-white" : "text-white/80"
                      )}
                    >
                      {friend.full_name ?? friend.username ?? "Utente"}
                    </span>
                    {lastMessage && (
                      <span className="text-[10px] text-white/30 flex-shrink-0 ml-2">
                        {formatTime(lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p
                      className={clsx(
                        "text-xs truncate",
                        unreadCount > 0 ? "text-white/70" : "text-white/40"
                      )}
                    >
                      {lastMessage
                        ? lastMessage.content
                        : "Nessun messaggio ancora"}
                    </p>
                    {unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  {friend.city && (
                    <p className="text-[10px] text-white/20 mt-0.5">
                      {friend.city}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <MessageCircle
              size={40}
              className="mx-auto mb-3 opacity-30"
            />
            <p className="font-medium">
              {search
                ? "Nessun risultato"
                : conversations.length === 0
                ? "Nessun amico ancora"
                : "Nessuna corrispondenza"}
            </p>
            <p className="text-sm mt-1">
              {conversations.length === 0
                ? "Aggiungi amici per iniziare a chattare"
                : "Prova con un altro nome"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
