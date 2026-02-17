import React, { createContext, useContext } from 'react';
import {
  flexRender,
  type Table as TanStackTable,
  type Row,
} from '@tanstack/react-table';
import { useSpreadsheetNav } from '@/hooks/useSpreadsheetNav';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Context ───────────────────────────────────────────────

interface GridNavValue {
  onCellKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  onCellMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
}

const GridNavCtx = createContext<GridNavValue>({
  onCellKeyDown: () => {},
  onCellMouseDown: () => {},
});

const GridRowIdxCtx = createContext<number>(0);

export const useGridNav = () => useContext(GridNavCtx);
export const useGridRowIndex = () => useContext(GridRowIdxCtx);

// ── Column meta extension ─────────────────────────────────

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    sticky?: boolean;
    headerClassName?: string;
    cellClassName?: string;
  }
}

// ── DataGrid ──────────────────────────────────────────────

interface DataGridGroup<T> {
  key: string;
  label: string;
  rows: Row<T>[];
}

interface DataGridProps<T> {
  table: TanStackTable<T>;
  footer?: React.ReactNode;
  emptyMessage?: string;
  groups?: DataGridGroup<T>[] | null;
  renderGroupHeader?: (label: string, rows: Row<T>[]) => React.ReactNode;
}

function DataGridRow({ row }: { row: Row<any> }) {
  return (
    <TableRow>
      {row.getVisibleCells().map(cell => {
        const meta = cell.column.columnDef.meta;
        return (
          <TableCell
            key={cell.id}
            className={cn(
              meta?.cellClassName,
              meta?.sticky && 'sticky left-0 z-10 bg-background',
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

export function DataGrid<T>({
  table,
  footer,
  emptyMessage = 'No data yet.',
  groups,
  renderGroupHeader,
}: DataGridProps<T>) {
  const { tableRef, onCellKeyDown, onCellMouseDown } = useSpreadsheetNav();
  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();
  const colCount = table.getVisibleLeafColumns().length;

  return (
    <GridNavCtx.Provider value={{ onCellKeyDown, onCellMouseDown }}>
      <div className="overflow-auto max-h-[calc(100dvh-15.5rem)]" ref={tableRef}>
        <Table className="text-xs w-full">
          <TableHeader className="sticky top-0 z-30 bg-card shadow-[0_1px_0_0_hsl(var(--border))] [&_tr]:border-b-0">
            {headerGroups.map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        meta?.headerClassName,
                        meta?.sticky && 'sticky left-0 z-40 bg-card',
                        canSort && 'cursor-pointer select-none hover:bg-muted/50',
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            sorted === 'asc' ? <ArrowUp className="h-3 w-3" />
                            : sorted === 'desc' ? <ArrowDown className="h-3 w-3" />
                            : <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : groups ? (
              (() => {
                let vi = 0;
                return groups.map(({ key, label, rows: gRows }) => (
                  <React.Fragment key={`g-${key}`}>
                    {renderGroupHeader?.(label, gRows)}
                    {gRows.map(row => (
                      <GridRowIdxCtx.Provider key={row.id} value={vi++}>
                        <DataGridRow row={row} />
                      </GridRowIdxCtx.Provider>
                    ))}
                  </React.Fragment>
                ));
              })()
            ) : (
              rows.map((row, i) => (
                <GridRowIdxCtx.Provider key={row.id} value={i}>
                  <DataGridRow row={row} />
                </GridRowIdxCtx.Provider>
              ))
            )}
          </TableBody>
          {footer && (
            <TableFooter className="sticky bottom-0 z-30">
              {footer}
            </TableFooter>
          )}
        </Table>
      </div>
    </GridNavCtx.Provider>
  );
}
