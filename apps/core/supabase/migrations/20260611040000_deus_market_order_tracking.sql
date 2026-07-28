-- Enhance deus_market_orders with tracking + admin workflow fields
ALTER TABLE public.deus_market_orders
  ADD COLUMN IF NOT EXISTS tracking_number  TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url     TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes      TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery DATE,
  ADD COLUMN IF NOT EXISTS vendor_source    TEXT,
  ADD COLUMN IF NOT EXISTS sourced_cost_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Change default status from confirmed to pending (new orders wait for IFB processing)
ALTER TABLE public.deus_market_orders ALTER COLUMN status SET DEFAULT 'pending';

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.touch_deus_market_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_deus_market_order ON public.deus_market_orders;
CREATE TRIGGER trg_touch_deus_market_order
  BEFORE UPDATE ON public.deus_market_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_deus_market_order();

-- Allow admins (service_role or authenticated admins) to update any order
-- The existing UPDATE policy only allows users to update their own — admins need full access
-- We use a SECURITY DEFINER function for the admin panel to update orders
CREATE OR REPLACE FUNCTION public.admin_update_market_order(
  p_order_id        UUID,
  p_status          TEXT,
  p_tracking_number TEXT DEFAULT NULL,
  p_tracking_url    TEXT DEFAULT NULL,
  p_admin_notes     TEXT DEFAULT NULL,
  p_estimated_delivery DATE DEFAULT NULL,
  p_vendor_source   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE deus_market_orders SET
    status             = p_status,
    tracking_number    = COALESCE(p_tracking_number, tracking_number),
    tracking_url       = COALESCE(p_tracking_url, tracking_url),
    admin_notes        = COALESCE(p_admin_notes, admin_notes),
    estimated_delivery = COALESCE(p_estimated_delivery, estimated_delivery),
    vendor_source      = COALESCE(p_vendor_source, vendor_source)
  WHERE id = p_order_id;
END;
$$;

-- Allow authenticated users to call this (actual role check done in app)
GRANT EXECUTE ON FUNCTION public.admin_update_market_order TO authenticated;

-- Allow admins to read all orders (users can only read their own via RLS)
CREATE OR REPLACE FUNCTION public.admin_get_market_orders(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, user_id UUID, status TEXT, total_usd NUMERIC, platform_fee NUMERIC,
  shipping_name TEXT, shipping_address TEXT, tracking_number TEXT, tracking_url TEXT,
  admin_notes TEXT, estimated_delivery DATE, vendor_source TEXT, sourced_cost_usd NUMERIC,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  user_email TEXT, user_name TEXT,
  items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id, o.user_id, o.status, o.total_usd, o.platform_fee,
    o.shipping_name, o.shipping_address, o.tracking_number, o.tracking_url,
    o.admin_notes, o.estimated_delivery, o.vendor_source, o.sourced_cost_usd,
    o.created_at, o.updated_at,
    p.email::TEXT AS user_email,
    p.full_name::TEXT AS user_name,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'quantity', i.quantity,
        'unit_price', i.unit_price,
        'line_total', i.line_total,
        'vendor_id', i.vendor_id
      )) FROM deus_market_order_items i WHERE i.order_id = o.id),
      '[]'::jsonb
    ) AS items
  FROM deus_market_orders o
  LEFT JOIN profiles p ON p.id = o.user_id
  WHERE p_status IS NULL OR o.status = p_status
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_market_orders TO authenticated;
