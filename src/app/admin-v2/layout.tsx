import { AdminV2Shell } from '@/components/admin-v2/shell';

/**
 * Το νέο κέλυφος διαχείρισης — 6 προορισμοί αντί για 18.
 * Τρέχει παράλληλα με το `/admin`, το οποίο παραμένει άθικτο μέχρι την έγκριση.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/admin')`).
 */
export default function AdminV2Layout({ children }: { children: React.ReactNode }) {
  return <AdminV2Shell>{children}</AdminV2Shell>;
}
