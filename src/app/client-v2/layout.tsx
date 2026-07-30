import { AppShell } from '@/components/shell-v2/app-shell';
import { UserNav } from '@/components/client/user-nav';
import { NAV_ITEMS, SETTINGS_ITEM, MOBILE_NAV_ITEMS } from '@/components/client-v2/nav';

/**
 * Νέο κέλυφος πελάτη, παράλληλα με το `/client` που μένει άθικτο.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/client')`).
 */
export default function ClientV2Layout({ children }: { children: React.ReactNode }) {
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
