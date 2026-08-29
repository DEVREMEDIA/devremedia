'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { LEAD_STAGE_LABELS, LEAD_SOURCE_LABELS } from '@/lib/constants';
import { formatEurInt } from '@/lib/format';
import {
  CHART_PRIMARY,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  seriesColor,
} from '@/lib/chart-colors';
import { useTranslations } from 'next-intl';
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
} from 'recharts';

type ForecastItem = {
  stage: string;
  total: number;
  weighted: number;
  count: number;
};

type SalesmanPerf = {
  id: string;
  name: string;
  total_leads: number;
  won: number;
  lost: number;
  active: number;
  total_value: number;
};

type SourceData = {
  source: string;
  total: number;
  won: number;
  conversion_rate: number;
};

type SalesReportProps = {
  stageData: Record<string, number>;
  conversionRate: number;
  forecast: ForecastItem[];
  salesmanData: SalesmanPerf[];
  sourceData: SourceData[];
};

export function SalesReport({
  stageData,
  conversionRate,
  forecast,
  salesmanData,
  sourceData,
}: SalesReportProps) {
  const t = useTranslations('leads');

  const pipelineChartData = Object.entries(stageData).map(([stage, count]) => ({
    name: LEAD_STAGE_LABELS[stage as keyof typeof LEAD_STAGE_LABELS] ?? stage,
    count,
  }));

  const sourceChartData = sourceData.map((s) => ({
    name: LEAD_SOURCE_LABELS[s.source as keyof typeof LEAD_SOURCE_LABELS] ?? s.source,
    total: s.total,
    won: s.won,
  }));

  const totalPipeline = forecast.reduce((sum, f) => sum + f.total, 0);
  const totalWeighted = forecast.reduce((sum, f) => sum + f.weighted, 0);

  const forecastColumns: ColumnDef<ForecastItem>[] = React.useMemo(
    () => [
      {
        accessorKey: 'stage',
        header: t('stage'),
        cell: ({ row }) => (
          <Badge variant="outline">
            {LEAD_STAGE_LABELS[row.original.stage as keyof typeof LEAD_STAGE_LABELS] ??
              row.original.stage}
          </Badge>
        ),
      },
      {
        accessorKey: 'count',
        header: t('title'),
        meta: { numeric: true },
      },
      {
        accessorKey: 'total',
        header: t('totalValue'),
        cell: ({ row }) => formatEurInt(row.original.total),
        meta: { numeric: true },
      },
      {
        accessorKey: 'weighted',
        header: t('weightedValue'),
        cell: ({ row }) => formatEurInt(Math.round(row.original.weighted)),
        meta: { numeric: true },
      },
    ],
    [t],
  );

  const sortedSalesmanData = React.useMemo(
    () => [...salesmanData].sort((a, b) => b.won - a.won),
    [salesmanData],
  );

  const salesmanColumns: ColumnDef<SalesmanPerf>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('salesman'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'total_leads',
        header: t('totalLeads'),
        meta: { numeric: true },
      },
      {
        accessorKey: 'won',
        header: LEAD_STAGE_LABELS.won,
        cell: ({ row }) => <span className="text-tone-positive">{row.original.won}</span>,
        meta: { numeric: true },
      },
      {
        accessorKey: 'lost',
        header: LEAD_STAGE_LABELS.lost,
        cell: ({ row }) => <span className="text-tone-critical">{row.original.lost}</span>,
        meta: { numeric: true },
      },
      {
        accessorKey: 'active',
        header: t('active'),
        meta: { numeric: true },
      },
      {
        accessorKey: 'total_value',
        header: t('totalValue'),
        cell: ({ row }) => formatEurInt(row.original.total_value),
        meta: { numeric: true },
      },
      {
        id: 'win_rate',
        header: t('winRate'),
        cell: ({ row }) => {
          const { won, lost } = row.original;
          return won + lost > 0 ? `${Math.round((won / (won + lost)) * 100)}%` : '-';
        },
        meta: { numeric: true },
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <StatGrid columns={4}>
        <StatCard label={t('totalPipelineValue')} value={formatEurInt(totalPipeline)} />
        <StatCard label={t('weightedPipeline')} value={formatEurInt(Math.round(totalWeighted))} />
        <StatCard label={t('conversionRate')} value={`${conversionRate}%`} />
        <StatCard label={t('activeSalesmen')} value={salesmanData.length} />
      </StatGrid>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('pipelineByStage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                  <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  />
                  <Bar dataKey="count" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('leadsBySource')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {sourceChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={seriesColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('pipelineForecast')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={forecastColumns}
            data={forecast}
            emptyState={<span className="text-muted-foreground">{t('noActivePipelineData')}</span>}
          />
        </CardContent>
      </Card>

      {/* Salesman Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('salesmanLeaderboard')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={salesmanColumns}
            data={sortedSalesmanData}
            emptyState={<span className="text-muted-foreground">{t('noSalesmanData')}</span>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
