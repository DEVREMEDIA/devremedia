import type { Metadata } from 'next';

import EmployeeSettingsPage from '@/app/employee/settings/page';

export const metadata: Metadata = { title: 'Ρυθμίσεις' };

export default function EmployeeV2SettingsPage() {
  return <EmployeeSettingsPage />;
}
