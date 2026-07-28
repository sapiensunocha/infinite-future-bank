import { supabase } from './supabaseClient';

export const commerceEngine = {
  // Automated Billing Logic
  async processAutoCharge(billId) {
    const { data: bill } = await supabase.from('ifb_bills').select('*, profiles(*)').eq('id', billId).single();
    
    // 1. Check if customer has enough AFR/USD
    const { data: balance } = await supabase.from('balances').select('liquid_usd').eq('user_id', bill.customer_id).single();

    if (balance.liquid_usd >= bill.amount) {
      // 2. Execute Atomic Transfer
      const { error } = await supabase.rpc('execute_internal_transfer', {
        sender: bill.customer_id,
        receiver: bill.creator_id,
        amt: bill.amount,
        memo: `Auto-Pay: ${bill.description}`
      });

      if (!error) {
        await supabase.from('ifb_bills').update({ status: 'paid', paid_at: new Date() }).eq('id', billId);
        return { success: true, message: "Payment Processed" };
      }
    }
    return { success: false, message: "Insufficient Funds" };
  },

  // QR Ticket Validation
  async validateTicket(qrHash) {
    const { data: ticket, error } = await supabase
      .from('ifb_tickets')
      .select('*, ifb_events(*)')
      .eq('qr_code_hash', qrHash)
      .single();

    if (error || !ticket) return { valid: false, message: "Invalid Ticket" };
    if (ticket.is_scanned) return { valid: false, message: "Already Scanned!" };

    // Mark as used
    await supabase.from('ifb_tickets').update({ is_scanned: true, scanned_at: new Date() }).eq('id', ticket.id);
    return { valid: true, event: ticket.ifb_events.event_name, message: "Access Granted" };
  }
};