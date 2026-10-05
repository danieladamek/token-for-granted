export type BlockMarker = 'framing' | 'synthesis' | null;

export type Chunk =
  | { kind: 'md'; md: string; hasMath: boolean; marker: BlockMarker; id: string | null; synthesis: string[] }
  | { kind: 'figure'; id: string };

export interface Section {
  id: string; title: string; depth: number; number: string | null;
  chunks: Chunk[]; terms: string[]; cites: number[]; figures: string[]; words: number;
  blocks: number; cited_blocks: number; framing_blocks: number; synthesis_blocks: number;
}

export type Domain = 'law' | 'process' | 'cost' | 'role' | 'organisation' | 'programme' | 'standing' | 'status' | 'notation';

export interface GlossaryEntry {
  id: string; term: string; kind: string; domain: Domain; own_label: boolean;
  variants: string[]; short: string; definition: string; concept?: string; see: string[]; sources: string[];
  appears_in: string[]; in_records: string[]; in_concepts: string[]; occurrences: number; figures: string[];
}

export interface SelfCheck { q: string; options: string[]; answer: number; explanation: string }
export interface Concept {
  id: string; title: string; one_liner: string; why_here: string; prerequisites: string[]; terms: string[]; figures: string[];
  further_reading: { title: string; url: string; kind?: string }[]; self_check: SelfCheck[];
  body_before: string; picture: string | null; body_after: string; has_math: boolean;
  used_by_terms: string[]; used_by_figures: string[]; used_by_concepts: string[];
}

export type Row = Record<string, string | number | null>;
export interface PathwayNode { id: string; kind: string; label: string; col: number; row: number; refs: number[]; term?: string; record?: string }
export interface PathwayEdge { from: string; to: string; kind?: string; label?: string; refs: number[] }
export interface Pathway { id?: string; note: string; nodes: PathwayNode[]; edges: PathwayEdge[] }
export interface Explain { on: string; text: string; term?: string; concept?: string }
export interface Axis { field?: string; label?: string; unit?: string; scale?: 'linear' | 'log' }
export interface ChartSpec { type: string; x?: Axis; y?: Axis; series?: { field: string; label?: string }; ci?: [string, string] }
export interface Figure {
  id: string; label: string; title: string; kind: 'chart' | 'table' | 'network' | 'pathway' | 'image';
  synthesis?: 'data' | 'conceptual'; refs: number[]; data?: string; script?: string;
  columns?: { field: string; label?: string }[];
  chart?: ChartSpec; caption: string; how_to_read: string;
  explain: Explain[]; concepts: string[]; discussed_in: string[]; source: string;
  table?: { rows: Row[]; fields: string[] }; pathway?: Pathway;
  provenance: string;
}

export type Tier = 'seminal' | 'classic' | 'current' | 'background';
export type FactCode = 'C' | 'S' | 'N' | 'X' | '-';

export interface Reference {
  n: number; key: string; tier: Tier; tier_note?: string; citation: string; title: string; url: string; year: number;
  published: string; date_note?: string; accessed: string; publisher: string;
  source_kind: 'primary' | 'secondary'; read: 'full' | 'partial' | 'not-fetched';
  summary: string; why_it_mattered: string; key_facts: string[]; quotes: string[];
  role_here: string; role_note: string; cited_in: string[]; used_by: string[]; verified: boolean;
  recheck: boolean; rechecked?: string;
  recheck_result?: { fetch: 'ok' | 'blocked'; partial?: boolean; quotes_dropped?: number; by_hand?: number; reason?: string; date?: string } | null;
  fact_check?: FactCode[]; sweep: string; sweep_ids: string[];
  cited_sections: string[]; cited_records: string[]; cited_elsewhere: string[];
}
export interface ReferenceMeta {
  n: number; key: string; year: number; tier: Tier; publisher: string; source_kind: 'primary' | 'secondary'; read: string; role_here: string;
  verified: boolean; recheck: boolean; rechecked: string | null; fetch: 'ok' | 'blocked' | null; seminal: boolean;
  title: string; citation: string; cited_sections: string[]; cited: boolean;
}

export interface TodoItem { id: string; kind: 'gap' | 'conflict' | 'unverified' | 'recheck'; where: string; what: string; sweep: string }
export interface BuildError { where: string; message: string }
export interface SynthesisPassage { id: string; section: string; excerpt: string; words: number }

/* ── extension records (KICKOFF §4b). Prose strings arrive term- and citation-linked from the content build. */

export type Family = 'start' | 'research' | 'people' | 'programme-service' | 'capacity';
export type ProgramStatus = 'open' | 'forecast' | 'closed' | 'no-current-notice' | 'formula' | 'not-competed' | 'expired' | 'unconfirmed';
export type RecordType = 'routes' | 'programs' | 'funders' | 'standing' | 'gates' | 'help' | 'mechanics' | 'changes';
export type Side = 'federal' | 'foundation';
export interface PendingChange { status: string; date: string; text: string; [k: string]: unknown }
export interface FindFilter { agencies: string[]; applicant_types: string[]; keywords: string[] }

export interface RecordBase {
  id: string; name: string; official_url?: string; pending_changes: PendingChange[]; as_of?: string; sources: number[]; conflicts: string[];
  variants: Record<string, unknown>[]; sweep: string; changes_affecting: string[]; [k: string]: unknown;
}
export interface Route extends RecordBase {
  family: Family; what: string; who_for: string; how_it_works: string[]; watch: string;
  programs: string[]; funders: string[]; standing: string[]; gates: string[]; mechanics: string[]; help: string[]; changes: string[];
  who: string[]; purpose: string[]; stage: string[]; funder_kind: 'federal' | 'foundation' | 'either'; door: string; find_filter?: FindFilter; as_of: string;
}
export interface Program extends RecordBase {
  family: Exclude<Family, 'start'>; kind: string; funder: string; funder_kind: string; what: string; status: ProgramStatus;
  status_as_of?: string; status_note?: string; next_date?: string; status_change?: string; status_date: string; side: Side;
  assistance_listings: string[]; gates: string[]; on_routes: string[]; who: string[]; purpose: string[]; stage: string[]; steps: string[];
  standing_opening: string[]; as_of: string;
}
export interface Funder extends RecordBase { funder_kind: string; programs: string[]; routes: string[]; side: Side; programs_all: string[]; unsolicited?: string; ein?: string; as_of: string }
export interface Standing extends RecordBase { applies_to: string; what: string; who_qualifies: string; how_decided: string; opens: string[]; routes: string[]; as_of: string }
export interface Gate extends RecordBase {
  what: string; applies_when?: string; who_does_it?: string; steps: string[];
  routes: string[]; programs_requiring: string[]; group: { group: string; because: string };
}
export interface Help extends RecordBase { what: string; who_it_is_for?: string; cost?: string; routes: string[] }
export interface Mechanic extends RecordBase { what: string; rule?: string | string[]; figures: { label: string; value: string; cite: number[] }[]; applies_to?: string; routes: string[] }
export interface Change { id: string; date: string; status: string; what: string; affects: string[]; sources: number[]; sweep: string; affects_files: Record<string, RecordType[]>; routes: string[] }

export interface PfOption { tag?: string; value?: string; label: string }
export interface PfQuestion { id: string; prompt: string; type: 'single' | 'multi'; field: string; options: PfOption[] }
export interface PfFit { who: string; purpose: string; funder: Side; count: number }
export interface PfRoute { id: string; family: Family; door: string; funder_kind: string; n?: { federal: number; foundation: number }; fit: PfFit[]; who: string[]; purpose: string[]; stage: string[] }
export interface Pathfinder {
  rule: string;
  display: { route_statuses: ProgramStatus[]; route_statuses_note: string; status_date: string; foundations_note: string; pass_through_note: string };
  questions: PfQuestion[]; routes: PfRoute[];
}

export interface RecordMeta { type: RecordType; id: string; title: string; to: string; family: Family | null; status: string | null; date: string | null; side: Side | null }
export interface ProgramMeta {
  id: string; name: string; family: Exclude<Family, 'start'>; kind: string; funder: string; funder_name: string; side: Side;
  status: ProgramStatus; status_date: string; next_date: string | null; who: string[]; purpose: string[]; routes: string[]; als: string[]; mechanism_code: string | null; what: string;
}

/* ── slim indexes */

export interface TermShort { id: string; term: string; domain: Domain; own_label: boolean; short: string; concept: string | null }
export interface ConceptMeta { id: string; title: string; one_liner: string; prerequisites: string[]; figures: string[]; terms: string[] }
export interface SectionMeta { id: string; title: string; depth: number; number: string | null; words: number; figures: string[]; synthesis_blocks: number; terms: string[] }
export interface FigureMeta {
  id: string; label: string; title: string; kind: Figure['kind']; chart_type: string | null; synthesis: 'data' | 'conceptual' | null;
  provenance: string; concepts: string[]; refs: number[]; rows: number | null; has_chart: boolean; discussed_in: string[]; data: string | null; script: string | null;
}
