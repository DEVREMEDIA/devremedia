import type { Metadata } from 'next';

import EmployeeProjectsPage from '@/app/employee/projects/page';

export const metadata: Metadata = { title: 'Παραγωγές' };

export default function EmployeeV2ProductionsPage() {
  return <EmployeeProjectsPage />;
}
