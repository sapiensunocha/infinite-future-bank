-- ============================================================================
-- 20261121 — columns that live money functions write but production never had
--
-- Found by comparing every plpgsql function in production with the real table
-- columns (same class of bug as 20261120). All changes are additive.
--
--  * p2p_orders.updated_at      confirm_p2p_receipt / mark_p2p_withdrawal_sent
--                               (agent cash deposit + cash-out) failed with 42703.
--  * balances.created_at        handle_new_user / provision_new_user insert it; the
--                               error was swallowed, so new users got NO wallet row.
--  * smart_contracts.updated_at release_smart_contract.
--  * transactions.type          vault_transfer, process_npo_donation, venturex_*,
--                               release_*, purchase_* insert "type" instead of
--                               transaction_type (NOT NULL). A trigger copies it.
--  * Wallet rows for users who signed up while handle_new_user was failing.
-- ============================================================================
BEGIN;

ALTER TABLE public.p2p_orders      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.balances        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.smart_contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.transactions    ADD COLUMN IF NOT EXISTS type TEXT;

CREATE OR REPLACE FUNCTION public._transactions_fill_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type IS NULL AND NEW.type IS NOT NULL THEN
    NEW.transaction_type := NEW.type;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS transactions_fill_type ON public.transactions;
CREATE TRIGGER transactions_fill_type BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public._transactions_fill_type();

-- Empty wallet for every profile that has none (zero balances; changes no money).
INSERT INTO public.balances (user_id, liquid_usd, alpha_equity_usd, mysafe_digital_usd, afr_balance)
SELECT p.id, 0, 0, 0, 0 FROM public.profiles p
 WHERE NOT EXISTS (SELECT 1 FROM public.balances b WHERE b.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
