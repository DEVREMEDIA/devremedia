// One map, one place. `calendar-view.tsx` and `upcoming-events.tsx` used to
// each keep their own copy of this event-type→colour map, and they had
// already drifted apart on `custom` (`hsl(280 60% 55%)` vs `hsl(280 70% 50%)`).
//
// FullCalendar and the upcoming-events dot both write this straight into an
// inline style, so it cannot become a tone-class map. It can still be a map of
// tokens: a CSS variable resolves at paint time, which is why `project` below
// was already `var(--primary)`. The values now live in `globals.css` beside
// every other colour in the product.
//
// The map stays beside the calendar components rather than in `src/lib`, which
// isn't colour-guarded and is exactly how a raw palette grows back once nobody
// is watching it.
export type EventFilterType = 'project' | 'task' | 'invoice' | 'custom';

export const EVENT_FILTER_COLORS: Record<EventFilterType, string> = {
  project: 'var(--primary)',
  task: 'var(--event-task)',
  invoice: 'var(--event-invoice)',
  // The same token CALENDAR_EVENT_COLORS.custom uses in
  // src/lib/constants/labels.ts — the colour FullCalendar actually paints onto
  // a `custom`-type event — so this dot agrees with the event it represents.
  // These two maps had already drifted apart on this exact key once, when each
  // held its own literal; sharing one token is what stops it happening again.
  custom: 'var(--event-custom)',
};
