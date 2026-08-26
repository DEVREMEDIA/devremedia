import { cn } from '@/lib/utils';

type Props = { days: number; className?: string };

export function AgeBadge({ days, className }: Props) {
  const label = days < 1 ? '<1d' : `${days}d`;
  const tone =
    days >= 30
      ? 'bg-tone-critical-bg text-tone-critical'
      : days >= 7
        ? 'bg-tone-caution-bg text-tone-caution'
        : 'bg-tone-neutral-bg text-tone-neutral';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] tabular-nums',
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
