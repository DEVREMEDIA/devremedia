'use client';

import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { resolvePaymentInstructions, type BankDetails } from '@/lib/payment-instructions';

interface PaymentInstructionsPanelProps {
  rfCode: string | null;
  bankDetails: BankDetails | null;
}

const bankDetailsOf = (
  instructions: ReturnType<typeof resolvePaymentInstructions>,
): BankDetails | null => (instructions.kind === 'none' ? null : instructions.bankDetails);

/**
 * Πώς πληρώνεται αυτό το τιμολόγιο. Καμία κάρτα μέσα στην εφαρμογή: ο κωδικός RF
 * πρώτος και μεγάλος — είναι ό,τι πληκτρολογεί ο πελάτης στο e-banking — και ο
 * λογαριασμός από κάτω, για όποιον προτιμά έμβασμα.
 */
export function PaymentInstructionsPanel({ rfCode, bankDetails }: PaymentInstructionsPanelProps) {
  const t = useTranslations('invoices.paymentInstructions');
  const instructions = resolvePaymentInstructions({ rfCode, bankDetails });
  const bank = bankDetailsOf(instructions);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('copied', { field: label }));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {instructions.kind === 'none' && (
          <p className="text-sm text-muted-foreground">{t('contactUs')}</p>
        )}

        {instructions.kind === 'rf' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('rfCode')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-semibold tracking-wider tabular-nums">
                {instructions.rfCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => copy(instructions.rfCode, t('rfCode'))}
              >
                <Copy className="h-3.5 w-3.5" />
                {t('copy')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t('rfHint')}</p>
          </div>
        )}

        {instructions.kind === 'rf' && bank && <Separator />}

        {bank && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{t('bankTransfer')}</p>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('beneficiary')}: </span>
                <span className="font-medium">{bank.beneficiary}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{t('iban')}:</span>
                <span className="font-mono font-medium">{bank.iban}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copy(bank.iban ?? '', t('iban'))}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t('copy')}
                </Button>
              </div>
              {bank.bankName && (
                <div>
                  <span className="text-muted-foreground">{t('bankName')}: </span>
                  <span className="font-medium">{bank.bankName}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
