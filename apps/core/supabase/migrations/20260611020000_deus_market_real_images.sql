-- Update deus_market_products with real, confirmed product images

-- ── STARLINK ──────────────────────────────────────────────────────────
UPDATE public.deus_market_products SET image_url = 'https://www.satelliteinternet.com/app/uploads/2024/10/Screenshot-2024-10-15-151959-png-e1733941442108-1024x560.webp'
  WHERE name = 'Starlink Standard Kit';

UPDATE public.deus_market_products SET image_url = 'https://www.satelliteinternet.com/app/uploads/2024/06/Starlink-Mini-e1733941392294-1024x565.webp'
  WHERE name = 'Starlink Mini';

UPDATE public.deus_market_products SET image_url = 'https://obejorcomputers.com/wp-content/uploads/2025/04/Starlink-Gen-3-Business-Kit-1.jpg'
  WHERE name = 'Starlink Business';

UPDATE public.deus_market_products SET image_url = 'https://starlinkinsider.com/wp-content/uploads/2023/03/starlink-antarctica.jpg'
  WHERE name = 'Starlink Standard Monthly Service';

UPDATE public.deus_market_products SET image_url = 'https://starlinkinsider.com/wp-content/uploads/2023/03/starlink-antarctica.jpg'
  WHERE name = 'Starlink Business Monthly Service';

UPDATE public.deus_market_products SET image_url = 'https://obejorcomputers.com/wp-content/uploads/2025/04/Starlink-Gen-3-Business-Kit-1.jpg'
  WHERE name = 'Starlink Flat Mount';

-- ── FORSWAY ───────────────────────────────────────────────────────────
UPDATE public.deus_market_products SET image_url = 'https://usercontent.one/wp/forsway.com/wp-content/uploads/2020/10/F50-small-e1607027747935.png'
  WHERE name = 'FORSWAY F-25 Hybrid Terminal';

UPDATE public.deus_market_products SET image_url = 'https://usercontent.one/wp/forsway.com/wp-content/uploads/2023/09/Forsway-Odin-F-60-with-Montage-chip-technology.jpg'
  WHERE name = 'FORSWAY F-50 Enterprise Terminal';

UPDATE public.deus_market_products SET image_url = 'https://usercontent.one/wp/forsway.com/wp-content/uploads/2020/12/FMC_Produktbild.png'
  WHERE name LIKE 'FORSWAY Connectivity Bundle%';

UPDATE public.deus_market_products SET image_url = 'https://usercontent.one/wp/forsway.com/wp-content/uploads/2020/12/F50wireframe.png'
  WHERE name LIKE 'FORSWAY Annual Service%';

-- ── DJI ───────────────────────────────────────────────────────────────
UPDATE public.deus_market_products SET image_url = 'https://se-cdn.djiits.com/tpc/uploads/carousel/image/56164c524942bae3dbead828f388a8bf@ultra.jpg'
  WHERE name = 'DJI Mini 4 Pro';

UPDATE public.deus_market_products SET image_url = 'https://se-cdn.djiits.com/tpc/uploads/carousel/image/6cebd8efcbc6c4e13bc21efb7e05be67@ultra.jpg'
  WHERE name = 'DJI Air 3';

UPDATE public.deus_market_products SET image_url = 'https://se-cdn.djiits.com/tpc/uploads/carousel/image/af06e456c234671d3ac890c4c7c7950f@ultra.jpg'
  WHERE name = 'DJI Mavic 3 Classic';

UPDATE public.deus_market_products SET image_url = 'https://se-cdn.djiits.com/tpc/uploads/carousel/image/fa6ff9c44b34e9638cbff1d3d9bfbcce@ultra.jpg'
  WHERE name LIKE 'DJI Action 4%' OR name LIKE 'DJI Osmo Action 4%';

UPDATE public.deus_market_products SET image_url = 'https://www-cdn.djiits.com/dps/708e9fdda54844663d1de760ca85e0f4.jpg'
  WHERE name LIKE 'DJI Osmo Mobile 6%' OR name LIKE '%OM 6%';

-- ── TESLA ENERGY ──────────────────────────────────────────────────────
UPDATE public.deus_market_products SET image_url = 'https://electrek.co/wp-content/uploads/sites/3/2023/09/Tesla-powerwall-3-hero.jpg'
  WHERE name LIKE 'Powerwall%' OR name LIKE '%Powerwall%';

UPDATE public.deus_market_products SET image_url = 'https://electrek.co/wp-content/uploads/sites/3/2021/05/Tesla-Guide-Solar-Roof-Hero.jpg'
  WHERE name LIKE 'Solar Roof%';

UPDATE public.deus_market_products SET image_url = 'https://electrek.co/wp-content/uploads/sites/3/2026/02/Tesla-Powerwall-3P.jpg'
  WHERE name LIKE 'Solar Panel%';

UPDATE public.deus_market_products SET image_url = 'https://electrek.co/wp-content/uploads/sites/3/2023/12/Tesla-Megapack.jpg'
  WHERE name LIKE 'Megapack%' OR name LIKE '%Megapack%';
