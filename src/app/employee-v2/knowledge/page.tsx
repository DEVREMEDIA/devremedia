import type { Metadata } from 'next';

import EmployeeUniversityPage from '@/app/employee/university/page';

export const metadata: Metadata = { title: 'Γνώση' };

export default function EmployeeV2KnowledgePage() {
  return <EmployeeUniversityPage />;
}
