import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import EmployeeUniversityPage from '@/app/employee/university/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.employeeKnowledge');
  return { title: t('title') };
}

export default function EmployeeV2KnowledgePage() {
  return <EmployeeUniversityPage />;
}
