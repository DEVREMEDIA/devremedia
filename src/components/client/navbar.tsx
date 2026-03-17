'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Menu,
  LayoutDashboard,
  FolderKanban,
  Receipt,
  FileText,
  Video,
  Globe,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';
import { MobileNav } from './mobile-nav';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { useTranslations } from 'next-intl';

export function ClientNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('nav');

  useEffect(() => setMounted(true), []);

  const navLinks = [
    {
      href: '/client/dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
    },
    {
      href: '/client/projects',
      label: t('projects'),
      icon: FolderKanban,
    },
    {
      href: '/client/contracts',
      label: t('contracts'),
      icon: FileText,
    },
    {
      href: '/client/invoices',
      label: t('invoices'),
      icon: Receipt,
    },
    {
      href: '/client/book',
      label: t('bookFilming'),
      icon: Video,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-stone-50/80 backdrop-blur-sm dark:bg-zinc-900/80 dark:border-zinc-800">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={t('toggleMenu')}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        {/* Logo */}
        <Link href="/client/dashboard" className="flex items-center mr-6">
          <Image
            src="/images/Logo_Horizontal_Transparent.png"
            alt="Devre Media"
            width={120}
            height={32}
            className="h-7 w-auto invert dark:invert-0"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/10 dark:hover:text-amber-400',
                  isActive
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side actions — defer DropdownMenus to avoid hydration ID mismatch */}
        <div className="flex items-center gap-2 ml-auto">
          {mounted ? (
            <>
              <LanguageSwitcher />
              <ThemeToggle />
              <UserNav />
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="text-zinc-400 h-12 w-12">
                <Globe className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <UserIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} navLinks={navLinks} />
    </header>
  );
}
