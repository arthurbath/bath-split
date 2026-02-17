import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
  type CellContext,
  type Row,
} from '@tanstack/react-table';
import { DataGrid, useGridNav, useGridRowIndex } from '@/components/ui/data-grid';
import { GridEditableCell, GridCurrencyCell, GridPercentCell } from '@/components/ui/data-grid-cells';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { toMonthly, frequencyLabels, needsParam } from '@/lib/frequency';
import type { FrequencyType } from '@/types/fairshare';
import type { Expense } from '@/hooks/useExpenses';
import type { Category } from '@/hooks/useCategories';
import type { LinkedAccount } from '@/hooks/useLinkedAccounts';
import type { Income } from '@/hooks/useIncomes';

// ── Types ─────────────────────────────────────────────────

interface ExpensesTabProps {
  expenses: Expense[];
  categories: Category[];
  linkedAccounts: LinkedAccount[];
  incomes: Income[];
  partnerX: string;
  partnerY: string;
  partnerXColor: string | null;
  partnerYColor: string | null;
  onAdd: (expense: Omit<Expense, 'id' | 'household_id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Expense, 'id' | 'household_id'>>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<void>;
  onAddLinkedAccount: (name: string, ownerPartner?: string) => Promise<void>;
}

type GroupByOption = 'none' | 'category' | 'estimated' | 'payer' | 'payment_method';

const FREQ_OPTIONS: FrequencyType[] = [
  'weekly', 'twice_monthly', 'monthly', 'annual',
  'every_n_days', 'every_n_weeks', 'every_n_months',
  'k_times_weekly', 'k_times_monthly', 'k_times_annually',
];

const columnHelper = createColumnHelper<Expense>();

const resolveName = (id: string | null, list: { id: string; name: string }[]) =>
  id ? (list.find(x => x.id === id)?.name ?? '') : '';

// ── Cell Components ───────────────────────────────────────

function CategoryCell({ row, column, table }: CellContext<Expense, string | null>) {
  const meta = table.options.meta as any;
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();
  const exp = row.original;
  const cat = meta.categories.find((c: Category) => c.id === exp.category_id);
  return (
    <Select
      value={exp.category_id ?? '_none'}
      onValueChange={v => v === '_add_new' ? meta.openAddDialog('category') : meta.handleUpdate(exp.id, 'category_id', v)}
    >
      <SelectTrigger
        className="h-7 border-transparent hover:border-border text-xs underline decoration-dashed decoration-muted-foreground/40 underline-offset-2 rounded-sm"
        style={{ backgroundColor: cat?.color || 'transparent' }}
        data-row={rowIndex} data-col={column.getIndex()} onKeyDown={onCellKeyDown} onMouseDown={onCellMouseDown}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">—</SelectItem>
        {meta.categories.map((c: Category) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        <SelectItem value="_add_new" className="text-primary font-medium"><Plus className="inline h-3 w-3 mr-1" />Add New</SelectItem>
      </SelectContent>
    </Select>
  );
}

function EstimateCell({ row, column, table }: CellContext<Expense, boolean>) {
  const meta = table.options.meta as any;
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();
  return (
    <Checkbox
      checked={row.original.is_estimate}
      onCheckedChange={checked => meta.handleToggleEstimate(row.original.id, !!checked)}
      data-row={rowIndex} data-col={column.getIndex()}
      onKeyDown={onCellKeyDown} onMouseDown={onCellMouseDown}
    />
  );
}

function ExpenseFrequencyCell({ row, column, table }: CellContext<Expense, string>) {
  const meta = table.options.meta as any;
  const exp = row.original;
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();
  return (
    <div className="flex items-center gap-1">
      <Select value={exp.frequency_type} onValueChange={v => meta.handleUpdate(exp.id, 'frequency_type', v)}>
        <SelectTrigger
          className="h-7 min-w-0 border-transparent bg-transparent hover:border-border text-xs underline decoration-dashed decoration-muted-foreground/40 underline-offset-2"
          data-row={rowIndex} data-col={column.getIndex()} onKeyDown={onCellKeyDown} onMouseDown={onCellMouseDown}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FREQ_OPTIONS.map(f => <SelectItem key={f} value={f}>{frequencyLabels[f]}</SelectItem>)}
        </SelectContent>
      </Select>
      {needsParam(exp.frequency_type) && (
        <GridEditableCell
          value={exp.frequency_param ?? ''} onChange={v => meta.handleUpdate(exp.id, 'frequency_param', v)}
          type="number" className="text-left w-8 shrink-0" placeholder="X" colIndex={column.getIndex() + 1}
        />
      )}
    </div>
  );
}

function PaymentMethodCell({ row, column, table }: CellContext<Expense, string | null>) {
  const meta = table.options.meta as any;
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();
  const exp = row.original;
  const account = meta.linkedAccounts.find((la: LinkedAccount) => la.id === exp.linked_account_id);
  return (
    <Select
      value={exp.linked_account_id ?? '_none'}
      onValueChange={v => v === '_add_new' ? meta.openAddDialog('payment_method') : meta.handleUpdate(exp.id, 'linked_account_id', v)}
    >
      <SelectTrigger
        className="h-7 border-transparent hover:border-border text-xs underline decoration-dashed decoration-muted-foreground/40 underline-offset-2 rounded-sm"
        style={{ backgroundColor: account?.color || 'transparent' }}
        data-row={rowIndex} data-col={column.getIndex()} onKeyDown={onCellKeyDown} onMouseDown={onCellMouseDown}
      >
        <SelectValue>{account?.name ?? '—'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">—</SelectItem>
        {meta.linkedAccounts.map((la: LinkedAccount) => (
          <SelectItem key={la.id} value={la.id}>
            {la.name} <span className="text-muted-foreground group-focus:text-accent-foreground">({la.owner_partner === 'X' ? meta.partnerX : meta.partnerY})</span>
          </SelectItem>
        ))}
        <SelectItem value="_add_new" className="text-primary font-medium"><Plus className="inline h-3 w-3 mr-1" />Add New</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ── Group Subtotal ────────────────────────────────────────

function GroupSubtotalRow({ label, rows }: { label: string; rows: Row<Expense>[] }) {
  const groupMonthly = rows.reduce((s, r) => s + (r.getValue('monthly') as number), 0);
  const groupFairX = rows.reduce((s, r) => s + (r.getValue('fair_x') as number), 0);
  const groupFairY = rows.reduce((s, r) => s + (r.getValue('fair_y') as number), 0);
  return (
    <TableRow className="bg-muted sticky top-[36px] z-20 border-b-0 shadow-[0_1px_0_0_hsl(var(--border))]">
      <TableCell className="sticky left-0 z-10 bg-muted font-semibold text-xs">{label}</TableCell>
      <TableCell colSpan={4} className="bg-muted" />
      <TableCell className="text-right font-semibold tabular-nums text-xs bg-muted">${Math.round(groupMonthly)}</TableCell>
      <TableCell colSpan={4} className="bg-muted" />
      <TableCell className="text-right font-semibold tabular-nums text-xs bg-muted">${Math.round(groupFairX)}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums text-xs bg-muted">${Math.round(groupFairY)}</TableCell>
      <TableCell className="bg-muted" />
    </TableRow>
  );
}

// ── Main Component ────────────────────────────────────────

export function ExpensesTab({
  expenses, categories, linkedAccounts, incomes,
  partnerX, partnerY, partnerXColor, partnerYColor,
  onAdd, onUpdate, onRemove, onAddCategory, onAddLinkedAccount,
}: ExpensesTabProps) {
  const [adding, setAdding] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const prevCountRef = useRef(expenses.length);

  const [filterPayer, setFilterPayer] = useState<'all' | 'X' | 'Y'>(() => (localStorage.getItem('expenses_filterPayer') as 'all' | 'X' | 'Y') || 'all');
  const [groupBy, setGroupBy] = useState<GroupByOption>(() => (localStorage.getItem('expenses_groupBy') as GroupByOption) || 'none');
  const [sorting, setSorting] = useState<SortingState>(() => {
    const col = localStorage.getItem('expenses_sortCol') || 'name';
    const dir = localStorage.getItem('expenses_sortDir') || 'asc';
    return [{ id: col, desc: dir === 'desc' }];
  });

  // Add-new dialog state
  const [addDialog, setAddDialog] = useState<'category' | 'payment_method' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemOwner, setNewItemOwner] = useState<'X' | 'Y'>('X');
  const [saving, setSaving] = useState(false);

  // Persist preferences
  useEffect(() => { localStorage.setItem('expenses_filterPayer', filterPayer); }, [filterPayer]);
  useEffect(() => { localStorage.setItem('expenses_groupBy', groupBy); }, [groupBy]);
  useEffect(() => {
    if (sorting.length > 0) {
      localStorage.setItem('expenses_sortCol', sorting[0].id);
      localStorage.setItem('expenses_sortDir', sorting[0].desc ? 'desc' : 'asc');
    }
  }, [sorting]);

  // Focus new rows
  useEffect(() => {
    if (expenses.length > prevCountRef.current) {
      const newest = expenses[expenses.length - 1];
      if (newest) setFocusId(newest.id);
    }
    prevCountRef.current = expenses.length;
  }, [expenses]);

  // Income ratio
  const incomeRatioX = useMemo(() => {
    const ix = incomes.filter(i => i.partner_label === 'X').reduce((s, i) => s + toMonthly(i.amount, i.frequency_type, i.frequency_param ?? undefined), 0);
    const iy = incomes.filter(i => i.partner_label === 'Y').reduce((s, i) => s + toMonthly(i.amount, i.frequency_type, i.frequency_param ?? undefined), 0);
    const t = ix + iy;
    return t > 0 ? ix / t : 0.5;
  }, [incomes]);

  const getMonthly = useCallback((exp: Expense) =>
    toMonthly(exp.amount, exp.frequency_type, exp.frequency_param ?? undefined), []);

  const getFairX = useCallback((exp: Expense) => {
    const monthly = getMonthly(exp);
    const bx = exp.benefit_x / 100;
    const by = 1 - bx;
    const wx = bx * incomeRatioX;
    const wy = by * (1 - incomeRatioX);
    const tw = wx + wy || 1;
    return monthly * (wx / tw);
  }, [incomeRatioX, getMonthly]);

  // Handlers
  const handleAdd = async () => {
    setAdding(true);
    try {
      await onAdd({
        name: '', amount: 0, payer: null, benefit_x: 50,
        category_id: null, budget_id: null, linked_account_id: null,
        frequency_type: 'monthly', frequency_param: null, is_estimate: false,
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const handleUpdate = (id: string, field: string, value: string) => {
    const updates: any = {};
    if (field === 'name') updates.name = value;
    else if (field === 'amount') updates.amount = Number(value) || 0;
    else if (field === 'benefit_x') updates.benefit_x = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    else if (field === 'frequency_param') updates.frequency_param = value ? Number(value) : null;
    else if (field === 'category_id') updates.category_id = value === '_none' ? null : value;
    else if (field === 'linked_account_id') {
      const accountId = value === '_none' ? null : value;
      updates.linked_account_id = accountId;
      if (accountId) {
        const account = linkedAccounts.find(la => la.id === accountId);
        if (account) updates.payer = account.owner_partner;
      } else {
        updates.payer = null;
      }
    }
    else updates[field] = value;
    onUpdate(id, updates).catch((e: any) => {
      toast({ title: 'Error saving', description: e.message, variant: 'destructive' });
    });
  };

  const handleToggleEstimate = (id: string, checked: boolean) => {
    onUpdate(id, { is_estimate: checked }).catch((e: any) => {
      toast({ title: 'Error saving', description: e.message, variant: 'destructive' });
    });
  };

  const handleRemove = async (id: string) => {
    try { await onRemove(id); } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const openAddDialog = (type: 'category' | 'payment_method') => {
    setNewItemName('');
    setNewItemOwner('X');
    setAddDialog(type);
  };

  const handleSaveNewItem = async () => {
    if (!newItemName.trim()) return;
    setSaving(true);
    try {
      if (addDialog === 'category') await onAddCategory(newItemName.trim());
      else if (addDialog === 'payment_method') await onAddLinkedAccount(newItemName.trim(), newItemOwner);
      setAddDialog(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  // Filtered data
  const filteredExpenses = filterPayer === 'all' ? expenses : expenses.filter(e => e.payer === filterPayer);

  // Columns
  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      meta: { sticky: true, headerClassName: 'min-w-[120px] sm:min-w-[200px]' },
      cell: info => (
        <GridEditableCell
          value={info.getValue()} onChange={v => handleUpdate(info.row.original.id, 'name', v)}
          placeholder="Expense" colIndex={info.column.getIndex()} autoFocus={focusId === info.row.original.id}
        />
      ),
    }),
    columnHelper.accessor('category_id', {
      id: 'category',
      header: 'Category',
      meta: { headerClassName: 'min-w-[190px]' },
      sortingFn: (a, b) => resolveName(a.original.category_id, categories).localeCompare(resolveName(b.original.category_id, categories)),
      cell: CategoryCell,
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      meta: { headerClassName: 'text-right' },
      cell: info => (
        <GridCurrencyCell
          value={info.getValue()} onChange={v => handleUpdate(info.row.original.id, 'amount', v)}
          className="text-right" colIndex={info.column.getIndex()}
        />
      ),
    }),
    columnHelper.accessor('is_estimate', {
      id: 'estimate',
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="underline decoration-dotted underline-offset-2">Est</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Expense is estimated</TooltipContent>
        </Tooltip>
      ),
      meta: { headerClassName: 'text-center', cellClassName: 'text-center' },
      cell: EstimateCell,
    }),
    columnHelper.accessor('frequency_type', {
      id: 'frequency',
      header: 'Frequency',
      meta: { headerClassName: 'min-w-[185px]' },
      cell: ExpenseFrequencyCell,
    }),
    columnHelper.accessor(row => getMonthly(row), {
      id: 'monthly',
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="underline decoration-dotted underline-offset-2">Monthly</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Expense normalized to how much it costs you monthly</TooltipContent>
        </Tooltip>
      ),
      meta: { headerClassName: 'text-right' },
      cell: info => <span className="text-right font-medium tabular-nums text-xs block">${Math.round(info.getValue())}</span>,
    }),
    columnHelper.accessor('linked_account_id', {
      id: 'payment_method',
      header: 'Payment Method',
      meta: { headerClassName: 'min-w-[190px]' },
      sortingFn: (a, b) => resolveName(a.original.linked_account_id, linkedAccounts).localeCompare(resolveName(b.original.linked_account_id, linkedAccounts)),
      cell: PaymentMethodCell,
    }),
    columnHelper.accessor('payer', {
      header: 'Payer',
      sortingFn: (a, b) => (a.original.payer ?? '').localeCompare(b.original.payer ?? ''),
      cell: info => {
        const payer = info.getValue();
        const m = info.table.options.meta as any;
        if (!payer) return <span className="text-muted-foreground text-xs px-1">—</span>;
        return (
          <span className="text-xs px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: (payer === 'X' ? m.partnerXColor : m.partnerYColor) || 'transparent' }}>
            {payer === 'X' ? m.partnerX : m.partnerY}
          </span>
        );
      },
    }),
    columnHelper.accessor('benefit_x', {
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="underline decoration-dotted underline-offset-2">{partnerX} %</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">The percentage that {partnerX} benefits from the expense</TooltipContent>
        </Tooltip>
      ),
      meta: { headerClassName: 'text-right whitespace-nowrap' },
      cell: info => (
        <GridPercentCell
          value={info.getValue()}
          onChange={v => { const c = Math.max(0, Math.min(100, Math.round(Number(v) || 0))); handleUpdate(info.row.original.id, 'benefit_x', String(c)); }}
          className="text-right w-16" colIndex={info.column.getIndex()}
        />
      ),
    }),
    columnHelper.accessor(row => 100 - row.benefit_x, {
      id: 'benefit_y',
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="underline decoration-dotted underline-offset-2">{partnerY} %</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">The percentage that {partnerY} benefits from the expense</TooltipContent>
        </Tooltip>
      ),
      meta: { headerClassName: 'text-right whitespace-nowrap' },
      cell: info => (
        <GridPercentCell
          value={info.getValue()}
          onChange={v => { const c = Math.max(0, Math.min(100, Math.round(Number(v) || 0))); handleUpdate(info.row.original.id, 'benefit_x', String(100 - c)); }}
          className="text-right w-16" colIndex={info.column.getIndex()}
        />
      ),
    }),
    columnHelper.accessor(row => getFairX(row), {
      id: 'fair_x',
      header: `Fair ${partnerX}`,
      meta: { headerClassName: 'text-right' },
      cell: info => <span className="text-right tabular-nums text-xs block">${Math.round(info.getValue())}</span>,
    }),
    columnHelper.accessor(row => getMonthly(row) - getFairX(row), {
      id: 'fair_y',
      header: `Fair ${partnerY}`,
      meta: { headerClassName: 'text-right' },
      cell: info => <span className="text-right tabular-nums text-xs block">${Math.round(info.getValue())}</span>,
    }),
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
              <AlertDialogTitle>Delete expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{info.row.original.name}&rdquo;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleRemove(info.row.original.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    }),
  ];

  const table = useReactTable({
    data: filteredExpenses,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
    meta: {
      handleUpdate, handleRemove, handleToggleEstimate, openAddDialog,
      categories, linkedAccounts,
      partnerX, partnerY, partnerXColor, partnerYColor,
    },
  });

  // Grouping
  const sortedRows = table.getRowModel().rows;

  const getGroupKey = (exp: Expense): string => {
    switch (groupBy) {
      case 'category': return exp.category_id ?? '_ungrouped';
      case 'estimated': return exp.is_estimate ? 'Estimated' : 'Actual';
      case 'payer': return exp.payer ?? '_ungrouped';
      case 'payment_method': return exp.linked_account_id ?? '_ungrouped';
      default: return '_all';
    }
  };

  const getGroupLabel = (key: string): string => {
    if (key === '_ungrouped') return 'Uncategorized';
    switch (groupBy) {
      case 'category': return categories.find(c => c.id === key)?.name ?? 'Uncategorized';
      case 'estimated': return key;
      case 'payer': return key === 'X' ? partnerX : partnerY;
      case 'payment_method': return linkedAccounts.find(la => la.id === key)?.name ?? 'Uncategorized';
      default: return '';
    }
  };

  const groups = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, Row<Expense>[]>();
    for (const row of sortedRows) {
      const key = getGroupKey(row.original);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return [...map.entries()]
      .sort((a, b) => {
        if (a[0] === '_ungrouped') return 1;
        if (b[0] === '_ungrouped') return -1;
        return getGroupLabel(a[0]).localeCompare(getGroupLabel(b[0]));
      })
      .map(([key, rows]) => ({ key, label: getGroupLabel(key), rows }));
  }, [groupBy, sortedRows, categories, linkedAccounts, partnerX, partnerY]);

  // Totals
  const totals = useMemo(() => {
    let monthly = 0, fairX = 0;
    for (const exp of filteredExpenses) {
      monthly += getMonthly(exp);
      fairX += getFairX(exp);
    }
    return { monthly, fairX, fairY: monthly - fairX };
  }, [filteredExpenses, getMonthly, getFairX]);

  const footer = sortedRows.length > 0 ? (
    <TableRow className="bg-muted shadow-[0_-1px_0_0_hsl(var(--border))]">
      <TableCell className="font-semibold text-xs sticky left-0 z-10 bg-muted">Totals</TableCell>
      <TableCell colSpan={4} className="bg-muted" />
      <TableCell className="text-right font-semibold tabular-nums text-xs bg-muted">${Math.round(totals.monthly)}</TableCell>
      <TableCell colSpan={4} className="bg-muted" />
      <TableCell className="text-right font-semibold tabular-nums text-xs bg-muted">${Math.round(totals.fairX)}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums text-xs bg-muted">${Math.round(totals.fairY)}</TableCell>
      <TableCell className="bg-muted" />
    </TableRow>
  ) : null;

  return (
    <>
      <Card className="max-w-none w-[100vw] relative left-1/2 -translate-x-1/2 rounded-none border-x-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Expenses</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterPayer} onValueChange={v => setFilterPayer(v as 'all' | 'X' | 'Y')}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All partners</SelectItem>
                  <SelectItem value="X">{partnerX} only</SelectItem>
                  <SelectItem value="Y">{partnerY} only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupByOption)}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Group by…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="category">Group by Category</SelectItem>
                  <SelectItem value="estimated">Group by Estimated</SelectItem>
                  <SelectItem value="payer">Group by Payer</SelectItem>
                  <SelectItem value="payment_method">Group by Payment Method</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={adding} variant="outline" size="sm" className="h-8 gap-1.5">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataGrid
            table={table}
            footer={footer}
            emptyMessage='No expenses yet. Click "Add" to start.'
            groups={groups}
            renderGroupHeader={(label, rows) => <GroupSubtotalRow label={label} rows={rows} />}
          />
        </CardContent>
      </Card>

      <Dialog open={addDialog !== null} onOpenChange={open => { if (!open) setAddDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{addDialog === 'category' ? 'New Category' : 'New Payment Method'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-item-name">Name</Label>
              <Input id="new-item-name" value={newItemName} onChange={e => setNewItemName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveNewItem(); }} />
            </div>
            {addDialog === 'payment_method' && (
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={newItemOwner} onValueChange={v => setNewItemOwner(v as 'X' | 'Y')}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">{partnerX}</SelectItem>
                    <SelectItem value="Y">{partnerY}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveNewItem} disabled={saving || !newItemName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
