'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/shared/user-avatar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProfileFormProps {
  user: { id: string; email?: string };
  profile: {
    full_name?: string | null;
    company_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const router = useRouter();
  const t = useTranslations('client.settings');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    company_name: profile?.company_name || '',
    phone: profile?.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.from('user_profiles').update(formData).eq('id', user.id);

    if (error) {
      toast.error(t('profileUpdateFailed'));
    } else {
      toast.success(t('profileUpdateSuccess'));
      router.refresh();
    }

    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('fileSizeError'));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(t('avatarUploadFailed'));
      setLoading(false);
      return;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // Update profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      toast.error(t('profileUpdateFailed'));
    } else {
      toast.success(t('avatarUpdateSuccess'));
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profileTitle')}</CardTitle>
        <CardDescription>{t('profileDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.full_name || user.email}
              size="lg"
            />
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Upload className="h-4 w-4" />
                  {t('uploadPhoto')}
                </div>
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={loading}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('photoFormats')}</p>
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" value={user.email} disabled />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">{t('fullName')}</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder={t('fullNamePlaceholder')}
            />
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">{t('companyName')}</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder={t('companyNamePlaceholder')}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('phonePlaceholder')}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? tCommon('saving') : tCommon('save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
