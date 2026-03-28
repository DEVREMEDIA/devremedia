'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineSummaryProps {
  summary: {
    new: number;
    contacted: number;
    qualified: number;
    proposal: number;
    negotiation: number;
    won: number;
    lost: number;
  };
  pipelineValue: {
    total: number;
    weighted: number;
  };
}

const STAGE_COLORS: Record<string, { text: string; bg: string }> = {
  new: { text: 'text-blue-500', bg: 'bg-blue-500/10' },
  contacted: { text: 'text-purple-500', bg: 'bg-purple-500/10' },
  qualified: { text: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  proposal: { text: 'text-orange-500', bg: 'bg-orange-500/10' },
  negotiation: { text: 'text-pink-500', bg: 'bg-pink-500/10' },
};

export function PipelineSummary({ summary, pipelineValue }: PipelineSummaryProps) {
  const t = useTranslations('salesman.dashboard');
  const tStatus = useTranslations('statuses.leadStage');

  const activeLeads =
    summary.new + summary.contacted + summary.qualified + summary.proposal + summary.negotiation;

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div
          className={cn(
            'rounded-xl border bg-card p-5 transition-all duration-300',
            'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('pipelineSummary')}</p>
              <p className="text-3xl font-bold mt-1">
                {pipelineValue.total.toLocaleString('el-GR')}&euro;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Weighted: {pipelineValue.weighted.toLocaleString('el-GR')}&euro;
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'rounded-xl border bg-card p-5 transition-all duration-300',
            'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('activeLeads')}</p>
              <p className="text-3xl font-bold mt-1">{activeLeads}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.won} {tStatus('won')}, {summary.lost} {tStatus('lost')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10">
              <TrendingUp className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline by Stage */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">{t('pipelineByStage')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('pipelineBreakdown')}</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(summary).map(([stage, count]) => {
              if (stage === 'won' || stage === 'lost') return null;
              const colors = STAGE_COLORS[stage] ?? {
                text: 'text-muted-foreground',
                bg: 'bg-muted',
              };
              return (
                <div
                  key={stage}
                  className={cn(
                    'rounded-lg p-3 text-center transition-all duration-200',
                    colors.bg,
                  )}
                >
                  <p className={cn('text-2xl font-bold', colors.text)}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tStatus(
                      stage as 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation',
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
