'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormDialog } from '@/components/shared/form-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProposalPackageWithPrice } from '@/types/index';
import {
  createProposalPackage,
  updateProposalPackage,
  deleteProposalPackage,
} from '@/lib/actions/proposal-packages';
import { formatEur as fmtEUR } from '@/lib/format';

interface Props {
  packages: ProposalPackageWithPrice[];
  defaultMargin: number;
}

type FormState = {
  name: string;
  video_count: string;
  shooting_days: string;
  allowance_count: string;
  allowance_unit: 'days' | 'slots' | 'hours';
  shooting_hours: string;
  editing_hours: string;
  price_mode: 'manual' | 'auto';
  manual_price: string;
  description: string;
  inclusions: string;
  sort_order: number;
  active: boolean;
};

const EMPTY: FormState = {
  name: '',
  video_count: '',
  shooting_days: '',
  allowance_count: '',
  allowance_unit: 'days',
  shooting_hours: '0',
  editing_hours: '0',
  price_mode: 'manual',
  manual_price: '',
  description: '',
  inclusions: '',
  sort_order: 0,
  active: true,
};

function numeric(v: string, fallback: number | null = null): number | null {
  if (v.trim() === '') return fallback;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export function PackagesContent({ packages }: Props) {
  const t = useTranslations('proposalPackages');
  const tf = useTranslations('proposalPackages.form');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalPackageWithPrice | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<ProposalPackageWithPrice | null>(null);

  function openNew() {
    setEditing(null);
    setForm({
      ...EMPTY,
      sort_order: (packages.at(-1)?.sort_order ?? 0) + 10,
    });
    setOpen(true);
  }

  function openEdit(p: ProposalPackageWithPrice) {
    setEditing(p);
    setForm({
      name: p.name,
      video_count: p.video_count != null ? String(p.video_count) : '',
      shooting_days: p.shooting_days != null ? String(p.shooting_days) : '',
      allowance_count: p.allowance_count != null ? String(p.allowance_count) : '',
      allowance_unit: p.allowance_unit,
      shooting_hours: String(p.shooting_hours),
      editing_hours: String(p.editing_hours),
      price_mode: p.price_mode,
      manual_price: p.manual_price != null ? String(p.manual_price) : '',
      description: p.description ?? '',
      inclusions: p.inclusions.join('\n'),
      sort_order: p.sort_order,
      active: p.active,
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        video_count: numeric(form.video_count),
        shooting_days: numeric(form.shooting_days),
        allowance_count: numeric(form.allowance_count),
        allowance_unit: form.allowance_unit,
        shooting_hours: numeric(form.shooting_hours, 0) ?? 0,
        editing_hours: numeric(form.editing_hours, 0) ?? 0,
        price_mode: form.price_mode,
        manual_price: form.price_mode === 'manual' ? numeric(form.manual_price) : null,
        description: form.description.trim() || null,
        inclusions: form.inclusions
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        sort_order: form.sort_order,
        active: form.active,
      };
      const res = editing
        ? await updateProposalPackage(editing.id, payload)
        : await createProposalPackage(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      setOpen(false);
      router.refresh();
    });
  }

  function doDelete(p: ProposalPackageWithPrice) {
    startTransition(async () => {
      const res = await deleteProposalPackage(p.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t('addPackage')}
        </Button>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className={p.active ? '' : 'opacity-60'}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">{p.name}</h3>
                    {!p.active && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label={tc('edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete(p)}
                      aria-label={tc('delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="text-2xl font-bold text-primary tabular-nums">
                  {fmtEUR(p.computed_price)}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p.video_count != null && (
                    <span className="bg-muted px-2 py-0.5 rounded">{p.video_count} videos</span>
                  )}
                  {p.shooting_days != null && (
                    <span className="bg-muted px-2 py-0.5 rounded">
                      {p.shooting_days}d shooting
                    </span>
                  )}
                  {p.allowance_count != null && (
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {p.allowance_count}{' '}
                      {tf(
                        `allowanceUnit${p.allowance_unit === 'slots' ? 'Slots' : p.allowance_unit === 'hours' ? 'Hours' : 'Days'}`,
                      )}
                      /mo
                    </span>
                  )}
                  <span className="bg-muted px-2 py-0.5 rounded">
                    {(p.shooting_hours + p.editing_hours).toFixed(1)}h
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      p.price_mode === 'auto' ? 'bg-primary/10 text-primary' : 'bg-muted'
                    }`}
                  >
                    {p.price_mode}
                  </span>
                </div>

                {p.inclusions.length > 0 && (
                  <ul className="space-y-1 border-t pt-3 text-sm">
                    {p.inclusions.map((inc, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        • {inc}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
                  <span>
                    {tf('computedCost')}: {fmtEUR(p.computed_cost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/edit dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('editPackage') : t('addPackage')}
        onSubmit={save}
        submitLabel={tc('save')}
        cancelLabel={tc('cancel')}
        submitting={isPending}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-2">
          <Label>{tf('name')}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-2">
            <Label>{tf('videoCount')}</Label>
            <Input
              inputMode="numeric"
              value={form.video_count}
              onChange={(e) => setForm({ ...form, video_count: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tf('shootingDays')}</Label>
            <Input
              inputMode="numeric"
              value={form.shooting_days}
              onChange={(e) => setForm({ ...form, shooting_days: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tf('shootingHours')}</Label>
            <Input
              inputMode="decimal"
              value={form.shooting_hours}
              onChange={(e) => setForm({ ...form, shooting_hours: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tf('editingHours')}</Label>
            <Input
              inputMode="decimal"
              value={form.editing_hours}
              onChange={(e) => setForm({ ...form, editing_hours: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{tf('allowanceCount')}</Label>
            <Input
              inputMode="numeric"
              value={form.allowance_count}
              onChange={(e) => setForm({ ...form, allowance_count: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tf('allowanceUnit')}</Label>
            <Select
              value={form.allowance_unit}
              onValueChange={(v: 'days' | 'slots' | 'hours') =>
                setForm({ ...form, allowance_unit: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">{tf('allowanceUnitDays')}</SelectItem>
                <SelectItem value="slots">{tf('allowanceUnitSlots')}</SelectItem>
                <SelectItem value="hours">{tf('allowanceUnitHours')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{tf('priceMode')}</Label>
            <Select
              value={form.price_mode}
              onValueChange={(v: 'manual' | 'auto') => setForm({ ...form, price_mode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{tf('priceModeManual')}</SelectItem>
                <SelectItem value="auto">{tf('priceModeAuto')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tf('manualPrice')}</Label>
            <Input
              inputMode="decimal"
              disabled={form.price_mode === 'auto'}
              value={form.manual_price}
              onChange={(e) => setForm({ ...form, manual_price: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{tf('description')}</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>{tf('inclusions')}</Label>
          <Textarea
            rows={4}
            placeholder={tf('inclusionsPlaceholder')}
            value={form.inclusions}
            onChange={(e) => setForm({ ...form, inclusions: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{tf('sortOrder')}</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label className="block">{tf('active')}</Label>
            <label className="inline-flex items-center gap-2 pt-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4"
              />
              {tf('active')}
            </label>
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmDelete?.name}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => confirmDelete && doDelete(confirmDelete)}
            >
              {tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
