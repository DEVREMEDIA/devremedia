import type { Metadata } from 'next';

import ClientSettingsPage from '@/app/client/settings/page';

export const metadata: Metadata = { title: 'Ρυθμίσεις' };

export default function ClientV2SettingsPage() {
  return <ClientSettingsPage />;
}
