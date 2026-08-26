import { Sun, Users, Clapperboard, CalendarDays, Euro, BookOpen, Settings } from 'lucide-react';
import type { NavItem } from '@/components/shell-v2/types';

/**
 * Οι 6 προορισμοί του νέου μοντέλου, με τη σειρά του κύκλου ζωής της δουλειάς.
 * Ό,τι δεν απαντά στο «τι θα κάνω τώρα» δεν είναι προορισμός — είναι καρτέλα.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/admin-v2/today', label: 'Σήμερα', short: 'Σήμερα', icon: Sun },
  { href: '/admin-v2/clients', label: 'Πελάτες', short: 'Πελάτες', icon: Users },
  { href: '/admin-v2/productions', label: 'Παραγωγές', short: 'Έργα', icon: Clapperboard },
  { href: '/admin-v2/calendar', label: 'Ημερολόγιο', short: 'Ημερ.', icon: CalendarDays },
  { href: '/admin-v2/finance', label: 'Οικονομικά', short: 'Οικον.', icon: Euro },
  { href: '/admin-v2/knowledge', label: 'Γνώση', short: 'Γνώση', icon: BookOpen },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/admin-v2/settings',
  label: 'Ρυθμίσεις',
  short: 'Ρυθμ.',
  icon: Settings,
};

/** Στο κινητό χωράνε και τα 6 — το grid της μπάρας προσαρμόζεται στο πλήθος. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
