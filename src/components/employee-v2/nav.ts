import { Sun, ListChecks, Clapperboard, BookOpen, Settings } from 'lucide-react';
import type { NavItem } from '@/components/shell-v2/types';

/**
 * Ο εργαζόμενος ρωτάει «τι κάνω τώρα» και «πού το ανεβάζω». Οι εργασίες και τα
 * παραδοτέα είναι η ίδια δουλειά σε δύο στιγμές της — μπαίνουν σε καρτέλες κάτω
 * από τη «Δουλειά μου» αντί για δύο μενού, το ένα εκ των οποίων σήμερα δεν
 * εμφανίζεται καν στην πλοήγηση.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: '/employee-v2/today',
    label: 'nav.employee.today',
    short: 'nav.employee.todayShort',
    icon: Sun,
  },
  {
    href: '/employee-v2/work',
    label: 'nav.employee.work',
    short: 'nav.employee.workShort',
    icon: ListChecks,
  },
  {
    href: '/employee-v2/productions',
    label: 'nav.employee.productions',
    short: 'nav.employee.productionsShort',
    icon: Clapperboard,
  },
  {
    href: '/employee-v2/knowledge',
    label: 'nav.employee.knowledge',
    short: 'nav.employee.knowledgeShort',
    icon: BookOpen,
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/employee-v2/settings',
  label: 'nav.settings',
  short: 'nav.settingsShort',
  icon: Settings,
};

export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
