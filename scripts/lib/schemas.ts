/**
 * Zod schemas mirroring docs/CONTENT-PACK.md (topic mode, v0.10) and content-pack/EXTENSIONS.md (Token for Granted's
 * extension files, draft v0.11). The standard files are validated closely; the extension records carry many keys
 * beyond any fixed list (EXTENSIONS "Added in v0.2" to "v0.11"), so they are `.passthrough()` — but every id
 * reference and every `[n]` in them must resolve, which scripts/lib/records.ts checks after parsing.
 */
import { z } from 'zod';

export const kebab = z.string().regex(/^[a-z0-9-]+$/, 'must be kebab-case');
const url = z.string().regex(/^https?:\/\//, 'must be an http(s) URL');
const isoish = z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));

/* ───────────────────────── vocabularies (EXTENSIONS.md "Shared vocabularies" and later sections) */

/** Route families; `start` holds the six entry routes. Programmes use the four others. */
export const FAMILIES = ['start', 'research', 'people', 'programme-service', 'capacity'] as const;
export const PROGRAM_FAMILIES = ['research', 'people', 'programme-service', 'capacity'] as const;
export const WHO = ['faculty-investigator', 'early-career', 'research-office', 'nonprofit-programmes', 'nonprofit-research'] as const;
export const PURPOSE = ['research-project', 'person', 'service', 'capacity', 'operating'] as const;
export const STAGE = ['never-applied', 'applied-unfunded', 'funded-once', 'established'] as const;
export const ROUTE_FUNDER_KINDS = ['federal', 'foundation', 'either'] as const;
export const FUNDER_KINDS = ['federal', 'foundation', 'independent-nonprofit'] as const;
export const DOORS = ['direct', 'state', 'congress', 'nomination', 'invitation', 'letter-of-inquiry', 'registration', 'partner'] as const;
/** The eight programme statuses (KICKOFF §4b). */
export const PROGRAM_STATUSES = ['open', 'forecast', 'closed', 'no-current-notice', 'formula', 'not-competed', 'expired', 'unconfirmed'] as const;
/** Change-record and pending-change statuses (KICKOFF §1 "Law in motion"). */
export const CHANGE_STATUSES = ['proposed', 'announced', 'enacted', 'final', 'pending-implementation', 'enjoined', 'vacated', 'in-litigation', 'on-appeal', 'rescinded', 'frozen-by-appropriations'] as const;
export const DOMAINS = ['law', 'process', 'cost', 'role', 'organisation', 'programme', 'standing', 'status', 'notation'] as const;
export const UNSOLICITED = ['accepted', 'letter-of-inquiry', 'open-call-only', 'invitation-only', 'not-stated'] as const;
export const STANDING_APPLIES_TO = ['institution', 'investigator', 'nonprofit'] as const;
/** Applicant-type keys → Grants.gov codes (EXTENSIONS.md shared vocabularies, v0.1 and v0.2). */
export const APPLICANT_TYPES: Record<string, string> = {
  'public-higher-ed': '06', 'private-higher-ed': '20', 'nonprofit-501c3': '12', 'nonprofit-other': '13', unrestricted: '99',
  'state-government': '00', 'county-government': '01', 'city-government': '02', 'tribal-government': '07',
  individual: '21', 'for-profit': '22', 'small-business': '23', other: '25',
};
export type Family = (typeof FAMILIES)[number];

/* ───────────────────────── manifest */

export const ManifestSchema = z
  .object({
    mode: z.enum(['manuscript', 'topic']).default('manuscript'),
    slug: kebab,
    title: z.string().min(1),
    short_title: z.string().min(1),
    question: z.string().optional(),
    purpose: z.string().optional(),
    as_of: z.string().optional(),
    authors: z.array(z.string().min(1)).min(1),
    venue: z.string().min(1),
    year: z.number().int(),
    doi: z.string().optional(),
    url: z.string().optional(),
    plain_abstract: z.string().default(''),
    reading_minutes: z.number().optional(),
    audience: z.string().optional(),
    palette: z.object({ groups: z.record(z.string()) }).default({ groups: {} }),
    permissions: z.object({
      text: z.string().min(1, 'permissions.text is REQUIRED — no pack ships without it'),
      figures: z.string().optional(),
    }),
    delivery: z.enum(['local', 'pages']).default('local'),
    notes_storage: z.enum(['file', 'browser']).default('file'),
    concept_self_checks: z.boolean().default(false),
    concepts_label: z.string().default('101s'),
    link_every_occurrence: z.boolean().default(false),
    builder: z.object({ name: z.string(), version: z.string(), date: z.string() }),
    github_account: z.string().min(1),
    disclaimer: z.string().min(1, 'disclaimer is required — it is rendered in every footer'),
    extensions: z
      .object({
        record_files: z.array(z.string()).default([]),
        schema: z.string().optional(),
        pathfinder: z.string().optional(),
        families: z.record(z.string()),
      })
      .passthrough(),
    opportunity_search: z
      .object({
        harvest: z.array(z.string()).default([]),
        live: z.array(z.string()).default([]),
        links_only: z.array(z.string()).default([]),
        not_probed: z.array(z.string()).default([]),
        note: z.string().default(''),
      })
      .passthrough()
      .optional(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.mode === 'topic') {
      for (const k of ['question', 'purpose', 'as_of'] as const) {
        if (!m[k]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: `${k} is REQUIRED in topic mode` });
      }
      if (!/peer/i.test(m.venue)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue'], message: 'topic mode: venue must make the non-peer-reviewed status unmissable' });
    } else if (!(m.doi || m.url)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'doi or url required' });
    }
    if (m.delivery === 'pages' && !/25 words/.test(m.permissions.text)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['permissions', 'text'], message: 'delivery: pages needs permissions.text to state the quotation rule (≤ 25 words)' });
    }
    for (const f of FAMILIES) {
      if (!m.palette.groups[f]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['palette', 'groups'], message: `palette.groups needs a colour for family ${f}` });
      if (!m.extensions.families[f]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['extensions', 'families'], message: `extensions.families needs a label for ${f}` });
    }
  });
export type Manifest = z.infer<typeof ManifestSchema>;

/* ───────────────────────── glossary, concepts, figures */

/** `kind` is the builder vocabulary (methods | science | notation); `domain` is this pack's own. Definitions are cited. */
export const GlossaryEntrySchema = z.object({
  id: kebab,
  term: z.string().min(1),
  kind: z.enum(['science', 'methods', 'statistics', 'notation']),
  domain: z.enum(DOMAINS),
  own_label: z.boolean().default(false),
  variants: z.array(z.string().min(1)).default([]),
  short: z.string().min(1).max(200, 'short > 200 chars'),
  definition: z.string().min(1),
  concept: kebab.nullable().optional().transform((v) => v ?? undefined),
  see: z.array(kebab).default([]),
  sources: z.array(z.string()).default([]),
}).strict();
export const GlossarySchema = z.array(GlossaryEntrySchema);
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

const SelfCheckSchema = z
  .object({ q: z.string().min(1), options: z.array(z.string()).min(2), answer: z.number().int(), explanation: z.string().default('') })
  .refine((q) => q.answer >= 0 && q.answer < q.options.length, { message: 'self_check answer index out of range (0-based)' });

/** `self_check` is required only when manifest.concept_self_checks is true (CONTENT-PACK v0.10); build-content checks that. */
export const ConceptFrontmatterSchema = z.object({
  id: kebab,
  title: z.string().min(1),
  one_liner: z.string().min(1),
  why_here: z.string().min(1),
  prerequisites: z.array(kebab).default([]),
  terms: z.array(kebab).default([]),
  figures: z.array(kebab).default([]),
  further_reading: z
    .array(z.object({ title: z.string().min(1), url: z.string().min(1), kind: z.string().optional() }))
    .min(2, 'needs ≥2 further_reading'),
  self_check: z.array(SelfCheckSchema).default([]),
}).strict();
export type ConceptFrontmatter = z.infer<typeof ConceptFrontmatterSchema>;

export const FIGURE_KINDS = ['chart', 'table', 'network', 'pathway', 'image'] as const;
export const CHART_TYPES = ['line', 'bar', 'grouped-bar', 'stacked-bar', 'scatter', 'area', 'step', 'box', 'heatmap', 'forest'] as const;
const AxisSchema = z.object({
  field: z.string().optional(),
  label: z.string().optional(),
  unit: z.string().optional(),
  scale: z.enum(['linear', 'log']).optional(),
});
/** `series` is a field name, or `{ field, label }` (this pack writes the latter). Normalised to the object form. */
const SeriesSchema = z.union([z.string(), z.object({ field: z.string(), label: z.string().optional() })])
  .transform((s) => (typeof s === 'string' ? { field: s, label: undefined as string | undefined } : s));
export const ChartSpecSchema = z.object({
  type: z.enum(CHART_TYPES),
  x: AxisSchema.optional(),
  y: AxisSchema.optional(),
  series: SeriesSchema.optional(),
  ci: z.tuple([z.string(), z.string()]).optional(),
});
export const ExplainSchema = z.object({ on: z.string().min(1), text: z.string().min(1), term: kebab.optional(), concept: kebab.optional() });
export const HotspotSchema = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), text: z.string().min(1), term: kebab.optional() });
export const FigureSchema = z.object({
  id: kebab,
  label: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(FIGURE_KINDS),
  synthesis: z.enum(['data', 'conceptual']).optional(),
  refs: z.array(z.number().int()).default([]),
  data: z.string().optional(),
  script: z.string().optional(),
  image: z.string().optional(),
  columns: z.array(z.object({ field: z.string(), label: z.string().optional() })).optional(),
  chart: ChartSpecSchema.optional(),
  caption: z.string().min(1),
  how_to_read: z.string().min(1),
  explain: z.array(ExplainSchema).default([]),
  hotspots: z.array(HotspotSchema).default([]),
  concepts: z.array(kebab).default([]),
  discussed_in: z.array(z.string()).default([]),
  source: z.string().min(1),
});
export const FiguresSchema = z.array(FigureSchema);
export type FigureDef = z.infer<typeof FigureSchema>;

/**
 * Pathway JSON (EXTENSIONS v0.11): `{id, note, nodes: [{id, kind, label, col, row, refs, term?}], edges: [{from, to,
 * kind, label?}]}`. Rows may be fractional; Figure 2 has a row −1 overlay.
 */
export const PathwaySchema = z.object({
  id: z.string().optional(),
  note: z.string().default(''),
  nodes: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    label: z.string().min(1),
    col: z.number(),
    row: z.number(),
    refs: z.array(z.number().int()).default([]),
    term: z.string().optional(),
    record: z.string().optional(),
  }).strict()).min(1),
  edges: z.array(z.object({
    from: z.string(), to: z.string(), kind: z.string().optional(), label: z.string().optional(),
    refs: z.array(z.number().int()).default([]),
  }).strict()),
});
export type Pathway = z.infer<typeof PathwaySchema>;

/* ───────────────────────── references (topic schema + the recheck fields, EXTENSIONS v0.8 and v0.11) */

export const REF_ROLES = ['support', 'method', 'contrast', 'prior-result', 'data-source', 'background'] as const;
export const REF_TIERS = ['seminal', 'classic', 'current', 'background'] as const;
export const FACT_CODES = ['C', 'S', 'N', 'X', '-'] as const;

export const ReferenceSchema = z
  .object({
    n: z.number().int().positive(),
    key: z.string().min(1),
    tier: z.enum(REF_TIERS),
    tier_note: z.string().optional(),
    citation: z.string().min(1),
    title: z.string().default(''),
    url: url,
    year: z.number().int(),
    published: isoish,
    date_note: z.string().optional(),
    accessed: isoish,
    publisher: z.string().min(1),
    source_kind: z.enum(['primary', 'secondary']),
    read: z.enum(['full', 'partial', 'not-fetched']),
    summary: z.string().default(''),
    why_it_mattered: z.string().default(''),
    key_facts: z.array(z.string()).default([]),
    quotes: z.array(z.string()).default([]),
    role_here: z.enum(REF_ROLES),
    role_note: z.string().default(''),
    cited_in: z.array(z.string()).default([]),
    used_by: z.array(z.string()).default([]),
    verified: z.boolean(),
    recheck: z.boolean(),
    rechecked: isoish.optional(),
    recheck_result: z.object({
      fetch: z.enum(['ok', 'blocked']),
      partial: z.boolean().optional(),
      quotes_dropped: z.number().int().optional(),
      by_hand: z.number().int().optional(),
      reason: z.string().optional(),
      date: isoish.optional(),
    }).strict().nullable().optional(),
    fact_check: z.array(z.enum(FACT_CODES)).optional(),
    sweep: z.string().default(''),
    sweep_ids: z.array(z.string()).default([]),
  })
  .strict()
  .superRefine((r, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
    if (!r.summary.trim() && r.verified) issue('no summary (a missing summary is allowed only with verified: false)');
    if (r.read === 'not-fetched' && r.verified) issue('read: not-fetched cannot be verified: true', ['read']);
    if (r.tier === 'seminal' && !r.why_it_mattered.trim()) issue('seminal tier needs why_it_mattered', ['why_it_mattered']);
    if (r.fact_check && r.fact_check.length !== r.key_facts.length) issue(`fact_check has ${r.fact_check.length} codes for ${r.key_facts.length} key_facts`, ['fact_check']);
  });
export const ReferencesSchema = z.array(ReferenceSchema);
export type Reference = z.infer<typeof ReferenceSchema>;

export const TodoSchema = z.array(z.object({
  id: z.string().min(1),
  kind: z.enum(['gap', 'conflict', 'unverified', 'recheck']),
  about: z.string().default(''),
  text: z.string().default(''),
  owner: z.string().default('author'),
  where: z.string().min(1),
  what: z.string().min(1),
  sweep: z.string().optional(),
}).strict());
export type TodoItem = z.infer<typeof TodoSchema>[number];

/* ───────────────────────── scope.yaml + queries.yaml — published content, rendered by /methods */

export const ScopeSchema = z.object({
  topic: z.string().min(1),
  topic_note: z.string().optional(),
  question: z.string().min(1),
  purpose: z.string().optional(),
  boundary: z.object({
    in: z.array(z.string()).min(1, 'boundary.in is empty — the scope must say what is in'),
    out: z.array(z.string()).min(1, 'boundary.out is empty — the scope must say what was deliberately left out'),
    rationale: z.string().default(''),
  }),
  level: z.string().optional(),
  time_window: z.object({ current_from: z.number().int().optional(), seminal: z.string().optional() }).passthrough(),
  stance: z.string().optional(),
  depth: z.enum(['brief', 'standard', 'deep']),
  anchors: z.array(z.object({ citation: z.string(), doi: z.string().optional(), url: z.string().optional(), why: z.string().default('') }).passthrough()).default([]),
  excluded: z.array(z.object({ what: z.string(), why: z.string().default('') }).passthrough()).default([]),
  assumed: z.boolean().default(false),
  assumptions: z.array(z.string()).default([]),
  interview: z.array(z.object({ q: z.string(), answer: z.string(), asked: isoish.optional() }).passthrough()).default([]),
  carried_from_far_out: z.unknown().optional(),
  still_open: z.unknown().optional(),
  search_strategy: z.object({
    run_on: isoish,
    sources: z.array(z.string()).min(1),
    passes: z.unknown().optional(),
    queries: z.array(z.object({ q: z.string().min(1), source: z.string().optional(), hits: z.number().int(), slice: z.string().optional() }).passthrough()).min(1),
    snowball: z.array(z.string()).default([]),
    inclusion: z.array(z.string()).min(1),
    exclusion: z.array(z.string()).min(1),
    known_gaps: z.array(z.string()).default([]),
  }).passthrough(),
  corpus_profile: z.object({
    by_tier: z.record(z.number().int()),
    by_source_kind: z.record(z.number().int()).optional(),
    year_range: z.array(z.number().int()).optional(),
    concentration: z.string().default(''),
    dissent_represented: z.boolean().default(false),
    dissent_note: z.string().default(''),
    recheck: z.unknown().optional(),
  }).passthrough(),
  outline_approved: z.string().optional(),
}).strict();
export type Scope = z.infer<typeof ScopeSchema>;

/** queries.yaml: `hits` is written as the sweep noted it ("~9", "0", "12"); the integer is parsed out for counts. */
export const QuerySchema = z.object({
  text: z.string().min(1),
  engine: z.string().min(1),
  hits: z.union([z.number().int().min(0), z.string()]),
  date: isoish,
  slice: z.string().min(1),
  note: z.string().optional(),
}).strict();
export const QueriesSchema = z.array(QuerySchema);
export type Query = z.infer<typeof QuerySchema>;
export const hitsNumber = (h: number | string): number | null => (typeof h === 'number' ? h : /\d+/.test(h) ? Number(/\d+/.exec(h)![0]) : null);

/* ───────────────────────── extension records (EXTENSIONS.md; permissive, ids checked in records.ts) */

const refList = z.array(z.number().int().positive());
const ids = z.array(kebab).default([]);

export const PendingChangeSchema = z.object({
  status: z.enum(CHANGE_STATUSES),
  date: isoish,
  text: z.string().min(1),
}).passthrough();

const common = {
  id: kebab,
  official_url: z.string().optional(),
  pending_changes: z.array(PendingChangeSchema).default([]),
  as_of: isoish.optional(),
  sources: refList.default([]),
  conflicts: z.array(z.string()).default([]),
  variants: z.array(z.record(z.unknown())).default([]),
  sweep: z.string().default(''),
};

export const FindFilterSchema = z.object({
  agencies: z.array(z.string()).default([]),
  applicant_types: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
}).strict().superRefine((f, ctx) => {
  for (const a of f.applicant_types) if (!(a in APPLICANT_TYPES)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['applicant_types'], message: `unknown applicant type ${a}` });
});
export type FindFilter = z.infer<typeof FindFilterSchema>;

export const RouteSchema = z.object({
  ...common,
  as_of: isoish,
  name: z.string().min(1),
  family: z.enum(FAMILIES),
  what: z.string().min(1),
  who_for: z.string().default(''),
  how_it_works: z.array(z.string()).default([]),
  watch: z.string().default(''),
  programs: ids, funders: ids, standing: ids, gates: ids, mechanics: ids, help: ids, changes: ids,
  who: z.array(z.enum(WHO)).default([]),
  purpose: z.array(z.enum(PURPOSE)).default([]),
  stage: z.array(z.enum(STAGE)).default([]),
  funder_kind: z.enum(ROUTE_FUNDER_KINDS),
  door: z.enum(DOORS),
  find_filter: FindFilterSchema.optional(),
}).passthrough();

const WhoMayApplySchema = z.object({
  applicant_types: z.array(z.string()).default([]),
  standing: ids,
  investigator: z.string().optional(),
  limits: z.string().optional(),
  eligibility_note: z.string().optional(),
  note: z.string().optional(),
}).passthrough().superRefine((w, ctx) => {
  for (const a of w.applicant_types) if (!(a in APPLICANT_TYPES)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['applicant_types'], message: `unknown applicant type ${a}` });
});

export const ProgramSchema = z.object({
  ...common,
  as_of: isoish,
  name: z.string().min(1),
  family: z.enum(PROGRAM_FAMILIES),
  kind: z.string().min(1),
  funder: kebab,
  funder_kind: z.enum(FUNDER_KINDS),
  what: z.string().min(1),
  status: z.enum(PROGRAM_STATUSES, { errorMap: () => ({ message: `status must be one of ${PROGRAM_STATUSES.join(' | ')}` }) }),
  status_as_of: isoish.optional(),
  status_note: z.string().optional(),
  next_date: isoish.optional(),
  status_change: z.string().optional(),
  assistance_listings: z.array(z.string()).default([]),
  who_may_apply: WhoMayApplySchema.nullable().optional(),
  gates: ids,
  on_routes: ids,
  who: z.array(z.enum(WHO)).default([]),
  purpose: z.array(z.enum(PURPOSE)).default([]),
  stage: z.array(z.enum(STAGE)).default([]),
  steps: z.array(z.string()).default([]),
}).passthrough();

export const FunderSchema = z.object({
  ...common,
  as_of: isoish,
  name: z.string().min(1),
  funder_kind: z.enum(FUNDER_KINDS),
  programs: ids,
  unsolicited: z.enum(UNSOLICITED).optional(),
  ein: z.string().optional(),
}).passthrough();

export const StandingSchema = z.object({
  ...common,
  as_of: isoish,
  name: z.string().min(1),
  applies_to: z.enum(STANDING_APPLIES_TO),
  what: z.string().min(1),
  who_qualifies: z.string().min(1),
  how_decided: z.string().min(1),
  opens: ids,
}).passthrough();

export const GateSchema = z.object({
  ...common,
  name: z.string().min(1),
  what: z.string().min(1),
  applies_when: z.string().optional(),
  who_does_it: z.enum(['organisation', 'person', 'both']).optional(),
  steps: z.array(z.string()).default([]),
  same_as: kebab.optional(),
}).passthrough();

export const HelpSchema = z.object({
  ...common,
  name: z.string().min(1),
  what: z.string().min(1),
  who_it_is_for: z.string().optional(),
  cost: z.string().optional(),
}).passthrough();

export const MechanicSchema = z.object({
  ...common,
  name: z.string().min(1),
  what: z.string().min(1),
  rule: z.union([z.string(), z.array(z.string())]).optional(),
  figures: z.array(z.object({ label: z.string(), value: z.string(), cite: refList.default([]) }).passthrough()).default([]),
  applies_to: z.string().optional(),
}).passthrough();

/** A change's `date` is a day, a month (`YYYY-MM`), a year (`YYYY`) or `unknown`. */
export const ChangeSchema = z.object({
  id: kebab,
  date: z.string().regex(/^(\d{4}(-\d{2}(-\d{2})?)?|unknown)$/, 'date must be YYYY-MM-DD, YYYY-MM, YYYY or unknown'),
  status: z.enum(CHANGE_STATUSES),
  what: z.string().min(1),
  affects: z.array(z.string()).default([]),
  sources: refList.default([]),
  sweep: z.string().default(''),
}).strict();

export const PathfinderSchema = z.object({
  version: z.string().optional(),
  as_of: isoish.optional(),
  rule: z.string().min(1),
  display: z.object({
    route_statuses: z.array(z.enum(PROGRAM_STATUSES)).min(1),
    route_statuses_note: z.string().default(''),
    status_date: z.string().default(''),
    foundations_note: z.string().default(''),
    pass_through_note: z.string().default(''),
  }).passthrough(),
  questions: z.array(z.object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    type: z.enum(['single', 'multi']),
    field: z.string().min(1),
    options: z.array(z.object({ tag: z.string().optional(), value: z.string().optional(), label: z.string().min(1) }).strict()).min(1),
  }).strict()).min(1),
  routes: z.array(z.object({
    id: z.string().min(1),
    family: z.enum(FAMILIES),
    door: z.enum(DOORS),
    funder_kind: z.enum(ROUTE_FUNDER_KINDS),
    n: z.object({ federal: z.number().int().min(0), foundation: z.number().int().min(0) }).optional(),
    fit: z.array(z.object({ who: z.enum(WHO), purpose: z.enum(PURPOSE), funder: z.enum(['federal', 'foundation']), count: z.number().int().min(0) }).strict()).default([]),
    who: z.array(z.enum(WHO)).default([]),
    purpose: z.array(z.enum(PURPOSE)).default([]),
    stage: z.array(z.enum(STAGE)).default([]),
  }).strict()),
}).strict();
export type Pathfinder = z.infer<typeof PathfinderSchema>;

export const RECORD_SCHEMAS = {
  routes: RouteSchema,
  programs: ProgramSchema,
  funders: FunderSchema,
  standing: StandingSchema,
  gates: GateSchema,
  help: HelpSchema,
  mechanics: MechanicSchema,
  changes: ChangeSchema,
} as const;
export type RecordFile = keyof typeof RECORD_SCHEMAS;
export const RECORD_FILES = Object.keys(RECORD_SCHEMAS) as RecordFile[];

export interface BuildError { where: string; message: string }

/** Flatten a zod error into build errors with a stable "where" prefix. */
export function zodErrors(where: string, err: z.ZodError): BuildError[] {
  return err.issues.map((i) => ({ where: i.path.length ? `${where}/${i.path.join('/')}` : where, message: i.message }));
}
