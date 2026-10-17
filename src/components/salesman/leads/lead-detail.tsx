'use client';

import Link from 'next/link';
import { Building2, Mail, Phone, Calendar, TrendingUp, Users, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { DetailShell } from '@/components/shared/detail-shell';
import type { SectionTab } from '@/components/shell-v2/section-tabs';
import { LeadActivityFeed } from './lead-activity-feed';
import { LeadActivityForm } from './lead-activity-form';
import { LeadConvertDialog } from './lead-convert-dialog';
import { LEAD_SOURCE_LABELS } from '@/lib/constants';
import type { Lead, LeadActivity } from '@/types';

type LeadDetailProps = {
  lead: Lead & { assigned_user?: { display_name: string } };
  activities: Array<LeadActivity & { user?: { display_name: string } }>;
  activeTab: string;
};

export function LeadDetail({ lead, activities, activeTab }: LeadDetailProps) {
  const t = useTranslations('leads');

  const TABS: SectionTab[] = [
    { key: 'info', label: t('info') },
    { key: 'activities', label: t('activities'), count: activities.length },
  ];

  return (
    <DetailShell
      backHref="/salesman/leads"
      backLabel={t('backToPipeline')}
      title={lead.contact_name}
      meta={lead.email}
      actions={
        <>
          {activeTab === 'activities' && <LeadActivityForm leadId={lead.id} />}
          {lead.stage !== 'won' && lead.stage !== 'lost' && <LeadConvertDialog lead={lead} />}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/salesman/leads/${lead.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('editLead')}
            </Link>
          </Button>
        </>
      }
      tabs={{ items: TABS, active: activeTab, basePath: `/salesman/leads/${lead.id}` }}
    >
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('contactName')}</div>
                <div className="font-medium">{lead.contact_name}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('email')}</div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                </div>
              </div>

              {lead.phone && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('phone')}</div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}

              {lead.company_name && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('companyName')}</div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.company_name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('leadDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('stage')}</div>
                <StatusBadge status={lead.stage} />
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('source')}</div>
                <Badge variant="outline">{LEAD_SOURCE_LABELS[lead.source]}</Badge>
              </div>

              {lead.deal_value !== null && lead.deal_value > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('dealValue')}</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-tone-positive" />
                    <span className="font-semibold text-tone-positive">
                      {lead.deal_value.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('probability')}</div>
                <div>{lead.probability}%</div>
              </div>

              {lead.expected_close_date && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('expectedCloseDate')}</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(lead.expected_close_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}

              {lead.assigned_user && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('assignedTo')}</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.assigned_user.display_name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {lead.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {lead.lost_reason && lead.stage === 'lost' && (
            <Card className="lg:col-span-2 border-tone-critical/30 bg-tone-critical-bg">
              <CardHeader>
                <CardTitle className="text-tone-critical">{t('lostReason')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-tone-critical">{lead.lost_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'activities' && <LeadActivityFeed activities={activities} />}
    </DetailShell>
  );
}
