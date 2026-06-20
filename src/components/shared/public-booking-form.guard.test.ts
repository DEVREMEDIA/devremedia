import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The public booking page must be a plain contact form: no package browsing,
// prices, project-type or date-picking UI. These guards assert the public form
// no longer pulls in any of the surfaces that render SERVICE_CATEGORIES prices.
const source = readFileSync(
  join(process.cwd(), 'src/components/shared/public-booking-form.tsx'),
  'utf8',
);

describe('public booking form is a plain contact form', () => {
  it('does not render package pricing from SERVICE_CATEGORIES', () => {
    expect(source).not.toMatch(/getServiceCategory|SERVICE_CATEGORIES|serviceCategory/);
    expect(source).not.toMatch(/BookingPackageSection/);
  });

  it('does not render project-type selection', () => {
    expect(source).not.toMatch(/BookingProjectTypeSection/);
    expect(source).not.toMatch(/project_type/);
  });

  it('does not render date-picking UI', () => {
    expect(source).not.toMatch(/BookingDatesSection/);
    expect(source).not.toMatch(/preferred_dates/);
  });

  it('keeps the contact section', () => {
    expect(source).toMatch(/BookingContactSection/);
  });
});
