import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { ClientForm } from '@/components/admin/clients/client-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('clients');
  return {
    title: t('addClient'),
  };
}

export default async function NewClientPage() {
  const t = await getTranslations('clients');

  return (
    <div className="space-y-6">
      <PageHeading title={t('addClient')} subtitle={t('description')}>
        <Button variant="outline" asChild>
          <Link href="/admin/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('title')}
          </Link>
        </Button>
      </PageHeading>

      <ClientForm />
    </div>
  );
}
