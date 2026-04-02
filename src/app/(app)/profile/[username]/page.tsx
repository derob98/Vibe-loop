"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Link as LinkIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { BadgePro } from "@/components/ui/BadgePro";
import { FriendButton } from "@/components/ui/FriendButton";
import { EventCard } from "@/components/ui/EventCard";
import { createClient } from "@/lib/supabase/client";
import { useFriendship } from "@/hooks/useFriendship";
import { useSubscription } from "@/hooks/useSubscription";
import type { Profile, Event } from "@/lib/supabase/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const { isPro } = useSubscription();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { status, loading: friendLoading, sendRequest, acceptRequest, declineRequest, removeOrCancel } =
    useFriendship(profile?.id ?? null, currentUserId);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (!p) {
        setLoading(false);
        return;
      }
      setProfile(p);

      // Carica eventi pubblici creati da questo utente
      const { data: evs } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", p.id)
        .eq("visibility", "public")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6);
      setEvents(evs ?? []);

      // Conta amici
      const { count } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${p.id},addressee_id.eq.${p.id}`)
        .eq("status", "accepted");
      setFriendCount(count ?? 0);

      setLoading(false);
    }
    load();
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">😢</p>
        <p className="text-white/60">Profilo non trovato</p>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Torna indietro
        </Button>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative h-40 bg-gradient-to-br from-violet-900 via-purple-900 to-cyan-900">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 glass rounded-xl text-white"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Profile content */}
      <div className="px-4 max-w-lg mx-auto -mt-12 relative">
        {/* Avatar + actions */}
        <div className="flex items-end justify-between mb-4">
          <div className="ring-4 ring-[#0a0a0f] rounded-full">
            <Avatar
              src={profile.avatar_url}
              name={profile.full_name ?? profile.username}
              size="xl"
            />
          </div>
          {!isOwnProfile && currentUserId && (
            <FriendButton
              status={status}
              loading={friendLoading}
              onSend={sendRequest}
              onAccept={acceptRequest}
              onDecline={declineRequest}
              onRemove={removeOrCancel}
            />
          )}
          {isOwnProfile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/profile")}
            >
              Modifica
            </Button>
          )}
        </div>

        {/* Name + bio */}
        <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
          {profile.full_name ?? profile.username}
          {isPro && <BadgePro size="sm" />}
        </h1>
        {profile.username && (
          <p className="text-white/50 text-sm mt-0.5">@{profile.username}</p>
        )}
        {profile.bio && (
          <p className="text-white/70 text-sm mt-3 leading-relaxed">{profile.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-white/40">
          {(profile.city || profile.country) && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {[profile.city, profile.country].filter(Boolean).join(", ")}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-violet-400 transition-colors"
            >
              <LinkIcon size={11} />
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            Membro dal{" "}
            {format(new Date(profile.created_at), "MMMM yyyy", { locale: it })}
          </span>
        </div>

        {/* Stats */}
        <div className="glass rounded-2xl p-4 mt-5 grid grid-cols-3 divide-x divide-white/8">
          <div className="text-center pr-4">
            <p className="font-bold text-white text-lg">{events.length}</p>
            <p className="text-xs text-white/40">Eventi</p>
          </div>
          <div className="text-center px-4">
            <p className="font-bold text-white text-lg">{friendCount}</p>
            <p className="text-xs text-white/40">Amici</p>
          </div>
          <div className="text-center pl-4">
            <div className="flex items-center justify-center gap-1">
              {profile.is_verified && (
                <span className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                  ✓
                </span>
              )}
              <p className="font-bold text-white text-lg">
                {profile.is_verified ? "Pro" : "Free"}
              </p>
            </div>
            <p className="text-xs text-white/40">Piano</p>
          </div>
        </div>

        {/* Prossimi eventi */}
        {events.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-white flex items-center gap-2">
                <Calendar size={16} className="text-violet-400" />
                Prossimi eventi
              </h2>
              <span className="text-xs text-white/30">{events.length} in programma</span>
            </div>
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && !loading && (
          <div className="mt-6 glass rounded-xl p-6 text-center">
            <Users size={24} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">Nessun evento in programma</p>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
