import { useEffect, useRef, useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataGridAddFormAffixInput } from '@/components/ui/data-grid-add-form-affix-input';
import { DataGridAddFormLabel } from '@/components/ui/data-grid-add-form-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  calculateAmountFromAverageRecords,
  type BudgetAverageRecord,
  type BudgetValueType,
} from '@/lib/budgetAveraging';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AverageRecordsEditorProps {
  valueType: Extract<BudgetValueType, 'monthly_averaged' | 'yearly_averaged'>;
  records: BudgetAverageRecord[];
  onChange: (records: BudgetAverageRecord[]) => void;
  disabled?: boolean;
  averageLabel?: string;
}

function currentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const minYear = 2000;
  const maxYear = currentYear + 5;
  const years = new Set<number>();

  for (let year = minYear; year <= maxYear; year += 1) {
    years.add(year);
  }

  return Array.from(years).sort((a, b) => b - a);
}

function buildDefaultRecord(valueType: Extract<BudgetValueType, 'monthly_averaged' | 'yearly_averaged'>): BudgetAverageRecord {
  const now = currentYearMonth();
  return {
    year: now.year,
    month: valueType === 'monthly_averaged' ? now.month : null,
    amount: 0,
  };
}

function toMonthDate(year: number, month: number | null): Date {
  return new Date(year, (month ?? 1) - 1, 1);
}

type MonthPickerFocusTarget =
  | { row: 0; col: 0; kind: 'prev' }
  | { row: 0; col: 2; kind: 'next' }
  | { row: 1 | 2 | 3 | 4; col: 0 | 1 | 2; kind: 'month'; month: number };

function getMonthPickerFocusTarget(row: number, col: number): MonthPickerFocusTarget | null {
  if (row === 0 && col === 0) return { row: 0, col: 0, kind: 'prev' };
  if (row === 0 && col === 2) return { row: 0, col: 2, kind: 'next' };
  if (row < 1 || row > 4 || col < 0 || col > 2) return null;

  const month = (row - 1) * 3 + col + 1;
  if (month < 1 || month > 12) return null;
  return {
    row: row as 1 | 2 | 3 | 4,
    col: col as 0 | 1 | 2,
    kind: 'month',
    month,
  };
}

function MonthlyRecordMonthPicker({
  year,
  month,
  disabled,
  onChange,
  rowIndex,
  onRequestTriggerFocus,
}: {
  year: number;
  month: number | null;
  disabled: boolean;
  onChange: (year: number, month: number) => void;
  rowIndex: number;
  onRequestTriggerFocus: (rowIndex: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = toMonthDate(year, month);
  const [visibleYear, setVisibleYear] = useState<number>(() => year);
  const monthButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const prevYearButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextYearButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasAutofocusedOnOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setVisibleYear(year);
  }, [open, year]);

  useEffect(() => {
    if (!open) {
      hasAutofocusedOnOpenRef.current = false;
      return;
    }
    if (hasAutofocusedOnOpenRef.current) return;

    hasAutofocusedOnOpenRef.current = true;
    const targetMonth = month ?? 1;
    const timer = window.setTimeout(() => {
      const focusTarget = monthButtonRefs.current[targetMonth] ?? monthButtonRefs.current[1];
      focusTarget?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [month, open]);

  const focusPickerTarget = (target: MonthPickerFocusTarget | null) => {
    if (!target) return;
    if (target.kind === 'prev') {
      prevYearButtonRef.current?.focus();
      return;
    }
    if (target.kind === 'next') {
      nextYearButtonRef.current?.focus();
      return;
    }
    monthButtonRefs.current[target.month]?.focus();
  };

  const movePickerFocus = (from: MonthPickerFocusTarget, rowDelta: number, colDelta: number) => {
    let nextRow = from.row + rowDelta;
    let nextCol = from.col + colDelta;

    while (nextRow >= 0 && nextRow <= 4 && nextCol >= 0 && nextCol <= 2) {
      const target = getMonthPickerFocusTarget(nextRow, nextCol);
      if (target) {
        focusPickerTarget(target);
        return;
      }
      nextRow += rowDelta;
      nextCol += colDelta;
    }
  };

  const handlePickerControlKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: MonthPickerFocusTarget) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      movePickerFocus(current, 0, -1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      movePickerFocus(current, 0, 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      movePickerFocus(current, -1, 0);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      movePickerFocus(current, 1, 0);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  const closePickerAndReturnFocus = () => {
    setOpen(false);
    onRequestTriggerFocus(rowIndex);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          data-average-record-primary-input="true"
          data-average-record-row={rowIndex}
          className={cn(
            'h-9 w-full justify-between border-[hsl(var(--grid-sticky-line))] bg-background px-3 text-left text-sm font-normal',
            'hover:bg-background',
          )}
        >
          <span>{format(selectedDate, 'MMM yyyy')}</span>
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-foreground opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              ref={prevYearButtonRef}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring/65 focus-visible:ring-2 focus-visible:ring-ring/65"
              onClick={() => setVisibleYear((current) => current - 1)}
              onKeyDown={(event) => handlePickerControlKeyDown(event, { row: 0, col: 0, kind: 'prev' })}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-medium tabular-nums">{visibleYear}</div>
            <button
              type="button"
              ref={nextYearButtonRef}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring/65 focus-visible:ring-2 focus-visible:ring-ring/65"
              onClick={() => setVisibleYear((current) => current + 1)}
              onKeyDown={(event) => handlePickerControlKeyDown(event, { row: 0, col: 2, kind: 'next' })}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((monthValue) => {
              const isSelected = visibleYear === year && monthValue === month;
              return (
                <Button
                  key={monthValue}
                  type="button"
                  size="sm"
                  variant="clear"
                  ref={(element) => {
                    monthButtonRefs.current[monthValue] = element;
                  }}
                  className={cn(
                    'h-8 px-0',
                    isSelected && 'border border-primary bg-primary/10 text-primary',
                  )}
                  onClick={() => {
                    onChange(visibleYear, monthValue);
                    closePickerAndReturnFocus();
                  }}
                  onKeyDown={(event) => handlePickerControlKeyDown(
                    event,
                    {
                      row: Math.floor((monthValue - 1) / 3) + 1 as 1 | 2 | 3 | 4,
                      col: ((monthValue - 1) % 3) as 0 | 1 | 2,
                      kind: 'month',
                      month: monthValue,
                    },
                  )}
                >
                  {format(new Date(visibleYear, monthValue - 1, 1), 'MMM')}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AverageRecordsEditor({
  valueType,
  records,
  onChange,
  disabled = false,
  averageLabel,
}: AverageRecordsEditorProps) {
  const modeLabel = valueType === 'monthly_averaged' ? 'Month' : 'Year';
  const defaultAverageLabel = valueType === 'monthly_averaged' ? 'Monthly average' : 'Yearly average';
  const computedAverage = calculateAmountFromAverageRecords(valueType, records);
  const computedMonthlyAverageFromYearly = computedAverage / 12;
  const yearOptions = buildYearOptions();
  const [blankAmountRows, setBlankAmountRows] = useState<number[]>([]);
  const shouldFocusNewestRowRef = useRef(false);
  const pendingTriggerRefocusRowRef = useRef<number | null>(null);
  const pendingPrimaryInputFocusRowRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBlankAmountRows((previous) => {
      const retained = previous.filter(
        (rowIndex) => rowIndex >= 0 && rowIndex < records.length && records[rowIndex]?.amount === 0,
      );
      if (records.length === 1 && records[0]?.amount === 0 && !retained.includes(0)) {
        return [0, ...retained];
      }
      return retained;
    });
  }, [records]);

  useEffect(() => {
    if (!shouldFocusNewestRowRef.current || disabled) return;
    shouldFocusNewestRowRef.current = false;

    const timer = window.setTimeout(() => {
      const rowPrimaryInput = containerRef.current?.querySelector<HTMLElement>(
        '[data-average-record-primary-input="true"][data-average-record-row="0"]',
      );
      rowPrimaryInput?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [disabled, records]);

  useEffect(() => {
    if (pendingTriggerRefocusRowRef.current == null || disabled) return;
    const rowIndex = pendingTriggerRefocusRowRef.current;
    pendingTriggerRefocusRowRef.current = null;

    const timer = window.setTimeout(() => {
      const trigger = containerRef.current?.querySelector<HTMLElement>(
        `[data-average-record-primary-input="true"][data-average-record-row="${rowIndex}"]`,
      );
      trigger?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [disabled, records]);

  useEffect(() => {
    if (pendingPrimaryInputFocusRowRef.current == null || disabled) return;
    const rowIndex = pendingPrimaryInputFocusRowRef.current;
    pendingPrimaryInputFocusRowRef.current = null;

    const timer = window.setTimeout(() => {
      const primaryInput = containerRef.current?.querySelector<HTMLElement>(
        `[data-average-record-primary-input="true"][data-average-record-row="${rowIndex}"]`,
      );
      primaryInput?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [disabled, records]);

  const handleAddRecord = () => {
    shouldFocusNewestRowRef.current = true;
    setBlankAmountRows((previous) => [0, ...previous.map((rowIndex) => rowIndex + 1)]);
    const now = currentYearMonth();
    onChange([
      {
        year: now.year,
        month: valueType === 'monthly_averaged' ? now.month : null,
        amount: 0,
      },
      ...records,
    ]);
  };

  const handleRemoveRecord = (index: number) => {
    if (records.length === 1) {
      pendingPrimaryInputFocusRowRef.current = 0;
      onChange([buildDefaultRecord(valueType)]);
      setBlankAmountRows([0]);
      return;
    }

    // Focus shifts to the next highest row after removal; if topmost is removed,
    // focus remains on the new top row.
    pendingPrimaryInputFocusRowRef.current = index === 0 ? 0 : index - 1;
    setBlankAmountRows((previous) =>
      previous
        .filter((rowIndex) => rowIndex !== index)
        .map((rowIndex) => (rowIndex > index ? rowIndex - 1 : rowIndex)),
    );
    onChange(records.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleMonthlyRecordChange = (index: number, updates: { year?: number; month?: number }) => {
    onChange(records.map((record, rowIndex) => {
      if (rowIndex !== index) return record;
      return {
        ...record,
        year: updates.year ?? record.year,
        month: updates.month ?? record.month,
      };
    }));
  };

  const handleYearChange = (index: number, yearValue: string) => {
    const parsedYear = Number(yearValue);
    if (!Number.isFinite(parsedYear)) return;
    const year = Math.trunc(parsedYear);
    if (year < 0 || year > 9999) return;
    pendingPrimaryInputFocusRowRef.current = index;
    onChange(records.map((record, rowIndex) => (
      rowIndex === index ? { ...record, year, month: null } : record
    )));
  };

  const handleAmountChange = (index: number, amountValue: string) => {
    if (amountValue.trim() === '') {
      setBlankAmountRows((previous) => (previous.includes(index) ? previous : [...previous, index]));
      onChange(records.map((record, rowIndex) => (
        rowIndex === index ? { ...record, amount: 0 } : record
      )));
      return;
    }

    setBlankAmountRows((previous) => previous.filter((rowIndex) => rowIndex !== index));
    const amount = Number(amountValue);
    onChange(records.map((record, rowIndex) => (
      rowIndex === index ? { ...record, amount: Number.isFinite(amount) ? amount : 0 } : record
    )));
  };

  return (
    <div ref={containerRef} className="space-y-2.5">
      <div className="flex items-center justify-between">
        <DataGridAddFormLabel>{valueType === 'monthly_averaged' ? 'Monthly Records' : 'Yearly Records'}</DataGridAddFormLabel>
        <Button
          type="button"
          variant="outline-success"
          size="sm"
          className="w-9"
          onClick={handleAddRecord}
          disabled={disabled}
          aria-label={`Add ${modeLabel.toLowerCase()} record`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {records.length === 0 ? (
        <p className="text-xs text-muted-foreground">No records yet. Add one or more records to compute the average.</p>
      ) : (
        <div className="space-y-2">
          {records.map((record, index) => (
            <div key={`${record.year}-${record.month ?? 'year'}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
              <div>
                {valueType === 'monthly_averaged' ? (
                  <MonthlyRecordMonthPicker
                    year={record.year}
                    month={record.month}
                    disabled={disabled}
                    rowIndex={index}
                    onChange={(nextYear, nextMonth) => handleMonthlyRecordChange(index, { year: nextYear, month: nextMonth })}
                    onRequestTriggerFocus={(targetRowIndex) => {
                      pendingTriggerRefocusRowRef.current = targetRowIndex;
                    }}
                  />
                ) : (
                  <Select
                    value={String(record.year)}
                    onValueChange={(yearValue) => handleYearChange(index, yearValue)}
                    disabled={disabled}
                  >
                    <SelectTrigger
                      className="h-9 text-sm"
                      data-average-record-primary-input="true"
                      data-average-record-row={index}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((yearOption) => (
                        <SelectItem key={yearOption} value={String(yearOption)}>
                          {yearOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <DataGridAddFormAffixInput
                  prefix="$"
                  value={blankAmountRows.includes(index) ? '' : String(record.amount)}
                  onChange={(event) => handleAmountChange(index, event.target.value)}
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline-warning"
                size="sm"
                className="w-9 p-0 self-end"
                onClick={() => handleRemoveRecord(index)}
                disabled={disabled}
                aria-label={records.length === 1 ? `Clear ${modeLabel.toLowerCase()} record` : `Remove ${modeLabel.toLowerCase()} record ${index + 1}`}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <div>
          {(averageLabel ?? defaultAverageLabel)}: <span className="tabular-nums text-foreground">${computedAverage.toFixed(2)}</span>
        </div>
        {valueType === 'yearly_averaged' && (
          <div>
            Monthly average: <span className="tabular-nums text-foreground">${computedMonthlyAverageFromYearly.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
