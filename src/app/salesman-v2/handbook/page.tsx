import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function SalesmanV2HandbookPage() {
  redirect('/salesman-v2/library?tab=handbook');
}
