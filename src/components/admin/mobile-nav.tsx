'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Receipt,
  CalendarDays,
  Film,
  FileText,
  BarChart3,
  MessageSquare,
  Settings,
  UserPlus,
  GraduationCap,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react';
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
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      label: t('dashboard'),
    },
    {
      href: '/admin/users',
      icon: ShieldCheck,
      label: t('users'),
    },
    {
      href: '/admin/clients',
      icon: Users,
      label: t('clients'),
    },
    {
      href: '/admin/projects',
      icon: FolderKanban,
      label: t('projects'),
    },
    {
      href: '/admin/invoices',
      icon: Receipt,
      label: t('invoices'),
    },
    {
      href: '/admin/calendar',
      icon: CalendarDays,
      label: t('calendar'),
    },
    {
      href: '/admin/filming-prep',
      icon: Film,
      label: t('filmingPrep'),
    },
    {
      href: '/admin/contracts',
      icon: FileText,
      label: t('contracts'),
    },
    {
      href: '/admin/reports',
      icon: BarChart3,
      label: t('reports'),
    },
    {
      href: '/admin/leads',
      icon: UserPlus,
      label: t('leads'),
    },
    {
      href: '/admin/university',
      icon: GraduationCap,
      label: t('university'),
    },
    {
      href: '/admin/sales-resources',
      icon: FolderOpen,
      label: t('salesResources'),
    },
    {
      href: '/admin/messages',
      icon: MessageSquare,
      label: t('messages'),
    },
    {
      href: '/admin/settings',
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
          <SheetTitle>
            <Image
              src="/images/Logo_Horizontal_Transparent.png"
              alt="Devre Media"
              width={112}
              height={28}
              className="h-6 w-auto"
              priority
            />
          </SheetTitle>
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
