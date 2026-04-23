import { createClient } from '@/lib/supabase/server';

export async function checkFilmingAvailability(date: string): Promise<{
  available: boolean;
  filmingCount: number;
}> {
  const supabase = await createClient();

  // Count filming-type calendar events on the given date
  const { count, error } = await supabase
    .from('calendar_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'filming')
    .lte('start_date', `${date}T23:59:59`)
    .gte('start_date', `${date}T00:00:00`);

  if (error) {
    return { available: true, filmingCount: 0 };
  }

  return {
    available: (count ?? 0) === 0,
    filmingCount: count ?? 0,
  };
}
