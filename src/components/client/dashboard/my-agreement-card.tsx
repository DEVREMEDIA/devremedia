import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, FileText } from 'lucide-react';
import { formatEur } from '@/lib/format';
import type { MyAgreement } from '@/lib/actions/my-agreement';

const CONTACT_EMAIL = 'info@devremedia.com';

interface MyAgreementCardProps {
  /** The Client's own Agreement, or null when they have none. */
  agreement: MyAgreement | null;
}

/**
 * The "My Agreement" card: the signed-in Client's own Package (name +
 * inclusions), the monthly price agreed with them, and how much of their
 * Allowance is left this calendar month. A Client with no active Agreement
 * sees a contact prompt instead. Never shows any other Client's figures or a
 * general price list.
 */
export async function MyAgreementCard({ agreement }: MyAgreementCardProps) {
  const t = await getTranslations('client.agreement');

  if (!agreement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <FileText className="h-9 w-9 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-semibold">{t('noAgreementTitle')}</p>
            <p className="max-w-md text-sm text-muted-foreground">{t('noAgreementBody')}</p>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('contactUs')}
          </a>
        </CardContent>
      </Card>
    );
  }

  const { package_name, inclusions, agreed_monthly_price, allowance, remaining_allowance } =
    agreement;
  const unit = t(`allowanceUnit.${allowance.unit}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-lg font-semibold">{t('package', { name: package_name })}</p>

        {inclusions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('includes')}</p>
            <ul className="space-y-1.5">
              {inclusions.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t('monthlyPrice')}</p>
            <p className="mt-1 text-2xl font-bold">{formatEur(agreed_monthly_price)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t('remainingThisMonth')}</p>
            <p className="mt-1 text-2xl font-bold">
              {remaining_allowance}{' '}
              <span className="text-base font-normal text-muted-foreground">
                / {allowance.count} {unit}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
