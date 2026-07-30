'use client';

import { AppShell } from '@/components/shell-v2/app-shell';
import { UserNav } from '@/components/employee/user-nav';
import { NAV_ITEMS, SETTINGS_ITEM, MOBILE_NAV_ITEMS } from './nav';

/**
 * Το όριο client μπαίνει εδώ, ώστε το μενού να εισάγεται μέσα στο client graph.
 * Τα εικονίδια είναι React components και δεν σειριοποιούνται — δεν μπορούν να
 * περάσουν ως props από ένα server layout.
 */
export function EmployeeV2Shell({ children }: { children: React.ReactNode }) {
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
