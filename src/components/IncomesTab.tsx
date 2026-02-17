import { useState, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
  type CellContext,
} from '@tanstack/react-table';
import { DataGrid, useGridNav, useGridRowIndex } from '@/components/ui/data-grid';
import { GridEditableCell, GridCurrencyCell } from '@/components/ui/data-grid-cells';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TableRow, TableCell } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { toMonthly, frequencyLabels, needsParam } from '@/lib/frequency';
import type { FrequencyType } from '@/types/fairshare';
import type { Income } from '@/hooks/useIncomes';

// ── Types ─────────────────────────────────────────────────

interface IncomesTabProps {
  incomes: Income[];
  partnerX: string;
  partnerY: string;
  onAdd: (income: Omit<Income, 'id' | 'household_id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Income, 'id' | 'household_id'>>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const FREQ_OPTIONS: FrequencyType[] = [
  'weekly', 'twice_monthly', 'monthly', 'annual',
  'every_n_days', 'every_n_weeks', 'every_n_months',
  'k_times_weekly', 'k_times_monthly', 'k_times_annually',
];

const columnHelper = createColumnHelper<Income>();

// ── Cell Components ───────────────────────────────────────

function PartnerCell({ row, column, table }: CellContext<Income, string>) {
  const meta = table.options.meta as any;
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();
  return (
    <Select value={row.original.partner_label} onValueChange={v => meta.handleUpdate(row.original.id, 'partner_label', v)}>
      <SelectTrigger
        className="h-7 border-transparent bg-transparent hover:border-border text-xs underline decoration-dashed decoration-muted-foreground/40 underline-offset-2"
        data-row={rowIndex} data-col={column.getIndex()} onKeyDown={onCellKeyDown} onMouseDown={onCellMouseDown}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="X">{meta.partnerX}</SelectItem>
        <SelectItem value="Y">{meta.partnerY}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function FrequencyCell({ row, column, table }: CellContext<Income, string>) {
  const meta = table.options.meta as any;
  const inc = row.original;
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();
  return (
    <div className="flex items-center gap-1">
      <Select value={inc.frequency_type} onValueChange={v => meta.handleUpdate(inc.id, 'frequency_type', v)}>
        <SelectTrigger
          className="h-7 min-w-0 border-transparent bg-transparent hover:border-border text-xs underline decoration-dashed decoration-muted-foreground/40 underline-offset-2"
          data-row={rowIndex} data-col={column.getIndex()} onKeyDown={onCellKeyDown} onMouseDown={onCellMouseDown}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FREQ_OPTIONS.map(f => (
            <SelectItem key={f} value={f}>{frequencyLabels[f]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsParam(inc.frequency_type) && (
        <GridEditableCell
          value={inc.frequency_param ?? ''}
          onChange={v => meta.handleUpdate(inc.id, 'frequency_param', v)}
          type="number"
          className="text-left w-8 shrink-0"
          placeholder="X"
          colIndex={column.getIndex() + 1}
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function IncomesTab({ incomes, partnerX, partnerY, onAdd, onUpdate, onRemove }: IncomesTabProps) {
  const [adding, setAdding] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const prevCountRef = useRef(incomes.length);

  const [sorting, setSorting] = useState<SortingState>(() => {
    const col = localStorage.getItem('incomes_sortCol') || 'name';
    const dir = localStorage.getItem('incomes_sortDir') || 'asc';
    return [{ id: col, desc: dir === 'desc' }];
  });

  useEffect(() => {
    if (sorting.length > 0) {
      localStorage.setItem('incomes_sortCol', sorting[0].id);
      localStorage.setItem('incomes_sortDir', sorting[0].desc ? 'desc' : 'asc');
    }
  }, [sorting]);

  useEffect(() => {
    if (incomes.length > prevCountRef.current) {
      const newest = incomes[incomes.length - 1];
      if (newest) setFocusId(newest.id);
    }
    prevCountRef.current = incomes.length;
  }, [incomes]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await onAdd({ name: 'New income', amount: 0, partner_label: 'X', frequency_type: 'monthly', frequency_param: null });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const handleUpdate = (id: string, field: string, value: string) => {
    const updates: any = {};
    if (field === 'name') updates.name = value;
    else if (field === 'amount') updates.amount = Number(value) || 0;
    else if (field === 'frequency_param') updates.frequency_param = value ? Number(value) : null;
    else updates[field] = value;
    onUpdate(id, updates).catch((e: any) => {
      toast({ title: 'Error saving', description: e.message, variant: 'destructive' });
    });
  };

  const handleRemove = async (id: string) => {
    try { await onRemove(id); } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      meta: { sticky: true, headerClassName: 'min-w-[200px]' },
      cell: info => (
        <GridEditableCell
          value={info.getValue()}
          onChange={v => handleUpdate(info.row.original.id, 'name', v)}
          autoFocus={focusId === info.row.original.id}
          colIndex={info.column.getIndex()}
        />
      ),
    }),
    columnHelper.accessor('partner_label', {
      id: 'partner',
      header: 'Partner',
      meta: { headerClassName: 'min-w-[190px]' },
      cell: PartnerCell,
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      meta: { headerClassName: 'text-right' },
      cell: info => (
        <GridCurrencyCell
          value={info.getValue()}
          onChange={v => handleUpdate(info.row.original.id, 'amount', v)}
          className="text-right"
          colIndex={info.column.getIndex()}
        />
      ),
    }),
    columnHelper.accessor('frequency_type', {
      id: 'frequency',
      header: 'Frequency',
      meta: { headerClassName: 'min-w-[185px]' },
      cell: FrequencyCell,
    }),
    columnHelper.accessor(
      row => toMonthly(row.amount, row.frequency_type, row.frequency_param ?? undefined),
      {
        id: 'monthly',
        header: 'Monthly',
        meta: { headerClassName: 'text-right' },
        enableSorting: true,
        cell: info => (
          <span className="text-right font-medium tabular-nums text-xs block">
            ${Math.round(info.getValue())}
          </span>
        ),
      },
    ),
    columnHelper.display({
      id: 'actions',
      enableSorting: false,
      meta: { headerClassName: 'w-10' },
      cell: info => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost-destructive" size="icon" className="h-7 w-7">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete income</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{info.row.original.name}&rdquo;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleRemove(info.row.original.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    }),
  ];

  const table = useReactTable({
    data: incomes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
    meta: { handleUpdate, handleRemove, partnerX, partnerY },
  });

  // Totals
  const xTotal = incomes.filter(i => i.partner_label === 'X').reduce((s, i) => s + toMonthly(i.amount, i.frequency_type, i.frequency_param ?? undefined), 0);
  const yTotal = incomes.filter(i => i.partner_label === 'Y').reduce((s, i) => s + toMonthly(i.amount, i.frequency_type, i.frequency_param ?? undefined), 0);
  const total = xTotal + yTotal;
  const ratioX = total > 0 ? (xTotal / total * 100) : 50;

  const footer = incomes.length > 0 ? (
    <>
      <TableRow className="bg-muted shadow-[0_-1px_0_0_hsl(var(--border))]">
        <TableCell className="font-semibold text-xs sticky left-0 z-10 bg-muted">Totals</TableCell>
        <TableCell colSpan={3} className="text-xs bg-muted">
          {partnerX}: ${Math.round(xTotal)} · {partnerY}: ${Math.round(yTotal)}
        </TableCell>
        <TableCell className="text-right font-semibold tabular-nums text-xs bg-muted">${Math.round(total)}</TableCell>
        <TableCell className="bg-muted" />
      </TableRow>
      <TableRow>
        <TableCell className="text-xs text-muted-foreground sticky left-0 z-10 bg-muted">
          Income ratio: {partnerX} {ratioX.toFixed(0)}% / {partnerY} {(100 - ratioX).toFixed(0)}%
        </TableCell>
        <TableCell colSpan={5} className="bg-muted" />
      </TableRow>
    </>
  ) : null;

  return (
    <Card className="max-w-none w-[100vw] relative left-1/2 -translate-x-1/2 rounded-none border-x-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Income Streams</CardTitle>
          <Button onClick={handleAdd} disabled={adding} variant="outline" size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <DataGrid
          table={table}
          footer={footer}
          emptyMessage='No income streams yet. Click "Add" to start.'
        />
      </CardContent>
    </Card>
  );
}
