'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { CostCategory } from '@/types/index';
import {
  createCostCategory,
  updateCostCategory,
  deleteCostCategory,
} from '@/lib/actions/cost-model';

interface Props {
  initialCategories: CostCategory[];
}

export function CostCategoriesTab({ initialCategories }: Props) {
  const t = useTranslations('costModel.category');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CostCategory | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<CostCategory | null>(null);

  const categories = initialCategories;

  function openNew() {
    setEditing(null);
    setName('');
    setSortOrder((categories.at(-1)?.sort_order ?? 0) + 10);
    setActive(true);
    setOpen(true);
  }

  function openEdit(c: CostCategory) {
    setEditing(c);
    setName(c.name);
    setSortOrder(c.sort_order);
    setActive(c.active);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const payload = { name, sort_order: sortOrder, active };
      const res = editing
        ? await updateCostCategory(editing.id, payload)
        : await createCostCategory(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(tc('success'));
      setOpen(false);
      router.refresh();
    });
  }

  function doDelete(c: CostCategory) {
    startTransition(async () => {
      const res = await deleteCostCategory(c.id);
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
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t('addCategory')}
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t('noCategories')}</p>
        ) : (
          <div className="divide-y">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs tabular-nums text-muted-foreground w-10">
                    #{c.sort_order}
                  </span>
                  <span className="font-medium truncate">{c.name}</span>
                  {!c.active && (
                    <Badge variant="secondary" className="text-xs">
                      inactive
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(c)}
                    aria-label={t('editCategory')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete(c)}
                    aria-label={t('deleteCategory')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('editCategory') : t('addCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t('name')}</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-sort">Sort</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="block">Status</Label>
                <label className="inline-flex items-center gap-2 pt-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Active
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={save} disabled={isPending || !name.trim()}>
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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
    </Card>
  );
}
