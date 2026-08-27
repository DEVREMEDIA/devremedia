import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin, loginAsClient } from './helpers/auth';

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
    // ΠΡΟΣΟΧΗ στην καρτέλα: το hub των Πελατών ανοίγει στο `list`, και τα
    // στατιστικά του chatbot ζωγραφίζονται ΜΟΝΟ κάτω από το `?tab=chat`.
    // Χωρίς την παράμετρο ο έλεγχος μετρά κάρτες σε οθόνη που δεν έχει καμία.
    { route: '/admin/clients?tab=chat', count: 4 },
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

test.describe('design identity — shared table', () => {
  /**
   * Το hub των Οικονομικών ανοίγει στην καρτέλα `invoices` — κάθε άλλη
   * καρτέλα θέλει ρητά το δικό της `?tab=`. Μια προηγούμενη φέτα έστειλε ένα
   * test που δεν μπορούσε ποτέ να περάσει επειδή πήγαινε στη γυμνή διεύθυνση
   * του hub και έλεγχε περιεχόμενο που ζει σε άλλη καρτέλα — και κανείς δεν
   * το πρόσεξε, γιατί τα specs είναι skipped.
   */

  test('/admin/finance — invoices tab renders and the table view scrolls inside its own container', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/finance');
    await expect(page).toHaveURL(/\/admin\/finance/);

    // Η προεπιλογή είναι η προβολή καρτών· το toggle φέρνει τον κοινό πίνακα.
    // Δομικός επιλογέας επίτηδες: τα δύο κουμπιά αυτού του toggle (Οικονομικά)
    // δεν έχουν προσβάσιμο όνομα, και η διόρθωσή τους θέλει νέα κλειδιά σε
    // περιοχή εκτός αυτής της φέτας. Δηλωμένο χρέος, όχι παράλειψη.
    await page.locator('div.rounded-lg.border.p-1 button').nth(1).click();

    const tableContainer = page.locator('[data-slot="table-container"]').first();
    await expect(tableContainer.locator('table')).toBeVisible();

    // Το κρίσιμο σημείο: ένας φαρδύς πίνακας σε κινητό κυλά μέσα στο δικό
    // του container, όχι ολόκληρη τη σελίδα πλάγια.
    await page.setViewportSize({ width: 390, height: 844 });
    const bodyFitsWithoutSidewaysScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(bodyFitsWithoutSidewaysScroll).toBe(true);
  });

  test('/admin/finance?tab=expenses — searching narrows the row count', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/finance?tab=expenses');
    // Η καρτέλα καρφιτσώνεται ρητά. Χωρίς την παράμετρο στον έλεγχο, ένα
    // μετονομασμένο κλειδί ρίχνει το hub σιωπηλά πίσω στα τιμολόγια — που
    // έχουν κι αυτά πεδίο «Αναζήτηση», οπότε ο έλεγχος θα περνούσε αλλού.
    await expect(page).toHaveURL(/\/admin\/finance\?tab=expenses/);

    // Το κενό-αποτέλεσμα γράφει τη δική του γραμμή χωρίς `data-state` — μόνο
    // οι πραγματικές γραμμές δεδομένων το έχουν, οπότε μετράει σωστά και τις
    // δύο περιπτώσεις.
    const rows = page.locator('table tbody tr[data-state]');
    const rowsBefore = await rows.count();
    expect(rowsBefore).toBeGreaterThan(0);

    await page.getByPlaceholder(/Αναζήτηση/i).fill('zzzzzznonexistentzzzzzz');

    await expect.poll(() => rows.count()).toBeLessThan(rowsBefore);
  });

  test('/admin/finance?tab=reports — top-clients table renders without pagination controls', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/finance?tab=reports');
    await expect(page).toHaveURL(/\/admin\/finance\?tab=reports/);

    const clientReportCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: 'Κορυφαίοι Πελάτες' })
      .first();
    await expect(clientReportCard.locator('table')).toBeVisible();

    // Δέκα γραμμές χωράνε σε μία σελίδα — η μπάρα σελιδοποίησης δεν
    // αποδίδεται καθόλου (Task 1, Step 9).
    await expect(page.getByText(/Σελίδα \d+ από \d+/)).toHaveCount(0);
  });
});

test.describe('design identity — clients area', () => {
  /**
   * Το hub των Πελατών ανοίγει στην καρτέλα `list` — κάθε άλλη καρτέλα θέλει
   * ρητά το δικό της `?tab=`. Ίδιο μάθημα με την περιοχή των Οικονομικών:
   * χωρίς την παράμετρο ο έλεγχος δοκιμάζει λάθος οθόνη χωρίς να το προσέξει
   * κανείς, γιατί τα specs είναι skipped.
   */

  test('/admin/clients?tab=interest — leads table renders through the shared table and searching narrows the row count', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/clients?tab=interest');
    await expect(page).toHaveURL(/\/admin\/clients\?tab=interest/);

    const tableContainer = page.locator('[data-slot="table-container"]').first();
    await expect(tableContainer.locator('table')).toBeVisible();

    const rows = page.locator('table tbody tr[data-state]');
    const rowsBefore = await rows.count();
    expect(rowsBefore).toBeGreaterThan(0);

    // Το πεδίο αναζήτησης είναι αδερφός του επιλογέα σταδίου, όχι δικό του πίνακα.
    await page.getByPlaceholder(/Αναζήτηση leads/i).fill('zzzzzznonexistentzzzzzz');

    await expect.poll(() => rows.count()).toBeLessThan(rowsBefore);
  });

  test('/admin/clients?tab=proposals — proposals list renders as a real table', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/clients?tab=proposals');
    await expect(page).toHaveURL(/\/admin\/clients\?tab=proposals/);

    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    await expect(table.locator('thead tr').first()).toBeVisible();
  });

  test('/admin/clients?tab=chat — deleting a conversation asks first', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/clients?tab=chat');
    await expect(page).toHaveURL(/\/admin\/clients\?tab=chat/);

    // Το μόνο test της σουίτας που θα έπιανε μια καταστροφική ενέργεια να
    // χάνει την επιβεβαίωσή της ξανά.
    const rows = page.locator('table tbody tr[data-state]');
    const rowsBefore = await rows.count();
    expect(rowsBefore).toBeGreaterThan(0);

    await rows.first().getByRole('button').first().click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(rows).toHaveCount(rowsBefore);
  });
});

test.describe('design identity — detail screens', () => {
  /**
   * Οι τρεις οθόνες λεπτομέρειας (#106) περνούν στο κοινό `DetailShell`: ένας
   * τίτλος, καρτέλες οδηγούμενες από το URL, σύνδεσμος επιστροφής. Κάθε test
   * ανοίγει την πραγματική λίστα και πατά τον σύνδεσμο της πρώτης γραμμής —
   * ποτέ ένα id από seed file, που θα σαπίσει με την πρώτη αλλαγή δεδομένων.
   *
   * Δεν υπάρχει test για την κατάσταση φόρτωσης (`detail-skeleton.tsx`):
   * θα κέρδιζε κούρσα με τον διακομιστή και θα απέτυχε τυχαία — το κριτήριο
   * αποδοχής που τη ζητά δεν αξίζει ένα test που αποτυγχάνει στην τύχη.
   */

  test('the shell renders on a project', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/productions?tab=all');
    await expect(page).toHaveURL(/\/admin\/productions/);

    // Η προεπιλογή είναι το kanban board, χωρίς links πάνω στις κάρτες — το
    // toggle φέρνει τη λίστα, όπου κάθε γραμμή έχει πραγματικό σύνδεσμο.
    await page.getByRole('button', { name: /Λίστα|List/ }).click();

    const firstProjectLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href^="/admin/projects/"]')
      .first();
    await firstProjectLink.click();
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+$/);

    await expect(page.locator('[data-slot="page-heading"]')).toHaveCount(1);
    await expect(page.locator('[role="tablist"]')).toHaveCount(1);
    // Ο προορισμός, όχι το stub. Το `/admin/projects` ανακατευθύνει εδώ — ο
    // σύνδεσμος δούλευε και πλήρωνε μια αναπήδηση, και αυτό ακριβώς έπιασε
    // αυτό το test όταν διορθώθηκε ο σύνδεσμος.
    await expect(page.locator('a[href="/admin/productions?tab=all"]')).toBeVisible();
  });

  test('a deep link into a tab resolves to that tab', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/productions?tab=all');
    await expect(page).toHaveURL(/\/admin\/productions/);

    await page.getByRole('button', { name: /Λίστα|List/ }).click();

    const firstProjectLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href^="/admin/projects/"]')
      .first();
    await firstProjectLink.click();
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+$/);

    // Βαθύ σύνδεσμο απευθείας πάνω στην ίδια οθόνη λεπτομέρειας.
    await page.goto(`${page.url()}?tab=invoices`);
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+\?tab=invoices/);

    const invoicesTab = page.locator('a[role="tab"][href*="tab=invoices"]');
    await expect(invoicesTab).toHaveAttribute('aria-selected', 'true');
    // Το σώμα της καρτέλας, όχι ο σύνδεσμός της. Ένα σκέτο getByText(/τιμολ/i)
    // θα έπιανε πρώτα την ίδια την ετικέτα «Τιμολόγια» πάνω στη γραμμή
    // καρτελών, και θα περνούσε ακόμα και με τελείως άδεια καρτέλα. Το σώμα
    // έχει δύο μόνο μορφές — πίνακα ή κενή κατάσταση — και καμία από τις δύο
    // δεν είναι σύνδεσμος καρτέλας.
    const invoicesBody = page
      .locator('[data-slot="table-container"]')
      .or(page.getByRole('heading', { name: /Δεν υπάρχουν τιμολόγια|No invoices yet/ }));
    await expect(invoicesBody.first()).toBeVisible();
  });

  test("the client detail's tabs are in the URL", async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/clients');
    await expect(page).toHaveURL(/\/admin\/clients/);

    const firstClientLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href^="/admin/clients/"]')
      .first();
    await firstClientLink.click();
    await expect(page).toHaveURL(/\/admin\/clients\/[^/]+$/);

    await page.locator('a[role="tab"][href*="tab=contracts"]').click();
    expect(page.url()).toContain('tab=contracts');
  });
});

test.describe('design identity — productions', () => {
  /**
   * Η περιοχή των Παραγωγών (#108-#109) περνά στη νέα γλώσσα: κοινός
   * FormDialog, κοινός πίνακας για τα αιτήματα γυρίσματος, κοινή επικεφαλίδα
   * για τον κόμβο. Ο κόμβος ανοίγει στην καρτέλα `all` — κάθε άλλη καρτέλα
   * θέλει ρητά το δικό της `?tab=`.
   *
   * Δεν υπάρχει test που ανοίγει και ολοκληρώνει ένα FormDialog δημιουργίας:
   * θα έγραφε πραγματική εγγραφή στη βάση που δείχνει η σουίτα, και δεν
   * υπάρχουν fixtures ή teardown εδώ για να την καθαρίσουν.
   */

  test('/admin/productions?tab=requests — the requests list renders through the shared table', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/productions?tab=requests');
    await expect(page).toHaveURL(/\/admin\/productions\?tab=requests/);

    const tableContainer = page.locator('[data-slot="table-container"]').first();
    await expect(tableContainer.locator('table')).toBeVisible();
    await expect(tableContainer.locator('table thead tr').first()).toBeVisible();
  });

  test('/admin/productions?tab=all — exactly one page heading and the board renders', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/productions?tab=all');
    await expect(page).toHaveURL(/\/admin\/productions\?tab=all/);

    await expect(page.locator('[data-slot="page-heading"]')).toHaveCount(1);

    // Η προεπιλεγμένη προβολή είναι το kanban board· το toggle μόνο μετά το
    // mount του ProjectsContent αποδίδεται, άρα η ορατότητά του αποδεικνύει
    // ότι ο πίνακας πραγματικά τερμάτισε το render.
    await expect(page.getByRole('button', { name: /Λίστα|List/ })).toBeVisible();
  });

  test('/admin/calendar — the calendar still renders', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/calendar');
    await expect(page).toHaveURL(/\/admin\/calendar/);

    await expect(page.locator('[data-slot="page-heading"]')).toHaveCount(1);
    // Το ριζικό στοιχείο του FullCalendar — αποδεικνύει ότι η βιβλιοθήκη
    // πραγματικά mount-άρισε, όχι μόνο ότι η σελίδα φόρτωσε.
    await expect(page.locator('.fc').first()).toBeVisible();
  });
});

test.describe('design identity — detail folders', () => {
  /**
   * Τέσσερις ακόμα οθόνες λεπτομέρειας περνούν στο κοινό `DetailShell` (#109):
   * τιμολόγιο, lead, αίτημα γυρίσματος. Κάθε test φτάνει στην εγγραφή
   * πλοηγώντας από την πραγματική λίστα, ποτέ με ένα id από seed file.
   *
   * Κανένα test δεν ολοκληρώνει τον διάλογο ελέγχου, εγκρίνει, απορρίπτει ή
   * μετατρέπει — αυτές οι ενέργειες γράφουν εγγραφές και η σουίτα δεν έχει
   * fixtures ούτε teardown (#119). Το άνοιγμα του διαλόγου είναι η επιβεβαίωση·
   * το κλείσιμό του είναι η καθαριότητα.
   */

  test('an admin invoice: exactly one page heading and the back-link resolves to the finance hub', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/finance?tab=invoices');
    await expect(page).toHaveURL(/\/admin\/finance\?tab=invoices/);

    // Η προεπιλογή ομαδοποιεί τα τιμολόγια ανά πελάτη, κλειστά — ο σύνδεσμος
    // προς ένα πραγματικό τιμολόγιο ζει μέσα στην αναπτυγμένη κάρτα.
    const firstGroup = page.locator('[data-slot="card"]').first();
    await firstGroup.locator('button').first().click();
    const firstInvoiceLink = firstGroup.locator('a[href^="/admin/invoices/"]').first();
    await firstInvoiceLink.click();
    await expect(page).toHaveURL(/\/admin\/invoices\/[^/]+$/);

    await expect(page.locator('[data-slot="page-heading"]')).toHaveCount(1);
    // Ο προορισμός, όχι το stub — το `/admin/invoices` ανακατευθύνει εδώ.
    await expect(page.locator('a[href="/admin/finance?tab=invoices"]')).toBeVisible();
  });

  test('a lead: the activities tab is selected from the URL, not reset', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/clients?tab=interest');
    await expect(page).toHaveURL(/\/admin\/clients\?tab=interest/);

    const firstLeadLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href^="/admin/leads/"]')
      .first();
    await firstLeadLink.click();
    await expect(page).toHaveURL(/\/admin\/leads\/[^/]+$/);

    // Βαθύ σύνδεσμο απευθείας πάνω στην ίδια οθόνη λεπτομέρειας.
    await page.goto(`${page.url()}?tab=activities`);
    await expect(page).toHaveURL(/\/admin\/leads\/[^/]+\?tab=activities/);

    const activitiesTab = page.locator('a[role="tab"][href*="tab=activities"]');
    await expect(activitiesTab).toHaveAttribute('aria-selected', 'true');
  });

  test('a filming request: one page heading and the review dialog opens', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/productions?tab=requests');
    await expect(page).toHaveURL(/\/admin\/productions\?tab=requests/);

    const firstRequestLink = page
      .locator('table tbody tr')
      .first()
      .locator('a[href^="/admin/filming-requests/"]')
      .first();

    // Χωρίς αιτήματα δεν υπάρχει οθόνη λεπτομέρειας να ελεγχθεί. Η σουίτα δεν
    // έχει fixtures (#119), οπότε το περιεχόμενο της βάσης δεν είναι δεδομένο.
    test.skip((await firstRequestLink.count()) === 0, 'No filming request in this database');

    await firstRequestLink.click();
    await expect(page).toHaveURL(/\/admin\/filming-requests\/[^/]+$/);

    await expect(page.locator('[data-slot="page-heading"]')).toHaveCount(1);

    // Το κουμπί υπάρχει μόνο σε αίτημα που δεν έχει κριθεί ακόμα, και η λίστα
    // ΔΕΝ ταξινομεί κατά κατάσταση — η πρώτη γραμμή μπορεί κάλλιστα να είναι
    // ήδη εγκεκριμένη. Πριν από αυτόν τον έλεγχο το test κλικάριζε στα τυφλά
    // και θα κοκκίνιζε ανάλογα με το τι έτυχε να είναι πρώτο.
    const accept = page.getByRole('button', { name: /Αποδοχή|Accept/ });
    test.skip(
      (await accept.count()) === 0,
      'Newest request is already reviewed — no dialog to open',
    );

    // Το άνοιγμα είναι η επιβεβαίωση — κανένα submit, κανένα approve/reject/convert.
    await accept.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('design identity — client portal', () => {
  /**
   * Η φέτα #107 πέρασε το portal πελάτη στη νέα γλώσσα και σταμάτησε την αρχική
   * του να περιμένει ολόκληρο το query πριν ζωγραφίσει τίποτα. Εδώ χρησιμοποιείται
   * `loginAsClient`, όχι `loginAsAdmin`: ο middleware αφήνει έναν admin να μπει
   * και στο `/client/*`, αλλά χωρίς γραμμή στο `clients` οι νέοι cached readers
   * γυρνούν άδειο πίνακα — ένας admin θα έβλεπε άδειο portal και ο έλεγχος δεν
   * θα επιβεβαίωνε τίποτα. Ο πελάτης είναι επίσης ο μόνος ρόλος που περνά από
   * το RLS που εξαρτώνται αυτές οι σελίδες.
   */

  test('/client/home renders exactly one page heading and the stat strip', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsClient(page);
    await page.goto('/client/home');
    await expect(page).toHaveURL(/\/client\/home/);

    await expect(page.locator('[data-slot="page-heading"]')).toHaveCount(1);

    // Το πλέγμα στατιστικών ήταν η ενότητα που περίμενε πριν όλες τις υπόλοιπες
    // ερωτήσεις της αρχικής — τώρα ζει στο δικό της Suspense boundary.
    await expect(page.locator('[data-slot="stat-grid"]').first()).toBeVisible();
  });

  test('/client/documents?tab=invoices — tab is selected and its body renders', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsClient(page);
    await page.goto('/client/documents?tab=invoices');
    // Καρφιτσωμένο ρητά: το hub ανοίγει στα συμβόλαια, κάθε άλλη καρτέλα θέλει
    // το δικό της `?tab=`.
    await expect(page).toHaveURL(/\/client\/documents\?tab=invoices/);

    const invoicesTab = page.locator('a[role="tab"][href*="tab=invoices"]');
    await expect(invoicesTab).toHaveAttribute('aria-selected', 'true');

    // Το σώμα της καρτέλας είναι είτε η λίστα τιμολογίων (ποσό σε ευρώ πάνω σε
    // κάθε γραμμή) είτε η κενή κατάσταση — ποτέ η ίδια η ετικέτα της καρτέλας.
    const invoicesBody = page
      .getByText('€')
      .or(page.getByRole('heading', { name: /Δεν υπάρχουν τιμολόγια|No invoices yet/ }));
    await expect(invoicesBody.first()).toBeVisible();
  });

  test('/client/home at 390px wide does not scroll sideways', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsClient(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/client/home');
    await expect(page).toHaveURL(/\/client\/home/);

    const fitsWithoutSidewaysScroll = await page.evaluate(
      () => document.scrollingElement!.scrollWidth <= document.scrollingElement!.clientWidth + 1,
    );
    expect(fitsWithoutSidewaysScroll).toBe(true);
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
