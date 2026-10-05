/** /find: the harvested Grants.gov notices and their filters. Pure, so it is unit-tested. */
import type { Opp } from '@/lib/opps';

export interface FindState {
  q: string;
  status: '' | 'posted' | 'forecast';
  /** applicant-type codes, any of */
  elig: string[];
  agency: string;
  instrument: string;
  /** Assistance Listing numbers or prefixes, any of */
  aln: string[];
  /** saved-filter keywords, any of (title, agency, number, description excerpt) */
  any: string[];
  closeWithin: string;
  estPostWithin: string;
  ceilingMin: string;
}

/**
 * The pre-set "who may apply" groups (KICKOFF §4b). Codes as the extract writes them; "unrestricted and other" is
 * there because defence and some other notices code eligibility as 99 (unrestricted) or 25 (others) only.
 */
export const ELIG_GROUPS: { id: string; label: string; codes: string[] }[] = [
  { id: 'public-ihe', label: 'Public or state institution of higher education', codes: ['06'] },
  { id: 'private-ihe', label: 'Private institution of higher education', codes: ['20'] },
  { id: 'nonprofit-501c3', label: 'Non-profit with 501(c)(3) status', codes: ['12'] },
  { id: 'nonprofit-other', label: 'Non-profit without it', codes: ['13'] },
  { id: 'unrestricted-other', label: 'Unrestricted and other', codes: ['99', '25'] },
];

export const emptyState = (): FindState => ({ q: '', status: '', elig: [], agency: '', instrument: '', aln: [], any: [], closeWithin: '', estPostWithin: '', ceilingMin: '' });

const addDays = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + d * 86400000).toISOString().slice(0, 10);
export const hayOf = (o: Opp) => `${o.title} ${o.agency} ${o.topAgency} ${o.number} ${o.excerpt}`.toLowerCase();

/** Every filter. `today` is an ISO date; the keyword box is word-AND over the haystack unless an index answered it. */
export function matches(o: Opp, f: FindState, today: string, hay = hayOf(o)): boolean {
  if (f.status && o.status !== f.status) return false;
  if (f.elig.length && !f.elig.some((c) => o.applicantTypes.includes(c))) return false;
  if (f.agency && !f.agency.split('|').filter(Boolean).some((a) => o.topAgency === a || o.agencyCode === a || o.agencyCode.startsWith(`${a}-`))) return false;
  if (f.instrument && !o.instruments.includes(f.instrument)) return false;
  if (f.aln.length && !f.aln.some((a) => o.als.some((x) => x === a || x.startsWith(a)))) return false;
  if (f.any.length && !f.any.some((k) => hay.includes(k.toLowerCase()))) return false;
  if (f.closeWithin) {
    if (o.status !== 'posted' || !o.closeDate || o.closeDate < addDays(today, -1) || o.closeDate > addDays(today, Number(f.closeWithin))) return false;
  }
  if (f.estPostWithin) {
    if (o.status !== 'forecast' || !o.estPostDate || o.estPostDate > addDays(today, Number(f.estPostWithin))) return false;
  }
  if (f.ceilingMin && !(o.ceiling !== null && o.ceiling >= Number(f.ceilingMin))) return false;
  if (f.q) { const words = f.q.toLowerCase().split(/\s+/).filter(Boolean); if (!words.every((w) => hay.includes(w))) return false; }
  return true;
}

/** Posted notices by close date (none last), then forecasts by estimated post date. */
export function byDate(a: Opp, b: Opp): number {
  if (a.status !== b.status) return a.status === 'posted' ? -1 : 1;
  const ka = a.status === 'posted' ? a.closeDate : a.estPostDate;
  const kb = b.status === 'posted' ? b.closeDate : b.estPostDate;
  return (ka || '9999').localeCompare(kb || '9999') || a.title.localeCompare(b.title);
}

const split = (s: string | null) => (s ? s.split('|').filter(Boolean) : []);
export function stateFromParams(p: URLSearchParams): FindState {
  return {
    q: p.get('q') ?? '', status: (p.get('status') as FindState['status']) ?? '', elig: split(p.get('elig')), agency: p.get('agency') ?? '',
    instrument: p.get('instrument') ?? '', aln: split(p.get('aln')), any: split(p.get('any')), closeWithin: p.get('close') ?? '',
    estPostWithin: p.get('estpost') ?? '', ceilingMin: p.get('ceiling') ?? '',
  };
}
