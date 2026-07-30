import { AppShell } from '@/components/shell-v2/app-shell';
import { SalesmanUserNav } from '@/components/salesman/user-nav';
import { NAV_ITEMS, SETTINGS_ITEM, MOBILE_NAV_ITEMS } from '@/components/salesman-v2/nav';

/**
 * Νέο κέλυφος πωλητή, παράλληλα με το `/salesman` που μένει άθικτο.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/salesman')`).
 */
export default function SalesmanV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      items={NAV_ITEMS}
      settingsItem={SETTINGS_ITEM}
      mobileItems={MOBILE_NAV_ITEMS}
      userNav={<SalesmanUserNav />}
    >
      {children}
    </AppShell>
  );
}
