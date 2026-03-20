'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Eye, EyeOff } from 'lucide-react';

import { updatePasswordSchema } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

/**
 * Parse the Supabase auth session directly from document.cookie.
 * Bypasses the Supabase JS client which uses navigator.locks internally
 * and throws AbortError on pages loaded via recovery redirect.
 */
function getSessionFromCookie(): {
  access_token: string;
  user: { id: string; user_metadata?: Record<string, unknown> };
} | null {
  try {
    const cookies = document.cookie.split('; ');

    // Find auth-token cookie — could be single or chunked (.0, .1, ...)
    const single = cookies.find((c) => c.includes('auth-token=') && !c.match(/auth-token\.\d+=/));

    let raw: string;
    if (single) {
      raw = single.split('=').slice(1).join('=');
    } else {
      // Combine chunked cookies in order
      const chunks: string[] = [];
      for (let i = 0; ; i++) {
        const chunk = cookies.find((c) => c.match(new RegExp(`auth-token\\.${i}=`)));
        if (!chunk) break;
        chunks.push(chunk.split('=').slice(1).join('='));
      }
      if (chunks.length === 0) return null;
      raw = chunks.join('');
    }

    const json = raw.startsWith('base64-') ? atob(raw.slice(7)) : raw;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      const session = getSessionFromCookie();
      if (!session?.access_token) {
        setIsExpired(true);
        return;
      }

      // Call Supabase Auth API directly — bypasses navigator.locks
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ password: data.password }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 422) {
          setIsExpired(true);
          return;
        }
        const body = await res.json().catch(() => null);
        toast.error(body?.message ?? body?.msg ?? t('unexpectedError'));
        return;
      }

      toast.success(t('passwordUpdated'));

      // Get role from user_profiles via REST API (no Supabase client needed)
      const userId = session.user?.id;
      if (userId) {
        const profileRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}&select=role`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
          },
        );
        const profiles = await profileRes.json().catch(() => []);
        const role: string = profiles?.[0]?.role ?? 'client';

        const dashboards: Record<string, string> = {
          super_admin: '/admin/dashboard',
          admin: '/admin/dashboard',
          employee: '/employee/dashboard',
          salesman: '/salesman/dashboard',
          client: '/client/dashboard',
        };
        router.replace(dashboards[role] ?? '/client/dashboard');
      } else {
        router.replace('/client/dashboard');
      }
    } catch {
      toast.error(t('unexpectedError'));
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('enterNewPassword')}
                autoComplete="new-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('confirmNewPassword')}
                autoComplete="new-password"
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
