import manifestJson from '@/data/manifest.json';
import provenanceJson from '@/data/provenance.json';
import termsJson from '@/data/glossary-short.json';
import conceptsIndexJson from '@/data/concepts-index.json';
import figuresIndexJson from '@/data/figures-index.json';
import sectionsIndexJson from '@/data/sections-index.json';
import type { ConceptMeta, Family, FigureMeta, ProgramStatus, SectionMeta, TermShort, Tier } from '@/types';

/*
 * Only slim indexes are imported here (they ride in the first chunk). Full files — sections, glossary, concepts,
 * figures, references (sharded), records — are imported by the routes that need them (src/lib/heavy.ts).
 */
export const manifest = manifestJson;
export const SLUG: string = manifest.slug;
export const APP_NAME = 'Token for Granted';
/** The sister site (KICKOFF §4: footer, /about). */
export const SISTER = { name: 'FAR Out', url: 'https://danieladamek.github.io/far-out/' };
export const REPO_URL = 'https://github.com/danieladamek/token-for-granted';
/** manifest.concepts_label: what the app calls the 101s ("Primers"), in the nav, headings and every link. */
export const CONCEPTS_LABEL: string = (manifestJson as { concepts_label?: string }).concepts_label ?? '101s';
export const CONCEPT_WORD = CONCEPTS_LABEL.replace(/s$/, '').toLowerCase();
export const SELF_CHECKS: boolean = (manifestJson as { concept_self_checks?: boolean }).concept_self_checks === true;
export const provenance = provenanceJson;
export const terms = termsJson as unknown as TermShort[];
export const conceptsIndex = conceptsIndexJson as unknown as ConceptMeta[];
export const figuresIndex = figuresIndexJson as unknown as FigureMeta[];
export const sectionsIndex = sectionsIndexJson as unknown as SectionMeta[];

const termById = new Map(terms.map((t) => [t.id, t]));
const conceptById = new Map(conceptsIndex.map((c) => [c.id, c]));
const figureById = new Map(figuresIndex.map((f) => [f.id, f]));
const sectionById = new Map(sectionsIndex.map((s) => [s.id, s]));

export const getTerm = (id?: string | null) => (id ? termById.get(id) : undefined);
export const getConcept = (id?: string | null) => (id ? conceptById.get(id) : undefined);
export const getFigure = (id?: string | null) => (id ? figureById.get(id) : undefined);
export const getSection = (id?: string | null) => (id ? sectionById.get(id) : undefined);

export const bodySections = sectionsIndex;

export function assetUrl(rel: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
  return base + rel.replace(/^\//, '');
}

export const sectionTitle = (id: string) => getSection(id)?.title ?? getFigure(id)?.label ?? id;
export const shortSectionTitle = (s: { title: string }) => s.title.replace(/^\d+(\.\d+)*\.?\s+/, '');

/** The sweep date, shown on /, /read and /about (APP-SPEC §6.1 rule 9). */
export const AS_OF: string = manifest.as_of ?? '';
export const longDate = (iso: string): string => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
export const asOfLong = () => longDate(AS_OF);

/** The route families: labels from manifest.extensions.families, colours from manifest.palette.groups (cat.*). */
export const FAMILIES = Object.keys(manifest.extensions.families) as Family[];
export const PROGRAM_FAMILIES = FAMILIES.filter((f) => f !== 'start') as Exclude<Family, 'start'>[];
export const FAMILY_LABEL = manifest.extensions.families as Record<Family, string>;
export const PALETTE = manifest.palette.groups as Record<string, string>;
export const familyColour = (f?: string | null) => (f ? PALETTE[f] : undefined) ?? '#6b6b6b';
export const GATE_COLOUR = PALETTE.gate ?? '#8a6d00';

export const TIERS: Tier[] = ['seminal', 'classic', 'current', 'background'];
/** EXTENSIONS.md "references.yaml": the tiers as read for this field, in the pack's words. */
export const TIER_NOTE: Record<Tier, string> = {
  seminal: 'Seminal — statute, public law, 2 CFR and other CFR text, executive orders, court opinions, an agency’s governing policy guide; the editor kept 16 in this tier',
  classic: 'Classic — standing guidance older than the window (pre-2024) the field still leans on',
  current: 'Current — agency pages, funding notices, policy notices, foundation guidelines dated 2024–2026',
  background: 'Background — CRS and GAO reports, association explainers, glossaries, press releases',
};
/** role_here, as EXTENSIONS v0.11 defines each value (assigned by rule at consolidation). */
export const ROLE_WORD: Record<string, string> = {
  support: 'support — a governing text', 'data-source': 'data source — the funder’s own page or notice', background: 'background — a secondary source', 'prior-result': 'prior result — a GAO, CRS or inspector-general report',
  method: 'method source', contrast: 'contrast',
};
/** The recheck codes in words (KICKOFF §1). */
export const FACT_WORD: Record<string, string> = {
  C: 'confirmed on the live page', S: 'stated in part', N: 'not found on the second reading', X: 'the page says otherwise', '-': 'not re-read',
};

/** Programme statuses in the order the pack lists them; the words are the pack's own labels. */
export const STATUSES: ProgramStatus[] = ['open', 'forecast', 'closed', 'formula', 'no-current-notice', 'not-competed', 'expired', 'unconfirmed'];
export const STATUS_LABEL: Record<string, string> = {
  open: 'open', forecast: 'forecast', closed: 'closed', formula: 'formula', 'no-current-notice': 'no current notice', 'not-competed': 'not competed', expired: 'expired', unconfirmed: 'unconfirmed',
};
/** Change-record statuses (KICKOFF §1 "law in motion"). */
export const STATUS_WORD: Record<string, string> = {
  proposed: 'proposed', announced: 'announced', enacted: 'enacted', final: 'final', 'pending-implementation': 'pending implementation', enjoined: 'enjoined',
  vacated: 'vacated', 'in-litigation': 'in litigation', 'on-appeal': 'on appeal', rescinded: 'rescinded', 'frozen-by-appropriations': 'frozen by appropriations',
};
export const CHANGE_STATUSES = Object.keys(STATUS_WORD);
/** A change's date as recorded: a day, a month or a year, never padded to a day. */
export function recordedDate(d: string): string {
  if (!d || d === 'unknown') return 'date unknown';
  const m = /^(\d{4})-(\d{2})$/.exec(d);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  if (/^\d{4}$/.test(d)) return d;
  return d;
}
/** The sweep slice prefix that recorded a change or a rule ("research-A" → research). */
export const SWEEP_PART: Record<string, string> = {
  research: 'research', people: 'people', service: 'programme and service', capacity: 'capacity', rules: 'rules for every award', foundations: 'foundations',
  routes: 'routes', status: 'status pass',
};
export const sweepPart = (s: string) => SWEEP_PART[(s || '').split('-')[0]] ?? (s || 'not recorded');

/**
 * Scroll an in-page anchor into view instantly, and once more after late content has settled.
 */
export function scrollToId(id: string) {
  const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  requestAnimationFrame(go);
  setTimeout(go, 250);
  setTimeout(go, 800);
}
