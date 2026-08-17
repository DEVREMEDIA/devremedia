import type { Metadata } from 'next';
import Link from 'next/link';
import { RiskItem } from '@/components/admin/dashboard/risk/risk-item';
import { getRiskItems } from '@/lib/queries/dashboard/risk';
import type { RiskType } from '@/types/dashboard';

export const metadata: Metadata = { title: 'Σήμερα' };

/**
 * Η αρχική δεν είναι αναφορά — είναι λίστα εκκρεμοτήτων.
 * Τα γραφήματα ζουν στα Οικονομικά, όπου τα ψάχνεις όταν τα θέλεις.
 */
const RISK_GROUPS: { type: RiskType; label: string }[] = [
  { type: 'overdue_invoice', label: 'Ληξιπρόθεσμα τιμολόγια' },
  { type: 'filming_no_crew', label: 'Γυρίσματα χωρίς συνεργείο' },
  { type: 'deadline_risk', label: 'Προθεσμίες σε κίνδυνο' },
  { type: 'stale_deliverable', label: 'Παραδοτέα σε στασιμότητα' },
  { type: 'unsigned_contract', label: 'Ανυπόγραφα συμφωνητικά' },
  { type: 'stale_lead', label: 'Ξεχασμένοι ενδιαφερόμενοι' },
];

export default async function TodayPage() {
  const items = await getRiskItems();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Σήμερα</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length === 0
            ? 'Τίποτα δεν εκκρεμεί — καθαρή μέρα.'
            : `${items.length} ${items.length === 1 ? 'πράγμα χρειάζεται' : 'πράγματα χρειάζονται'} εσένα`}
        </p>
      </header>

      {/* Ραντάρ: μία ματιά σε ό,τι σαπίζει σιωπηλά */}
      <section>
        <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Κινδυνεύουν
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {RISK_GROUPS.map((group) => {
            const count = items.filter((i) => i.type === group.type).length;

            return (
              <div
                key={group.type}
                className={`rounded-xl border p-3 ${count > 0 ? 'border-destructive/50' : 'border-border'}`}
              >
                <div
                  className={`text-xl font-bold tabular-nums leading-tight ${count > 0 ? 'text-destructive' : ''}`}
                >
                  {count}
                </div>
                <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                  {group.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Οι ίδιες οι εκκρεμότητες, ομαδοποιημένες */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Δεν υπάρχει τίποτα σε εκκρεμότητα αυτή τη στιγμή.
        </div>
      ) : (
        RISK_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.type === group.type);
          if (groupItems.length === 0) return null;

          return (
            <section key={group.type}>
              <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.label} ({groupItems.length})
              </h2>
              <div className="space-y-2">
                {groupItems.map((item) => (
                  <RiskItem key={`${item.type}-${item.id}`} item={item} label={group.label} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <p className="text-xs text-muted-foreground">
        Τα γραφήματα και οι αναφορές ζουν στα{' '}
        <Link href="/admin-v2/finance?tab=reports" className="text-primary underline">
          Οικονομικά
        </Link>
        .
      </p>
    </div>
  );
}
