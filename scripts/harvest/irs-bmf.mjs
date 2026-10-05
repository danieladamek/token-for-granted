#!/usr/bin/env node
// The foundation directory (KICKOFF §4c): every private foundation in the IRS exempt-organisation master file.
// The FOUNDATION code labels are taken word for word from the IRS's own documentation (the EO BMF information sheet
// linked from the "Exempt Organizations Business Master File Extract" page), fetched at harvest time and read with
// pdftotext; the rows kept are those whose code that documentation labels a private foundation (operating and
// non-operating). If the documentation cannot be fetched or read, the rows kept are those with a non-zero
// PF_FILING_REQ_CD, the codes are shown raw, and the index says so.
//
// Usage: node scripts/harvest/irs-bmf.mjs [outDir=public/data] [--dir folder-of-eo_xx.csv] [--states al,ak] [--doc info.txt]
import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { BMF_PAGE, BMF_STATES, BMF_URL, fetchOk, foundationShard, mergeManifest, parseBmf, parseFoundationCodes, privateFoundationCodes, writeJson } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const outDir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'public/data');
const localDir = flag('--dir');
const states = (flag('--states') ?? BMF_STATES.join(',')).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const cache = resolve(here, '..', '.cache');
const at = process.env.HARVEST_AT ?? new Date().toISOString();

/** Fetch the information sheet the IRS page links to and read its FOUNDATION code table. */
async function documentation() {
  if (flag('--doc')) return { url: 'local file', codes: parseFoundationCodes(await readFile(resolve(flag('--doc')), 'utf8')) };
  const html = await (await fetchOk(BMF_PAGE, {}, 60000)).text();
  const href = [...html.matchAll(/href="([^"]+\.pdf)"/gi)].map((m) => m[1]).find((h) => /eo[-_]?info/i.test(h));
  if (!href) throw new Error('no information-sheet link on the EO BMF page');
  const url = new URL(href, BMF_PAGE).toString();
  const pdf = Buffer.from(await (await fetchOk(url, {}, 60000)).arrayBuffer());
  await mkdir(cache, { recursive: true });
  const file = join(cache, 'eo-info.pdf');
  await writeFile(file, pdf);
  const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const codes = parseFoundationCodes(text);
  if (!Object.keys(codes).length) throw new Error('the information sheet has no FOUNDATION CODE table that could be read');
  return { url, codes };
}

async function main() {
  const t0 = Date.now();
  let doc = null; let docError = null;
  try { doc = await documentation(); } catch (e) { docError = e.message; }
  const keepCodes = doc ? privateFoundationCodes(doc.codes) : null;
  if (doc && !keepCodes.length) { docError = 'the documentation labels no code as a private foundation'; }
  const useCodes = doc && keepCodes.length ? keepCodes : null;

  const all = []; const missing = []; const sourceUrls = [];
  for (const st of states) {
    try {
      let stream;
      if (localDir) stream = createReadStream(join(resolve(localDir), `eo_${st}.csv`));
      else { const r = await fetchOk(BMF_URL(st), {}, 10 * 60000); stream = Readable.fromWeb(r.body); }
      const rows = await parseBmf(stream, { keepCodes: useCodes });
      all.push(...rows);
      sourceUrls.push(localDir ? `eo_${st}.csv` : BMF_URL(st));
    } catch (e) { missing.push(`${st} (${e.status ?? e.code ?? e.message})`); }
  }
  if (!all.length) throw Object.assign(new Error(`no rows: ${missing.join(', ')}`), { status: null });

  const dir = join(outDir, 'foundations');
  await rm(dir, { recursive: true, force: true });
  const byState = {};
  for (const r of all) (byState[r.state || 'unknown'] ??= []).push(r);
  for (const [st, rows] of Object.entries(byState)) await writeJson(join(dir, `${st.toLowerCase()}.json`), foundationShard(rows.sort((a, b) => (b.assets ?? 0) - (a.assets ?? 0) || a.name.localeCompare(b.name))));
  const top = [...all].sort((a, b) => (b.assets ?? 0) - (a.assets ?? 0)).slice(0, 500);
  await writeJson(join(dir, 'top.json'), foundationShard(top));
  const codes = doc ? Object.fromEntries((useCodes ?? Object.keys(doc.codes)).map((c) => [c, doc.codes[c]])) : Object.fromEntries([...new Set(all.map((r) => r.code))].sort().map((c) => [c, '']));
  await writeJson(join(dir, 'index.json'), {
    harvestedAt: at, total: all.length, by_state: Object.fromEntries(Object.entries(byState).map(([k, v]) => [k, v.length]).sort()),
    columns: foundationShard([]).columns, codes, codes_from_documentation: !!useCodes, all_codes: doc?.codes ?? null,
    codes_source: useCodes ? `the FOUNDATION CODE table of the IRS EO BMF information sheet, word for word (${doc.url})` : `not available (${docError}); rows kept by a non-zero PF_FILING_REQ_CD and codes shown raw`,
    documentation_url: doc?.url ?? null, documentation_page: BMF_PAGE, source_urls: sourceUrls, missing_states: missing, efile: null,
  });
  await mergeManifest(join(outDir, 'manifest.json'), 'irs_bmf', { ok: true, count: all.length, states: Object.keys(byState).length, missing, codes_from_documentation: !!useCodes, url: BMF_PAGE, total_ms: Date.now() - t0 }, at);
  console.log(`[irs-bmf] ${all.length} private foundations in ${Object.keys(byState).length} states${missing.length ? `; missing ${missing.join(', ')}` : ''}; codes ${useCodes ? useCodes.join(', ') + ' from the documentation' : 'raw'}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main().catch(async (e) => {
  console.error(`[irs-bmf] FAILED: ${e.message}`);
  await mergeManifest(join(outDir, 'manifest.json'), 'irs_bmf', { ok: false, status: e.status ?? null, message: e.message }, at).catch(() => {});
  process.exitCode = 1;
});
