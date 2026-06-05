'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Self-service "request a new link" form on the /link-expired screen. Always shows the
 * same generic confirmation regardless of whether the email matched a pending invite —
 * the endpoint owns the security model.
 */
export function RequestNewLinkForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await fetch('/api/auth/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Generic confirmation for any completed request (no account-existence signal).
      toast.success(t('resendGenericSuccess'));
      setEmail('');
    } catch {
      toast.error(t('resendError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="resend-email">{t('email')}</Label>
        <Input
          id="resend-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('sending') : t('requestNewLink')}
      </Button>
    </form>
  );
}
