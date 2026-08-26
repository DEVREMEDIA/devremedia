import { ShellSidebar } from './sidebar';
import { ShellBottomNav } from './bottom-nav';
import { NotificationBell } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import type { NavItem } from './types';

interface AppShellProps {
  items: NavItem[];
  settingsItem: NavItem;
  /** Τα items της κάτω μπάρας — το grid προσαρμόζεται στο πλήθος τους. */
  mobileItems: NavItem[];
  /** Το μενού χρήστη διαφέρει ανά ρόλο, οπότε το περνάει ο καλών. */
  userNav: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Το κοινό κέλυφος του νέου μοντέλου: λίγοι προορισμοί στο πλάι, καρτέλες μέσα
 * στη σελίδα. Ίδιος σκελετός για κάθε ρόλο ώστε η πλοήγηση να μαθαίνεται μία φορά.
 */
export function AppShell({ items, settingsItem, mobileItems, userNav, children }: AppShellProps) {
  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <span
          className="h-6 w-6 shrink-0 rounded-md bg-linear-to-br from-primary to-chart-2 md:hidden"
          aria-hidden
        />
        <div className="flex-1" />
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationBell />
        {userNav}
      </header>

      <div className="flex min-h-0 flex-1">
        <ShellSidebar items={items} settingsItem={settingsItem} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      <ShellBottomNav items={mobileItems} />
    </div>
  );
}
