-- ══════════════════════════════════════════════════════════════════════
-- DEUS MARKET — Multi-vendor marketplace (Uber Eats style)
-- ══════════════════════════════════════════════════════════════════════

-- Vendors
CREATE TABLE IF NOT EXISTS public.deus_market_vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  tagline         TEXT,
  logo_url        TEXT,
  cover_color     TEXT DEFAULT '#0f172a',  -- fallback gradient color
  category        TEXT NOT NULL,           -- 'Connectivity','Electronics','Energy','Services'
  tags            TEXT[] DEFAULT '{}',
  rating          NUMERIC(3,2) DEFAULT 4.8,
  review_count    INT DEFAULT 0,
  is_verified     BOOLEAN DEFAULT true,
  is_featured     BOOLEAN DEFAULT false,
  delivery_type   TEXT DEFAULT 'shipping', -- 'digital' | 'shipping'
  delivery_label  TEXT DEFAULT '3-7 days',
  country         TEXT DEFAULT 'Global',
  min_order_usd   NUMERIC DEFAULT 0,
  website_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS public.deus_market_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        UUID NOT NULL REFERENCES public.deus_market_vendors(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  image_url        TEXT,
  category         TEXT NOT NULL,
  price_usd        NUMERIC NOT NULL,
  original_price_usd NUMERIC,
  badge            TEXT,                  -- 'NEW' | 'POPULAR' | 'SALE' | null
  is_available     BOOLEAN DEFAULT true,
  is_featured      BOOLEAN DEFAULT false,
  specs            JSONB DEFAULT '{}',
  stock_qty        INT DEFAULT 9999,
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.deus_market_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  status          TEXT DEFAULT 'confirmed', -- confirmed | processing | shipped | delivered | cancelled
  total_usd       NUMERIC NOT NULL,
  platform_fee    NUMERIC NOT NULL DEFAULT 0,
  shipping_name   TEXT,
  shipping_address TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS public.deus_market_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES public.deus_market_orders(id) ON DELETE CASCADE,
  vendor_id     UUID NOT NULL REFERENCES public.deus_market_vendors(id),
  product_id    UUID NOT NULL REFERENCES public.deus_market_products(id),
  product_name  TEXT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  unit_price    NUMERIC NOT NULL,
  line_total    NUMERIC NOT NULL
);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.deus_market_vendors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deus_market_products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deus_market_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deus_market_order_items  ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can browse the marketplace
CREATE POLICY "market_vendors_read"   ON public.deus_market_vendors      FOR SELECT TO authenticated USING (true);
CREATE POLICY "market_products_read"  ON public.deus_market_products      FOR SELECT TO authenticated USING (true);

-- Users manage their own orders
CREATE POLICY "market_orders_insert"  ON public.deus_market_orders        FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "market_orders_read"    ON public.deus_market_orders        FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "market_items_insert"   ON public.deus_market_order_items   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "market_items_read"     ON public.deus_market_order_items   FOR SELECT TO authenticated USING (
  order_id IN (SELECT id FROM public.deus_market_orders WHERE user_id = auth.uid())
);

-- ── SEED: VENDORS ────────────────────────────────────────────────────
INSERT INTO public.deus_market_vendors (name, slug, tagline, cover_color, category, tags, rating, review_count, is_featured, delivery_type, delivery_label, country, website_url) VALUES
(
  'Starlink', 'starlink',
  'High-speed satellite internet, available almost anywhere on Earth.',
  '#0a0a0a',
  'Connectivity',
  ARRAY['Satellite','Internet','SpaceX','Global'],
  4.9, 48291, true, 'shipping', '5-10 business days', 'United States',
  'https://www.starlink.com'
),
(
  'FORSWAY', 'forsway',
  'Hybrid satellite-terrestrial terminals for enterprise and remote connectivity.',
  '#0d2137',
  'Connectivity',
  ARRAY['Satellite','Hybrid','Enterprise','LTE'],
  4.7, 1840, true, 'shipping', '7-14 business days', 'Sweden',
  'https://www.forsway.com'
),
(
  'DJI', 'dji',
  'The world''s leading drone and camera stabilization technology.',
  '#1a1a1a',
  'Electronics',
  ARRAY['Drones','Camera','Aerial','Professional'],
  4.8, 127450, true, 'shipping', '3-7 business days', 'China / Global',
  'https://www.dji.com'
),
(
  'Tesla Energy', 'tesla-energy',
  'Sustainable energy products for homes and businesses worldwide.',
  '#cc0000',
  'Energy',
  ARRAY['Solar','Powerwall','Energy','Sustainable'],
  4.9, 34210, false, 'shipping', '4-8 weeks (install)', 'United States',
  'https://www.tesla.com/energy'
);

-- ── SEED: PRODUCTS — STARLINK ────────────────────────────────────────
INSERT INTO public.deus_market_products (vendor_id, name, description, image_url, category, price_usd, original_price_usd, badge, is_featured, specs, sort_order) VALUES
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='starlink'),
  'Starlink Standard Kit',
  'The standard residential Starlink kit. Everything you need to get connected — dish, mount, router, and cables included. Ideal for homes, small businesses and remote locations.',
  'https://images.ctfassets.net/s5uo95nf6njh/7MQvBBvmXGUEjrFSTqjG2/3d6e6a2ccd4e4d44f8d1d6f6e5b6f9d6/standard-kit.jpg',
  'Residential', 499.00, 599.00, 'POPULAR', true,
  '{"speed":"50-200 Mbps","latency":"20-60ms","coverage":"Global","dish":"Flat circular","router":"Wi-Fi 6","cables":"Included"}',
  1
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='starlink'),
  'Starlink Mini',
  'Ultra-portable satellite internet for travelers, van life, and on-the-go connectivity. Compact enough to fit in a backpack — works anywhere Starlink operates.',
  'https://images.ctfassets.net/s5uo95nf6njh/starlink-mini/starlink-mini-kit.jpg',
  'Portable', 599.00, NULL, 'NEW', true,
  '{"speed":"25-100 Mbps","latency":"20-60ms","size":"29.8 × 26.4 cm","weight":"1.1 kg","power":"30W","portable":true}',
  2
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='starlink'),
  'Starlink Business',
  'High-capacity satellite internet for businesses, offices, and commercial operations. Priority data and faster speeds with 24/7 uptime SLA.',
  'https://images.ctfassets.net/s5uo95nf6njh/starlink-business/business-kit.jpg',
  'Business', 2500.00, NULL, NULL, false,
  '{"speed":"200-1000 Mbps","latency":"20-40ms","priority":"High","SLA":"99.9%","antenna":"High Performance","support":"24/7"}',
  3
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='starlink'),
  'Starlink Standard Monthly Service',
  'Monthly residential internet service subscription. Required alongside the Starlink kit. No contracts — cancel anytime.',
  NULL,
  'Service', 120.00, NULL, NULL, false,
  '{"billing":"Monthly","contract":"None","data":"Unlimited","priority":"Standard"}',
  4
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='starlink'),
  'Starlink Business Monthly Service',
  'Business-tier monthly service plan with priority bandwidth and premium support. Ideal for offices, ships, and mission-critical deployments.',
  NULL,
  'Service', 500.00, NULL, NULL, false,
  '{"billing":"Monthly","contract":"None","data":"Unlimited Priority","support":"Dedicated"}',
  5
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='starlink'),
  'Starlink Flat Mount',
  'Low-profile mounting solution for rooftops, vehicles, and flat surfaces. Weatherproof and designed for permanent outdoor installation.',
  NULL,
  'Accessories', 75.00, NULL, NULL, false,
  '{"material":"Aluminum","weatherproof":true,"compatible":"Standard / Mini","installation":"Self"}',
  6
);

-- ── SEED: PRODUCTS — FORSWAY ─────────────────────────────────────────
INSERT INTO public.deus_market_products (vendor_id, name, description, image_url, category, price_usd, original_price_usd, badge, is_featured, specs, sort_order) VALUES
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='forsway'),
  'FORSWAY F-25 Hybrid Terminal',
  'The F-25 combines Ka-band satellite with terrestrial LTE/5G for always-on connectivity. Seamlessly switches between satellite and cellular for optimal speeds and cost.',
  'https://www.forsway.com/assets/products/f25-terminal.jpg',
  'Residential', 899.00, NULL, 'POPULAR', true,
  '{"satellite":"Ka-band","cellular":"LTE/5G","throughput":"Up to 50 Mbps","switching":"Automatic","form":"Indoor unit + outdoor antenna","power":"18W"}',
  1
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='forsway'),
  'FORSWAY F-50 Enterprise Terminal',
  'Enterprise-grade hybrid connectivity terminal for businesses, ISPs, and mission-critical applications. Supports multi-WAN bonding with guaranteed SLA.',
  'https://www.forsway.com/assets/products/f50-enterprise.jpg',
  'Enterprise', 2499.00, NULL, NULL, true,
  '{"satellite":"Ka-band","cellular":"Multi-SIM 5G","throughput":"Up to 200 Mbps","bonding":"Multi-WAN","SLA":"99.95%","management":"Remote NMS","support":"Enterprise 24/7"}',
  2
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='forsway'),
  'FORSWAY Connectivity Bundle — SME',
  'Complete connectivity bundle for small and medium enterprises: F-25 terminal + 12 months service plan + professional installation support.',
  NULL,
  'Bundles', 1299.00, 1499.00, 'SALE', false,
  '{"includes":"F-25 Terminal + 12mo service","install":"Remote guidance","data":"Unlimited","contract":"12 months"}',
  3
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='forsway'),
  'FORSWAY Annual Service Plan',
  'Prepaid 12-month service plan for FORSWAY terminals. Includes priority Ka-band data, firmware updates, and remote technical support.',
  NULL,
  'Service', 1188.00, 1440.00, 'SALE', false,
  '{"billing":"Annual prepaid","saving":"$252 vs monthly","data":"Unlimited","support":"Remote tech","updates":"Automatic"}',
  4
);

-- ── SEED: PRODUCTS — DJI ─────────────────────────────────────────────
INSERT INTO public.deus_market_products (vendor_id, name, description, image_url, category, price_usd, original_price_usd, badge, is_featured, specs, sort_order) VALUES
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='dji'),
  'DJI Mini 4 Pro',
  'The most capable Mini drone ever — under 249g for no-registration flying in most countries. 4K/60fps video, obstacle sensing in all directions, and 34 min flight time.',
  'https://store.dji.com/cdn-cgi/image/width=600/product/dji-mini-4-pro.jpg',
  'Drones', 759.00, NULL, 'POPULAR', true,
  '{"weight":"249g","video":"4K/60fps","flight_time":"34 min","obstacle_sensing":"Omnidirectional","range":"20 km","wind_resistance":"Level 7"}',
  1
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='dji'),
  'DJI Air 3',
  'Dual camera drone with a main camera and telephoto camera. 4K/60fps HDR, APAS 5.0 obstacle avoidance, and up to 46 min flight time.',
  'https://store.dji.com/cdn-cgi/image/width=600/product/dji-air-3.jpg',
  'Drones', 1099.00, NULL, 'NEW', true,
  '{"weight":"720g","cameras":"Wide + 3x Tele","video":"4K/60fps HDR","flight_time":"46 min","APAS":"5.0","range":"20 km"}',
  2
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='dji'),
  'DJI Mavic 3 Classic',
  'Professional aerial photography with a Hasselblad camera. 5.1K video, 28× hybrid zoom, 46 min flight time, and omnidirectional sensing.',
  'https://store.dji.com/cdn-cgi/image/width=600/product/dji-mavic-3-classic.jpg',
  'Drones', 1469.00, NULL, NULL, false,
  '{"camera":"Hasselblad 4/3 CMOS","video":"5.1K/50fps","zoom":"28× Hybrid","flight_time":"46 min","sensing":"Omnidirectional"}',
  3
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='dji'),
  'DJI Action 4',
  'Rugged action camera with a 1/1.3" sensor, 10-bit D-Log M color, and up to 4K/120fps. Waterproof to 18m and magnetic quick-snap mount.',
  'https://store.dji.com/cdn-cgi/image/width=600/product/dji-action-4.jpg',
  'Cameras', 399.00, NULL, NULL, false,
  '{"sensor":"1/1.3\" CMOS","video":"4K/120fps","waterproof":"18m","stabilization":"RockSteady 3.0","mount":"Magnetic snap"}',
  4
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='dji'),
  'DJI Osmo Mobile 6',
  '3-axis smartphone gimbal with built-in extension rod, gesture control, and ActiveTrack 6.0 for cinematic content creation.',
  'https://store.dji.com/cdn-cgi/image/width=600/product/dji-osmo-mobile-6.jpg',
  'Cameras', 159.00, NULL, NULL, false,
  '{"axes":"3-axis","stabilization":"ActiveTrack 6.0","battery":"8 hrs","fold":"Compact","gestures":"Yes","extension_rod":"Built-in"}',
  5
);

-- ── SEED: PRODUCTS — TESLA ENERGY ────────────────────────────────────
INSERT INTO public.deus_market_products (vendor_id, name, description, image_url, category, price_usd, original_price_usd, badge, is_featured, specs, sort_order) VALUES
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='tesla-energy'),
  'Powerwall 3',
  'The most powerful home battery yet — 13.5 kWh capacity, 11.5 kW peak power output, and integrated solar inverter. Keeps your home running during outages 24/7.',
  'https://www.tesla.com/sites/default/files/images/energy/powerwall/hero.jpg',
  'Storage', 9300.00, NULL, 'NEW', true,
  '{"capacity":"13.5 kWh","peak_power":"11.5 kW","solar":"Integrated inverter","backup":"Whole home","warranty":"10 years","dimensions":"1096×762×147mm"}',
  1
),
(
  (SELECT id FROM public.deus_market_vendors WHERE slug='tesla-energy'),
  'Solar Roof — Consultation',
  'Book an official Tesla Solar Roof consultation and site assessment. Our energy specialists will design a custom solar + storage system for your property.',
  NULL,
  'Services', 0.00, NULL, 'FREE', false,
  '{"includes":"Site assessment, custom design, cost proposal","duration":"60 min","format":"Remote or on-site"}',
  2
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_products_vendor ON public.deus_market_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_market_products_category ON public.deus_market_products(category);
CREATE INDEX IF NOT EXISTS idx_market_orders_user ON public.deus_market_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_market_items_order ON public.deus_market_order_items(order_id);

