import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import EmployeeSettingsPage from '@/app/employee/settings/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.employeeSettings');
  return { title: t('title') };
}

export default function EmployeeV2SettingsPage() {
  return <EmployeeSettingsPage />;
}
