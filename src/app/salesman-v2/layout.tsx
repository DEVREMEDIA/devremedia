import { SalesmanV2Shell } from '@/components/salesman-v2/shell';

/**
 * Νέο κέλυφος πωλητή, παράλληλα με το `/salesman` που μένει άθικτο.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/salesman')`).
 */
export default function SalesmanV2Layout({ children }: { children: React.ReactNode }) {
  return <SalesmanV2Shell>{children}</SalesmanV2Shell>;
}
