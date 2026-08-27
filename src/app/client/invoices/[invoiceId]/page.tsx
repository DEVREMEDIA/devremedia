import { createClient } from '@/lib/supabase/server';
import { getInvoice } from '@/lib/actions/invoices';
import { redirect, notFound } from 'next/navigation';
import { InvoiceDetail } from '@/components/client/invoices/invoice-detail';

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function ClientInvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const invoiceResult = await getInvoice(invoiceId);
  if (invoiceResult.error || !invoiceResult.data) {
    notFound();
  }

  const invoice = invoiceResult.data;

  return (
    <div>
      <InvoiceDetail invoice={invoice} />
    </div>
  );
}
