import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type AnalyticsAction = "view" | "rsvp" | "save" | "share" | "unsave" | "unrsvp";

interface AnalyticsSummary {
  totalViews: number;
  uniqueViews: number;
  totalRsvps: number;
  totalSaves: number;
  totalShares: number;
  viewsByDay: { date: string; count: number }[];
}

export function useEventAnalytics(eventId: string | null) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("event_analytics")
      .select("action, user_id, created_at")
      .eq("event_id", eventId);

    if (error) {
      console.error("[useEventAnalytics] fetch error:", error.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];

    const views = rows.filter((r) => r.action === "view");
    const uniqueUserIds = new Set(views.map((r) => r.user_id).filter(Boolean));

    // Views by day (last 14 days)
    const dayMap = new Map<string, number>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const v of views) {
      const day = v.created_at.slice(0, 10);
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      }
    }

    const netRsvps = rows.filter((r) => r.action === "rsvp").length -
      rows.filter((r) => r.action === "unrsvp").length;
    const netSaves = rows.filter((r) => r.action === "save").length -
      rows.filter((r) => r.action === "unsave").length;

    setSummary({
      totalViews: views.length,
      uniqueViews: uniqueUserIds.size,
      totalRsvps: Math.max(0, netRsvps),
      totalSaves: Math.max(0, netSaves),
      totalShares: rows.filter((r) => r.action === "share").length,
      viewsByDay: Array.from(dayMap.entries()).map(([date, count]) => ({
        date,
        count,
      })),
    });
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, refresh: fetchSummary };
}

export function useTrackEvent() {
  const track = useCallback(
    async (eventId: string, action: AnalyticsAction, metadata?: Record<string, string>) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await supabase.from("event_analytics").insert({
        event_id: eventId,
        user_id: user.id,
        action,
        metadata: (metadata ?? {}) as import("@/lib/supabase/types").Json,
      });
    },
    []
  );

  return { track };
}
