import { Sun, ListChecks, Clapperboard, BookOpen, Settings } from 'lucide-react';
import type { NavItem } from '@/components/shell-v2/types';

/**
 * Ο εργαζόμενος ρωτάει «τι κάνω τώρα» και «πού το ανεβάζω». Οι εργασίες και τα
 * παραδοτέα είναι η ίδια δουλειά σε δύο στιγμές της — μπαίνουν σε καρτέλες κάτω
 * από τη «Δουλειά μου» αντί για δύο μενού, το ένα εκ των οποίων σήμερα δεν
 * εμφανίζεται καν στην πλοήγηση.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/employee-v2/today', label: 'Σήμερα', short: 'Σήμερα', icon: Sun },
  { href: '/employee-v2/work', label: 'Η δουλειά μου', short: 'Δουλειά', icon: ListChecks },
  { href: '/employee-v2/productions', label: 'Παραγωγές', short: 'Έργα', icon: Clapperboard },
  { href: '/employee-v2/knowledge', label: 'Γνώση', short: 'Γνώση', icon: BookOpen },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/employee-v2/settings',
  label: 'Ρυθμίσεις',
  short: 'Ρυθμ.',
  icon: Settings,
};

export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
