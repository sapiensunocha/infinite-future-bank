-- ============================================================================
-- 20261118 — Invoicing
--
-- An invoice is a numbered bill (line items, tax, due date) whose "Pay" link is a
-- private, one-time Payment Page. The client pays by card, mobile money, Paystack
-- or IFB wallet through the existing Payment Pages checkout, which credits the
-- merchant's wallet; this trigger then marks the invoice paid.
-- Writes go through the `invoices` edge function (service role); merchants read
-- their own invoices. Also closes ifb_bills (old, unused invoice table with
-- row-level security OFF in production).
-- Requires 20261104_payment_pages.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number        TEXT NOT NULL,
  client_name   TEXT NOT NULL CHECK (length(client_name) BETWEEN 1 AND 120),
  client_email  TEXT NOT NULL CHECK (client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  items         JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 50),
  subtotal_cents BIGINT NOT NULL CHECK (subtotal_cents > 0),
  tax_rate      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 50),
  tax_cents     BIGINT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents   BIGINT NOT NULL CHECK (total_cents > 0 AND total_cents <= 100000000),
  currency      TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  due_date      DATE,
  notes         TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void')),
  page_id       UUID REFERENCES public.payment_pages(id) ON DELETE SET NULL,
  pay_url       TEXT,
  sent_at       TIMESTAMPTZ,
  sent_count    INT NOT NULL DEFAULT 0,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoices_number_uniq UNIQUE (merchant_id, number),
  CONSTRAINT invoices_paid_at CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS invoices_merchant_idx ON public.invoices (merchant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_page_uniq ON public.invoices (page_id) WHERE page_id IS NOT NULL;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_merchant_read ON public.invoices;
CREATE POLICY invoices_merchant_read ON public.invoices FOR SELECT TO authenticated
  USING (merchant_id = auth.uid() OR public.is_admin());
REVOKE ALL ON public.invoices FROM anon, authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

-- Next invoice number for a merchant: INV-<year>-0001, 0002, …
CREATE OR REPLACE FUNCTION public._next_invoice_number(p_merchant UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := 'INV-' || to_char(now(), 'YYYY') || '-';
  v_n INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('invoice-number:' || p_merchant::text, 0));
  SELECT COALESCE(MAX(substring(number FROM length(v_prefix) + 1)::int), 0) + 1 INTO v_n
    FROM public.invoices WHERE merchant_id = p_merchant AND number LIKE v_prefix || '%' AND substring(number FROM length(v_prefix) + 1) ~ '^\d+$';
  RETURN v_prefix || lpad(v_n::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION public._next_invoice_number(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._next_invoice_number(UUID) TO service_role;

-- When the invoice's payment page is paid, the invoice is paid.
CREATE OR REPLACE FUNCTION public._invoice_mark_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE public.invoices
       SET status = 'paid', paid_at = COALESCE(NEW.paid_at, now())
     WHERE page_id = NEW.page_id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invoice_mark_paid ON public.payment_page_orders;
CREATE TRIGGER invoice_mark_paid AFTER INSERT OR UPDATE OF status ON public.payment_page_orders
  FOR EACH ROW EXECUTE FUNCTION public._invoice_mark_paid();

-- Old invoice table: RLS was off (anyone signed in could read/write every row).
ALTER TABLE public.ifb_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ifb_bills_owner ON public.ifb_bills;
CREATE POLICY ifb_bills_owner ON public.ifb_bills FOR ALL TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
REVOKE ALL ON public.ifb_bills FROM anon;

COMMIT;
