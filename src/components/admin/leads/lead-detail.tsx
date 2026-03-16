'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LEAD_SOURCE_LABELS } from '@/lib/constants';
import { updateLead } from '@/lib/actions/leads';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Phone,
  Mail,
  Building2,
  Calendar,
  User,
  ArrowRight,
  StickyNote,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react';

type LeadData = {
  id: string;
  contact_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  stage: string;
  source: string;
  deal_value: number | null;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  assigned_to: string;
};

type ActivityData = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  user: { display_name: string | null } | null;
};

type AdminLeadDetailProps = {
  lead: LeadData;
  activities: ActivityData[];
  salesmen: { id: string; display_name: string | null }[];
};

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  stage_change: ArrowRight,
  other: MoreHorizontal,
};

export function AdminLeadDetail({ lead, activities, salesmen }: AdminLeadDetailProps) {
  const router = useRouter();
  const t = useTranslations('leads');
  const tToast = useTranslations('toast');
  const [reassigning, setReassigning] = useState(false);

  const handleReassign = async (newAssignee: string) => {
    setReassigning(true);
    const result = await updateLead(lead.id, { assigned_to: newAssignee });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('updateSuccess'));
      router.refresh();
    }
    setReassigning(false);
  };

  return (
    <Tabs defaultValue="info" className="space-y-6">
      <TabsList>
        <TabsTrigger value="info">{t('info')}</TabsTrigger>
        <TabsTrigger value="activities">
          {t('activities')} ({activities.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{lead.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.company_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.company_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('dealInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('stage')}</span>
                <StatusBadge status={lead.stage} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('source')}</span>
                <Badge variant="outline">
                  {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] ??
                    lead.source}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('dealValue')}</span>
                <span className="font-medium">
                  {lead.deal_value != null ? `€${Number(lead.deal_value).toLocaleString()}` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('probability')}</span>
                <span>{lead.probability}%</span>
              </div>
              {lead.expected_close_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('expectedCloseDate')}</span>
                  <span>
                    {new Date(lead.expected_close_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reassign */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('assignment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{t('assignedTo')}:</span>
              <Select
                value={lead.assigned_to}
                onValueChange={handleReassign}
                disabled={reassigning}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {salesmen.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name ?? t('unassigned')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {lead.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="activities">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('activityHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noActivitiesLogged')}</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.activity_type] ?? MoreHorizontal;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="mt-1 rounded-full bg-muted p-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.user?.display_name ?? t('unknown')} &middot;{' '}
                          {new Date(activity.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
