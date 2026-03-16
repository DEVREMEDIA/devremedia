'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createContractSchema,
  updateContractSchema,
  signContractSchema,
} from '@/lib/schemas/contract';
import type {
  ActionResult,
  Contract,
  ContractWithProject,
  ContractWithRelations,
  ContractTemplate,
} from '@/types/index';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

import { PAYMENT_METHOD_LABELS } from '@/lib/constants';

function generateContractContent(params: {
  clientName: string;
  projectTitle: string;
  serviceType: string;
  agreedAmount: number;
  paymentMethod: string;
  date: string;
}): string {
  const paymentLabel = PAYMENT_METHOD_LABELS[params.paymentMethod] ?? params.paymentMethod;
  const amountFormatted = params.agreedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `<h2>Service Agreement</h2>
<p>This Service Agreement ("Agreement") is entered into on <strong>${params.date}</strong> between:</p>
<p><strong>Service Provider:</strong> Devre Media — Professional Videography &amp; Production</p>
<p><strong>Client:</strong> ${params.clientName}${params.projectTitle ? ` — ${params.projectTitle}` : ''}</p>
<h2>Scope of Services</h2>
<p>${params.serviceType}</p>
<h2>Financial Terms</h2>
<p><strong>Total Amount:</strong> €${amountFormatted}</p>
<p><strong>Payment Method:</strong> ${paymentLabel}</p>
<h2>Terms &amp; Conditions</h2>
<p>1. The service provider agrees to deliver the services described above within the agreed timeline.</p>
<p>2. Payment is due according to the agreed payment terms. Late payments may incur additional fees.</p>
<p>3. Client revision requests must be communicated within 7 days of final delivery.</p>
<p>4. Upon receipt of full payment, the Client receives a license to use the final deliverables for their intended purpose. Provider retains the right to use the work in their portfolio unless otherwise agreed in writing.</p>
<p>5. Either party may cancel with written notice. Advance payments are non-refundable unless otherwise agreed.</p>
<p>6. Provider's liability is limited to the total amount paid under this Agreement.</p>
<p>7. This Agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, or agreements.</p>`;
}

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
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, created_by, created_at',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch contracts' };
  }
}

export async function getContractsByClient(clientId: string): Promise<ActionResult<Contract[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('contracts')
      .select('*, project:projects(title)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
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
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, created_by, created_at, client:clients!inner(id, user_id, company_name, contact_name, email, phone, address, vat_number, avatar_url, notes, status, created_at, updated_at), project:projects(id, client_id, title, description, project_type, status, priority, budget, deadline, start_date, completion_date, tags, metadata, created_by, created_at, updated_at)',
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

    const { data, error } = await supabase
      .from('contracts')
      .select('*, project:projects(title)')
      .order('created_at', { ascending: false });

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

    // Fetch project title if available
    let projectTitle = '';
    if (validated.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', validated.project_id)
        .single();
      projectTitle = project?.title || '';
    }

    const dateFormatted = format(new Date(), 'MMMM d, yyyy');
    const title = `${validated.service_type} Agreement — ${clientName}`;
    const content = generateContractContent({
      clientName,
      projectTitle,
      serviceType: validated.service_type,
      agreedAmount: validated.agreed_amount,
      paymentMethod: validated.payment_method,
      date: dateFormatted,
    });

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        project_id: validated.project_id ?? null,
        client_id: validated.client_id,
        title,
        content,
        service_type: validated.service_type,
        agreed_amount: validated.agreed_amount,
        payment_method: validated.payment_method,
        expires_at: validated.expires_at || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select(
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, created_by, created_at',
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
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, created_by, created_at',
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

export async function signContract(
  id: string,
  signatureData: unknown,
): Promise<ActionResult<Contract>> {
  try {
    const validated = signContractSchema.parse(signatureData);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    // Verify the signer is associated with this contract's client
    const { data: existing, error: fetchError } = await supabase
      .from('contracts')
      .select('id, client:clients(user_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existing) return { data: null, error: 'Contract not found' };

    const clientData = Array.isArray(existing.client) ? existing.client[0] : existing.client;
    const clientUserId = (clientData as { user_id: string | null } | null)?.user_id;
    if (!clientUserId || clientUserId !== user.id) {
      return { data: null, error: 'You are not authorized to sign this contract' };
    }

    const { data, error } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_data: {
          signature_image: validated.signature_image,
          signed_at: new Date().toISOString(),
        },
        signed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        'id, project_id, client_id, template_id, title, content, status, pdf_path, signature_data, sent_at, viewed_at, signed_at, expires_at, service_type, agreed_amount, payment_method, created_by, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}`);
    }
    revalidatePath(`/admin/contracts/${id}`);
    revalidatePath('/client/contracts');
    revalidatePath('/admin/contracts');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to sign contract' };
  }
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
