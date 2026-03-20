'use client';

import { format } from 'date-fns';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface Contract {
  id: string;
  title: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
  agreed_amount?: number | null;
  payment_method?: string | null;
  client?: { contact_name?: string | null; company_name?: string | null } | null;
}

interface ContractViewProps {
  contract: Contract;
}

export function ContractView({ contract }: ContractViewProps) {
  const t = useTranslations('contracts');

  return (
    <div className="space-y-4">
      {/* Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('status')}</p>
            <div className="mt-1">
              <StatusBadge status={contract.status} />
            </div>
          </CardContent>
        </Card>
        {contract.client && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('client')}
              </p>
              <p className="mt-1 font-semibold text-sm">
                {contract.client.contact_name || contract.client.company_name}
              </p>
            </CardContent>
          </Card>
        )}
        {contract.agreed_amount != null && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('amount')}
              </p>
              <p className="mt-1 font-semibold text-sm">
                &euro;{contract.agreed_amount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
        {contract.expires_at && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('deadline')}
              </p>
              <p className="mt-1 font-semibold text-sm">
                {format(new Date(contract.expires_at), 'dd/MM/yyyy')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
