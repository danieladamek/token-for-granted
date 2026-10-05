import recordsIndexJson from '@/data/records-index.json';
import type { RecordMeta, RecordType } from '@/types';

/** Lookup for "routes/x"-style keys (reference cards, change ledgers, notes). The index is slim: titles, paths, status. */
export const recordsIndex = recordsIndexJson as unknown as RecordMeta[];
export const recordsIndexById = new Map<string, RecordMeta>(recordsIndex.map((r) => [`${r.type}/${r.id}`, r]));
export const recordMeta = (type: RecordType, id: string) => recordsIndexById.get(`${type}/${id}`);
/** Find a record by bare id, preferring the given types in order (a change's `affects` names bare ids). */
export function findRecord(id: string, prefer: RecordType[] = ['funders', 'programs', 'gates', 'standing', 'mechanics', 'routes', 'help', 'changes']): RecordMeta | undefined {
  for (const t of prefer) { const m = recordsIndexById.get(`${t}/${id}`); if (m) return m; }
  return undefined;
}
