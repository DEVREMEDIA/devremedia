import type { Metadata } from 'next';

import SalesmanSettingsPage from '@/app/salesman/settings/page';

export const metadata: Metadata = { title: 'Ρυθμίσεις' };

export default function SalesmanV2SettingsPage() {
  return <SalesmanSettingsPage />;
}
