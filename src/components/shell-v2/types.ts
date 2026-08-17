import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Σύντομη ετικέτα για την κάτω μπάρα του κινητού */
  short: string;
}
