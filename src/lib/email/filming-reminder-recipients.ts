import type { SupabaseClient } from '@supabase/supabase-js';

export interface FilmingReminderRecipient {
  clientId: string;
  email: string;
  contactName: string;
  locale: 'el' | 'en';
  packageId: string;
  packageName: string;
  /** The Package's inclusions, joined for inline display in the email body. */
  packageDeliverables: string;
}

interface AgreementPackage {
  packageId: string;
  packageName: string;
  packageDeliverables: string;
}

/** Supabase returns a to-one join as an object, but typings allow an array. */
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Recipients of the monthly filming reminder, derived from active Agreements.
 *
 * The source of truth for "which Clients get a reminder + which Package" is
 * each Client's active Agreement (Package from `proposal_packages`) — not any
 * hardcoded package list. Clients without an active Agreement, and inactive
 * Clients, are excluded. The Package's `inclusions` drive the reminder content.
 */
export async function getFilmingReminderRecipients(
  supabase: SupabaseClient,
): Promise<FilmingReminderRecipient[]> {
  const { data: agreements } = await supabase
    .from('client_agreements')
    .select('client_id, package:proposal_packages(id, name, inclusions)')
    .eq('active', true);

  if (!agreements || agreements.length === 0) return [];

  const byClient = new Map<string, AgreementPackage>();
  for (const row of agreements as Array<Record<string, unknown>>) {
    const clientId = row.client_id as string | null;
    const pkg = firstOrSelf<Record<string, unknown>>(
      row.package as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    if (!clientId || !pkg || byClient.has(clientId)) continue;

    const inclusions = Array.isArray(pkg.inclusions) ? (pkg.inclusions as string[]) : [];
    byClient.set(clientId, {
      packageId: pkg.id as string,
      packageName: pkg.name as string,
      packageDeliverables: inclusions.join(', '),
    });
  }

  const clientIds = [...byClient.keys()];
  if (clientIds.length === 0) return [];

  const { data: clients } = await supabase
    .from('clients')
    .select('id, email, contact_name, preferred_locale, status')
    .in('id', clientIds)
    .eq('status', 'active');

  if (!clients) return [];

  return (clients as Array<Record<string, unknown>>).map((c) => {
    const pkg = byClient.get(c.id as string) as AgreementPackage;
    return {
      clientId: c.id as string,
      email: c.email as string,
      contactName: c.contact_name as string,
      locale: ((c.preferred_locale as 'el' | 'en') ?? 'el') as 'el' | 'en',
      packageId: pkg.packageId,
      packageName: pkg.packageName,
      packageDeliverables: pkg.packageDeliverables,
    };
  });
}
