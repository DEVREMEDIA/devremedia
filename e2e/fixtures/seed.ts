import { loadTestEnv } from './env';
import {
  createFixtureDb,
  describeFixtureTarget,
  isFixtureDbConfigured,
  type FixtureDb,
} from './supabase-admin';
import { FIXTURE_PREFIX, reloadManifest, writeManifest, type FixtureGraph } from './graph';
import {
  seedClients,
  seedContracts,
  seedFilmingRequest,
  seedInvoices,
  seedLead,
  seedProjectWork,
  seedProjects,
  seedUsers,
  type OwnerIds,
  type SeedNames,
} from './records';
import { teardownRun } from './teardown';

/**
 * Seeds a known, disposable graph for the E2E suite.
 *
 * Every value a spec can see is namespaced `E2E-<runId>` — company names,
 * project and contract titles, invoice numbers, user emails — so teardown can
 * find the whole run and delete it wholesale, and so no assertion ever has to
 * mean "the first row in the table".
 *
 * The record builders live in `records.ts`; this file is the order they happen
 * in and the safety checks in front of them.
 */

function newRunId(): string {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 6);
  return `${stamp}${noise}`;
}

async function buildGraph(db: FixtureDb, names: SeedNames): Promise<FixtureGraph> {
  const users = await seedUsers(db, names);
  const clients = await seedClients(db, names, users.client.id);
  const projects = await seedProjects(db, names, clients.client.id, users.admin.id);
  const work = await seedProjectWork(db, names, projects.active.id, users.admin.id);

  const ids: OwnerIds = {
    clientId: clients.client.id,
    projectId: projects.active.id,
    adminId: users.admin.id,
  };

  const contracts = await seedContracts(db, names, ids);
  const invoices = await seedInvoices(db, names, ids);
  const filmingRequest = await seedFilmingRequest(db, names, clients.client.id);
  const lead = await seedLead(db, names, users.admin.id);

  return {
    runId: names.runId,
    namespace: names.namespace,
    createdAt: new Date().toISOString(),
    users,
    client: clients.client,
    emptyClient: clients.emptyClient,
    projects,
    task: work.task,
    deliverable: work.deliverable,
    message: work.message,
    contracts,
    invoices,
    filmingRequest,
    lead,
  };
}

function reportGraph(graph: FixtureGraph): void {
  console.log(`✓ Seeded fixture run ${graph.runId} (namespace ${graph.namespace})`);
  console.log(`    - auth.users: 2 (${graph.users.admin.email}, ${graph.users.client.email})`);
  console.log('    - clients: 2 (one full graph, one empty)');
  console.log('    - projects: 2, tasks: 1, deliverables: 1, messages: 1');
  console.log('    - contracts: 3 (draft, sent, signed)');
  console.log('    - invoices: 2 (paid, unpaid)');
  console.log('    - filming_requests: 1, leads: 1');
}

function assertSeedable(): void {
  if (!isFixtureDbConfigured()) {
    throw new Error(
      'E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY must both be set before seeding. ' +
        'They are deliberately separate from the app variables so a production database cannot ' +
        'be seeded by accident — see e2e/SETUP.md.',
    );
  }

  if (!process.env.E2E_ADMIN_PASSWORD || !process.env.E2E_CLIENT_PASSWORD) {
    throw new Error(
      'E2E_ADMIN_PASSWORD and E2E_CLIENT_PASSWORD must be set. Generate them; ' +
        'do not reuse a real password. See e2e/SETUP.md.',
    );
  }
}

/**
 * Seed, writing `e2e/.auth/fixture-run.json`.
 *
 * Idempotent per runId: seeding over an existing manifest tears that run down
 * first, so re-running never leaves two half-graphs behind.
 */
export async function runSeed(): Promise<FixtureGraph> {
  loadTestEnv();
  assertSeedable();

  const db = createFixtureDb();
  console.log(`🌱 Seeding E2E fixtures on ${describeFixtureTarget()}`);

  const previous = reloadManifest();
  if (previous) {
    console.log(`  → clearing previous run ${previous.runId}`);
    await teardownRun(db, previous);
  }

  const runId = process.env.E2E_RUN_ID ?? newRunId();
  const graph = await buildGraph(db, { runId, namespace: `${FIXTURE_PREFIX}${runId}` });

  writeManifest(graph);
  reportGraph(graph);

  return graph;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('e2e/fixtures/seed.ts');

if (isDirectRun) {
  runSeed().catch((error: unknown) => {
    console.error('❌ Seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
