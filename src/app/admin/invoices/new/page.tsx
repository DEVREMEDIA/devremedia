import { getClients } from '@/lib/actions/clients';
import { getProjects } from '@/lib/actions/projects';
import { getNextInvoiceNumber } from '@/lib/actions/invoices';
import { InvoiceForm } from '@/components/admin/invoices/invoice-form';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import type { ComponentProps } from 'react';

type InvoiceFormProps = ComponentProps<typeof InvoiceForm>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoices');
  return {
    title: t('addInvoice'),
  };
}

export default async function NewInvoicePage() {
  const t = await getTranslations('invoices');
  const tc = await getTranslations('common');
  const [clientsResult, projectsResult, nextInvoiceNumber] = await Promise.all([
    getClients({ status: 'active' }),
    getProjects(),
    getNextInvoiceNumber(),
  ]);

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
        <h1 className="text-3xl font-bold tracking-tight">{t('addInvoice')}</h1>
        <p className="text-muted-foreground mt-2">{t('description')}</p>
      </div>
      <InvoiceForm
        clients={(clientsResult.data as InvoiceFormProps['clients']) ?? []}
        projects={(projectsResult.data as InvoiceFormProps['projects']) ?? []}
        nextInvoiceNumber={nextInvoiceNumber}
      />
    </div>
  );
}
