'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, DollarSign } from 'lucide-react';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';

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

export function PipelineSummary({ summary, pipelineValue }: PipelineSummaryProps) {
  const t = useTranslations('salesman.dashboard');
  const tStatus = useTranslations('statuses.leadStage');

  const activeLeads =
    summary.new + summary.contacted + summary.qualified + summary.proposal + summary.negotiation;

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <StatGrid columns={2}>
        <StatCard
          label={t('pipelineSummary')}
          value={`${pipelineValue.total.toLocaleString('el-GR')}€`}
          icon={DollarSign}
          caption={`${t('weighted')}: ${pipelineValue.weighted.toLocaleString('el-GR')}€`}
        />
        <StatCard
          label={t('activeLeads')}
          value={activeLeads}
          icon={TrendingUp}
          caption={`${summary.won} ${tStatus('won')}, ${summary.lost} ${tStatus('lost')}`}
        />
      </StatGrid>

      {/* Pipeline by Stage */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">{t('pipelineByStage')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('pipelineBreakdown')}</p>
        </div>
        <StatGrid columns={5}>
          {Object.entries(summary).map(([stage, count]) => {
            if (stage === 'won' || stage === 'lost') return null;
            return (
              <StatCard
                key={stage}
                label={tStatus(
                  stage as 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation',
                )}
                value={count}
              />
            );
          })}
        </StatGrid>
      </div>
    </div>
  );
}
