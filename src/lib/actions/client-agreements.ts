'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import { clientAgreementSchema } from '@/lib/schemas/client-agreement';
import type { ActionResult, ClientAgreementWithPackage } from '@/types/index';
import { revalidatePath } from 'next/cache';

const AGREEMENT_COLUMNS =
  'id, client_id, package_id, agreed_monthly_price, active, created_by, created_at, updated_at, ' +
  'package:proposal_packages(id, name, allowance_count, allowance_unit)';

/** Supabase returns a to-one join as an object, but typings allow an array. */
function normalisePackage(row: Record<string, unknown>): ClientAgreementWithPackage {
  const pkg = row.package;
  return {
    ...(row as unknown as ClientAgreementWithPackage),
    package: (Array.isArray(pkg)
      ? (pkg[0] ?? null)
      : (pkg ?? null)) as ClientAgreementWithPackage['package'],
  };
}

/**
 * The Client's currently active Agreement (with its Package), or null.
 * Source of truth for "which Package may this Client book".
 */
export async function getClientAgreement(
  clientId: string,
): Promise<ActionResult<ClientAgreementWithPackage | null>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('client_agreements')
      .select(AGREEMENT_COLUMNS)
      .eq('client_id', clientId)
      .eq('active', true)
      .maybeSingle();

    if (error) return { data: null, error: error.message };

    return {
      data: data ? normalisePackage(data as unknown as Record<string, unknown>) : null,
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch agreement',
    };
  }
}

/**
 * Create or change a Client's Agreement. A Client has at most one active
 * Agreement: if one already exists it is updated in place, otherwise a new
 * active row is inserted.
 */
export async function saveClientAgreement(
  input: unknown,
): Promise<ActionResult<ClientAgreementWithPackage>> {
  try {
    const validated = clientAgreementSchema.parse(input);
    const { supabase, user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data: existing, error: findError } = await supabase
      .from('client_agreements')
      .select('id')
      .eq('client_id', validated.client_id)
      .eq('active', true)
      .maybeSingle();

    if (findError) return { data: null, error: findError.message };

    const fields = {
      package_id: validated.package_id,
      agreed_monthly_price: validated.agreed_monthly_price,
      active: true,
    };

    const { data, error } = existing?.id
      ? await supabase
          .from('client_agreements')
          .update(fields)
          .eq('id', existing.id)
          .select(AGREEMENT_COLUMNS)
          .single()
      : await supabase
          .from('client_agreements')
          .insert({ ...fields, client_id: validated.client_id, created_by: user.id })
          .select(AGREEMENT_COLUMNS)
          .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/clients/${validated.client_id}`);
    return { data: normalisePackage(data as unknown as Record<string, unknown>), error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save agreement',
    };
  }
}

export type AgreementPrefill = {
  agreed_monthly_price: number | null;
  package_id: string | null;
  service_type: string | null;
};

/**
 * Suggest Agreement values from the Client's most recent signed Contract:
 * the agreed amount becomes the monthly price, and the Contract's service is
 * matched (by name) to an active Package when one exists. Returns null when
 * the Client has no signed Contract — an Agreement needs no Contract.
 */
export async function getClientAgreementPrefill(
  clientId: string,
): Promise<ActionResult<AgreementPrefill | null>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, service_type, agreed_amount, signed_at')
      .eq('client_id', clientId)
      .eq('status', 'signed')
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractError) return { data: null, error: contractError.message };
    if (!contract) return { data: null, error: null };

    const { data: packages, error: pkgError } = await supabase
      .from('proposal_packages')
      .select('id, name')
      .eq('active', true);

    if (pkgError) return { data: null, error: pkgError.message };

    const serviceType = (contract.service_type as string | null) ?? null;
    const needle = (serviceType ?? '').trim().toLowerCase();
    const match = needle
      ? (packages ?? []).find((p) => String(p.name).trim().toLowerCase() === needle)
      : undefined;

    return {
      data: {
        agreed_monthly_price: (contract.agreed_amount as number | null) ?? null,
        package_id: match?.id ?? null,
        service_type: serviceType,
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to build agreement prefill',
    };
  }
}
