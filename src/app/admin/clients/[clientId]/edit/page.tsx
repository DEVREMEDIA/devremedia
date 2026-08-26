import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getClient } from '@/lib/actions/clients';
import { Client } from '@/types/index';
import { PageHeading } from '@/components/shared/page-heading';
import { ClientForm } from '@/components/admin/clients/client-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditClientPageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('clients');
  return {
    title: t('editClient'),
  };
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { clientId } = await params;
  const result = await getClient(clientId);

  if (result.error || !result.data) {
    notFound();
  }

  const client = result.data as Client;
  const t = await getTranslations('clients');
  const tc = await getTranslations('common');

  return (
    <div className="space-y-6">
      <PageHeading title={t('editClient')} subtitle={`${tc('edit')} ${client.contact_name}`}>
        <Button variant="outline" asChild>
          <Link href={`/admin/clients/${clientId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tc('back')}
          </Link>
        </Button>
      </PageHeading>

      <ClientForm client={client} />
    </div>
  );
}
