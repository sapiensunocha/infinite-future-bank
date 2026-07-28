import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// To send actual emails, we will use the Resend API (Standard for modern React apps)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''; 
const APP_DOMAIN = "https://deus.infinitefuturebank.org";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { eventId, eventName, prompt, organizerEmail } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- 1. SMART PROMPT PARSER ---
    // Extract emails using Regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const extractedEmails = prompt.match(emailRegex) || [];

    // Extract numbers if they typed "Create 10 tickets"
    let numberOfGenericTickets = 0;
    if (extractedEmails.length === 0) {
      const numberMatch = prompt.match(/\b(\d+)\b/);
      if (numberMatch) {
        numberOfGenericTickets = parseInt(numberMatch[1], 10);
      } else {
        numberOfGenericTickets = 1; // Default fallback
      }
    }

    // Protect against massive spam (Max 50 at a time)
    if (numberOfGenericTickets > 50) numberOfGenericTickets = 50;

    // --- 2. BUILD TICKET BATCH ---
    const ticketsToInsert = [];
    const emailsToSend = [];

    // Scenario A: They pasted specific emails
    if (extractedEmails.length > 0) {
      extractedEmails.forEach((email: string) => {
        const hash = `IFB-${crypto.randomUUID()}`;
        ticketsToInsert.push({ event_id: eventId, buyer_email: email, qr_code_hash: hash, status: 'active' });
        emailsToSend.push({ email: email, hash: hash });
      });
    } 
    // Scenario B: They typed "Generate 5 tickets"
    else {
      for (let i = 0; i < numberOfGenericTickets; i++) {
        const hash = `IFB-${crypto.randomUUID()}`;
        // Assign generic tickets to the organizer to hand out manually, or leave email null
        ticketsToInsert.push({ event_id: eventId, buyer_email: `Guest-${i+1}-${organizerEmail}`, qr_code_hash: hash, status: 'active' });
      }
    }

    // --- 3. INSERT INTO DATABASE ---
    const { data: savedTickets, error: insertError } = await supabaseAdmin
      .from('ifb_tickets')
      .insert(ticketsToInsert)
      .select()

    if (insertError) throw insertError

    // --- 4. SEND REAL EMAILS (If emails were provided) ---
    // If you don't have a Resend key yet, this simply skips and avoids crashing.
    if (RESEND_API_KEY && emailsToSend.length > 0) {
      for (const target of emailsToSend) {
        const ticketUrl = `${APP_DOMAIN}/ticket/${target.hash}`;
        
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'DEUS Network <tickets@deus.infinitefuturebank.org>',
            to: target.email,
            subject: `Your Secure Ticket for ${eventName}`,
            html: `
              <div style="font-family: monospace; background: #0f172a; color: white; padding: 40px; border-radius: 20px;">
                <h2 style="color: #818cf8;">ENTRY SECURED: ${eventName}</h2>
                <p>Your cryptographic ticket has been generated on the DEUS network.</p>
                <div style="background: white; padding: 20px; display: inline-block; border-radius: 10px; margin: 20px 0;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketUrl)}" />
                </div>
                <p><strong>Hash:</strong> ${target.hash}</p>
                <p>Or click here to view: <a href="${ticketUrl}" style="color: #34d399;">Access Ticket</a></p>
              </div>
            `
          })
        });
      }
    }

    // Return success
    return new Response(JSON.stringify({ success: true, tickets: savedTickets }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})