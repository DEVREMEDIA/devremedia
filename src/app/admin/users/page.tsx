import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { UserManagement } from '@/components/admin/users/user-management';
import { getAllUsers } from '@/lib/actions/team';

export default async function AdminUsersPage() {
  const t = await getTranslations('users');
  const result = await getAllUsers();
  const users = result.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <UserManagement users={users} />
    </div>
  );
}
