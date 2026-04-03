"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  Share2,
  Bookmark,
  BookmarkCheck,
  Users,
  ExternalLink,
  Clock,
  CheckCircle,
} from "lucide-react";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { Button } from "@/components/ui/Button";
import { EventPhotoSection } from "@/components/ui/EventPhotoSection";
import { EventAnalyticsDashboard } from "@/components/ui/EventAnalyticsDashboard";
import { useTrackEvent } from "@/hooks/useEventAnalytics";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/supabase/types";
import toast from "react-hot-toast";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const { track } = useTrackEvent();

  useEffect(() => {
    async function load() {
      // Fetch evento dal DB
      const { data: ev } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!ev) {
        setLoading(false);
        return;
      }
      setEvent(ev);

      // Utente corrente
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setIsCreator(ev.creator_id === user.id);

        // Track view
        track(ev.id, "view");

        // RSVP status
        const { data: rsvp } = await supabase
          .from("event_rsvps")
          .select("status")
          .eq("user_id", user.id)
          .eq("event_id", ev.id)
          .maybeSingle();
        setRsvpStatus(rsvp?.status ?? null);

        // Save status
        const { data: save } = await supabase
          .from("event_saves")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("event_id", ev.id)
          .maybeSingle();
        setIsSaved(!!save);
      }

      // Conteggio RSVP going
      const { count } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", ev.id)
        .eq("status", "going");
      setRsvpCount(count ?? 0);

      setLoading(false);
    }
    load();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRsvp = async () => {
    if (!userId || !event) {
      toast.error("Devi essere loggato");
      return;
    }
    setRsvpLoading(true);
    if (rsvpStatus === "going") {
      // Rimuovi RSVP
      await supabase
        .from("event_rsvps")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", event.id);
      setRsvpStatus(null);
      setRsvpCount((c) => Math.max(0, c - 1));
      track(event.id, "unrsvp");
      toast("Rimosso dalla lista partecipanti");
    } else {
      // Aggiungi RSVP
      await supabase.from("event_rsvps").upsert({
        user_id: userId,
        event_id: event.id,
        status: "going",
      });
      setRsvpStatus("going");
      setRsvpCount((c) => c + 1);
      track(event.id, "rsvp");
      toast.success("Sei iscritto! 🎉");
    }
    setRsvpLoading(false);
  };

  const handleSave = async () => {
    if (!userId || !event) {
      toast.error("Devi essere loggato");
      return;
    }
    if (isSaved) {
      await supabase
        .from("event_saves")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", event.id);
      setIsSaved(false);
      track(event.id, "unsave");
      toast("Rimosso dai salvati");
    } else {
      await supabase.from("event_saves").upsert({
        user_id: userId,
        event_id: event.id,
      });
      setIsSaved(true);
      track(event.id, "save");
      toast.success("Salvato! 🔖");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">😢</p>
        <p className="text-white/60">Evento non trovato</p>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Torna indietro
        </Button>
      </div>
    );
  }

  const startsAt = new Date(event.starts_at);
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-64 sm:h-80">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900 to-cyan-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 glass rounded-xl text-white"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              if (event) track(event.id, "share");
              toast.success("Link copiato!");
            }}
            className="p-2 glass rounded-xl text-white"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={handleSave}
            className={`p-2 glass rounded-xl transition-colors ${
              isSaved ? "text-violet-400" : "text-white"
            }`}
          >
            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 max-w-2xl mx-auto -mt-8 relative">
        <CategoryBadge category={event.category} size="md" />
        <h1 className="font-heading text-2xl font-bold text-white mt-3 leading-tight">
          {event.title}
        </h1>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-violet-400" />
            </div>
            <div>
              <p className="text-white font-medium">
                {format(startsAt, "EEEE d MMMM yyyy", { locale: it })}
              </p>
              <p className="text-white/50 text-xs">
                {format(startsAt, "HH:mm", { locale: it })}
                {endsAt && ` – ${format(endsAt, "HH:mm", { locale: it })}`}
              </p>
            </div>
          </div>

          {event.venue_name && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-xl bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-white font-medium">{event.venue_name}</p>
                <p className="text-white/50 text-xs">
                  {[event.address_line, event.city].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}

          {event.price_label && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                <Tag size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-medium">{event.price_label}</p>
              </div>
            </div>
          )}
        </div>

        {event.description && (
          <div className="mt-5">
            <h2 className="font-heading font-semibold text-white mb-2">Info</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* Partecipanti */}
        <div className="mt-5 glass rounded-xl p-4 flex items-center gap-3">
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(4, rsvpCount) }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 border-2 border-[#0a0a0f] flex items-center justify-center text-xs font-bold text-white"
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {rsvpCount > 0
                ? `${rsvpCount} ${rsvpCount === 1 ? "persona partecipa" : "persone partecipano"}`
                : "Sii il primo a partecipare!"}
            </p>
          </div>
          <Users size={16} className="ml-auto text-white/30" />
        </div>

        {event.source_url && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <ExternalLink size={12} />
            Fonte: {event.source_name ?? event.source_url}
          </a>
        )}

        {/* CTA */}
        <div className="mt-6 space-y-3 pb-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleRsvp}
            loading={rsvpLoading}
          >
            {rsvpStatus === "going" ? (
              <>
                <CheckCircle size={16} /> Partecipi già ✓
              </>
            ) : (
              <>
                <Clock size={16} /> Partecipo
              </>
            )}
          </Button>
          <Button variant="secondary" size="lg" className="w-full">
            <Users size={16} />
            Invita amici
          </Button>
        </div>

        {/* Sezione foto UGC */}
        <EventPhotoSection eventId={event.id} userId={userId} />

        {/* Analytics dashboard — solo per il creator */}
        {isCreator && <EventAnalyticsDashboard eventId={event.id} />}
      </div>
    </div>
  );
}
