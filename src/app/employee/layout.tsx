import { EmployeeV2Shell } from '@/components/employee-v2/shell';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <EmployeeV2Shell>{children}</EmployeeV2Shell>;
}
