'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/shared/user-avatar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Upload, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ProfileField, ProfileView } from '@/lib/profile-view';

interface ProfileFormProps {
  userId: string;
  profile: ProfileView & { avatarUrl: string | null };
}

const EMPTY_VALUE = '—';

/**
 * Το Προφίλ διαβάζεται, δεν συμπληρώνεται.
 *
 * Τα στοιχεία ταυτότητας ανήκουν στη διαχείριση: εδώ εμφανίζονται ως λίστα
 * ορισμών — ετικέτα και τιμή — και όχι ως πεδία φόρμας απενεργοποιημένα, που θα
 * υπόσχονταν επεξεργασία η οποία δεν υπάρχει. Τα ΜΟΝΑ δύο πράγματα που αλλάζει
 * ο χρήστης από τις Ρυθμίσεις είναι η φωτογραφία του (εδώ) και ο κωδικός του
 * (στην καρτέλα Ασφάλεια).
 */
export function ProfileForm({ userId, profile }: ProfileFormProps) {
  const router = useRouter();
  const t = useTranslations('client.settings');
  const [loading, setLoading] = useState(false);

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
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
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
      .eq('id', userId);

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
        <CardDescription>{t('profileReadOnlyDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar — το ένα πράγμα που αλλάζει ο χρήστης από αυτή την καρτέλα */}
        <div className="flex items-center gap-4">
          <UserAvatar src={profile.avatarUrl} name={profile.name} size="lg" />
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

        <dl className="border-t border-border">
          {profile.fields.map((field: ProfileField) => (
            <div
              key={field.labelKey}
              className="grid gap-1 border-b border-border py-3 sm:grid-cols-3 sm:gap-4"
            >
              <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {t(field.labelKey)}
              </dt>
              <dd className="text-sm text-foreground sm:col-span-2">
                {field.value || <span className="text-muted-foreground">{EMPTY_VALUE}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t('identityReadOnlyNote')}
        </p>
      </CardContent>
    </Card>
  );
}
