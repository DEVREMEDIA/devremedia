'use client';

// PROTOTYPE — Παραλλαγή D: «Ο Πίνακας».
// Όλη η επιχείρηση σε έναν πίνακα. Στήλες = τα στάδια. Δουλεύεις σέρνοντας κάρτες.

import {
  LayoutGrid,
  CalendarDays,
  Euro,
  BookOpen,
  Settings,
  Search,
  GripVertical,
} from 'lucide-react';
import { STAGES, ENGAGEMENTS, eur } from './mock-data';

export const name = 'Ο Πίνακας — όλη η επιχείρηση σε ένα board';

const RAIL = [
  { icon: LayoutGrid, label: 'Πίνακας', active: true },
  { icon: CalendarDays, label: 'Ημερολόγιο', active: false },
  { icon: Euro, label: 'Οικονομικά', active: false },
  { icon: BookOpen, label: 'Γνώση', active: false },
  { icon: Settings, label: 'Ρυθμίσεις', active: false },
];

export function VariantD() {
  return (
    <div className="fixed inset-0 flex bg-background text-foreground">
      <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-4">
        <div className="mb-4 h-7 w-7 rounded-md bg-primary" />
        {RAIL.map((r) => (
          <button
            key={r.label}
            title={r.label}
            className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition ${
              r.active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <r.icon className="h-5 w-5" />
            <span className="pointer-events-none absolute left-14 z-20 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition group-hover:opacity-100">
              {r.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border px-6">
          <h1 className="text-lg font-semibold tracking-tight">Πίνακας επιχείρησης</h1>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-muted-foreground">
            {ENGAGEMENTS.length} ενεργές συνεργασίες ·{' '}
            {eur(ENGAGEMENTS.reduce((s, e) => s + e.value, 0))}
          </span>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Φιλτράρισμα…
          </div>
          <div className="h-8 w-8 rounded-full bg-accent text-center text-xs font-medium leading-8">
            ΝΤ
          </div>
        </header>

        <div className="flex-1 overflow-x-auto p-5">
          <div className="flex h-full gap-4">
            {STAGES.map((s) => {
              const cards = ENGAGEMENTS.filter((e) => e.stage === s.key);
              const total = cards.reduce((sum, c) => sum + c.value, 0);
              return (
                <section key={s.key} className="flex w-[17rem] shrink-0 flex-col">
                  <div className="mb-3 flex items-baseline gap-2 px-1">
                    <h2 className="text-sm font-semibold">{s.label}</h2>
                    <span className="text-xs text-muted-foreground">{cards.length}</span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {total > 0 ? eur(total) : ''}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 rounded-xl bg-accent/40 p-2.5">
                    {cards.map((c) => (
                      <article
                        key={c.id}
                        className={`group cursor-grab rounded-xl border bg-card p-3.5 shadow-sm transition hover:shadow-md ${
                          c.overdue ? 'border-destructive/50' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-transparent transition group-hover:text-muted-foreground/50" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-muted-foreground">{c.client}</p>
                            <p className="mt-0.5 text-sm font-medium leading-snug">{c.title}</p>
                          </div>
                        </div>

                        <p
                          className={`mt-2.5 rounded-md px-2 py-1.5 text-[11px] leading-snug ${
                            c.overdue
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-accent text-muted-foreground'
                          }`}
                        >
                          {c.nextAction}
                        </p>

                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-semibold">
                            {c.owner[0]}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {c.waitingDays} ημ.
                          </span>
                          {c.value > 0 && (
                            <span className="ml-auto text-[11px] font-semibold tabular-nums">
                              {eur(c.value)}
                            </span>
                          )}
                        </div>
                      </article>
                    ))}

                    <button className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition hover:bg-card">
                      + Προσθήκη
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
