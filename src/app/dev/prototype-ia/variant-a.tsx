'use client';

// PROTOTYPE — Παραλλαγή A: «Η Αλυσίδα».
// Μενού = τα 6 στάδια της δουλειάς με τη σειρά του κύκλου ζωής. Αρχική = λίστα ενεργειών.

import {
  Sun,
  Users,
  Clapperboard,
  CalendarDays,
  Euro,
  BookOpen,
  Settings,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { ACTIONS, NAV_A, STAGES, ENGAGEMENTS } from './mock-data';

const ICONS = [Sun, Users, Clapperboard, CalendarDays, Euro, BookOpen];

const GROUPS = [
  { key: 'approve', label: 'Περιμένουν εσένα', hint: 'δεν προχωράει τίποτα χωρίς απόφασή σου' },
  { key: 'field', label: 'Στο πεδίο', hint: 'επόμενες 48 ώρες' },
  { key: 'money', label: 'Χρήματα', hint: 'εκκρεμείς εισπράξεις και υπογραφές' },
] as const;

export const name = 'Η Αλυσίδα — μενού με τα στάδια της δουλειάς';

export function VariantA() {
  return (
    <div className="fixed inset-0 flex bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="h-7 w-7 rounded-md bg-primary" />
          <span className="text-sm font-semibold tracking-tight">Devre Media</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_A.map((item, i) => {
            const Icon = ICONS[i];
            const isActive = i === 0;
            return (
              <button
                key={item.key}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-primary/15 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge > 0 && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <Settings className="h-4 w-4" />
            Ρυθμίσεις
          </button>
          <p className="px-3 pt-2 text-[11px] leading-tight text-muted-foreground/60">
            Χρήστες, πακέτα, πρότυπα, chatbot — όλα εδώ μέσα
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-1 border-b border-border bg-card px-6">
          {STAGES.map((s, i) => {
            const count = ENGAGEMENTS.filter((e) => e.stage === s.key).length;
            return (
              <div key={s.key} className="flex items-center">
                <button className="flex flex-col items-start rounded-md px-3 py-1.5 hover:bg-accent">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <span className="text-lg font-semibold leading-none tabular-nums">{count}</span>
                </button>
                {i < STAGES.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight">Σήμερα</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Τρίτη 29 Ιουλίου · 7 πράγματα χρειάζονται εσένα
            </p>

            <div className="mt-8 space-y-9">
              {GROUPS.map((g) => {
                const items = ACTIONS.filter((a) => a.group === g.key);
                return (
                  <section key={g.key}>
                    <div className="mb-3 flex items-baseline gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide">{g.label}</h2>
                      <span className="text-xs text-muted-foreground">{g.hint}</span>
                    </div>
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                      {items.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-accent/50"
                        >
                          {a.urgent && (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{a.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>
                          </div>
                          <button className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
                            {a.cta}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="mt-10 rounded-xl border border-dashed border-border p-5">
              <p className="text-sm font-medium">Τα γραφήματα ζουν στα «Οικονομικά»</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Η αρχική δεν είναι αναφορά — είναι λίστα εργασιών. Τζίρος, περιθώρια και προβλέψεις
                είναι δικός τους προορισμός, όταν τα θες.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
