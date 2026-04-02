import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const STALE_HOURS = 6;

interface RecommendationEvent {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  city: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Recommendation {
  event_id: string;
  score: number;
  reason: string | null;
  event: RecommendationEvent;
}

interface RecommendationRow {
  event_id: string;
  score: number;
  reason: string | null;
  created_at: string;
  events: RecommendationEvent;
}

function isStale(rows: RecommendationRow[]): boolean {
  if (rows.length === 0) return true;
  const oldest = rows[0].created_at;
  const ageMs = Date.now() - new Date(oldest).getTime();
  return ageMs > STALE_HOURS * 60 * 60 * 1000;
}

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRecommendations([]);
      setLoading(false);
      return null;
    }

    const { data, error } = await supabase
      .from("recommendations")
      .select(
        "event_id, score, reason, created_at, events!inner(id, title, description, category, city, starts_at, ends_at, cover_image_url, latitude, longitude)"
      )
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[useRecommendations] fetch error:", error.message);
      setLoading(false);
      return null;
    }

    const rows = (data ?? []) as unknown as RecommendationRow[];

    const mapped: Recommendation[] = rows.map((r) => ({
      event_id: r.event_id,
      score: r.score,
      reason: r.reason,
      event: r.events,
    }));

    setRecommendations(mapped);
    setLoading(false);

    return { rows, userId: user.id };
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setRefreshing(true);

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!res.ok) {
        console.error(
          "[useRecommendations] refresh API error:",
          res.statusText
        );
      }

      await fetchRecommendations();
    } catch (err) {
      console.error("[useRecommendations] refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchRecommendations]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const result = await fetchRecommendations();
      if (cancelled || !result) return;

      if (isStale(result.rows)) {
        await refresh();
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [fetchRecommendations, refresh]);

  return { recommendations, loading, refreshing, refresh };
}
