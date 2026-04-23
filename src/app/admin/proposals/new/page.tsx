import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getProposalPackages } from '@/lib/actions/proposal-packages';
import { getLeads } from '@/lib/actions/leads';
import { getClients } from '@/lib/actions/clients';
import { NewProposalForm } from './new-proposal-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('proposals');
  return { title: `${t('title')} — ${t('list.addProposal')}` };
}

export default async function NewProposalPage() {
  const [packagesRes, leadsRes, clientsRes] = await Promise.all([
    getProposalPackages(),
    getLeads(),
    getClients(),
  ]);

  return (
    <NewProposalForm
      packages={packagesRes.data ?? []}
      leads={leadsRes.data ?? []}
      clients={clientsRes.data ?? []}
    />
  );
}
