-- ============================================================
-- Create new tables without enum modifications
-- ============================================================

-- Create recommendations table
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  score FLOAT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations(user_id, score DESC);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_recommendations" ON public.recommendations;
CREATE POLICY "users_read_own_recommendations" ON public.recommendations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_role_manage_recommendations" ON public.recommendations;
CREATE POLICY "service_role_manage_recommendations" ON public.recommendations
  FOR ALL USING (true) WITH CHECK (true);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert plans (only if not exists)
INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, features)
SELECT 'free', 'Free', 0, 0, '["5 eventi/mese", "Feed base", "Chat"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = 'free')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, features)
SELECT 'pro', 'Pro', 999, 9990, '["Eventi illimitati", "AI Discovery", "Analytics base", "Badge Pro"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = 'pro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, features)
SELECT 'enterprise', 'Enterprise', 4999, 49990, '["Tutto Pro", "API access", "Analytics avanzati", "White-label", "Supporto prioritario"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = 'enterprise')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_plans" ON public.subscription_plans;
CREATE POLICY "anyone_can_read_plans" ON public.subscription_plans
  FOR SELECT USING (true);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES public.subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_subscription" ON public.subscriptions;
CREATE POLICY "users_read_own_subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_role_manage_subscriptions" ON public.subscriptions;
CREATE POLICY "service_role_manage_subscriptions" ON public.subscriptions
  FOR ALL USING (true) WITH CHECK (true);
