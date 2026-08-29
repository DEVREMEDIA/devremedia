import { loadTestEnv } from './fixtures/env';
import { runTeardown } from './fixtures/teardown';

/**
 * Global teardown: delete the seeded graph.
 *
 * Playwright runs this whether the suite passed or failed, which is the point —
 * a failed run is exactly the one that must not leave rows behind. Failures here
 * are reported but never rethrown; a teardown error must not turn a green suite
 * red, and `pnpm e2e:teardown -- --all` exists to sweep whatever survived.
 */
async function globalTeardown(): Promise<void> {
  loadTestEnv();

  try {
    await runTeardown();
  } catch (error) {
    console.error('❌ Fixture teardown failed:', error instanceof Error ? error.message : error);
    console.log('   Run `pnpm e2e:teardown -- --all` to sweep leftover E2E- rows.');
  }
}

export default globalTeardown;
