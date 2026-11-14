// Transaction PIN check for edge functions that move a customer's money.
// The customer verifies their PIN in the app (verify_transaction_pin), which grants ONE
// money action for 2 minutes; this consumes that grant. Customers who have not set a PIN
// yet are allowed (see migration 20261124 for the rollout rule).
import { HttpError } from "./auth.ts";

// deno-lint-ignore no-explicit-any
export async function requirePinGrant(admin: any, userId: string): Promise<void> {
  const { data, error } = await admin.rpc("consume_pin_grant", { p_user_id: userId });
  if (error) {
    // Function not deployed yet (migration pending): do not block payouts.
    if (error.code === "PGRST202" || error.code === "42883") return;
    throw new Error(`consume_pin_grant: ${error.code}`);
  }
  if (data === false) throw new HttpError(403, "PIN_REQUIRED: enter your transaction PIN to continue.");
}
