'use client';

// PROTOTYPE — Παραλλαγή C: «Ο Καμβάς του Πελάτη».
// Δεν υπάρχουν καθολικές λίστες αντικειμένων. Το μενού είναι οι πελάτες.
// Τα πάντα (τιμολόγια, παραγωγές, συμφωνητικά) τα βλέπεις μέσα από τον πελάτη.

import {
  Search,
  Plus,
  Check,
  Circle,
  Video,
  Euro,
  FileSignature,
  MessageSquare,
} from 'lucide-react';
import { CLIENTS, STAGES, ENGAGEMENTS, eur } from './mock-data';

export const name = 'Ο Καμβάς του Πελάτη — το μενού είναι οι πελάτες';

const active = CLIENTS[0];
const activeStageIndex = STAGES.findIndex((s) => s.key === active.stage);

export function VariantC() {
  return (
    <div className="fixed inset-0 flex bg-background text-foreground">
      {/* Το «μενού» = λίστα πελατών */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Αναζήτηση πελάτη…
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-2 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Ενεργοί · {CLIENTS.length}
          </p>
          {CLIENTS.map((c, i) => (
            <button
              key={c.id}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                i === 0 ? 'bg-primary/15' : 'hover:bg-accent'
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold">
                {c.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {c.package} · {c.lastContact}
                </span>
              </span>
              {c.balance > 0 && (
                <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  €
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:bg-accent">
            <Plus className="h-4 w-4" />
            Νέος πελάτης
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {/* Λίγες καθολικές προβολές — σαν εργαλεία, όχι σαν προορισμοί */}
        <div className="flex h-14 items-center gap-1 border-b border-border px-6 text-sm">
          {['Καμβάς πελάτη', 'Ημερολόγιο', 'Οικονομικά', 'Γνώση'].map((v, i) => (
            <button
              key={v}
              className={`rounded-lg px-3 py-1.5 ${
                i === 0 ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-lg font-semibold">
              {active.initials}
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{active.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {active.package} · {eur(active.monthly)}/μήνα · {active.usedThisMonth} από{' '}
                {active.allowance} γυρίσματα αυτόν τον μήνα
              </p>
            </div>
          </div>

          {/* Η αλυσίδα ως γραμμή ζωής ΑΥΤΟΥ του πελάτη */}
          <div className="mt-8 flex items-center">
            {STAGES.map((s, i) => {
              const done = i < activeStageIndex;
              const now = i === activeStageIndex;
              return (
                <div key={s.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                        done
                          ? 'bg-primary text-primary-foreground'
                          : now
                            ? 'bg-primary/20 ring-2 ring-primary'
                            : 'bg-accent text-muted-foreground'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Circle className="h-2 w-2 fill-current" />
                      )}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[11px] ${now ? 'font-semibold' : 'text-muted-foreground'}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`mx-1 h-px flex-1 ${done ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Όλα όσα αφορούν τον πελάτη, σε πυκνά πάνελ — καμία άλλη σελίδα */}
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <Panel icon={FileSignature} title="Συμφωνία" action="Άνοιγμα">
              <Row label="Πακέτο" value={active.package} />
              <Row label="Συμφωνημένη τιμή" value={`${eur(active.monthly)} / μήνα`} />
              <Row label="Δικαίωμα" value={`${active.allowance} γυρίσματα / μήνα`} />
              <Row label="Υπογραφή" value="09/03/2026 — ψηφιακά" />
            </Panel>

            <Panel icon={Euro} title="Χρήματα" action="Νέο τιμολόγιο">
              <Row label="Υπόλοιπο" value={active.balance > 0 ? eur(active.balance) : '—'} />
              <Row label="Φέτος" value={eur(9800)} />
              <Row label="Τελευταία είσπραξη" value="14/07 · 1.400 €" />
              <Row label="Μέσος χρόνος πληρωμής" value="11 ημέρες" />
            </Panel>

            <Panel icon={Video} title="Παραγωγές" action="Νέα παραγωγή">
              {ENGAGEMENTS.filter((e) => e.client === active.name || e.owner === 'Νίκος')
                .slice(0, 4)
                .map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {STAGES.find((s) => s.key === e.stage)?.label}
                    </span>
                  </div>
                ))}
            </Panel>

            <Panel icon={MessageSquare} title="Επικοινωνία" action="Μήνυμα">
              <p className="py-1 text-sm leading-relaxed text-muted-foreground">
                <b className="text-foreground">Κώστας (πελάτης)</b> — «Το v2 είναι πολύ καλύτερο, το
                κοιτάω σήμερα.» <span className="text-xs">πριν 2 ημέρες</span>
              </p>
              <p className="py-1 text-sm leading-relaxed text-muted-foreground">
                <b className="text-foreground">Ελένη</b> — Ανέβασε παραδοτέο v2{' '}
                <span className="text-xs">πριν 3 ημέρες</span>
              </p>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ElementType;
  title: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        <button className="text-xs text-muted-foreground hover:text-foreground">{action}</button>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
