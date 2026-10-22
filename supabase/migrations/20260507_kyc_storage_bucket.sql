-- Create kyc-documents storage bucket for KYC document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  true,
  10485760, -- 10MB max
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: users can upload their own KYC docs
DO $$ BEGIN
  CREATE POLICY "kyc_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[2] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: anyone can read (docs are fetched by edge function with service role anyway)
DO $$ BEGIN
  CREATE POLICY "kyc_read_all"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'kyc-documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: users can update their own docs
DO $$ BEGIN
  CREATE POLICY "kyc_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[2] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
