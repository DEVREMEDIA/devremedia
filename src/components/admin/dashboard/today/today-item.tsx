import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { statusTone, type Tone } from '@/lib/status-tone';
import { cn } from '@/lib/utils';
import type { TodayItem as TodayItemType } from '@/types/dashboard';

const TONE_CLASSES: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg text-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive',
  neutral: 'bg-tone-neutral-bg text-tone-neutral',
};

/**
 * Το tone του badge είναι ήδη ρητό στο query (destructive = κρίσιμο).
 * Το μαντεύουμε από το label μόνο όταν το ίδιο το tone δεν κουβαλάει κατάσταση.
 */
function resolveBadgeTone(badge: NonNullable<TodayItemType['badge']>): Tone {
  if (badge.tone === 'destructive') return 'critical';
  return statusTone(badge.label);
}

export function TodayItem({ item, allDayLabel }: { item: TodayItemType; allDayLabel: string }) {
  return (
    <Link
      href={item.href}
      className="flex items-center justify-between gap-3 border-b border-border py-3 transition-colors last:border-b-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
              TONE_CLASSES[resolveBadgeTone(item.badge)],
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
