import {
  createFixtureDb,
  describeFixtureTarget,
  isFixtureDbConfigured,
  type FixtureDb,
} from './supabase-admin';
import { deleteManifest, FIXTURE_PREFIX, reloadManifest, type FixtureGraph } from './graph';

/**
 * Teardown for the E2E fixture graph.
 *
 * Two modes:
 *  - default: delete exactly the records named in `e2e/.auth/fixture-run.json`.
 *  - `--all`:  sweep every `E2E-` namespaced row, whoever created it. This is the
 *              recovery path after a crashed run left the manifest behind.
 *
 * Deletion is in reverse foreign-key order. Several parents cascade to their
 * children, but the tables that reference a project with ON DELETE SET NULL
 * (invoices, contracts, filming_requests) would survive the parent, so they are
 * deleted explicitly first. `activity_log.user_id` is ON DELETE SET NULL too, so
 * those rows are removed before the auth users they point at.
 */

type Counts = Record<string, number>;

const add = (counts: Counts, table: string, n: number): void => {
  if (n > 0) counts[table] = (counts[table] ?? 0) + n;
};

async function deleteWhereIn(
  db: FixtureDb,
  table: string,
  column: string,
  values: readonly string[],
  counts: Counts,
): Promise<void> {
  if (values.length === 0) return;

  const { data, error } = await db.from(table).delete().in(column, values).select('id');
  if (error) throw new Error(`delete from ${table} failed: ${error.message}`);
  add(counts, table, (data as unknown[] | null)?.length ?? 0);
}

async function deleteWherePrefix(
  db: FixtureDb,
  table: string,
  column: string,
  counts: Counts,
): Promise<void> {
  const { data, error } = await db
    .from(table)
    .delete()
    .like(column, `${FIXTURE_PREFIX}%`)
    .select('id');
  if (error) throw new Error(`delete from ${table} failed: ${error.message}`);
  add(counts, table, (data as unknown[] | null)?.length ?? 0);
}

async function selectIdsWherePrefix(
  db: FixtureDb,
  table: string,
  column: string,
): Promise<string[]> {
  const { data, error } = await db.from(table).select('id').like(column, `${FIXTURE_PREFIX}%`);
  if (error) throw new Error(`select from ${table} failed: ${error.message}`);
  return ((data as { id: string }[] | null) ?? []).map((row) => row.id);
}

/** Everything that hangs off a project and does not disappear with it. */
async function deleteProjectChildren(
  db: FixtureDb,
  projectIds: readonly string[],
  counts: Counts,
): Promise<void> {
  await deleteWhereIn(db, 'messages', 'project_id', projectIds, counts);
  await deleteWhereIn(db, 'deliverables', 'project_id', projectIds, counts);
  await deleteWhereIn(db, 'tasks', 'project_id', projectIds, counts);
  await deleteWhereIn(db, 'calendar_events', 'project_id', projectIds, counts);
  await deleteWhereIn(db, 'expenses', 'project_id', projectIds, counts);
}

/** Rows the app writes as a side effect of test actions, keyed by user. */
async function deleteUserTrail(
  db: FixtureDb,
  userIds: readonly string[],
  counts: Counts,
): Promise<void> {
  await deleteWhereIn(db, 'notifications', 'user_id', userIds, counts);
  await deleteWhereIn(db, 'activity_log', 'user_id', userIds, counts);
}

async function deleteAuthUsers(
  db: FixtureDb,
  userIds: readonly string[],
  counts: Counts,
): Promise<void> {
  for (const id of userIds) {
    const { error } = await db.auth.admin.deleteUser(id);
    // A user already gone is the desired end state, not a failure.
    if (error && !/not found/i.test(error.message)) {
      throw new Error(`deleteUser(${id}) failed: ${error.message}`);
    }
    if (!error) add(counts, 'auth.users', 1);
  }
}

/** Delete exactly the records this run created. */
export async function teardownRun(db: FixtureDb, graph: FixtureGraph): Promise<Counts> {
  const counts: Counts = {};

  const projectIds = [graph.projects.active.id, graph.projects.delivered.id];
  const clientIds = [graph.client.id, graph.emptyClient.id];
  const userIds = [graph.users.admin.id, graph.users.client.id];

  await deleteWhereIn(db, 'lead_activities', 'lead_id', [graph.lead.id], counts);
  await deleteWhereIn(db, 'leads', 'id', [graph.lead.id], counts);

  await deleteWhereIn(db, 'video_annotations', 'deliverable_id', [graph.deliverable.id], counts);
  await deleteProjectChildren(db, projectIds, counts);

  await deleteWhereIn(db, 'invoices', 'client_id', clientIds, counts);
  await deleteWhereIn(db, 'contracts', 'client_id', clientIds, counts);
  await deleteWhereIn(db, 'filming_requests', 'client_id', clientIds, counts);

  await deleteWhereIn(db, 'projects', 'id', projectIds, counts);
  await deleteWhereIn(db, 'clients', 'id', clientIds, counts);

  await deleteUserTrail(db, userIds, counts);
  await deleteAuthUsers(db, userIds, counts);

  return counts;
}

async function listNamespacedUserIds(db: FixtureDb): Promise<string[]> {
  const ids: string[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);

    const users = (data?.users ?? []) as { id: string; email?: string }[];
    for (const user of users) {
      if (user.email?.toLowerCase().startsWith('e2e-')) ids.push(user.id);
    }
    if (users.length < perPage) break;
  }

  return ids;
}

/** Sweep every `E2E-` namespaced row, including leftovers from crashed runs. */
export async function sweepNamespace(db: FixtureDb): Promise<Counts> {
  const counts: Counts = {};

  const projectIds = await selectIdsWherePrefix(db, 'projects', 'title');
  const leadIds = await selectIdsWherePrefix(db, 'leads', 'company_name');
  const deliverableIds = await selectIdsWherePrefix(db, 'deliverables', 'title');

  await deleteWhereIn(db, 'lead_activities', 'lead_id', leadIds, counts);
  await deleteWhereIn(db, 'leads', 'id', leadIds, counts);

  await deleteWhereIn(db, 'video_annotations', 'deliverable_id', deliverableIds, counts);
  await deleteProjectChildren(db, projectIds, counts);

  await deleteWherePrefix(db, 'invoices', 'invoice_number', counts);
  await deleteWherePrefix(db, 'contracts', 'title', counts);
  await deleteWherePrefix(db, 'filming_requests', 'title', counts);
  await deleteWherePrefix(db, 'deliverables', 'title', counts);
  await deleteWherePrefix(db, 'tasks', 'title', counts);

  await deleteWhereIn(db, 'projects', 'id', projectIds, counts);
  await deleteWherePrefix(db, 'clients', 'company_name', counts);

  const userIds = await listNamespacedUserIds(db);
  await deleteUserTrail(db, userIds, counts);
  await deleteAuthUsers(db, userIds, counts);

  return counts;
}

function report(label: string, counts: Counts): void {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    console.log(`  ${label}: nothing to delete`);
    return;
  }
  console.log(`  ${label}:`);
  for (const [table, n] of entries) console.log(`    - ${table}: ${n}`);
}

/**
 * Tear down. Returns silently when no database is configured — a run that never
 * seeded has nothing to clean, and globalTeardown must not fail the suite.
 */
export async function runTeardown(options: { all?: boolean } = {}): Promise<void> {
  if (!isFixtureDbConfigured()) {
    console.log('ℹ️  E2E_SUPABASE_URL not set — nothing to tear down.');
    return;
  }

  const db = createFixtureDb();
  console.log(`🧹 Tearing down E2E fixtures on ${describeFixtureTarget()}`);

  const graph = reloadManifest();
  if (graph) {
    report(`run ${graph.runId}`, await teardownRun(db, graph));
  } else if (!options.all) {
    console.log('  no fixture-run.json — nothing recorded to delete');
  }

  if (options.all) {
    report(`namespace sweep (${FIXTURE_PREFIX}*)`, await sweepNamespace(db));
  }

  deleteManifest();
  console.log('✓ Teardown complete');
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('e2e/fixtures/teardown.ts');

if (isDirectRun) {
  runTeardown({ all: process.argv.includes('--all') }).catch((error: unknown) => {
    console.error('❌ Teardown failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
