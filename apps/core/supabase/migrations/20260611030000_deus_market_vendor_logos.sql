-- Add logo_url column to deus_market_vendors
ALTER TABLE public.deus_market_vendors ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Set confirmed official logo URLs
UPDATE public.deus_market_vendors SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Starlink_Logo.svg'
  WHERE slug = 'starlink';

UPDATE public.deus_market_vendors SET logo_url = 'https://usercontent.one/wp/forsway.com/wp-content/uploads/2021/01/forsway-logo-sm-2021.png?media=1775636928'
  WHERE slug = 'forsway';

UPDATE public.deus_market_vendors SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/DJI_Innovations_logo.svg/960px-DJI_Innovations_logo.svg.png'
  WHERE slug = 'dji';

UPDATE public.deus_market_vendors SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tesla_Energy_Operations%2C_Inc._-_Logo.svg'
  WHERE slug = 'tesla-energy';
