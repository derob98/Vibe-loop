"use client";

import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, TrendingUp, Clock, MapPin, Sparkles } from "lucide-react";
import { EventCard } from "@/components/ui/EventCard";
import { EventCardSkeleton } from "@/components/ui/Skeleton";
import { useEvents } from "@/hooks/useEvents";
import { useUserInterests } from "@/hooks/useUserInterests";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/supabase/types";
import { clsx } from "clsx";
import toast from "react-hot-toast";

const CATEGORIES = ["Tutti", "Musica", "Tech", "Arte", "Food", "Sport", "Cinema", "Teatro"];
const SORT_OPTIONS = [
  { id: "date", label: "Data", icon: Clock },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "nearby", label: "Vicino", icon: MapPin },
] as const;

type SortId = typeof SORT_OPTIONS[number]["id"];

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState("Tutti");
  const [activeSort, setActiveSort] = useState<SortId>("date");
  const [search, setSearch] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [usePersonalized, setUsePersonalized] = useState(true);
  const [limit, setLimit] = useState(20);
  const [userLat, setUserLat] = useState<number | undefined>(undefined);
  const [userLng, setUserLng] = useState<number | undefined>(undefined);
  const newEventsRef = useRef<Event[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { interests, loading: interestsLoading } = useUserInterests();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setDisplayName(data?.full_name ?? data?.username ?? null);
        });
    });
  }, []);

  // Gestione click "Vicino": richiede GPS
  const handleSortClick = (id: SortId) => {
    if (id === "nearby") {
      if (!navigator.geolocation) {
        toast.error("Geolocalizzazione non supportata dal browser");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLng(position.coords.longitude);
          setActiveSort("nearby");
          setLimit(20); // reset paginazione
        },
        () => {
          toast.error("Abilita la posizione per questo filtro");
        }
      );
    } else {
      setActiveSort(id);
      setLimit(20); // reset paginazione al cambio sort
    }
  };

  // Reset limit quando cambiano filtri
  useEffect(() => {
    setLimit(20);
  }, [activeCategory, search, usePersonalized]);

  // Determina i filtri categoria da applicare
  const activeCategoryFilter =
    activeCategory === "Tutti" ? undefined : activeCategory.toLowerCase();
  const personalizedCategories =
    usePersonalized && !activeCategoryFilter && interests.length > 0
      ? interests
      : undefined;

  const { events, isLoading, mutate } = useEvents({
    category: activeCategoryFilter,
    categories: personalizedCategories,
    search,
    sortBy: activeSort,
    userLat: activeSort === "nearby" ? userLat : undefined,
    userLng: activeSort === "nearby" ? userLng : undefined,
    limit,
  });

  const hasMore = events.length === limit;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          setLimit((prev) => prev + 20);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, hasMore]);

  // Realtime: ascolta nuovi eventi e notifica
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("feed-new-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const newEv = payload.new as Event;
          // Mostra solo se matcha gli interessi (o tutti se nessun interesse)
          const matches =
            interests.length === 0 || interests.includes(newEv.category ?? "");
          if (matches) {
            newEventsRef.current = [newEv, ...newEventsRef.current];
            toast(
              (t) => (
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    mutate();
                    toast.dismiss(t.id);
                  }}
                >
                  <span>🎉</span>
                  <span className="text-sm">
                    Nuovo evento: <strong>{newEv.title}</strong>
                  </span>
                </div>
              ),
              { duration: 6000 }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interests]); // eslint-disable-line react-hooks/exhaustive-deps

  // Il hero è sempre il primo evento (fisso), la grid si espande con infinite scroll
  const heroEvent = events[0];
  const gridEvents = events.slice(1);
  const isPersonalized = usePersonalized && interests.length > 0 && !activeCategoryFilter;

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl lg:max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            {displayName ? (
              <>Ciao, <span className="gradient-text">{displayName}</span> 👋</>
            ) : (
              <>Ciao! 👋</>
            )}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {isPersonalized
              ? "Eventi selezionati per te"
              : "Cosa succede intorno a te"}
          </p>
        </div>
        {!interestsLoading && interests.length > 0 && (
          <button
            onClick={() => setUsePersonalized((v) => !v)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              usePersonalized
                ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                : "text-white/40 border-white/10 hover:text-white"
            )}
          >
            <Sparkles size={12} />
            Per te
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          placeholder="Cerca eventi, luoghi, artisti..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark pl-10 pr-10"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Sort options */}
      <div className="flex gap-2 mb-4">
        {SORT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleSortClick(id)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              activeSort === id
                ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                : "text-white/50 border-white/10 hover:text-white hover:border-white/20"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              if (cat !== "Tutti") setUsePersonalized(false);
              else setUsePersonalized(true);
            }}
            className={clsx(
              "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              activeCategory === cat
                ? "bg-violet-600 text-white border-violet-500 glow-violet"
                : "glass text-white/60 border-white/10 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Badge personalizzazione */}
      {isPersonalized && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-violet-600/10 border border-violet-500/20">
          <Sparkles size={13} className="text-violet-400" />
          <span className="text-xs text-violet-300">
            Filtrato per i tuoi interessi:{" "}
            {interests.slice(0, 4).join(", ")}
            {interests.length > 4 ? ` +${interests.length - 4}` : ""}
          </span>
        </div>
      )}

      {/* Hero card — rimane fisso al primo evento */}
      {isLoading && events.length === 0 ? (
        <div className="mb-6">
          <EventCardSkeleton />
        </div>
      ) : heroEvent ? (
        <div className="mb-6">
          <EventCard event={heroEvent} variant="hero" />
        </div>
      ) : null}

      {/* Section title */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-white">
          {activeCategory === "Tutti" ? (isPersonalized ? "Per te" : "In evidenza") : activeCategory}
        </h2>
        <span className="text-xs text-white/40">{events.length} eventi</span>
      </div>

      {/* Events grid */}
      {isLoading && events.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : gridEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gridEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Skeleton per le nuove pagine in caricamento */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <EventCardSkeleton key={`loading-${i}`} />
              ))}
            </div>
          )}

          {/* Sentinella per IntersectionObserver */}
          <div ref={sentinelRef} className="h-4 mt-4" aria-hidden="true" />

          {!hasMore && !isLoading && (
            <p className="text-center text-xs text-white/30 mt-6 mb-2">
              Hai visto tutti gli eventi disponibili
            </p>
          )}
        </>
      ) : !isLoading ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-medium">Nessun evento trovato</p>
          <p className="text-sm mt-1">
            {isPersonalized
              ? "Modifica i tuoi interessi nel profilo"
              : "Prova con un'altra categoria"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
