import { useTranslations } from 'next-intl';
import { ShellSidebar } from './sidebar';
import { ShellBottomNav } from './bottom-nav';
import { KeepInShell } from './keep-in-shell';
import { NotificationBell } from '@/components/shared/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import type { NavItem } from './types';

interface AppShellProps {
  items: NavItem[];
  settingsItem: NavItem;
  /** Τα items της κάτω μπάρας — το grid προσαρμόζεται στο πλήθος τους. */
  mobileItems: NavItem[];
  /** Το παλιό prefix του ρόλου, π.χ. `client`, για να κρατάμε τα κλικ στο κέλυφος. */
  rolePrefix: string;
  /** Το μενού χρήστη διαφέρει ανά ρόλο, οπότε το περνάει ο καλών. */
  userNav: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Το κοινό κέλυφος του νέου μοντέλου: λίγοι προορισμοί στο πλάι, καρτέλες μέσα
 * στη σελίδα. Ίδιος σκελετός για κάθε ρόλο ώστε η πλοήγηση να μαθαίνεται μία φορά.
 */
export function AppShell({
  items,
  settingsItem,
  mobileItems,
  rolePrefix,
  userNav,
  children,
}: AppShellProps) {
  const t = useTranslations('shellV2');

  return (
    <div className="fixed inset-0 flex flex-col">
      <KeepInShell prefix={rolePrefix} />
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <span
          className="h-6 w-6 shrink-0 rounded-md bg-linear-to-br from-primary to-chart-2 md:hidden"
          aria-hidden
        />
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {t('previewBadge')}
        </span>
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
