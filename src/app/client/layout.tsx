import { ClientV2Shell } from '@/components/client-v2/shell';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientV2Shell>{children}</ClientV2Shell>;
}
