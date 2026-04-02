"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  MapPin,
  Globe,
  Bookmark,
  Calendar,
  LogOut,
  Users,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/ui/EventCard";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Event } from "@/lib/supabase/types";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "saved">("upcoming");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Profilo
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p ?? null);

      // Eventi futuri a cui parteciperò
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("status", "going");

      if (rsvps && rsvps.length > 0) {
        const eventIds = rsvps.map((r) => r.event_id);
        const { data: evs } = await supabase
          .from("events")
          .select("*")
          .in("id", eventIds)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(10);
        setUpcomingEvents(evs ?? []);
      }

      // Salvati
      const { data: saves } = await supabase
        .from("event_saves")
        .select("event_id")
        .eq("user_id", user.id);

      if (saves && saves.length > 0) {
        const savedIds = saves.map((s) => s.event_id);
        const { data: savedEvs } = await supabase
          .from("events")
          .select("*")
          .in("id", savedIds)
          .order("starts_at", { ascending: true })
          .limit(10);
        setSavedEvents(savedEvs ?? []);
      }

      // Amici accettati
      const { count: fc } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      setFriendCount(fc ?? 0);

      // Richieste in attesa ricevute
      const { count: pc } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending");
      setPendingCount(pc ?? 0);

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Arrivederci! 👋");
    router.push("/auth");
    router.refresh();
  };

  const displayName =
    profile?.full_name ?? profile?.username ?? "Utente";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-white/60 text-center">Accedi per vedere il tuo profilo</p>
        <Button variant="primary" onClick={() => router.push("/auth")} className="w-full max-w-xs">
          Accedi o Registrati
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Profilo</h1>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Link
              href="/friends?tab=requests"
              className="relative w-9 h-9 glass rounded-xl flex items-center justify-center text-violet-400"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {pendingCount}
              </span>
            </Link>
          )}
          <Link
            href="/profile/edit"
            className="w-9 h-9 glass rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <Settings size={18} />
          </Link>
        </div>
      </div>

      {/* Profile card */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <Avatar src={profile.avatar_url} name={displayName} size="xl" />
          <div className="flex-1">
            <h2 className="font-heading font-bold text-xl text-white">{displayName}</h2>
            {profile.username && (
              <p className="text-sm text-white/50 mt-0.5">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-xs text-white/50 mt-1 line-clamp-2">{profile.bio}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {profile.city}
                </span>
              )}
              {profile.website && (
                <span className="flex items-center gap-1">
                  <Globe size={11} />
                  {profile.website.replace(/^https?:\/\//, "")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/8 text-center">
          <div className="flex-1">
            <p className="font-bold text-white">{upcomingEvents.length}</p>
            <p className="text-xs text-white/40">Prossimi</p>
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{friendCount}</p>
            <p className="text-xs text-white/40">Amici</p>
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{savedEvents.length}</p>
            <p className="text-xs text-white/40">Salvati</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "upcoming"
              ? "bg-violet-600 text-white"
              : "glass text-white/50 hover:text-white"
          }`}
        >
          <Calendar size={14} className="inline mr-1.5" />
          Prossimi
        </button>
        <button
          onClick={() => setTab("saved")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "saved"
              ? "bg-violet-600 text-white"
              : "glass text-white/50 hover:text-white"
          }`}
        >
          <Bookmark size={14} className="inline mr-1.5" />
          Salvati
        </button>
      </div>

      {/* Events list */}
      {tab === "upcoming" && (
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <Calendar size={24} className="text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">Nessun evento in programma</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/map")}
                className="mt-3"
              >
                Scopri eventi
              </Button>
            </div>
          ) : (
            upcomingEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} variant="compact" />
            ))
          )}
        </div>
      )}

      {tab === "saved" && (
        <div className="space-y-3">
          {savedEvents.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <Bookmark size={24} className="text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">Nessun evento salvato</p>
            </div>
          ) : (
            savedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} variant="compact" />
            ))
          )}
        </div>
      )}

      {/* Amici in attesa */}
      {pendingCount > 0 && (
        <div className="mt-6 glass rounded-xl p-4 border border-violet-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <Users size={16} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {pendingCount} {pendingCount === 1 ? "richiesta di amicizia" : "richieste di amicizia"}
              </p>
              <p className="text-xs text-white/40">In attesa di risposta</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full text-red-400 hover:bg-red-500/10"
        >
          <LogOut size={16} />
          Esci dall&apos;account
        </Button>
      </div>
    </div>
  );
}
