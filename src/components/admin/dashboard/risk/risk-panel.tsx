import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskItem } from './risk-item';
import { getRiskItems } from '@/lib/queries/dashboard/risk';

const MAX_ITEMS = 8;

export async function RiskPanel() {
  const t = await getTranslations('dashboard.risk');
  const all = await getRiskItems();
  const items = all.slice(0, MAX_ITEMS);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-red-500" />
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        {all.length > 0 && (
          <Badge variant="destructive" className="ml-auto">
            {all.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <>
            {items.map((it) => (
              <RiskItem key={it.id} item={it} label={t(`types.${it.type}`)} />
            ))}
            {all.length > MAX_ITEMS && (
              <Link
                href="/admin/dashboard/risk"
                className="block pt-2 text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {t('viewAll')} ({all.length})
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
