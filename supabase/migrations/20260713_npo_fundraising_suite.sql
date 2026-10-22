-- ============================================================
-- IFB NPO Fundraising Suite — Complete Zeffy-beating feature set
-- Campaigns, Donations, Memberships, Events, Volunteers, P2P, Receipts
-- ============================================================

-- Extend npo_profiles with public/sharing fields
ALTER TABLE public.npo_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS currencies_accepted TEXT[] DEFAULT ARRAY['USD'],
  ADD COLUMN IF NOT EXISTS accepts_recurring BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Auto-generate slug from npo_name on insert
CREATE OR REPLACE FUNCTION public.generate_npo_slug()
RETURNS TRIGGER AS $$
DECLARE v_slug TEXT; v_base TEXT; v_count INT;
BEGIN
  IF NEW.slug IS NULL THEN
    v_base := lower(regexp_replace(trim(NEW.npo_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := v_base;
    v_count := 0;
    WHILE EXISTS (SELECT 1 FROM public.npo_profiles WHERE slug = v_slug AND id <> NEW.id) LOOP
      v_count := v_count + 1;
      v_slug := v_base || '-' || v_count;
    END LOOP;
    NEW.slug := v_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_npo_slug ON public.npo_profiles;
CREATE TRIGGER tr_npo_slug
BEFORE INSERT OR UPDATE ON public.npo_profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_npo_slug();

-- ── Fundraising Campaigns ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  goal_amount NUMERIC NOT NULL DEFAULT 1000,
  currency TEXT DEFAULT 'USD',
  raised_amount NUMERIC DEFAULT 0,
  donor_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_emergency BOOLEAN DEFAULT FALSE,
  campaign_type TEXT DEFAULT 'general' CHECK (campaign_type IN (
    'general','emergency','event','peer_to_peer','raffle','auction','membership','scholarship'
  )),
  slug TEXT UNIQUE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.generate_campaign_slug()
RETURNS TRIGGER AS $$
DECLARE v_slug TEXT; v_base TEXT; v_count INT;
BEGIN
  IF NEW.slug IS NULL THEN
    v_base := lower(regexp_replace(trim(NEW.title), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := v_base;
    v_count := 0;
    WHILE EXISTS (SELECT 1 FROM public.npo_campaigns WHERE slug = v_slug AND id <> NEW.id) LOOP
      v_count := v_count + 1;
      v_slug := v_base || '-' || v_count;
    END LOOP;
    NEW.slug := v_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_campaign_slug ON public.npo_campaigns;
CREATE TRIGGER tr_campaign_slug
BEFORE INSERT ON public.npo_campaigns
FOR EACH ROW EXECUTE FUNCTION public.generate_campaign_slug();

ALTER TABLE public.npo_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_select" ON public.npo_campaigns FOR SELECT USING (TRUE);
CREATE POLICY "campaigns_manage" ON public.npo_campaigns FOR ALL USING (npo_id = auth.uid());

-- ── Donations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.npo_campaigns(id) ON DELETE SET NULL,
  peer_fundraiser_id UUID,
  donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name TEXT,
  donor_email TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  amount_usd NUMERIC,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly','monthly','quarterly','annually')),
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card','mobile_money','bank_transfer','wallet','cash')),
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending','completed','failed','refunded')),
  is_anonymous BOOLEAN DEFAULT FALSE,
  message TEXT,
  tax_receipt_sent BOOLEAN DEFAULT FALSE,
  receipt_number TEXT UNIQUE DEFAULT 'IFB-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 6)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.npo_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donations_donor_select" ON public.npo_donations FOR SELECT USING (donor_id = auth.uid() OR npo_id = auth.uid());
CREATE POLICY "donations_insert" ON public.npo_donations FOR INSERT WITH CHECK (TRUE);

-- On completed donation: update campaign + npo totals
CREATE OR REPLACE FUNCTION public.on_donation_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' THEN
    UPDATE public.npo_profiles
      SET total_raised = total_raised + COALESCE(NEW.amount_usd, NEW.amount),
          current_float_usd = current_float_usd + COALESCE(NEW.amount_usd, NEW.amount)
      WHERE id = NEW.npo_id;

    IF NEW.campaign_id IS NOT NULL THEN
      UPDATE public.npo_campaigns
        SET raised_amount = raised_amount + NEW.amount,
            donor_count = donor_count + 1
        WHERE id = NEW.campaign_id;
    END IF;

    IF NEW.peer_fundraiser_id IS NOT NULL THEN
      UPDATE public.npo_peer_fundraisers
        SET raised_amount = raised_amount + NEW.amount,
            donor_count = donor_count + 1
        WHERE id = NEW.peer_fundraiser_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_donation_complete ON public.npo_donations;
CREATE TRIGGER tr_donation_complete
AFTER INSERT OR UPDATE ON public.npo_donations
FOR EACH ROW EXECUTE FUNCTION public.on_donation_complete();

-- ── Membership Tiers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC DEFAULT 0,
  price_annually NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  benefits JSONB DEFAULT '[]',
  max_members INTEGER,
  member_count INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'heart',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.npo_member_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.npo_membership_tiers(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email TEXT,
  member_name TEXT,
  billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','annually')),
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','paused','past_due')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  next_billing_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  UNIQUE(npo_id, member_id, tier_id)
);

ALTER TABLE public.npo_membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npo_member_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers_select" ON public.npo_membership_tiers FOR SELECT USING (TRUE);
CREATE POLICY "tiers_manage" ON public.npo_membership_tiers FOR ALL USING (npo_id = auth.uid());
CREATE POLICY "subs_select" ON public.npo_member_subscriptions FOR SELECT USING (member_id = auth.uid() OR npo_id = auth.uid());
CREATE POLICY "subs_insert" ON public.npo_member_subscriptions FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "subs_update" ON public.npo_member_subscriptions FOR UPDATE USING (member_id = auth.uid() OR npo_id = auth.uid());

-- ── Events ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  event_type TEXT DEFAULT 'in_person' CHECK (event_type IN ('in_person','virtual','hybrid')),
  location TEXT,
  virtual_link TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_attendees INTEGER,
  registered_count INTEGER DEFAULT 0,
  ticket_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_free BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.npo_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.npo_events(id) ON DELETE CASCADE,
  attendee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  ticket_code TEXT UNIQUE DEFAULT 'TKT-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'confirmed' CHECK (payment_status IN ('confirmed','pending','cancelled')),
  checked_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.npo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npo_event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON public.npo_events FOR SELECT USING (TRUE);
CREATE POLICY "events_manage" ON public.npo_events FOR ALL USING (npo_id = auth.uid());
CREATE POLICY "registrations_select" ON public.npo_event_registrations FOR SELECT USING (attendee_id = auth.uid());
CREATE POLICY "registrations_insert" ON public.npo_event_registrations FOR INSERT WITH CHECK (TRUE);

-- ── Volunteers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_name TEXT,
  volunteer_email TEXT,
  skills JSONB DEFAULT '[]',
  availability TEXT,
  hours_contributed NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','inactive')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(npo_id, volunteer_id)
);

ALTER TABLE public.npo_volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "volunteers_select" ON public.npo_volunteers FOR SELECT USING (npo_id = auth.uid() OR volunteer_id = auth.uid());
CREATE POLICY "volunteers_insert" ON public.npo_volunteers FOR INSERT WITH CHECK (volunteer_id = auth.uid());
CREATE POLICY "volunteers_update" ON public.npo_volunteers FOR UPDATE USING (npo_id = auth.uid() OR volunteer_id = auth.uid());

-- ── Peer-to-Peer Fundraisers ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_peer_fundraisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.npo_campaigns(id) ON DELETE CASCADE,
  fundraiser_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fundraiser_name TEXT,
  personal_goal NUMERIC DEFAULT 500,
  raised_amount NUMERIC DEFAULT 0,
  donor_count INTEGER DEFAULT 0,
  story TEXT,
  slug TEXT UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.npo_peer_fundraisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p2p_select" ON public.npo_peer_fundraisers FOR SELECT USING (TRUE);
CREATE POLICY "p2p_manage" ON public.npo_peer_fundraisers FOR ALL USING (fundraiser_id = auth.uid());

-- ── Raffle / Lottery ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.npo_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ticket_price NUMERIC DEFAULT 5,
  currency TEXT DEFAULT 'USD',
  max_tickets INTEGER,
  tickets_sold INTEGER DEFAULT 0,
  prizes JSONB DEFAULT '[]',
  draw_at TIMESTAMPTZ,
  winner_ids JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','drawn','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.npo_raffle_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID REFERENCES public.npo_raffles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  ticket_number TEXT UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  amount_paid NUMERIC,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.npo_raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npo_raffle_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raffles_select" ON public.npo_raffles FOR SELECT USING (TRUE);
CREATE POLICY "raffles_manage" ON public.npo_raffles FOR ALL USING (npo_id = auth.uid());
CREATE POLICY "raffle_tickets_select" ON public.npo_raffle_tickets FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "raffle_tickets_insert" ON public.npo_raffle_tickets FOR INSERT WITH CHECK (TRUE);

-- ── Grant Proposals ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npo_grant_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  grantor_name TEXT NOT NULL,
  grantor_type TEXT DEFAULT 'foundation' CHECK (grantor_type IN ('government','foundation','corporate','bilateral','multilateral','ifb')),
  title TEXT NOT NULL,
  amount_requested NUMERIC,
  currency TEXT DEFAULT 'USD',
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'drafting' CHECK (status IN ('drafting','submitted','under_review','approved','rejected','withdrawn')),
  narrative TEXT,
  budget_breakdown JSONB DEFAULT '{}',
  documents JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.npo_grant_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grants_own" ON public.npo_grant_proposals FOR ALL USING (npo_id = auth.uid());

-- ── Donor Leaderboard view ────────────────────────────────────
CREATE OR REPLACE VIEW public.npo_donor_leaderboard AS
SELECT
  d.npo_id,
  d.donor_id,
  CASE WHEN d.is_anonymous THEN 'Anonymous' ELSE COALESCE(p.full_name, d.donor_name, 'Supporter') END AS display_name,
  SUM(d.amount_usd) AS total_donated,
  COUNT(*) AS donation_count,
  MAX(d.created_at) AS last_donation_at
FROM public.npo_donations d
LEFT JOIN public.profiles p ON p.id = d.donor_id
WHERE d.payment_status = 'completed'
GROUP BY d.npo_id, d.donor_id, d.is_anonymous, p.full_name, d.donor_name
ORDER BY total_donated DESC;

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.npo_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.npo_donations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.npo_events;
