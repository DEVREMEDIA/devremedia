'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Eye, EyeOff } from 'lucide-react';

import { confirmationSchema, type ConfirmationInput } from '@/lib/schemas/auth';
import { completeOnboarding } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: '/admin/today',
  admin: '/admin/today',
  employee: '/employee/today',
  salesman: '/salesman/today',
  client: '/client/home',
};

interface ConfirmationDetails {
  name: string;
  email: string;
  company: string | null;
}

interface ConfirmationFormProps {
  details: ConfirmationDetails;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function ConfirmationForm({ details }: ConfirmationFormProps) {
  const router = useRouter();
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmationInput>({
    resolver: zodResolver(confirmationSchema),
  });

  const onSubmit = async (data: ConfirmationInput) => {
    setIsLoading(true);
    try {
      const result = await completeOnboarding(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t('confirmationComplete'));
      const role = result.data?.role ?? 'client';
      router.push(ROLE_DASHBOARDS[role] ?? '/client/dashboard');
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('confirmTitle')}</CardTitle>
        <CardDescription>{t('confirmDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Admin-entered details — read-only. The invitee confirms rather than re-enters. */}
        <div className="mb-6 space-y-3 rounded-lg border bg-muted/40 p-4">
          <DetailRow label={t('yourName')} value={details.name} />
          <DetailRow label={t('email')} value={details.email} />
          {details.company && <DetailRow label={t('yourCompany')} value={details.company} />}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('confirming') : t('confirmAccount')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
