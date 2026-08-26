import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import EmployeeProjectsPage from '@/app/employee/productions/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.employeeProductions');
  return { title: t('title') };
}

export default function EmployeeV2ProductionsPage() {
  return <EmployeeProjectsPage />;
}
