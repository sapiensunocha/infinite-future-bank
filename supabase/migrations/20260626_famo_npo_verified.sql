-- ============================================================
-- Fix missing npo_profiles columns + FAMO Foundation Corp verification
-- User: mcoulibaly56@gmail.com (Mariam Coulibaly)
-- ============================================================

-- 1. Add columns referenced by triggers that are missing from live schema
ALTER TABLE public.npo_profiles
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS mentorship_status TEXT DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS transparency_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impact_metrics JSONB DEFAULT '{}';

-- 2. Upsert FAMO Foundation Corp profile
DO $$
DECLARE
  v_uid UUID := 'c895b32c-e5cd-4b52-8ba2-88d4c7b2c2e5';
BEGIN

  INSERT INTO public.npo_profiles (
    id,
    npo_name,
    mission_statement,
    sector,
    country,
    founded_year,
    program_tier,
    verification_status,
    assigned_support_cluster,
    estimated_volume,
    current_float_usd,
    total_raised,
    ifb_revenue_generated,
    donation_message,
    preset_amounts,
    notify_on_donation,
    ai_risk_score,
    ai_compliance_notes,
    live_ai_status,
    mentorship_status,
    transparency_score,
    impact_metrics
  ) VALUES (
    v_uid,
    'FAMO Foundation Corp.',
    'FAMO Foundation Corp. empowers vulnerable populations — unemployed youth, widows, and street children — through vocational training, digital skills, entrepreneurship, and social support programs in Korhogo, Côte d''Ivoire.',
    'Education',
    'Côte d''Ivoire',
    2026,
    'Cluster_Partner',
    'verified',
    'IFB West Africa — Advisory Cluster',
    100000,
    0,
    0,
    0,
    'Support FAMO Foundation''s mission to train 500 vulnerable individuals annually in Korhogo, Côte d''Ivoire — vocational training, digital skills, and entrepreneurship for unemployed youth, widows, and at-risk children.',
    '[25, 50, 100, 250]',
    TRUE,
    'Low',
    'BP reviewed by IFB (June 2026). Clear mission, defined beneficiary groups (500/yr), Phase I budget $100K–$150K. Revenue: Grants 50%, CSR 20%, Social Enterprise 25%, Community 5%. 5-yr projections: Y1 +$10K → Y5 +$100K net. Programs: vocational skills, digital literacy, entrepreneurship, social support. Employment target: 70%+ graduates. 3,500+ beneficiaries 2026–2031. GAPS: legal docs pending, KPIs to formalize.',
    'Active — IFB Cluster Partner · Mentorship Enrolled',
    'Active_Mentorship',
    72,
    jsonb_build_object(
      'beneficiaries_target_annual', 500,
      'beneficiaries_target_5yr', 3500,
      'funding_request_phase1_usd', 100000,
      'employment_rate_target_pct', 70,
      'location', 'Korhogo, Côte d''Ivoire',
      'project_duration', '2026–2031'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    npo_name                = EXCLUDED.npo_name,
    mission_statement       = EXCLUDED.mission_statement,
    sector                  = EXCLUDED.sector,
    country                 = EXCLUDED.country,
    founded_year            = EXCLUDED.founded_year,
    program_tier            = 'Cluster_Partner',
    verification_status     = 'verified',
    assigned_support_cluster= EXCLUDED.assigned_support_cluster,
    estimated_volume        = EXCLUDED.estimated_volume,
    donation_message        = EXCLUDED.donation_message,
    preset_amounts          = EXCLUDED.preset_amounts,
    ai_risk_score           = 'Low',
    ai_compliance_notes     = EXCLUDED.ai_compliance_notes,
    live_ai_status          = EXCLUDED.live_ai_status,
    mentorship_status       = 'Active_Mentorship',
    transparency_score      = 72,
    impact_metrics          = EXCLUDED.impact_metrics;

  -- 3. In-app notification
  INSERT INTO public.venturex_notifications (
    user_id, title, message, type, is_read, created_at
  ) VALUES (
    v_uid,
    '🎉 FAMO Foundation Corp. — Vérifiée par IFB',
    'Félicitations Mariam ! FAMO Foundation Corp. est officiellement vérifiée comme Cluster Partner IFB. Score de préparation : 72/100. Votre conseiller vous contactera sous 24h.',
    'match_interest',
    FALSE,
    NOW()
  );

  -- 4. Social post
  INSERT INTO public.social_posts (
    author_id, content, media_urls, media_types, like_count, love_count, created_at
  ) VALUES (
    v_uid,
    '🌟 FAMO Foundation Corp. rejoint le réseau IFB comme Cluster Partner vérifié ! Basée à Korhogo 🇨🇮, nous construisons un Centre de Formation pour les jeunes sans emploi, les veuves et enfants vulnérables. Objectif : 500 bénéficiaires/an, 3 500 sur 5 ans. Financement Phase I : 100 000–150 000 USD. #FAMO #IFBNetwork #CôtedIvoire #NPOHub',
    '[]', '[]', 5, 3, NOW()
  );

  RAISE NOTICE 'FAMO Foundation Corp. verified — user %', v_uid;
END;
$$;
