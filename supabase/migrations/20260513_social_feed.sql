-- ============================================================
-- Social Infrastructure: Follows, Posts, Videos, Likes
-- Unified system for VentureX (Startups, Investors) and NPO Hub
-- ============================================================

-- 1. Follow System (Users following Users)
CREATE TABLE IF NOT EXISTS public.social_follows (
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- 2. Social Posts (Videos, Images, Documents, Text)
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  
  -- Media arrays (simulated local URLs or external links)
  media_urls JSONB DEFAULT '[]',   -- e.g., ["https://...", "https://..."]
  media_types JSONB DEFAULT '[]',  -- e.g., ["video", "image", "document"]
  
  like_count INTEGER DEFAULT 0,
  love_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Social Interactions (Likes & Loves)
CREATE TABLE IF NOT EXISTS public.social_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'love')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================================
-- Triggers & Functions for Counts and Notifications
-- ============================================================

-- Update like/love counts on posts
CREATE OR REPLACE FUNCTION public.update_social_interaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.interaction_type = 'like' THEN
      UPDATE public.social_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.interaction_type = 'love' THEN
      UPDATE public.social_posts SET love_count = love_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.interaction_type = 'like' THEN
      UPDATE public.social_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.interaction_type = 'love' THEN
      UPDATE public.social_posts SET love_count = GREATEST(love_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_social_interactions
AFTER INSERT OR DELETE ON public.social_interactions
FOR EACH ROW EXECUTE FUNCTION public.update_social_interaction_count();


-- Notify followers of a new post
CREATE OR REPLACE FUNCTION public.notify_followers_of_post()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
  follower RECORD;
BEGIN
  -- Try to get name from profiles, companies, or NPOs
  SELECT COALESCE(
    (SELECT legal_name FROM public.venturex_companies WHERE user_id = NEW.author_id LIMIT 1),
    (SELECT npo_name FROM public.npo_profiles WHERE id = NEW.author_id LIMIT 1),
    (SELECT full_name FROM public.profiles WHERE id = NEW.author_id LIMIT 1),
    'A user you follow'
  ) INTO v_author_name;

  FOR follower IN SELECT follower_id FROM public.social_follows WHERE following_id = NEW.author_id LOOP
    -- If we use notifications table, but let's insert into venturex_notifications if exists, or global notifications
    BEGIN
      INSERT INTO public.notifications (user_id, type, message, metadata, status)
      VALUES (
        follower.follower_id,
        'social_post',
        v_author_name || ' just posted a new update.',
        jsonb_build_object('post_id', NEW.id, 'author_id', NEW.author_id),
        'completed'
      );
    EXCEPTION WHEN OTHERS THEN
      -- If public.notifications doesn't match structure, silently continue or try another
      INSERT INTO public.venturex_notifications (user_id, sender_id, title, message, type, link_id)
      VALUES (follower.follower_id, NEW.author_id, 'New Update', v_author_name || ' posted a new update.', 'document_uploaded', NEW.id);
    END;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notify_followers_of_post
AFTER INSERT ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_of_post();

-- RPC to get follower counts
CREATE OR REPLACE FUNCTION public.get_follower_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.social_follows WHERE following_id = p_user_id;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- View for posts with author details (optimizing queries)
CREATE OR REPLACE VIEW public.social_feed_view AS
SELECT 
  p.id,
  p.author_id,
  p.content,
  p.media_urls,
  p.media_types,
  p.like_count,
  p.love_count,
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

-- ============================================================
-- Security & RLS
-- ============================================================
ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;

-- Follows: Anyone can read. Only follower can insert/delete their own follows.
CREATE POLICY "follows_select" ON public.social_follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_insert" ON public.social_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete" ON public.social_follows FOR DELETE USING (auth.uid() = follower_id);

-- Posts: Anyone can read. Only author can insert/update/delete.
CREATE POLICY "posts_select" ON public.social_posts FOR SELECT USING (TRUE);
CREATE POLICY "posts_insert" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update" ON public.social_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete" ON public.social_posts FOR DELETE USING (auth.uid() = author_id);

-- Interactions: Anyone can read. Only interactor can insert/delete.
CREATE POLICY "interactions_select" ON public.social_interactions FOR SELECT USING (TRUE);
CREATE POLICY "interactions_insert" ON public.social_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "interactions_delete" ON public.social_interactions FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_follows;
