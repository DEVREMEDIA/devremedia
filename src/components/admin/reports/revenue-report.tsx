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

type RevenueReportProps = {
  monthlyData: MonthlyRevenue[];
  paymentMethodData: PaymentMethodBreakdown[];
};

const PAYMENT_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(25 95% 53%)',
  'hsl(280 70% 50%)',
  'hsl(210 100% 50%)',
];

export function RevenueReport({ monthlyData, paymentMethodData }: RevenueReportProps) {
  const t = useTranslations('reports');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const monthlyChartData = monthlyData.map((item) => ({
    name: formatMonth(item.month),
    value: item.revenue,
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
          <CardDescription>Revenue breakdown by month</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No revenue data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  formatter={(value: unknown) =>
                    formatCurrency(typeof value === 'number' ? value : 0)
                  }
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Revenue by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) =>
                    formatCurrency(typeof value === 'number' ? value : 0)
                  }
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
