'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';
import { useTranslations } from 'next-intl';

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
  signature_image?: string | null;
  signed_at?: string | null;
}

interface ContractViewProps {
  contract: Contract;
  showSignature?: boolean;
}

export function ContractView({ contract, showSignature = false }: ContractViewProps) {
  const t = useTranslations('contracts');
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{contract.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={contract.status} />
                  <span className="text-sm text-muted-foreground">
                    {t('created')}{' '}
                    {new Date(contract.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {contract.expires_at && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {t('expires')}{' '}
                {new Date(contract.expires_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(contract.content) }}
          />
        </CardContent>
      </Card>

      {showSignature &&
        contract.status === 'signed' &&
        contract.signature_image &&
        contract.signed_at && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">{t('signatureLabel')}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="border rounded-lg p-4 bg-muted/10 inline-block">
                  <Image
                    src={contract.signature_image}
                    alt={t('contractSignature')}
                    width={200}
                    height={96}
                    className="h-24 w-auto"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('signedOn', {
                    date: format(new Date(contract.signed_at!), 'MMMM d, yyyy'),
                    time: format(new Date(contract.signed_at!), 'h:mm a'),
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
