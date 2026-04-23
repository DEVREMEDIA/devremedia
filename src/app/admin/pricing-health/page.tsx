import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getPricingHealth } from '@/lib/actions/pricing-health';
import { getCostSettings } from '@/lib/actions/cost-model';
import { PricingHealthContent } from './pricing-health-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pricingHealth');
  return { title: t('title') };
}

export default async function PricingHealthPage() {
  const [healthRes, settingsRes] = await Promise.all([getPricingHealth(), getCostSettings()]);

  const summary = healthRes.data;
  const settings = settingsRes.data;

  return (
    <PricingHealthContent
      summary={summary}
      error={healthRes.error}
      minMultiplier={Number(settings?.price_min_multiplier ?? 1.3)}
      targetMultiplier={Number(settings?.price_target_multiplier ?? 1.6)}
      maxMultiplier={Number(settings?.price_max_multiplier ?? 2.0)}
    />
  );
}
