import type { Metadata } from 'next';

import ClientBookingPage from '@/app/client/book/page';

export const metadata: Metadata = { title: 'Κλείσε γύρισμα' };

export default function ClientV2BookPage() {
  return <ClientBookingPage />;
}
