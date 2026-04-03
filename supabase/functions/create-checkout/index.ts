import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    user_id: string;
    price_id: string;
    success_url: string;
    cancel_url: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { user_id, price_id, success_url, cancel_url } = body;

  if (!user_id || !price_id) {
    return new Response(JSON.stringify({ error: "user_id and price_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user_id)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user_id)
        .single();

      const createCustomerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          email: profile?.email ?? "unknown@example.com",
          name: profile?.full_name ?? "",
          metadata: `{ "user_id": "${user_id}" }`
        }).toString()
      });

      const customerData = await createCustomerRes.json();
      if (customerData.error) {
        throw new Error(customerData.error.message);
      }

      customerId = customerData.id;

      await supabase
        .from("subscriptions")
        .upsert({
          user_id: user_id,
          plan_id: "free",
          stripe_customer_id: customerId,
          status: "active"
        }, { onConflict: "user_id" });
    }

    const checkoutRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "customer": customerId,
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "mode": "subscription",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata[user_id]": user_id
      }).toString()
    });

    const checkoutData = await checkoutRes.json();
    if (checkoutData.error) {
      throw new Error(checkoutData.error.message);
    }

    return new Response(JSON.stringify({ url: checkoutData.url }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
