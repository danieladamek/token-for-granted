/**
 * The changes ledger's order (KICKOFF §4b /changes): newest first by the date as recorded — a day, a month or a
 * year — and undated entries last. A month sorts after the days of that month and a year after its months (the less
 * precise date is not padded to a day; it simply comes after the dates it contains). Ties keep pack order.
 */
export function dateKey(d: string): [number, number, number] | null {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(d ?? '');
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
}

export function compareNewestFirst(a: { date: string }, b: { date: string }): number {
  const ka = dateKey(a.date);
  const kb = dateKey(b.date);
  if (!ka || !kb) return ka ? -1 : kb ? 1 : 0;
  return kb[0] - ka[0] || kb[1] - ka[1] || kb[2] - ka[2];
}

export function sortChanges<T extends { date: string }>(items: T[]): { dated: T[]; undated: T[] } {
  const dated = items.filter((c) => dateKey(c.date)).map((c, i) => ({ c, i })).sort((x, y) => compareNewestFirst(x.c, y.c) || x.i - y.i).map((x) => x.c);
  return { dated, undated: items.filter((c) => !dateKey(c.date)) };
}

/** The month a change falls in, for the month filter: "2026-05"; a year-only date has no month. */
export const monthOf = (d: string) => (/^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null);
