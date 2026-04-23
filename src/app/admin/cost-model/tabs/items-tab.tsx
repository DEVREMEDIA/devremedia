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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CostCategory, CostItemWithCategory } from '@/types/index';
import { createCostItem, updateCostItem, deleteCostItem } from '@/lib/actions/cost-model';

interface Props {
  initialItems: CostItemWithCategory[];
  categories: CostCategory[];
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

function fmtEUR(n: number) {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n);
}

export function CostItemsTab({ initialItems, categories }: Props) {
  const t = useTranslations('costModel.item');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CostItemWithCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<CostItemWithCategory | null>(null);

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
    // sort buckets by category sort_order then name
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
    const parsed = Number(form.monthly_cost.replace(',', '.'));
    if (Number.isNaN(parsed)) {
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
            const catTotal = totals.find((t) => t.id === g.category?.id)?.total ?? 0;
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
                    {g.items.map((i) => (
                      <div key={i.id} className="grid grid-cols-12 gap-2 items-center py-2">
                        <div className="col-span-3 truncate text-sm font-medium">
                          {i.subcategory ?? '—'}
                        </div>
                        <div className="col-span-4 truncate text-sm text-muted-foreground">
                          {i.description ?? ''}
                        </div>
                        <div className="col-span-2 text-right tabular-nums font-semibold">
                          {fmtEUR(Number(i.monthly_cost))}
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
                    ))}
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
                />
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
