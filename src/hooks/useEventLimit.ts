"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

interface EventLimitData {
  monthlyCount: number;
  limit: number;
}

export function useEventLimit() {
  const [data, setData] = useState<EventLimitData>({
    monthlyCount: 0,
    limit: 5,
  });
  const [loading, setLoading] = useState(true);

  const fetchLimit = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setData({ monthlyCount: 0, limit: 5 });
      setLoading(false);
      return;
    }

    const now = new Date();
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();

    const { count, error } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) {
      console.error("Error fetching event limit:", error);
      setData({ monthlyCount: 0, limit: 5 });
    } else {
      setData({ monthlyCount: count || 0, limit: 5 });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLimit();
  }, [fetchLimit]);

  const canCreateEvent = data.monthlyCount < data.limit;
  const remaining = data.limit - data.monthlyCount;

  return {
    ...data,
    canCreateEvent,
    remaining,
    loading,
    refresh: fetchLimit,
  };
}
