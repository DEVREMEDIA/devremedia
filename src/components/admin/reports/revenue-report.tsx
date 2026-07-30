'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { MonthlyRevenue, PaymentMethodBreakdown } from '@/lib/queries/reports';
import { formatEurInt as formatCurrency } from '@/lib/format';
import {
  CHART_SERIES,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  seriesColor,
} from '@/lib/chart-colors';

type RevenueReportProps = {
  monthlyData: MonthlyRevenue[];
  paymentMethodData: PaymentMethodBreakdown[];
};

export function RevenueReport({ monthlyData, paymentMethodData }: RevenueReportProps) {
  const t = useTranslations('reports');

  const formatMonth = (month: string) =>
    new Date(`${month}-01`).toLocaleDateString('el-GR', { month: 'short', year: '2-digit' });

  const monthlyChartData = monthlyData.map((item) => ({
    name: formatMonth(item.month),
    revenue: item.revenue,
    collections: item.collections,
  }));

  const paymentChartData = paymentMethodData.map((item) => ({
    name: item.method,
    value: item.amount,
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('revenueByMonth')}</CardTitle>
          <CardDescription>{t('revenueVsCollections')}</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν δεδομένα εσόδων
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={CHART_AXIS_TICK}
                  tickFormatter={formatCurrency}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                  formatter={(value: unknown) =>
                    formatCurrency(typeof value === 'number' ? value : 0)
                  }
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar
                  dataKey="revenue"
                  name={t('revenueTurnover')}
                  fill={CHART_SERIES[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={34}
                />
                <Bar
                  dataKey="collections"
                  name={t('collections')}
                  fill={CHART_SERIES[1]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Τρόποι πληρωμής</CardTitle>
          <CardDescription>Έσοδα ανά τρόπο πληρωμής</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentChartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν δεδομένα πληρωμών
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentChartData}
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
                  {paymentChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={seriesColor(index)} />
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
    </div>
  );
}
