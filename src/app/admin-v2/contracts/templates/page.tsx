import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function AdminV2ContractsTemplatesPage() {
  redirect('/admin-v2/settings?tab=templates');
}
