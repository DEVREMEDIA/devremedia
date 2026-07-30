import { AppShell } from '@/components/shell-v2/app-shell';
import { UserNav } from '@/components/admin/user-nav';
import { NAV_ITEMS, SETTINGS_ITEM, MOBILE_NAV_ITEMS } from '@/components/admin-v2/nav';

/**
 * Το νέο κέλυφος διαχείρισης — 6 προορισμοί αντί για 18.
 * Τρέχει παράλληλα με το `/admin`, το οποίο παραμένει άθικτο μέχρι την έγκριση.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/admin')`).
 */
export default function AdminV2Layout({ children }: { children: React.ReactNode }) {
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
