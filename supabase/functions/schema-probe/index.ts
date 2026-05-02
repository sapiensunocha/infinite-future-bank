import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cols = async (table: string, fields: string[]) => {
    const results: Record<string, string> = {};
    for (const f of fields) {
      const { error } = await sb.from(table).select(f).limit(0);
      results[f] = error ? 'MISSING: ' + error.message.slice(0, 60) : 'OK';
    }
    return results;
  };
  return new Response(JSON.stringify({
    balances: await cols('balances', ['liquid_usd','afr_balance','escrow_usd','usd_balance','total_deposited']),
    smart_contracts: await cols('smart_contracts', ['creator_id','title','amount','provider_email','status','escrow_usd']),
    payroll_runs: await cols('payroll_runs', ['org_id','employer_id','total_amount','total_gross_amount','fee_amount','status']),
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
