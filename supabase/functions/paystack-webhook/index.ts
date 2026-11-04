// paystack-webhook — Payment Pages settlement via Paystack.
// Register in Paystack Dashboard → Settings → API Keys & Webhooks:
//   https://<project-ref>.supabase.co/functions/v1/paystack-webhook
// verify_jwt = false: authenticity is the x-paystack-signature HMAC-SHA512 of the
// raw body with PAYSTACK_SECRET_KEY, checked BEFORE the body is parsed. The event
// is then re-verified with Paystack's API (status, amount, currency) before any
// money moves. Ignored events always get 200.
import { createClient } from "npm:@supabase/supabase-js@2";
import { timingSafeEqualStr } from "../_shared/auth.ts";
import { finalizePaidOrder, hmacHex, markPageOrderPaid, orderIdFromRef, verifyPaystack } from "../_shared/page-orders.ts";

const ok = (extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ received: true, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) {
    console.error("paystack-webhook: PAYSTACK_SECRET_KEY not set — rejecting");
    return new Response("Webhook not configured", { status: 500 });
  }

  const raw = await req.text();
  const signature = (req.headers.get("x-paystack-signature") ?? "").trim().toLowerCase();
  const expected = await hmacHex("SHA-512", secret, raw);
  if (!signature || !timingSafeEqualStr(signature, expected)) {
    return new Response("Forbidden", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: unknown } };
  try {
    event = JSON.parse(raw);
  } catch {
    return ok({ ignored: true });
  }

  if (event?.event !== "charge.success") return ok({ ignored: true });
  const reference = event.data?.reference;
  const orderId = orderIdFromRef(reference);
  if (!orderId) return ok({ ignored: true });

  let v;
  try {
    v = await verifyPaystack(reference as string);
  } catch (e) {
    console.error("paystack-webhook: verify failed:", e instanceof Error ? e.message : "error");
    return new Response("verification failed", { status: 500 }); // Paystack retries
  }
  if (!v.ok || v.tx_ref !== reference || v.currency !== "USD") {
    console.warn("paystack-webhook: charge not accepted for order", orderId);
    return ok({ skipped: true });
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });
  const outcome = await markPageOrderPaid(sb, orderId, "paystack", v.ref || String(reference), v.amount_cents, v.currency);
  if (outcome === "error") return new Response("settle failed", { status: 500 });
  if (outcome === "paid") await finalizePaidOrder(sb, orderId);
  return ok({ page_order: true });
});
