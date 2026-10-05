import { useEffect, useState } from 'react';
import type {
  Change, Concept, Figure, Funder, Gate, GlossaryEntry, Help, Mechanic, Pathfinder, Program, ProgramMeta, Reference, ReferenceMeta,
  Route, Section, Standing, TodoItem,
} from '@/types';
import type scopeJson from '@/data/scope.json';

/**
 * Full data files as separate chunks in dist/ (still no runtime fetch of external content). Nothing large is in the
 * entry bundle (KICKOFF §2): references come in shards of 100 by number, programmes in one shard per family.
 */
const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as Promise<T>;
}
export const loadGlossary = () => once('glossary', () => import('@/data/glossary.json').then((m) => m.default as unknown as GlossaryEntry[]));
export const loadConcepts = () => once('concepts', () => import('@/data/concepts.json').then((m) => m.default as unknown as Concept[]));
const FIGS = import.meta.glob('../data/figures/*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
/** One figure's full record (its own chunk). */
export const loadFigure = (id: string) => { const k = `../data/figures/${id}.json`; return FIGS[k] ? once(k, FIGS[k] as () => Promise<Figure>) : Promise.resolve(null); };
export const loadSections = () => once('sections', () => import('@/data/sections.json').then((m) => m.default as unknown as Section[]));
export const loadScope = () => once('scope', () => import('@/data/scope.json').then((m) => m.default as typeof scopeJson));
export const loadTodo = () => once('todo', () => import('@/data/todo.json').then((m) => m.default as unknown as TodoItem[]));
export const loadQueries = () => once('queries', () => import('@/data/queries.json').then((m) => m.default as unknown as { text: string; engine: string; hits: string | number; hits_n: number | null; date: string; slice: string; invalid?: boolean }[]));

export const loadRoutes = () => once('routes', () => import('@/data/routes.json').then((m) => m.default as unknown as Route[]));
export const loadFunders = () => once('funders', () => import('@/data/funders.json').then((m) => m.default as unknown as Funder[]));
export const loadStanding = () => once('standing', () => import('@/data/standing.json').then((m) => m.default as unknown as Standing[]));
export const loadGates = () => once('gates', () => import('@/data/gates.json').then((m) => m.default as unknown as Gate[]));
export const loadHelp = () => once('help', () => import('@/data/help.json').then((m) => m.default as unknown as Help[]));
export const loadMechanics = () => once('mechanics', () => import('@/data/mechanics.json').then((m) => m.default as unknown as Mechanic[]));
export const loadChanges = () => once('changes', () => import('@/data/changes.json').then((m) => m.default as unknown as Change[]));
export const loadPathfinder = () => once('pathfinder', () => import('@/data/pathfinder.json').then((m) => m.default as unknown as Pathfinder));
export const loadProgramsIndex = () => once('programs-index', () => import('@/data/programs-index.json').then((m) => m.default as unknown as ProgramMeta[]));
export const loadFundersTree = () => once('funders-tree', () => import('@/data/funders-tree.json').then((m) => m.default as unknown as { id: string; name: string; parent_id: string | null; parent_text: string | null }[]));

/* programmes: one shard per family; a programme page loads the shard its family lives in */
const PROGRAM_SHARDS = import.meta.glob('../data/programs/*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
export const loadProgramFamily = (family: string) => {
  const k = `../data/programs/${family}.json`;
  return PROGRAM_SHARDS[k] ? once(k, PROGRAM_SHARDS[k] as () => Promise<Program[]>) : Promise.resolve([] as Program[]);
};
export async function loadProgram(id: string): Promise<Program | null> {
  const idx = await loadProgramsIndex();
  const m = idx.find((p) => p.id === id);
  if (!m) return null;
  return (await loadProgramFamily(m.family)).find((p) => p.id === id) ?? null;
}
export const loadAllPrograms = () => once('programs:all', () => Promise.all(Object.keys(PROGRAM_SHARDS).map((k) => once(k, PROGRAM_SHARDS[k] as () => Promise<Program[]>))).then((p) => p.flat()));

/* references: 100 per shard, each its own chunk; a fold-out loads one shard, /references loads the slim shards */
const SHARDS = import.meta.glob('../data/refs/r*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
const META = import.meta.glob('../data/refs/m*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
const shardOf = (n: number) => Math.floor((n - 1) / 100);
export function loadReference(n: number): Promise<Reference | null> {
  const key = `../data/refs/r${shardOf(n)}.json`;
  const load = SHARDS[key];
  if (!load) return Promise.resolve(null);
  return once(key, load as () => Promise<Reference[]>).then((rs) => rs.find((r) => r.n === n) ?? null);
}
export async function loadRefMeta(ns: number[]): Promise<Map<number, ReferenceMeta>> {
  const keys = [...new Set(ns.map((n) => `../data/refs/m${shardOf(n)}.json`))].filter((k) => META[k]);
  const parts = await Promise.all(keys.map((k) => once(k, META[k] as () => Promise<ReferenceMeta[]>)));
  return new Map(parts.flat().filter((r) => ns.includes(r.n)).map((r) => [r.n, r]));
}
export const loadAllRefMeta = () => once('refmeta:all', () => Promise.all(Object.keys(META).map((k) => once(k, META[k] as () => Promise<ReferenceMeta[]>))).then((p) => p.flat().sort((a, b) => a.n - b.n)));

/** Resolve a loader into state; `undefined` while loading. */
export function useAsync<T>(load: () => Promise<T>): T | undefined {
  const [v, setV] = useState<T | undefined>(undefined);
  useEffect(() => { let live = true; load().then((x) => { if (live) setV(x); }); return () => { live = false; }; }, [load]);
  return v;
}
