import { createClient } from '@/lib/supabase/server';
import { getInvoices } from '@/lib/actions/invoices';
import { redirect } from 'next/navigation';
import { InvoicesList } from './invoices-list';

export default async function ClientInvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get client record for this user to filter invoices
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const invoicesResult = await getInvoices({
    status: ['sent', 'viewed', 'overdue', 'paid', 'cancelled'],
    ...(clientRecord?.id && { client_id: clientRecord.id }),
  });
  const invoices = (invoicesResult.data ?? []) as import('@/types').InvoiceWithRelations[];

  return (
    <div className="space-y-6">
      <InvoicesList invoices={invoices} />
    </div>
  );
}
