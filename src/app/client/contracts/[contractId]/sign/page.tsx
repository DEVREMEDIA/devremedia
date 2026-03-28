import { redirect } from 'next/navigation';
import { getContract } from '@/lib/actions/contracts';
import { SignContractClient } from './sign-client';

interface SignContractPageProps {
  params: Promise<{ contractId: string }>;
}

export default async function SignContractPage({ params }: SignContractPageProps) {
  const { contractId } = await params;

  const result = await getContract(contractId);

  if (result.error) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 max-w-4xl">
        <div className="text-center text-red-600">
          <p>Failed to load contract: {result.error}</p>
        </div>
      </div>
    );
  }

  const contract = result.data;

  if (!contract) {
    redirect('/client/dashboard');
  }

  if (contract.status === 'signed') {
    redirect(`/client/contracts/${contractId}`);
  }

  if (contract.status === 'expired' || contract.status === 'cancelled') {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 max-w-4xl">
        <div className="text-center">
          <p className="text-lg font-semibold">This contract is no longer available for signing.</p>
          <p className="text-muted-foreground mt-2">Status: {contract.status}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 max-w-4xl">
      <SignContractClient contract={contract} />
    </div>
  );
}
