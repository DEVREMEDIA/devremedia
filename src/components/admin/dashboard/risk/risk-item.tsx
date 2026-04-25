import Link from 'next/link';
import { AlertCircle, Clock, FileWarning, MapPin, Receipt, UserX } from 'lucide-react';
import { AgeBadge } from '../shared/age-badge';
import type { RiskItem as RiskItemType } from '@/types/dashboard';

const ICON_MAP = {
  overdue_invoice: Receipt,
  stale_lead: UserX,
  stale_deliverable: Clock,
  unsigned_contract: FileWarning,
  deadline_risk: AlertCircle,
  filming_no_crew: MapPin,
} as const;

export function RiskItem({ item, label }: { item: RiskItemType; label: string }) {
  const Icon = ICON_MAP[item.type];
  return (
    <Link
      href={item.href}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="h-4 w-4 shrink-0 text-red-500" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            <span className="font-medium">{label}</span>
            {item.subtitle ? ` · ${item.subtitle}` : ''}
          </div>
        </div>
      </div>
      <AgeBadge days={item.ageDays} />
    </Link>
  );
}
