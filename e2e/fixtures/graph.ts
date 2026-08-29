import fs from 'fs';
import path from 'path';

/**
 * The shape of the seeded fixture graph, and how specs get at it.
 *
 * Specs must address records by what they ARE — `fixtures().contracts.draft` —
 * never by position in a list. "The first row" is whatever the database happened
 * to sort first; it is not a draft contract, and on a shared database it is
 * somebody's real one.
 *
 * The seed writes a manifest to `e2e/.auth/fixture-run.json` (gitignored). This
 * module reads it once at import time, so a spec can ask `hasFixtures` at
 * collection time and skip cleanly when nothing has been seeded.
 */

export const MANIFEST_PATH = path.join(__dirname, '../.auth/fixture-run.json');

/** Prefix on every namespaced value the seed writes. Teardown sweeps on it. */
export const FIXTURE_PREFIX = 'E2E-';

export interface FixtureUser {
  /** auth.users id — also user_profiles.id */
  readonly id: string;
  readonly email: string;
  /** user_profiles.role */
  readonly role: 'admin' | 'client';
  readonly displayName: string;
}

export interface FixtureClient {
  readonly id: string;
  readonly companyName: string;
  readonly contactName: string;
  readonly email: string;
  /** null for the empty client, which has no portal login */
  readonly userId: string | null;
}

export interface FixtureProject {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly projectType: string;
}

export interface FixtureTask {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

export interface FixtureDeliverable {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

export interface FixtureContract {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

export interface FixtureInvoice {
  readonly id: string;
  readonly number: string;
  readonly status: string;
  readonly total: number;
}

export interface FixtureFilmingRequest {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

export interface FixtureMessage {
  readonly id: string;
  readonly content: string;
}

export interface FixtureLead {
  readonly id: string;
  readonly contactName: string;
  readonly companyName: string;
  readonly email: string;
  readonly stage: string;
}

export interface FixtureGraph {
  /** Short id unique to this seed run. Every namespaced value contains it. */
  readonly runId: string;
  /** `E2E-<runId>` — the string every seeded title/company/number starts with. */
  readonly namespace: string;
  readonly createdAt: string;

  readonly users: {
    readonly admin: FixtureUser;
    readonly client: FixtureUser;
  };

  /** The client with a full graph hanging off it, linked to `users.client`. */
  readonly client: FixtureClient;
  /** A second client with no projects, invoices or contracts. No portal login. */
  readonly emptyClient: FixtureClient;

  readonly projects: {
    /** status 'filming' — the live project most tests should use. */
    readonly active: FixtureProject;
    /** status 'delivered' — for completed-state assertions. */
    readonly delivered: FixtureProject;
  };

  readonly task: FixtureTask;
  readonly deliverable: FixtureDeliverable;

  readonly contracts: {
    /** status 'draft' — never sent; the one an admin can send. */
    readonly draft: FixtureContract;
    /** status 'sent' — unsigned and signable by the client. */
    readonly sent: FixtureContract;
    /** status 'signed' — has signature_data and signed_at. */
    readonly signed: FixtureContract;
  };

  readonly invoices: {
    /** status 'paid', paid_at set. */
    readonly paid: FixtureInvoice;
    /** status 'sent', due in the future, no paid_at. */
    readonly unpaid: FixtureInvoice;
  };

  /** status 'pending' — awaiting admin review. */
  readonly filmingRequest: FixtureFilmingRequest;
  /** One admin-authored message on `projects.active`, channel 'client'. */
  readonly message: FixtureMessage;
  /** stage 'new', assigned to the admin user. */
  readonly lead: FixtureLead;
}

function readManifest(): FixtureGraph | null {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as FixtureGraph;
  } catch {
    return null;
  }
}

/**
 * The seeded graph, or null when nothing has been seeded.
 * Use this only for the skip check; use `fixtures()` to read records.
 */
export const FIXTURE: FixtureGraph | null = readManifest();

/** Whether a seeded graph is available to this run. */
export const hasFixtures: boolean = FIXTURE !== null;

/**
 * The seeded graph. Throws if the seed has not run — call it inside a test that
 * has already guarded with `test.skip(!hasFixtures, ...)`.
 */
export function fixtures(): FixtureGraph {
  if (!FIXTURE) {
    throw new Error(
      'No E2E fixture graph. Run `pnpm e2e:seed` (or set E2E_SUPABASE_URL so globalSetup seeds ' +
        'automatically). Guard tests with `test.skip(!hasFixtures, ...)` — see e2e/SETUP.md.',
    );
  }
  return FIXTURE;
}

export function writeManifest(graph: FixtureGraph): void {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
}

export function deleteManifest(): void {
  if (fs.existsSync(MANIFEST_PATH)) fs.rmSync(MANIFEST_PATH);
}

/** Re-read the manifest from disk, bypassing the import-time snapshot. */
export function reloadManifest(): FixtureGraph | null {
  return readManifest();
}
