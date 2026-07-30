import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function AdminV2ProposalsPage() {
  redirect('/admin-v2/clients?tab=proposals');
}
