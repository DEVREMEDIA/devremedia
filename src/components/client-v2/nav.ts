import { Home, Clapperboard, FileText, CalendarPlus, Settings } from 'lucide-react';
import type { NavItem } from '@/components/shell-v2/types';

/**
 * Ο πελάτης έχει τέσσερις ερωτήσεις: «τι περιμένει εμένα», «πού είναι η δουλειά
 * μου», «τι υπέγραψα / τι χρωστάω», «θέλω κι άλλο γύρισμα». Ένας προορισμός ανά
 * ερώτηση. Συμφωνητικά και τιμολόγια είναι το ίδιο ερώτημα — μπαίνουν σε καρτέλες
 * κάτω από τα «Χαρτιά μου», όχι σε δύο ξεχωριστά μενού.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/client-v2/home', label: 'Αρχική', short: 'Αρχική', icon: Home },
  { href: '/client-v2/productions', label: 'Οι παραγωγές μου', short: 'Έργα', icon: Clapperboard },
  { href: '/client-v2/documents', label: 'Τα χαρτιά μου', short: 'Χαρτιά', icon: FileText },
  { href: '/client-v2/book', label: 'Κλείσε γύρισμα', short: 'Κράτηση', icon: CalendarPlus },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/client-v2/settings',
  label: 'Ρυθμίσεις',
  short: 'Ρυθμ.',
  icon: Settings,
};

export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
