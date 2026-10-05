#!/usr/bin/env node
// The main feed (KICKOFF §4c): the newest Grants.gov daily XML extract among the last four days, downloaded, stream-
// unzipped and stream-parsed (never loaded whole), slimmed, sharded by agency, cross-checked against search2.
//
// Usage: node scripts/harvest/grants-extract.mjs [outDir=public/data] [--zip file.zip | --xml file.xml] [--today YYYY-MM-DD] [--no-api]
//   --zip / --xml   use a local file instead of downloading (tests, fixtures, a re-run)
//   --no-api        skip the search2 / fetchOpportunity calls (labels then come from --labels, if given)
//   --labels f.json a search2 response to take labels from (fixtures)
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm, stat, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import yauzl from 'yauzl';
import {
  byAln, countBy, EXTRACT_URL, FETCH_OPP_URL, fetchOk, FORECAST, isoToday, keepRecord, KEEP_RULE, mergeManifest, OPP_COLUMNS, ALN_COLUMNS,
  parseExtract, readJson, SEARCH2_URL, shardByAgency, slimRecord, SYNOPSIS, writeJson, ymd, addDays,
} from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const outDir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'public/data');
const today = flag('--today') ?? isoToday();
const noApi = args.includes('--no-api');
const cache = resolve(here, '..', '.cache');
const XSD = 'https://apply07.grants.gov/apply/system/schemas/OpportunityDetail-V1.0.xsd';
const at = process.env.HARVEST_AT ?? new Date().toISOString();

/** Open the single XML entry of a zip as a stream (yauzl reads the central directory; the entry itself streams). */
function zipEntryStream(file) {
  return new Promise((res, rej) => {
    yauzl.open(file, { lazyEntries: true }, (err, zip) => {
      if (err) return rej(err);
      zip.on('entry', (e) => {
        if (!/\.xml$/i.test(e.fileName)) { zip.readEntry(); return; }
        zip.openReadStream(e, (e2, s) => (e2 ? rej(e2) : res({ stream: s, name: e.fileName, bytes: e.uncompressedSize })));
      });
      zip.on('end', () => rej(new Error('no XML entry in the zip')));
      zip.readEntry();
    });
  });
}

async function findExtract() {
  for (let back = 0; back < 4; back++) {
    const url = EXTRACT_URL(ymd(addDays(today, -back)));
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
      if (r.ok) return { url, lastModified: r.headers.get('last-modified'), bytes: Number(r.headers.get('content-length')) || null };
    } catch { /* try the day before */ }
  }
  return null;
}

async function search2(body) {
  const r = await fetchOk(SEARCH2_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: '', oppStatuses: 'posted|forecasted', rows: 1, ...body }) }, 60000);
  return r.json();
}

async function main() {
  const t0 = Date.now();
  let src; let zipFile = flag('--zip'); const xmlFile = flag('--xml');
  if (!zipFile && !xmlFile) {
    src = await findExtract();
    if (!src) throw Object.assign(new Error('no Grants.gov extract found among the last four days'), { status: 404 });
    await mkdir(cache, { recursive: true });
    zipFile = join(cache, src.url.split('/').pop());
    const have = await stat(zipFile).catch(() => null);
    if (!have || (src.bytes && have.size !== src.bytes)) {
      const r = await fetchOk(src.url, {}, 15 * 60000);
      await pipeline(Readable.fromWeb(r.body), createWriteStream(zipFile));
    }
    // keep only today's file in the cache
    for (const f of await readdir(cache)) if (/^GrantsDBExtract.*\.zip$/.test(f) && join(cache, f) !== zipFile) await rm(join(cache, f), { force: true });
  }
  const file = src?.url.split('/').pop() ?? (zipFile ?? xmlFile).split('/').pop();
  const input = xmlFile ? { stream: createReadStream(xmlFile), name: xmlFile.split('/').pop() } : await zipEntryStream(zipFile);

  const kept = [];
  const scanned = { [SYNOPSIS]: 0, [FORECAST]: 0, other: 0 };
  const seen = await parseExtract(input.stream, (kind, f) => {
    if (kind in scanned) scanned[kind]++; else scanned.other++;
    if (keepRecord(kind, f, today)) kept.push(slimRecord(kind, f));
  });
  const parsedMs = Date.now() - t0;

  // the XSD Grants.gov names in the file's own schemaLocation: its element names, beside the ones met in the file
  let xsdElements = null;
  if (!noApi) {
    try { const t = await (await fetchOk(XSD, {}, 30000)).text(); xsdElements = [...new Set([...t.matchAll(/<xs:element name="([A-Za-z0-9_]+)"/g)].map((m) => m[1]))]; } catch { xsdElements = null; }
  }

  // labels and the cross-check: Grants.gov's own search answers with the counts and the labels of every facet
  let labels = { applicant_types: {}, instruments: {}, categories: {}, source: 'not available: the Grants.gov search API was not reached at harvest time; codes are shown as the extract writes them' };
  let crossCheck = null;
  const counts = { total: kept.length, posted: kept.filter((r) => r.status === 'posted').length, forecast: kept.filter((r) => r.status === 'forecast').length, by_applicant_type: countBy(kept, (r) => r.applicantTypes) };
  const fromFacets = (d) => ({
    applicant_types: Object.fromEntries((d?.data?.eligibilities ?? []).map((e) => [e.value, e.label])),
    instruments: Object.fromEntries((d?.data?.fundingInstruments ?? []).map((e) => [e.value, e.label])),
    categories: Object.fromEntries((d?.data?.fundingCategories ?? []).map((e) => [e.value, e.label])),
    agencies: Object.fromEntries((d?.data?.agencies ?? []).map((e) => [e.value, e.label])),
  });
  let agencyNames = {};
  if (flag('--labels')) {
    const d = await readJson(resolve(flag('--labels')), null);
    const f = fromFacets(d); agencyNames = f.agencies;
    labels = { ...f, source: 'the Grants.gov search API (search2) facets, from a saved response' };
  }
  if (!noApi) {
    try {
      const all = await search2({});
      const f = fromFacets(all); agencyNames = f.agencies;
      labels = { applicant_types: f.applicant_types, instruments: f.instruments, categories: f.categories, source: `the Grants.gov search API (search2) facets, ${at.slice(0, 10)}` };
      const byType = {};
      for (const code of ['06', '20', '12', '13']) {
        let api = null;
        try { api = (await search2({ eligibilities: code }))?.data?.hitCount ?? null; } catch { api = null; }
        byType[code] = { api, extract: counts.by_applicant_type[code] ?? 0 };
      }
      const apiTotal = all?.data?.hitCount ?? null;
      const over = [];
      const off = (a, b) => a !== null && Math.abs(a - b) > 0.05 * Math.max(a, 1);
      if (off(apiTotal, counts.total)) over.push(`all notices (search2 ${apiTotal}, extract ${counts.total})`);
      for (const [c, v] of Object.entries(byType)) if (off(v.api, v.extract)) over.push(`applicant type ${c} (search2 ${v.api}, extract ${v.extract})`);
      crossCheck = { ok: true, at, api_total: apiTotal, extract_total: counts.total, by_type: byType, over_5pct: over, note: 'search2 counts posted and forecasted notices at the moment of the call; the extract was written earlier the same day' };
      // one fetchOpportunity response confirms the applicant-type labels as the record API gives them
      try {
        const id = kept.find((r) => r.status === 'posted')?.id;
        if (id) {
          const d = await (await fetchOk(FETCH_OPP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId: Number(id) }) }, 30000)).json();
          const s = d?.data?.synopsis ?? d?.data?.forecast ?? {};
          for (const a of s.applicantTypes ?? []) if (a?.id && !labels.applicant_types[a.id]) labels.applicant_types[a.id] = a.description;
          labels.source += `; confirmed against fetchOpportunity for notice ${id}`;
        }
      } catch { /* the facets stand */ }
    } catch (e) {
      crossCheck = { ok: false, at, api_total: null, extract_total: counts.total, by_type: {}, over_5pct: [], note: `search2 did not answer (${e.status ?? e.message})` };
    }
  }

  // write: shards by agency, the per-listing index, the schema seen, the index
  const opp = join(outDir, 'opportunities');
  await rm(join(opp, 'grants'), { recursive: true, force: true });
  await rm(join(opp, 'by-aln'), { recursive: true, force: true });
  const shards = shardByAgency(kept);
  for (const s of shards) await writeJson(join(opp, s.file), s.body);
  for (const [prefix, listings] of byAln(kept)) await writeJson(join(opp, 'by-aln', `${prefix}.json`), { columns: ALN_COLUMNS, listings });
  await writeJson(join(opp, 'schema-seen.json'), {
    file, harvestedAt: at, record_elements: Object.keys(seen), elements: seen, xsd: XSD, xsd_elements: xsdElements,
    note: 'Element names as met in the extract itself (record element → child element → count) and as declared by the XSD the file names in its schemaLocation.',
  });
  const agencies = [...new Set(kept.map((r) => r.topAgency))].sort().map((code) => {
    const list = kept.filter((r) => r.topAgency === code);
    return { code, name: agencyNames[code] ?? (list.find((r) => !r.agencyCode.includes('-'))?.agency || code), posted: list.filter((r) => r.status === 'posted').length, forecast: list.filter((r) => r.status === 'forecast').length, shards: shards.filter((s) => s.agency === code).map((s) => s.file) };
  });
  await writeJson(join(opp, 'index.json'), {
    harvestedAt: at, extract: { file, url: src?.url ?? null, lastModified: src?.lastModified ?? null, bytes: src?.bytes ?? null, entry: input.name },
    rule: KEEP_RULE, today, columns: OPP_COLUMNS, counts, scanned, agencies, labels, cross_check: crossCheck,
  });
  const result = { ok: true, file, count: kept.length, posted: counts.posted, forecast: counts.forecast, scanned, parse_ms: parsedMs, total_ms: Date.now() - t0, url: src?.url ?? null, cross_check: crossCheck ? { api_total: crossCheck.api_total, over_5pct: crossCheck.over_5pct } : null };
  await mergeManifest(join(outDir, 'manifest.json'), 'grants', result, at);
  console.log(`[grants] ${file}: scanned ${scanned[SYNOPSIS]} synopses + ${scanned[FORECAST]} forecasts; kept ${counts.posted} posted + ${counts.forecast} forecast in ${shards.length} shards; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (crossCheck) console.log(`[grants] search2 total ${crossCheck.api_total ?? 'n/a'} vs extract ${counts.total}${crossCheck.over_5pct.length ? `; over 5%: ${crossCheck.over_5pct.join('; ')}` : ''}`);
}

main().catch(async (e) => {
  console.error(`[grants] FAILED: ${e.message}`);
  await mergeManifest(join(outDir, 'manifest.json'), 'grants', { ok: false, status: e.status ?? null, message: e.message }, at).catch(() => {});
  process.exitCode = 1;
});
