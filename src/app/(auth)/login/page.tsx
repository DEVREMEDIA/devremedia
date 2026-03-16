'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { createClient } from '@/lib/supabase/client';
import { loginSchema } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

type LoginInput = z.infer<typeof loginSchema>;

function LoginForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tToast = useTranslations('toast');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const urlError = searchParams.get('error');
  useEffect(() => {
    if (!urlError) return;

    switch (urlError) {
      case 'auth_callback_error':
        toast.error(t('authFailed'));
        break;
      case 'otp_expired':
        toast.error(t('linkExpired'));
        break;
      case 'access_denied':
        toast.error(t('accessDenied'));
        break;
      default:
        toast.error(tc('error'));
    }
  }, [urlError, t, tc]);

  const onSubmitPassword = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(t('signingIn'));
      router.refresh();
      router.push('/');
    } catch {
      toast.error(tToast('genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('welcomeBack')}</CardTitle>
        <CardDescription>{t('signInDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{tc('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('enterEmail')}
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{tc('password')}</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder={t('enterPassword')}
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('signingIn') : t('login')}
          </Button>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backToHome')}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

function LoginSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
