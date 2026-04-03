-- RLS policies per recommendations: users can manage their own
CREATE POLICY "users_insert_own_recommendations" ON public.recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_recommendations" ON public.recommendations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_recommendations" ON public.recommendations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Event Analytics table
CREATE TABLE IF NOT EXISTS public.event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('view', 'rsvp', 'save', 'share', 'unsave', 'unrsvp')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_analytics_event ON public.event_analytics(event_id, action);
CREATE INDEX idx_event_analytics_user ON public.event_analytics(user_id);
CREATE INDEX idx_event_analytics_created ON public.event_analytics(created_at DESC);

ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert analytics
CREATE POLICY "authenticated_insert_analytics" ON public.event_analytics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Event creators can read analytics for their events
CREATE POLICY "creators_read_event_analytics" ON public.event_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_analytics.event_id
      AND events.creator_id = auth.uid()
    )
  );

-- Users can read their own analytics
CREATE POLICY "users_read_own_analytics" ON public.event_analytics
  FOR SELECT USING (auth.uid() = user_id);
