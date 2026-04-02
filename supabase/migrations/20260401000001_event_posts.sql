-- Tabella post UGC legati agli eventi (foto/caption)
CREATE TABLE IF NOT EXISTS event_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_posts_event_id ON event_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_user_id ON event_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_created_at ON event_posts(created_at DESC);

ALTER TABLE event_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_posts_select_all" ON event_posts
  FOR SELECT USING (true);

CREATE POLICY "event_posts_insert_own" ON event_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_posts_delete_own" ON event_posts
  FOR DELETE USING (auth.uid() = user_id);
