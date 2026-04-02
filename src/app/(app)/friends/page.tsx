"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserCheck, UserX, Users, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import toast from "react-hot-toast";
import Link from "next/link";

interface FriendRequest {
  requester_id: string;
  created_at: string;
  profile: Profile;
}

interface Friend {
  id: string;
  profile: Profile;
}

function FriendsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const initialTab = (searchParams.get("tab") as "friends" | "requests" | "search") ?? "friends";
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"friends" | "requests" | "search">(initialTab);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    setCurrentUserId(user.id);

    // Amici accettati
    const { data: fships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (fships && fships.length > 0) {
      const otherIds = fships.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherIds);
      setFriends(
        (profiles ?? []).map((p) => ({ id: p.id, profile: p }))
      );
    } else {
      setFriends([]);
    }

    // Richieste ricevute
    const { data: reqs } = await supabase
      .from("friendships")
      .select("requester_id, created_at")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (reqs && reqs.length > 0) {
      const requesterIds = reqs.map((r) => r.requester_id);
      const { data: reqProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", requesterIds);
      setRequests(
        reqs.map((r) => ({
          requester_id: r.requester_id,
          created_at: r.created_at,
          profile: (reqProfiles ?? []).find((p) => p.id === r.requester_id)!,
        })).filter((r) => r.profile)
      );
    } else {
      setRequests([]);
    }

    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccept = async (requesterId: string) => {
    if (!currentUserId) return;
    setActionLoading(requesterId);
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester_id", requesterId)
      .eq("addressee_id", currentUserId);
    toast.success("Amicizia accettata! 🎉");
    setRequests((prev) => prev.filter((r) => r.requester_id !== requesterId));
    setActionLoading(null);
    await loadData();
  };

  const handleDecline = async (requesterId: string) => {
    if (!currentUserId) return;
    setActionLoading(requesterId);
    await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("requester_id", requesterId)
      .eq("addressee_id", currentUserId);
    toast("Richiesta rifiutata");
    setRequests((prev) => prev.filter((r) => r.requester_id !== requesterId));
    setActionLoading(null);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUserId) return;
    setActionLoading(friendId);
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${currentUserId})`
      );
    toast("Amicizia rimossa");
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    setActionLoading(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUserId) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${searchQuery}%`)
      .neq("id", currentUserId)
      .eq("is_public", true)
      .limit(10);
    setSearchResults(data ?? []);
  };

  const handleSendRequest = async (targetId: string) => {
    if (!currentUserId) return;
    setActionLoading(targetId);
    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: targetId,
      status: "pending",
    });
    if (error) {
      toast.error("Richiesta già inviata o errore");
    } else {
      toast.success("Richiesta inviata! 🙌");
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
          <Users size={22} className="text-violet-400" />
          Amici
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("friends")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "friends"
              ? "bg-violet-600 text-white"
              : "glass text-white/50 hover:text-white"
          }`}
        >
          Amici ({friends.length})
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`relative flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "requests"
              ? "bg-violet-600 text-white"
              : "glass text-white/50 hover:text-white"
          }`}
        >
          Richieste
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("search")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "search"
              ? "bg-violet-600 text-white"
              : "glass text-white/50 hover:text-white"
          }`}
        >
          <Search size={14} className="inline mr-1" />
          Cerca
        </button>
      </div>

      {/* Amici */}
      {tab === "friends" && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <Users size={28} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm mb-3">Nessun amico ancora</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setTab("search")}
              >
                <UserPlus size={14} />
                Cerca persone
              </Button>
            </div>
          ) : (
            friends.map(({ id, profile: p }) => (
              <div key={id} className="glass rounded-xl p-4 flex items-center gap-3">
                <Link href={`/profile/${p.username ?? p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={p.avatar_url} name={p.full_name ?? p.username} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm truncate">
                      {p.full_name ?? p.username}
                    </p>
                    {p.username && (
                      <p className="text-xs text-white/40 truncate">@{p.username}</p>
                    )}
                    {p.city && (
                      <p className="text-xs text-white/30 truncate">{p.city}</p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleRemoveFriend(id)}
                  disabled={actionLoading === id}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  Rimuovi
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Richieste */}
      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <UserPlus size={28} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">Nessuna richiesta in attesa</p>
            </div>
          ) : (
            requests.map(({ requester_id, profile: p }) => (
              <div key={requester_id} className="glass rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/profile/${p.username ?? p.id}`}>
                    <Avatar src={p.avatar_url} name={p.full_name ?? p.username} size="md" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">
                      {p.full_name ?? p.username}
                    </p>
                    {p.username && (
                      <p className="text-xs text-white/40">@{p.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    loading={actionLoading === requester_id}
                    onClick={() => handleAccept(requester_id)}
                  >
                    <UserCheck size={14} />
                    Accetta
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    loading={actionLoading === requester_id}
                    onClick={() => handleDecline(requester_id)}
                  >
                    <UserX size={14} />
                    Rifiuta
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cerca */}
      {tab === "search" && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Cerca per username..."
              className="flex-1 glass rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-500/50 bg-transparent"
            />
            <Button variant="primary" size="sm" onClick={handleSearch}>
              <Search size={15} />
            </Button>
          </div>

          <div className="space-y-3">
            {searchResults.map((p) => {
              const isFriend = friends.some((f) => f.id === p.id);
              return (
                <div key={p.id} className="glass rounded-xl p-4 flex items-center gap-3">
                  <Link href={`/profile/${p.username ?? p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={p.avatar_url} name={p.full_name ?? p.username} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        {p.full_name ?? p.username}
                      </p>
                      {p.username && (
                        <p className="text-xs text-white/40 truncate">@{p.username}</p>
                      )}
                    </div>
                  </Link>
                  {!isFriend ? (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading === p.id}
                      onClick={() => handleSendRequest(p.id)}
                    >
                      <UserPlus size={13} />
                      Aggiungi
                    </Button>
                  ) : (
                    <span className="text-xs text-violet-400 flex items-center gap-1">
                      <UserCheck size={13} />
                      Amici
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    }>
      <FriendsContent />
    </Suspense>
  );
}
