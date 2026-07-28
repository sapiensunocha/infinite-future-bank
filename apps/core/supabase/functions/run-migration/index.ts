import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async () => {
  const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? ''
  if (!dbUrl) return new Response(JSON.stringify({ error: 'No DB URL' }), { status: 500 })

  const { Pool } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
  const pool = new Pool(dbUrl, 1, true)
  const conn = await pool.connect()

  try {
    await conn.queryArray(`
      CREATE TABLE IF NOT EXISTS ifb_ticket_tiers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        event_id UUID NOT NULL REFERENCES ifb_events(id) ON DELETE CASCADE,
        tier_name TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL DEFAULT 0,
        capacity INTEGER NOT NULL DEFAULT 100,
        tickets_sold INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await conn.queryArray(`ALTER TABLE ifb_tickets ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES ifb_ticket_tiers(id) ON DELETE SET NULL`)
    await conn.queryArray(`ALTER TABLE ifb_tickets ADD COLUMN IF NOT EXISTS tier_name TEXT`)
    await conn.queryArray(`ALTER TABLE ifb_tickets ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10,2)`)
    await conn.queryArray(`ALTER TABLE ifb_ticket_tiers ENABLE ROW LEVEL SECURITY`)
    await conn.queryArray(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ifb_ticket_tiers' AND policyname='Anyone can read tiers') THEN
          CREATE POLICY "Anyone can read tiers" ON ifb_ticket_tiers FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ifb_ticket_tiers' AND policyname='Organizers can insert tiers') THEN
          CREATE POLICY "Organizers can insert tiers" ON ifb_ticket_tiers FOR INSERT TO authenticated WITH CHECK (event_id IN (SELECT id FROM ifb_events WHERE organizer_id = auth.uid()));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ifb_ticket_tiers' AND policyname='Organizers can update tiers') THEN
          CREATE POLICY "Organizers can update tiers" ON ifb_ticket_tiers FOR UPDATE TO authenticated USING (event_id IN (SELECT id FROM ifb_events WHERE organizer_id = auth.uid()));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ifb_ticket_tiers' AND policyname='Organizers can delete tiers') THEN
          CREATE POLICY "Organizers can delete tiers" ON ifb_ticket_tiers FOR DELETE TO authenticated USING (event_id IN (SELECT id FROM ifb_events WHERE organizer_id = auth.uid()));
        END IF;
      END $$
    `)
    return new Response(JSON.stringify({ ok: true, message: 'Migration complete' }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  } finally {
    conn.release()
    await pool.end()
  }
})
