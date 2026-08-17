import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function ClientV2ContractsPage() {
  redirect('/client-v2/documents?tab=contracts');
}
