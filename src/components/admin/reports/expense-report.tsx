'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ExpenseCategoryBreakdown } from '@/lib/queries/reports';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants';

type ExpenseReportProps = {
  expensesByCategory: ExpenseCategoryBreakdown[];
  profitData: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  };
};

const EXPENSE_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(25 95% 53%)',
  'hsl(280 70% 50%)',
  'hsl(210 100% 50%)',
  'hsl(45 100% 50%)',
  'hsl(350 90% 60%)',
  'hsl(215 14% 34%)',
];

export function ExpenseReport({ expensesByCategory, profitData }: ExpenseReportProps) {
  const t = useTranslations('reports');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const chartData = expensesByCategory.map((item, index) => ({
    name: EXPENSE_CATEGORY_LABELS[item.category],
    value: item.amount,
    color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('expensesByCategory')}</CardTitle>
          <CardDescription>Breakdown of expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No expense data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
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
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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

      <Card>
        <CardHeader>
          <CardTitle>Profit Analysis</CardTitle>
          <CardDescription>Revenue, expenses, and profit margin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
              <p className="text-2xl font-bold">{formatCurrency(profitData.revenue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('totalExpenses')}</p>
              <p className="text-2xl font-bold">{formatCurrency(profitData.expenses)}</p>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">{t('netProfit')}</p>
              <div className="flex items-center gap-2 mt-1">
                <p
                  className={`text-2xl font-bold ${
                    profitData.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(profitData.profit)}
                </p>
                {profitData.profit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profit Margin</p>
              <p
                className={`text-3xl font-bold ${
                  profitData.margin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {profitData.margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
