'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { CostSettings } from '@/types/index';
import { updateCostSettings } from '@/lib/actions/cost-model';

interface Props {
  initialSettings: CostSettings | null;
}

type FormState = {
  expected_monthly_hours: string;
  default_margin_pct: string; // shown as %
  price_min_multiplier: string;
  price_target_multiplier: string;
  price_max_multiplier: string;
  discount_first_months: string;
  discount_first_pct: string; // shown as %
  vat_pct: string; // shown as %
  deposit_pct: string; // shown as %
  threshold_stale_lead: string;
  threshold_stale_deliverable: string;
  threshold_stale_contract: string;
  threshold_deadline_risk: string;
  threshold_active_projects: string;
};

function pctFromFraction(v: number) {
  return (v * 100).toFixed(2).replace(/\.00$/, '');
}

function numeric(v: string, fallback = 0) {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export function CostSettingsTab({ initialSettings }: Props) {
  const t = useTranslations('costModel.settings');
  const tc = useTranslations('common');
  const tt = useTranslations('dashboard.dashboardThresholds');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(() => {
    const s = initialSettings;
    return {
      expected_monthly_hours: String(s?.expected_monthly_hours ?? 352),
      default_margin_pct: pctFromFraction(s?.default_margin ?? 0.6),
      price_min_multiplier: String(s?.price_min_multiplier ?? 1.3),
      price_target_multiplier: String(s?.price_target_multiplier ?? 1.6),
      price_max_multiplier: String(s?.price_max_multiplier ?? 2.0),
      discount_first_months: String(s?.discount_first_months ?? 6),
      discount_first_pct: pctFromFraction(s?.discount_first_percent ?? 0.1),
      vat_pct: pctFromFraction(s?.vat_percent ?? 0.24),
      deposit_pct: pctFromFraction(s?.deposit_percent ?? 0.5),
      threshold_stale_lead: String(s?.dashboard_thresholds?.stale_lead_days ?? 14),
      threshold_stale_deliverable: String(s?.dashboard_thresholds?.stale_deliverable_days ?? 7),
      threshold_stale_contract: String(s?.dashboard_thresholds?.stale_contract_days ?? 14),
      threshold_deadline_risk: String(s?.dashboard_thresholds?.deadline_risk_days ?? 7),
      threshold_active_projects: String(s?.dashboard_thresholds?.active_projects_warn_above ?? 50),
    };
  });

  function submit() {
    startTransition(async () => {
      const payload = {
        expected_monthly_hours: numeric(form.expected_monthly_hours, 352),
        default_margin: numeric(form.default_margin_pct, 60) / 100,
        price_min_multiplier: numeric(form.price_min_multiplier, 1.3),
        price_target_multiplier: numeric(form.price_target_multiplier, 1.6),
        price_max_multiplier: numeric(form.price_max_multiplier, 2.0),
        discount_first_months: Math.round(numeric(form.discount_first_months, 6)),
        discount_first_percent: numeric(form.discount_first_pct, 10) / 100,
        vat_percent: numeric(form.vat_pct, 24) / 100,
        deposit_percent: numeric(form.deposit_pct, 50) / 100,
        dashboard_thresholds: {
          stale_lead_days: Math.round(numeric(form.threshold_stale_lead, 14)),
          stale_deliverable_days: Math.round(numeric(form.threshold_stale_deliverable, 7)),
          stale_contract_days: Math.round(numeric(form.threshold_stale_contract, 14)),
          deadline_risk_days: Math.round(numeric(form.threshold_deadline_risk, 7)),
          active_projects_warn_above: Math.round(numeric(form.threshold_active_projects, 50)),
        },
      };
      const res = await updateCostSettings(payload);
      if (res.error) {
        toast.error(res.error || t('saveError'));
        return;
      }
      toast.success(t('saveSuccess'));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('expectedMonthlyHours')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="hours">{t('expectedMonthlyHours')}</Label>
            <Input
              id="hours"
              inputMode="decimal"
              value={form.expected_monthly_hours}
              onChange={(e) => setForm({ ...form, expected_monthly_hours: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{t('expectedMonthlyHoursHelp')}</p>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h4 className="font-semibold">{t('defaultMargin')}</h4>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('defaultMargin')} (%)</Label>
              <Input
                inputMode="decimal"
                value={form.default_margin_pct}
                onChange={(e) => setForm({ ...form, default_margin_pct: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('priceMin')}</Label>
              <Input
                inputMode="decimal"
                value={form.price_min_multiplier}
                onChange={(e) => setForm({ ...form, price_min_multiplier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('priceTarget')}</Label>
              <Input
                inputMode="decimal"
                value={form.price_target_multiplier}
                onChange={(e) => setForm({ ...form, price_target_multiplier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('priceMax')}</Label>
              <Input
                inputMode="decimal"
                value={form.price_max_multiplier}
                onChange={(e) => setForm({ ...form, price_max_multiplier: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('priceMultipliersHelp')}</p>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h4 className="font-semibold">Discount / VAT / Deposit</h4>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('discountFirstMonths')}</Label>
              <Input
                inputMode="numeric"
                value={form.discount_first_months}
                onChange={(e) => setForm({ ...form, discount_first_months: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('discountFirstPercent')} (%)</Label>
              <Input
                inputMode="decimal"
                value={form.discount_first_pct}
                onChange={(e) => setForm({ ...form, discount_first_pct: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('vatPercent')} (%)</Label>
              <Input
                inputMode="decimal"
                value={form.vat_pct}
                onChange={(e) => setForm({ ...form, vat_pct: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('depositPercent')} (%)</Label>
              <Input
                inputMode="decimal"
                value={form.deposit_pct}
                onChange={(e) => setForm({ ...form, deposit_pct: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h4 className="font-semibold">{tt('title')}</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{tt('staleLead')}</Label>
              <Input
                inputMode="numeric"
                value={form.threshold_stale_lead}
                onChange={(e) => setForm({ ...form, threshold_stale_lead: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tt('staleDeliverable')}</Label>
              <Input
                inputMode="numeric"
                value={form.threshold_stale_deliverable}
                onChange={(e) => setForm({ ...form, threshold_stale_deliverable: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tt('staleContract')}</Label>
              <Input
                inputMode="numeric"
                value={form.threshold_stale_contract}
                onChange={(e) => setForm({ ...form, threshold_stale_contract: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tt('deadlineRisk')}</Label>
              <Input
                inputMode="numeric"
                value={form.threshold_deadline_risk}
                onChange={(e) => setForm({ ...form, threshold_deadline_risk: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tt('activeProjectsWarn')}</Label>
              <Input
                inputMode="numeric"
                value={form.threshold_active_projects}
                onChange={(e) => setForm({ ...form, threshold_active_projects: e.target.value })}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <Button onClick={submit} disabled={isPending}>
            {tc('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
