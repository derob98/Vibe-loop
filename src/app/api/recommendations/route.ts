import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurata" },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch profilo utente (interessi)
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const interests: string[] =
      (profile?.preferences as Record<string, unknown>)?.interests as string[] ?? [];

    // 2. Fetch RSVP recenti
    const { data: rsvps } = await supabase
      .from("event_rsvps")
      .select("created_at, events!inner(id, title, category, city, starts_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const rsvpHistory = (rsvps ?? []).map((r: Record<string, unknown>) => ({
      title: (r.events as Record<string, unknown>)?.title ?? "",
      category: (r.events as Record<string, unknown>)?.category ?? "",
      city: (r.events as Record<string, unknown>)?.city ?? "",
    }));

    // 3. Fetch eventi candidati (prossimi 14 giorni)
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: candidates } = await supabase
      .from("events")
      .select("id, title, category, city, starts_at")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", twoWeeksLater.toISOString())
      .eq("visibility", "public")
      .limit(100);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // 4. Chiama Claude per classificare
    const systemPrompt = `Sei un motore di raccomandazione eventi. Analizza gli interessi dell'utente e la sua storia di partecipazione, poi classifica gli eventi candidati per rilevanza personale.

Rispondi SOLO con un JSON array valido, senza altri testi. Formato: [{"event_id": "uuid", "score": 0.0-1.0, "reason": "breve motivazione in italiano"}]`;

    const userPrompt = `Interessi utente: ${interests.join(", ") || "nessuno specificato"}

Storia RSVP recente:
${rsvpHistory.map((r) => `- ${r.title} (${r.category}, ${r.city})`).join("\n") || "nessuna"}

Eventi candidati (prossimi 14 giorni):
${candidates.map((e) => `${e.id}|${e.title}|${e.category}|${e.city}|${e.starts_at}`).join("\n")}

Restituisci i TOP 10 eventi più rilevanti per quest'utente.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return NextResponse.json(
        { error: `Claude API error: ${claudeRes.status} - ${errText}` },
        { status: 502 }
      );
    }

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content?.[0]?.text ?? "";

    let recommendations: Array<{
      event_id: string;
      score: number;
      reason: string;
    }> = [];

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("[recommendations] Failed to parse Claude response");
    }

    if (recommendations.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // 5. Salva raccomandazioni (delete + insert via user session con nuove RLS)
    await supabase
      .from("recommendations")
      .delete()
      .eq("user_id", user.id);

    const insertRows = recommendations.map((rec) => ({
      user_id: user.id,
      event_id: rec.event_id,
      score: rec.score,
      reason: rec.reason,
    }));

    const { error: insertError } = await supabase
      .from("recommendations")
      .upsert(insertRows, { onConflict: "user_id,event_id" });

    if (insertError) {
      console.error("[recommendations] Insert error:", insertError.message);
    }

    return NextResponse.json({ recommendations });
  } catch (e) {
    console.error("[recommendations] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
