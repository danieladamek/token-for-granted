/**
 * build-content.ts — validate the content pack, link terms, emit src/data/*.json + public/provenance.json.
 *
 * Topic mode (APP-SPEC §6.1): the body is review.md, the citation-coverage gate is enforced per block (and on
 * primer bodies, glossary definitions and extension-record prose), every `<!-- synthesis -->` sentence gets a stable
 * id, scope.yaml and queries.yaml are published content, references are tiered.
 * Token for Granted extensions (KICKOFF §4b): routes, programs, funders, standing, gates, help, mechanics, changes,
 * queries and the pathfinder are validated (permissively for keys, strictly for ids and [n]) and emitted, sharded so
 * nothing large sits in the entry bundle (KICKOFF §2): references in blocks of 100 by number, programmes by family,
 * a slim index of every record for lists and links, and the ⌘K index as its own file.
 *
 * Fails loudly (exit 1) on any schema violation, unresolved [n], unknown term/concept/route/gate/programme/funder/
 * standing/mechanic/help/change id, missing data file, ambiguous term variant or uncited block. Errors are written to
 * content-pack/BUILD-ERRORS.md and src/data/build-errors.json so /methods can surface them; whatever validated is
 * still emitted. Idempotent: outputs are rewritten only when their content changed.
 *
 * BX_PACK points the build at another pack (the unit tests use fixture packs); BX_OUT redirects every output, and
 * BX_ERRORS_FILE redirects BUILD-ERRORS.md (the tests never write into a pack).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  APPLICANT_TYPES, ConceptFrontmatterSchema, FiguresSchema, GlossarySchema, hitsNumber, ManifestSchema, PathfinderSchema, PROGRAM_FAMILIES,
  QueriesSchema, RECORD_FILES, RECORD_SCHEMAS, ReferencesSchema, ScopeSchema, TodoSchema, zodErrors,
  type BuildError, type ConceptFrontmatter, type FigureDef, type GlossaryEntry, type Pathfinder, type Query, type RecordFile, type Reference,
} from './lib/schemas';
import { buildMatcher, CITE_RE, expandCitation, findAmbiguousVariants, linkCitations, linkTerms } from './lib/linker';
import { claimWords, parseReview, splitBlocks } from './lib/parse';
import { loadFigureData, recordsOfCell, type LoadedFigure } from './lib/figures';
import { checkRecords, classifyGate, classifyStanding, GATE_GROUPS, linkRecord, STANDING_GROUPS, type AnyRecord, type RecordSet } from './lib/records';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.resolve(process.env.BX_PACK ?? path.join(ROOT, 'content-pack'));
const OUT = path.resolve(process.env.BX_OUT ?? ROOT);
const ERR_FILE = path.resolve(process.env.BX_ERRORS_FILE ?? path.join(PACK, 'BUILD-ERRORS.md'));

const errors: BuildError[] = [];
const warnings: string[] = [];
const E = (where: string, message: string) => errors.push({ where, message });
const W = (m: string) => warnings.push(m);
const written: { file: string; status: 'written' | 'unchanged'; bytes: number }[] = [];

function readYaml(file: string, required = true): unknown {
  const p = path.join(PACK, file);
  if (!fs.existsSync(p)) { if (required) E(file, 'missing file'); return undefined; }
  try { return yaml.load(fs.readFileSync(p, 'utf8')); } catch (e) { E(file, `YAML parse error: ${(e as Error).message}`); return undefined; }
}

function emit(rel: string, content: string | Buffer) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const same = fs.existsSync(p) && Buffer.compare(fs.readFileSync(p), buf) === 0;
  if (!same) fs.writeFileSync(p, buf);
  written.push({ file: rel, status: same ? 'unchanged' : 'written', bytes: buf.length });
}
const emitJson = (rel: string, data: unknown) => emit(rel, JSON.stringify(data) + '\n');
const D = (f: string) => `src/data/${f}`;
/** Remove files in an emitted folder that this build did not write (a shard that no longer exists). */
function prune(dirRel: string, keep: Set<string>) {
  const dir = path.join(OUT, dirRel);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.unlinkSync(path.join(dir, f));
}

const count = <T,>(xs: T[], key: (x: T) => string | undefined | null): Record<string, number> => {
  const o: Record<string, number> = {};
  for (const x of xs) { const k = key(x); if (k !== undefined && k !== null) o[k] = (o[k] ?? 0) + 1; }
  return o;
};
const citesIn = (s: string): number[] => [...s.matchAll(CITE_RE)].flatMap((m) => expandCitation(m[1]));
const plainText = (s: unknown) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s*\[[\d,\s–-]+\]/g, '').replace(/\s+/g, ' ').trim();

// ───────────────────────── 1. load + validate the standard files
const manifestParsed = ManifestSchema.safeParse(readYaml('manifest.yaml'));
if (!manifestParsed.success) errors.push(...zodErrors('manifest', manifestParsed.error));
const manifest = manifestParsed.success ? manifestParsed.data : undefined;
const TOPIC = manifest?.mode === 'topic';
const SELF_CHECKS = manifest?.concept_self_checks ?? false;

const glossaryParsed = GlossarySchema.safeParse(readYaml('glossary.yaml') ?? []);
if (!glossaryParsed.success) errors.push(...zodErrors('glossary', glossaryParsed.error));
const glossary: GlossaryEntry[] = glossaryParsed.success ? glossaryParsed.data : [];
const termIds = new Set(glossary.map((t) => t.id));
for (const [i, t] of glossary.entries()) if (glossary.findIndex((u) => u.id === t.id) !== i) E(`glossary/${t.id}`, 'duplicate id');
const ambiguous = findAmbiguousVariants(glossary);
for (const a of ambiguous) E('glossary', `ambiguous variant ${JSON.stringify(a.variant)} claimed by ${a.ids.join(' and ')}`);
const matcher = buildMatcher(glossary);
const everyOccurrence = manifest?.link_every_occurrence ?? false;

const referencesParsed = ReferencesSchema.safeParse(readYaml('references.yaml') ?? []);
if (!referencesParsed.success) errors.push(...zodErrors('references', referencesParsed.error));
const references: Reference[] = referencesParsed.success ? referencesParsed.data : [];
const refByN = new Map<number, Reference>();
for (const r of references) { if (refByN.has(r.n)) E(`references/${r.n}`, 'duplicate n'); refByN.set(r.n, r); }
const refNs = new Set(refByN.keys());
const keys = new Map<string, number>();
for (const r of references) { if (keys.has(r.key)) W(`references/${r.n}: duplicate key ${r.key} (also [${keys.get(r.key)}])`); keys.set(r.key, r.n); }

/** Where a reference is cited from (sections, concepts, figures, glossary, records). */
const citedFrom = new Map<number, Set<string>>();
const markCited = (n: number, from: string) => { if (!citedFrom.has(n)) citedFrom.set(n, new Set()); citedFrom.get(n)!.add(from); };
const checkCites = (where: string, s: string) => { for (const n of citesIn(s)) { if (!refNs.has(n)) E(where, `cites [${n}] with no reference entry`); else markCited(n, where); } };

/** The citation-coverage gate for a single prose block outside review.md (glossary definitions). */
const gateBlock = (where: string, s: string, sink: { where: string; words: number; excerpt: string }[]) => {
  const plain = s.replace(/<!--[\s\S]*?-->/g, '').trim();
  const words = claimWords(plain);
  if (words >= 25 && !/\[\d/.test(plain) && !/<!--\s*framing\s*-->/.test(s)) {
    sink.push({ where, words, excerpt: plain.slice(0, 120) });
    E(where, `uncited block of ${words} words — cite it or mark it <!-- framing -->: ${JSON.stringify(plain.slice(0, 120))}`);
  }
};

const conceptDir = path.join(PACK, 'concepts');
const conceptFiles = fs.existsSync(conceptDir) ? fs.readdirSync(conceptDir).filter((f) => f.endsWith('.md')).sort() : [];
interface ConceptOut extends ConceptFrontmatter { body_before: string; picture: string | null; body_after: string; has_math: boolean; linked_terms: string[]; used_by_terms: string[]; used_by_figures: string[]; used_by_concepts: string[] }
const concepts: ConceptOut[] = [];
const conceptUncited: { where: string; words: number; excerpt: string }[] = [];
const CONCEPT_USE_HEADINGS = ['## How this guide uses it', '## How this paper uses it'];
for (const f of conceptFiles) {
  const src = fs.readFileSync(path.join(conceptDir, f), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  if (!m) { E(`concepts/${f}`, 'no frontmatter'); continue; }
  let fm: unknown;
  try { fm = yaml.load(m[1]); } catch (e) { E(`concepts/${f}`, `frontmatter YAML: ${(e as Error).message}`); continue; }
  const parsed = ConceptFrontmatterSchema.safeParse(fm);
  if (!parsed.success) { errors.push(...zodErrors(`concepts/${f}`, parsed.error)); continue; }
  const c = parsed.data;
  if (c.id !== f.replace(/\.md$/, '')) E(`concepts/${f}`, `id ${c.id} != filename`);
  // CONTENT-PACK v0.10: questions only when the manifest asks for them
  if (SELF_CHECKS && !c.self_check.length) E(`concepts/${c.id}`, 'manifest.concept_self_checks is true: needs ≥1 self_check');
  if (!SELF_CHECKS && c.self_check.length) W(`concept ${c.id}: carries self_check but manifest.concept_self_checks is false — not rendered`);
  const raw = m[2].trim();
  if (!raw.includes('## What it is')) W(`concept ${c.id}: missing section '## What it is'`);
  if (!CONCEPT_USE_HEADINGS.some((h) => raw.includes(h))) W(`concept ${c.id}: missing section '## How this guide uses it'`);
  // the same coverage gate as review.md, mirroring tools/validate_pack.py (KaTeX is not prose)
  let marker: string | null = null;
  for (const b of splitBlocks(raw.replace(/\$\$[\s\S]*?\$\$/g, ' '))) {
    const txt = b.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (!txt) { marker = /framing/.test(b) ? 'framing' : null; continue; }
    if (/^(#|```|\||>)/.test(txt)) { marker = null; continue; }
    const framing = marker === 'framing' || /<!--\s*framing\s*-->/.test(b);
    const words = claimWords(txt);
    if (words >= 25 && !/\[\d/.test(txt) && !framing) {
      conceptUncited.push({ where: `concepts/${c.id}`, words, excerpt: txt.slice(0, 120) });
      E(`concepts/${c.id}`, `uncited block of ${words} words — cite it or mark it <!-- framing -->: ${JSON.stringify(txt.slice(0, 120))}`);
    }
    marker = null;
  }
  checkCites(`concepts/${c.id}`, `${raw.replace(/\$\$[\s\S]*?\$\$/g, ' ')} ${c.one_liner}`);
  const seen = new Set<string>();
  const linked: string[] = [];
  const link = (s: string) => { const t = linkTerms(s, matcher, { everyOccurrence, seen }); linked.push(...t.linked); return linkCitations(t.text).text; };
  const body = link(raw.replace(/<!--\s*(framing|synthesis)\s*-->/g, ''));
  const pic = /(^|\n)## The key idea in one picture\s*\n([\s\S]*?)(?=\n## |$)/.exec(body);
  let body_before = body, picture: string | null = null, body_after = '';
  if (pic) {
    body_before = body.slice(0, pic.index).trim();
    picture = pic[2].trim();
    body_after = body.slice(pic.index + pic[0].length).trim();
  }
  const self_check = SELF_CHECKS ? c.self_check.map((q) => ({ ...q, explanation: linkCitations(q.explanation).text })) : [];
  concepts.push({ ...c, one_liner: linkCitations(c.one_liner).text, self_check, body_before, picture, body_after, has_math: /\$\$/.test(raw), linked_terms: linked, used_by_terms: [], used_by_figures: [], used_by_concepts: [] });
}
const conceptIds = new Set(concepts.map((c) => c.id));
for (const c of concepts) {
  for (const p of c.prerequisites) if (!conceptIds.has(p)) E(`concepts/${c.id}`, `unknown prerequisite ${p}`);
  for (const t of c.terms) if (!termIds.has(t)) E(`concepts/${c.id}`, `unknown term ${t}`);
}
const glossaryUncited: { where: string; words: number; excerpt: string }[] = [];
for (const t of glossary) {
  if (t.concept && !conceptIds.has(t.concept)) E(`glossary/${t.id}`, `concept -> unknown ${t.concept}`);
  for (const s of t.see) if (!termIds.has(s)) E(`glossary/${t.id}`, `see -> unknown term ${s}`);
  checkCites(`glossary/${t.id}`, `${t.short} ${t.definition}`);
  // KICKOFF §1: glossary definitions are cited the same way as record prose
  gateBlock(`glossary/${t.id}/definition`, t.definition, glossaryUncited);
}

const figuresParsed = FiguresSchema.safeParse(readYaml('figures.yaml') ?? []);
if (!figuresParsed.success) errors.push(...zodErrors('figures', figuresParsed.error));
const figures: FigureDef[] = figuresParsed.success ? figuresParsed.data : [];
const figureIds = new Set(figures.map((f) => f.id));
for (const [i, f] of figures.entries()) if (figures.findIndex((u) => u.id === f.id) !== i) E(`figures/${f.id}`, 'duplicate id');
if (TOPIC) for (const f of figures) {
  if (!f.synthesis) E(`figures/${f.id}`, 'topic mode needs synthesis: data | conceptual');
  if (!f.refs.length) E(`figures/${f.id}`, 'topic mode needs refs: [n, …] — a figure with no references does not ship');
  if (f.kind === 'image' && !/permission/i.test(manifest?.permissions.figures ?? '')) E(`figures/${f.id}`, 'kind image in topic mode needs explicit permission in manifest.permissions.figures');
}

const todoParsed = TodoSchema.safeParse(readYaml('todo.yaml', false) ?? []);
if (!todoParsed.success) errors.push(...zodErrors('todo', todoParsed.error));
const todo = todoParsed.success ? todoParsed.data : [];

let scope = undefined as undefined | ReturnType<typeof ScopeSchema.parse>;
if (TOPIC) {
  const scopeParsed = ScopeSchema.safeParse(readYaml('scope.yaml'));
  if (!scopeParsed.success) errors.push(...zodErrors('scope', scopeParsed.error));
  else { scope = scopeParsed.data; if (scope.assumed) W('scope: assumed=true — the defaults taken are listed on /methods'); }
}
// queries.yaml is published in full on /methods: a query that fails the schema is reported and still shown as recorded
const queriesRaw = readYaml('queries.yaml') ?? [];
const queries: (Query & { invalid?: boolean })[] = [];
for (const [i, q] of (Array.isArray(queriesRaw) ? queriesRaw : []).entries()) {
  const p = QueriesSchema.element.safeParse(q);
  if (p.success) { queries.push(p.data); continue; }
  errors.push(...zodErrors(`queries/${i + 1}`, p.error).map((e) => ({ ...e, message: `${e.message} (the query as recorded: ${JSON.stringify(q).slice(0, 160)})` })));
  const o = (q ?? {}) as Record<string, unknown>;
  queries.push({ text: String(o.text ?? ''), engine: String(o.engine ?? ''), hits: (o.hits as string | number | undefined) ?? '', date: o.date == null ? '' : String(o.date), slice: String(o.slice ?? ''), invalid: true });
}
if (!Array.isArray(queriesRaw)) E('queries.yaml', 'must be a list');

// ───────────────────────── 2. extension records + pathfinder (KICKOFF §4b)
const records = {} as RecordSet;
for (const file of RECORD_FILES) {
  const raw = readYaml(`${file}.yaml`);
  const arr = Array.isArray(raw) ? raw : [];
  if (raw !== undefined && !Array.isArray(raw)) E(`${file}.yaml`, 'must be a list of records');
  const ok: AnyRecord[] = [];
  for (const [i, rec] of arr.entries()) {
    const p = RECORD_SCHEMAS[file].safeParse(rec);
    const id = (rec as { id?: string })?.id ?? `#${i}`;
    if (!p.success) errors.push(...zodErrors(`${file}/${id}`, p.error));
    else ok.push(p.data as AnyRecord);
  }
  records[file] = ok;
}
for (const f of manifest?.extensions.record_files ?? []) if (!fs.existsSync(path.join(PACK, f))) E('manifest/extensions/record_files', `${f} missing`);
const recordCheck = checkRecords(records, { refNs });
errors.push(...recordCheck.errors);
warnings.push(...recordCheck.warnings);
for (const [n, keysList] of recordCheck.citedBy) for (const k of keysList) markCited(n, k);
const recordKeys = new Set((Object.keys(records) as RecordFile[]).flatMap((f) => records[f].map((r) => `${f}/${r.id}`)));
const byId = <T extends AnyRecord>(file: RecordFile) => new Map(records[file].map((r) => [r.id, r as T]));
const funderById = byId('funders');
const programById = byId('programs');
/** The 65 foundations and other private grantmakers are the funder records with `unsolicited`; every other funder is federal-side. */
const isFoundationFunder = (f: AnyRecord | undefined) => !!f && typeof f.unsolicited === 'string';
const sideOf = (p: AnyRecord): 'federal' | 'foundation' => (isFoundationFunder(funderById.get(String(p.funder))) ? 'foundation' : 'federal');

// a programme's on_routes and the routes' programs[] must agree; a programme on no route is reported
for (const r of records.routes) for (const pid of (r.programs as string[]) ?? []) {
  const p = programById.get(pid);
  if (p && !((p.on_routes as string[]) ?? []).includes(r.id)) W(`programs/${pid}: on route ${r.id} but its on_routes does not name it`);
}
for (const p of records.programs) if (!((p.on_routes as string[]) ?? []).length) W(`programs/${p.id}: on no route`);

const pfParsed = PathfinderSchema.safeParse(readYaml('pathfinder.yaml'));
if (!pfParsed.success) errors.push(...zodErrors('pathfinder', pfParsed.error));
const pathfinder: Pathfinder | undefined = pfParsed.success ? pfParsed.data : undefined;
if (pathfinder) {
  const routeById = byId('routes');
  for (const pr of pathfinder.routes) {
    const r = routeById.get(pr.id);
    if (!r) { E(`pathfinder/routes/${pr.id}`, 'unknown route id'); continue; }
    if (r.family !== pr.family) E(`pathfinder/routes/${pr.id}`, `family ${pr.family} but routes.yaml says ${String(r.family)}`);
    if (pr.family === 'start') {
      if (!pr.who.length || !pr.purpose.length) E(`pathfinder/routes/${pr.id}`, 'an entry route needs who and purpose tags');
    } else {
      if (!pr.n) { E(`pathfinder/routes/${pr.id}`, 'a family route needs n: {federal, foundation}'); continue; }
      // the counts are computed at consolidation from the programme records; a drift is reported, never "fixed"
      const progs = ((r.programs as string[]) ?? []).map((id) => programById.get(id)).filter((p): p is AnyRecord => !!p);
      const n = { federal: progs.filter((p) => sideOf(p) === 'federal').length, foundation: progs.filter((p) => sideOf(p) === 'foundation').length };
      if (n.federal !== pr.n.federal || n.foundation !== pr.n.foundation) W(`pathfinder/routes/${pr.id}: n is ${JSON.stringify(pr.n)} but the route's programme records give ${JSON.stringify(n)}`);
      for (const ft of pr.fit) {
        const c = progs.filter((p) => sideOf(p) === ft.funder && ((p.who as string[]) ?? []).includes(ft.who) && ((p.purpose as string[]) ?? []).includes(ft.purpose)).length;
        if (c !== ft.count) W(`pathfinder/routes/${pr.id}: fit ${ft.who} × ${ft.purpose} × ${ft.funder} is ${ft.count} but the records give ${c}`);
      }
    }
  }
  for (const r of records.routes) if (!pathfinder.routes.some((p) => p.id === r.id)) W(`pathfinder: route ${r.id} has no entry — it can never appear on /`);
  for (const q of pathfinder.questions) if (!['who', 'purpose', 'stage', 'funder_kind'].includes(q.field)) E(`pathfinder/questions/${q.id}`, `unknown field ${q.field}`);
}

// ───────────────────────── 3. review.md → sections, blocks, term links, citation tokens
const bodyFile = TOPIC ? 'review.md' : 'manuscript.md';
const bodyPath = path.join(PACK, bodyFile);
const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath, 'utf8') : (E(bodyFile, 'missing file'), '');
const parsed = parseReview(body, matcher, { everyOccurrence });
for (const d of parsed.duplicateSections) E(bodyFile, `duplicate section id ${d}`);
const sectionIds = new Set(parsed.sections.map((s) => s.id));
for (const fm of parsed.figureMarkers) if (!figureIds.has(fm)) E(bodyFile, `figure marker ${fm} not in figures.yaml`);
for (const f of figures) if (!parsed.figureMarkers.includes(f.id)) W(`figure ${f.id} has no marker in ${bodyFile}`);
for (const u of parsed.uncited) E(`${bodyFile}/${u.section}`, `uncited block of ${u.words} words — cite it or mark it <!-- framing -->: ${JSON.stringify(u.excerpt)}`);
if (TOPIC) for (const q of body.match(/[“"]([^”"\n]{4,})[”"]/g) ?? []) {
  const inner = q.slice(1, -1);
  if (inner.split(/\s+/).length > 25) E(bodyFile, `quotation longer than 25 words: ${JSON.stringify(inner.slice(0, 60))}`);
}
const unresolvedCitations = parsed.citations.filter((n) => !refByN.has(n));
for (const n of unresolvedCitations) E(bodyFile, `cites [${n}] with no reference entry`);
for (const s of parsed.sections) for (const n of s.cites) if (refNs.has(n)) markCited(n, `sections/${s.id}`);
for (const f of figures) {
  for (const n of f.refs) { if (!refByN.has(n)) E(`figures/${f.id}`, `refs -> [${n}] has no reference entry`); else markCited(n, `figures/${f.id}`); }
  checkCites(`figures/${f.id}`, `${f.caption} ${f.how_to_read} ${f.source} ${f.explain.map((e) => e.text).join(' ')}`);
}

// ───────────────────────── 4. figure data + declared fields
const loaded = new Map<string, LoadedFigure>();
for (const f of figures) {
  loaded.set(f.id, loadFigureData(f, PACK, { termIds, sectionIds, refNs, topic: TOPIC, recordKeys }, errors));
  for (const ex of f.explain) {
    if (ex.term && !termIds.has(ex.term)) E(`figures/${f.id}`, `explain term ${ex.term} unknown`);
    if (ex.concept && !conceptIds.has(ex.concept)) E(`figures/${f.id}`, `explain concept ${ex.concept} unknown`);
  }
  for (const c of f.concepts) if (!conceptIds.has(c)) E(`figures/${f.id}`, `concept ${c} unknown`);
  for (const s of f.discussed_in) if (!sectionIds.has(s)) E(`figures/${f.id}`, `discussed_in section ${s} unknown`);
  for (const t of loaded.get(f.id)?.table?.rows ?? []) for (const n of String(t.ref ?? '').split(/[;,]/).filter((x) => x.trim()).map(Number)) if (refNs.has(n)) markCited(n, `figures/${f.id}`);
  for (const nd of loaded.get(f.id)?.pathway?.nodes ?? []) for (const n of nd.refs) if (refNs.has(n)) markCited(n, `figures/${f.id}`);
}
for (const c of concepts) for (const fg of c.figures) if (!figureIds.has(fg)) E(`concepts/${c.id}`, `unknown figure ${fg}`);

// references: cited_in / used_by ids, the "never cited" check (a reference cited only from a record is cited), unverified
const resolvesKey = (k: string) => {
  const [file, ...rest] = k.split('/');
  const id = rest.join('/');
  if (recordKeys.has(k)) return true;
  if (file === 'glossary') return termIds.has(id);
  if (file === 'concepts') return conceptIds.has(id);
  if (file === 'figures') return figureIds.has(id);
  if (file === 'sections') return sectionIds.has(id);
  if (file === 'todo') return todo.some((t) => t.id === id);
  return false;
};
for (const r of references) {
  for (const s of r.cited_in) if (!(sectionIds.has(s) || figureIds.has(s) || conceptIds.has(s))) W(`references/${r.n}: cited_in ${s} names nothing in this build`);
  for (const u of r.used_by) if (!resolvesKey(u)) W(`references/${r.n}: used_by ${u} names nothing in this build`);
}
const neverCited = references.filter((r) => !citedFrom.has(r.n)).map((r) => r.n);
if (neverCited.length) W(`${neverCited.length} references are cited nowhere (review, primers, figures, glossary or records)`);
// APP-SPEC §6.1 rule 7 — a claim resting on a verified: false reference is flagged on /methods in amber.
const unverifiedButCited = references.filter((r) => !r.verified && citedFrom.has(r.n)).map((r) => r.n);
for (const n of unverifiedButCited) W(`references/${n}: cited but verified: false — flagged on /methods`);

// ───────────────────────── 5. pack voice (KICKOFF §1): second person in pack text is a pack error, rendered as written
const voice: { where: string; excerpt: string }[] = [];
const YOU = /\b(you|your|yours|yourself)\b/i;
const voiceCheck = (where: string, s: string) => {
  for (const sentence of plainText(s).split(/(?<=[.!?])\s+/)) {
    if (YOU.test(sentence) && !/^["“]/.test(sentence.trim())) voice.push({ where, excerpt: sentence.trim().slice(0, 220) });
  }
};
if (manifest) voiceCheck('manifest/plain_abstract', manifest.plain_abstract);
for (const s of parsed.sections) for (const c of s.chunks) if (c.kind === 'md') voiceCheck(`review.md/${s.id}`, c.md.replace(/\]\(#(term|cite):[^)]*\)/g, ']').replace(/<\/?mark[^>]*>/g, ''));
for (const file of RECORD_FILES) for (const r of records[file]) for (const [k, v] of Object.entries(r)) {
  if (['id', 'name', 'official_url', 'sources', 'sweep', 'variants'].includes(k)) continue;
  for (const s of typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []) voiceCheck(`${file}/${r.id}/${k}`, s);
}
let consolidationSecondPerson: string[] = [];
try {
  const rep = JSON.parse(fs.readFileSync(path.join(PACK, 'consolidation-report.json'), 'utf8')) as { second_person?: string[] };
  consolidationSecondPerson = rep.second_person ?? [];
  for (const k of consolidationSecondPerson) if (!recordKeys.has(k)) W(`consolidation-report.json: second_person ${k} names no record`);
} catch { W('consolidation-report.json missing or unreadable — the second-person list on /methods comes from this build only'); }

// ───────────────────────── 6. cross-links used by the app
const appearsIn = new Map<string, string[]>();
for (const s of parsed.sections) for (const t of s.terms) { if (!appearsIn.has(t)) appearsIn.set(t, []); appearsIn.get(t)!.push(s.id); }
const inRecords = new Map<string, string[]>();
const linkedRecords = {} as Record<RecordFile, AnyRecord[]>;
for (const file of RECORD_FILES) {
  linkedRecords[file] = records[file].map((r) => {
    const { record, terms } = linkRecord(r, matcher, { everyOccurrence });
    for (const t of terms) { if (!inRecords.has(t)) inRecords.set(t, []); inRecords.get(t)!.push(`${file}/${r.id}`); }
    return record;
  });
}
const inConcepts = new Map<string, string[]>();
for (const c of concepts) for (const t of [...new Set([...c.terms, ...c.linked_terms])]) { if (!inConcepts.has(t)) inConcepts.set(t, []); inConcepts.get(t)!.push(c.id); }
const termFigures = new Map<string, Set<string>>();
for (const f of figures) {
  for (const ex of f.explain) if (ex.term) { if (!termFigures.has(ex.term)) termFigures.set(ex.term, new Set()); termFigures.get(ex.term)!.add(f.id); }
  for (const nd of loaded.get(f.id)?.pathway?.nodes ?? []) if (nd.term) { if (!termFigures.has(nd.term)) termFigures.set(nd.term, new Set()); termFigures.get(nd.term)!.add(f.id); }
}
for (const c of concepts) {
  c.used_by_terms = glossary.filter((t) => t.concept === c.id).map((t) => t.id);
  c.used_by_figures = figures.filter((f) => f.concepts.includes(c.id) || f.explain.some((e) => e.concept === c.id)).map((f) => f.id);
  c.used_by_concepts = concepts.filter((o) => o.prerequisites.includes(c.id)).map((o) => o.id);
}
const refSections = new Map<number, string[]>();
for (const s of parsed.sections) for (const n of s.cites) { if (!refSections.has(n)) refSections.set(n, []); refSections.get(n)!.push(s.id); }

const push = (m: Map<string, string[]>, k: string, v: string) => { if (!m.has(k)) m.set(k, []); if (!m.get(k)!.includes(v)) m.get(k)!.push(v); };
const gateRoutes = new Map<string, string[]>();
const gatePrograms = new Map<string, string[]>();
const standingRoutes = new Map<string, string[]>();
const mechanicRoutes = new Map<string, string[]>();
const helpRoutes = new Map<string, string[]>();
const changeRoutes = new Map<string, string[]>();
const funderRoutes = new Map<string, string[]>();
for (const r of records.routes) {
  for (const g of (r.gates as string[]) ?? []) push(gateRoutes, g, r.id);
  for (const s of (r.standing as string[]) ?? []) push(standingRoutes, s, r.id);
  for (const m of (r.mechanics as string[]) ?? []) push(mechanicRoutes, m, r.id);
  for (const h of (r.help as string[]) ?? []) push(helpRoutes, h, r.id);
  for (const c of (r.changes as string[]) ?? []) push(changeRoutes, c, r.id);
  for (const f of (r.funders as string[]) ?? []) push(funderRoutes, f, r.id);
}
for (const p of records.programs) for (const g of (p.gates as string[]) ?? []) push(gatePrograms, g, p.id);
const changedBy = new Map<string, string[]>();
for (const c of records.changes) for (const a of (c.affects as string[]) ?? []) push(changedBy, a, c.id);
const standingOpensReverse = new Map<string, string[]>();
for (const s of records.standing) for (const p of (s.opens as string[]) ?? []) push(standingOpensReverse, p, s.id);
const fileOfId = (id: string): RecordFile[] => RECORD_FILES.filter((f) => records[f].some((r) => r.id === id));
const funderPrograms = new Map<string, string[]>();
for (const p of records.programs) push(funderPrograms, String(p.funder), p.id);

/** A status is a reading on one day: the date beside it (KICKOFF §1). */
const statusDate = (p: AnyRecord) => String(p.status_as_of ?? p.as_of ?? '');

// ───────────────────────── 7. emit
const words = parsed.sections.reduce((a, s) => a + s.words, 0);
if (manifest) emitJson(D('manifest.json'), { ...manifest, sections: parsed.sections.length, words, references: references.length });
emitJson(D('sections.json'), parsed.sections);
emitJson(D('sections-index.json'), parsed.sections.map((s) => ({ id: s.id, title: s.title, depth: s.depth, number: s.number, words: s.words, figures: s.figures, synthesis_blocks: s.synthesis_blocks, terms: s.terms })));
emitJson(D('glossary.json'), glossary.map((t) => ({
  ...t,
  definition: linkCitations(t.definition).text,
  appears_in: appearsIn.get(t.id) ?? [],
  in_records: inRecords.get(t.id) ?? [],
  in_concepts: inConcepts.get(t.id) ?? [],
  occurrences: parsed.occurrences[t.id] ?? 0,
  figures: [...(termFigures.get(t.id) ?? [])],
})));
emitJson(D('glossary-short.json'), glossary.map((t) => ({ id: t.id, term: t.term, domain: t.domain, own_label: t.own_label, short: t.short, concept: t.concept ?? null })));
emitJson(D('concepts.json'), concepts);
emitJson(D('concepts-index.json'), concepts.map((c) => ({ id: c.id, title: c.title, one_liner: c.one_liner, prerequisites: c.prerequisites, figures: c.figures, terms: c.terms })));

const figuresOut = figures.map((f) => {
  const d = loaded.get(f.id);
  return {
    ...f,
    caption: linkCitations(f.caption).text,
    how_to_read: linkCitations(f.how_to_read).text,
    source: linkCitations(f.source).text,
    explain: f.explain.map((e) => ({ ...e, text: linkCitations(e.text).text })),
    table: d?.table,
    pathway: d?.pathway,
    provenance: f.kind === 'image' ? 'original image' : f.synthesis === 'conceptual' ? 'synthesised: a conceptual diagram drawn from the cited sources' : 'synthesised from data across cited works',
  };
});
// one chunk per figure, so a figure page loads only its own data
prune('src/data/figures', new Set(figuresOut.map((f) => `${f.id}.json`)));
for (const f of figuresOut) emitJson(D(`figures/${f.id}.json`), f);
emitJson(D('figures-index.json'), figuresOut.map((f) => ({
  id: f.id, label: f.label, title: f.title, kind: f.kind, chart_type: f.chart?.type ?? null, synthesis: f.synthesis ?? null,
  provenance: f.provenance, concepts: f.concepts, refs: f.refs, rows: f.table?.rows.length ?? null,
  has_chart: !!f.chart, discussed_in: f.discussed_in, data: f.data ? path.basename(f.data) : null, script: f.script ? path.basename(f.script) : null,
})));
// figure files a reader can download: data + script, exactly as they ship in the pack
const figPublic = new Set<string>();
for (const f of figures) for (const rel of [f.data, f.script]) {
  if (rel && fs.existsSync(path.join(PACK, rel))) { emit(`public/figures/${path.basename(rel)}`, fs.readFileSync(path.join(PACK, rel))); figPublic.add(path.basename(rel)); }
}
prune('public/figures', figPublic);

// references: full cards in shards of 100 by number, and a slim card index in shards of the same 100 (KICKOFF §2)
const recordsCiting = (n: number) => [...(citedFrom.get(n) ?? [])].filter((k) => recordKeys.has(k));
const SHARD = 100;
const shards = new Map<number, unknown[]>();
const metaShards = new Map<number, unknown[]>();
for (const r of references) {
  const k = Math.floor((r.n - 1) / SHARD);
  if (!shards.has(k)) { shards.set(k, []); metaShards.set(k, []); }
  shards.get(k)!.push({
    ...r,
    summary: linkCitations(r.summary).text,
    cited_sections: refSections.get(r.n) ?? [],
    cited_records: recordsCiting(r.n),
    cited_elsewhere: [...(citedFrom.get(r.n) ?? [])].filter((k2) => !recordKeys.has(k2) && !k2.startsWith('sections/')),
  });
  metaShards.get(k)!.push({
    n: r.n, key: r.key, year: r.year, tier: r.tier, publisher: r.publisher, source_kind: r.source_kind, read: r.read, role_here: r.role_here,
    verified: r.verified, recheck: r.recheck, rechecked: r.rechecked ?? null, fetch: r.recheck_result?.fetch ?? null, seminal: r.tier === 'seminal',
    title: r.title || r.citation.slice(0, 140), citation: r.citation.length > 160 ? `${r.citation.slice(0, 160).replace(/\s+\S*$/, '')}…` : r.citation,
    cited_sections: refSections.get(r.n) ?? [], cited: citedFrom.has(r.n),
  });
}
prune('src/data/refs', new Set([...shards.keys()].flatMap((k) => [`r${k}.json`, `m${k}.json`])));
for (const [k, list] of shards) emitJson(D(`refs/r${k}.json`), list);
for (const [k, list] of metaShards) emitJson(D(`refs/m${k}.json`), list);
emitJson(D('todo.json'), todo.map((t) => ({ id: t.id, kind: t.kind, where: t.where, what: linkCitations(t.what).text, sweep: t.sweep ?? '' })));
emitJson(D('synthesis.json'), parsed.synthesis);
if (scope) emitJson(D('scope.json'), {
  ...scope,
  search_strategy: { ...scope.search_strategy, queries: undefined, query_count: scope.search_strategy.queries.length },
});
emitJson(D('queries.json'), queries.map((q) => ({ ...q, hits_n: hitsNumber(q.hits) })));

// records — linked prose, plus the reverse links each page shows
const gateGroup = new Map(records.gates.map((g) => [g.id, classifyGate(g as unknown as { id: string })]));
const recordOut = (file: RecordFile, r: AnyRecord) => {
  const extra: Record<string, unknown> = {};
  if (file !== 'changes') extra.changes_affecting = changedBy.get(r.id) ?? [];
  if (file === 'gates') { extra.routes = gateRoutes.get(r.id) ?? []; extra.programs_requiring = gatePrograms.get(r.id) ?? []; extra.group = gateGroup.get(r.id); }
  if (file === 'standing') { extra.routes = standingRoutes.get(r.id) ?? []; extra.group = classifyStanding(r as unknown as { id: string; applies_to: string }); }
  if (file === 'mechanics') extra.routes = mechanicRoutes.get(r.id) ?? [];
  if (file === 'help') extra.routes = helpRoutes.get(r.id) ?? [];
  if (file === 'funders') { extra.routes = funderRoutes.get(r.id) ?? []; extra.side = isFoundationFunder(r) ? 'foundation' : 'federal'; extra.programs_all = funderPrograms.get(r.id) ?? []; }
  if (file === 'programs') { extra.side = sideOf(r); extra.status_date = statusDate(r); extra.standing_opening = standingOpensReverse.get(r.id) ?? []; }
  if (file === 'changes') { extra.affects_files = Object.fromEntries(((r.affects as string[]) ?? []).map((a) => [a, fileOfId(a)])); extra.routes = changeRoutes.get(r.id) ?? []; }
  return { ...r, ...extra };
};
for (const file of RECORD_FILES) {
  if (file === 'programs') continue;
  emitJson(D(`${file}.json`), linkedRecords[file].map((r) => recordOut(file, r)));
}
// programmes by family (four shards); /programs uses the slim index below, a programme page loads one shard
for (const fam of PROGRAM_FAMILIES) emitJson(D(`programs/${fam}.json`), linkedRecords.programs.filter((p) => p.family === fam).map((p) => recordOut('programs', p)));
prune('src/data/programs', new Set(PROGRAM_FAMILIES.map((f) => `${f}.json`)));
emitJson(D('gate-groups.json'), GATE_GROUPS);
emitJson(D('standing-groups.json'), STANDING_GROUPS);

// federal funders as a tree by `parent`: a parent that names another funder's id (or starts with it) nests under it;
// any other parent is shown as written, as the heading of its group
const funderIds = new Set(records.funders.map((f) => f.id));
const parentOf = (f: AnyRecord): string | null => {
  const p = String(f.parent ?? '').trim();
  if (!p) return null;
  const lead = p.toLowerCase().split(/[\s(,]/)[0];
  return funderIds.has(p.toLowerCase()) ? p.toLowerCase() : funderIds.has(lead) ? lead : null;
};
emitJson(D('funders-tree.json'), records.funders.filter((f) => !isFoundationFunder(f)).map((f) => ({ id: f.id, name: String(f.name), parent_id: parentOf(f), parent_text: (f.parent as string | undefined) ?? null })));

// /find's saved searches: every route's find_filter, and every programme's Assistance Listings
emitJson(D('saved-searches.json'), {
  routes: records.routes.filter((r) => r.find_filter).map((r) => ({ id: r.id, name: String(r.name), family: r.family, find_filter: r.find_filter })),
  programs: records.programs.filter((p) => ((p.assistance_listings as string[]) ?? []).length).map((p) => ({ id: p.id, name: String(p.name), assistance_listings: p.assistance_listings })),
  applicant_types: APPLICANT_TYPES,
});
if (pathfinder) emitJson(D('pathfinder.json'), pathfinder);
// each programme status in the pack's own words (KICKOFF §1): the glossary entry of that id where one exists,
// else the label's parenthesis in the definition of `status-label`
{
  const statusLabel = glossary.find((t) => t.id === 'status-label');
  const words: Record<string, { text: string; term: string | null }> = {};
  for (const st of ['open', 'forecast', 'closed', 'no-current-notice', 'formula', 'not-competed', 'expired', 'unconfirmed']) {
    const own = glossary.find((t) => t.id === st);
    const m = statusLabel ? new RegExp(`\\b${st.replace(/-/g, '[- ]')}\\s*\\(([^)]*)\\)`).exec(statusLabel.definition) : null;
    if (m) words[st] = { text: m[1], term: own?.id ?? 'status-label' };
    else if (own) words[st] = { text: own.short, term: own.id };
    else W(`status ${st}: neither a glossary entry nor a wording in status-label — shown without its words`);
  }
  emitJson(D('status-words.json'), words);
}

/** Change dates: a day, a month or a year, never padded (KICKOFF §4b /changes). Newest first; undated last. */
const dateKey = (d: string): [number, number, number] | null => {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(d);
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
};
const newestFirst = (a: AnyRecord, b: AnyRecord) => {
  const ka = dateKey(String(a.date)); const kb = dateKey(String(b.date));
  if (!ka || !kb) return ka ? -1 : kb ? 1 : 0;
  return kb[0] - ka[0] || kb[1] - ka[1] || kb[2] - ka[2];
};
// the front door's own small file: route names and counts, and the five latest dated changes
const latestChanges = [...linkedRecords.changes].filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(String(c.date)) && String(c.date) <= String(manifest?.as_of ?? '9999')).sort(newestFirst).slice(0, 5);
emitJson(D('home.json'), {
  routes: Object.fromEntries(records.routes.map((r) => [r.id, { name: r.name, family: r.family, door: r.door, funder_kind: r.funder_kind }])),
  changes: latestChanges.map((c) => ({ id: c.id, date: c.date, status: c.status, what: c.what })),
  route_counts: count(records.routes, (r) => r.family as string),
  programs: records.programs.length,
});

const recordTitle = (r: AnyRecord) => String(r.name ?? r.id);
function recordPath(file: RecordFile, id: string): string { return ({
  routes: `/routes/${id}`, programs: `/programs/${id}`, funders: `/funders/${id}`, standing: `/standing#${id}`, gates: `/gates#${id}`,
  help: `/help#${id}`, mechanics: `/how#${id}`, changes: `/changes#${id}`,
} as Record<RecordFile, string>)[file]; }
const changeTitle = (r: AnyRecord) => `${String(r.date)} · ${plainText(r.what).slice(0, 90)}`;
const recordsIndex = RECORD_FILES.flatMap((file) => records[file].map((r) => ({
  type: file, id: r.id, title: file === 'changes' ? changeTitle(r) : recordTitle(r), to: recordPath(file, r.id),
  family: (r.family as string | undefined) ?? null,
  status: file === 'programs' || file === 'changes' ? String(r.status) : null,
  date: file === 'programs' ? statusDate(r) : file === 'changes' ? String(r.date) : null,
  side: file === 'programs' ? sideOf(r) : file === 'funders' ? (isFoundationFunder(r) ? 'foundation' : 'federal') : null,
})));
emitJson(D('records-index.json'), recordsIndex);
// /programs: every programme with the fields its filters need, and the plain `what` for free text
emitJson(D('programs-index.json'), records.programs.map((p) => ({
  id: p.id, name: p.name, family: p.family, kind: p.kind, funder: p.funder, funder_name: String(funderById.get(String(p.funder))?.name ?? p.funder),
  side: sideOf(p), status: p.status, status_date: statusDate(p), next_date: p.next_date ?? null,
  who: p.who, purpose: p.purpose, routes: p.on_routes, als: p.assistance_listings ?? [], mechanism_code: p.mechanism_code ?? null,
  what: plainText(p.what).slice(0, 320),
})));

const TYPE_WORD: Record<RecordFile, string> = { routes: 'Route', programs: 'Programme', funders: 'Funder', standing: 'Standing', gates: 'Gate', help: 'Help', mechanics: 'Rule', changes: 'Change' };
emitJson(D('search.json'), [
  ...glossary.map((t) => ({ kind: 'term', id: t.id, title: t.term, subtitle: t.short, to: `/glossary#${t.id}`, hay: `${t.term} ${t.variants.join(' ')} ${t.short}`.toLowerCase() })),
  ...concepts.map((c) => ({ kind: 'concept', id: c.id, title: c.title, subtitle: plainText(c.one_liner), to: `/concepts/${c.id}`, hay: `${c.title} ${plainText(c.one_liner)}`.toLowerCase() })),
  ...figures.map((f) => ({ kind: 'figure', id: f.id, title: `${f.label} · ${f.title}`, subtitle: f.kind, to: `/figures/${f.id}`, hay: `${f.label} ${f.title} ${f.kind}`.toLowerCase() })),
  ...parsed.sections.map((s) => ({ kind: 'section', id: s.id, title: s.title, subtitle: `Section · ${s.words} words`, to: `/read#${s.id}`, hay: `${s.title} ${s.number ?? ''}`.toLowerCase() })),
  ...RECORD_FILES.flatMap((file) => records[file].map((r) => {
    const title = file === 'changes' ? changeTitle(r) : recordTitle(r);
    const what = plainText(r.what ?? r.what_it_funds ?? '');
    const fam = r.family ? ` · ${manifest?.extensions.families[String(r.family)] ?? r.family}` : '';
    const sub = file === 'programs' ? `${TYPE_WORD[file]}${fam} · ${String(r.status)} (${statusDate(r)})` : `${TYPE_WORD[file]}${fam}`;
    return { kind: file, id: r.id, title, subtitle: sub, to: recordPath(file, r.id), hay: `${title} ${r.id} ${String(r.mechanism_code ?? '')} ${((r.assistance_listings as string[]) ?? []).join(' ')} ${what.slice(0, 240)}`.toLowerCase() };
  })),
]);

// ───────────────────────── provenance
const bodyText = body.replace(/<!--[\s\S]*?-->/g, ' ');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rawOccurs = (t: GlossaryEntry) => [t.term, ...t.variants].some((v) => new RegExp(`(?<![\\w-])${escapeRe(v)}(?![\\w-])`, 'i').test(bodyText));
const occurring = glossary.filter(rawOccurs);
const linkedTerms = glossary.filter((t) => (appearsIn.get(t.id) ?? []).length > 0);
const unmatched = glossary.filter((t) => !rawOccurs(t)).map((t) => t.id);
const occurringNotLinked = occurring.filter((t) => !linkedTerms.includes(t)).map((t) => t.id);
const reachable = glossary.filter((t) => (appearsIn.get(t.id) ?? []).length || (inRecords.get(t.id) ?? []).length || (inConcepts.get(t.id) ?? []).length).length;
const cited = references.filter((r) => citedFrom.has(r.n));
const factCodes = count(references.flatMap((r) => r.fact_check ?? []), (c) => c);

const provenance = {
  slug: manifest?.slug ?? null,
  mode: manifest?.mode ?? 'manuscript',
  as_of: manifest?.as_of ?? null,
  builder: manifest?.builder ?? null,
  sections: parsed.sections.length,
  words,
  blocks: { ...parsed.blocks, uncited: parsed.uncited.length },
  synthesis_passages: parsed.synthesis.length,
  concept_uncited: conceptUncited.length,
  glossary_uncited: glossaryUncited.length,
  record_prose: { items: recordCheck.proseItems, cited: recordCheck.proseCited, framing: recordCheck.proseFraming, uncited: recordCheck.uncited.length },
  terms: {
    total: glossary.length,
    occurring: occurring.length,
    linked: linkedTerms.length,
    linked_pct_of_occurring: occurring.length ? Math.round((linkedTerms.length / occurring.length) * 1000) / 10 : 0,
    unmatched,
    occurring_not_linked: occurringNotLinked,
    linked_in_records: inRecords.size,
    reachable_anywhere: reachable,
    by_domain: count(glossary, (t) => t.domain),
    own_label: glossary.filter((t) => t.own_label).map((t) => t.id),
    link_every_occurrence: everyOccurrence,
    variants: matcher.variants,
    ambiguous_variants: ambiguous,
  },
  references: {
    total: references.length,
    by_tier: count(references, (r) => r.tier),
    by_role_here: count(references, (r) => r.role_here),
    by_source_kind: count(references, (r) => r.source_kind),
    by_read: count(references, (r) => r.read),
    cited: cited.length,
    cited_in_review: parsed.citations.filter((n) => refNs.has(n)).length,
    cited_only_from_records: cited.filter((r) => [...citedFrom.get(r.n)!].every((k) => recordKeys.has(k))).length,
    never_cited: neverCited.length,
    never_cited_list: neverCited,
    rechecked: references.filter((r) => !!r.rechecked).length,
    recheck_cleared: references.filter((r) => !r.recheck).length,
    flagged: references.filter((r) => r.recheck).length,
    flagged_cited: references.filter((r) => r.recheck && citedFrom.has(r.n)).length,
    fetch_blocked: references.filter((r) => r.recheck_result?.fetch === 'blocked').map((r) => r.n),
    partial_reads: references.filter((r) => r.recheck_result?.partial).length,
    fact_codes: factCodes,
    quotes: references.reduce((a, r) => a + r.quotes.length, 0),
    quotes_dropped: references.reduce((a, r) => a + (r.recheck_result?.quotes_dropped ?? 0), 0),
    by_hand: references.reduce((a, r) => a + (r.recheck_result?.by_hand ?? 0), 0),
    key_facts: references.reduce((a, r) => a + r.key_facts.length, 0),
    verified: references.filter((r) => r.verified).length,
    unverified: references.filter((r) => !r.verified).map((r) => r.n),
    unverified_but_cited: unverifiedButCited,
    unresolved_citations: unresolvedCitations,
  },
  figures: { total: figures.length, by_kind: count(figures, (f) => f.kind), by_synthesis: count(figures, (f) => f.synthesis), original_image: figures.filter((f) => f.kind === 'image').length },
  concepts: concepts.length,
  records: Object.fromEntries(RECORD_FILES.map((f) => [f, records[f].length])),
  records_detail: {
    programs_by_status: count(records.programs, (p) => p.status as string),
    programs_by_family: count(records.programs, (p) => p.family as string),
    programs_by_side: count(records.programs, (p) => sideOf(p)),
    programs_by_kind: count(records.programs, (p) => p.kind as string),
    programs_with_status_change: records.programs.filter((p) => p.status_change).length,
    routes_by_family: count(records.routes, (r) => r.family as string),
    routes_with_find_filter: records.routes.filter((r) => r.find_filter).length,
    funders_by_side: count(records.funders, (f) => (isFoundationFunder(f) ? 'foundation' : 'federal')),
    foundations_by_unsolicited: count(records.funders.filter(isFoundationFunder), (f) => String(f.unsolicited)),
    changes_by_status: count(records.changes, (c) => c.status as string),
    changes_by_date_precision: count(records.changes, (c) => (String(c.date) === 'unknown' ? 'unknown' : String(c.date).length === 10 ? 'day' : String(c.date).length === 7 ? 'month' : 'year')),
    gates_by_group: count(records.gates, (g) => gateGroup.get(g.id)?.group),
    gates_by_who: count(records.gates, (g) => String(g.who_does_it ?? 'not stated')),
    standing_by_group: count(records.standing, (r) => classifyStanding(r as unknown as { id: string; applies_to: string }).group),
  },
  queries: { total: queries.length, hits: queries.reduce((a, q) => a + (hitsNumber(q.hits) ?? 0), 0), by_slice: count(queries, (q) => q.slice), zero_hit: queries.filter((q) => hitsNumber(q.hits) === 0).length },
  pathfinder: pathfinder ? { questions: pathfinder.questions.length, routes: pathfinder.routes.length } : null,
  scope: scope ? { queries: scope.search_strategy.queries.length, sources: scope.search_strategy.sources.length, known_gaps: scope.search_strategy.known_gaps.length } : null,
  todo: { count: todo.length, by_kind: count(todo, (t) => t.kind) },
  voice: { count: voice.length, items: voice, consolidation_report: consolidationSecondPerson },
  build_errors: errors.length,
  warnings,
};
emitJson('public/provenance.json', provenance);
emitJson(D('provenance.json'), provenance);

// ───────────────────────── errors: BUILD-ERRORS.md + build-errors.json
if (errors.length) {
  const md = [
    `# BUILD-ERRORS`, '',
    `\`scripts/build-content.ts\` found ${errors.length} error(s) on ${new Date().toISOString().slice(0, 10)}. The pack was not modified; fix these in the pack and re-run \`npm run build:content\`. The app was built from whatever validated, and these errors are listed on /methods.`,
    'Uncited prose is never repaired by adding a citation, and an unknown id is never re-pointed at a similar one — inventing provenance is worse than shipping the error (APP-SPEC §6.1).', '',
    ...errors.map((e) => `- **${e.where}** — ${e.message}`), '',
  ].join('\n');
  if (!fs.existsSync(ERR_FILE) || fs.readFileSync(ERR_FILE, 'utf8').replace(/ on \d{4}-\d\d-\d\d\./, '') !== md.replace(/ on \d{4}-\d\d-\d\d\./, '')) fs.writeFileSync(ERR_FILE, md);
} else if (fs.existsSync(ERR_FILE)) fs.unlinkSync(ERR_FILE);
emitJson(D('build-errors.json'), errors);

// ───────────────────────── 8. summary
console.log(`\ncontent build — ${manifest?.slug ?? '(no manifest)'} · mode ${manifest?.mode ?? '?'} · as of ${manifest?.as_of ?? '?'}`);
console.table([
  { item: 'sections', value: parsed.sections.length },
  { item: 'words', value: words },
  { item: 'blocks (cited/framing/synthesis)', value: `${parsed.blocks.total} (${parsed.blocks.cited}/${parsed.blocks.framing}/${parsed.blocks.synthesis})` },
  { item: 'synthesis sentences', value: parsed.synthesis.length },
  { item: 'uncited (review / primers / glossary / records)', value: `${parsed.uncited.length} / ${conceptUncited.length} / ${glossaryUncited.length} / ${recordCheck.uncited.length}` },
  { item: 'glossary terms', value: glossary.length },
  { item: '  occurring / linked', value: `${occurring.length} / ${linkedTerms.length} (${provenance.terms.linked_pct_of_occurring}%)` },
  { item: '  not occurring in review', value: unmatched.length },
  { item: '  reachable (review, records or primers)', value: reachable },
  { item: 'primers', value: concepts.length },
  { item: 'figures', value: `${figures.length} (${Object.entries(provenance.figures.by_kind).map(([k, v]) => `${k} ${v}`).join(', ')})` },
  { item: 'references', value: `${references.length} (${Object.entries(provenance.references.by_tier).map(([k, v]) => `${k} ${v}`).join(', ')})` },
  { item: '  cited / never cited', value: `${cited.length} / ${neverCited.length}` },
  { item: '  recheck cleared / flagged', value: `${provenance.references.recheck_cleared} / ${provenance.references.flagged}` },
  ...RECORD_FILES.map((f) => ({ item: `records: ${f}`, value: records[f].length })),
  { item: 'programmes by status', value: Object.entries(provenance.records_detail.programs_by_status).map(([k, v]) => `${k} ${v}`).join(', ') },
  { item: 'queries', value: queries.length },
  { item: 'todo items', value: todo.length },
  { item: 'second-person sentences (build / consolidation report)', value: `${voice.length} / ${consolidationSecondPerson.length}` },
  { item: 'warnings', value: warnings.length },
  { item: 'errors', value: errors.length },
]);
const changedFiles = written.filter((w) => w.status === 'written');
console.log(`${written.length} outputs, ${changedFiles.length} rewritten${changedFiles.length && changedFiles.length < 40 ? ': ' + changedFiles.map((w) => w.file).join(', ') : ''}`);
if (warnings.length) console.log('warnings:\n' + warnings.slice(0, 40).map((w) => '  WARN ' + w).join('\n') + (warnings.length > 40 ? `\n  … ${warnings.length - 40} more (all in provenance.json)` : ''));
void recordsOfCell;
if (errors.length) {
  console.error(`\n${errors.length} error(s) — written to ${path.relative(ROOT, ERR_FILE)}:`);
  for (const e of errors.slice(0, 60)) console.error(`  ERROR ${e.where}: ${e.message}`);
  if (errors.length > 60) console.error(`  … ${errors.length - 60} more in ${path.relative(ROOT, ERR_FILE)}`);
  process.exit(1);
}
console.log('\n0 errors.');
