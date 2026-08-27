import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function InvoicePaymentCancelPage({ params }: PageProps) {
  const { invoiceId } = await params;
  const t = await getTranslations('client.invoices');

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-tone-critical-bg flex items-center justify-center">
            <XCircle className="h-8 w-8 text-tone-critical" />
          </div>
          <CardTitle className="text-2xl">{t('paymentCancelled')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t('paymentCancelledMessage')}</p>
          <div className="flex flex-col gap-2 pt-4">
            <Button asChild>
              <Link href={`/client/invoices/${invoiceId}`}>{t('tryAgain')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/client/invoices">{t('backToInvoices')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
