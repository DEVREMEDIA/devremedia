'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import type { LineItem } from '@/lib/schemas/invoice';

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  const t = useTranslations('invoices');
  const keyCounter = React.useRef(0);
  const itemKeys = React.useRef<string[]>([]);

  // Sync keys with items length
  while (itemKeys.current.length < items.length) {
    itemKeys.current.push(`item-${keyCounter.current++}`);
  }
  if (itemKeys.current.length > items.length) {
    itemKeys.current = itemKeys.current.slice(0, items.length);
  }

  const handleAddItem = () => {
    itemKeys.current.push(`item-${keyCounter.current++}`);
    onChange([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    itemKeys.current = itemKeys.current.filter((_, i) => i !== index);
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">{t('itemDescription')}</TableHead>
              <TableHead className="w-[15%]">{t('quantity')}</TableHead>
              <TableHead className="w-[20%]">{t('unitPrice')}</TableHead>
              <TableHead className="w-[20%] text-right">{t('lineTotal')}</TableHead>
              <TableHead className="w-[5%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const lineTotal = item.quantity * item.unit_price;
              return (
                <TableRow key={itemKeys.current[index]}>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                      placeholder={t('itemDescriptionPlaceholder')}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(lineTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button type="button" variant="outline" onClick={handleAddItem}>
        <Plus className="mr-2 h-4 w-4" />
        {t('addLineItem')}
      </Button>
    </div>
  );
}
