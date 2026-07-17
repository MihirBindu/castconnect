#!/usr/bin/env node
// ============================================================================
// Non-destructive database seed.
//
// Loads `supabase/seed.sql` into the database named by DATABASE_URL *without*
// dropping the schema (unlike `npm run db:reset`, which drops the public schema
// and replays every migration first). Safe to re-run: seed.sql deletes and
// re-inserts only the demo rows (ids `00000000-…` / `cc…`), so real user data
// is never touched.
//
// Usage:   npm run db:seed
// Requires: DATABASE_URL in .env — Supabase → Settings → Database →
//           Connection string (URI). Needs the database to be reachable
//           (port 5432/6543); if your network blocks it, run it off the VPN.
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Minimal .env loader (no dependency; real env vars take precedence) ------
function loadEnvFile(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return; // no .env — rely on the process environment
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trimStart().startsWith('#')) continue;
    const [, key] = m;
    if (process.env[key] !== undefined) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(join(root, '.env'));

const url = process.env.DATABASE_URL;
if (!url || url.includes('[password]') || url.includes('your-project-id')) {
  console.error('✗ DATABASE_URL is not set (or is still the placeholder).');
  console.error('  Add it to .env — Supabase → Settings → Database → Connection string (URI):');
  console.error('    DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres');
  process.exit(1);
}

const seedPath = join(root, 'supabase', 'seed.sql');
let sql;
try {
  sql = readFileSync(seedPath, 'utf8');
} catch {
  console.error(`✗ Could not read ${seedPath}`);
  process.exit(1);
}

// Supabase requires SSL; a local Postgres typically does not.
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const started = Date.now();
try {
  console.log('→ Connecting…');
  await client.connect();
  console.log('→ Loading supabase/seed.sql…');
  // A multi-statement simple query runs as a single implicit transaction in
  // Postgres, so any failure rolls the whole seed back — no half-applied state.
  await client.query(sql);
  const { rows } = await client.query(
    `select
       (select count(*) from public.profiles      where id::text like '00000000-0000-4000-8000-%') as profiles,
       (select count(*) from public.casting_calls  where id::text like 'cc%')                       as casting_calls,
       (select count(*) from public.messages       where id::text like 'bb1%')                      as messages`
  );
  const { profiles, casting_calls, messages } = rows[0];
  console.log(
    `✓ Seeded in ${((Date.now() - started) / 1000).toFixed(1)}s — ` +
      `${profiles} demo profiles, ${casting_calls} casting calls, ${messages} messages.`
  );
} catch (err) {
  console.error('✗ Seed failed:', err.message);
  if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|connection reset/i.test(err.message)) {
    console.error('  Looks like a network issue reaching the database. If your');
    console.error('  network/VPN blocks Postgres (port 5432/6543), try another network.');
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
