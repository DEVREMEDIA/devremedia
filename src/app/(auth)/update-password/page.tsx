'use client';

import { useState, useEffect, useRef } from 'react';
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
  const sessionReady = useRef(false);

  // Warm up the Supabase client on mount — forces it to acquire the
  // navigator.locks lock and hydrate the session from cookies BEFORE
  // the user submits. This prevents AbortError on submit.
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(() => {
        sessionReady.current = true;
      })
      .catch(() => {
        // Ignore — will be handled on submit
      });
  }, []);

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

      // If session hasn't been hydrated yet, wait briefly
      if (!sessionReady.current) {
        await supabase.auth.getSession();
      }

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        if (error.status === 401 || error.status === 403) {
          setIsExpired(true);
          return;
        }
        toast.error(error.message);
        return;
      }

      toast.success(t('passwordUpdated'));

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
    } catch (err) {
      // AbortError = Supabase lock contention — retry once after a delay
      if (err instanceof DOMException && err.name === 'AbortError') {
        try {
          await new Promise((r) => setTimeout(r, 1000));
          const supabase = createClient();
          const { error } = await supabase.auth.updateUser({
            password: data.password,
          });
          if (error) {
            if (error.status === 401 || error.status === 403) {
              setIsExpired(true);
            } else {
              toast.error(error.message);
            }
            return;
          }
          toast.success(t('passwordUpdated'));
          router.replace('/login');
          return;
        } catch {
          setIsExpired(true);
          return;
        }
      }

      // Session-related thrown errors
      if (
        err instanceof Error &&
        (err.message.toLowerCase().includes('session') ||
          err.message.toLowerCase().includes('not authenticated'))
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
