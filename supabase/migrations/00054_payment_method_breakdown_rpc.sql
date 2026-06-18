-- =====================================================================
-- Migration 00054 — get_payment_method_breakdown RPC (issue #40)
-- Purpose: Add the SQL aggregate RPC for the payment-method breakdown
--          report, consistent with the other report RPCs in 00052.
--          The old TS query read a non-existent `metadata` column;
--          this RPC reads `invoices.payment_method` (exists since 00002).
--
-- Risk: low — additive, read-only, SECURITY DEFINER + is_admin() guard.
-- Created: 2026-06-17
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_payment_method_breakdown(p_from, p_to)
--   Groups paid invoices by payment_method, defaulting null/empty to
--   'Other'. Mirrors getPaymentMethodBreakdown in src/lib/queries/reports.ts.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_payment_method_breakdown(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('method', method, 'amount', amount, 'count', cnt)
      ORDER BY amount DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      COALESCE(NULLIF(i.payment_method, ''), 'Other') AS method,
      COALESCE(SUM(i.total), 0)                       AS amount,
      COUNT(*)                                         AS cnt
    FROM public.invoices i
    WHERE i.status = 'paid'
      AND (
        p_from IS NULL OR p_to IS NULL
        OR (i.paid_at >= p_from AND i.paid_at <= p_to)
      )
    GROUP BY COALESCE(NULLIF(i.payment_method, ''), 'Other')
  ) grouped;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_payment_method_breakdown IS
  'Paid invoices grouped by payment_method (null → Other). Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_payment_method_breakdown(date, date) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
