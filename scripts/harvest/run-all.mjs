#!/usr/bin/env node
// Run every harvester in turn; keep going after a failure; exit 1 if any failed (KICKOFF §4c). Each one folds its
// result into public/data/manifest.json, and a failed source leaves the other sources' output in place.
// Usage: node scripts/harvest/run-all.mjs [outDir]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const extra = process.argv.slice(2);
const steps = [
  ['grants-extract.mjs', true],
  ['irs-bmf.mjs', true],
  ['irs-990-index.mjs', false],
  ['federal-register.mjs', false],
  ['nsf-rss.mjs', false],
];
const failed = [];
for (const [script, required] of steps) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(here, script), ...extra], { stdio: 'inherit', env: { ...process.env, HARVEST_AT: process.env.HARVEST_AT ?? new Date().toISOString() } });
  const ok = r.status === 0;
  console.log(`[harvest] ${script}: ${ok ? 'ok' : `FAILED (exit ${r.status ?? r.signal})`}${required ? '' : ' (optional)'} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!ok) failed.push(script);
}
if (failed.length) {
  console.error(`[harvest] failed: ${failed.join(', ')} — see failures[] in public/data/manifest.json`);
  process.exitCode = 1;
}
