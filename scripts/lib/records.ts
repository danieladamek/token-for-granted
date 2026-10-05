/**
 * Extension records (KICKOFF §3.1, §4b): cross-reference checks, citation coverage of record prose, and term/citation
 * linking of the fields the app renders. Pure functions over parsed records so the unit tests can run them on a
 * fixture pack.
 *
 * - Every id reference resolves: a route's `programs[]`, `funders[]`, `standing[]`, `gates[]`, `mechanics[]`,
 *   `help[]`, `changes[]`; a programme's `funder`, `gates[]`, `on_routes[]`, `who_may_apply.standing[]`; a funder's
 *   `programs[]`; a standing record's `opens[]`; a gate's `same_as`; a change's `affects[]` (across every record
 *   file: a funder, a programme, a gate, a standing class or a rule). `related[]` is uncited cross-referencing and an
 *   unknown id there is a warning.
 * - Every `sources[]` number, every `cite: [n]` and every `[n]` in any string field resolves to references.yaml.
 * - Prose fields obey the same citation-coverage gate as review.md: an item of ≥ 25 words with no `[n]` and no
 *   `<!-- framing -->` marker is a build error (APP-SPEC §6.1), never repaired by adding a citation.
 * - Rendering: prose fields get term links (first occurrence per record) and citation tokens; every other string
 *   that carries `[n]` gets citation tokens only. The words are never changed.
 */
import { claimWords } from './parse';
import { CITE_RE, expandCitation, linkCitations, linkTerms, type Matcher } from './linker';
import type { BuildError, RecordFile } from './schemas';

export type AnyRecord = Record<string, unknown> & { id: string };
export type RecordSet = Record<RecordFile, AnyRecord[]>;

/**
 * Prose fields: the gate applies to these (and to every string inside them), wherever they sit in a record —
 * top level, inside `who_may_apply`, inside `cycle`, inside `variants[]`. Values of `figures[]`, giving bases and the
 * consolidation's bookkeeping (`consolidation_notes`) are not prose.
 */
export const PROSE_FIELDS = [
  'what', 'who_for', 'how_it_works', 'watch', 'who_qualifies', 'how_decided', 'steps', 'rule', 'applies_when', 'applies_to',
  'common_problems', 'time', 'cost', 'renewal', 'how_it_decides', 'cycle', 'pattern', 'who_to_talk_to', 'where_it_posts',
  'what_it_funds', 'who_it_funds', 'unsolicited_note', 'how_to_approach', 'typical_grant', 'indirect_costs', 'cost_sharing',
  'review', 'distinctive', 'status_note', 'status_change', 'eligibility_note', 'investigator', 'limits', 'citizenship',
  'career_window', 'stipend', 'obligation', 'pass_through_via', 'match', 'service_area', 'reporting', 'budget_rules',
  'geography', 'applicant_note', 'legal_form_note', 'policy_guide_note', 'governing_terms', 'who_it_is_for', 'for_grant_seekers',
  'note', 'text',
] as const;
const PROSE = new Set<string>(PROSE_FIELDS);
/** Fields whose strings are ids, codes, URLs or dates — never scanned for citations, never linked. */
const SKIP_KEY = /^(id|as_of|status_as_of|date|next_date|opens|closes|family|kind|funder|funder_kind|foundation_kind|status|unsolicited|door|route|applicant|funds|gates|programs|funders|standing|mechanics|help|changes|on_routes|who|purpose|stage|fields|affects|sources|cite|official_url|portal|policy_guide|grants_database_url|url|same_as|related|sweep|sweep_ids|applicant_types|assistance_listings|mechanism_code|ein|find_filter|consolidation_notes|parent)$/;

export interface RecordCheckContext {
  refNs: Set<number>;
  gateWords?: number;
}

export interface RecordCheckResult {
  errors: BuildError[];
  warnings: string[];
  /** reference numbers cited from any record (sources[], cite: [n] or an inline [n]) — they count as cited */
  cited: Set<number>;
  /** reference number → record keys ("routes/x") that cite it */
  citedBy: Map<number, string[]>;
  uncited: { where: string; words: number; excerpt: string }[];
  proseItems: number;
  proseCited: number;
  proseFraming: number;
}

function* strings(v: unknown, path: string[] = []): Generator<{ path: string[]; s: string }> {
  if (typeof v === 'string') { yield { path, s: v }; return; }
  if (Array.isArray(v)) { for (const [i, x] of v.entries()) yield* strings(x, [...path, String(i)]); return; }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) { if (!SKIP_KEY.test(k) || k === 'cycle') yield* strings(x, [...path, k]); }
  }
}

function* numberLists(v: unknown, path: string[] = []): Generator<{ path: string[]; ns: number[] }> {
  if (Array.isArray(v)) { for (const [i, x] of v.entries()) yield* numberLists(x, [...path, String(i)]); return; }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if ((k === 'cite' || k === 'refs') && Array.isArray(x) && x.every((n) => typeof n === 'number')) yield { path: [...path, k], ns: x as number[] };
      else yield* numberLists(x, [...path, k]);
    }
  }
}

/** The prose items of a record that the citation-coverage gate applies to: every string under a prose key. */
export function proseItems(r: AnyRecord): { field: string; s: string }[] {
  const out: { field: string; s: string }[] = [];
  const walk = (v: unknown, path: string[], inProse: boolean) => {
    if (typeof v === 'string') { if (inProse && !/^https?:\/\/\S+$/.test(v)) out.push({ field: path.join('/'), s: v }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, [...path, String(i)], inProse)); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'consolidation_notes' || k === 'figures' || k === 'giving' || k === 'assets' || k === 'budget' || k === 'awards' || k === 'success') continue; walk(x, [...path, k], inProse || PROSE.has(k)); }
  };
  for (const [k, v] of Object.entries(r)) {
    if (SKIP_KEY.test(k) && k !== 'cycle') continue;
    if (k === 'consolidation_notes' || k === 'figures' || k === 'giving' || k === 'assets' || k === 'budget' || k === 'awards' || k === 'success') continue;
    walk(v, [k], PROSE.has(k) || k === 'pending_changes' || k === 'conflicts' || k === 'variants' || k === 'who_may_apply');
  }
  return out;
}

export function checkRecords(set: RecordSet, ctx: RecordCheckContext): RecordCheckResult {
  const gate = ctx.gateWords ?? 25;
  const errors: BuildError[] = [];
  const warnings: string[] = [];
  const E = (where: string, message: string) => errors.push({ where, message });
  const cited = new Set<number>();
  const citedBy = new Map<number, string[]>();
  const cite = (n: number, key: string) => { cited.add(n); const a = citedBy.get(n) ?? []; if (!a.includes(key)) a.push(key); citedBy.set(n, a); };
  const uncited: RecordCheckResult['uncited'] = [];
  let proseCount = 0, proseCited = 0, proseFraming = 0;

  const ids = Object.fromEntries((Object.keys(set) as RecordFile[]).map((f) => [f, new Set(set[f].map((r) => r.id))])) as Record<RecordFile, Set<string>>;
  const anyId = new Set(Object.values(ids).flatMap((s) => [...s]));
  const refsTo = (key: string, field: string, list: unknown, file: RecordFile, word: string) => {
    for (const x of (Array.isArray(list) ? list : []) as unknown[]) if (typeof x === 'string' && !ids[file].has(x)) E(key, `${field} -> unknown ${word} id ${x}`);
  };

  for (const file of Object.keys(set) as RecordFile[]) {
    const seen = new Set<string>();
    for (const r of set[file]) {
      const key = `${file}/${r.id}`;
      if (seen.has(r.id)) E(key, 'duplicate id');
      seen.add(r.id);
      if (file === 'routes') {
        refsTo(key, 'programs[]', r.programs, 'programs', 'programme');
        refsTo(key, 'funders[]', r.funders, 'funders', 'funder');
        refsTo(key, 'standing[]', r.standing, 'standing', 'standing');
        refsTo(key, 'gates[]', r.gates, 'gates', 'gate');
        refsTo(key, 'mechanics[]', r.mechanics, 'mechanics', 'mechanic');
        refsTo(key, 'help[]', r.help, 'help', 'help');
        refsTo(key, 'changes[]', r.changes, 'changes', 'change');
      }
      if (file === 'programs') {
        if (typeof r.funder === 'string' && !ids.funders.has(r.funder)) E(key, `funder -> unknown funder id ${r.funder}`);
        refsTo(key, 'gates[]', r.gates, 'gates', 'gate');
        refsTo(key, 'on_routes[]', r.on_routes, 'routes', 'route');
        const w = r.who_may_apply as { standing?: unknown } | null | undefined;
        refsTo(key, 'who_may_apply.standing[]', w?.standing, 'standing', 'standing');
      }
      if (file === 'funders') refsTo(key, 'programs[]', r.programs, 'programs', 'programme');
      if (file === 'standing') refsTo(key, 'opens[]', r.opens, 'programs', 'programme');
      if (file === 'gates' && typeof r.same_as === 'string' && !ids.gates.has(r.same_as)) E(key, `same_as -> unknown gate id ${r.same_as}`);
      if (file === 'changes') for (const a of (r.affects as string[] | undefined) ?? []) if (!anyId.has(a)) E(key, `affects[] -> ${a} resolves to no record in any record file`);
      for (const rel of (Array.isArray(r.related) ? r.related : []) as unknown[]) if (typeof rel === 'string' && !anyId.has(rel)) warnings.push(`${key}: related -> ${rel} names no record`);

      for (const n of (r.sources as number[] | undefined) ?? []) {
        if (!ctx.refNs.has(n)) E(key, `sources -> [${n}] has no reference entry`);
        else cite(n, key);
      }
      for (const { path, ns } of numberLists(r)) for (const n of ns) {
        if (!ctx.refNs.has(n)) E(`${key}/${path.join('/')}`, `cite -> [${n}] has no reference entry`);
        else cite(n, key);
      }
      for (const { path, s } of strings(r)) {
        CITE_RE.lastIndex = 0;
        for (const m of s.matchAll(CITE_RE)) {
          for (const n of expandCitation(m[1])) {
            if (!ctx.refNs.has(n)) E(`${key}/${path.join('/')}`, `cites [${n}] with no reference entry`);
            else cite(n, key);
          }
        }
      }
      for (const { field, s } of proseItems(r)) {
        proseCount++;
        const plain = s.replace(/<!--[\s\S]*?-->/g, '').trim();
        const isCited = /\[\d/.test(plain);
        const framing = /<!--\s*framing\s*-->/.test(s);
        if (isCited) proseCited++;
        if (framing) proseFraming++;
        const words = claimWords(plain);
        if (words >= gate && !isCited && !framing) {
          uncited.push({ where: `${key}/${field}`, words, excerpt: plain.slice(0, 120) });
          E(`${key}/${field}`, `uncited record prose of ${words} words — cite it or mark it <!-- framing -->: ${JSON.stringify(plain.slice(0, 120))}`);
        }
      }
    }
  }
  return { errors, warnings, cited, citedBy, uncited, proseItems: proseCount, proseCited, proseFraming };
}

/**
 * Return a copy of the record with prose fields term-linked (first occurrence per record) and every string that
 * carries `[n]` turned into citation tokens. Also returns the term ids linked.
 */
export function linkRecord<T extends AnyRecord>(r: T, matcher: Matcher, opts: { everyOccurrence?: boolean } = {}): { record: T; terms: string[] } {
  const seen = new Set<string>();
  const terms: string[] = [];
  const prose = (s: string) => {
    const t = linkTerms(s, matcher, { everyOccurrence: opts.everyOccurrence, seen });
    terms.push(...t.linked);
    return linkCitations(t.text).text;
  };
  const citeOnly = (s: string) => (/\[\d/.test(s) ? linkCitations(s).text : s);
  const walk = (v: unknown, key: string, inProse: boolean): unknown => {
    if (typeof v === 'string') return SKIP_KEY.test(key) && key !== 'cycle' ? v : /^https?:\/\/\S+$/.test(v) ? v : inProse ? prose(v) : citeOnly(v);
    if (Array.isArray(v)) return SKIP_KEY.test(key) && key !== 'cycle' ? v : v.map((x) => walk(x, key, inProse));
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) o[k] = walk(x, k, inProse || PROSE.has(k));
      return o;
    }
    return v;
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) out[k] = walk(v, k, PROSE.has(k) && k !== 'note');
  return { record: out as T, terms };
}

/* ───────────────────────── gates: grouping derived from the gate's id (KICKOFF §4b /gates) */

/**
 * The five kinds of gate, each with the rule that assigns it. The rule reads the words of the gate's own id and
 * nothing else; no prose is written for a group beyond its label (the KICKOFF's own words) and the rule.
 */
export const GATE_GROUPS = [
  { id: 'registration', label: 'Registration and identifiers', rule: 'an id that names none of the words below: SAM.gov, the Unique Entity ID, Grants.gov, ORCID, Login.gov, CAGE and NCAGE codes, and the like' },
  { id: 'agency-systems', label: 'Agency systems', rule: 'an id naming a funder’s own submission or account system: era, research-gov, nspires, ebrap, justgrants, grantsolutions, ehbs, egms, a portal, a system, a site, a module, an application or an account' },
  { id: 'assurances', label: 'Assurances and compliance', rule: 'an id naming an assurance, certification, disclosure, plan, policy or training: security, conflict, human subjects, animal welfare, biosafety, misconduct, lobbying, debarment, data sharing, public access, the common forms and SciENcv' },
  { id: 'nonprofit-standing', label: 'Non-profit standing', rule: 'an id naming tax-exempt recognition or a non-profit’s own filings: 501c3, 990, charitable solicitation' },
  { id: 'after-award', label: 'After the award', rule: 'an id naming something done once an award is held: payment, ASAP, audit, iEdison, a payback agreement, or a reporting system (DRGR, HMIS, AMIS)' },
] as const;
export type GateGroupId = (typeof GATE_GROUPS)[number]['id'];

const GATE_TESTS: [GateGroupId, string[]][] = [
  ['after-award', ['payment', 'asap', 'audit', 'iedison', 'drgr', 'hmis', 'amis', 'payback']],
  ['nonprofit-standing', ['501c3', '990', 'charitable']],
  ['assurances', ['security', 'disclosure', 'data', 'public-access', 'mftrp', 'common-forms', 'sciencv', 'assurance', 'irb', 'human', 'animal', 'biosafety', 'conflict', 'misconduct', 'responsible', 'section-117', 'certifications', 'lobbying', 'drug', 'debarment', 'prerequisites']],
  ['agency-systems', ['era', 'research-gov', 'pams', 'fedconnect', 'exchange', 'ebrap', 'nspires', 'portal', 'valid-eval', 'justgrants', 'connect', 'primo', 'egms', 'assist', 'module', 'system', 'application', 'usajobs', 'solaa', 'g6', 'site', 'grantsolutions', 'ehbs', 'snaps', 'fema-go', 'grantease', 'gea', 'ezfedgrants', 'route', 'arc', 'account', 'rwjf']],
];

/** Classify a gate by the words of its own id; returns the group and the word that put it there (shown on /gates). */
export function classifyGate(g: { id: string }): { group: GateGroupId; because: string } {
  const id = `-${g.id}-`;
  for (const [group, words] of GATE_TESTS) {
    const w = words.find((x) => id.includes(`-${x}-`));
    if (w) return { group, because: w };
  }
  return { group: 'registration', because: '' };
}

/* ───────────────────────── standing: kind derived from the record's applies_to and id (KICKOFF §4b /standing) */

export const STANDING_GROUPS = [
  { id: 'investigator', label: 'Investigator status', rule: 'applies_to is investigator' },
  { id: 'jurisdiction', label: 'Jurisdiction lists', rule: 'an id naming a list of places: jurisdiction, epscor, depscor, idea-eligible-state, epscor-state, county, economic-distress, priority-place, knight-community' },
  { id: 'foundation-kinds', label: 'Kinds of foundation', rule: 'an id naming a kind of grantmaker: private foundation, operating or non-operating foundation, community foundation, supporting organisation, donor-advised fund, corporate foundation, medical research organisation, congressionally chartered foundation, federated fund, giving circle, public charity' },
  { id: 'tax-standing', label: 'Non-profit tax standing', rule: 'an id naming tax-exempt status or how a non-profit holds it: 501c3, 501c4, group exemption, fiscal sponsorship, a negotiated rate or a federal-funding threshold for non-profits' },
  { id: 'designated', label: 'Designated institutions', rule: 'an id naming a designation an institution or organisation holds: HBCU, HSI, tribal college, AANAPISI, NASNTI, PBI, land-grant, NLGCA, MSI, RCMI, Title III, community college, a certification, approval or designation, a named recipient, an existing grantee' },
  { id: 'profile', label: 'Institutional profile', rule: 'none of the above: what an institution is or has (undergraduate-focused, not R1, domestic, foreign, eligible for a funder) as each funder tests it' },
] as const;
export type StandingGroupId = (typeof STANDING_GROUPS)[number]['id'];
const STANDING_TESTS: [StandingGroupId, string[]][] = [
  ['jurisdiction', ['jurisdiction', 'epscor', 'depscor', 'idea-eligible-state', 'county', 'economic-distress', 'priority-place', 'knight-community']],
  ['foundation-kinds', ['private-foundation', 'nonoperating', 'operating-foundation', 'community-foundation', 'supporting-organization', 'donor-advised', 'corporate-foundation', 'medical-research-organization', 'congressionally-chartered', 'federated-fund', 'giving-circle', 'public-charity']],
  ['tax-standing', ['501c3', '501c4', 'group-exemption', 'fiscally-sponsored', 'negotiated-indirect', 'direct-federal-funding']],
  ['designated', ['hbcu', 'hispanic-serving', 'tribal-college', 'native-hawaiian', 'aanapisi', 'nontribal', 'predominantly-black', 'land-grant', 'nlgca', 'msi', 'minority', 'rcmi', 'title-iii', 'black-graduate', 'covered-educational', 'community-college', 'named', 'grantee', 'designated', 'certified', 'cdfi', 'approved', 'look-alike', 'awardee', 'recovery-community', 'lifeline', 'cil-eligible', 'water-resources', 'sea-grant', 'advisory-board', 'national-significance', 'professional-organization', 'prior-title-vii', 'nsgp']],
];
/** Classify a standing record by its applies_to and the words of its id; returns the group and the word that placed it. */
export function classifyStanding(s: { id: string; applies_to: string }): { group: StandingGroupId; because: string } {
  if (s.applies_to === 'investigator') return { group: 'investigator', because: 'applies_to: investigator' };
  const id = `-${s.id}-`;
  for (const [group, words] of STANDING_TESTS) {
    const w = words.find((x) => id.includes(`-${x}-`) || id.includes(`-${x}`));
    if (w) return { group, because: w };
  }
  return { group: 'profile', because: '' };
}
