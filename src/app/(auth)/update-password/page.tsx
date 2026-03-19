'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';
import { updatePasswordSchema } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = async (data: UpdatePasswordInput) => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // DEBUG: Log cookies and session state
      console.log('[update-password] cookies:', document.cookie);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('[update-password] getSession:', {
        hasSession: !!sessionData?.session,
        accessToken: sessionData?.session?.access_token?.slice(0, 20) + '...',
        error: sessionError?.message,
      });

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();
      console.log('[update-password] getUser:', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        error: userError?.message,
        errorStatus: userError?.status,
      });

      if (userError || !currentUser) {
        console.log('[update-password] No session — showing expired UI');
        setIsExpired(true);
        return;
      }

      console.log('[update-password] Calling updateUser...');
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      console.log('[update-password] updateUser result:', {
        error: error?.message,
        errorStatus: error?.status,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(t('passwordUpdated'));

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      const dashboards: Record<string, string> = {
        super_admin: '/admin/dashboard',
        admin: '/admin/dashboard',
        employee: '/employee/dashboard',
        salesman: '/salesman/dashboard',
        client: '/client/dashboard',
      };
      const dashboard = dashboards[profile?.role ?? 'client'] ?? '/client/dashboard';
      router.replace(dashboard);
    } catch (err) {
      console.error('[update-password] CAUGHT EXCEPTION:', err);
      console.error('[update-password] Error type:', typeof err);
      console.error('[update-password] Error name:', err instanceof Error ? err.name : 'not Error');
      console.error(
        '[update-password] Error message:',
        err instanceof Error ? err.message : String(err),
      );

      if (
        err instanceof Error &&
        (err.message.toLowerCase().includes('session') ||
          err.message.toLowerCase().includes('not authenticated') ||
          err.message.toLowerCase().includes('auth'))
      ) {
        setIsExpired(true);
      } else {
        toast.error(t('unexpectedError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isExpired) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('recoveryLinkExpired')}</p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm text-primary underline"
          >
            {t('requestNewLink')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('updatePassword')}</CardTitle>
        <CardDescription>{t('updatePasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('newPassword')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('enterNewPassword')}
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t('confirmNewPassword')}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {t('passwordMinLength')}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('updatingPassword') : t('updatePassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
