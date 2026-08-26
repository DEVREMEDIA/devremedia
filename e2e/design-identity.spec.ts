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

const GREEK_UNICODE_START = 0x370;
const GREEK_UNICODE_END = 0x3ff;

/**
 * `document.fonts.check()` returns TRUE when the sample string has no glyph
 * in ANY unicode-range subset of the family — there is nothing to load, so
 * there is nothing to fail. A family that ships zero Greek coverage (the
 * pre-branch Geist faces: latin, latin-ext, cyrillic, cyrillic-ext,
 * vietnamese — nothing in U+0370–03FF) passes `check()` with a Greek sample
 * just as happily as one that actually covers Greek. This checks the
 * declaration itself instead: does at least one `@font-face` entry the
 * browser has registered for this family declare a unicode-range that
 * intersects the Greek block? That is sensitive to "this family has no Greek
 * glyphs" even when nothing was ever fetched.
 */
function unicodeRangeCoversGreek(unicodeRange: string): boolean {
  return unicodeRange
    .split(',')
    .map((token) => token.trim())
    .some((token) => {
      const match = token.match(/^U\+([0-9A-Fa-f?]+)(?:-([0-9A-Fa-f]+))?$/);
      if (!match) return false;
      const [, from, to] = match;
      const start = parseInt(from.replace(/\?/g, '0'), 16);
      const end = to ? parseInt(to, 16) : parseInt(from.replace(/\?/g, 'F'), 16);
      return start <= GREEK_UNICODE_END && end >= GREEK_UNICODE_START;
    });
}

/**
 * Declared `@font-face` entries are registered into `document.fonts` as soon
 * as the stylesheet is parsed — independent of whether any of their bytes
 * have been fetched. Filtering on fetch status would reintroduce the same
 * vacuity this check exists to close: rendered Latin text only ever forces
 * the Latin-range face to load, so a status-based filter would silently
 * exclude the very face we need to inspect.
 */
async function declaredUnicodeRanges(page: Page, family: string): Promise<string[]> {
  return page.evaluate((f) => {
    return Array.from(document.fonts)
      .filter((face) => face.family.replace(/^["']|["']$/g, '') === f)
      .map((face) => face.unicodeRange);
  }, family);
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

  /**
   * Κάθε hub ζωγράφιζε τη δική του επικεφαλίδα και μετά το σώμα της καρτέλας μία
   * δεύτερη από κάτω, σε άλλη κλίμακα — οι ίδιες λέξεις δύο φορές στην ίδια οθόνη.
   * Οι μη προεπιλεγμένες καρτέλες είναι εδώ επίτηδες: το σφάλμα ζούσε στα σώματα
   * των καρτελών, οπότε έλεγχος μόνο της πρώτης καρτέλας θα έχανε τα περισσότερα.
   *
   * Η λίστα καλύπτει και τα 17 σώματα καρτελών που έδωσαν τον τίτλο τους — το
   * σχόλιο δίπλα σε κάθε διαδρομή λέει ποιο. Αν μια επόμενη φέτα μετακινήσει ένα
   * σώμα σε άλλη καρτέλα, η αντιστοίχιση εδώ πρέπει να ακολουθήσει, αλλιώς ο
   * έλεγχος θα δοκιμάζει δύο φορές την ίδια οθόνη χωρίς να το πει.
   */
  const HUB_ROUTES = [
    '/admin/clients', // clients-content
    '/admin/clients?tab=proposals', // proposals-list
    '/admin/finance', // invoices-content
    '/admin/finance?tab=expenses', // expenses-content
    '/admin/finance?tab=cost', // cost-model-content
    '/admin/finance?tab=health', // pricing-health-content
    '/admin/knowledge',
    '/admin/productions', // projects-content
    '/admin/productions?tab=requests', // requests-page
    '/admin/settings', // settings-page
    '/admin/settings?tab=users', // users-page
    '/admin/settings?tab=packages', // packages-content
    '/admin/settings?tab=templates', // templates-content
    '/client/documents', // client contracts-page
    '/client/documents?tab=invoices', // client invoices-page
    '/employee/work', // employee tasks-page
    '/salesman/library', // salesman resources-page
    '/salesman/library?tab=handbook', // sales-handbook
  ];

  // Ο middleware αφήνει τον admin να μπει και στα /client/*, /employee/*,
  // /salesman/* — μία admin session αρκεί για όλα τα hubs και τους 4 ρόλους.
  for (const route of HUB_ROUTES) {
    test(`exactly one page heading on ${route}`, async ({ page }) => {
      test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
      await loginAsAdmin(page);
      await page.goto(route);

      // Χωρίς αυτό, μια ανακατεύθυνση στο /login θα έδινε μηδέν επικεφαλίδες και
      // ο έλεγχος θα «αποτύγχανε σωστά» για εντελώς λάθος λόγο.
      await expect(page).toHaveURL(new RegExp(route.split('?')[0].replace(/\//g, '\\/')));

      await expect(page.locator('[data-slot="page-heading-title"]')).toHaveCount(1);
    });
  }
});

test.describe('design identity — shared stat grid', () => {
  /**
   * Επτά αυτοσχέδια πλέγματα αριθμών ενοποιήθηκαν σε ένα κοινό StatGrid/StatCard
   * (#103). Εδώ επιβεβαιώνεται ότι η κάθε οθόνη όντως το χρησιμοποιεί — όχι μόνο
   * ότι ο κώδικας δεν έχει ωμό χρώμα (αυτό το πιάνει ήδη ο check:design guard).
   */
  const ROUTES: { route: string; count: number | { atLeast: number } }[] = [
    // Το KPI strip είναι μόνο για super_admin, οπότε το ραντάρ κινδύνου δίνει
    // πάτωμα, όχι ακριβή μέτρηση.
    { route: '/admin/today', count: { atLeast: 6 } },
    { route: '/admin/clients', count: 4 },
    { route: '/employee/today', count: 4 },
    { route: '/client/home', count: 3 },
    { route: '/salesman/today', count: 2 },
  ];

  // Ο middleware αφήνει τον admin να μπει και στα /client/*, /employee/*,
  // /salesman/* — μία admin session αρκεί και για τους 4 ρόλους.
  for (const { route, count } of ROUTES) {
    test(`${route} renders stat cards through the shared grid`, async ({ page }) => {
      test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
      await loginAsAdmin(page);
      await page.goto(route);

      // Χωρίς αυτό, μια ανακατεύθυνση στο /login θα έδινε μηδέν κάρτες και
      // ο έλεγχος θα «αποτύγχανε σωστά» για εντελώς λάθος λόγο.
      await expect(page).toHaveURL(new RegExp(route.split('?')[0].replace(/\//g, '\\/')));

      await expect(page.locator('[data-slot="stat-grid"]').first()).toBeVisible();

      if (typeof count === 'number') {
        await expect(page.locator('[data-slot="stat-card"]')).toHaveCount(count);
      } else {
        expect(await page.locator('[data-slot="stat-card"]').count()).toBeGreaterThanOrEqual(
          count.atLeast,
        );
      }
    });
  }
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

  test('each typeface actually declares a unicode-range that covers Greek', async ({ page }) => {
    await page.goto('/login');

    for (const [cssVariable, label] of [
      ['--font-display-serif', 'display serif'],
      ['--font-sans-ui', 'body sans'],
      ['--font-data', 'data mono'],
    ] as const) {
      const family = await primaryFontFamily(page, cssVariable);
      expect(family, `${label} family should resolve to a real generated name`).not.toBe('');

      const ranges = await declaredUnicodeRanges(page, family);
      expect(
        ranges.length,
        `${label} (${family}) has no declared @font-face entries`,
      ).toBeGreaterThan(0);

      // Το κρίσιμο σημείο: μια οικογένεια χωρίς κανένα ελληνικό unicode-range
      // (π.χ. το προηγούμενο Geist) περνάει το `document.fonts.check()` πάνω
      // σε ελληνικό δείγμα κενά — δεν έχει τι να φορτώσει, άρα δεν αποτυγχάνει
      // ποτέ. Αυτός ο έλεγχος κοιτάζει τη δήλωση, όχι το fetch.
      expect(
        ranges.some(unicodeRangeCoversGreek),
        `${label} (${family}): no declared unicode-range covers U+0370–03FF (Greek). Declared ranges: ${ranges.join(' | ')}`,
      ).toBe(true);
    }
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
