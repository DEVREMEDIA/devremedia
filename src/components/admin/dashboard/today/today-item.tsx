import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { statusTone } from '@/lib/status-tone';
import { cn } from '@/lib/utils';
import type { TodayItem as TodayItemType } from '@/types/dashboard';

const TONE_CLASSES = {
  critical: 'bg-tone-critical-bg text-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive',
  neutral: 'bg-tone-neutral-bg text-tone-neutral',
} as const;

export function TodayItem({ item, allDayLabel }: { item: TodayItemType; allDayLabel: string }) {
  return (
    <Link
      href={item.href}
      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {item.time ?? allDayLabel}
        </span>
        {item.badge && (
          <span
            className={cn(
              'inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]',
              TONE_CLASSES[statusTone(item.badge.label)],
            )}
          >
            {item.badge.label}
          </span>
        )}
        {item.assigneeName && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={item.assigneeAvatarUrl ?? undefined} />
            <AvatarFallback className="text-xs">
              {item.assigneeName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </Link>
  );
}
