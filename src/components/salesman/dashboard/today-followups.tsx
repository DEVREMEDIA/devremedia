'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, User, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  contact_name: string;
  company_name: string | null;
  last_contacted_at: string | null;
  stage: string;
}

interface TodayFollowupsProps {
  leads: Lead[];
}

export function TodayFollowups({ leads }: TodayFollowupsProps) {
  const t = useTranslations('salesman.dashboard');
  const tCommon = useTranslations('common');

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <Calendar className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">{t('todayFollowups')}</h2>
        {leads.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {leads.length}
          </Badge>
        )}
      </div>
      <div className="p-5">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t('noFollowups')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.slice(0, 5).map((lead) => (
              <div
                key={lead.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg transition-all duration-200',
                  'border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5',
                )}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{lead.contact_name}</span>
                  </div>
                  {lead.company_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {lead.company_name}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {lead.last_contacted_at
                      ? `${tCommon('lastContacted')} ${formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}`
                      : tCommon('neverContacted')}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="shrink-0">
                  <Link href={`/salesman/leads/${lead.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
            {leads.length > 5 && (
              <Button asChild variant="outline" className="w-full mt-3 gap-2">
                <Link href="/salesman/leads">
                  {tCommon('viewAll')} {leads.length} {tCommon('leads')}
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
