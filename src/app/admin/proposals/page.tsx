import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getProposals } from '@/lib/actions/proposals';
import { ProposalsList } from './proposals-list';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('proposals');
  return { title: t('title') };
}

export default async function ProposalsPage() {
  const res = await getProposals();
  return <ProposalsList proposals={res.data ?? []} />;
}
