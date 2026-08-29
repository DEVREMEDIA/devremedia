'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ExpenseCategoryBreakdown } from '@/lib/queries/reports';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants';
import { formatEur as formatCurrency } from '@/lib/format';
import {
  CHART_STATUS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  seriesColor,
} from '@/lib/chart-colors';

type ExpenseReportProps = {
  expensesByCategory: ExpenseCategoryBreakdown[];
  profitData: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  };
};

export function ExpenseReport({ expensesByCategory, profitData }: ExpenseReportProps) {
  const t = useTranslations('reports');

  const chartData = expensesByCategory.map((item, index) => ({
    name: EXPENSE_CATEGORY_LABELS[item.category],
    value: item.amount,
    color: seriesColor(index),
  }));

  const isPositive = profitData.profit >= 0;
  const accent = isPositive ? CHART_STATUS.good : CHART_STATUS.critical;

  // Μερίδιο εξόδων και κέρδους πάνω στον τζίρο, για τη λωρίδα σύνθεσης.
  const total = Math.max(profitData.revenue, 1);
  const expenseShare = Math.min(100, Math.max(0, (profitData.expenses / total) * 100));
  const profitShare = Math.min(100, Math.max(0, (profitData.profit / total) * 100));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('expensesByCategory')}</CardTitle>
          <CardDescription>Ανάλυση εξόδων ανά κατηγορία</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν καταγεγραμμένα έξοδα
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                  labelLine={false}
                  label={({ percent }: { percent?: number }) =>
                    (percent ?? 0) >= 0.06 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
                  }
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) =>
                    formatCurrency(typeof value === 'number' ? value : 0)
                  }
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ανάλυση κέρδους</CardTitle>
          <CardDescription>Τζίρος, έξοδα και περιθώριο</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <StatGrid columns={2}>
            <StatCard label={t('revenueTurnover')} value={formatCurrency(profitData.revenue)} />
            <StatCard label={t('totalExpenses')} value={formatCurrency(profitData.expenses)} />
          </StatGrid>

          {/* Λωρίδα σύνθεσης: πόσο από τον τζίρο είναι έξοδα και πόσο μένει */}
          <div>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              <span
                className="rounded-l-full"
                style={{ width: `${expenseShare}%`, backgroundColor: seriesColor(6) }}
              />
              <span
                className="rounded-r-full"
                style={{ width: `${profitShare}%`, backgroundColor: accent }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: seriesColor(6) }}
                  aria-hidden
                />
                Έξοδα {expenseShare.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                {isPositive ? 'Κέρδος' : 'Ζημιά'} {Math.abs(profitShare).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">{t('netProfit')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="text-3xl font-bold tabular-nums">{formatCurrency(profitData.profit)}</p>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" aria-hidden />
                ) : (
                  <TrendingDown className="h-4 w-4" aria-hidden />
                )}
                {profitData.margin.toFixed(1)}% περιθώριο
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
