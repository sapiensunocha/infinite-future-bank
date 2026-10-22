-- ============================================================
-- Fix: grant get_venturex_feed/stats to anon + fix broken celebration image
-- ============================================================

-- Ensure both roles can call feed RPCs
GRANT EXECUTE ON FUNCTION public.get_venturex_feed(INT, INT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_venturex_stats() TO anon, authenticated;

-- Fix broken celebration image URLs (replace AI-generated 402 URLs with stable Unsplash images)
UPDATE public.global_celebrations
SET image_url = CASE
  WHEN image_url ILIKE '%Cinematic%dark%abstract%' THEN
    'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&q=80&w=2000'
  WHEN image_url NOT ILIKE 'https://images.unsplash.com%'
    AND image_url NOT ILIKE 'https://picsum.photos%'
    AND image_url NOT ILIKE 'https://cdn%'
    AND image_url NOT ILIKE '/eid%'
    AND image_url NOT ILIKE 'https://upload.wikimedia%'
    THEN 'https://images.unsplash.com/photo-1509803874385-db7c23652552?auto=format&fit=crop&q=80&w=2000'
  ELSE image_url
END
WHERE image_url IS NOT NULL
  AND image_url NOT ILIKE 'https://images.unsplash.com%'
  AND image_url NOT ILIKE 'https://picsum.photos%'
  AND image_url NOT ILIKE '/eid%';
