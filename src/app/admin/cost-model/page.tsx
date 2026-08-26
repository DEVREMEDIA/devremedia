import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function CostModelPage() {
  redirect('/admin/finance?tab=cost');
}
