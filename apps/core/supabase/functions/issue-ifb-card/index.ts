import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🛡️ Cryptographically Secure Number Generator
function generateSecureDigits(length: number): string {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, num => (num % 10).toString()).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, cardName, theme } = await req.json();

    if (!userId || !cardName) {
      throw new Error("Missing required telemetry for card issuance.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Generate PAN (16 digits: 4092 + 12 secure random digits)
    const bin = "4092"; 
    const secureAccountNum = generateSecureDigits(12);
    const pan = `${bin}${secureAccountNum}`;

    // 2. Generate Expiry (Between 3 and 5 years from today)
    const currentYear = new Date().getFullYear();
    const expiryYear = currentYear + 3 + (crypto.getRandomValues(new Uint8Array(1))[0] % 3);
    const expiryMonth = (1 + (crypto.getRandomValues(new Uint8Array(1))[0] % 12)).toString().padStart(2, '0');
    const expiry = `${expiryMonth}/${expiryYear.toString().slice(-2)}`;

    // 3. Generate CVV (3 secure digits)
    const cvv = generateSecureDigits(3);

    // 4. Generate Internal Network ID
    const networkId = `IFB-USR-${pan.slice(-4)}-${generateSecureDigits(4)}`;

    // 5. Securely Insert into Ledger
    const { error: insertError } = await supabaseAdmin
      .from('virtual_cards')
      .insert([{
        user_id: userId,
        network_id: networkId,
        pan: pan,
        expiry: expiry,
        cvv: cvv,
        name: cardName,
        theme: theme || 'obsidian',
        status: 'ACTIVE'
      }]);

    if (insertError) throw insertError;

    // Return success (We do NOT return the full PAN here for security, only the Network ID and last 4)
    return new Response(JSON.stringify({ 
      success: true, 
      networkId: networkId,
      last4: pan.slice(-4),
      message: "Card provisioned via AES-grade CSPRNG."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});