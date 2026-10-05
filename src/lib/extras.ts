import { loadAllRefMeta } from '@/lib/heavy';
export { recordsIndex } from '@/lib/records';

/** The slim reference index (2,563 rows) only some routes need — /references, /notes, the notepad's anchors — in shards. */
export const loadReferencesIndex = loadAllRefMeta;
