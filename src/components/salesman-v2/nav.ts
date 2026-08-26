import { Sun, Target, FolderOpen, Settings } from 'lucide-react';
import type { NavItem } from '@/components/shell-v2/types';

/**
 * Ο πωλητής ρωτάει «ποιον παίρνω σήμερα», «πού είναι το pipeline μου» και «τι
 * στέλνω στον υποψήφιο». Πόροι και εγχειρίδιο απαντούν στο ίδιο τρίτο ερώτημα —
 * μπαίνουν σε καρτέλες κάτω από το «Υλικό», όχι σε δύο ξεχωριστά μενού.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: '/salesman-v2/today',
    label: 'nav.salesman.today',
    short: 'nav.salesman.todayShort',
    icon: Sun,
  },
  {
    href: '/salesman-v2/leads',
    label: 'nav.salesman.leads',
    short: 'nav.salesman.leadsShort',
    icon: Target,
  },
  {
    href: '/salesman-v2/library',
    label: 'nav.salesman.library',
    short: 'nav.salesman.libraryShort',
    icon: FolderOpen,
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/salesman-v2/settings',
  label: 'nav.settings',
  short: 'nav.settingsShort',
  icon: Settings,
};

export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
