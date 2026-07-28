import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// AI Keys
const geminiKey = Deno.env.get('GEMINI_API_KEY')
const grokKey = Deno.env.get('GROK_API_KEY')
const ollamaKey = Deno.env.get('OLLAMA_API_KEY') // Updated to match your Cloud Key

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🧠 THE MULTI-AI FALLBACK ENGINE
async function fetchAiAdvice(prompt: string): Promise<string> {
  // ATTEMPT 1: GEMINI (Fastest, highly analytical)
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates[0].content.parts[0].text.trim();
      }
    } catch (e) { console.warn("Gemini failed, switching to Grok..."); }
  }

  // ATTEMPT 2: GROK (xAI API - Secondary Fallback)
  if (grokKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${grokKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'grok-beta', messages: [{ role: 'user', content: prompt }] })
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content.trim();
      }
    } catch (e) { console.warn("Grok failed, switching to Ollama..."); }
  }

  // ATTEMPT 3: OLLAMA (Sovereign Cloud Infrastructure)
  if (ollamaKey) {
    try {
      const res = await fetch(`https://ollama.com/api/generate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${ollamaKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ model: 'llama3', prompt: prompt, stream: false })
      });
      if (res.ok) {
        const data = await res.json();
        return data.response.trim();
      }
    } catch (e) { console.warn("Ollama failed, engaging deterministic protocols."); }
  }

  throw new Error("All AI providers failed.");
}

// 🧠 AI AGENT: Evaluates campaign state and routes generation
async function processCoachingTrack(campaignId: string, stage: string, dataCtx: any) {
  let directive = "Maintain current operational velocity.";
  let requiresAction = false;

  // Build the intelligent prompt
  const systemContext = `You are the IFB Venture Intelligence AI. Your job is to provide short, serious, highly actionable advice to startup founders. Do not use pleasantries. Output only the exact directive.`;
  let prompt = "";

  if (stage === 'Draft') {
    prompt = `${systemContext} The founder is drafting a campaign in the ${dataCtx.sector} sector targeting ${dataCtx.target_amount} USD. Tell them exactly what metrics and documentation they need to add to reach 'Vetted' status for institutional investors.`;
    requiresAction = true;
  } else if (stage === 'Fundraising') {
    prompt = `${systemContext} The founder has raised ${dataCtx.raised} of their ${dataCtx.target} target. Give a brief, strategic directive on preparing operational accounts for the first capital injection.`;
    requiresAction = false;
  } else if (stage === 'Milestone_Missed') {
    prompt = `${systemContext} The founder missed their API-verified target of ${dataCtx.target}. They are currently at ${dataCtx.current}. Escrow release is frozen. Issue a strict "URGENT CORRECTION" directive instructing them to pivot strategy to close the gap.`;
    requiresAction = true;
  } else if (stage === 'Milestone_Achieved') {
    prompt = `${systemContext} The founder successfully hit their milestone and funds were released from escrow. Give a brief, professional directive to begin execution on the next phase.`;
    requiresAction = false;
  }

  try {
    // Call the Multi-AI router
    directive = await fetchAiAdvice(prompt);
  } catch (error) {
    // Deterministic Fallback if entire AI grid goes offline
    directive = stage === 'Milestone_Missed' 
      ? "SYSTEM WARNING: Milestone target not met. Escrow locked. Immediate operational correction required." 
      : "SYSTEM NOTICE: Campaign update registered. Ensure all data is up to date.";
  }

  // Inject the advice into the founder's coaching track
  await supabase.from('founder_coaching_tracks').insert([{
    campaign_id: campaignId,
    current_stage: stage,
    ai_directive: directive,
    action_required: requiresAction
  }]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized Access')

    const { action, payload } = await req.json()

    switch (action) {
      
      // 1. FOUNDER: Creates campaign. AI evaluates and sets required actions.
      case 'create_campaign': {
        const { title, target_amount, location, sector } = payload
        const { data: campaign, error } = await supabase.from('funding_campaigns').insert([{
          user_id: user.id, title, target_amount, location, sector, campaign_status: 'Draft', raised_amount: 0
        }]).select().single()
        
        if (error) throw error
        await processCoachingTrack(campaign.id, 'Draft', campaign)

        return new Response(JSON.stringify({ success: true, campaign }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 2. INVESTOR: Commits capital. Triggers SQL RPC Escrow.
      case 'commit_capital': {
        const { campaign_id, amount } = payload
        const { error: rpcError } = await supabase.rpc('commit_venture_capital', {
          p_investor_id: user.id, p_campaign_id: campaign_id, p_amount: amount
        })

        if (rpcError) throw rpcError
        const { data: campaign } = await supabase.from('funding_campaigns').select('*').eq('id', campaign_id).single()
        await processCoachingTrack(campaign_id, 'Fundraising', { raised: campaign.raised_amount, target: campaign.target_amount })

        return new Response(JSON.stringify({ success: true, message: `Locked $${amount} into performance escrow.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 3. AUTOMATED SYSTEM: Verifies milestone against API data and routes to Go-Engine Mainnet.
      case 'verify_milestone': {
        const { milestone_id, current_metric } = payload
        const { data: milestone } = await supabase.from('campaign_milestones').select('*, funding_campaigns(user_id, target_amount)').eq('id', milestone_id).single()
        
        if (!milestone) throw new Error('Milestone not found.')
        if (milestone.status === 'Released') throw new Error('Capital already deployed.')

        if (current_metric >= milestone.target_api_metric) {
          const releaseAmount = (milestone.capital_release_pct / 100) * milestone.funding_campaigns.target_amount
          
          // 1. Execute atomic release of escrow funds to founder's wallet in PostgreSQL (The Fiat View)
          await supabase.rpc('release_milestone_funds', {
             p_campaign_id: milestone.campaign_id, p_founder_id: milestone.funding_campaigns.user_id, p_release_amount: releaseAmount
          })
          
          // 2. Update milestone status
          await supabase.from('campaign_milestones').update({ status: 'Released' }).eq('id', milestone_id)

          // 3. 🌐 THE BLOCKCHAIN BRIDGE: Ping the Go-Engine Mainnet
          const goEngineUrl = "http://35.238.28.158:8545";
          try {
            const rpcPayload = {
              jsonrpc: "2.0",
              method: "ifb_executeAfrTransfer",
              params: [{
                from: "IFB_VENTURE_ESCROW",
                to: milestone.funding_campaigns.user_id,
                usd_equivalent: releaseAmount,
                chainId: 2026,
                reference: `Milestone_Release_${milestone_id}`
              }],
              id: Date.now()
            };

            const rpcResponse = await fetch(goEngineUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rpcPayload)
            });

            const rpcData = await rpcResponse.json();
            if (rpcData.error) {
              console.error("AIVS Consensus Warning: Go-Engine rejected the settlement.", rpcData.error);
            } else {
              console.log(`Go-Engine Settlement Complete. TxHash: ${rpcData.result}`);
            }
          } catch (chainErr) {
            console.error("Critical: Cannot reach IFB Mainnet at 35.238.28.158. Settlement recorded in DB, pending ledger sync.", chainErr);
          }

          // 4. AI Agent congratulates and gives next objective
          await processCoachingTrack(milestone.campaign_id, 'Milestone_Achieved', {})

          return new Response(JSON.stringify({ success: true, message: `Milestone hit. $${releaseAmount} released to operational accounts.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } else {
          await processCoachingTrack(milestone.campaign_id, 'Milestone_Missed', { current: current_metric, target: milestone.target_api_metric })
          return new Response(JSON.stringify({ success: false, message: 'Milestone metric not met. Funds locked.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      default:
        throw new Error('Invalid venture engine action.')
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})