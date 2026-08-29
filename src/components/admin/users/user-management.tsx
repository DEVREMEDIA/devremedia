'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, MoreHorizontal, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  inviteTeamMember,
  updateTeamMemberRole,
  deactivateTeamMember,
  reactivateTeamMember,
} from '@/lib/actions/team';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { USER_ROLE_LABELS } from '@/lib/constants';
import type { UserWithEmail } from '@/types/entities';
import type { UserRole } from '@/lib/constants';

interface UserManagementProps {
  users: UserWithEmail[];
}

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  super_admin: 'default',
  admin: 'default',
  employee: 'secondary',
  salesman: 'secondary',
  client: 'outline',
};

export function UserManagement({ users }: UserManagementProps) {
  const router = useRouter();
  const t = useTranslations('users');
  const tToast = useTranslations('toast');
  const tc = useTranslations('common');

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('client');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [reactivateUserId, setReactivateUserId] = useState<string | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        (user.display_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteDisplayName.trim()) {
      toast.error(tToast('validationError'));
      return;
    }

    setIsSubmitting(true);
    const result = await inviteTeamMember(inviteEmail, inviteRole, inviteDisplayName.trim());

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('sendSuccess'));
      setInviteEmail('');
      setInviteRole('client');
      setInviteDisplayName('');
      setIsInviteDialogOpen(false);
      router.refresh();
    }

    setIsSubmitting(false);
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    const result = await updateTeamMemberRole(userId, role);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('updateSuccess'));
      router.refresh();
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateUserId) return;

    setIsDeactivating(true);
    const result = await deactivateTeamMember(deactivateUserId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('deleteSuccess'));
      router.refresh();
    }

    setIsDeactivating(false);
    setDeactivateUserId(null);
  };

  const handleReactivate = async () => {
    if (!reactivateUserId) return;

    setIsReactivating(true);
    const result = await reactivateTeamMember(reactivateUserId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('updateSuccess'));
      router.refresh();
    }

    setIsReactivating(false);
    setReactivateUserId(null);
  };

  const isDeactivated = (user: UserWithEmail) =>
    (user.preferences as Record<string, unknown>)?.deactivated === true;

  const columns: ColumnDef<UserWithEmail>[] = [
    {
      accessorKey: 'display_name',
      header: tc('name'),
      cell: ({ row }) => (
        <span className={cn('font-medium', isDeactivated(row.original) && 'opacity-50')}>
          {row.original.display_name || t('unnamedUser')}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: t('email'),
      cell: ({ row }) => (
        <span className={cn('text-muted-foreground', isDeactivated(row.original) && 'opacity-50')}>
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'role',
      header: t('role'),
      cell: ({ row }) => (
        <Badge
          variant={ROLE_BADGE_VARIANT[row.original.role] ?? 'secondary'}
          className={cn(isDeactivated(row.original) && 'opacity-50')}
        >
          {USER_ROLE_LABELS[row.original.role]}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: t('status'),
      cell: ({ row }) =>
        isDeactivated(row.original) ? (
          <Badge variant="destructive">{t('deactivated')}</Badge>
        ) : (
          <Badge variant="outline">{t('active')}</Badge>
        ),
    },
    {
      accessorKey: 'created_at',
      header: t('joined'),
      cell: ({ row }) => (
        <span className={cn(isDeactivated(row.original) && 'opacity-50')}>
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
      meta: { numeric: true, align: 'left' },
    },
    {
      id: 'actions',
      header: '',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const user = row.original;
        const deactivated = isDeactivated(user);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'client')}>
                {t('changeToClient')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'employee')}>
                {t('changeToEmployee')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'salesman')}>
                {t('changeToSalesman')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'admin')}>
                {t('changeToAdmin')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'super_admin')}>
                {t('changeToSuperAdmin')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {deactivated ? (
                <DropdownMenuItem onClick={() => setReactivateUserId(user.id)}>
                  {t('reactivate')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeactivateUserId(user.id)}
                >
                  {t('deactivate')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allRoles')}</SelectItem>
              <SelectItem value="super_admin">{t('superAdminRole')}</SelectItem>
              <SelectItem value="admin">{t('adminRole')}</SelectItem>
              <SelectItem value="employee">{t('employeeRole')}</SelectItem>
              <SelectItem value="salesman">{t('salesmanRole')}</SelectItem>
              <SelectItem value="client">{t('clientRole')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('inviteUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('inviteNewUser')}</DialogTitle>
              <DialogDescription>{t('inviteDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t('emailAddress')}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">
                  {t('fullName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-name"
                  type="text"
                  placeholder={t('displayNamePlaceholder')}
                  value={inviteDisplayName}
                  onChange={(e) => setInviteDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">{t('role')}</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">{t('clientRole')}</SelectItem>
                    <SelectItem value="employee">{t('employeeRole')}</SelectItem>
                    <SelectItem value="salesman">{t('salesmanRole')}</SelectItem>
                    <SelectItem value="admin">{t('adminRole')}</SelectItem>
                    <SelectItem value="super_admin">{t('superAdminRole')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleInvite} disabled={isSubmitting}>
                {isSubmitting ? t('sending') : t('sendInvitation')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={filteredUsers} />
        </CardContent>
      </Card>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateUserId}
        onOpenChange={(open) => !open && setDeactivateUserId(null)}
        title={t('deactivate')}
        description={t('deactivateConfirm')}
        confirmLabel={t('deactivate')}
        onConfirm={handleDeactivate}
        loading={isDeactivating}
        destructive
      />

      {/* Reactivate Confirm */}
      <ConfirmDialog
        open={!!reactivateUserId}
        onOpenChange={(open) => !open && setReactivateUserId(null)}
        title={t('reactivate')}
        description={t('reactivateConfirm')}
        confirmLabel={t('reactivate')}
        onConfirm={handleReactivate}
        loading={isReactivating}
      />
    </>
  );
}
