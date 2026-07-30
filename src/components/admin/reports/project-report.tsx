'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ProjectTypeBreakdown } from '@/lib/queries/reports';
import { PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS } from '@/lib/constants';
import type { ProjectStatus } from '@/lib/constants';
import {
  CHART_SERIES,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  seriesColor,
} from '@/lib/chart-colors';

type ProjectReportProps = {
  projectsByStatus: Record<ProjectStatus, number>;
  projectsByType: ProjectTypeBreakdown[];
  averageDuration: number;
};

/**
 * Το χρώμα ακολουθεί το στάδιο, όχι τη σειρά κατάταξης — ένα φίλτρο που αλλάζει
 * το πλήθος των σταδίων δεν πρέπει να ξαναβάφει όσα απομένουν.
 */
const STATUS_COLORS: Record<ProjectStatus, string> = {
  briefing: CHART_SERIES[1],
  pre_production: CHART_SERIES[7],
  filming: CHART_SERIES[0],
  editing: CHART_SERIES[4],
  review: CHART_SERIES[5],
  revisions: CHART_SERIES[6],
  delivered: CHART_SERIES[3],
  archived: CHART_SERIES[2],
};

const PIE_SHARED = {
  cx: '50%',
  cy: '50%',
  innerRadius: 42,
  outerRadius: 68,
  paddingAngle: 2,
  stroke: 'var(--card)',
  strokeWidth: 2,
  labelLine: false,
  dataKey: 'value',
} as const;

/** Ετικέτα μόνο σε φέτες που χωράνε — όχι νούμερο σε κάθε σημείο. */
const sliceLabel = ({ percent }: { percent?: number }) =>
  (percent ?? 0) >= 0.08 ? `${((percent ?? 0) * 100).toFixed(0)}%` : '';

export function ProjectReport({
  projectsByStatus,
  projectsByType,
  averageDuration,
}: ProjectReportProps) {
  const t = useTranslations('reports');

  const statusChartData = Object.entries(projectsByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: PROJECT_STATUS_LABELS[status as ProjectStatus],
      value: count,
      color: STATUS_COLORS[status as ProjectStatus],
    }));

  const typeChartData = projectsByType.map((item, index) => ({
    name: PROJECT_TYPE_LABELS[item.type],
    value: item.count,
    color: seriesColor(index),
  }));

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{t('projectsByStatus')}</CardTitle>
          <CardDescription>Κατανομή στα τρέχοντα στάδια</CardDescription>
        </CardHeader>
        <CardContent>
          {statusChartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Δεν υπάρχουν παραγωγές</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusChartData} label={sliceLabel} {...PIE_SHARED}>
                  {statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Παραγωγές ανά είδος</CardTitle>
          <CardDescription>Κατανομή ανά τύπο έργου</CardDescription>
        </CardHeader>
        <CardContent>
          {typeChartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Δεν υπάρχουν παραγωγές</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeChartData} label={sliceLabel} {...PIE_SHARED}>
                  {typeChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Μέση διάρκεια</CardTitle>
          <CardDescription>Μέσος χρόνος ολοκλήρωσης παραγωγής</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-5xl font-bold tabular-nums text-foreground">
              {Number.isFinite(averageDuration) ? Math.round(averageDuration) : '—'}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">ημέρες</p>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Με βάση τις ολοκληρωμένες παραγωγές
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
