import { ClientV2Shell } from '@/components/client-v2/shell';

/**
 * Νέο κέλυφος πελάτη, παράλληλα με το `/client` που μένει άθικτο.
 * Η προστασία ρόλου καλύπτεται ήδη από το middleware (`startsWith('/client')`).
 */
export default function ClientV2Layout({ children }: { children: React.ReactNode }) {
  return <ClientV2Shell>{children}</ClientV2Shell>;
}
