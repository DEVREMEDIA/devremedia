'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export function StripeConfig() {
  const tToast = useTranslations('toast');
  const t = useTranslations('settings');
  const isStripeConfigured =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY !== undefined;

  const webhookUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/stripe` : '';

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success(tToast('copySuccess'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stripeConfiguration')}</CardTitle>
        <CardDescription>{t('stripeDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isStripeConfigured ? (
              <CheckCircle className="h-5 w-5 text-tone-positive" />
            ) : (
              <XCircle className="h-5 w-5 text-tone-critical" />
            )}
            <div>
              <p className="font-medium">{t('stripeIntegration')}</p>
              <p className="text-sm text-muted-foreground">
                {isStripeConfigured ? t('apiKeysConfigured') : t('apiKeysNotConfigured')}
              </p>
            </div>
          </div>
          <Badge variant={isStripeConfigured ? 'default' : 'destructive'}>
            {isStripeConfigured ? t('active') : t('inactive')}
          </Badge>
        </div>

        <div className="space-y-2">
          <Label>{t('webhookUrl')}</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyWebhookUrl}
              disabled={!webhookUrl}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('webhookDescription')}</p>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">{t('requiredEnvVars')}</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
            <li>• STRIPE_SECRET_KEY</li>
            <li>• STRIPE_WEBHOOK_SECRET</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">{t('envVarsInstruction')}</p>
        </div>

        <Button variant="outline" asChild>
          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
            {t('openStripeDashboard')}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
