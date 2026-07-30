import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function SalesmanV2DashboardPage() {
  redirect('/salesman-v2/today');
}
