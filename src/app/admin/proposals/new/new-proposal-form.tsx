'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Client,
  Lead,
  ProposalPackageWithPrice,
  ProposalSelectedPackage,
} from '@/types/index';
import { createProposal } from '@/lib/actions/proposals';
import { formatEur as fmtEUR } from '@/lib/format';

interface Props {
  packages: ProposalPackageWithPrice[];
  leads: Lead[];
  clients: Client[];
}

export function NewProposalForm({ packages, leads, clients }: Props) {
  const t = useTranslations('proposals');
  const tf = useTranslations('proposals.form');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clientName, setClientName] = useState('');
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState('');
  const [clientNeed, setClientNeed] = useState('');
  const [leadId, setLeadId] = useState<string>('none');
  const [clientId, setClientId] = useState<string>('none');
  const [selected, setSelected] = useState<Record<string, { selected: boolean; override: string }>>(
    {},
  );
  const [includeDiscount, setIncludeDiscount] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [locale, setLocale] = useState<'el' | 'en'>('el');
  const [notes, setNotes] = useState('');

  const totalPrice = useMemo(() => {
    return packages.reduce((sum, p) => {
      const s = selected[p.id];
      if (!s?.selected) return sum;
      const override = s.override.trim() === '' ? null : Number(s.override);
      const eff = override != null && Number.isFinite(override) ? override : p.computed_price;
      return sum + eff;
    }, 0);
  }, [packages, selected]);

  function togglePackage(id: string) {
    setSelected((prev) => {
      const cur = prev[id] ?? { selected: false, override: '' };
      return { ...prev, [id]: { ...cur, selected: !cur.selected } };
    });
  }

  // When a lead/client is picked, auto-fill client_name from it
  function handleLeadChange(id: string) {
    setLeadId(id);
    if (id !== 'none') {
      setClientId('none');
      const lead = leads.find((l) => l.id === id);
      if (lead && !clientName.trim()) {
        setClientName(lead.company_name?.trim() || lead.contact_name);
      }
    }
  }
  function handleClientChange(id: string) {
    setClientId(id);
    if (id !== 'none') {
      setLeadId('none');
      const c = clients.find((x) => x.id === id);
      if (c && !clientName.trim()) {
        setClientName(c.company_name?.trim() || c.contact_name);
      }
    }
  }

  function save() {
    if (!clientName.trim()) {
      toast.error(tf('clientName'));
      return;
    }
    const selectedArr: ProposalSelectedPackage[] = Object.entries(selected)
      .filter(([, v]) => v.selected)
      .map(([package_id, v]) => {
        const override = v.override.trim() === '' ? null : Number(v.override);
        return {
          package_id,
          price_override: override != null && Number.isFinite(override) ? override : null,
          label_override: null,
        };
      });

    startTransition(async () => {
      const res = await createProposal({
        client_name: clientName.trim(),
        competitive_advantage: competitiveAdvantage.trim() || null,
        client_need: clientNeed.trim() || null,
        lead_id: leadId === 'none' ? null : leadId,
        client_id: clientId === 'none' ? null : clientId,
        selected_packages: selectedArr,
        include_discount: includeDiscount,
        valid_until: validUntil || null,
        locale,
        notes: notes.trim() || null,
        status: 'draft',
      });
      if (res.error || !res.data) {
        toast.error(res.error || tf('saveError'));
        return;
      }
      toast.success(tf('saveSuccess'));
      router.push(`/admin/proposals/${res.data.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('list.addProposal')} description={t('description')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* LEFT — Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{tf('basics')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{tf('clientName')}</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                <p className="text-xs text-muted-foreground">{tf('clientNameHelp')}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{tf('linkLead')}</Label>
                  <Select value={leadId} onValueChange={handleLeadChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.company_name || l.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tf('linkClient')}</Label>
                  <Select value={clientId} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name || c.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tf('content')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{tf('competitiveAdvantage')}</Label>
                <Input
                  value={competitiveAdvantage}
                  onChange={(e) => setCompetitiveAdvantage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{tf('competitiveAdvantageHelp')}</p>
              </div>
              <div className="space-y-2">
                <Label>{tf('clientNeed')}</Label>
                <Textarea
                  rows={3}
                  value={clientNeed}
                  onChange={(e) => setClientNeed(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{tf('clientNeedHelp')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tf('packages')}</CardTitle>
            </CardHeader>
            <CardContent>
              {packages.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground text-center">
                  {tf('noPackagesYet')}
                </p>
              ) : (
                <div className="space-y-2">
                  {packages.map((p) => {
                    const s = selected[p.id] ?? { selected: false, override: '' };
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'rounded-lg border p-3 transition-colors cursor-pointer',
                          s.selected && 'border-primary bg-primary/5',
                        )}
                        onClick={() => togglePackage(p.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                'h-5 w-5 rounded flex items-center justify-center border flex-shrink-0',
                                s.selected
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/40',
                              )}
                            >
                              {s.selected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{p.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {fmtEUR(p.computed_price)} ·{' '}
                                {(p.shooting_hours + p.editing_hours).toFixed(1)}h
                              </div>
                            </div>
                          </div>

                          {s.selected && (
                            <div
                              className="flex items-center gap-2 flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Label className="text-xs text-muted-foreground">
                                {tf('priceOverride')}
                              </Label>
                              <Input
                                className="w-24 h-8"
                                inputMode="decimal"
                                placeholder={String(p.computed_price)}
                                value={s.override}
                                onChange={(e) =>
                                  setSelected((prev) => ({
                                    ...prev,
                                    [p.id]: { ...s, override: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tf('pricing')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeDiscount}
                  onChange={(e) => setIncludeDiscount(e.target.checked)}
                />
                <span className="text-sm">{tf('includeDiscount')}</span>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{tf('validUntil')}</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tf('locale')}</Label>
                  <Select value={locale} onValueChange={(v: 'el' | 'en') => setLocale(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="el">Ελληνικά</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tf('notes')}</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Summary sticky */}
        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Σύνοψη</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold text-primary tabular-nums">
                {fmtEUR(totalPrice)}
              </div>
              <p className="text-xs text-muted-foreground">
                {Object.values(selected).filter((s) => s.selected).length} packages
              </p>
              <Button className="w-full" onClick={save} disabled={isPending || !clientName.trim()}>
                {tf('saveDraft')}
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => router.push('/admin/proposals')}
              >
                {tc('cancel')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
