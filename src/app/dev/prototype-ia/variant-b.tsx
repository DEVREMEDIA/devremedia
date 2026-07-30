'use client';

// PROTOTYPE — Παραλλαγή B: «Το Inbox».
// Κανένα μενού. Ένα ρεύμα αποφάσεων με inline ενέργειες. Πλοήγηση = αναζήτηση (⌘K).

import { Search, Command, Check, X, UserPlus, Clock, CornerDownLeft } from 'lucide-react';
import { ACTIONS, ENGAGEMENTS, eur } from './mock-data';

export const name = 'Το Inbox — μηδέν μενού, μόνο αποφάσεις + ⌘K';

const FILTERS = [
  { key: 'all', label: 'Όλα', count: 7 },
  { key: 'approve', label: 'Εγκρίσεις', count: 3 },
  { key: 'money', label: 'Χρήματα', count: 2 },
  { key: 'field', label: 'Γυρίσματα', count: 2 },
  { key: 'done', label: 'Τακτοποιημένα', count: 41 },
];

const PALETTE_ROWS = [
  { icon: '→', label: 'Marvera Shipping', hint: 'πελάτης' },
  { icon: '→', label: 'Εταιρικό βίντεο στόλου', hint: 'παραγωγή · σε έγκριση' },
  { icon: '+', label: 'Νέα παραγωγή…', hint: 'ενέργεια' },
  { icon: '+', label: 'Νέο τιμολόγιο…', hint: 'ενέργεια' },
  { icon: '⌗', label: 'Τιμολόγια ληξιπρόθεσμα', hint: 'προβολή' },
];

export function VariantB() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background text-foreground">
      {/* Μοναδική μπάρα: αναζήτηση αντί για μενού */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-6">
          <div className="h-6 w-6 shrink-0 rounded bg-primary" />
          <button className="flex flex-1 items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 text-left text-sm text-muted-foreground transition hover:border-primary/40">
            <Search className="h-4 w-4" />
            <span className="flex-1">Πήγαινε οπουδήποτε, κάνε οτιδήποτε…</span>
            <kbd className="flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[11px]">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>
          <div className="h-8 w-8 shrink-0 rounded-full bg-accent text-center text-xs leading-8 font-medium">
            ΝΤ
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pb-40 pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Τα εισερχόμενά σου</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          7 ανοιχτά · Άδειασέ τα και η μέρα τελείωσε
        </p>

        {/* Φίλτρα αντί για προορισμούς */}
        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f, i) => (
            <button
              key={f.key}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                i === 0
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Το ρεύμα: κάθε κάρτα λύνεται επιτόπου */}
        <div className="mt-6 space-y-3">
          {ACTIONS.map((a) => (
            <article
              key={a.id}
              className={`rounded-2xl border bg-card p-5 transition hover:shadow-lg ${
                a.urgent ? 'border-destructive/40' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {a.group === 'approve' ? 'Απόφαση' : a.group === 'money' ? 'Χρήματα' : 'Πεδίο'}
                  </p>
                  <h2 className="mt-1 text-base font-medium leading-snug">{a.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{a.subtitle}</p>
                </div>
                {a.urgent && (
                  <span className="shrink-0 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                    Επείγον
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                  {a.cta}
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium hover:bg-accent">
                  <UserPlus className="h-3.5 w-3.5" />
                  Ανάθεση
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium hover:bg-accent">
                  <Clock className="h-3.5 w-3.5" />
                  Αργότερα
                </button>
                <button className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent">
                  <X className="h-3.5 w-3.5" />
                  Αγνόησέ το
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Στατική απεικόνιση του ⌘K για να φανεί η ιδέα */}
        <div className="mt-12">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
            Έτσι πλοηγείσαι — δεν υπάρχει μενού
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">marv</span>
              <span className="h-4 w-px animate-pulse bg-foreground" />
            </div>
            <div className="p-1.5">
              {PALETTE_ROWS.map((r, i) => (
                <div
                  key={r.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    i === 0 ? 'bg-accent' : ''
                  }`}
                >
                  <span className="w-4 text-center text-muted-foreground">{r.icon}</span>
                  <span className="flex-1">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.hint}</span>
                  {i === 0 && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Το «τι τρέχει συνολικά» ζει σε μία γραμμή, όχι σε προορισμό */}
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 rounded-xl border border-border px-5 py-4 text-sm">
          <span className="text-muted-foreground">
            Ενεργές συνεργασίες <b className="text-foreground">{ENGAGEMENTS.length}</b>
          </span>
          <span className="text-muted-foreground">
            Σε εξέλιξη{' '}
            <b className="text-foreground">{eur(ENGAGEMENTS.reduce((s, e) => s + e.value, 0))}</b>
          </span>
          <span className="text-muted-foreground">
            Ληξιπρόθεσμα <b className="text-destructive">{eur(5600)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
