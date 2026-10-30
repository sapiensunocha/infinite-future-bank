// issue-ifb-card
// Provisions a new virtual IFB Sovereign Card for the authenticated user.
//
// SECURITY: card data is generated with a CSPRNG. The CVV is NEVER stored.
// TODO(PCI): move issuing to Stripe Issuing and store only last4 + the issuer's
// card token. The PAN is still stored here because ifb-charge-card and the card
// display depend on it — remove once tokenized.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, getAuthedUser, errorResponse, jsonResponse } from "../_shared/auth.ts";

function secureDigits(length: number): string {
  // Rejection sampling avoids modulo bias.
  const out: string[] = [];
  while (out.length < length) {
    const buf = crypto.getRandomValues(new Uint8Array(length));
    for (const b of buf) if (b < 250 && out.length < length) out.push(String(b % 10));
  }
  return out.join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const user = await getAuthedUser(req);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { cardName, theme } = await req.json();

    // 1. Generate card data — 16-digit PAN: IFB BIN (6) + 10 CSPRNG digits
    const bin = "442188"; // IFB Bin (Visa range)
    const pan = bin + secureDigits(10);
    const exp = new Date();
    exp.setUTCFullYear(exp.getUTCFullYear() + 4);
    const expiry = `${String(exp.getUTCMonth() + 1).padStart(2, "0")}/${String(exp.getUTCFullYear()).slice(-2)}`;
    const network_id = `NET_${secureDigits(10)}`;

    // 2. Provision in Database (no CVV column written)
    const { data: card, error: provisionErr } = await sb.from("virtual_cards").insert([{
      user_id: user.id,
      name: cardName || "Sovereign Platinum",
      pan,
      expiry,
      status: "ACTIVE",
      theme: theme || "obsidian",
      network_id,
    }]).select("id").single();

    if (provisionErr) {
      console.error("issue-ifb-card provision error:", provisionErr.message);
      return jsonResponse(req, { error: "Card provisioning failed" }, 500);
    }

    // 3. Log to Blockchain Ledger
    await sb.from("afr_ledger").insert({
      user_id: user.id,
      tx_type: "mint",
      afr_amount: 0,
      usd_equivalent: 0,
      notes: `Provisioned New Sovereign Card: ${network_id}`,
      status: "confirmed",
    });

    return jsonResponse(req, { ok: true, card_id: card.id, last4: pan.slice(-4), expiry });
  } catch (err) {
    return errorResponse(req, err);
  }
});
