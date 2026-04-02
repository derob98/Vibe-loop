-- ============================================================
-- Vibe-Loop — Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username       TEXT UNIQUE,
  full_name      TEXT,
  bio            TEXT,
  avatar_url     TEXT,
  city           TEXT,
  website        TEXT,
  country        TEXT,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  is_public      BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  preferences    JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)), ' ', '_'))
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  description      TEXT,
  category         TEXT,
  visibility       TEXT NOT NULL DEFAULT 'public'
                     CHECK (visibility IN ('public', 'private', 'friends')),
  source_url       TEXT,
  source_name      TEXT,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ,
  timezone         TEXT NOT NULL DEFAULT 'Europe/Rome',
  venue_name       TEXT,
  address_line     TEXT,
  city             TEXT,
  region           TEXT,
  country          TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  geom             JSONB,
  location         JSONB,
  cover_image_url  TEXT,
  price_label      TEXT,
  external_id      TEXT,
  normalized_hash  TEXT UNIQUE,
  search_document  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_category  ON public.events (category);
CREATE INDEX IF NOT EXISTS idx_events_city      ON public.events (city);
CREATE INDEX IF NOT EXISTS idx_events_creator   ON public.events (creator_id);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events (visibility);
CREATE INDEX IF NOT EXISTS idx_events_geo ON public.events (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON public.events USING GIN (title gin_trgm_ops);

-- ============================================================
-- EVENT RSVPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   UUID REFERENCES public.events(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'going'
               CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON public.event_rsvps (event_id);

-- ============================================================
-- EVENT SAVES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_saves (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_user ON public.event_saves (user_id);

-- ============================================================
-- CHAT ROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type       TEXT NOT NULL DEFAULT 'event'
               CHECK (type IN ('event', 'group', 'dm')),
  event_id   UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHAT ROOM MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  room_id      UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('owner', 'admin', 'member')),
  last_read_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id    UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON public.chat_messages (room_id, created_at);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id, status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read, created_at);

-- ============================================================
-- INGESTION SOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ingestion_sources (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('rss', 'api', 'scraper', 'manual')),
  feed_url   TEXT,
  city       TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INGESTION RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_id      UUID REFERENCES public.ingestion_sources(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'completed', 'failed')),
  items_seen     INTEGER DEFAULT 0,
  items_created  INTEGER DEFAULT 0,
  items_updated  INTEGER DEFAULT 0,
  error_message  TEXT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_saves      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs   ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_public = TRUE OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- EVENTS policies
CREATE POLICY "Public events visible to all"
  ON public.events FOR SELECT
  USING (
    visibility = 'public'
    OR creator_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

CREATE POLICY "Creators can update own events"
  ON public.events FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete own events"
  ON public.events FOR DELETE
  USING (creator_id = auth.uid());

-- EVENT_RSVPS policies
CREATE POLICY "Users see own RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own RSVPs"
  ON public.event_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- EVENT_SAVES policies
CREATE POLICY "Users manage own saves"
  ON public.event_saves FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CHAT_ROOMS policies
CREATE POLICY "Room members can view rooms"
  ON public.chat_rooms FOR SELECT
  USING (
    type = 'event'
    OR EXISTS (
      SELECT 1 FROM public.chat_room_members
      WHERE room_id = id AND user_id = auth.uid()
    )
  );

-- CHAT_MESSAGES policies
CREATE POLICY "Room members can view messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      LEFT JOIN public.chat_room_members crm ON crm.room_id = cr.id AND crm.user_id = auth.uid()
      WHERE cr.id = room_id AND (cr.type = 'event' OR crm.user_id IS NOT NULL)
    )
  );

CREATE POLICY "Authenticated users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND sender_id = auth.uid());

-- FRIENDSHIPS policies
CREATE POLICY "Users see own friendships"
  ON public.friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users manage own friendship requests"
  ON public.friendships FOR ALL
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());

-- NOTIFICATIONS policies
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- INGESTION tables — service role only (no public access)
CREATE POLICY "Service role only for ingestion_sources"
  ON public.ingestion_sources FOR ALL
  USING (FALSE);

CREATE POLICY "Service role only for ingestion_runs"
  ON public.ingestion_runs FOR ALL
  USING (FALSE);

-- ============================================================
-- UPDATED_AT triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RSVP COUNT VIEW (conveniente per l'UI)
-- ============================================================
CREATE OR REPLACE VIEW public.event_rsvp_counts AS
SELECT
  event_id,
  COUNT(*) FILTER (WHERE status = 'going')     AS going_count,
  COUNT(*) FILTER (WHERE status = 'maybe')     AS maybe_count,
  COUNT(*) FILTER (WHERE status = 'not_going') AS not_going_count
FROM public.event_rsvps
GROUP BY event_id;
