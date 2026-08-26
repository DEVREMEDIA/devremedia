import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import EmployeeDashboardPage from '@/app/employee/dashboard/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.employeeToday');
  return { title: t('title') };
}

export default function EmployeeV2TodayPage() {
  return <EmployeeDashboardPage />;
}
