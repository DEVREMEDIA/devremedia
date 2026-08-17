import type { Metadata } from 'next';

import EmployeeDashboardPage from '@/app/employee/dashboard/page';

export const metadata: Metadata = { title: 'Σήμερα' };

export default function EmployeeV2TodayPage() {
  return <EmployeeDashboardPage />;
}
