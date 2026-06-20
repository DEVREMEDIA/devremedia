'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { formatEur } from '@/lib/format';
import { getProposalPackages } from '@/lib/actions/proposal-packages';
import {
  getClientAgreement,
  saveClientAgreement,
  getClientAgreementPrefill,
} from '@/lib/actions/client-agreements';
import type { ClientAgreementWithPackage, ProposalPackageWithPrice } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Handshake, FileSignature } from 'lucide-react';

interface ClientAgreementTabProps {
  clientId: string;
  refreshKey: number;
  onSaved: () => void;
}

export function ClientAgreementTab({ clientId, refreshKey, onSaved }: ClientAgreementTabProps) {
  const t = useTranslations('clients');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [packages, setPackages] = useState<ProposalPackageWithPrice[]>([]);
  const [agreement, setAgreement] = useState<ClientAgreementWithPackage | null>(null);
  const [packageId, setPackageId] = useState('');
  const [price, setPrice] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const [pkgRes, agrRes] = await Promise.all([
      getProposalPackages(),
      getClientAgreement(clientId),
    ]);
    if (!pkgRes.error && pkgRes.data) setPackages(pkgRes.data);
    if (!agrRes.error && agrRes.data) {
      setAgreement(agrRes.data);
      setPackageId(agrRes.data.package_id);
      setPrice(String(agrRes.data.agreed_monthly_price));
    }
    setIsLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handlePrefill = async () => {
    const result = await getClientAgreementPrefill(clientId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (!result.data) {
      toast.info(t('agreement.noContractToPrefill'));
      return;
    }
    if (result.data.package_id) setPackageId(result.data.package_id);
    if (result.data.agreed_monthly_price != null) {
      setPrice(String(result.data.agreed_monthly_price));
    }
    toast.success(t('agreement.prefilled'));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveClientAgreement({
        client_id: clientId,
        package_id: packageId,
        agreed_monthly_price: price,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('agreement.saved'));
      onSaved();
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const canSave = packageId !== '' && price.trim() !== '' && !isSaving;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          {t('agreement.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{t('agreement.description')}</p>

        <div className="space-y-2">
          <Label htmlFor="agreement-package">{t('agreement.package')}</Label>
          <Select value={packageId} onValueChange={setPackageId}>
            <SelectTrigger id="agreement-package">
              <SelectValue placeholder={t('agreement.selectPackage')} />
            </SelectTrigger>
            <SelectContent>
              {packages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agreement-price">{t('agreement.monthlyPrice')}</Label>
          <Input
            id="agreement-price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">{t('agreement.priceHint')}</p>
        </div>

        {agreement?.package && (
          <p className="text-sm text-muted-foreground">
            {t('agreement.current')}: {agreement.package.name} —{' '}
            {formatEur(agreement.agreed_monthly_price)}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={!canSave}>
            {agreement ? t('agreement.update') : t('agreement.create')}
          </Button>
          <Button variant="outline" onClick={handlePrefill} disabled={isSaving}>
            <FileSignature className="mr-2 h-4 w-4" />
            {t('agreement.prefillFromContract')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
