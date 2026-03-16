'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getEquipmentList, updateEquipmentList } from '@/lib/actions/filming-prep';
import type { EquipmentItem } from '@/types';
import { toast } from 'sonner';
import { EQUIPMENT_CATALOG } from '@/lib/constants';
import { type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { EquipmentItemWithId } from './sortable-equipment-item';

export type { DragEndEvent };

interface UseEquipmentListReturn {
  items: EquipmentItemWithId[];
  loading: boolean;
  saving: boolean;
  catalogOpen: boolean;
  selectedCatalogItems: Set<string>;
  customItemName: string;
  customItemQuantity: string;
  checkedCount: number;
  totalCount: number;
  setCustomItemName: (v: string) => void;
  setCustomItemQuantity: (v: string) => void;
  setCatalogOpen: (v: boolean) => void;
  openCatalog: () => void;
  toggleCatalogItem: (name: string) => void;
  addFromCatalog: () => Promise<void>;
  addCustomItem: () => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleCheck: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<EquipmentItem>) => Promise<void>;
  checkAll: () => Promise<void>;
  uncheckAll: () => Promise<void>;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

export function useEquipmentList(projectId: string): UseEquipmentListReturn {
  const t = useTranslations('filmingPrep');
  const [items, setItems] = useState<EquipmentItemWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<Set<string>>(new Set());
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('1');

  const loadEquipmentList = useCallback(async () => {
    setLoading(true);
    const result = await getEquipmentList(projectId);
    if (result.error) {
      toast.error(t('failedToLoadEquipment'));
      setLoading(false);
      return;
    }

    const itemsWithIds: EquipmentItemWithId[] = (result.data?.items ?? []).map((item) => ({
      ...item,
      checked: item.checked ?? false,
      id: crypto.randomUUID(),
    }));
    setItems(itemsWithIds);
    setLoading(false);
  }, [projectId, t]);

  useEffect(() => {
    loadEquipmentList();
  }, [loadEquipmentList]);

  const saveEquipmentList = async (updatedItems: EquipmentItemWithId[]) => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const itemsWithoutIds = updatedItems.map(({ id, ...item }) => item);
    const result = await updateEquipmentList(projectId, { items: itemsWithoutIds });
    setSaving(false);

    if (result.error) {
      toast.error(t('failedToSaveEquipment'));
      return false;
    }
    return true;
  };

  const openCatalog = () => {
    const existingNames = new Set(items.map((i) => i.name));
    const preSelected = new Set<string>();
    EQUIPMENT_CATALOG.forEach((catItem) => {
      if (existingNames.has(catItem.name)) preSelected.add(catItem.name);
    });
    setSelectedCatalogItems(preSelected);
    setCatalogOpen(true);
  };

  const toggleCatalogItem = (name: string) => {
    setSelectedCatalogItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const addFromCatalog = async () => {
    const existingNames = new Set(items.map((i) => i.name));
    const toAdd: EquipmentItemWithId[] = [];
    const toRemove = new Set<string>();

    EQUIPMENT_CATALOG.forEach((catItem) => {
      if (existingNames.has(catItem.name) && !selectedCatalogItems.has(catItem.name)) {
        toRemove.add(catItem.name);
      }
    });

    selectedCatalogItems.forEach((name) => {
      if (!existingNames.has(name)) {
        const catItem = EQUIPMENT_CATALOG.find((c) => c.name === name);
        if (catItem) {
          toAdd.push({
            id: crypto.randomUUID(),
            name: catItem.name,
            quantity: 1,
            checked: false,
            notes: catItem.description,
          });
        }
      }
    });

    const updatedItems = [...items.filter((i) => !toRemove.has(i.name)), ...toAdd];
    setItems(updatedItems);
    setCatalogOpen(false);

    const success = await saveEquipmentList(updatedItems);
    if (!success) return;

    const added = toAdd.length;
    const removed = toRemove.size;
    if (added > 0 && removed > 0) toast.success(t('itemsAddedAndRemoved', { added, removed }));
    else if (added > 0) toast.success(t('itemsAdded', { count: added }));
    else if (removed > 0) toast.success(t('itemsRemoved', { count: removed }));
  };

  const addCustomItem = async () => {
    if (!customItemName.trim()) {
      toast.error(t('enterItemName'));
      return;
    }

    const quantity = parseInt(customItemQuantity);
    if (isNaN(quantity) || quantity < 1) {
      toast.error(t('quantityAtLeastOne'));
      return;
    }

    const newItem: EquipmentItemWithId = {
      id: crypto.randomUUID(),
      name: customItemName.trim(),
      quantity,
      checked: false,
      notes: '',
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setCustomItemName('');
    setCustomItemQuantity('1');

    const success = await saveEquipmentList(updatedItems);
    if (success) toast.success(t('itemAdded'));
  };

  const deleteItem = async (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);
    const success = await saveEquipmentList(updatedItems);
    if (success) toast.success(t('itemRemoved'));
  };

  const toggleCheck = async (id: string) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    );
    setItems(updatedItems);
    await saveEquipmentList(updatedItems);
  };

  const updateItem = async (id: string, updates: Partial<EquipmentItem>) => {
    const updatedItems = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setItems(updatedItems);
    await saveEquipmentList(updatedItems);
  };

  const checkAll = async () => {
    const updatedItems = items.map((item) => ({ ...item, checked: true }));
    setItems(updatedItems);
    const success = await saveEquipmentList(updatedItems);
    if (success) toast.success(t('allItemsChecked'));
  };

  const uncheckAll = async () => {
    const updatedItems = items.map((item) => ({ ...item, checked: false }));
    setItems(updatedItems);
    const success = await saveEquipmentList(updatedItems);
    if (success) toast.success(t('allItemsUnchecked'));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const updatedItems = arrayMove(items, oldIndex, newIndex);
      setItems(updatedItems);
      await saveEquipmentList(updatedItems);
    }
  };

  return {
    items,
    loading,
    saving,
    catalogOpen,
    selectedCatalogItems,
    customItemName,
    customItemQuantity,
    checkedCount: items.filter((item) => item.checked).length,
    totalCount: items.length,
    setCustomItemName,
    setCustomItemQuantity,
    setCatalogOpen,
    openCatalog,
    toggleCatalogItem,
    addFromCatalog,
    addCustomItem,
    deleteItem,
    toggleCheck,
    updateItem,
    checkAll,
    uncheckAll,
    handleDragEnd,
  };
}
