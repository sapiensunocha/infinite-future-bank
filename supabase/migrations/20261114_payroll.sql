-- ============================================================================
-- 20261114 — Payroll (user test B4) + payroll data leak
--
-- 1. payroll_employees / payroll_runs had row-level security OFF in production:
--    any signed-in user could read or change every company's staff names,
--    emails and salaries. RLS is now on; a company sees only its own rows,
--    and an employee can see their own entry.
-- 2. run_payroll() replaces the client's call to process_corporate_payroll_v2,
--    whose live version trusts an employee list sent by the client, has no
--    caller check and writes a non-existent transactions.type column. The new
--    run reads the company's own active staff on the server, pays each one who
--    has an IFB account straight into their wallet, charges the 2% fee only on
--    what was paid, and records the run. Staff without an IFB account are
--    listed back as "not paid" (nothing is taken for them).
-- Requires 20261112 (public._ifb_user_transfer) for the shared ledger format.
-- ============================================================================

BEGIN;

ALTER TABLE public.payroll_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_employees_employer ON public.payroll_employees;
CREATE POLICY payroll_employees_employer ON public.payroll_employees FOR ALL TO authenticated
  USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());
DROP POLICY IF EXISTS payroll_employees_self ON public.payroll_employees;
CREATE POLICY payroll_employees_self ON public.payroll_employees FOR SELECT TO authenticated
  USING (employee_user_id = auth.uid());

DROP POLICY IF EXISTS payroll_runs_employer_read ON public.payroll_runs;
CREATE POLICY payroll_runs_employer_read ON public.payroll_runs FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR public.is_admin());
-- Runs are written only by run_payroll().
REVOKE INSERT, UPDATE, DELETE ON public.payroll_runs FROM anon, authenticated;
REVOKE ALL ON public.payroll_employees FROM anon;

-- The old engine must never be callable from the API.
DO $$ BEGIN
  IF to_regprocedure('public.process_corporate_payroll_v2(uuid, numeric, jsonb, numeric)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.process_corporate_payroll_v2(uuid, numeric, jsonb, numeric) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.run_payroll(p_expected_gross NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_fee_pct CONSTANT NUMERIC := 0.02;
  v_uid     UUID := auth.uid();
  v_emp     RECORD;
  v_target  UUID;
  v_gross_all NUMERIC := 0;
  v_paid    NUMERIC := 0;
  v_count   INT := 0;
  v_unpaid  JSONB := '[]'::jsonb;
  v_payable JSONB := '[]'::jsonb;
  v_fee     NUMERIC;
  v_bal     NUMERIC;
  v_item    JSONB;
  v_run     UUID;
  v_company TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.commercial_profiles WHERE id = v_uid AND pascaline_status = 'eligible_for_funding') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll needs an approved business account.');
  END IF;
  SELECT COALESCE(NULLIF(full_name, ''), 'your employer') INTO v_company FROM public.profiles WHERE id = v_uid;

  -- Work out who can be paid, on the server.
  FOR v_emp IN
    SELECT id, employee_name, lower(trim(employee_email)) AS email, employee_user_id, ROUND(salary_amount, 2) AS salary
      FROM public.payroll_employees
     WHERE employer_id = v_uid AND status = 'active' AND salary_amount > 0
     ORDER BY employee_name
  LOOP
    v_gross_all := v_gross_all + v_emp.salary;
    v_target := v_emp.employee_user_id;
    IF v_target IS NULL AND v_emp.email IS NOT NULL THEN
      SELECT id INTO v_target FROM public.profiles WHERE lower(email) = v_emp.email LIMIT 1;
    END IF;
    IF v_target IS NULL OR v_target = v_uid THEN
      v_unpaid := v_unpaid || jsonb_build_object('name', v_emp.employee_name, 'reason', 'No IFB account for ' || COALESCE(v_emp.email, 'this employee'));
    ELSE
      v_payable := v_payable || jsonb_build_object('row_id', v_emp.id, 'user_id', v_target, 'name', v_emp.employee_name, 'salary', v_emp.salary);
      v_paid := v_paid + v_emp.salary;
    END IF;
  END LOOP;

  IF v_gross_all = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active employees to pay.');
  END IF;
  -- Guard against paying a different total than the screen showed.
  IF ROUND(COALESCE(p_expected_gross, -1), 2) <> ROUND(v_gross_all, 2) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your staff list changed. Refresh and review the total again.');
  END IF;
  IF v_paid = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'None of your employees has an IFB account yet. Invite them to join IFB with the email on file.', 'unpaid', v_unpaid);
  END IF;

  v_fee := ROUND(v_paid * c_fee_pct, 2);
  SELECT COALESCE(liquid_usd, 0) INTO v_bal FROM public.balances WHERE user_id = v_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_paid + v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds for salaries plus the 2% fee.', 'needed', v_paid + v_fee, 'available', COALESCE(v_bal, 0));
  END IF;

  -- Pay each employee (same ledger format and notifications as Send money).
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_payable) LOOP
    PERFORM public._ifb_user_transfer(v_uid, (v_item->>'user_id')::UUID, (v_item->>'salary')::NUMERIC, 'USD', 'Salary from ' || v_company, 'payroll');
    UPDATE public.payroll_employees SET employee_user_id = (v_item->>'user_id')::UUID WHERE id = (v_item->>'row_id')::UUID AND employee_user_id IS NULL;
    v_count := v_count + 1;
  END LOOP;

  -- IFB fee
  UPDATE public.balances SET liquid_usd = liquid_usd - v_fee, last_synced = now() WHERE user_id = v_uid;
  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, metadata, source_type, authorized_by)
  VALUES (v_uid, -v_fee, 'payroll_fee', format('Payroll fee (2%% of $%s)', v_paid), 'completed', jsonb_build_object('employees_paid', v_count), 'internal', 'user');

  INSERT INTO public.payroll_runs (employer_id, total_gross, total_net, total_tax, employee_count, status, processed_at)
  VALUES (v_uid, v_paid, v_paid, v_fee, v_count, CASE WHEN jsonb_array_length(v_unpaid) > 0 THEN 'partial' ELSE 'completed' END, now())
  RETURNING id INTO v_run;

  RETURN jsonb_build_object('success', true, 'run_id', v_run, 'paid_count', v_count, 'total_paid', v_paid, 'fee', v_fee, 'unpaid', v_unpaid);
END;
$$;
REVOKE ALL ON FUNCTION public.run_payroll(NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_payroll(NUMERIC) TO authenticated;

COMMIT;
