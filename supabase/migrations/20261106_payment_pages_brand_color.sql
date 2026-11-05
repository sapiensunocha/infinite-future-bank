-- 20261106_payment_pages_brand_color.sql
-- Merchant brand colour for the public checkout page (#rrggbb, lowercase).
-- Validated by the payment-pages function and by this CHECK constraint.

ALTER TABLE public.payment_pages
  ADD COLUMN IF NOT EXISTS brand_color text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_pages_brand_color_check'
  ) THEN
    ALTER TABLE public.payment_pages
      ADD CONSTRAINT payment_pages_brand_color_check
      CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9a-f]{6}$');
  END IF;
END;
$$;

-- Merchants read their own pages through a column grant; include the new column.
GRANT SELECT (brand_color) ON public.payment_pages TO authenticated;
