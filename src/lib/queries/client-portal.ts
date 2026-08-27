import { cache } from 'react';
import { requireUser } from '@/lib/auth-helpers';
import { getProjects } from '@/lib/actions/projects';
import { getInvoices } from '@/lib/actions/invoices';
import { getMyContracts } from '@/lib/actions/contracts';
import { getMyAgreement } from '@/lib/actions/my-agreement';
import { getDeliverablesByProjects } from '@/lib/actions/deliverables';
import type { DeliverableWithProject, InvoiceWithRelations } from '@/types';

/**
 * Ο πελάτης βλέπει τη δική του αρχική σε τμήματα που φορτώνουν ανεξάρτητα.
 * Για να μη σημαίνει αυτό ότι το ίδιο ερώτημα τρέχει τέσσερις φορές — μία ανά
 * τμήμα που το χρειάζεται — κάθε ανάγνωση εδώ είναι `cache()`. Μέσα σε ένα
 * αίτημα, το δεύτερο κάλεσμα δεν αγγίζει τη βάση.
 */

/** Το `clients.id` του συνδεδεμένου χρήστη, ή `null` αν δεν είναι πελάτης. */
export const getClientId = cache(async (): Promise<string | null> => {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return null;

  const { data } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
});

export const getClientProjects = cache(async () => {
  const clientId = await getClientId();
  // Χωρίς πελάτη δεν υπάρχουν «τα έργα του» — και το φίλτρο του `getProjects`
  // αγνοεί σιωπηλά ένα `undefined`, δηλαδή θα γύριζε ό,τι επιτρέπει το RLS
  // σαν να ήταν δικά του. Ρητό κενό, όχι σιωπηλό «όλα».
  if (!clientId) return [];

  const result = await getProjects({ client_id: clientId });
  return result.data ?? [];
});

export const getClientInvoices = cache(async (): Promise<InvoiceWithRelations[]> => {
  const clientId = await getClientId();
  if (!clientId) return [];

  const result = await getInvoices({
    status: ['sent', 'viewed', 'overdue', 'paid', 'cancelled'],
    client_id: clientId,
  });
  return (result.data ?? []) as InvoiceWithRelations[];
});

export const getClientContracts = cache(async () => {
  const result = await getMyContracts();
  return result.data ?? [];
});

export const getClientAgreement = cache(async () => {
  const result = await getMyAgreement();
  return result.data;
});

/** Τα πέντε πιο πρόσφατα παραδοτέα, από τα πέντε πιο πρόσφατα έργα. */
export const getClientRecentDeliverables = cache(async (): Promise<DeliverableWithProject[]> => {
  const projects = await getClientProjects();
  const recent = projects.slice(0, 5);
  if (recent.length === 0) return [];

  const titleOf = new Map(recent.map((p) => [p.id, p.title]));
  const result = await getDeliverablesByProjects(recent.map((p) => p.id));

  return (result.data ?? [])
    .map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      version: d.version,
      created_at: d.created_at,
      project_id: d.project_id,
      project: { title: titleOf.get(d.project_id) ?? '' },
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
});
