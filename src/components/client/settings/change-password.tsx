'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

export function ChangePassword() {
  const t = useTranslations('client.settings');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error(t('passwordTooShort'));
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: formData.newPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('passwordChangeSuccess'));
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('changePasswordTitle')}</CardTitle>
        <CardDescription>{t('changePasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">{t('currentPassword')}</Label>
            <Input
              id="current-password"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('newPassword')}</Label>
            <Input
              id="new-password"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">{t('passwordRequirements')}</p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('confirmNewPassword')}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? t('changingPassword') : t('changePasswordButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
