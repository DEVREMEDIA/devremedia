import { requireUser } from '@/lib/auth-helpers';
import { getInvoice } from '@/lib/actions/invoices';
import { getBankDetails } from '@/lib/actions/settings';
import { redirect, notFound } from 'next/navigation';
import { InvoiceDetail } from '@/components/client/invoices/invoice-detail';

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function ClientInvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params;

  const { error: authError } = await requireUser();

  if (authError) {
    redirect('/login');
  }

  // Τα δύο ταξίδια δεν εξαρτώνται μεταξύ τους — δεν μπαίνουν στη σειρά.
  const [invoiceResult, bankResult] = await Promise.all([getInvoice(invoiceId), getBankDetails()]);

  if (invoiceResult.error || !invoiceResult.data) {
    notFound();
  }

  return (
    <div>
      <InvoiceDetail invoice={invoiceResult.data} bankDetails={bankResult.data} />
    </div>
  );
}
