import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM helpers, no type declarations
import * as H from '../../scripts/harvest/lib.mjs';
import { ROOT } from './helpers';

const FX = path.join(ROOT, 'tests/fixtures/harvest');
type Rec = Record<string, unknown>;

async function extract(today = '2026-10-05') {
  const kept: Rec[] = []; const scanned: string[] = [];
  const seen = await H.parseExtract(fs.createReadStream(path.join(FX, 'extract-30.xml')), (kind: string, f: Rec) => {
    scanned.push(kind);
    if (H.keepRecord(kind, f, today)) kept.push(H.slimRecord(kind, f));
  });
  return { kept, scanned, seen };
}

describe('the Grants.gov extract parser (a 30-notice fixture cut from the 2026-10-05 extract)', () => {
  it('reads the element names from the file itself', async () => {
    const { seen, scanned } = await extract();
    expect(scanned).toHaveLength(30);
    expect(Object.keys(seen).sort()).toEqual([H.FORECAST, H.SYNOPSIS].sort());
    expect(Object.keys(seen[H.SYNOPSIS])).toEqual(expect.arrayContaining(['OpportunityID', 'EligibleApplicants', 'CFDANumbers', 'CloseDate', 'ArchiveDate']));
    expect(Object.keys(seen[H.FORECAST])).toEqual(expect.arrayContaining(['EstimatedSynopsisPostDate', 'EstimatedSynopsisCloseDate']));
  });
  it('keeps every forecast and the posted notices still open; drops the closed ones', async () => {
    const { kept } = await extract();
    expect(kept.filter((r) => r.status === 'forecast')).toHaveLength(6);
    expect(kept.filter((r) => r.status === 'posted')).toHaveLength(20);
    expect(kept.every((r) => r.status === 'forecast' || !r.closeDate || String(r.closeDate) >= '2026-10-04')).toBe(true);
  });
  it('a closed notice is dropped, and an archived one too', () => {
    expect(H.keepRecord(H.SYNOPSIS, { CloseDate: '09012026' }, '2026-10-05')).toBe(false);
    expect(H.keepRecord(H.SYNOPSIS, { CloseDate: '10042026' }, '2026-10-05')).toBe(true);
    expect(H.keepRecord(H.SYNOPSIS, { CloseDate: '' }, '2026-10-05')).toBe(true);
    expect(H.keepRecord(H.SYNOPSIS, { CloseDate: '', ArchiveDate: '01012026' }, '2026-10-05')).toBe(false);
    expect(H.keepRecord(H.FORECAST, { ArchiveDate: '12312026' }, '2026-10-05')).toBe(true);
  });
  it('an "unrestricted" notice keeps its code 99, and forecasts carry their estimated dates', async () => {
    const { kept } = await extract();
    expect(kept.some((r) => (r.applicantTypes as string[]).includes('99'))).toBe(true);
    const f = kept.find((r) => r.status === 'forecast')!;
    expect(String(f.estPostDate)).toMatch(/^\d{4}-\d{2}-\d{2}$|^$/);
    expect(f.closeDate).toBe('');
  });
  it('slims a record to the KICKOFF fields, with excerpts cut at 400 and 300 characters and the Grants.gov link', async () => {
    const { kept } = await extract();
    const r = kept[0];
    expect(Object.keys(r).sort()).toEqual([...H.OPP_COLUMNS].sort());
    expect(String(r.link)).toBe(`https://www.grants.gov/search-results-detail/${r.id}`);
    expect(kept.every((x) => String(x.excerpt).length <= 401 && String(x.eligibilityNote).length <= 301)).toBe(true);
    expect(kept.every((x) => (x.als as string[]).every((a) => /^\d{2}\.\d{3}/.test(a)))).toBe(true);
  });
  it('dates are MMDDYYYY in the file and ISO in the output; entities are decoded', () => {
    expect(H.mdyToIso('10052026')).toBe('2026-10-05');
    expect(H.mdyToIso('')).toBe('');
    expect(H.cleanText('Ellen &lt;br/&gt; Delage &amp; Co')).toBe('Ellen Delage & Co');
  });
  it('shards by top-level agency and splits a large agency under the size limit', async () => {
    const { kept } = await extract();
    const shards = H.shardByAgency(kept);
    expect(shards.every((s: { file: string }) => /^grants\/[a-z0-9-]+\.json$/.test(s.file))).toBe(true);
    const tiny = H.shardByAgency(kept, 2000);
    expect(tiny.length).toBeGreaterThan(shards.length);
    expect(tiny.reduce((n: number, s: { body: { rows: unknown[] } }) => n + s.body.rows.length, 0)).toBe(kept.length);
  });
  it('indexes notices by Assistance Listing prefix', async () => {
    const { kept } = await extract();
    const by = H.byAln(kept);
    const total = [...by.values()].reduce((n: number, o: Record<string, unknown[]>) => n + Object.values(o).reduce((m, l) => m + l.length, 0), 0);
    expect(total).toBe(kept.reduce((n, r) => n + (r.als as string[]).length, 0));
  });
});

describe('the IRS master file (a 40-row fixture from eo_de.csv)', () => {
  it('reads the FOUNDATION code labels word for word from the documentation, and the private-foundation codes from them', () => {
    const codes = H.parseFoundationCodes(fs.readFileSync(path.join(FX, 'eo-info-foundation-codes.txt'), 'utf8'));
    expect(codes['04']).toBe('Private non-operating foundation');
    expect(codes['02']).toBe('Private operating foundation exempt from paying excise taxes on investment income');
    expect(codes['13']).toMatch(/^Organization that operates for the benefit of a college or university and is owned or operated by a governmental unit 170\(b\)\(1\)\(A\)\(iv\)$/);
    expect(H.privateFoundationCodes(codes)).toEqual(['02', '03', '04']);
  });
  it('keeps only private foundations, with the slim fields', async () => {
    const rows = await H.parseBmf(fs.createReadStream(path.join(FX, 'eo_de.csv')), { keepCodes: ['02', '03', '04'] });
    expect(rows).toHaveLength(12);
    expect(rows.every((r: Rec) => ['02', '03', '04'].includes(String(r.code)) && r.state === 'DE' && /^\d{9}$/.test(String(r.ein)))).toBe(true);
    expect(Object.keys(rows[0]).sort()).toEqual([...H.FOUNDATION_COLUMNS].sort());
  });
  it('falls back to a non-zero PF filing requirement when the documentation is not available', async () => {
    const rows = await H.parseBmf(fs.createReadStream(path.join(FX, 'eo_de.csv')), { keepCodes: null });
    expect(rows.length).toBeGreaterThan(0);
  });
  it('splits a CSV line with quoted commas', () => {
    expect(H.splitCsvLine('1,"A, B",C\r')).toEqual(['1', 'A, B', 'C']);
  });
});

describe('the small feeds and the manifest', () => {
  it('parses the NSF RSS items', () => {
    const items = H.parseRss(fs.readFileSync(path.join(FX, 'nsf-rss-3.xml'), 'utf8'));
    expect(items).toHaveLength(3);
    expect(items[0].url).toMatch(/^https:\/\/www\.nsf\.gov\//);
  });
  it('a failed source is listed in failures and keeps its earlier entry, marked stale', async () => {
    const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'tfg-man-'));
    const p = path.join(tmp, 'manifest.json');
    await H.mergeManifest(p, 'grants', { ok: true, count: 5 }, '2026-10-04T09:43:00Z');
    const m = await H.mergeManifest(p, 'grants', { ok: false, status: 503, message: 'down' }, '2026-10-05T09:43:00Z');
    expect(m.sources.grants.count).toBe(5);
    expect(m.sources.grants.stale).toBe(true);
    expect(m.failures).toEqual([{ source: 'grants', status: 503, message: 'down', at: '2026-10-05T09:43:00Z' }]);
    const ok = await H.mergeManifest(p, 'grants', { ok: true, count: 6 }, '2026-10-06T09:43:00Z');
    expect(ok.failures).toEqual([]);
  });
});
