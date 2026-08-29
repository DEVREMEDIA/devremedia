import fs from 'fs';
import path from 'path';

/**
 * Minimal `.env.test` loader.
 *
 * The fixture layer needs its own environment file, separate from `.env.local`,
 * because `.env.local` points at PRODUCTION Supabase and nothing here may ever
 * touch it. Rather than add a dependency, this reads the handful of `KEY=VALUE`
 * lines the layer needs. Existing `process.env` values always win, so CI can
 * pass secrets without a file on disk.
 */

const ENV_FILE = path.join(__dirname, '../../.env.test');

const stripQuotes = (value: string): string =>
  (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
    ? value.slice(1, -1)
    : value;

const parseLine = (line: string): [string, string] | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separator = trimmed.indexOf('=');
  if (separator === -1) return null;

  const key = trimmed.slice(0, separator).trim();
  if (!key) return null;

  return [key, stripQuotes(trimmed.slice(separator + 1).trim())];
};

/**
 * Load `.env.test` into `process.env` if it exists. Never overwrites a value
 * that is already set. Safe to call more than once.
 */
export function loadTestEnv(): void {
  if (!fs.existsSync(ENV_FILE)) return;

  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const entry = parseLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** Read a required variable, or throw with the name that is missing. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The E2E fixture layer refuses to run without it — see e2e/SETUP.md.`,
    );
  }
  return value;
}
