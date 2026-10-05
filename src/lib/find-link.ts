import type { FindFilter } from '@/types';
import savedJson from '@/data/saved-searches.json';

/** Pack applicant-type keys → Grants.gov applicant-type codes (EXTENSIONS.md shared vocabularies). */
export const APPLICANT_CODES = (savedJson as { applicant_types: Record<string, string> }).applicant_types;

/** Encode a route's saved filter as /find URL state: agencies, applicant-type codes, keywords (any of). */
export function findHref(f: FindFilter, label: string, routeId?: string): string {
  const p = new URLSearchParams();
  if (routeId) p.set('saved', routeId);
  p.set('label', label);
  if (f.agencies?.length) p.set('agency', f.agencies.join('|'));
  const codes = [...new Set((f.applicant_types ?? []).map((a) => APPLICANT_CODES[a]).filter(Boolean))];
  if (codes.length) p.set('elig', codes.join('|'));
  if (f.keywords?.length) p.set('any', f.keywords.join('|'));
  return `/find?${p.toString()}`;
}

/** A programme's Assistance Listings as a /find search. */
export function alnHref(als: string[], label: string, programId?: string): string {
  const p = new URLSearchParams();
  if (programId) p.set('program', programId);
  p.set('label', label);
  p.set('aln', als.join('|'));
  return `/find?${p.toString()}`;
}

/** A programme's Assistance Listing as a /funded query. */
export const fundedHref = (aln: string, label?: string, code?: string) => `/funded?${new URLSearchParams({ aln, ...(label ? { label } : {}), ...(code ? { code } : {}) }).toString()}`;
