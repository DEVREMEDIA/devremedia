'use client';

import { useMemo, useState, useTransition } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CostCategory, CostItemBreakdown, CostItemWithCategory } from '@/types/index';
import { createCostItem, updateCostItem, deleteCostItem } from '@/lib/actions/cost-model';
import {
  createCostItemBreakdown,
  deleteCostItemBreakdown,
  updateCostItemBreakdown,
} from '@/lib/actions/cost-item-breakdown';
import { formatEur as fmtEUR } from '@/lib/format';

interface Props {
  initialItems: CostItemWithCategory[];
  categories: CostCategory[];
  initialBreakdowns: CostItemBreakdown[];
}

type FormState = {
  category_id: string;
  subcategory: string;
  description: string;
  monthly_cost: string;
  comments: string;
  sort_order: number;
  active: boolean;
};

const EMPTY: FormState = {
  category_id: '',
  subcategory: '',
  description: '',
  monthly_cost: '0',
  comments: '',
  sort_order: 0,
  active: true,
};

function parseCost(v: string): number | null {
  const n = Number(v.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export function CostItemsTab({ initialItems, categories, initialBreakdowns }: Props) {
  const t = useTranslations('costModel.item');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CostItemWithCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<CostItemWithCategory | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Group items by category for display
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { category: CostCategory | CostItemWithCategory['category']; items: CostItemWithCategory[] }
    >();
    const catById = new Map(categories.map((c) => [c.id, c]));
    for (const item of initialItems) {
      const cat = catById.get(item.category_id) ?? item.category;
      const key = item.category_id;
      const bucket = map.get(key) ?? { category: cat, items: [] };
      bucket.items.push(item);
      map.set(key, bucket);
    }
    return Array.from(map.values()).sort((a, b) => {
      const ao = a.category?.sort_order ?? 999;
      const bo = b.category?.sort_order ?? 999;
      if (ao !== bo) return ao - bo;
      return (a.category?.name ?? '').localeCompare(b.category?.name ?? '');
    });
  }, [initialItems, categories]);

  const totals = useMemo(() => {
    return grouped.map((g) => ({
      id: g.category?.id ?? '',
      total: g.items
        .filter((i) => i.active)
        .reduce((sum, i) => sum + Number(i.monthly_cost || 0), 0),
    }));
  }, [grouped]);

  // Breakdowns grouped by cost_item_id
  const breakdownsByItem = useMemo(() => {
    const map = new Map<string, CostItemBreakdown[]>();
    for (const b of initialBreakdowns) {
      const arr = map.get(b.cost_item_id) ?? [];
      arr.push(b);
      map.set(b.cost_item_id, arr);
    }
    return map;
  }, [initialBreakdowns]);

  const activeBreakdownCount = (itemId: string) =>
    (breakdownsByItem.get(itemId) ?? []).filter((b) => b.active).length;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openNew(defaultCategoryId?: string) {
    setEditing(null);
    setForm({
      ...EMPTY,
      category_id: defaultCategoryId ?? categories[0]?.id ?? '',
      sort_order: (initialItems.at(-1)?.sort_order ?? 0) + 10,
    });
    setOpen(true);
  }

  function openEdit(i: CostItemWithCategory) {
    setEditing(i);
    setForm({
      category_id: i.category_id,
      subcategory: i.subcategory ?? '',
      description: i.description ?? '',
      monthly_cost: String(i.monthly_cost),
      comments: i.comments ?? '',
      sort_order: i.sort_order,
      active: i.active,
    });
    setOpen(true);
  }

  function save() {
    const parsed = parseCost(form.monthly_cost);
    if (parsed === null) {
      toast.error('Μη έγκυρη τιμή κόστους');
      return;
    }
    if (!form.category_id) {
      toast.error(t('category'));
      return;
    }
    startTransition(async () => {
      const payload = {
        category_id: form.category_id,
        subcategory: form.subcategory.trim() || null,
        description: form.description.trim() || null,
        monthly_cost: parsed,
        comments: form.comments.trim() || null,
        sort_order: form.sort_order,
        active: form.active,
      };
      const res = editing
        ? await updateCostItem(editing.id, payload)
        : await createCostItem(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      setOpen(false);
      router.refresh();
    });
  }

  function doDelete(i: CostItemWithCategory) {
    startTransition(async () => {
      const res = await deleteCostItem(i.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      setConfirmDelete(null);
      router.refresh();
    });
  }

  const editingBreakdownCount = editing ? activeBreakdownCount(editing.id) : 0;
  const parentLocked = editingBreakdownCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openNew()} size="sm" disabled={categories.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          {t('addItem')}
        </Button>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('noItems')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => {
            const catTotal = totals.find((x) => x.id === g.category?.id)?.total ?? 0;
            return (
              <Card key={g.category?.id ?? 'uncat'}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between pb-3 border-b mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{g.category?.name ?? '—'}</h3>
                      <Badge variant="secondary">{g.items.length}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{fmtEUR(catTotal)}</span>
                      <Button size="sm" variant="outline" onClick={() => openNew(g.category?.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t('addItem')}
                      </Button>
                    </div>
                  </div>

                  <div className="divide-y">
                    {g.items.map((i) => {
                      const isOpen = expanded.has(i.id);
                      const rows = breakdownsByItem.get(i.id) ?? [];
                      const hasActive = rows.some((r) => r.active);
                      return (
                        <div key={i.id}>
                          <div className="grid grid-cols-12 gap-2 items-center py-2">
                            <button
                              type="button"
                              onClick={() => toggleExpand(i.id)}
                              aria-label={t('breakdown.toggle')}
                              className="col-span-auto inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground"
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <div className="col-span-3 truncate text-sm font-medium -ml-4">
                              {i.subcategory ?? '—'}
                              {hasActive ? (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-[10px] font-normal border-primary/40 text-primary"
                                >
                                  {rows.filter((r) => r.active).length} {t('breakdown.rowsBadge')}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="col-span-3 truncate text-sm text-muted-foreground">
                              {i.description ?? ''}
                            </div>
                            <div className="col-span-2 text-right tabular-nums font-semibold">
                              {fmtEUR(Number(i.monthly_cost))}
                              {hasActive ? (
                                <span
                                  className="block text-[10px] text-primary font-normal"
                                  title={t('breakdown.autoHint')}
                                >
                                  {t('breakdown.autoLabel')}
                                </span>
                              ) : null}
                            </div>
                            <div className="col-span-1 text-xs">
                              {!i.active && (
                                <Badge variant="secondary" className="text-xs">
                                  off
                                </Badge>
                              )}
                            </div>
                            <div className="col-span-2 flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(i)}
                                aria-label={t('editItem')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDelete(i)}
                                aria-label={t('deleteItem')}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {isOpen ? (
                            <BreakdownEditor
                              costItemId={i.id}
                              rows={rows}
                              parentCost={Number(i.monthly_cost)}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('editItem') : t('addItem')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t('category')}</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="it-sub">{t('subcategory')}</Label>
                <Input
                  id="it-sub"
                  placeholder={t('subcategoryPlaceholder')}
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="it-cost">{t('monthlyCost')}</Label>
                <Input
                  id="it-cost"
                  inputMode="decimal"
                  value={form.monthly_cost}
                  onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })}
                  disabled={parentLocked}
                />
                {parentLocked ? (
                  <p className="text-xs text-primary">{t('breakdown.parentLocked')}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="it-desc">{t('descriptionField')}</Label>
              <Input
                id="it-desc"
                placeholder={t('descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="it-comments">{t('comments')}</Label>
              <Textarea
                id="it-comments"
                rows={2}
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="it-sort">{t('sortOrder')}</Label>
                <Input
                  id="it-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="block">{t('active')}</Label>
                <label className="inline-flex items-center gap-2 pt-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  {t('active')}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={save} disabled={isPending}>
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDelete?.subcategory ?? ''}
            {confirmDelete?.description ? ` — ${confirmDelete.description}` : ''}
          </p>
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

// =====================================================================
// Breakdown editor — inline rows under an expanded cost_item
// =====================================================================

interface BreakdownEditorProps {
  costItemId: string;
  rows: CostItemBreakdown[];
  parentCost: number;
}

function BreakdownEditor({ costItemId, rows, parentCost }: BreakdownEditorProps) {
  const t = useTranslations('costModel.item.breakdown');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [draftName, setDraftName] = useState('');
  const [draftCost, setDraftCost] = useState('0');
  const [adding, setAdding] = useState(false);

  const activeRows = rows.filter((r) => r.active);
  const sum = activeRows.reduce((s, r) => s + Number(r.monthly_cost || 0), 0);
  const delta = Math.abs(sum - parentCost) > 0.005 ? sum - parentCost : 0;

  function add() {
    const cost = parseCost(draftCost);
    if (cost === null) {
      toast.error('Μη έγκυρη τιμή');
      return;
    }
    if (!draftName.trim()) {
      toast.error(t('nameRequired'));
      return;
    }
    startTransition(async () => {
      const res = await createCostItemBreakdown({
        cost_item_id: costItemId,
        name: draftName.trim(),
        monthly_cost: cost,
        sort_order: (rows.at(-1)?.sort_order ?? 0) + 10,
        active: true,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setDraftName('');
      setDraftCost('0');
      setAdding(false);
      router.refresh();
    });
  }

  function saveRow(r: CostItemBreakdown, patch: { name?: string; monthly_cost?: number }) {
    const payload: { name?: string; monthly_cost?: number } = {};
    if (patch.name !== undefined && patch.name !== r.name) payload.name = patch.name;
    if (
      patch.monthly_cost !== undefined &&
      Math.abs(patch.monthly_cost - Number(r.monthly_cost)) > 0.005
    ) {
      payload.monthly_cost = patch.monthly_cost;
    }
    if (Object.keys(payload).length === 0) return;

    startTransition(async () => {
      const res = await updateCostItemBreakdown(r.id, payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(r: CostItemBreakdown) {
    startTransition(async () => {
      const res = await deleteCostItemBreakdown(r.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="ml-6 mb-3 mt-1 border-l-2 border-primary/30 pl-4 py-2 space-y-1.5">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{t('empty')}</p>
      ) : null}

      {rows.map((r) => (
        <BreakdownRow
          key={r.id}
          row={r}
          disabled={isPending}
          onSave={(patch) => saveRow(r, patch)}
          onRemove={() => remove(r)}
        />
      ))}

      {adding ? (
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-6">
            <Input
              size={1}
              placeholder={t('namePlaceholder')}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
              className="h-8"
            />
          </div>
          <div className="col-span-3">
            <Input
              inputMode="decimal"
              value={draftCost}
              onChange={(e) => setDraftCost(e.target.value)}
              className="h-8 text-right tabular-nums"
            />
          </div>
          <div className="col-span-3 flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              {tc('cancel')}
            </Button>
            <Button size="sm" onClick={add} disabled={isPending}>
              {tc('save')}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3 mr-1" />
          {t('addRow')}
        </Button>
      )}

      {activeRows.length > 0 ? (
        <div className="pt-2 mt-1 border-t flex justify-between items-center text-xs">
          <span className="text-muted-foreground">
            {t('totalLabel')} · {activeRows.length} {t('rowsBadge')}
          </span>
          <span className="font-semibold tabular-nums">{fmtEUR(sum)}</span>
        </div>
      ) : null}

      {delta !== 0 ? (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          {t('deltaWarning', { delta: fmtEUR(delta) })}
        </p>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------
// Single editable breakdown row
// -----------------------------------------------------------------

interface BreakdownRowProps {
  row: CostItemBreakdown;
  disabled: boolean;
  onSave: (patch: { name?: string; monthly_cost?: number }) => void;
  onRemove: () => void;
}

function BreakdownRow({ row, disabled, onSave, onRemove }: BreakdownRowProps) {
  const [name, setName] = useState(row.name);
  const [cost, setCost] = useState(String(row.monthly_cost));

  function commitName() {
    if (name.trim() === '') {
      setName(row.name);
      return;
    }
    if (name !== row.name) onSave({ name: name.trim() });
  }

  function commitCost() {
    const parsed = parseCost(cost);
    if (parsed === null) {
      setCost(String(row.monthly_cost));
      return;
    }
    if (Math.abs(parsed - Number(row.monthly_cost)) > 0.005) {
      onSave({ monthly_cost: parsed });
    }
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-6">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          disabled={disabled}
          className="h-8"
        />
      </div>
      <div className="col-span-3">
        <Input
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onBlur={commitCost}
          disabled={disabled}
          className="h-8 text-right tabular-nums"
        />
      </div>
      <div className="col-span-3 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="h-7 w-7"
          aria-label="remove"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
