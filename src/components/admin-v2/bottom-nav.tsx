'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MOBILE_NAV_ITEMS } from './nav';

/** Στο κινητό το πλαϊνό μενού γίνεται μπάρα στο κάτω μέρος. */
export function AdminV2BottomNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      className="grid shrink-0 grid-cols-5 border-t border-border bg-card md:hidden"
      aria-label="Μενού κινητού"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
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
