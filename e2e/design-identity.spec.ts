import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Invariants του design-identity layer. Κάθε assertion υπάρχει επειδή βρέθηκε
 * πραγματικό bug: διπλός τίτλος σελίδας, ελληνικά γράμματα σε OS fallback
 * font (Latin-only subset), επιφάνεια που κληρονομεί το host background, και
 * ρητή επιλογή θέματος που δεν νικά το OS preference.
 */

const GREEK = 'Σήμερα';

/** Φορτώνει (αν χρειάζεται) και ελέγχει ότι η οικογένεια font καλύπτει το ελληνικό δείγμα. */
async function fontLoaded(page: Page, family: string): Promise<boolean> {
  return page.evaluate(
    async ([f, sample]) => {
      await document.fonts.load(`16px "${f}"`, sample);
      return document.fonts.check(`16px "${f}"`, sample);
    },
    [family, GREEK] as const,
  );
}

/**
 * Το next/font ξαναγράφει τα family names στο build (π.χ. "__EB_Garamond_xxxxxx"),
 * οπότε δεν μαντεύουμε το όνομα — διαβάζουμε το πρώτο family της CSS custom
 * property που θέτει το `variable` config του layout πάνω στο body.
 */
async function primaryFontFamily(page: Page, cssVariable: string): Promise<string> {
  const raw = await page.evaluate(
    (v) => getComputedStyle(document.body).getPropertyValue(v),
    cssVariable,
  );
  return (
    raw
      .split(',')[0]
      ?.trim()
      .replace(/^["']|["']$/g, '') ?? ''
  );
}

async function hasThemeClass(page: Page, theme: 'light' | 'dark'): Promise<boolean> {
  return page.evaluate((t) => document.documentElement.classList.contains(t), theme);
}

async function bodyBackgroundColor(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

function parseRgb(color: string): [number, number, number] {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`Unexpected computed color: ${color}`);
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two computed `rgb()`/`rgba()` colors. */
function contrastRatio(colorA: string, colorB: string): number {
  const lumA = relativeLuminance(parseRgb(colorA));
  const lumB = relativeLuminance(parseRgb(colorB));
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('design identity — page heading', () => {
  test('admin today renders exactly one page heading', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/today');
    // Οι hubs ζωγραφίζουν τη δική τους επικεφαλίδα και μετά το tab body μία
    // δεύτερη, μικρότερη, από κάτω — εδώ επιβεβαιώνουμε ότι στο Today δεν συμβαίνει.
    await expect(page.locator('[data-slot="page-heading"]')).toHaveCount(1);
    await expect(page.locator('[data-slot="page-heading-title"]')).toHaveCount(1);
  });
});

test.describe('design identity — typefaces', () => {
  test('the three typefaces load with Greek glyphs on the login page', async ({ page }) => {
    await page.goto('/login');

    const serifFamily = await primaryFontFamily(page, '--font-display-serif');
    const sansFamily = await primaryFontFamily(page, '--font-sans-ui');
    const monoFamily = await primaryFontFamily(page, '--font-data');

    expect(serifFamily, 'serif family should resolve to a real generated name').not.toBe('');
    expect(sansFamily, 'sans family should resolve to a real generated name').not.toBe('');
    expect(monoFamily, 'mono family should resolve to a real generated name').not.toBe('');

    // Το κρίσιμο σημείο: πριν από αυτό το slice οι γραμματοσειρές φορτώνονταν
    // μόνο με το Latin subset, οπότε τα ελληνικά γλυφή έπεφταν σιωπηλά σε OS
    // fallback. Ένας έλεγχος με λατινικό δείγμα δεν θα το είχε πιάσει.
    expect(await fontLoaded(page, serifFamily)).toBe(true);
    expect(await fontLoaded(page, sansFamily)).toBe(true);
    expect(await fontLoaded(page, monoFamily)).toBe(true);
  });
});

test.describe('design identity — painted background', () => {
  test('dark edition (resting state) paints its background with legible contrast', async ({
    page,
  }) => {
    await page.goto('/login');
    expect(await hasThemeClass(page, 'dark')).toBe(true);
    expect(await hasThemeClass(page, 'light')).toBe(false);

    const title = page.locator('[data-slot="card-title"]').first();
    await expect(title).toBeVisible();

    const background = await bodyBackgroundColor(page);
    const foreground = await title.evaluate((el) => getComputedStyle(el).color);

    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(4.5);
  });

  test('light edition paints its background with legible contrast', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'light'));
    await page.goto('/login');
    expect(await hasThemeClass(page, 'light')).toBe(true);
    expect(await hasThemeClass(page, 'dark')).toBe(false);

    const title = page.locator('[data-slot="card-title"]').first();
    await expect(title).toBeVisible();

    const background = await bodyBackgroundColor(page);
    const foreground = await title.evaluate((el) => getComputedStyle(el).color);

    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('design identity — explicit theme beats OS preference', () => {
  test.describe('OS prefers dark, user explicitly chose light', () => {
    test.use({ colorScheme: 'dark' });

    test('renders the light edition anyway', async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('theme', 'light'));
      await page.goto('/login');
      expect(await hasThemeClass(page, 'light')).toBe(true);
      expect(await hasThemeClass(page, 'dark')).toBe(false);
    });
  });

  test.describe('OS prefers light, user explicitly chose dark', () => {
    test.use({ colorScheme: 'light' });

    test('renders the dark edition anyway', async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      await page.goto('/login');
      expect(await hasThemeClass(page, 'dark')).toBe(true);
      expect(await hasThemeClass(page, 'light')).toBe(false);
    });
  });
});
