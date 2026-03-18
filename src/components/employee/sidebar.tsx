'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { CinematicLogo } from '@/components/shared/cinematic-logo';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SidebarNav } from '@/components/admin/sidebar-nav';
import { useTranslations } from 'next-intl';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('employee-sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('employee-sidebar-collapsed', String(newValue));
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
      <div className="h-24 flex items-center justify-center border-b border-zinc-800 px-4">
        {isCollapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-bold text-sm">
            D
          </div>
        ) : (
          <CinematicLogo className="h-18" priority />
        )}
      </div>

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
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  );
}
