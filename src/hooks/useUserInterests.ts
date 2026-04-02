import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export const ALL_INTERESTS = [
  { id: "music", label: "Musica", emoji: "🎵" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "art", label: "Arte", emoji: "🎨" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "cinema", label: "Cinema", emoji: "🎬" },
  { id: "teatro", label: "Teatro", emoji: "🎭" },
  { id: "wellness", label: "Wellness", emoji: "🧘" },
  { id: "festival", label: "Festival", emoji: "🎪" },
  { id: "nightlife", label: "Nightlife", emoji: "🎧" },
  { id: "cultura", label: "Cultura", emoji: "📚" },
  { id: "other", label: "Altro", emoji: "✨" },
];

export function useUserInterests() {
  const [interests, setInterestsState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const prefs = data?.preferences as { interests?: string[] } | null;
          setInterestsState(prefs?.interests ?? []);
          setLoading(false);
        });
    });
  }, []);

  const saveInterests = useCallback(
    async (newInterests: string[]) => {
      if (!userId) return;
      const supabase = createClient();
      // Legge le preferenze esistenti per non sovrascrivere altri campi
      const { data } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", userId)
        .maybeSingle();
      const existing = (data?.preferences as Record<string, unknown>) ?? {};
      await supabase
        .from("profiles")
        .update({ preferences: { ...existing, interests: newInterests } })
        .eq("id", userId);
      setInterestsState(newInterests);
    },
    [userId]
  );

  return { interests, saveInterests, loading };
}
