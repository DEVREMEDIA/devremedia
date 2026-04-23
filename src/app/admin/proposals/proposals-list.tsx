'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText } from 'lucide-react';
import type { ProposalStatus, ProposalWithRelations } from '@/types/index';

interface Props {
  proposals: ProposalWithRelations[];
}

const statusStyles: Record<ProposalStatus, string> = {
  draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  sent: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  expired: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export function ProposalsList({ proposals }: Props) {
  const t = useTranslations('proposals');
  const ts = useTranslations('proposals.status');
  const tp = useTranslations('proposalPackages');
  const tc = useTranslations('common');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        p.client_name.toLowerCase().includes(q) ||
        (p.client?.company_name?.toLowerCase().includes(q) ?? false) ||
        (p.lead?.company_name?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')}>
        <Link href="/admin/proposal-packages">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            {tp('title')}
          </Button>
        </Link>
        <Link href="/admin/proposals/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t('list.addProposal')}
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tc('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                <SelectItem value="draft">{ts('draft')}</SelectItem>
                <SelectItem value="sent">{ts('sent')}</SelectItem>
                <SelectItem value="accepted">{ts('accepted')}</SelectItem>
                <SelectItem value="rejected">{ts('rejected')}</SelectItem>
                <SelectItem value="expired">{ts('expired')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t('list.empty')}</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p) => {
                const linked =
                  p.client?.company_name ||
                  p.client?.contact_name ||
                  p.lead?.company_name ||
                  p.lead?.contact_name ||
                  null;
                const created = new Date(p.created_at).toLocaleDateString('el-GR');
                const pkgCount = p.selected_packages.length;
                return (
                  <Link
                    key={p.id}
                    href={`/admin/proposals/${p.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-muted/30 px-3 rounded transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{p.client_name}</span>
                        <Badge variant="outline" className={`text-xs ${statusStyles[p.status]}`}>
                          {ts(p.status)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {linked ? `${linked} · ` : ''}
                        {pkgCount} {pkgCount === 1 ? 'package' : 'packages'} · {created}
                      </div>
                    </div>
                    {p.valid_until && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ⏰ {new Date(p.valid_until).toLocaleDateString('el-GR')}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
