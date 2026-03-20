'use server';

import { createClient } from '@/lib/supabase/server';
import { createContractSchema, updateContractSchema } from '@/lib/schemas/contract';
import type {
  ActionResult,
  Contract,
  ContractWithProject,
  ContractWithRelations,
  ContractTemplate,
} from '@/types/index';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createNotification, getClientUserIdFromClientId } from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

export async function getContractsByProject(projectId: string): Promise<ActionResult<Contract[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('contracts')
      .select(
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, scope_description, special_terms, signed_pdf_path, locale, created_by, created_at',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch contracts' };
  }
}

export async function getContractsByClient(
  clientId: string,
): Promise<ActionResult<ContractWithProject[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('contracts')
      .select(
        'id, title, status, client_id, project_id, sent_at, viewed_at, signed_at, created_at, project:projects(id, title)',
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as ContractWithProject[], error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch contracts' };
  }
}

export async function getContract(id: string): Promise<ActionResult<ContractWithRelations>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('contracts')
      .select(
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, scope_description, special_terms, signed_pdf_path, locale, created_by, created_at, client:clients!inner(id, user_id, company_name, contact_name, email, phone, address, vat_number, avatar_url, notes, status, created_at, updated_at), project:projects(id, client_id, title, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as ContractWithRelations, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch contract' };
  }
}

export async function getMyContracts(): Promise<ActionResult<ContractWithProject[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    // Get client record for this user
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let query = supabase
      .from('contracts')
      .select('*, project:projects(title)')
      .order('created_at', { ascending: false });

    if (clientRecord?.id) {
      query = query.eq('client_id', clientRecord.id);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };
    return { data: data as ContractWithProject[], error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch contracts' };
  }
}

export async function getAllContracts(): Promise<ActionResult<Contract[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('*, client:clients(contact_name, company_name), project:projects(title)')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch contracts' };
  }
}

export async function createContract(input: unknown): Promise<ActionResult<Contract>> {
  try {
    const validated = createContractSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    if (!validated.client_id) {
      return { data: null, error: 'A client is required to create a contract' };
    }

    // Fetch client name for title/content generation
    const { data: client } = await supabase
      .from('clients')
      .select('contact_name, company_name')
      .eq('id', validated.client_id)
      .single();

    const clientName = client?.company_name || client?.contact_name || 'Client';

    const title = `${validated.service_type} Agreement — ${clientName}`;

    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'el';

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        project_id: validated.project_id ?? null,
        client_id: validated.client_id,
        title,
        content: '',
        service_type: validated.service_type,
        agreed_amount: validated.agreed_amount,
        payment_method: validated.payment_method,
        expires_at: validated.expires_at || null,
        scope_description: validated.scope_description ?? null,
        special_terms: validated.special_terms ?? null,
        locale,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select(
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, scope_description, special_terms, signed_pdf_path, locale, created_by, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    if (validated.project_id) {
      revalidatePath(`/admin/projects/${validated.project_id}`);
      revalidatePath(`/client/projects/${validated.project_id}`);
    }
    revalidatePath(`/admin/clients/${validated.client_id}`);
    revalidatePath('/admin/contracts');
    revalidatePath('/client/contracts');
    revalidatePath('/client/dashboard');

    // Notify client about new contract
    const clientUserId = await getClientUserIdFromClientId(validated.client_id);
    if (clientUserId) {
      createNotification({
        userId: clientUserId,
        type: NOTIFICATION_TYPES.CONTRACT_SENT,
        title: 'New contract requires your signature',
        body: title,
        actionUrl: '/client/contracts',
      });
    }

    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create contract' };
  }
}

export async function updateContract(id: string, input: unknown): Promise<ActionResult<Contract>> {
  try {
    const validated = updateContractSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('contracts')
      .update(validated)
      .eq('id', id)
      .select(
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, scope_description, special_terms, signed_pdf_path, locale, created_by, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}`);
    }
    revalidatePath(`/admin/contracts/${id}`);
    revalidatePath('/client/contracts');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update contract' };
  }
}

export async function reviewSignedContract(
  id: string,
  decision: 'approve' | 'reject',
): Promise<ActionResult<Contract>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { data: null, error: 'Forbidden' };
  }

  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('id, status, signed_pdf_path, client_id')
    .eq('id', id)
    .single();

  if (fetchError || !contract) return { data: null, error: 'Contract not found' };
  if (contract.status !== 'pending_review') {
    return { data: null, error: 'Contract is not pending review' };
  }

  const COLUMNS =
    'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, scope_description, special_terms, signed_pdf_path, locale, created_by, created_at';

  if (decision === 'approve') {
    if (!contract.signed_pdf_path) return { data: null, error: 'No signed PDF uploaded' };

    const { data, error } = await supabase
      .from('contracts')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('id', id)
      .select(COLUMNS)
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/contracts');
    revalidatePath(`/admin/contracts/${id}`);
    revalidatePath('/client/contracts');
    return { data, error: null };
  }

  // Reject — set back to sent
  const { data, error } = await supabase
    .from('contracts')
    .update({ status: 'sent' })
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };

  const { data: clientData } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', contract.client_id)
    .single();

  if (clientData?.user_id) {
    await createNotification({
      userId: clientData.user_id,
      type: NOTIFICATION_TYPES.CONTRACT_UPLOAD_REJECTED,
      title: 'Contract needs re-signing',
      actionUrl: `/client/contracts/${id}`,
    });
  }

  revalidatePath('/admin/contracts');
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath('/client/contracts');
  return { data, error: null };
}

export async function sendContract(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    // Verify contract is in draft status
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status, project_id')
      .eq('id', id)
      .single();

    if (fetchError || !contract) return { data: null, error: 'Contract not found' };
    if (contract.status !== 'draft')
      return { data: null, error: 'Only draft contracts can be sent' };

    const { data, error } = await supabase
      .from('contracts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) return { data: null, error: error.message };

    if (contract.project_id) {
      revalidatePath(`/admin/projects/${contract.project_id}`);
    }
    revalidatePath(`/admin/contracts/${id}`);
    revalidatePath('/admin/contracts');
    revalidatePath('/client/contracts');
    revalidatePath('/client/dashboard');
    return { data: { id: data.id }, error: null };
  } catch {
    return { data: null, error: 'Failed to send contract' };
  }
}

export async function deleteContract(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('project_id')
      .eq('id', id)
      .single();

    if (fetchError || !contract) return { data: null, error: 'Contract not found' };

    const { error } = await supabase.from('contracts').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    if (contract?.project_id) {
      revalidatePath(`/admin/projects/${contract.project_id}`);
    }
    revalidatePath('/client/contracts');
    revalidatePath('/client/dashboard');
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete contract' };
  }
}

export async function getContractTemplates(): Promise<ActionResult<ContractTemplate[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('contract_templates')
      .select('id, title, content, placeholders, created_by, created_at')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch contract templates',
    };
  }
}

export async function createContractTemplate(input: {
  title: string;
  content: string;
  placeholders?: Record<string, unknown>;
}): Promise<ActionResult<ContractTemplate>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('contract_templates')
      .insert({
        title: input.title,
        content: input.content,
        placeholders: input.placeholders ?? {},
        created_by: user.id,
      })
      .select('id, title, content, placeholders, created_by, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings/contract-templates');
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create contract template',
    };
  }
}

export async function updateContractTemplate(
  id: string,
  input: {
    title?: string;
    content?: string;
    placeholders?: Record<string, unknown>;
  },
): Promise<ActionResult<ContractTemplate>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.placeholders !== undefined) updateData.placeholders = input.placeholders;

    const { data, error } = await supabase
      .from('contract_templates')
      .update(updateData)
      .eq('id', id)
      .select('id, title, content, placeholders, created_by, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings/contract-templates');
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update contract template',
    };
  }
}

export async function deleteContractTemplate(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { error } = await supabase.from('contract_templates').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings/contract-templates');
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete contract template',
    };
  }
}
