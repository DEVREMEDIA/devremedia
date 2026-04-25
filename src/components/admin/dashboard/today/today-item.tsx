import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TodayItem as TodayItemType } from '@/types/dashboard';

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
        <span className="text-xs tabular-nums text-muted-foreground">
          {item.time ?? allDayLabel}
        </span>
        {item.badge && (
          <Badge variant={item.badge.tone === 'default' ? undefined : item.badge.tone}>
            {item.badge.label}
          </Badge>
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
