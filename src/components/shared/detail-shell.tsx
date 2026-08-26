import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from '@/components/shared/page-heading';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

interface DetailShellProps {
  /** Πού γυρνά κανείς πίσω, και πώς λέγεται εκεί. */
  backHref: string;
  backLabel: string;
  title: string;
  /** Ό,τι στέκεται κάτω από τον τίτλο: πλακίδια κατάστασης, σύνδεσμος πελάτη. */
  meta?: ReactNode;
  /** Ενέργειες δίπλα στον τίτλο. */
  actions?: ReactNode;
  /**
   * Όλα μαζί ή τίποτα: μια οθόνη είτε έχει καρτέλες οδηγούμενες από το URL,
   * είτε δεν έχει καθόλου. Τρία ξεχωριστά προαιρετικά props θα επέτρεπαν να
   * περάσει κανείς καρτέλες χωρίς να πει ποια είναι ενεργή.
   */
  tabs?: { items: SectionTab[]; active: string; basePath: string };
  children: ReactNode;
}

/**
 * Το κοινό κέλυφος κάθε οθόνης λεπτομέρειας. Δεν εφευρίσκει τίποτα: συνθέτει
 * τον έναν τίτλο (`PageHeading`) με τις καρτέλες που ήδη οδηγούν τους κόμβους
 * (`SectionTabs`). Ο σύνδεσμος επιστροφής στέκεται ΠΑΝΩ από τον τίτλο και όχι
 * μέσα στις ενέργειες — η πλοήγηση δεν κάθεται δίπλα στη διαγραφή.
 */
export function DetailShell({
  backHref,
  backLabel,
  title,
  meta,
  actions,
  tabs,
  children,
}: DetailShellProps) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>

      <PageHeading title={title} subtitle={meta}>
        {actions}
      </PageHeading>

      {tabs ? (
        <SectionTabs basePath={tabs.basePath} tabs={tabs.items} active={tabs.active} />
      ) : null}

      {children}
    </div>
  );
}
