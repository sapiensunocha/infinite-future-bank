# IFB payout relay

Flutterwave only accepts transfer (payout) requests from whitelisted IP addresses. Supabase
edge functions have no fixed outgoing address, so transfer requests go through this small
server, which has one.

- Forwards only `GET`/`POST /v3/transfers[/...]` to `api.flutterwave.com`, and only with the
  right `X-Relay-Key` header. Anything else gets `404`.
- Stores no Flutterwave key and keeps no request logs.

## Set up
1. Google Cloud: a small VM (`e2-micro`, Debian 12) with a **reserved regional static** external
   IP, and "Allow HTTP traffic" + "Allow HTTPS traffic" ticked (the certificate needs both).
2. On the VM: `curl -fsSL https://raw.githubusercontent.com/sapiensunocha/infinite-future-bank/main/infra/payout-relay/install.sh | sudo bash`
3. Supabase secrets: `FLW_RELAY_URL` and `FLW_RELAY_KEY` (printed by the script).
4. Flutterwave dashboard → Settings → Whitelisted IP addresses: add the VM's address.
5. Redeploy `bank-payout` and `flutterwave-transfer`.

Without the two secrets, the functions call Flutterwave directly as before.
