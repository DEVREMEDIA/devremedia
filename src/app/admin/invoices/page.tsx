import { getInvoices } from '@/lib/actions/invoices';
import { InvoicesContent } from './invoices-content';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import type { ComponentProps } from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoices');
  return {
    title: t('title'),
  };
}

export default async function InvoicesPage() {
  const t = await getTranslations('common');
  const result = await getInvoices();

  if (result.error) {
    return (
      <div className="p-8">
        <p className="text-destructive">
          {t('error')}: {result.error}
        </p>
      </div>
    );
  }

  return (
    <InvoicesContent
      invoices={(result.data as ComponentProps<typeof InvoicesContent>['invoices']) ?? []}
    />
  );
}
