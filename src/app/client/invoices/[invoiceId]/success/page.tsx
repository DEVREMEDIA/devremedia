import { SuccessContent } from './success-content';

interface SuccessPageProps {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function InvoicePaymentSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { invoiceId } = await params;
  const { session_id } = await searchParams;

  return <SuccessContent invoiceId={invoiceId} sessionId={session_id} />;
}
