'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from './types';

/** Στο κινητό το πλαϊνό μενού γίνεται μπάρα στο κάτω μέρος. */
export function ShellBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? '';

  return (
    <nav
      className="grid shrink-0 border-t border-border bg-card md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      aria-label="Μενού κινητού"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 px-1 py-2 text-[10px] transition-colors',
              active ? 'font-semibold text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-[19px] w-[19px]" />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
