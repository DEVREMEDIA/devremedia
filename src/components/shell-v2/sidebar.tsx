'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from './types';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
        'justify-center lg:justify-start',
        active
          ? 'bg-accent font-semibold text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {active && (
        <span
          className="absolute -left-2 top-2 bottom-2 w-[3px] rounded-r bg-primary"
          aria-hidden
        />
      )}
      <Icon className={cn('h-[17px] w-[17px] shrink-0', active && 'text-primary')} />
      <span className="hidden flex-1 lg:inline">{item.label}</span>
    </Link>
  );
}

interface ShellSidebarProps {
  items: NavItem[];
  settingsItem: NavItem;
}

/** Ράγα εικονιδίων από md, πλήρεις ετικέτες από lg. */
export function ShellSidebar({ items, settingsItem }: ShellSidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-card md:flex md:w-[68px] lg:w-60">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4 lg:px-5">
        <span
          className="h-6 w-6 shrink-0 rounded-md bg-linear-to-br from-primary to-chart-2"
          aria-hidden
        />
        <span className="hidden text-sm font-semibold tracking-tight lg:inline">Devre Media</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2.5" aria-label="Κύριο μενού">
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="border-t border-border p-2.5">
        <SidebarLink item={settingsItem} active={isActive(pathname, settingsItem.href)} />
      </div>
    </aside>
  );
}
