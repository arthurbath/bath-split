import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { PersistentTooltipText } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataGridAddFormLabelProps {
  children: ReactNode;
  tooltip?: ReactNode;
  htmlFor?: string;
  className?: string;
  tooltipTabStop?: boolean;
}

/**
 * Standard label component for data-grid add forms.
 * If `tooltip` is provided, label text mirrors header tooltip behavior.
 */
export function DataGridAddFormLabel({
  children,
  tooltip,
  htmlFor,
  className,
  tooltipTabStop = true,
}: DataGridAddFormLabelProps) {
  const label = (
    <Label
      htmlFor={htmlFor}
      className={cn(className)}
    >
      {children}
    </Label>
  );

  if (!tooltip) return label;

  return (
    <PersistentTooltipText side="bottom" content={tooltip} includeInTabOrder={tooltipTabStop}>
      {label}
    </PersistentTooltipText>
  );
}
