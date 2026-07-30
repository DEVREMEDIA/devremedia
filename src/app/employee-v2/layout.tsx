import { AppShell } from '@/components/shell-v2/app-shell';
import { UserNav } from '@/components/employee/user-nav';
import { NAV_ITEMS, SETTINGS_ITEM, MOBILE_NAV_ITEMS } from '@/components/employee-v2/nav';

/**
 * Νέο κέλυφος εργαζομένου, παράλληλα με το `/employee` που μένει άθικτο.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/employee')`).
 */
export default function EmployeeV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      items={NAV_ITEMS}
      settingsItem={SETTINGS_ITEM}
      mobileItems={MOBILE_NAV_ITEMS}
      userNav={<UserNav />}
    >
      {children}
    </AppShell>
  );
}
