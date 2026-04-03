import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function log(level: "info" | "error" | "warn", message: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    function: "recommend-events",
    ...meta
  }));
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    authHeader === `Bearer ${serviceRoleKey}`;

  if (!isAuthorized) {
    log("error", "Unauthorized request");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { user_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { user_id } = body;
  if (!user_id) {
    return new Response(JSON.stringify({ error: "user_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    log("info", "Fetching user data", { user_id });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user_id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    const interests = profile?.preferences?.interests ?? [];

    const { data: rsvps, error: rsvpError } = await supabase
      .from("event_rsvps")
      .select(`
        created_at,
        events!inner(id, title, category, city, starts_at)
      `)
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (rsvpError) {
      throw new Error(`Failed to fetch RSVPs: ${rsvpError.message}`);
    }

    const rsvpHistory = (rsvps ?? []).map((r: Record<string, unknown>) => ({
      title: (r.events as Record<string, unknown>)?.title ?? "",
      category: (r.events as Record<string, unknown>)?.category ?? "",
      city: (r.events as Record<string, unknown>)?.city ?? "",
    }));

    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: candidates, error: eventsError } = await supabase
      .from("events")
      .select("id, title, category, city, starts_at")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", twoWeeksLater.toISOString())
      .eq("visibility", "public")
      .limit(100);

    if (eventsError) {
      throw new Error(`Failed to fetch candidate events: ${eventsError.message}`);
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const systemPrompt = `Sei un motore di raccomandazione eventi. Analizza gli interessi dell'utente e la sua storia di partecipazione, poi classifica gli eventi candidati per rilevanza personale.

Rispondi SOLO con un JSON array valido, senza altri testi. Formato: [{"event_id": "uuid", "score": 0.0-1.0, "reason": "breve motivazione"}]`;

    const userPrompt = `Interessi utente: ${interests.join(", ") || "nessuno"}

Storia RSVP recente:
${rsvpHistory.map((r: Record<string, string>) => `- ${r.title} (${r.category}, ${r.city})`).join("\n") || "nessuna"}

Eventi candidati (prossimi 14 giorni):
${candidates?.map((e: Record<string, unknown>) => `${e.id}|${e.title}|${e.category}|${e.city}|${e.starts_at}`).join("\n") || ""}

Restituisci i TOP 10 eventi più rilevanti per quest'utente.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} - ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content?.[0]?.text ?? "";

    let recommendations: Array<{ event_id: string; score: number; reason: string }> = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      log("warn", "Failed to parse Claude response", { responseText, error: String(parseErr) });
    }

    if (recommendations.length === 0) {
      return new Response(JSON.stringify({ error: "No recommendations generated" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    await supabase
      .from("recommendations")
      .delete()
      .eq("user_id", user_id);

    const insertRows = recommendations.map((rec) => ({
      user_id,
      event_id: rec.event_id,
      score: rec.score,
      reason: rec.reason
    }));

    const { error: insertError } = await supabase
      .from("recommendations")
      .upsert(insertRows, { onConflict: "user_id,event_id" });

    if (insertError) {
      throw new Error(`Failed to save recommendations: ${insertError.message}`);
    }

    log("info", "Recommendations generated", { user_id, count: recommendations.length });

    return new Response(JSON.stringify({ recommendations }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "Recommendation failed", { user_id, error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
