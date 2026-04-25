import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = { deltaPct: number | null; className?: string; invertColors?: boolean };

export function DeltaBadge({ deltaPct, className, invertColors = false }: Props) {
  if (deltaPct == null) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}
      >
        <Minus className="h-3 w-3" />—
      </span>
    );
  }

  const positive = deltaPct >= 0;
  const goodDirection = invertColors ? !positive : positive;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = goodDirection ? 'text-emerald-600' : 'text-red-600';

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', color, className)}>
      <Icon className="h-3 w-3" />
      {positive ? '+' : ''}
      {deltaPct.toFixed(1)}%
    </span>
  );
}
