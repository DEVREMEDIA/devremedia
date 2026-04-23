'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateProjectPricing, resetProjectPricingSnapshot } from '@/lib/actions/pricing-health';
import type { ProjectPricingAnalysis } from '@/types/index';
import { PriceRangeBar } from './price-range-bar';
import { HealthStatusBadge } from './health-status-badge';
import { RotateCcw } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectPricingAnalysis;
  /** multipliers for live preview (from cost_settings) */
  minMultiplier: number;
  targetMultiplier: number;
  maxMultiplier: number;
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n);
}

function classifyLocal(args: {
  cost: number;
  min: number;
  max: number;
  quoted: number | null;
  totalHours: number;
}): ProjectPricingAnalysis['status'] {
  if (args.totalHours <= 0 || args.quoted == null) return 'unpriced';
  if (args.quoted < args.cost) return 'loss';
  if (args.quoted < args.min) return 'underpriced';
  if (args.quoted > args.max) return 'premium';
  return 'healthy';
}

export function PricingEditDialog({
  open,
  onOpenChange,
  project,
  minMultiplier,
  targetMultiplier,
  maxMultiplier,
}: Props) {
  const t = useTranslations('pricingHealth.edit');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [shooting, setShooting] = useState(
    project.shooting_hours != null ? String(project.shooting_hours) : '',
  );
  const [editing, setEditing] = useState(
    project.editing_hours != null ? String(project.editing_hours) : '',
  );
  const [quoted, setQuoted] = useState(
    project.quoted_price != null ? String(project.quoted_price) : '',
  );

  // Live preview — recompute using the project's cost_per_hour (which is
  // either the snapshot or the current live rate).
  const preview = useMemo(() => {
    const sh = Number(shooting.replace(',', '.')) || 0;
    const ed = Number(editing.replace(',', '.')) || 0;
    const totalHours = sh + ed;
    const cost = totalHours * project.cost_per_hour;
    const min = cost * minMultiplier;
    const target = cost * targetMultiplier;
    const max = cost * maxMultiplier;
    const q = quoted.trim() === '' ? null : Number(quoted.replace(',', '.'));
    const quotedNum = q != null && Number.isFinite(q) ? q : null;
    const status = classifyLocal({ cost, min, max, quoted: quotedNum, totalHours });
    return { totalHours, cost, min, target, max, quoted: quotedNum, status };
  }, [
    shooting,
    editing,
    quoted,
    project.cost_per_hour,
    minMultiplier,
    targetMultiplier,
    maxMultiplier,
  ]);

  function parseOrNull(v: string): number | null {
    if (v.trim() === '') return null;
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function save() {
    startTransition(async () => {
      const res = await updateProjectPricing(project.project_id, {
        shooting_hours: parseOrNull(shooting),
        editing_hours: parseOrNull(editing),
        quoted_price: parseOrNull(quoted),
      });
      if (res.error) {
        toast.error(res.error || t('saveError'));
        return;
      }
      toast.success(t('saveSuccess'));
      router.refresh();
      onOpenChange(false);
    });
  }

  function resetSnapshot() {
    startTransition(async () => {
      const res = await resetProjectPricingSnapshot(project.project_id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {t('title')}
            <HealthStatusBadge status={preview.status} />
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">
            {project.project_title}
            {project.client_name ? ` · ${project.client_name}` : ''}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pe-shoot">{t('shootingHours')}</Label>
              <Input
                id="pe-shoot"
                inputMode="decimal"
                value={shooting}
                onChange={(e) => setShooting(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-edit">{t('editingHours')}</Label>
              <Input
                id="pe-edit"
                inputMode="decimal"
                value={editing}
                onChange={(e) => setEditing(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-quoted">{t('quotedPrice')}</Label>
              <Input
                id="pe-quoted"
                inputMode="decimal"
                value={quoted}
                onChange={(e) => setQuoted(e.target.value)}
              />
            </div>
          </div>

          {/* Computed row */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label={t('totalHours')} value={`${preview.totalHours.toFixed(1)} h`} />
              <Stat
                label={t('costPerHour')}
                value={fmtEUR(project.cost_per_hour)}
                subtle={
                  project.shooting_hours != null || project.editing_hours != null
                    ? t('snapshot')
                    : undefined
                }
              />
              <Stat label={t('totalCost')} value={fmtEUR(preview.cost)} />
              <Stat label={t('targetPrice')} value={fmtEUR(preview.target)} emphasized />
            </div>

            <PriceRangeBar
              cost={preview.cost}
              min={preview.min}
              target={preview.target}
              max={preview.max}
              quoted={preview.quoted}
              status={preview.status}
            />

            <p className="text-[11px] text-muted-foreground">{t('snapshotNote')}</p>
          </div>

          {project.has_snapshot && (
            <button
              type="button"
              onClick={resetSnapshot}
              disabled={isPending}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {t('resetSnapshot')}
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={save} disabled={isPending}>
            {tc('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  subtle,
  emphasized,
}: {
  label: string;
  value: string;
  subtle?: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {subtle && <span className="ml-1 normal-case text-[10px]">({subtle})</span>}
      </div>
      <div
        className={
          emphasized
            ? 'text-base font-semibold tabular-nums text-primary'
            : 'text-base font-semibold tabular-nums'
        }
      >
        {value}
      </div>
    </div>
  );
}
