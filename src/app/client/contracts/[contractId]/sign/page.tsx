import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getContract } from '@/lib/actions/contracts';
import { SignContractClient } from './sign-client';

interface SignContractPageProps {
  params: Promise<{ contractId: string }>;
}

export default async function SignContractPage({ params }: SignContractPageProps) {
  const { contractId } = await params;
  const t = await getTranslations('contracts');
  // Η ίδια πηγή ετικετών που χρησιμοποιεί ήδη η λίστα συμβολαίων. Χωρίς αυτήν,
  // ο πελάτης διάβαζε «Κατάσταση: expired».
  const tStatus = await getTranslations('statuses.contractStatus');

  const result = await getContract(contractId);

  if (result.error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center text-tone-critical">
          <p>{t('failedToLoadContract', { error: result.error })}</p>
        </div>
      </div>
    );
  }

  const contract = result.data;

  if (!contract) {
    redirect('/client/home');
  }

  if (contract.status === 'signed') {
    redirect(`/client/contracts/${contractId}`);
  }

  if (contract.status === 'expired' || contract.status === 'cancelled') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <p className="text-lg font-semibold">{t('notAvailableForSigning')}</p>
          <p className="text-muted-foreground mt-2">
            {t('status')}: {tStatus(contract.status)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SignContractClient contract={contract} />
    </div>
  );
}
