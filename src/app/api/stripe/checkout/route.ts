import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: { plan_id?: string; interval?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { plan_id, interval = "monthly" } = body;
  if (!plan_id) {
    return NextResponse.json({ error: "plan_id richiesto" }, { status: 400 });
  }

  try {
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
    }

    const priceId = interval === "yearly" 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly;

    if (!priceId) {
      return NextResponse.json({ error: "Prezzo Stripe non configurato per questo piano" }, { status: 500 });
    }

    const stripeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`;

    const res = await fetch(stripeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
      },
      body: JSON.stringify({
        user_id: user.id,
        price_id: priceId,
        success_url: `${request.headers.get("origin") ?? ""}/pricing?success=true`,
        cancel_url: `${request.headers.get("origin") ?? ""}/pricing?canceled=true`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Stripe error: ${res.status} ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
