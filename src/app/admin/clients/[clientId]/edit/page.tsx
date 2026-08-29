import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getClient } from '@/lib/actions/clients';
import { Client } from '@/types/index';
import { DetailShell } from '@/components/shared/detail-shell';
import { ClientForm } from '@/components/admin/clients/client-form';

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
    <DetailShell
      backHref={`/admin/clients/${clientId}`}
      backLabel={client.contact_name}
      title={t('editClient')}
      meta={`${tc('edit')} ${client.contact_name}`}
    >
      <ClientForm client={client} />
    </DetailShell>
  );
}
