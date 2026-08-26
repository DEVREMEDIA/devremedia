import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getProposalPackages } from '@/lib/actions/proposal-packages';
import { getCostSettings } from '@/lib/actions/cost-model';
import { PackagesContent } from './packages-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('proposalPackages');
  return { title: t('title') };
}

export default async function ProposalPackagesPage() {
  const [pkgsRes, settingsRes] = await Promise.all([
    getProposalPackages({ include_inactive: true }),
    getCostSettings(),
  ]);
  return (
    <PackagesContent
      packages={pkgsRes.data ?? []}
      defaultMargin={Number(settingsRes.data?.default_margin ?? 0.6)}
    />
  );
}
