import type { Metadata } from 'next';
import { displaySerif, bodyGrotesk } from '@/components/landing/fonts';
import { UnderConstruction } from '@/components/landing/under-construction/under-construction';

export const metadata: Metadata = {
  title: { absolute: 'Devre Media — Υπό κατασκευή' },
  description: 'Η νέα ιστοσελίδα της Devre Media χτίζεται.',
};

export default function HomePage() {
  return (
    <div className={`${displaySerif.variable} ${bodyGrotesk.variable}`}>
      <UnderConstruction />
    </div>
  );
}
