import { getInvoice } from '@/lib/actions/invoices';
import { getClients } from '@/lib/actions/clients';
import { getProjects } from '@/lib/actions/projects';
import { InvoiceForm } from '@/components/admin/invoices/invoice-form';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import type { ComponentProps } from 'react';

type InvoiceFormProps = ComponentProps<typeof InvoiceForm>;

interface EditInvoicePageProps {
  params: Promise<{ invoiceId: string }>;
}

export async function generateMetadata({ params }: EditInvoicePageProps): Promise<Metadata> {
  const t = await getTranslations('invoices');
  const { invoiceId } = await params;
  const result = await getInvoice(invoiceId);

  if (result.error || !result.data) {
    return { title: t('invoiceDetails') };
  }

  return {
    title: `${t('editInvoice')} ${result.data.invoice_number}`,
  };
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const t = await getTranslations('invoices');
  const tc = await getTranslations('common');
  const { invoiceId } = await params;
  const [invoiceResult, clientsResult, projectsResult] = await Promise.all([
    getInvoice(invoiceId),
    getClients({ status: 'active' }),
    getProjects(),
  ]);

  if (invoiceResult.error || !invoiceResult.data) {
    notFound();
  }

  if (clientsResult.error) {
    return (
      <div className="p-8">
        <p className="text-destructive">
          {tc('errorLoading')} {tc('clients').toLowerCase()}: {clientsResult.error}
        </p>
      </div>
    );
  }

  if (projectsResult.error) {
    return (
      <div className="p-8">
        <p className="text-destructive">
          {tc('errorLoading')} {tc('projects').toLowerCase()}: {projectsResult.error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('editInvoice')} {invoiceResult.data.invoice_number}
        </h1>
        <p className="text-muted-foreground mt-2">{t('description')}</p>
      </div>
      <InvoiceForm
        invoice={invoiceResult.data as InvoiceFormProps['invoice']}
        clients={(clientsResult.data as InvoiceFormProps['clients']) ?? []}
        projects={(projectsResult.data as InvoiceFormProps['projects']) ?? []}
        nextInvoiceNumber={invoiceResult.data.invoice_number}
      />
    </div>
  );
}
