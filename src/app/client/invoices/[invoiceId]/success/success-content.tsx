'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface SuccessContentProps {
  invoiceId: string;
  sessionId?: string;
}

export function SuccessContent({ invoiceId, sessionId }: SuccessContentProps) {
  const t = useTranslations('client.invoices');
  const [status, setStatus] = useState<'confirming' | 'confirmed' | 'error'>('confirming');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    fetch(`/api/invoices/${invoiceId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.confirmed || data.already_paid) {
          setStatus('confirmed');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [invoiceId, sessionId]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              backgroundColor:
                status === 'confirming'
                  ? undefined
                  : status === 'confirmed'
                    ? 'var(--tone-positive-bg)'
                    : 'var(--tone-critical-bg)',
            }}
          >
            {status === 'confirming' && (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            )}
            {status === 'confirmed' && <CheckCircle className="h-8 w-8 text-tone-positive" />}
            {status === 'error' && <AlertCircle className="h-8 w-8 text-tone-critical" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'confirming' && t('confirmingPayment')}
            {status === 'confirmed' && t('paymentSuccess')}
            {status === 'error' && t('paymentConfirmError')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {status === 'confirming' && t('confirmingPaymentMessage')}
            {status === 'confirmed' && t('paymentSuccessMessage')}
            {status === 'error' && t('paymentConfirmErrorMessage')}
          </p>
          {status !== 'confirming' && (
            <div className="flex flex-col gap-2 pt-4">
              <Button asChild>
                <Link href="/client/invoices">{t('backToInvoices')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/client/home">{t('backToDashboard')}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
