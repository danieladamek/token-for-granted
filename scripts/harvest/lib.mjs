// Shared helpers for the Token for Granted nightly harvest (KICKOFF §4c). Pure where it can be, so Vitest drives it:
// the parsers take streams or strings and return data; the network lives in the per-source scripts.
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { SaxesParser } from 'saxes';

export const USER_AGENT = 'token-for-granted-harvest (github.com/danieladamek/token-for-granted)';
export const EXTRACT_URL = (ymd) => `https://prod-grants-gov-chatbot.s3.amazonaws.com/extracts/GrantsDBExtract${ymd}v2.zip`;
export const SEARCH2_URL = 'https://api.grants.gov/v1/api/search2';
export const FETCH_OPP_URL = 'https://api.grants.gov/v1/api/fetchOpportunity';
export const SHARD_MAX_BYTES = 1.5 * 1024 * 1024;
export const EXCERPT_DESC = 400;
export const EXCERPT_ELIG = 300;

/** The two record elements of the extract, as the file names them (read from the file; see schema-seen.json). */
export const SYNOPSIS = 'OpportunitySynopsisDetail_1_0';
export const FORECAST = 'OpportunityForecastDetail_1_0';
/** Elements that repeat inside one record. */
export const MULTI = new Set(['EligibleApplicants', 'CFDANumbers', 'CategoryOfFundingActivity', 'FundingInstrumentType']);

/** The slim record, in row order (KICKOFF §4c). */
export const OPP_COLUMNS = ['id', 'number', 'title', 'agencyCode', 'agency', 'topAgency', 'status', 'postDate', 'closeDate', 'lastUpdated', 'estPostDate', 'estDueDate',
  'applicantTypes', 'eligibilityNote', 'instruments', 'categories', 'als', 'ceiling', 'floor', 'totalFunding', 'awards', 'costSharing', 'excerpt', 'link'];

// ---------------------------------------------------------------- dates and text

/** The extract writes dates as MMDDYYYY; return ISO YYYY-MM-DD, or '' when absent or malformed. */
export function mdyToIso(s) {
  const t = String(s ?? '').trim();
  const m = /^(\d{2})(\d{2})(\d{4})$/.exec(t);
  if (!m) return '';
  return `${m[3]}-${m[1]}-${m[2]}`;
}
export const isoToday = (d = new Date()) => d.toISOString().slice(0, 10);
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const ymd = (iso) => iso.replaceAll('-', '');

/** Decode the extract's doubly-escaped entities (`&amp;lt;br/&amp;gt;` arrives as `&lt;br/&gt;`), drop tags, collapse space. */
export function cleanText(s) {
  return String(s ?? '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
export function excerpt(s, n) {
  const t = cleanText(s);
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}
const num = (s) => { const t = String(s ?? '').trim(); if (!t) return null; const n = Number(t.replace(/,/g, '')); return Number.isFinite(n) ? n : null; };

// ---------------------------------------------------------------- the extract

/**
 * Stream-parse the Grants.gov XML extract. Calls `onRecord(kind, fields)` for every record element, where `fields`
 * maps child element name → string (or string[] for the MULTI elements). Records the element names it meets in
 * `seen` (record element → child → count), so the mapping is read from the file itself.
 * @param {AsyncIterable<Buffer|string>} chunks
 */
export async function parseExtract(chunks, onRecord, seen = {}) {
  const parser = new SaxesParser({ xmlns: false });
  let depth = 0; let rec = null; let kind = null; let field = null; let text = '';
  const local = (n) => n.replace(/^.*:/, '');
  parser.on('opentag', (t) => {
    depth++;
    const name = local(t.name);
    if (depth === 2) { kind = name; rec = {}; seen[name] ??= {}; }
    else if (depth === 3 && rec) { field = name; text = ''; }
  });
  parser.on('text', (t) => { if (field) text += t; });
  parser.on('cdata', (t) => { if (field) text += t; });
  parser.on('closetag', (t) => {
    const name = local(t.name);
    if (depth === 3 && rec && field === name) {
      seen[kind][name] = (seen[kind][name] ?? 0) + 1;
      if (MULTI.has(name)) (rec[name] ??= []).push(text.trim());
      else rec[name] = text;
      field = null;
    } else if (depth === 2 && rec) { onRecord(kind, rec); rec = null; kind = null; }
    depth--;
  });
  let err = null;
  parser.on('error', (e) => { err = e; });
  for await (const c of chunks) { parser.write(typeof c === 'string' ? c : c.toString('utf8')); if (err) throw err; }
  parser.close();
  if (err) throw err;
  return seen;
}

/**
 * Which records to keep (KICKOFF §4c, as amended by what the file shows): a posted notice whose close date is empty
 * or not earlier than yesterday, and every forecast — in both cases only while not yet archived (an ArchiveDate before
 * today). The archive test is what makes the extract's counts agree with Grants.gov's own search (the probe of
 * 2026-10-05: 860 posted + 610 forecast = 1,470 = search2's posted|forecasted total).
 */
export const KEEP_RULE = 'posted notices whose close date is empty or not earlier than yesterday, and every forecast; in both cases only those whose archive date has not passed (Grants.gov archives a notice after its close date, and its own search counts only notices not yet archived).';
export function keepRecord(kind, f, today) {
  const archive = mdyToIso(f.ArchiveDate);
  if (archive && archive < today) return false;
  if (kind === FORECAST) return true;
  if (kind !== SYNOPSIS) return false;
  const close = mdyToIso(f.CloseDate);
  return !close || close >= addDays(today, -1);
}

export const topAgencyOf = (code) => (String(code ?? '').split('-')[0] || 'UNKNOWN').toUpperCase();

/** One slim record (KICKOFF §4c fields). */
export function slimRecord(kind, f) {
  const forecast = kind === FORECAST;
  const id = String(f.OpportunityID ?? '').trim();
  return {
    id, number: cleanText(f.OpportunityNumber), title: cleanText(f.OpportunityTitle), agencyCode: cleanText(f.AgencyCode), agency: cleanText(f.AgencyName),
    topAgency: topAgencyOf(f.AgencyCode), status: forecast ? 'forecast' : 'posted',
    postDate: mdyToIso(f.PostDate), closeDate: forecast ? '' : mdyToIso(f.CloseDate), lastUpdated: mdyToIso(f.LastUpdatedDate),
    estPostDate: forecast ? mdyToIso(f.EstimatedSynopsisPostDate) : '', estDueDate: forecast ? mdyToIso(f.EstimatedSynopsisCloseDate) : '',
    applicantTypes: [...new Set((f.EligibleApplicants ?? []).map((x) => x.trim()).filter(Boolean))],
    eligibilityNote: excerpt(f.AdditionalInformationOnEligibility, EXCERPT_ELIG),
    instruments: [...new Set((f.FundingInstrumentType ?? []).filter(Boolean))], categories: [...new Set((f.CategoryOfFundingActivity ?? []).filter(Boolean))],
    als: [...new Set((f.CFDANumbers ?? []).flatMap((x) => x.split(/[,;\s]+/)).map((x) => x.trim()).filter((x) => /^\d{2}\.\d{3}[A-Z]?$/.test(x)))],
    ceiling: num(f.AwardCeiling), floor: num(f.AwardFloor), totalFunding: num(f.EstimatedTotalProgramFunding), awards: num(f.ExpectedNumberOfAwards),
    costSharing: cleanText(f.CostSharingOrMatchingRequirement), excerpt: excerpt(f.Description, EXCERPT_DESC), link: `https://www.grants.gov/search-results-detail/${id}`,
  };
}
export const toRow = (r) => OPP_COLUMNS.map((c) => r[c]);

/** Shard records by top-level agency, splitting an agency by sub-agency when its shard would pass `maxBytes`. */
export function shardByAgency(records, maxBytes = SHARD_MAX_BYTES) {
  const byTop = new Map();
  for (const r of records) { if (!byTop.has(r.topAgency)) byTop.set(r.topAgency, []); byTop.get(r.topAgency).push(r); }
  const shards = [];
  const safe = (s) => s.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  for (const [top, list] of [...byTop.entries()].sort()) {
    const body = { columns: OPP_COLUMNS, rows: list.map(toRow) };
    if (JSON.stringify(body).length <= maxBytes) { shards.push({ file: `grants/${safe(top)}.json`, agency: top, body }); continue; }
    const bySub = new Map();
    for (const r of list) { const k = r.agencyCode || top; if (!bySub.has(k)) bySub.set(k, []); bySub.get(k).push(r); }
    // pack sub-agencies into parts under the size limit
    let part = []; let n = 1;
    const flush = () => { if (part.length) { shards.push({ file: `grants/${safe(top)}-${n++}.json`, agency: top, body: { columns: OPP_COLUMNS, rows: part.map(toRow) } }); part = []; } };
    for (const [, subs] of [...bySub.entries()].sort()) {
      if (part.length && JSON.stringify({ columns: OPP_COLUMNS, rows: [...part, ...subs].map(toRow) }).length > maxBytes) flush();
      part.push(...subs);
    }
    flush();
  }
  return shards;
}

/** Notices under each Assistance Listing, split by the listing's two-digit prefix (by-aln/93.json …). */
export const ALN_COLUMNS = ['id', 'number', 'title', 'status', 'postDate', 'closeDate', 'estPostDate', 'estDueDate', 'agency', 'link'];
export function byAln(records) {
  const out = new Map();
  for (const r of records) for (const a of r.als) {
    const prefix = a.split('.')[0];
    if (!out.has(prefix)) out.set(prefix, {});
    (out.get(prefix)[a] ??= []).push(ALN_COLUMNS.map((c) => r[c]));
  }
  return out;
}

export function countBy(records, key) {
  const o = {};
  for (const r of records) for (const k of [].concat(key(r))) o[k] = (o[k] ?? 0) + 1;
  return o;
}

// ---------------------------------------------------------------- the IRS exempt-organisation master file

export const BMF_STATES = ['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'dc', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'pr', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'];
export const BMF_URL = (st) => `https://www.irs.gov/pub/irs-soi/eo_${st}.csv`;
export const BMF_PAGE = 'https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf';
export const FOUNDATION_COLUMNS = ['ein', 'name', 'city', 'state', 'code', 'ruling', 'assets', 'income', 'taxPeriod', 'ntee', 'lastEfile'];

/** Split one CSV line (the BMF quotes fields that hold commas). */
export function splitCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.replace(/\r$/, ''));
}

/**
 * Parse the FOUNDATION code table from the text of the IRS's EO BMF information sheet (pdftotext -layout output):
 * every "NN  Description" line under the "FOUNDATION CODE" heading, continuation lines joined, word for word.
 */
export function parseFoundationCodes(text) {
  const lines = String(text).split(/\r?\n/);
  const start = lines.findIndex((l) => /^\s*FOUNDATION CODE\s*$/.test(l));
  if (start < 0) return {};
  const codes = {}; let last = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*[A-Z][A-Z ]{6,}$/.test(l) && !/^\s*Code\s+Description/.test(l)) break; // the next heading
    const m = /^\s*(\d{2})\s{2,}(.+?)\s*$/.exec(l);
    if (m) { codes[m[1]] = m[2]; last = m[1]; continue; }
    if (last && /^\s{4,}\S/.test(l)) codes[last] = `${codes[last]} ${l.trim()}`;
    else if (!l.trim() && Object.keys(codes).length && last && lines[i + 1] && !/^\s*\d{2}\s/.test(lines[i + 1])) { /* blank inside the table */ }
  }
  return codes;
}
/** The codes the documentation labels as private foundations (operating and non-operating). */
export const privateFoundationCodes = (codes) => Object.entries(codes).filter(([, l]) => /\bprivate\b.*\bfoundation\b/i.test(l)).map(([c]) => c);

/** Stream a BMF state CSV (header row first) and return the slim private-foundation rows. */
export async function parseBmf(chunks, { keepCodes = null } = {}) {
  const rl = createInterface({ input: chunksToStream(chunks), crlfDelay: Infinity });
  let header = null; const rows = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cells = splitCsvLine(line);
    if (!header) { header = cells.map((h) => h.trim().toUpperCase()); continue; }
    const g = (k) => (cells[header.indexOf(k)] ?? '').trim();
    const code = g('FOUNDATION');
    const keep = keepCodes ? keepCodes.includes(code) : Number(g('PF_FILING_REQ_CD') || 0) !== 0;
    if (!keep) continue;
    rows.push({
      ein: g('EIN'), name: g('NAME'), city: g('CITY'), state: g('STATE'), code, ruling: g('RULING'),
      assets: g('ASSET_AMT') === '' ? null : Number(g('ASSET_AMT')), income: g('INCOME_AMT') === '' ? null : Number(g('INCOME_AMT')),
      taxPeriod: g('TAX_PERIOD'), ntee: g('NTEE_CD'), lastEfile: null,
    });
  }
  return rows;
}
const foundationRow = (r) => FOUNDATION_COLUMNS.map((c) => r[c] ?? null);
export const foundationShard = (rows) => ({ columns: FOUNDATION_COLUMNS, rows: rows.map(foundationRow) });

/** Turn an async iterable of chunks (or a Node stream) into a readable stream readline can take. */
import { Readable } from 'node:stream';
function chunksToStream(chunks) { return typeof chunks?.pipe === 'function' ? chunks : Readable.from(chunks); }

/** The IRS 990 e-file index: the latest 990PF row per EIN among `eins`. */
export async function parseEfileIndex(chunks, eins) {
  const rl = createInterface({ input: chunksToStream(chunks), crlfDelay: Infinity });
  let header = null; const best = new Map();
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cells = splitCsvLine(line);
    if (!header) { header = cells.map((h) => h.trim().toUpperCase()); continue; }
    const g = (k) => (cells[header.indexOf(k)] ?? '').trim();
    if (!/^990PF$/i.test(g('RETURN_TYPE'))) continue;
    const ein = g('EIN').padStart(9, '0');
    if (!eins.has(ein)) continue;
    const row = { taxPeriod: g('TAX_PERIOD'), subDate: g('SUB_DATE') };
    const prev = best.get(ein);
    if (!prev || row.taxPeriod > prev.taxPeriod || (row.taxPeriod === prev.taxPeriod && row.subDate > prev.subDate)) best.set(ein, row);
  }
  return best;
}

// ---------------------------------------------------------------- RSS

export function parseRss(xml) {
  const items = [];
  for (const m of String(xml).matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const it = m[0];
    const tag = (t) => cleanText((new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`).exec(it)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, ''));
    items.push({ title: tag('title'), url: tag('link') || tag('guid'), date: tag('pubDate') || tag('dc:date') });
  }
  return items;
}

// ---------------------------------------------------------------- files and the manifest

export async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}
/** Write atomically (tmp + rename) so a failed run never leaves half a file. */
export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, path);
}
export const emptyManifest = () => ({ harvestedAt: null, sources: {}, failures: [] });
/**
 * Fold one source's result into public/data/manifest.json. A failed source keeps its previous `sources` entry (its
 * files stay in place) and is listed in `failures`, which the app reads to say which feed is stale.
 */
export async function mergeManifest(path, name, result, at = new Date().toISOString()) {
  const m = await readJson(path, emptyManifest());
  m.failures = (m.failures ?? []).filter((f) => f.source !== name);
  if (result.ok) m.sources[name] = { ...result, harvestedAt: at };
  else { m.failures.push({ source: name, status: result.status ?? null, message: String(result.message ?? 'failed').slice(0, 300), at }); if (m.sources[name]) m.sources[name].stale = true; }
  m.harvestedAt = at;
  await writeJson(path, m);
  return m;
}

export async function fetchOk(url, init = {}, timeoutMs = 120000) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) } });
  if (!r.ok) { const e = new Error(`${url}: HTTP ${r.status}`); e.status = r.status; throw e; }
  return r;
}
export { createReadStream };
