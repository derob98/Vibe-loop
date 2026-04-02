-- Bucket storage per le foto dei post degli eventi
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-posts',
  'event-posts',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies per storage
CREATE POLICY "event_posts_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-posts');

CREATE POLICY "event_posts_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "event_posts_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
