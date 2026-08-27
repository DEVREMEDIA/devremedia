import { getContract } from '@/lib/actions/contracts';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ContractViewClient } from './contract-view-client';

interface ClientContractPageProps {
  params: Promise<{ contractId: string }>;
}

export async function generateMetadata({ params }: ClientContractPageProps) {
  const { contractId } = await params;
  const result = await getContract(contractId);
  const t = await getTranslations('contracts');

  if (result.error) {
    return { title: t('notFoundTitle') };
  }

  return { title: result.data?.title || t('defaultTitle') };
}

export default async function ClientContractPage({ params }: ClientContractPageProps) {
  const { contractId } = await params;
  const result = await getContract(contractId);

  if (result.error || !result.data) {
    notFound();
  }

  const contract = result.data;

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 max-w-4xl">
      <ContractViewClient contract={contract} />
    </div>
  );
}
