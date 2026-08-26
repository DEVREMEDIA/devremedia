'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeading } from '@/components/shared/page-heading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Eye, Send, CheckCircle2, XCircle, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type {
  ProposalPackageWithPrice,
  ProposalStatus,
  ProposalWithRelations,
} from '@/types/index';
import { deleteProposal, markProposalSent, setProposalResponse } from '@/lib/actions/proposals';
import { formatEur as fmtEUR } from '@/lib/format';

interface Props {
  proposal: ProposalWithRelations;
  packages: ProposalPackageWithPrice[];
}

const statusStyles: Record<ProposalStatus, string> = {
  draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  sent: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  expired: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export function ProposalDetail({ proposal, packages }: Props) {
  const t = useTranslations('proposals');
  const ta = useTranslations('proposals.actions');
  const ts = useTranslations('proposals.status');
  const tForm = useTranslations('proposals.form');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Build the resolved package list (price with overrides)
  const resolved = proposal.selected_packages
    .map((s) => {
      const pkg = packages.find((p) => p.id === s.package_id);
      if (!pkg) return null;
      const price = s.price_override != null ? Number(s.price_override) : pkg.computed_price;
      return { ...pkg, effective_price: price };
    })
    .filter((x): x is ProposalPackageWithPrice & { effective_price: number } => x !== null);

  const total = resolved.reduce((s, p) => s + p.effective_price, 0);

  const pdfUrl = `/api/proposals/${proposal.id}/pdf`;

  const linked =
    proposal.client?.company_name ||
    proposal.client?.contact_name ||
    proposal.lead?.company_name ||
    proposal.lead?.contact_name ||
    null;

  function handleSend() {
    startTransition(async () => {
      const res = await markProposalSent(proposal.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      router.refresh();
    });
  }

  function handleResponse(outcome: 'accepted' | 'rejected') {
    startTransition(async () => {
      const res = await setProposalResponse(proposal.id, outcome);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteProposal(proposal.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      router.push('/admin/proposals');
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/proposals"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('title')}
        </Link>
        <PageHeading title={proposal.client_name}>
          <Badge variant="outline" className={`${statusStyles[proposal.status]}`}>
            {ts(proposal.status)}
          </Badge>
        </PageHeading>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* LEFT */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tForm('content')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {linked && (
                <Field
                  label={
                    proposal.client_id
                      ? t('form.linkClient')
                      : proposal.lead_id
                        ? t('form.linkLead')
                        : ''
                  }
                  value={linked}
                />
              )}
              {proposal.competitive_advantage && (
                <Field
                  label={t('form.competitiveAdvantage')}
                  value={proposal.competitive_advantage}
                />
              )}
              {proposal.client_need && (
                <Field label={t('form.clientNeed')} value={proposal.client_need} multiline />
              )}
              {proposal.notes && <Field label={t('form.notes')} value={proposal.notes} multiline />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('form.packages')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resolved.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">—</p>
              ) : (
                <div className="divide-y">
                  {resolved.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.shooting_days != null ? `${p.shooting_days}d · ` : ''}
                          {(p.shooting_hours + p.editing_hours).toFixed(1)}h
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">
                          {fmtEUR(p.effective_price)}
                        </div>
                        {p.effective_price !== p.computed_price && (
                          <div className="text-xs text-muted-foreground line-through">
                            {fmtEUR(p.computed_price)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-semibold">{tc('total')}</span>
                <span className="text-xl font-bold text-primary tabular-nums">{fmtEUR(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — actions */}
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full">
                <a href={`${pdfUrl}?inline=true`} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  {ta('previewPdf')}
                </a>
              </Button>
              <Button asChild className="w-full">
                <a href={pdfUrl} download>
                  <Download className="h-4 w-4 mr-2" />
                  {ta('downloadPdf')}
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tc('status')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {proposal.status === 'draft' && (
                <Button className="w-full" onClick={handleSend} disabled={isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {ta('markSent')}
                </Button>
              )}
              {(proposal.status === 'sent' || proposal.status === 'draft') && (
                <>
                  <Button
                    variant="outline"
                    className="w-full text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                    onClick={() => handleResponse('accepted')}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {ta('markAccepted')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-400 border-red-500/40 hover:bg-red-500/10"
                    onClick={() => handleResponse('rejected')}
                    disabled={isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {ta('markRejected')}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {ta('delete')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-xs text-muted-foreground space-y-1">
              <div>Created: {new Date(proposal.created_at).toLocaleString('el-GR')}</div>
              {proposal.sent_at && (
                <div>Sent: {new Date(proposal.sent_at).toLocaleString('el-GR')}</div>
              )}
              {proposal.responded_at && (
                <div>Responded: {new Date(proposal.responded_at).toLocaleString('el-GR')}</div>
              )}
              {proposal.valid_until && (
                <div>Valid until: {new Date(proposal.valid_until).toLocaleDateString('el-GR')}</div>
              )}
              <div>Locale: {proposal.locale.toUpperCase()}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ta('deleteConfirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{proposal.client_name}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              {tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={multiline ? 'whitespace-pre-wrap' : ''}>{value}</div>
    </div>
  );
}
