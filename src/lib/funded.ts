/**
 * `/funded` live look-ups (KICKOFF §4b). The only network calls this site makes to anyone but itself, both to APIs the
 * probes found open to a browser on the Pages origin: USAspending (no key) and the NSF Awards API (no key). Responses
 * are cached in sessionStorage for the tab; nothing else is sent anywhere.
 */
export const USASPENDING = 'https://api.usaspending.gov/api/v2';
export const NSF_AWARDS = 'https://api.nsf.gov/services/v1/awards.json';

/** USAspending recipient types the page offers (KICKOFF §4b), with the API's own names. */
export const RECIPIENT_TYPES = [
  { value: 'higher_education', label: 'Higher education (public and private)' },
  { value: 'private_institution_of_higher_education', label: 'Private institution of higher education' },
  { value: 'nonprofit', label: 'Non-profit' },
] as const;

export interface UsaQuery { aln: string; state: string; start: string; end: string; recipientType: string }
export interface Recipient { name: string; amount: number; recipient_id: string | null; uei: string | null }

export function usaFilters(q: UsaQuery) {
  return {
    award_type_codes: ['02', '03', '04', '05'],
    time_period: [{ start_date: q.start, end_date: q.end }],
    program_numbers: [q.aln],
    ...(q.recipientType ? { recipient_type_names: [q.recipientType] } : {}),
    ...(q.state ? { recipient_locations: [{ country: 'USA', state: q.state }] } : {}),
  };
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  try { const hit = sessionStorage.getItem(key); if (hit) return JSON.parse(hit) as T; } catch { /* storage blocked */ }
  const v = await load();
  try { sessionStorage.setItem(key, JSON.stringify(v)); } catch { /* full or blocked */ }
  return v;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.json()) as T;
}

export function topRecipients(q: UsaQuery, limit = 15): Promise<{ recipients: Recipient[]; count: number | null }> {
  return cached(`funded:usa:${JSON.stringify(q)}:${limit}`, async () => {
    const filters = usaFilters(q);
    const [cat, cnt] = await Promise.all([
      postJson<{ results: Recipient[] }>(`${USASPENDING}/search/spending_by_category/recipient/`, { filters, limit, page: 1 }),
      postJson<{ results: Record<string, number> }>(`${USASPENDING}/search/spending_by_award_count/`, { filters }).catch(() => null),
    ]);
    const c = cnt?.results;
    return { recipients: cat.results ?? [], count: c ? (c.grants ?? 0) + (c.direct_payments ?? 0) + (c.other ?? 0) : null };
  });
}
export const recipientUrl = (id: string) => `https://www.usaspending.gov/recipient/${id}/latest`;
/** USAspending's own search page (the manual route when the API does not answer). */
export const usaSearchUrl = (_aln: string) => 'https://www.usaspending.gov/search';

export interface NsfAward { id: string; title: string; awardeeName: string; fundsObligatedAmt?: string; estimatedTotalAmt?: string; startDate?: string; expDate?: string; fundProgramName?: string }
export function nsfAwards(keyword: string, rpp = 25): Promise<NsfAward[]> {
  const p = new URLSearchParams({ keyword, rpp: String(rpp), printFields: 'id,title,awardeeName,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,fundProgramName' });
  return cached(`funded:nsf:${p.toString()}`, async () => {
    const r = await fetch(`${NSF_AWARDS}?${p.toString()}`);
    if (!r.ok) throw new Error(`${r.status}`);
    const d = (await r.json()) as { response?: { award?: NsfAward[] } };
    return d.response?.award ?? [];
  });
}
export const nsfAwardUrl = (id: string) => `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${encodeURIComponent(id)}`;
/** NSF's own award search (the manual route when the API does not answer). */
export const nsfSearchUrl = (_kw: string) => 'https://www.nsf.gov/awardsearch/';

/**
 * NIH RePORTER refuses a browser's preflight, so it is a link. RePORTER builds every search on its own server and
 * names it by an id (its app routes are /search/:search_id/…; checked 2026-10-05), so no address can carry a code:
 * the link opens its Advanced Search, and the page shows the code or number to enter beside it.
 */
export const REPORTER_SEARCH = 'https://reporter.nih.gov/advanced-search';

export const isoDaysAgo = (days: number, from = new Date()) => new Date(from.getTime() - days * 86400000).toISOString().slice(0, 10);
