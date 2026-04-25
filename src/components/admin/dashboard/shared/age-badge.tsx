import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = { days: number; className?: string };

export function AgeBadge({ days, className }: Props) {
  const label = days < 1 ? '<1d' : `${days}d`;
  const tone =
    days >= 30
      ? 'bg-red-100 text-red-700'
      : days >= 14
        ? 'bg-orange-100 text-orange-700'
        : days >= 7
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-slate-100 text-slate-700';
  return (
    <Badge variant="secondary" className={cn(tone, className)}>
      {label}
    </Badge>
  );
}
