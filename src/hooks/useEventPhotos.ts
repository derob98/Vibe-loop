import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventPost } from "@/lib/supabase/types";

export interface EventPhotoPin {
  post: EventPost;
  latitude: number;
  longitude: number;
  eventSlug: string;
  totalCount: number;
}

export function useEventPhotos(
  eventIds: string[],
  enabled: boolean
): { pins: EventPhotoPin[]; isLoading: boolean } {
  const [pins, setPins] = useState<EventPhotoPin[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || eventIds.length === 0) {
      setPins([]);
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    supabase
      .from("event_posts")
      .select("*, event:events(id, slug, latitude, longitude)")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) {
          setPins([]);
          setIsLoading(false);
          return;
        }

        // Raggruppa per evento, tieni solo la foto più recente + conteggio
        const byEvent = new Map<
          string,
          { post: EventPost; lat: number; lng: number; slug: string; count: number }
        >();

        for (const row of data) {
          const ev = row.event as {
            id: string;
            slug: string;
            latitude: number | null;
            longitude: number | null;
          } | null;
          if (!ev?.latitude || !ev?.longitude) continue;

          if (!byEvent.has(ev.id)) {
            byEvent.set(ev.id, {
              post: row as EventPost,
              lat: ev.latitude,
              lng: ev.longitude,
              slug: ev.slug,
              count: 1,
            });
          } else {
            byEvent.get(ev.id)!.count++;
          }
        }

        setPins(
          Array.from(byEvent.values()).map(({ post, lat, lng, slug, count }) => ({
            post,
            latitude: lat,
            longitude: lng,
            eventSlug: slug,
            totalCount: count,
          }))
        );
        setIsLoading(false);
      });
  }, [eventIds.join(","), enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pins, isLoading };
}
