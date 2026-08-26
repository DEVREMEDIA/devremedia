'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  PricingHealthStatus,
  PricingHealthSummary,
  ProjectPricingAnalysis,
} from '@/types/index';
import { PriceRangeBar } from '@/components/admin/pricing-health/price-range-bar';
import { HealthStatusBadge } from '@/components/admin/pricing-health/health-status-badge';
import { PricingEditDialog } from '@/components/admin/pricing-health/pricing-edit-dialog';
import { Pencil, TrendingDown, TrendingUp, Euro, AlertCircle } from 'lucide-react';
import { formatEurInt as fmtEUR } from '@/lib/format';

interface Props {
  summary: PricingHealthSummary | null;
  error: string | null;
  minMultiplier: number;
  targetMultiplier: number;
  maxMultiplier: number;
}

const STATUS_ORDER: PricingHealthStatus[] = [
  'loss',
  'underpriced',
  'healthy',
  'premium',
  'unpriced',
];

export function PricingHealthContent({
  summary,
  error,
  minMultiplier,
  targetMultiplier,
  maxMultiplier,
}: Props) {
  const t = useTranslations('pricingHealth');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<ProjectPricingAnalysis | null>(null);

  const filtered = useMemo(() => {
    const items = summary?.projects ?? [];
    return items.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        p.project_title.toLowerCase().includes(q) ||
        (p.client_name?.toLowerCase().includes(q) ?? false);
      const matchesFilter = filter === 'all' || p.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [summary, search, filter]);

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Χωρίς σύνοψη δεν υπάρχει τίποτα να δείξουμε. Πριν, αυτός ο κλάδος τύπωνε
  // μόνο τον διπλό τίτλο· τώρα που ο τίτλος ανήκει στο hub, μένει κενός.
  // Το άδειο <div> με space-y θα άφηνε φάντασμα κενού ανάμεσα στα αδέρφια του.
  // Η κανονική κενή κατάσταση των Οικονομικών ανήκει στη φέτα #104.
  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={t('kpis.totalProjects')} value={String(summary.total_projects)} />
        <KpiCard
          label={t('kpis.analysed')}
          value={`${summary.analysed} / ${summary.total_projects}`}
        />
        <KpiCard
          icon={<Euro className="h-4 w-4" />}
          label={t('kpis.totalQuoted')}
          value={fmtEUR(summary.total_quoted)}
        />
        <KpiCard
          icon={<TrendingDown className="h-4 w-4" />}
          label={t('kpis.totalCost')}
          value={fmtEUR(summary.total_cost)}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t('kpis.totalProfit')}
          value={fmtEUR(summary.total_profit)}
          tone={summary.total_profit >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label={t('kpis.leftOnTable')}
          value={fmtEUR(summary.total_left_on_table)}
          tone={summary.total_left_on_table > 0 ? 'warning' : undefined}
        />
      </div>

      {/* Status breakdown */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? 'all' : s)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  filter === s ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <HealthStatusBadge status={s} />
                <span className="font-semibold tabular-nums">{summary.by_status[s]}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-lg">{t('table.project')}</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="🔍"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-[180px]"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t('table.noData')}</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <ProjectRow key={p.project_id} project={p} onEdit={() => setEditing(p)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <PricingEditDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          project={editing}
          minMultiplier={minMultiplier}
          targetMultiplier={targetMultiplier}
          maxMultiplier={maxMultiplier}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'positive' | 'negative' | 'warning';
}) {
  const toneCls =
    tone === 'positive'
      ? 'text-emerald-400'
      : tone === 'negative'
        ? 'text-red-400'
        : tone === 'warning'
          ? 'text-amber-400'
          : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
          {icon && <span className="text-muted-foreground flex-shrink-0">{icon}</span>}
        </div>
        <div className={`text-xl font-bold tabular-nums ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ProjectRow({
  project: p,
  onEdit,
}: {
  project: ProjectPricingAnalysis;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/projects/${p.project_id}`}
            className="font-semibold truncate hover:underline block"
          >
            {p.project_title}
          </Link>
          <div className="text-xs text-muted-foreground truncate">{p.client_name ?? '—'}</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <HealthStatusBadge status={p.status} />
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PriceRangeBar
        cost={p.total_cost}
        min={p.min_price}
        target={p.target_price}
        max={p.max_price}
        quoted={p.quoted_price}
        status={p.status}
        compact
      />

      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs tabular-nums">
        <MetaCell label="Hours" value={p.total_hours.toFixed(1)} />
        <MetaCell label="Cost" value={fmtEUR(p.total_cost)} />
        <MetaCell label="Target" value={fmtEUR(p.target_price)} />
        <MetaCell label="Quoted" value={p.quoted_price != null ? fmtEUR(p.quoted_price) : '—'} />
        <MetaCell
          label="Profit"
          value={p.profit_loss != null ? fmtEUR(p.profit_loss) : '—'}
          tone={p.profit_loss == null ? undefined : p.profit_loss >= 0 ? 'positive' : 'negative'}
        />
      </div>
    </div>
  );
}

function MetaCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}) {
  const toneCls =
    tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-red-400' : '';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-medium ${toneCls}`}>{value}</div>
    </div>
  );
}
