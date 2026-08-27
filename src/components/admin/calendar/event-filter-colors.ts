// One map, one place. `calendar-view.tsx` and `upcoming-events.tsx` used to
// each keep their own copy of this event-type→colour map, and they had
// already drifted apart on `custom` (`hsl(280 60% 55%)` vs `hsl(280 70% 50%)`).
//
// FullCalendar and the upcoming-events dot both write this straight into an
// inline style, so it needs real colour values — it cannot become a
// tone-class map. It lives beside the calendar components rather than in
// `src/lib`, which isn't colour-guarded and is exactly how a raw palette
// grows back once nobody is watching it.
export type EventFilterType = 'project' | 'task' | 'invoice' | 'custom';

export const EVENT_FILTER_COLORS: Record<EventFilterType, string> = {
  project: 'var(--primary)',
  task: 'hsl(142 76% 36%)',
  invoice: 'hsl(25 95% 53%)',
  // Kept calendar-view.tsx's value over upcoming-events.tsx's: it matches
  // CALENDAR_EVENT_COLORS.custom in src/lib/constants/labels.ts — the colour
  // FullCalendar actually paints onto a `custom`-type event — so this dot
  // agrees with the event colour it represents instead of a third value.
  custom: 'hsl(280 60% 55%)',
};
