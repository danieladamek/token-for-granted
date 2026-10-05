#!/usr/bin/env node
// Optional and non-fatal (KICKOFF §4c): stream the IRS 990 e-file index for the current year (54 MB; it ignores range
// requests) and, for EINs in the foundation directory, record the latest 990PF row's tax period and submission date.
// The filings themselves are not downloaded or parsed — that harvest is unprobed and is a backlog item.
//
// Usage: node scripts/harvest/irs-990-index.mjs [outDir=public/data] [--file index.csv] [--year 2026]
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fetchOk, foundationShard, mergeManifest, parseEfileIndex, readJson, writeJson } from './lib.mjs';
import { readdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const outDir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'public/data');
const year = Number(flag('--year') ?? new Date().getUTCFullYear());
const URL_OF = (y) => `https://apps.irs.gov/pub/epostcard/990/xml/${y}/index_${y}.csv`;
const at = process.env.HARVEST_AT ?? new Date().toISOString();

async function main() {
  const dir = join(outDir, 'foundations');
  const idx = await readJson(join(dir, 'index.json'), null);
  if (!idx) throw new Error('no foundation directory to match against (run irs-bmf first)');
  const files = (await readdir(dir)).filter((f) => /^[a-z]+\.json$/.test(f) && f !== 'index.json');
  const shards = new Map();
  for (const f of files) shards.set(f, await readJson(join(dir, f), null));
  const eins = new Set();
  for (const s of shards.values()) for (const r of s?.rows ?? []) eins.add(String(r[0]).padStart(9, '0'));
  const url = flag('--file') ? 'local file' : URL_OF(year);
  const stream = flag('--file') ? createReadStream(resolve(flag('--file'))) : Readable.fromWeb((await fetchOk(URL_OF(year), {}, 15 * 60000)).body);
  const best = await parseEfileIndex(stream, eins);
  for (const [f, s] of shards) {
    if (!s) continue;
    const col = s.columns.indexOf('lastEfile');
    for (const r of s.rows) { const b = best.get(String(r[0]).padStart(9, '0')); r[col] = b ? `${b.taxPeriod}${b.subDate ? ` (submitted ${b.subDate})` : ''}` : null; }
    await writeJson(join(dir, f), s);
  }
  idx.efile = { ok: true, year, url, matched: best.size };
  await writeJson(join(dir, 'index.json'), idx);
  await mergeManifest(join(outDir, 'manifest.json'), 'irs_990_index', { ok: true, count: best.size, url, year }, at);
  console.log(`[irs-990-index] ${best.size} foundations matched to a ${year} 990PF row`);
  void foundationShard;
}

main().catch(async (e) => {
  console.error(`[irs-990-index] FAILED (non-fatal): ${e.message}`);
  await mergeManifest(join(outDir, 'manifest.json'), 'irs_990_index', { ok: false, status: e.status ?? null, message: e.message }, at).catch(() => {});
  process.exitCode = 1;
});
