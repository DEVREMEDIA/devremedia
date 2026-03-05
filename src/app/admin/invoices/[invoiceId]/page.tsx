import { getInvoice } from '@/lib/actions/invoices';
import { InvoiceDetail } from './invoice-detail';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import type { ComponentProps } from 'react';

interface InvoicePageProps {
  params: Promise<{ invoiceId: string }>;
}

export async function generateMetadata({ params }: InvoicePageProps): Promise<Metadata> {
  const t = await getTranslations('invoices');
  const { invoiceId } = await params;
  const result = await getInvoice(invoiceId);

  if (result.error || !result.data) {
    return { title: t('invoiceDetails') };
  }

  return {
    title: `${t('title')} ${result.data.invoice_number}`,
  };
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { invoiceId } = await params;
  const result = await getInvoice(invoiceId);

  if (result.error || !result.data) {
    notFound();
  }

  return <InvoiceDetail invoice={result.data as ComponentProps<typeof InvoiceDetail>['invoice']} />;
}
