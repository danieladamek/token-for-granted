#!/usr/bin/env node
// Build the small offline harvest the Playwright suite and `npm run harvest:fixture` use, by running the real
// harvest scripts over the unit-test fixtures (tests/fixtures/harvest/), so the format can never drift from the real
// one. Nothing here touches the network.
// Usage: node scripts/harvest/make-fixture.mjs [outDir=public/data]
import { spawnSync } from 'node:child_process';
import { rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const fx = join(root, 'tests', 'fixtures', 'harvest');
const outDir = resolve(process.argv[2] || join(root, 'public', 'data'));
// Fixed clock: the fixture extract is the real one of 2026-10-05, cut down to 30 records.
const TODAY = '2026-10-05';
const env = { ...process.env, HARVEST_AT: `${TODAY}T09:43:00.000Z` };

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const run = (script, args) => {
  const r = spawnSync(process.execPath, [join(here, script), outDir, ...args], { stdio: 'inherit', env });
  if (r.status !== 0) { console.error(`[fixture] ${script} failed (exit ${r.status})`); process.exit(1); }
};
run('grants-extract.mjs', ['--xml', join(fx, 'extract-30.xml'), '--today', TODAY, '--no-api', '--labels', join(fx, 'search2-facets.json')]);
run('irs-bmf.mjs', ['--dir', fx, '--states', 'de', '--doc', join(fx, 'eo-info-foundation-codes.txt')]);
run('recent.mjs', ['--fr-file', join(fx, 'federal-register-3.json'), '--rss-file', join(fx, 'nsf-rss-3.xml')]);
console.log(`[fixture] wrote ${outDir}`);
