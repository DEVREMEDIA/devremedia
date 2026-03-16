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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { UserPlus, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error(tToast('validationError'));
      return;
    }

    setIsSubmitting(true);
    const result = await inviteTeamMember(inviteEmail, inviteRole);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('sendSuccess'));
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('teamMembers')}</CardTitle>
              <CardDescription>{t('teamDescription')}</CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('inviteMember')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('inviteTeamMember')}</DialogTitle>
                  <DialogDescription>{t('inviteDescription')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('name')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('joined')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.display_name || t('unnamedUser')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{USER_ROLE_LABELS[member.role]}</Badge>
                  </TableCell>
                  <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
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
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.id, 'super_admin')}
                        >
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
