'use server';

import { requireUser } from '@/lib/auth-helpers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Maps a URL segment (the one BEFORE the id) to the table + column that holds
// the human-readable name. RLS on the user's client guarantees the caller can
// only resolve rows they are allowed to see.
const ENTITY_BY_SEGMENT: Record<string, { table: string; column: string }> = {
  clients: { table: 'clients', column: 'contact_name' },
  projects: { table: 'projects', column: 'title' },
  'filming-prep': { table: 'projects', column: 'title' },
  deliverables: { table: 'projects', column: 'title' },
  invoices: { table: 'invoices', column: 'invoice_number' },
  leads: { table: 'leads', column: 'contact_name' },
  contracts: { table: 'contracts', column: 'title' },
  proposals: { table: 'proposals', column: 'client_name' },
  'filming-requests': { table: 'filming_requests', column: 'contact_name' },
  tasks: { table: 'tasks', column: 'title' },
  resources: { table: 'sales_resource_categories', column: 'title' },
  articles: { table: 'kb_articles', column: 'title' },
};

export async function resolveBreadcrumbLabel(segment: string, id: string): Promise<string | null> {
  if (!UUID_RE.test(id)) return null;

  const entity = ENTITY_BY_SEGMENT[segment];
  if (!entity) return null;

  const { supabase, error } = await requireUser();
  if (error) return null;

  const { data } = await supabase.from(entity.table).select(entity.column).eq('id', id).single();

  const value = (data as Record<string, unknown> | null)?.[entity.column];
  return typeof value === 'string' && value.trim() ? value : null;
}
