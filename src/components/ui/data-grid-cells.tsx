import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useGridNav, useGridRowIndex } from '@/components/ui/data-grid';
import { cn } from '@/lib/utils';

const cellInput =
  'h-7 border-transparent bg-transparent px-1 hover:border-border focus:border-transparent focus:ring-2 focus:ring-ring !text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const cellEditable =
  'underline decoration-dashed decoration-muted-foreground/40 underline-offset-2';
const cellButton =
  'h-7 w-full bg-transparent px-1 !text-xs cursor-text border border-transparent hover:border-border rounded-md underline decoration-dashed decoration-muted-foreground/40 underline-offset-2';

interface GridCellBase {
  colIndex: number;
  className?: string;
}

// ── Editable Text / Number ────────────────────────────────

interface GridEditableCellProps extends GridCellBase {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export function GridEditableCell({
  value, onChange, type = 'text', className, placeholder, autoFocus,
  colIndex, min, max, step,
}: GridEditableCellProps) {
  const [local, setLocal] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();

  useEffect(() => { setLocal(String(value)); }, [value]);

  const commit = () => { if (local !== String(value)) onChange(local); };

  return (
    <Input
      ref={ref}
      type={type}
      value={local}
      placeholder={placeholder}
      autoFocus={autoFocus}
      min={min}
      max={max}
      step={step}
      data-row={rowIndex}
      data-col={colIndex}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={onCellKeyDown}
      onMouseDown={onCellMouseDown}
      className={cn(cellInput, cellEditable, className)}
    />
  );
}

// ── Currency ──────────────────────────────────────────────

interface GridCurrencyCellProps extends GridCellBase {
  value: number;
  onChange: (v: string) => void;
}

export function GridCurrencyCell({ value, onChange, className, colIndex }: GridCurrencyCellProps) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();

  useEffect(() => { if (!focused) setLocal(String(value)); }, [value, focused]);

  const commit = () => { if (local !== String(value)) onChange(local); };

  return (
    <div className="min-w-[5rem]">
      {focused ? (
        <Input
          ref={ref}
          type="number"
          value={local}
          data-row={rowIndex}
          data-col={colIndex}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => { commit(); setFocused(false); }}
          onKeyDown={onCellKeyDown}
          onMouseDown={onCellMouseDown}
          autoFocus
          className={cn(cellInput, className)}
        />
      ) : (
        <button
          type="button"
          data-row={rowIndex}
          data-col={colIndex}
          onClick={() => setFocused(true)}
          onMouseDown={onCellMouseDown}
          className={cn(cellButton, 'text-right', className)}
        >
          ${Math.round(Number(local) || 0)}
        </button>
      )}
    </div>
  );
}

// ── Percent ───────────────────────────────────────────────

interface GridPercentCellProps extends GridCellBase {
  value: number;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
}

export function GridPercentCell({ value, onChange, className, colIndex, min = 0, max = 100 }: GridPercentCellProps) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const rowIndex = useGridRowIndex();
  const { onCellKeyDown, onCellMouseDown } = useGridNav();

  useEffect(() => { if (!focused) setLocal(String(value)); }, [value, focused]);

  const commit = () => { if (local !== String(value)) onChange(local); };

  return (
    <div className="min-w-[4rem]">
      {focused ? (
        <Input
          ref={ref}
          type="number"
          value={local}
          min={min}
          max={max}
          data-row={rowIndex}
          data-col={colIndex}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => { commit(); setFocused(false); }}
          onKeyDown={onCellKeyDown}
          onMouseDown={onCellMouseDown}
          autoFocus
          className={cn(cellInput, className)}
        />
      ) : (
        <button
          type="button"
          data-row={rowIndex}
          data-col={colIndex}
          onClick={() => setFocused(true)}
          onMouseDown={onCellMouseDown}
          className={cn(cellButton, 'text-right', className)}
        >
          {Math.round(Number(local) || 0)}%
        </button>
      )}
    </div>
  );
}
