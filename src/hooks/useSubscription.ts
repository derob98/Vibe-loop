import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_end: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !sub) {
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    setSubscription(sub as SubscriptionData);

    const { data: planData } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", sub.plan_id)
      .single();

    setPlan(planData as SubscriptionPlan);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPro = plan?.id === "pro" || plan?.id === "enterprise";
  const isEnterprise = plan?.id === "enterprise";

  return {
    subscription,
    plan,
    loading,
    isPro,
    isEnterprise,
    refresh: fetchSubscription,
  };
}
