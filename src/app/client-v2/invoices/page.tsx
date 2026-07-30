import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function ClientV2InvoicesPage() {
  redirect('/client-v2/documents?tab=invoices');
}
