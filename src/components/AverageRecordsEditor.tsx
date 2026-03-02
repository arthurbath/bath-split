import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataGridAddFormAffixInput } from '@/components/ui/data-grid-add-form-affix-input';
import { DataGridAddFormLabel } from '@/components/ui/data-grid-add-form-label';
import {
  calculateAmountFromAverageRecords,
  type BudgetAverageRecord,
  type BudgetValueType,
} from '@/lib/budgetAveraging';

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

function toMonthValue(year: number, month: number | null): string {
  if (month == null) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
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

  const handleAddRecord = () => {
    const now = currentYearMonth();
    onChange([
      ...records,
      {
        year: now.year,
        month: valueType === 'monthly_averaged' ? now.month : null,
        amount: 0,
      },
    ]);
  };

  const handleRemoveRecord = (index: number) => {
    onChange(records.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleMonthChange = (index: number, monthValue: string) => {
    const [yearPart, monthPart] = monthValue.split('-');
    const year = Number(yearPart);
    const month = Number(monthPart);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    if (month < 1 || month > 12) return;

    onChange(records.map((record, rowIndex) => (
      rowIndex === index ? { ...record, year, month } : record
    )));
  };

  const handleYearChange = (index: number, yearValue: string) => {
    const parsedYear = Number(yearValue);
    if (!Number.isFinite(parsedYear)) return;
    const year = Math.trunc(parsedYear);
    if (year < 0 || year > 9999) return;
    onChange(records.map((record, rowIndex) => (
      rowIndex === index ? { ...record, year, month: null } : record
    )));
  };

  const handleAmountChange = (index: number, amountValue: string) => {
    const amount = Number(amountValue);
    onChange(records.map((record, rowIndex) => (
      rowIndex === index ? { ...record, amount: Number.isFinite(amount) ? amount : 0 } : record
    )));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <DataGridAddFormLabel>{valueType === 'monthly_averaged' ? 'Monthly Records' : 'Yearly Records'}</DataGridAddFormLabel>
        <Button
          type="button"
          variant="outline-success"
          size="sm"
          className="h-8 gap-1.5"
          onClick={handleAddRecord}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {records.length === 0 ? (
        <p className="text-xs text-muted-foreground">No records yet. Add one or more records to compute the average.</p>
      ) : (
        <div className="space-y-2">
          {records.map((record, index) => (
            <div key={`${record.year}-${record.month ?? 'year'}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
              <div className="space-y-1.5">
                <DataGridAddFormLabel>{modeLabel}</DataGridAddFormLabel>
                {valueType === 'monthly_averaged' ? (
                  <Input
                    type="month"
                    value={toMonthValue(record.year, record.month)}
                    onChange={(event) => handleMonthChange(index, event.target.value)}
                    disabled={disabled}
                    className="h-9"
                  />
                ) : (
                  <Input
                    type="number"
                    value={String(record.year)}
                    onChange={(event) => handleYearChange(index, event.target.value)}
                    disabled={disabled}
                    className="h-9"
                    min={0}
                    max={9999}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <DataGridAddFormLabel>Amount</DataGridAddFormLabel>
                <DataGridAddFormAffixInput
                  prefix="$"
                  value={String(record.amount)}
                  onChange={(event) => handleAmountChange(index, event.target.value)}
                  disabled={disabled}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => handleRemoveRecord(index)}
                disabled={disabled}
                aria-label={`Remove ${modeLabel.toLowerCase()} record ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        {(averageLabel ?? defaultAverageLabel)}: <span className="tabular-nums text-foreground">${computedAverage.toFixed(2)}</span>
      </div>
    </div>
  );
}
