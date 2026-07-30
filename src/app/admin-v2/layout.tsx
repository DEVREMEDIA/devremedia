import { AdminV2Sidebar } from '@/components/admin-v2/sidebar';
import { AdminV2BottomNav } from '@/components/admin-v2/bottom-nav';
import { NotificationBell } from '@/components/admin/notification-bell';
import { UserNav } from '@/components/admin/user-nav';
import { ThemeToggle } from '@/components/admin/theme-toggle';

/**
 * Το νέο κέλυφος διαχείρισης — 6 προορισμοί αντί για 18.
 * Τρέχει παράλληλα με το `/admin`, το οποίο παραμένει άθικτο μέχρι την έγκριση.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/admin')`).
 */
export default function AdminV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <span
          className="h-6 w-6 shrink-0 rounded-md bg-linear-to-br from-primary to-chart-2 md:hidden"
          aria-hidden
        />
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
          Προεπισκόπηση v2
        </span>
        <div className="flex-1" />
        <ThemeToggle />
        <NotificationBell />
        <UserNav />
      </header>

      <div className="flex min-h-0 flex-1">
        <AdminV2Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      <AdminV2BottomNav />
    </div>
  );
}
