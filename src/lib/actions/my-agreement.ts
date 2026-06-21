'use server';

import { requireUser } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { remainingAllowance, type Allowance, type Booking } from '@/lib/booking';
import type { ActionResult } from '@/types';

export type MyAgreement = {
  package_name: string;
  inclusions: string[];
  agreed_monthly_price: number;
  allowance: Allowance;
  remaining_allowance: number;
};

const ATHENS_TZ = 'Europe/Athens';

/** The current calendar month in Athens, as YYYY-MM. */
const currentMonthInAthens = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: ATHENS_TZ }).slice(0, 7);

/**
 * The signed-in Client's own Agreement, for the "My Agreement" card: their
 * Package (name + inclusions), the monthly price agreed with them, and how much
 * of their Allowance is left this calendar month.
 *
 * Returns null when the Client has no active Agreement (the card shows a
 * "contact us" prompt instead).
 *
 * The Client only ever sees their own figures — never a general price list.
 * The user is authenticated and matched to their Client record first; the
 * admin client then reads only that Client's active Agreement. Remaining
 * Allowance is computed by the same `@/lib/booking` module as the availability
 * view, so the two figures always agree.
 */
export async function getMyAgreement(): Promise<ActionResult<MyAgreement | null>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (clientError) return { data: null, error: clientError.message };
    if (!clientRecord) return { data: null, error: null }; // not a Client → no card

    const admin = createAdminClient();

    const { data: agreement, error: agreementError } = await admin
      .from('client_agreements')
      .select(
        'agreed_monthly_price, package:proposal_packages(name, inclusions, allowance_count, allowance_unit)',
      )
      .eq('client_id', clientRecord.id)
      .eq('active', true)
      .maybeSingle();

    if (agreementError) return { data: null, error: agreementError.message };
    if (!agreement) return { data: null, error: null }; // no active Agreement → contact prompt

    const pkg = (Array.isArray(agreement.package) ? agreement.package[0] : agreement.package) as {
      name: string;
      inclusions: string[] | null;
      allowance_count: number | null;
      allowance_unit: 'days' | 'slots' | 'hours';
    } | null;

    if (!pkg || pkg.allowance_count === null) {
      return { data: null, error: null }; // no Package / no Allowance set
    }

    const allowance: Allowance = { count: pkg.allowance_count, unit: pkg.allowance_unit };

    // Holds + confirmed Filmings are introduced in a later slice of #70; until
    // then the Client has no recorded usage, so the full Allowance remains.
    // Routed through the same booking module as the availability view so the
    // remaining-Allowance figures always match.
    const month = currentMonthInAthens();
    const clientUsage: Booking[] = [];
    const monthUsage = clientUsage.filter((u) => u.date.slice(0, 7) === month);

    return {
      data: {
        package_name: pkg.name,
        inclusions: pkg.inclusions ?? [],
        agreed_monthly_price: agreement.agreed_monthly_price as number,
        allowance,
        remaining_allowance: remainingAllowance(allowance, monthUsage),
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load agreement',
    };
  }
}
