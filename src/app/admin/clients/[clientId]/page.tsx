import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getClient } from '@/lib/actions/clients';
import { getProjects } from '@/lib/actions/projects';
import { getInvoices } from '@/lib/actions/invoices';
import { Client } from '@/types/index';
import { ClientDetail } from './client-detail';

/** Οι καρτέλες με τη σειρά τους. Ο server επικυρώνει εδώ το `?tab=`· από αρχείο 'use client' θα ερχόταν ως client reference. */
const CLIENT_TABS: readonly string[] = [
  'overview',
  'projects',
  'invoices',
  'contracts',
  'agreement',
  'activity',
];

interface ClientDetailPageProps {
  params: Promise<{
    clientId: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const { clientId } = await params;
  const result = await getClient(clientId);
  const t = await getTranslations('clients');

  if (result.error || !result.data) {
    return { title: t('clientDetails') };
  }

  return { title: (result.data as Client).contact_name };
}

export default async function ClientDetailPage({ params, searchParams }: ClientDetailPageProps) {
  const { clientId } = await params;

  // Fetch client + lightweight stats only — tabs fetch their own data lazily
  const [clientResult, projectsResult, invoicesResult] = await Promise.all([
    getClient(clientId),
    getProjects({ client_id: clientId }),
    getInvoices({ client_id: clientId }),
  ]);

  if (clientResult.error || !clientResult.data) {
    notFound();
  }

  const client = clientResult.data as Client;
  const invoices = invoicesResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  const { tab } = await searchParams;
  const activeTab = CLIENT_TABS.includes(tab ?? '') ? (tab as string) : 'overview';

  return (
    <ClientDetail
      client={client}
      stats={{
        totalProjects: projects.length,
        totalInvoiced,
        totalPaid,
      }}
      initialProjects={projects}
      initialInvoices={invoices}
      activeTab={activeTab}
    />
  );
}
