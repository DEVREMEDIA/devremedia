import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function SalesmanV2ResourcesPage() {
  redirect('/salesman-v2/library?tab=resources');
}
