import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
    )

    const { userId, companyId, investAmount, insuranceTier, aiRiskScore } = await req.json()

    if (!userId || !investAmount || investAmount <= 0) {
        throw new Error("Invalid request payload.");
    }

    // 1. Verify Liquidity
    const { data: balanceData } = await supabaseClient.from('balances').select('*').eq('user_id', userId).single();
    if (!balanceData || balanceData.liquid_usd < investAmount) {
        throw new Error("Insufficient Liquidity.");
    }

    // 2. DUAL INSURANCE MATH LOGIC
    // Premium is higher if AI Risk Score is high. Premium is also higher for 'premium' tier.
    const riskMultiplier = aiRiskScore > 50 ? 0.05 : 0.02; 
    const tierMultiplier = insuranceTier === 'premium' ? 1.5 : 1.0;
    
    const userPremium = investAmount * riskMultiplier * tierMultiplier;
    const userCoverage = insuranceTier === 'premium' ? investAmount * 0.99 : investAmount * 0.80;
    
    // 3. GENERATE INTERNAL AUDIT HASH
    const mockHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');

    // 4. WRITE USER INSURANCE POLICY
    const { data: policyData, error: policyError } = await supabaseClient.from('insurance_policies').insert({
        policy_type: 'USER_INVESTMENT',
        insured_entity_id: userId,
        coverage_amount: userCoverage,
        premium: userPremium,
        blockchain_hash: mockHash
    }).select('id').single();

    if (policyError) throw new Error("Failed to underwrite policy.");

    // 5. UPDATE BALANCES (Move cash to equity)
    await supabaseClient.from('balances').update({
        liquid_usd: balanceData.liquid_usd - investAmount,
        alpha_equity_usd: balanceData.alpha_equity_usd + investAmount
    }).eq('user_id', userId);

    // 6. RECORD THE PORTFOLIO INVESTMENT
    await supabaseClient.from('portfolios').insert({
        user_id: userId,
        company_id: companyId,
        invest_amount: investAmount,
        insurance_policy_id: policyData.id,
        predicted_return: 25.0, // Internal Target
        blockchain_hash: mockHash
    });

    // 7. RECORD LEDGER TRANSACTION
    await supabaseClient.from('transactions').insert({
        user_id: userId,
        amount: -investAmount,
        transaction_type: 'invest',
        description: `Pascaline Allocation: Private Equity (${insuranceTier} Insurance)`,
        status: 'completed',
        metadata: { hash: mockHash, ai_score: aiRiskScore, company: companyId }
    });

    return new Response(
      JSON.stringify({ success: true, txHash: mockHash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})