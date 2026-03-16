'use client';

import { useState } from 'react';
import { Building2, Mail, Phone, Calendar, TrendingUp, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LeadActivityFeed } from './lead-activity-feed';
import { LeadActivityForm } from './lead-activity-form';
import { LeadConvertDialog } from './lead-convert-dialog';
import { LEAD_STAGE_LABELS, LEAD_SOURCE_LABELS } from '@/lib/constants';
import type { Lead, LeadActivity } from '@/types';

type LeadDetailProps = {
  lead: Lead & { assigned_user?: { display_name: string } };
  activities: Array<LeadActivity & { user?: { display_name: string } }>;
};

export function LeadDetail({ lead, activities }: LeadDetailProps) {
  const t = useTranslations('leads');
  const [activeTab, setActiveTab] = useState('info');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="info">{t('info')}</TabsTrigger>
            <TabsTrigger value="activities">
              {t('activities')} ({activities.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {activeTab === 'activities' && <LeadActivityForm leadId={lead.id} />}
            {lead.stage !== 'won' && lead.stage !== 'lost' && <LeadConvertDialog lead={lead} />}
          </div>
        </div>

        <TabsContent value="info" className="mt-6">
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
                  <Badge variant="outline">{LEAD_STAGE_LABELS[lead.stage]}</Badge>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('source')}</div>
                  <Badge variant="outline">{LEAD_SOURCE_LABELS[lead.source]}</Badge>
                </div>

                {lead.deal_value !== null && lead.deal_value > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">{t('dealValue')}</div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">
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
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('expectedCloseDate')}
                    </div>
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
              <Card className="lg:col-span-2 border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-900">{t('lostReason')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-800">{lead.lost_reason}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="mt-6">
          <LeadActivityFeed activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
