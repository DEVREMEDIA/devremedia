import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCrewLoad } from '@/lib/queries/dashboard/production';
import { cn } from '@/lib/utils';

const cellTone = (n: number) =>
  n === 0
    ? 'bg-muted'
    : n === 1
      ? 'bg-emerald-200 text-emerald-900'
      : n === 2
        ? 'bg-yellow-300 text-yellow-900'
        : 'bg-red-400 text-red-900';

export async function CrewLoadHeatmap() {
  const t = await getTranslations('dashboard.production');
  const rows = await getCrewLoad(14);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('crewLoad')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">—</p>
        </CardContent>
      </Card>
    );
  }

  const days = rows[0].days.map((d) => d.date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('crewLoad')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card pr-2 text-left font-medium">&nbsp;</th>
                {days.map((d) => (
                  <th key={d} className="px-1 text-center font-medium tabular-nums">
                    {d.split('-').slice(1).join('/')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.crewMemberId ?? 'unassigned'}>
                  <td className="sticky left-0 truncate bg-card pr-2 font-medium">
                    {r.crewMemberId == null ? t('unassigned') : r.crewMemberName}
                  </td>
                  {r.days.map((c) => (
                    <td key={c.date} className="p-0.5">
                      <Link
                        href={`/admin/calendar?date=${c.date}${r.crewMemberId ? `&crew=${r.crewMemberId}` : ''}`}
                        className={cn(
                          'flex h-6 items-center justify-center rounded text-[10px] tabular-nums',
                          cellTone(c.count),
                        )}
                      >
                        {c.count > 0 ? c.count : ''}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
