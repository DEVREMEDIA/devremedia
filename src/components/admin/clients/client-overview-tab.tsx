'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatEur as formatCurrency } from '@/lib/format';
import { Client } from '@/types/index';
import type { ActivityLogWithUser } from '@/types/relations';
import { getActivityByClient } from '@/lib/actions/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  MapPin,
  FileText,
  Shield,
  ShieldOff,
  Briefcase,
  Receipt,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ClientStats {
  totalProjects: number;
  totalInvoiced: number;
  totalPaid: number;
}

interface ClientOverviewTabProps {
  client: Client;
  stats: ClientStats;
  onViewAllActivity: () => void;
}

export function ClientOverviewTab({ client, stats, onViewAllActivity }: ClientOverviewTabProps) {
  const t = useTranslations('clients');
  const [recentActivity, setRecentActivity] = useState<ActivityLogWithUser[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  const unpaidBalance = stats.totalInvoiced - stats.totalPaid;

  useEffect(() => {
    async function fetchActivity() {
      const result = await getActivityByClient(client.id, { limit: 5 });
      if (!result.error && result.data) {
        setRecentActivity(result.data);
      }
      setIsLoadingActivity(false);
    }
    fetchActivity();
  }, [client.id]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <StatGrid columns={4}>
        <StatCard
          label={t('stats.totalProjects')}
          value={stats.totalProjects.toString()}
          icon={Briefcase}
        />
        <StatCard
          label={t('stats.totalInvoiced')}
          value={formatCurrency(stats.totalInvoiced)}
          icon={Receipt}
        />
        <StatCard
          label={t('stats.totalPaid')}
          value={formatCurrency(stats.totalPaid)}
          icon={CreditCard}
        />
        <StatCard
          label={t('stats.unpaidBalance')}
          value={formatCurrency(unpaidBalance)}
          icon={AlertCircle}
          tone={unpaidBalance > 0 ? 'critical' : undefined}
        />
      </StatGrid>

      {/* Two-column layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Client Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={Mail}
                label="Email"
                value={client.email}
                href={`mailto:${client.email}`}
              />
              {client.phone && (
                <>
                  <Separator />
                  <InfoRow
                    icon={Phone}
                    label={t('phoneNumber')}
                    value={client.phone}
                    href={`tel:${client.phone}`}
                  />
                </>
              )}
              {client.address && (
                <>
                  <Separator />
                  <InfoRow icon={MapPin} label={t('address')} value={client.address} />
                </>
              )}
              {client.vat_number && (
                <>
                  <Separator />
                  <InfoRow icon={FileText} label={t('taxId')} value={client.vat_number} />
                </>
              )}
              <Separator />
              <div className="flex items-start gap-3">
                {client.user_id ? (
                  <Shield className="mt-0.5 h-5 w-5 text-tone-positive" />
                ) : (
                  <ShieldOff className="mt-0.5 h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {client.user_id ? t('portalStatus.active') : t('portalStatus.notInvited')}
                </span>
              </div>
            </CardContent>
          </Card>

          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('clientNotes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('activityTab.title')}</CardTitle>
            <Button variant="link" size="sm" onClick={onViewAllActivity}>
              {t('activityTab.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('activityTab.noActivity')}</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((entry) => (
                  <ActivityEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-muted-foreground hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function ActivityEntry({ entry }: { entry: ActivityLogWithUser }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {entry.action} {entry.entity_type}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
      </span>
    </div>
  );
}
