import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  iconClassName?: string;
  label?: string;
}

export function LoadingSpinner({
  className,
  iconClassName,
  label = 'Loading',
}: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite" className={cn('inline-flex items-center justify-center', className)}>
      <Loader2 className={cn('h-6 w-6 animate-spin text-muted-foreground', iconClassName)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
