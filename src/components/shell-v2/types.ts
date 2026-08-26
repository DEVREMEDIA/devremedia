import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  /** Κλειδί μετάφρασης (shellV2) της ετικέτας, όχι το ίδιο το κείμενο — γίνεται resolve με t() στα shell components. */
  label: string;
  icon: LucideIcon;
  /** Κλειδί μετάφρασης (shellV2) της σύντομης ετικέτας για την κάτω μπάρα του κινητού, όχι το ίδιο το κείμενο — γίνεται resolve με t() στα shell components. */
  short: string;
}
