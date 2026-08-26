import { AdminV2Shell } from '@/components/admin-v2/shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminV2Shell>{children}</AdminV2Shell>;
}
