import { UserManagement } from '@/components/admin/users/user-management';
import { getAllUsers } from '@/lib/actions/team';

export default async function AdminUsersPage() {
  const result = await getAllUsers();
  const users = result.data ?? [];

  return (
    <div className="space-y-6">
      <UserManagement users={users} />
    </div>
  );
}
