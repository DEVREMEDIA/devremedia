'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CheckSquare, FolderKanban, GraduationCap, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const NAV_ITEMS = [
    {
      href: '/employee/dashboard',
      icon: LayoutDashboard,
      label: t('dashboard'),
    },
    {
      href: '/employee/tasks',
      icon: CheckSquare,
      label: t('myTasks'),
    },
    {
      href: '/employee/projects',
      icon: FolderKanban,
      label: t('projects'),
    },
    {
      href: '/employee/university',
      icon: GraduationCap,
      label: t('university'),
    },
    {
      href: '/employee/settings',
      icon: Settings,
      label: t('settings'),
    },
  ];

  const handleNavClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0 bg-zinc-900 border-zinc-800 text-zinc-300">
        <SheetHeader className="h-16 flex items-center justify-center border-b border-zinc-800 px-4">
          <SheetTitle className="font-bold text-xl tracking-tight text-white">DMS</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 border-l-2 border-transparent',
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border-amber-400'
                    : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200',
                )}
                onClick={handleNavClick}
              >
                <Link href={item.href}>
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
