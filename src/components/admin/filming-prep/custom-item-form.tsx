'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface CustomItemFormProps {
  name: string;
  quantity: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onAdd: () => void;
}

export function CustomItemForm({
  name,
  quantity,
  disabled,
  onNameChange,
  onQuantityChange,
  onAdd,
}: CustomItemFormProps) {
  const t = useTranslations('filmingPrep');
  const tc = useTranslations('common');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onAdd();
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 space-y-2">
        <Label htmlFor="item-name">{t('customItem')}</Label>
        <Input
          id="item-name"
          placeholder={t('addCustomItem')}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="w-24 space-y-2">
        <Label htmlFor="item-quantity">{t('qtyPlaceholder')}</Label>
        <Input
          id="item-quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex items-end">
        <Button onClick={onAdd} disabled={disabled} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          {tc('add')}
        </Button>
      </div>
    </div>
  );
}
