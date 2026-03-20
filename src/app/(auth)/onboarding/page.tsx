'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Eye, EyeOff } from 'lucide-react';

import { onboardingSchema } from '@/lib/schemas/auth';
import { completeOnboarding } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { OnboardingInput } from '@/lib/schemas/auth';

const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: '/admin/dashboard',
  admin: '/admin/dashboard',
  employee: '/employee/dashboard',
  salesman: '/salesman/dashboard',
  client: '/client/dashboard',
};

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  });

  const onSubmit = async (data: OnboardingInput) => {
    setIsLoading(true);
    try {
      const result = await completeOnboarding(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t('profileCompleted'));
      const role = result.data?.role ?? 'client';
      const redirectPath = ROLE_DASHBOARDS[role] ?? '/client/dashboard';
      router.push(redirectPath);
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding')}</CardTitle>
        <CardDescription>{t('onboardingDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">{t('displayName')}</Label>
            <Input
              id="display_name"
              type="text"
              placeholder={t('displayNamePlaceholder')}
              autoComplete="name"
              {...register('display_name')}
            />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('setPassword')}</Label>
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

          <div className="space-y-2">
            <Label htmlFor="company_name">{t('companyNameOptional')}</Label>
            <Input
              id="company_name"
              type="text"
              placeholder={t('companyNamePlaceholder')}
              autoComplete="organization"
              {...register('company_name')}
            />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('phoneOptional')}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+30 xxx xxx xxxx"
              autoComplete="tel"
              {...register('phone')}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('completingSetup') : t('completeSetup')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
