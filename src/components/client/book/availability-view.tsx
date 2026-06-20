import { getLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClientAvailability } from '@/lib/actions/booking-availability';

interface AvailabilityViewProps {
  availability: ClientAvailability;
}

const formatDate = (date: string, locale: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export async function AvailabilityView({ availability }: AvailabilityViewProps) {
  const t = await getTranslations('booking');
  const locale = await getLocale();

  const { package_name, allowance, remaining_allowance, dates } = availability;
  const unit = t(`allowanceUnit.${allowance.unit}`);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('yourPackage', { name: package_name })}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('remainingAllowance', { count: remaining_allowance, unit })}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dates.map((day) => (
          <Card key={day.date}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{formatDate(day.date, locale)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {day.slots.map((slot) => (
                <div key={slot.slot_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className={cn(!slot.available && 'text-muted-foreground')}>
                    {slot.slot_name}
                  </span>
                  <Badge variant={slot.available ? 'default' : 'secondary'}>
                    {slot.available ? t('available') : t(`unavailable.${slot.reason}`)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
