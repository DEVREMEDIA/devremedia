'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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
  const tc = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Verify session exists before showing the form
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        toast.error(t('sessionExpired'));
        router.replace('/forgot-password');
      } else {
        setHasSession(true);
      }
      setIsChecking(false);
    });
  }, [router, t]);

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

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(t('passwordUpdated'));

      // Fetch role for redirect
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
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
      } else {
        router.replace('/login');
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking || !hasSession) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-sm text-muted-foreground">{tc('loading')}</p>
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
