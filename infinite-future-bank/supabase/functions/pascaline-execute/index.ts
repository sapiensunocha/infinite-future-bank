import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.8.0' // Real blockchain integration

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. INITIALIZE SECURE CLIENTS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
    )

    // Parse Request (Can be triggered by UI or by CRON Job)
    const { userId, assetSymbol, amount } = await req.json()
    if (!userId || !amount || amount <= 0) throw new Error("Invalid parameters.");

    // =========================================================================
    // LAYER 1 & 2: DATA INGESTION & FEATURE ENGINEERING (QUANT MATH)
    // =========================================================================
    
    // Fetch last 20 days of historical data from Alpaca Market Data API
    const alpacaKey = Deno.env.get('ALPACA_API_KEY');
    const alpacaSecret = Deno.env.get('ALPACA_API_SECRET');
    const today = new Date();
    const past20Days = new Date(today.getTime() - (20 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    const marketRes = await fetch(`https://data.alpaca.markets/v2/stocks/${assetSymbol}/bars?start=${past20Days}&timeframe=1Day`, {
        headers: { 'APCA-API-KEY-ID': alpacaKey, 'APCA-API-SECRET-KEY': alpacaSecret }
    });
    const marketData = await marketRes.json();
    
    if (!marketData.bars || marketData.bars.length < 10) {
        throw new Error("Insufficient market data for algorithmic scoring.");
    }

    const closePrices = marketData.bars.map((b: any) => b.c);
    const currentPrice = closePrices[closePrices.length - 1];

    // ALGORITHM 1: Momentum (Simple Moving Average - SMA)
    const sum = closePrices.reduce((a: number, b: number) => a + b, 0);
    const sma20 = sum / closePrices.length;
    const momentumScore = ((currentPrice - sma20) / sma20) * 100; // % deviation from average

    // ALGORITHM 2: Volatility (Standard Deviation)
    const variance = closePrices.reduce((a: number, b: number) => a + Math.pow(b - sma20, 2), 0) / closePrices.length;
    const standardDeviation = Math.sqrt(variance);
    const volatilityScore = (standardDeviation / currentPrice) * 100; // Normalized volatility

    // Generate Final "AI" Confidence Score (0 to 100)
    // High momentum is good, high volatility reduces confidence
    let aiConfidence = 50 + (momentumScore * 5) - (volatilityScore * 2);
    aiConfidence = Math.min(Math.max(Math.round(aiConfidence), 1), 99);

    if (aiConfidence < 45) {
        throw new Error(`Pascaline Engine Abort: AI Confidence too low (${aiConfidence}%). High volatility or negative momentum detected.`);
    }

    // =========================================================================
    // LAYER 3: RISK CONTROL LAYER
    // =========================================================================
    
    const { data: balanceData, error: balanceError } = await supabaseClient
      .from('balances')
      .select('liquid_usd, alpha_equity_usd')
      .eq('user_id', userId)
      .single();

    if (balanceError || !balanceData) throw new Error("Account Not Found.");
    if (balanceData.liquid_usd < amount) throw new Error("Insufficient Liquidity.");

    // Risk Rule: Cannot allocate more than 15% of total net worth into a single trade
    const totalNetWorth = balanceData.liquid_usd + balanceData.alpha_equity_usd;
    if (amount > (totalNetWorth * 0.15)) {
        throw new Error("Risk Limits Exceeded: Order violates 15% maximum portfolio allocation rule.");
    }

    // =========================================================================
    // LAYER 4: BLOCKCHAIN VALIDATION & INSURANCE AUDIT
    // =========================================================================
    
    const rpcUrl = Deno.env.get('RPC_NODE_URL'); // e.g. QuickNode Polygon URL
    const privateKey = Deno.env.get('BLOCKCHAIN_PRIVATE_KEY');
    
    // We connect to the blockchain to log the intent and check the Insurance Smart Contract
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Minimal ABI for your theoretical Pascaline Smart Contract
    const contractAbi = [
        "function validateAndLogTrade(string symbol, uint256 amount, uint256 riskScore) public returns (bool)"
    ];
    const contractAddress = Deno.env.get('PASCALINE_CONTRACT_ADDRESS');
    const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

    let onChainTxHash = "Awaiting Finality...";
    try {
        // This writes the trade permanently to the blockchain BEFORE executing it.
        // The smart contract returns true if the Insurance Pool can cover it.
        const tx = await contract.validateAndLogTrade(assetSymbol, Math.round(amount), aiConfidence);
        const receipt = await tx.wait(); // Wait for actual block confirmation
        onChainTxHash = receipt.hash;
    } catch (e) {
        throw new Error("Blockchain Validator Rejected Trade: Insurance Pool threshold not met or RPC failure.");
    }

    // =========================================================================
    // LAYER 5: REAL BROKER EXECUTION (ALPACA API)
    // =========================================================================
    
    // Convert dollar amount to fractional shares based on current price
    const fractionalQty = (amount / currentPrice).toFixed(5);

    const brokerRes = await fetch('https://paper-api.alpaca.markets/v2/orders', {
        method: 'POST',
        headers: {
            'APCA-API-KEY-ID': alpacaKey,
            'APCA-API-SECRET-KEY': alpacaSecret,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            symbol: assetSymbol,
            qty: fractionalQty,
            side: 'buy',
            type: 'market',
            time_in_force: 'day'
        })
    });

    if (!brokerRes.ok) {
        const brokerErr = await brokerRes.json();
        throw new Error(`Alpaca Execution Failed: ${brokerErr.message}`);
    }
    const brokerOrder = await brokerRes.json();

    // =========================================================================
    // LAYER 6: INTERNAL LEDGER RECONCILIATION
    // =========================================================================
    
    // Deduct Cash, Add to Equity
    await supabaseClient.from('balances').update({
        liquid_usd: balanceData.liquid_usd - amount,
        alpha_equity_usd: balanceData.alpha_equity_usd + amount
    }).eq('user_id', userId);

    // Log the transaction
    await supabaseClient.from('transactions').insert({
        user_id: userId,
        amount: -amount,
        transaction_type: 'invest',
        description: `Pascaline Execution: ${assetSymbol} @ ${currentPrice}`,
        status: 'completed',
        metadata: { 
            tx_hash: onChainTxHash, 
            ai_score: aiConfidence, 
            broker_id: brokerOrder.id,
            shares: fractionalQty
        }
    });

    // Update Investments Portfolio
    await supabaseClient.from('investments').insert({
        user_id: userId,
        investment_type: assetSymbol,
        amount_invested: amount,
        current_value: amount, // Real-time value syncing happens separately
        returns: 0
    });

    return new Response(
      JSON.stringify({ 
          success: true, 
          txHash: onChainTxHash, 
          brokerId: brokerOrder.id,
          aiConfidence 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})