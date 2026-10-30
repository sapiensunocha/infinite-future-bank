import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";
import { corsHeaders, getAuthedUser, HttpError, jsonResponse, errorResponse } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const user = await getAuthedUser(req);
    const { payment_intent_id } = await req.json();
    if (typeof payment_intent_id !== "string" || !payment_intent_id.startsWith("pi_")) {
      throw new HttpError(400, "Invalid payment_intent_id");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the PaymentIntent from Stripe
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // The PI must belong to the caller
    const ownerId = intent.metadata?.userId ?? intent.metadata?.user_id;
    if (ownerId !== user.id) throw new HttpError(403, "Payment does not belong to this user");

    if (intent.status !== "succeeded") {
      return jsonResponse(req, { credited: false, reason: "Payment not succeeded" });
    }
    if (intent.currency !== "usd") throw new HttpError(400, "Unsupported currency");

    const depositAmount = intent.amount_received / 100;

    // Idempotent credit keyed by PaymentIntent id (shared with stripe-webhook)
    const { data: credited, error } = await supabaseAdmin.rpc("credit_deposit", {
      p_user_id: user.id,
      p_amount: depositAmount,
      p_currency: "USD",
      p_external_id: intent.id,
      p_source: "stripe",
    });
    if (error) throw new Error(`credit_deposit failed: ${error.message}`);

    if (!credited) return jsonResponse(req, { credited: false, reason: "Already credited" });
    return jsonResponse(req, { credited: true, amount: depositAmount });
  } catch (err) {
    return errorResponse(req, err);
  }
});
