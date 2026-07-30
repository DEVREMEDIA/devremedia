import { EmployeeV2Shell } from '@/components/employee-v2/shell';

/**
 * Νέο κέλυφος εργαζομένου, παράλληλα με το `/employee` που μένει άθικτο.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/employee')`).
 */
export default function EmployeeV2Layout({ children }: { children: React.ReactNode }) {
  return <EmployeeV2Shell>{children}</EmployeeV2Shell>;
}
