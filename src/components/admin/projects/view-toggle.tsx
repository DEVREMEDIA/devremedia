'use client';

import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ViewToggleProps {
  view: 'kanban' | 'list';
  onViewChange: (view: 'kanban' | 'list') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations('projects');

  // Δύο κουμπιά μόνο με εικονίδιο δεν έλεγαν το όνομά τους σε κανέναν — ούτε σε
  // αναγνώστη οθόνης, ούτε σε έλεγχο που ψάχνει ρόλο και όνομα. Οι ετικέτες
  // υπήρχαν ήδη μεταφρασμένες, απλώς δεν τις έβλεπε το κουμπί.
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1">
      <Button
        variant={view === 'kanban' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('kanban')}
        className="h-8"
        aria-label={t('kanbanView')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className="h-8"
        aria-label={t('listView')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
