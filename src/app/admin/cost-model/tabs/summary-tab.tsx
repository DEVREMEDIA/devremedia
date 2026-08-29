'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import type { CostSummary } from '@/types/index';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calculator, Clock, Euro } from 'lucide-react';
import { formatEur as fmtEUR } from '@/lib/format';
import { seriesColor, CHART_TOOLTIP_STYLE } from '@/lib/chart-colors';

interface Props {
  initialSummary: CostSummary | null;
}

export function CostSummaryTab({ initialSummary }: Props) {
  const t = useTranslations('costModel.summary');
  const summary = initialSummary;

  if (!summary || summary.total_monthly_cost === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">{t('noData')}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid columns={3}>
        <StatCard
          label={t('totalMonthlyCost')}
          value={fmtEUR(summary.total_monthly_cost)}
          icon={Euro}
        />
        <StatCard
          label={t('expectedHours')}
          value={`${summary.expected_monthly_hours.toFixed(0)} h`}
          icon={Clock}
        />
        <StatCard
          label={t('costPerHour')}
          value={fmtEUR(summary.cost_per_hour)}
          icon={Calculator}
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>{t('byCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center">
            {/* Donut with total in center — no slice labels (the panel shows everything) */}
            <div className="relative h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.by_category.filter((c) => c.total > 0)}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {summary.by_category
                      .filter((c) => c.total > 0)
                      .map((_, idx) => (
                        <Cell key={idx} fill={seriesColor(idx)} />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmtEUR(Number(v))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t('totalMonthlyCost')}
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {fmtEUR(summary.total_monthly_cost)}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {summary.by_category.map((c, idx) => (
                <div
                  key={c.category_id}
                  className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seriesColor(idx) }}
                    />
                    <span className="truncate font-medium">{c.category_name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-baseline gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums w-12">
                      {c.percent.toFixed(1)}%
                    </span>
                    <span className="font-semibold tabular-nums w-24">{fmtEUR(c.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
