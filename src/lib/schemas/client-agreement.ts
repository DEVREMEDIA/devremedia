import { z } from 'zod';

/**
 * A per-Client Agreement: the Package the Client currently holds plus the
 * monthly price agreed with that Client specifically. Prices are
 * admin-internal. Coerced so plain HTML number inputs validate at the
 * boundary.
 */
export const clientAgreementSchema = z.object({
  client_id: z.string().uuid(),
  package_id: z.string().uuid(),
  agreed_monthly_price: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).max(10_000_000),
  ),
  active: z.boolean().default(true),
});

export type ClientAgreementInput = z.input<typeof clientAgreementSchema>;
export type ClientAgreementOutput = z.output<typeof clientAgreementSchema>;
