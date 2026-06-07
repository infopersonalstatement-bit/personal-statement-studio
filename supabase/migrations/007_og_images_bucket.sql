-- Bucket pubblico per le OG images (anteprime social)
INSERT INTO storage.buckets (id, name, public)
VALUES ('og-images', 'og-images', true)
ON CONFLICT (id) DO NOTHING;

-- Chiunque può leggere (servono per i meta tag Open Graph)
CREATE POLICY "og_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'og-images');

-- Solo service_role può scrivere (caricamento via API server-side)
CREATE POLICY "og_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'og-images'
    AND auth.role() = 'service_role'
  );

-- Solo service_role può eliminare
CREATE POLICY "og_images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'og-images'
    AND auth.role() = 'service_role'
  );
