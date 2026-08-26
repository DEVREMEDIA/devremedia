'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  RowData,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// Μια στήλη ξέρει μόνη της πώς στοιχίζεται. Χωρίς αυτό, κάθε σελίδα ξαναέγραφε
// το `text-right tabular-nums` στο κάθε κελί της — και μισές φορές το ξεχνούσε.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right' | 'center';
    numeric?: boolean;
  }
}

function cellAlignment(
  meta: { align?: 'left' | 'right' | 'center'; numeric?: boolean } | undefined,
) {
  const align = meta?.align ?? (meta?.numeric ? 'right' : undefined);
  return cn(
    align === 'right' && 'text-right',
    align === 'center' && 'text-center',
    meta?.numeric && 'font-mono tabular-nums',
  );
}

// Δύο πυκνότητες, όχι μια ρύθμιση ανά σελίδα. Η άνετη είναι η σημερινή
// συμπεριφορά και μένει προεπιλογή, ώστε κανένας υπάρχων πίνακας να μη μετακινηθεί.
const DENSITY_CELL = {
  comfortable: '',
  compact: 'py-1.5',
} as const;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Αναζήτηση σε ΜΙΑ στήλη. Αμοιβαία αποκλειόμενο με το `globalSearch`. */
  searchKey?: string;
  searchPlaceholder?: string;
  /** Αναζήτηση σε ΟΛΕΣ τις στήλες μαζί. */
  globalSearch?: boolean;
  /** Column IDs to hide on screens smaller than md (768px) */
  mobileHiddenColumns?: string[];
  /** Προσθέτει στήλη επιλογής με checkbox. */
  selectable?: boolean;
  /** Ό,τι κάθεται πάνω από τον πίνακα: φίλτρα, μαζικές ενέργειες. */
  toolbar?: (ctx: { selected: TData[]; clearSelection: () => void }) => ReactNode;
  /** Τι δείχνει ο πίνακας χωρίς γραμμές. Χωρίς αυτό, το σημερινό «no results». */
  emptyState?: ReactNode;
  density?: 'comfortable' | 'compact';
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  globalSearch = false,
  mobileHiddenColumns = [],
  selectable = false,
  toolbar,
  emptyState,
  density = 'comfortable',
}: DataTableProps<TData, TValue>) {
  const t = useTranslations('common');
  const isMobile = useIsMobile();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilterValue, setGlobalFilterValue] = React.useState('');

  // Set column visibility based on screen size
  React.useEffect(() => {
    if (mobileHiddenColumns.length === 0) return;
    const visibility: VisibilityState = {};
    for (const colId of mobileHiddenColumns) {
      visibility[colId] = !isMobile;
    }
    setColumnVisibility(visibility);
  }, [isMobile, mobileHiddenColumns]);

  const selectionColumn: ColumnDef<TData, TValue> = React.useMemo(
    () => ({
      id: '__select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('selectAll')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('selectRow')}
        />
      ),
      enableSorting: false,
      size: 40,
    }),
    [t],
  );

  const effectiveColumns = React.useMemo(
    () => (selectable ? [selectionColumn, ...columns] : columns),
    [selectable, selectionColumn, columns],
  );

  const table = useReactTable({
    data,
    columns: effectiveColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilterValue,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: globalFilterValue,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
  const clearSelection = () => setRowSelection({});

  return (
    <div className="space-y-4">
      {(searchKey || globalSearch) && (
        <div className="flex items-center justify-between">
          <Input
            aria-label={searchPlaceholder ?? t('search')}
            placeholder={searchPlaceholder ?? t('search')}
            value={
              globalSearch
                ? globalFilterValue
                : ((table.getColumn(searchKey!)?.getFilterValue() as string) ?? '')
            }
            onChange={(event) =>
              globalSearch
                ? setGlobalFilterValue(event.target.value)
                : table.getColumn(searchKey!)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
      )}

      {toolbar ? toolbar({ selected: selectedRows, clearSelection }) : null}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cellAlignment(header.column.columnDef.meta)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cellAlignment(cell.column.columnDef.meta),
                        DENSITY_CELL[density],
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={effectiveColumns.length} className="h-24 text-center">
                  {emptyState ?? t('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}

interface DataTablePaginationProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
}

function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const t = useTranslations('table');

  // Ένας πίνακας που χωράει ολόκληρος σε μία σελίδα δεν χρειάζεται χειριστήρια
  // σελιδοποίησης. Χωρίς αυτό, κάθε στατικός πίνακας δέκα γραμμών κουβαλούσε ένα
  // «Σελίδα 1 από 1» και έναν επιλογέα μεγέθους που δεν έκανε τίποτα.
  if (table.getPageCount() <= 1 && table.getFilteredSelectedRowModel().rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
      <div className="text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span>
            {t('rowsSelected', {
              count: table.getFilteredSelectedRowModel().rows.length,
              total: table.getFilteredRowModel().rows.length,
            })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 sm:gap-6 lg:gap-8">
        <div className="hidden sm:flex items-center space-x-2">
          <p className="text-sm font-medium whitespace-nowrap">{t('rowsPerPage')}</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]" aria-label={t('rowsPerPage')}>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm font-medium whitespace-nowrap">
          {t('pageOf', {
            current: table.getState().pagination.pageIndex + 1,
            total: table.getPageCount(),
          })}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{t('firstPage')}</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{t('previousPage')}</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{t('nextPage')}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{t('lastPage')}</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
