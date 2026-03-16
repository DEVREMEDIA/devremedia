'use client';

import { useEffect, useState } from 'react';
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
  Video,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  GraduationCap,
  FolderOpen,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SidebarNav } from './sidebar-nav';
import { useTranslations } from 'next-intl';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      href: '/admin/filming-requests',
      icon: Video,
      label: t('filmingRequests'),
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
      href: '/admin/chatbot',
      icon: Bot,
      label: t('chatbot'),
    },
    {
      href: '/admin/settings',
      icon: Settings,
      label: t('settings'),
    },
  ];

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('admin-sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('admin-sidebar-collapsed', String(newValue));
      return newValue;
    });
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <Link
        href="/admin/dashboard"
        className="h-16 flex items-center justify-center border-b border-zinc-800 px-4 hover:bg-white/5 transition-colors"
      >
        {isCollapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-bold text-sm">
            D
          </div>
        ) : (
          <Image
            src="/images/Logo_Horizontal_Transparent.png"
            alt="Devre Media"
            width={120}
            height={32}
            className="h-7 w-auto"
            priority
          />
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarNav
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Toggle Button */}
      <div className="p-2 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="w-full text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  );
}
