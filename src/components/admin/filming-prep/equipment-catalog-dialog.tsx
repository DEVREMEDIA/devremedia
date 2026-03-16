'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  type CatalogEquipmentItem,
  type EquipmentCategory,
} from '@/lib/constants';

interface EquipmentCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: Set<string>;
  onToggleItem: (name: string) => void;
  onApply: () => void;
}

const catalogByCategory = EQUIPMENT_CATEGORIES.reduce(
  (acc, category) => {
    acc[category] = EQUIPMENT_CATALOG.filter((item) => item.category === category);
    return acc;
  },
  {} as Record<EquipmentCategory, CatalogEquipmentItem[]>,
);

export function EquipmentCatalogDialog({
  open,
  onOpenChange,
  selectedItems,
  onToggleItem,
  onApply,
}: EquipmentCatalogDialogProps) {
  const t = useTranslations('filmingPrep');
  const tc = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('equipmentCatalogTitle')}</DialogTitle>
          <DialogDescription>{t('selectEquipmentForShoot')}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {EQUIPMENT_CATEGORIES.map((category) => {
              const categoryItems = catalogByCategory[category];
              if (categoryItems.length === 0) return null;
              return (
                <div key={category}>
                  <h4 className="font-semibold text-sm mb-2">
                    {EQUIPMENT_CATEGORY_LABELS[category]}
                  </h4>
                  <div className="space-y-2">
                    {categoryItems.map((catItem) => (
                      <label
                        key={catItem.name}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedItems.has(catItem.name)}
                          onCheckedChange={() => onToggleItem(catItem.name)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{catItem.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {catItem.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Separator className="mt-3" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={onApply}>{t('applySelection')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
