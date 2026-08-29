'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { UserPlus, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormDialog } from '@/components/shared/form-dialog';
import { inviteTeamMember, updateTeamMemberRole, deactivateTeamMember } from '@/lib/actions/team';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { UserProfile } from '@/types';
import type { UserRole } from '@/lib/constants';
import { USER_ROLE_LABELS } from '@/lib/constants';

type TeamManagementProps = {
  members: UserProfile[];
};

export function TeamManagement({ members }: TeamManagementProps) {
  const router = useRouter();
  const tToast = useTranslations('toast');
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName.trim()) {
      toast.error(tToast('validationError'));
      return;
    }

    setIsSubmitting(true);
    const result = await inviteTeamMember(inviteEmail, inviteRole, inviteName.trim());

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('sendSuccess'));
      setInviteName('');
      setInviteEmail('');
      setInviteRole('admin');
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

  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: 'display_name',
      header: tc('name'),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.display_name || t('unnamedUser')}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: t('role'),
      cell: ({ row }) => <Badge variant="secondary">{USER_ROLE_LABELS[row.original.role]}</Badge>,
    },
    {
      accessorKey: 'created_at',
      header: t('joined'),
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
      meta: { numeric: true, align: 'left' },
    },
    {
      id: 'actions',
      header: '',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const member = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'admin')}>
                {t('changeToAdmin')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'super_admin')}>
                {t('changeToSuperAdmin')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'employee')}>
                {t('changeToEmployee')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'salesman')}>
                {t('changeToSalesman')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeactivateUserId(member.id)}
              >
                {t('deactivate')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('teamMembers')}</CardTitle>
              <CardDescription>{t('teamDescription')}</CardDescription>
            </div>
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('inviteMember')}
            </Button>

            <FormDialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
              title={t('inviteTeamMember')}
              description={t('inviteDescription')}
              onSubmit={handleInvite}
              submitLabel={isSubmitting ? t('sending') : t('sendInvitation')}
              cancelLabel={tc('cancel')}
              submitting={isSubmitting}
            >
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('fullName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Maria Papadopoulou"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailAddress')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('role')}</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('adminRole')}</SelectItem>
                    <SelectItem value="super_admin">{t('superAdminRole')}</SelectItem>
                    <SelectItem value="employee">{t('employeeRole')}</SelectItem>
                    <SelectItem value="salesman">{t('salesmanRole')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormDialog>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={members} />
        </CardContent>
      </Card>

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
    </>
  );
}
