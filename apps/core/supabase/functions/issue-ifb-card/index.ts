import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, getAuthedUser, HttpError, jsonResponse, errorResponse } from "../_shared/auth.ts";

// SECURITY: the CVV is NEVER stored.
// TODO(PCI): move issuing to Stripe Issuing and store only last4 + the issuer's card
// token. The PAN is still stored because ifb-charge-card and the card UI depend on it.

// 🛡️ Cryptographically Secure Number Generator (rejection sampling, no modulo bias)
function generateSecureDigits(length: number): string {
  const out: string[] = [];
  while (out.length < length) {
    const buf = crypto.getRandomValues(new Uint8Array(length));
    for (const b of buf) if (b < 250 && out.length < length) out.push(String(b % 10));
  }
  return out.join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  try {
    // Identity from the JWT; any userId in the body is ignored.
    const user = await getAuthedUser(req);
    const { cardName, theme } = await req.json();

    if (!cardName) {
      throw new HttpError(400, "Missing required telemetry for card issuance.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Generate PAN (16 digits: 4092 + 12 secure random digits)
    const bin = "4092"; 
    const pan = `${bin}${generateSecureDigits(12)}`;

    // 2. Expiry: now + 4 years
    const exp = new Date();
    exp.setUTCFullYear(exp.getUTCFullYear() + 4);
    const expiry = `${String(exp.getUTCMonth() + 1).padStart(2, '0')}/${String(exp.getUTCFullYear()).slice(-2)}`;

    // 3. Generate Internal Network ID
    const networkId = `IFB-USR-${pan.slice(-4)}-${generateSecureDigits(4)}`;

    // 4. Insert (no CVV stored)
    const { error: insertError } = await supabaseAdmin
      .from('virtual_cards')
      .insert([{
        user_id: user.id,
        network_id: networkId,
        pan: pan,
        expiry: expiry,
        name: cardName,
        theme: theme || 'obsidian',
        status: 'ACTIVE'
      }]);

    if (insertError) {
      console.error('issue-ifb-card insert error:', insertError.message);
      throw new HttpError(500, 'Card provisioning failed');
    }

    // Return success (We do NOT return the full PAN here for security, only the Network ID and last 4)
    return jsonResponse(req, {
      success: true,
      networkId: networkId,
      last4: pan.slice(-4),
      expiry,
    });

  } catch (error) {
    return errorResponse(req, error);
  }
});
