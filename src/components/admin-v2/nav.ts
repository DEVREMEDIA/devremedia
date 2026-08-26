import { Sun, Users, Clapperboard, CalendarDays, Euro, BookOpen, Settings } from 'lucide-react';
import type { NavItem } from '@/components/shell-v2/types';

/**
 * Οι 6 προορισμοί του νέου μοντέλου, με τη σειρά του κύκλου ζωής της δουλειάς.
 * Τα label/short είναι κλειδιά του namespace `shellV2` — μεταφράζονται στο κέλυφος.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/admin/today', label: 'nav.admin.today', short: 'nav.admin.todayShort', icon: Sun },
  {
    href: '/admin/clients',
    label: 'nav.admin.clients',
    short: 'nav.admin.clientsShort',
    icon: Users,
  },
  {
    href: '/admin/productions',
    label: 'nav.admin.productions',
    short: 'nav.admin.productionsShort',
    icon: Clapperboard,
  },
  {
    href: '/admin/calendar',
    label: 'nav.admin.calendar',
    short: 'nav.admin.calendarShort',
    icon: CalendarDays,
  },
  {
    href: '/admin/finance',
    label: 'nav.admin.finance',
    short: 'nav.admin.financeShort',
    icon: Euro,
  },
  {
    href: '/admin/knowledge',
    label: 'nav.admin.knowledge',
    short: 'nav.admin.knowledgeShort',
    icon: BookOpen,
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/admin/settings',
  label: 'nav.settings',
  short: 'nav.settingsShort',
  icon: Settings,
};

/** Στο κινητό χωράνε και τα 6 — το grid της μπάρας προσαρμόζεται στο πλήθος. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
