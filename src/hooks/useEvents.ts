import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/supabase/types";

export interface UseEventsOptions {
  category?: string;
  categories?: string[]; // filtro multi-categoria (interessi)
  search?: string;
  city?: string;
  limit?: number;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  dateFrom?: string;
  dateTo?: string;
  creatorId?: string;
  sortBy?: "date" | "trending" | "nearby";
  userLat?: number;
  userLng?: number;
}

async function fetchEvents(opts: UseEventsOptions): Promise<Event[]> {
  const supabase = createClient();

  let query = supabase
    .from("events")
    .select("*")
    .eq("visibility", "public")
    .order("starts_at", { ascending: true });

  // Only show upcoming events by default
  if (!opts.dateFrom) {
    query = query.gte("starts_at", new Date().toISOString());
  } else {
    query = query.gte("starts_at", opts.dateFrom);
  }

  if (opts.dateTo) {
    query = query.lte("starts_at", opts.dateTo);
  }

  if (opts.category) {
    query = query.eq("category", opts.category);
  } else if (opts.categories && opts.categories.length > 0) {
    query = query.in("category", opts.categories);
  }

  if (opts.search) {
    query = query.or(
      `title.ilike.%${opts.search}%,description.ilike.%${opts.search}%,city.ilike.%${opts.search}%,venue_name.ilike.%${opts.search}%`
    );
  }

  if (opts.city) {
    query = query.ilike("city", `%${opts.city}%`);
  }

  if (opts.creatorId) {
    query = query.eq("creator_id", opts.creatorId);
  }

  // Bounding box filter for map
  if (opts.bbox) {
    const [minLng, minLat, maxLng, maxLat] = opts.bbox;
    query = query
      .gte("longitude", minLng)
      .lte("longitude", maxLng)
      .gte("latitude", minLat)
      .lte("latitude", maxLat);
  }

  // Per trending, fetch più dati (max 200) e poi ordina in JS
  const effectiveLimit =
    opts.sortBy === "trending" ? 200 : (opts.limit ?? 200);
  query = query.limit(effectiveLimit);

  const { data, error } = await query;
  if (error) throw error;

  const results: Event[] = data ?? [];

  // Sorting lato client
  if (opts.sortBy === "trending") {
    const { data: rsvpRows } = await supabase
      .from("event_rsvps")
      .select("event_id");

    const countMap: Record<string, number> = {};
    rsvpRows?.forEach((r: { event_id: string }) => {
      countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
    });

    results.sort(
      (a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0)
    );

    // Rispetta il limit richiesto dopo il re-sort
    if (opts.limit && results.length > opts.limit) {
      return results.slice(0, opts.limit);
    }
  } else if (
    opts.sortBy === "nearby" &&
    opts.userLat !== undefined &&
    opts.userLng !== undefined
  ) {
    const userLat = opts.userLat;
    const userLng = opts.userLng;

    results.sort((a, b) => {
      const da = Math.hypot(
        (a.latitude ?? 0) - userLat,
        (a.longitude ?? 0) - userLng
      );
      const db = Math.hypot(
        (b.latitude ?? 0) - userLat,
        (b.longitude ?? 0) - userLng
      );
      return da - db;
    });
  }

  return results;
}

export function useEvents(opts: UseEventsOptions) {
  const key = JSON.stringify({ type: "events", ...opts });

  const { data, error, isLoading, mutate } = useSWR<Event[]>(
    key,
    () => fetchEvents(opts),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    events: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
