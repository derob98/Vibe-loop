"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { clsx } from "clsx";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useDirectMessages";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const friendId = typeof params.userId === "string" ? params.userId : null;

  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useMessages(
    user?.id ?? null,
    friendId
  );

  const [friend, setFriend] = useState<Profile | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Fetch profilo amico
  useEffect(() => {
    if (!friendId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", friendId)
      .single()
      .then(({ data }) => {
        if (data) setFriend(data);
      });
  }, [friendId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Raggruppa messaggi per data
  const groupedMessages = messages.reduce<
    { date: string; msgs: typeof messages }[]
  >((acc, msg) => {
    const dateKey = format(new Date(msg.created_at), "dd MMMM yyyy", {
      locale: it,
    });
    const last = acc[acc.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateKey, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f]">
      {/* Header fisso */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        {friend ? (
          <>
            <Avatar
              src={friend.avatar_url}
              name={friend.full_name ?? friend.username}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {friend.full_name ?? friend.username ?? "Utente"}
              </p>
              {friend.city && (
                <p className="text-xs text-white/40">{friend.city}</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1">
            <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
          </div>
        )}
      </header>

      {/* Lista messaggi */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-violet-600/20 flex items-center justify-center mb-4">
              <Avatar
                src={friend?.avatar_url}
                name={friend?.full_name ?? friend?.username}
                size="xl"
              />
            </div>
            <p className="text-white/60 font-medium">
              {friend?.full_name ?? friend?.username ?? ""}
            </p>
            <p className="text-white/30 text-sm mt-1">
              Inizia la conversazione
            </p>
          </div>
        )}

        {groupedMessages.map(({ date, msgs }) => (
          <div key={date}>
            {/* Separatore data */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[10px] text-white/30 font-medium px-2">
                {date}
              </span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <div className="space-y-1">
              {msgs.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={clsx(
                      "flex",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={clsx(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                        isMine
                          ? "bg-violet-600 text-white rounded-br-sm"
                          : "bg-white/10 text-white/90 rounded-bl-sm"
                      )}
                    >
                      <p className="leading-relaxed break-words">
                        {msg.content}
                      </p>
                      <p
                        className={clsx(
                          "text-[10px] mt-1 text-right",
                          isMine ? "text-violet-200/70" : "text-white/30"
                        )}
                      >
                        {format(new Date(msg.created_at), "HH:mm", {
                          locale: it,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input fisso */}
      <div className="flex-shrink-0 border-t border-white/8 bg-[#0a0a0f]/90 backdrop-blur-xl px-4 py-3">
        <div className="flex items-end gap-3 max-w-lg mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            className={clsx(
              "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
              input.trim() && !sending
                ? "bg-violet-600 text-white hover:bg-violet-500 glow-violet"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
