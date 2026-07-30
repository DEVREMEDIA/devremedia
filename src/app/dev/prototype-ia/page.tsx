'use client';

// PROTOTYPE — throwaway. Τέσσερις παραλλαγές του admin IA, με ?variant=A|B|C|D.
// Ερώτημα που απαντά: «πώς πρέπει να είναι οργανωμένη η πλατφόρμα για τον admin;»
// Δεν συνδέεται με πραγματικά δεδομένα ή mutations. Σβήνεται μόλις επιλεγεί παραλλαγή.

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PrototypeSwitcher } from './prototype-switcher';
import { VariantA, name as nameA } from './variant-a';
import { VariantB, name as nameB } from './variant-b';
import { VariantC, name as nameC } from './variant-c';
import { VariantD, name as nameD } from './variant-d';

const VARIANTS = [
  { key: 'A', name: nameA },
  { key: 'B', name: nameB },
  { key: 'C', name: nameC },
  { key: 'D', name: nameD },
];

function PrototypeContent() {
  const searchParams = useSearchParams();
  const variant = (searchParams.get('variant') ?? 'A').toUpperCase();

  return (
    <>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      {variant === 'D' && <VariantD />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </>
  );
}

export default function PrototypeIaPage() {
  return (
    <Suspense fallback={null}>
      <PrototypeContent />
    </Suspense>
  );
}
