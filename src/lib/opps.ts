import { assetUrl } from '@/lib/data';

/**
 * The nightly harvest (KICKOFF §4c) as this site serves it from public/data/. Nothing here calls Grants.gov or the
 * IRS: these are the site's own files, built into the deployment. When the data folder is absent (a local build
 * without a harvest) every loader resolves to null and the pages say so.
 */
export interface HarvestManifest {
  harvestedAt: string;
  sources: Record<string, { ok: boolean; count?: number; harvestedAt?: string; status?: number | null; url?: string; note?: string }>;
  failures: { source: string; status: number | null; message: string; at: string }[];
}
export interface OppIndex {
  harvestedAt: string;
  extract: { file: string; url: string; lastModified: string | null; bytes: number | null };
  rule: string;
  columns: string[];
  counts: { total: number; posted: number; forecast: number; by_applicant_type: Record<string, number>; by_status_and_type?: Record<string, Record<string, number>> };
  agencies: { code: string; name: string; posted: number; forecast: number; shards: string[] }[];
  labels: { applicant_types: Record<string, string>; instruments: Record<string, string>; categories: Record<string, string>; source: string };
  cross_check: { ok: boolean; at: string; api_total: number | null; extract_total: number; by_type: Record<string, { api: number | null; extract: number }>; over_5pct: string[]; note: string } | null;
}
export interface Opp {
  id: string; number: string; title: string; agencyCode: string; agency: string; topAgency: string; status: 'posted' | 'forecast';
  postDate: string; closeDate: string; lastUpdated: string; estPostDate: string; estDueDate: string; applicantTypes: string[];
  eligibilityNote: string; instruments: string[]; categories: string[]; als: string[]; ceiling: number | null; floor: number | null;
  totalFunding: number | null; awards: number | null; costSharing: string; excerpt: string; link: string;
}
export type OppTuple = (string | number | string[] | null)[];

export const toOpp = (columns: string[], row: OppTuple): Opp => Object.fromEntries(columns.map((c, i) => [c, row[i]])) as unknown as Opp;

const cache = new Map<string, Promise<unknown>>();
export function getData<T>(rel: string): Promise<T | null> {
  if (!cache.has(rel)) {
    cache.set(rel, fetch(assetUrl(`data/${rel}`)).then(async (r) => {
      if (!r.ok) return null;
      const ct = r.headers.get('content-type') ?? '';
      // a missing file on a dev server comes back as the SPA's index.html, not a 404
      if (ct.includes('text/html')) return null;
      try { return (await r.json()) as T; } catch { return null; }
    }).catch(() => null));
  }
  return cache.get(rel) as Promise<T | null>;
}

export const loadHarvestManifest = () => getData<HarvestManifest>('manifest.json');
export const loadOppIndex = () => getData<OppIndex>('opportunities/index.json');
export const loadOppShard = (file: string) => getData<{ columns: string[]; rows: OppTuple[] }>(`opportunities/${file}`);
/** Notices under an Assistance Listing, from the per-prefix index ("93" → by-aln/93.json). */
export const loadByAln = (prefix: string) => getData<{ columns: string[]; listings: Record<string, OppTuple[]> }>(`opportunities/by-aln/${prefix}.json`);

export interface FoundationRow { ein: string; name: string; city: string; state: string; code: string; ruling: string; assets: number | null; income: number | null; taxPeriod: string; ntee: string; lastEfile?: string | null }
export interface FoundationIndex {
  harvestedAt: string; total: number; by_state: Record<string, number>; columns: string[];
  codes: Record<string, string>; codes_source: string; codes_from_documentation: boolean; documentation_url: string | null;
  source_urls: string[]; missing_states: string[]; efile: { ok: boolean; year: number | null; url: string | null; matched: number } | null;
}
export const loadFoundationIndex = () => getData<FoundationIndex>('foundations/index.json');
export const loadFoundationShard = (file: string) => getData<{ columns: string[]; rows: (string | number | null)[][] }>(`foundations/${file}`);
export const toFoundation = (columns: string[], row: (string | number | null)[]): FoundationRow => Object.fromEntries(columns.map((c, i) => [c, row[i]])) as unknown as FoundationRow;

export interface RecentNotice { title: string; url: string; date: string; agencies?: string[] }
export const loadRecent = (name: 'federal-register' | 'nsf-rss') => getData<{ harvestedAt: string; source: string; items: RecentNotice[] }>(`notices/${name}.json`);

/** ProPublica Nonprofit Explorer profile for an EIN: a plain link (the API is not called). */
export const propublicaUrl = (ein: string) => `https://projects.propublica.org/nonprofits/organizations/${ein.replace(/\D/g, '')}`;
export const grantsGovUrl = (id: string) => `https://www.grants.gov/search-results-detail/${id}`;
export const money = (n: number | null | undefined) => (n === null || n === undefined ? '' : `$${n.toLocaleString('en-US')}`);
