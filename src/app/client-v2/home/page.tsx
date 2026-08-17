import type { Metadata } from 'next';

// Μετακομίζει αυτούσια — η αρχική του πελάτη έχει ήδη τη λίστα εκκρεμοτήτων.
import ClientDashboardPage from '@/app/client/dashboard/page';

export const metadata: Metadata = { title: 'Αρχική' };

export default function ClientV2HomePage() {
  return <ClientDashboardPage />;
}
