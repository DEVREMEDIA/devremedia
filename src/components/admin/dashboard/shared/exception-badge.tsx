import { cn } from '@/lib/utils';

type Props = { active: boolean; className?: string };

export function ExceptionBadge({ active, className }: Props) {
  if (!active) return null;
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full bg-tone-critical', className)}
      aria-label="Exception"
    />
  );
}
