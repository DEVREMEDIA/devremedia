import { createClient } from '@/lib/supabase/server';
import { getInvoices } from '@/lib/actions/invoices';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { InvoicesList } from './invoices-list';
import { getTranslations } from 'next-intl/server';

export default async function ClientInvoicesPage() {
  const t = await getTranslations('client.invoices');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const invoicesResult = await getInvoices();
  const invoices = (invoicesResult.data ?? []) as import('@/types').InvoiceWithRelations[];

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <InvoicesList invoices={invoices} />
    </div>
  );
}
