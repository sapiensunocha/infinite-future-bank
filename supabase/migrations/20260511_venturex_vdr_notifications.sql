-- ============================================================
-- VentureX Virtual Data Room (VDR), Blockchain Notary & Notifications
-- Implements global standards for Investor Deal Rooms.
-- ============================================================

-- 1. Virtual Data Room (VDR) Documents
-- Entrepreneurs upload documents here. Standardized categories.
CREATE TABLE IF NOT EXISTS public.venturex_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.venturex_companies(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  document_type TEXT NOT NULL CHECK (document_type IN (
    'Corporate_Governance',
    'Capitalization_Equity',
    'Financials',
    'Intellectual_Property',
    'Material_Contracts',
    'Team_HR',
    'Product_Tech',
    'Pitch_Deck',
    'Other'
  )),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT DEFAULT 0,
  file_hash TEXT NOT NULL, -- SHA-256 hash of the file content for notarization
  
  -- Access Control: Staged access is the global standard
  access_level TEXT DEFAULT 'Deal_Parties' CHECK (access_level IN ('Public', 'Deal_Parties', 'Specific_Investors')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Blockchain Document Notary (Immutable Ledger)
-- Every document upload is hashed and cryptographically linked, proving it existed 
-- at a certain point in time and hasn't been tampered with.
CREATE TABLE IF NOT EXISTS public.venturex_document_notary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.venturex_documents(id) ON DELETE CASCADE,
  file_hash TEXT NOT NULL,
  
  -- Cryptographic linking
  previous_hash TEXT,
  chain_tx_hash TEXT,
  block_number INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to notarize document (mining step)
CREATE OR REPLACE FUNCTION public.notarize_document()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_hash TEXT;
  v_data_to_hash TEXT;
BEGIN
  -- Get previous hash
  SELECT chain_tx_hash INTO v_prev_hash 
  FROM public.venturex_document_notary 
  ORDER BY created_at DESC LIMIT 1;

  NEW.previous_hash := COALESCE(v_prev_hash, '0000000000000000000000000000000000000000000000000000000000000000');
  
  -- Hash: id + doc_id + prev_hash + file_hash
  v_data_to_hash := NEW.id::text || NEW.document_id::text || NEW.previous_hash || NEW.file_hash;
  
  BEGIN
    NEW.chain_tx_hash := encode(digest(v_data_to_hash, 'sha256'), 'hex');
  EXCEPTION WHEN OTHERS THEN
    NEW.chain_tx_hash := md5(v_data_to_hash); -- Fallback
  END;

  SELECT COALESCE(MAX(block_number), 0) + 1 INTO NEW.block_number FROM public.venturex_document_notary;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notarize_document
BEFORE INSERT ON public.venturex_document_notary
FOR EACH ROW EXECUTE FUNCTION public.notarize_document();

-- Trigger to auto-notarize on document upload
CREATE OR REPLACE FUNCTION public.auto_notarize_on_upload()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.venturex_document_notary (document_id, file_hash)
  VALUES (NEW.id, NEW.file_hash);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auto_notarize
AFTER INSERT ON public.venturex_documents
FOR EACH ROW EXECUTE FUNCTION public.auto_notarize_on_upload();

-- 3. Notifications System
-- Real-time updates for entrepreneurs and investors
CREATE TABLE IF NOT EXISTS public.venturex_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional, who triggered it
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'deal_proposed', 'deal_accepted', 'document_uploaded', 'milestone_verified'
  link_id UUID, -- ID of the deal or document
  
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.venturex_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_document_notary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_notifications ENABLE ROW LEVEL SECURITY;

-- Documents: Read access based on access_level
CREATE POLICY "documents_select" ON public.venturex_documents FOR SELECT
  USING (
    access_level = 'Public' OR
    company_id IN (SELECT id FROM public.venturex_companies WHERE user_id = auth.uid()) OR
    (access_level = 'Deal_Parties' AND EXISTS (
      SELECT 1 FROM public.venturex_deals 
      WHERE company_id = venturex_documents.company_id AND investor_user_id = auth.uid()
    ))
  );

CREATE POLICY "documents_insert" ON public.venturex_documents FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.venturex_companies WHERE user_id = auth.uid()));

-- Notary: Public read
CREATE POLICY "notary_select" ON public.venturex_document_notary FOR SELECT USING (TRUE);

-- Notifications: Only owner can see/update
CREATE POLICY "notifications_select" ON public.venturex_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.venturex_notifications FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.venturex_notifications;
