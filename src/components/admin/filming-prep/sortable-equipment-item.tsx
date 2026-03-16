'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { EquipmentItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { EQUIPMENT_CATALOG, EQUIPMENT_CATEGORY_LABELS } from '@/lib/constants';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface EquipmentItemWithId extends EquipmentItem {
  id: string;
}

interface EquipmentItemRowProps {
  item: EquipmentItemWithId;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<EquipmentItem>) => void;
  disabled: boolean;
}

export function EquipmentItemRow({
  item,
  onToggle,
  onDelete,
  onUpdate,
  disabled,
}: EquipmentItemRowProps) {
  const t = useTranslations('filmingPrep');
  const tc = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQuantity, setEditQuantity] = useState(item.quantity.toString());
  const [editNotes, setEditNotes] = useState(item.notes || '');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (!editName.trim()) {
      toast.error(t('itemNameRequired'));
      return;
    }

    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity < 1) {
      toast.error(t('quantityAtLeastOne'));
      return;
    }

    onUpdate(item.id, {
      name: editName.trim(),
      quantity,
      notes: editNotes.trim(),
    });
    setIsEditing(false);
    toast.success(t('itemUpdated'));
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditQuantity(item.quantity.toString());
    setEditNotes(item.notes || '');
    setIsEditing(false);
  };

  const catalogItem = EQUIPMENT_CATALOG.find((c) => c.name === item.name);

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="border rounded-lg p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t('itemNamePlaceholder')}
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              min="1"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              placeholder={t('qtyPlaceholder')}
            />
          </div>
        </div>
        <Textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder={t('notesOptional')}
          rows={2}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            {tc('save')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            {tc('cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 border rounded-lg p-3 hover:bg-accent/50 transition-colors"
    >
      <button className="cursor-grab active:cursor-grabbing mt-1" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <Checkbox
        checked={item.checked}
        onCheckedChange={() => onToggle(item.id)}
        disabled={disabled}
        className="mt-1"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}
          >
            {item.name}
          </span>
          <Badge variant="secondary">{item.quantity}x</Badge>
          {catalogItem && (
            <Badge variant="outline" className="text-xs">
              {EQUIPMENT_CATEGORY_LABELS[catalogItem.category]}
            </Badge>
          )}
        </div>
        {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={disabled}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} disabled={disabled}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
