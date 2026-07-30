import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function AdminV2CostModelPage() {
  redirect('/admin-v2/finance?tab=cost');
}
