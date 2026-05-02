-- ============================================================
-- Monetized Social Interactions & Special Likes
-- Allows users to set a 'Like Value' that transfers money to posters.
-- ============================================================

-- 1. Add Like Value to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_like_value NUMERIC DEFAULT 0;

-- 2. Add Revenue tracking to social posts
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0;

-- 3. Track individual transaction amount in interactions
ALTER TABLE public.social_interactions ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 4. Secure Transaction Function for Monetized Likes
-- This function handles the balance check and transfer.
CREATE OR REPLACE FUNCTION public.process_monetized_interaction(
  p_post_id UUID,
  p_user_id UUID,
  p_interaction_type TEXT, -- 'like', 'love', 'special'
  p_custom_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_poster_id UUID;
  v_liker_balance NUMERIC;
  v_transfer_amount NUMERIC;
BEGIN
  -- Get the poster's ID
  SELECT author_id INTO v_poster_id FROM public.social_posts WHERE id = p_post_id;
  IF v_poster_id = p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot pay yourself for a like.');
  END IF;

  -- Determine transfer amount
  IF p_interaction_type = 'special' AND p_custom_amount IS NOT NULL THEN
    v_transfer_amount := p_custom_amount;
  ELSE
    SELECT default_like_value INTO v_transfer_amount FROM public.profiles WHERE id = p_user_id;
  END IF;

  -- Default to 0 if null or negative
  v_transfer_amount := COALESCE(v_transfer_amount, 0);
  IF v_transfer_amount <= 0 AND p_interaction_type != 'special' THEN
    -- Standard free like, just insert record
    INSERT INTO public.social_interactions (post_id, user_id, interaction_type, amount_paid)
    VALUES (p_post_id, p_user_id, p_interaction_type, 0)
    ON CONFLICT (post_id, user_id) DO UPDATE SET interaction_type = p_interaction_type;
    RETURN jsonb_build_object('ok', true, 'amount', 0);
  END IF;

  -- Check liker balance
  SELECT liquid_usd INTO v_liker_balance FROM public.balances WHERE user_id = p_user_id;
  IF v_liker_balance < v_transfer_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds for this interaction.');
  END IF;

  -- EXECUTE TRANSFER
  -- 1. Deduct from liker
  UPDATE public.balances SET liquid_usd = liquid_usd - v_transfer_amount WHERE user_id = p_user_id;
  
  -- 2. Add to poster
  UPDATE public.balances SET liquid_usd = liquid_usd + v_transfer_amount WHERE user_id = v_poster_id;
  
  -- 3. Log transaction in ledger
  INSERT INTO public.transactions (user_id, amount, transaction_type, status, description)
  VALUES 
    (p_user_id, -v_transfer_amount, 'social_outbound', 'completed', 'Monetized reaction to post ' || p_post_id),
    (v_poster_id, v_transfer_amount, 'social_inbound', 'completed', 'Revenue from post ' || p_post_id);

  -- 4. Record interaction
  INSERT INTO public.social_interactions (post_id, user_id, interaction_type, amount_paid)
  VALUES (p_post_id, p_user_id, p_interaction_type, v_transfer_amount)
  ON CONFLICT (post_id, user_id) DO UPDATE SET 
    interaction_type = p_interaction_type, 
    amount_paid = social_interactions.amount_paid + v_transfer_amount;

  -- 5. Update post revenue
  UPDATE public.social_posts SET total_revenue = total_revenue + v_transfer_amount WHERE id = p_post_id;

  RETURN jsonb_build_object('ok', true, 'amount', v_transfer_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the view to include revenue
DROP VIEW IF EXISTS public.social_feed_view; CREATE VIEW public.social_feed_view AS
SELECT 
  p.id,
  p.author_id,
  p.content,
  p.media_urls,
  p.media_types,
  p.like_count,
  p.love_count,
  p.total_revenue,
  p.created_at,
  COALESCE(vc.legal_name, npo.npo_name, vi.fund_name, prof.full_name, 'Unknown Author') AS author_name,
  CASE
    WHEN vc.id IS NOT NULL THEN 'Entrepreneur'
    WHEN npo.id IS NOT NULL THEN 'NPO'
    WHEN vi.id IS NOT NULL THEN 'Investor'
    ELSE 'User'
  END AS author_role
FROM public.social_posts p
LEFT JOIN public.venturex_companies vc ON p.author_id = vc.user_id
LEFT JOIN public.npo_profiles npo ON p.author_id = npo.id
LEFT JOIN public.venturex_investors vi ON p.author_id = vi.user_id
LEFT JOIN public.profiles prof ON p.author_id = prof.id;
