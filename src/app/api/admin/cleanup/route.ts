import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/cleanup
 * Esegue il cleanup degli eventi scaduti (solo admin).
 * 
 * Body opzionale: { days: number } — default 30
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Verifica autenticazione
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // 2. Verifica admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // 3. Esegui cleanup
  try {
    const body = await request.json().catch(() => ({}));
    const days = body.days ?? 30;

    const { data, error } = await supabase.rpc("cleanup_old_events", {
      days_old: days,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const deletedCount = data?.[0]?.deleted_count ?? 0;

    return NextResponse.json({
      ok: true,
      deleted_count: deletedCount,
      days,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
