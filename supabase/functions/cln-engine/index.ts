import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, payload, userId } = await req.json();

    switch (action) {
      // ── CREATE COMMUNITY ──────────────────────────────────────────────
      case 'create_community': {
        const { name, purpose, description, contribution_amount, contribution_frequency, max_members } = payload;

        const { data: comm, error } = await supabase
          .from('cln_communities')
          .insert({
            name, purpose, description,
            admin_id: userId,
            contribution_amount,
            contribution_frequency: contribution_frequency || 'monthly',
            max_members: max_members || 50,
          })
          .select()
          .single();

        if (error) throw error;

        // Auto-add creator as admin member
        await supabase.from('cln_members').insert({
          community_id: comm.id,
          user_id: userId,
          role: 'admin',
        });

        return json({ success: true, community: comm });
      }

      // ── JOIN COMMUNITY ────────────────────────────────────────────────
      case 'join_community': {
        const { community_id } = payload;

        const { data: comm } = await supabase
          .from('cln_communities')
          .select('max_members, status')
          .eq('id', community_id)
          .single();

        if (!comm || comm.status !== 'active') throw new Error('Community not available');

        const { count } = await supabase
          .from('cln_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', community_id);

        if ((count || 0) >= comm.max_members) throw new Error('Community is full');

        const { error } = await supabase.from('cln_members').insert({
          community_id,
          user_id: userId,
          role: 'member',
        });

        if (error) throw error;
        return json({ success: true });
      }

      // ── CONTRIBUTE ───────────────────────────────────────────────────
      case 'contribute': {
        const { community_id, amount } = payload;

        // Debit member's IFB liquid balance
        const { data: bal } = await supabase
          .from('balances')
          .select('liquid_usd')
          .eq('user_id', userId)
          .single();

        if (!bal || bal.liquid_usd < amount) throw new Error('Insufficient balance');

        // Deduct from member
        await supabase.from('balances')
          .update({ liquid_usd: bal.liquid_usd - amount })
          .eq('user_id', userId);

        // Add to community pool
        await supabase.from('cln_communities')
          .update({ pool_balance: supabase.rpc('pool_balance') })
          .eq('id', community_id);

        // Raw increment via rpc workaround
        await supabase.rpc('increment_cln_pool', { p_community_id: community_id, p_amount: amount }).catch(() =>
          supabase.from('cln_communities')
            .select('pool_balance').eq('id', community_id).single()
            .then(({ data }) =>
              supabase.from('cln_communities')
                .update({ pool_balance: (data?.pool_balance || 0) + amount })
                .eq('id', community_id)
            )
        );

        // Log contribution
        const period = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        await supabase.from('cln_contributions').insert({
          community_id, user_id: userId, amount,
          period_label: period, status: 'completed',
          tx_hash: `cln_${Date.now()}_${userId.slice(0,8)}`,
        });

        // Update member total contributed
        const { data: mem } = await supabase
          .from('cln_members')
          .select('total_contributed')
          .eq('community_id', community_id)
          .eq('user_id', userId)
          .single();

        await supabase.from('cln_members')
          .update({ total_contributed: (mem?.total_contributed || 0) + amount })
          .eq('community_id', community_id)
          .eq('user_id', userId);

        return json({ success: true });
      }

      // ── REQUEST LOAN ─────────────────────────────────────────────────
      case 'request_loan': {
        const { community_id, amount, purpose, repayment_days } = payload;

        // Verify member and compute max loan
        const { data: mem } = await supabase
          .from('cln_members')
          .select('total_contributed, active_loan_amount')
          .eq('community_id', community_id)
          .eq('user_id', userId)
          .single();

        if (!mem) throw new Error('You are not a member of this community');
        if (mem.active_loan_amount > 0) throw new Error('You already have an active loan in this community');

        const { data: comm } = await supabase
          .from('cln_communities')
          .select('pool_balance, loan_limit_multiplier, contribution_amount')
          .eq('id', community_id)
          .single();

        const maxLoan = (mem.total_contributed || 0) * (comm?.loan_limit_multiplier || 3);
        if (amount > maxLoan) throw new Error(`Max loan is $${maxLoan.toFixed(2)} based on your contributions`);
        if (amount > (comm?.pool_balance || 0) * 0.8) throw new Error('Loan exceeds 80% of pool — too large');

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (repayment_days || 90));

        const { data: loan, error } = await supabase
          .from('cln_loan_requests')
          .insert({
            community_id, borrower_id: userId,
            borrower_name: profile?.full_name || 'Member',
            amount, purpose,
            repayment_days: repayment_days || 90,
            due_date: dueDate.toISOString(),
            votes_needed: 3,
            status: 'voting',
          })
          .select()
          .single();

        if (error) throw error;
        return json({ success: true, loan });
      }

      // ── VOTE ON LOAN ─────────────────────────────────────────────────
      case 'vote_loan': {
        const { loan_request_id, vote } = payload; // vote: 'approve' | 'reject'

        // Record vote (unique constraint prevents double voting)
        const { error: vErr } = await supabase.from('cln_votes').insert({
          loan_request_id, voter_id: userId, vote,
        });
        if (vErr) throw new Error('You have already voted on this loan');

        // Tally votes
        const { data: loan } = await supabase
          .from('cln_loan_requests')
          .select('votes_for, votes_against, votes_needed, amount, borrower_id, community_id')
          .eq('id', loan_request_id)
          .single();

        const newFor     = (loan.votes_for     || 0) + (vote === 'approve' ? 1 : 0);
        const newAgainst = (loan.votes_against || 0) + (vote === 'reject'  ? 1 : 0);

        let newStatus = 'voting';
        if (newFor >= loan.votes_needed) newStatus = 'approved';
        if (newAgainst >= loan.votes_needed) newStatus = 'rejected';

        await supabase.from('cln_loan_requests')
          .update({ votes_for: newFor, votes_against: newAgainst, status: newStatus })
          .eq('id', loan_request_id);

        // Auto-disburse on approval
        if (newStatus === 'approved') {
          const { data: borrowerBal } = await supabase
            .from('balances').select('liquid_usd').eq('user_id', loan.borrower_id).single();
          const { data: comm } = await supabase
            .from('cln_communities').select('pool_balance').eq('id', loan.community_id).single();

          await supabase.from('balances')
            .update({ liquid_usd: (borrowerBal?.liquid_usd || 0) + loan.amount })
            .eq('user_id', loan.borrower_id);

          await supabase.from('cln_communities')
            .update({ pool_balance: Math.max(0, (comm?.pool_balance || 0) - loan.amount) })
            .eq('id', loan.community_id);

          await supabase.from('cln_members')
            .update({ active_loan_amount: loan.amount })
            .eq('community_id', loan.community_id)
            .eq('user_id', loan.borrower_id);

          await supabase.from('cln_loan_requests')
            .update({
              status: 'disbursed',
              disbursed_at: new Date().toISOString(),
              tx_hash: `cln_disburse_${Date.now()}`,
            })
            .eq('id', loan_request_id);
        }

        return json({ success: true, new_status: newStatus });
      }

      // ── REPAY LOAN ───────────────────────────────────────────────────
      case 'repay_loan': {
        const { loan_request_id, amount } = payload;

        const { data: loan } = await supabase
          .from('cln_loan_requests')
          .select('amount, repaid_amount, community_id, borrower_id')
          .eq('id', loan_request_id)
          .single();

        if (!loan) throw new Error('Loan not found');

        const { data: bal } = await supabase
          .from('balances').select('liquid_usd').eq('user_id', userId).single();

        if (!bal || bal.liquid_usd < amount) throw new Error('Insufficient balance');

        // Debit borrower
        await supabase.from('balances')
          .update({ liquid_usd: bal.liquid_usd - amount })
          .eq('user_id', userId);

        // Credit pool
        const { data: comm } = await supabase
          .from('cln_communities').select('pool_balance').eq('id', loan.community_id).single();
        await supabase.from('cln_communities')
          .update({ pool_balance: (comm?.pool_balance || 0) + amount })
          .eq('id', loan.community_id);

        const newRepaid = (loan.repaid_amount || 0) + amount;
        const fullyRepaid = newRepaid >= loan.amount;

        await supabase.from('cln_loan_requests')
          .update({
            repaid_amount: newRepaid,
            status: fullyRepaid ? 'repaid' : 'disbursed',
          })
          .eq('id', loan_request_id);

        if (fullyRepaid) {
          await supabase.from('cln_members')
            .update({ active_loan_amount: 0, repayment_score: 75 })
            .eq('community_id', loan.community_id)
            .eq('user_id', userId);
        }

        await supabase.from('cln_repayments').insert({
          loan_request_id, user_id: userId,
          community_id: loan.community_id,
          amount, tx_hash: `cln_repay_${Date.now()}`,
        });

        // Recalculate group credit score
        await recalcGroupScore(loan.community_id);

        return json({ success: true, fully_repaid: fullyRepaid });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function recalcGroupScore(communityId: string) {
  const { data: loans } = await supabase
    .from('cln_loan_requests')
    .select('status')
    .eq('community_id', communityId);

  const total    = loans?.length || 0;
  const repaid   = loans?.filter(l => l.status === 'repaid').length || 0;
  const defaults = loans?.filter(l => l.status === 'defaulted').length || 0;

  const repaymentScore  = total > 0 ? Math.round((repaid / total) * 100) : 50;
  const defaultRisk     = total > 0 ? Math.round((defaults / total) * 100) : 0;
  const groupCreditScore = Math.max(0, Math.min(100, repaymentScore - defaultRisk * 2));

  await supabase.from('cln_communities').update({
    repayment_score: repaymentScore,
    default_risk_score: defaultRisk,
    group_credit_score: groupCreditScore,
    updated_at: new Date().toISOString(),
  }).eq('id', communityId);
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
