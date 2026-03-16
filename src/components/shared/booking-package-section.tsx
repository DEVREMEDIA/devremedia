'use client';

import { useTranslations } from 'next-intl';

interface Package {
  id: string;
  name: string;
  deliverables: string;
  includes: string;
  price: number;
}

interface BookingPackageSectionProps {
  packages: Package[];
  selectedPackage: string;
  onSelect: (packageId: string) => void;
}

export function BookingPackageSection({
  packages,
  selectedPackage,
  onSelect,
}: BookingPackageSectionProps) {
  const t = useTranslations('publicBooking');

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">{t('packageSection')}</h2>

      {packages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isSelected = selectedPackage === pkg.id;

            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelect(pkg.id)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                      : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600'
                  }
                `}
              >
                <h3
                  className={`font-semibold mb-2 ${isSelected ? 'text-amber-500' : 'text-white'}`}
                >
                  {pkg.name}
                </h3>
                <p className="text-sm text-zinc-400 mb-1">{pkg.deliverables}</p>
                <p className="text-sm text-zinc-500 mb-2">{pkg.includes}</p>
                <p className={`text-lg font-bold ${isSelected ? 'text-amber-500' : 'text-white'}`}>
                  €{pkg.price.toLocaleString()}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700 text-center">
          <p className="text-zinc-400">{t('noPackages')}</p>
        </div>
      )}
    </section>
  );
}
