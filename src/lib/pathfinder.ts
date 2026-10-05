/**
 * The pathfinder (KICKOFF §4b `/`), implementing `pathfinder.rule` exactly as written, from the counts in
 * `pathfinder.routes[]`:
 *
 * - A family route's fit is the `fit[]` count for the chosen `who` and `purpose`, summed over the chosen kind of
 *   funder (`either` sums both sides), against `n` for the same side. It is listed when the count is at least 2 and
 *   at least a fifth of that `n`. Listed family routes are ordered by share, then by count (ties keep pack order).
 * - An entry route (family `start`) is listed when its own `who` and `purpose` tags contain the answers. Entry routes
 *   come first when the stage is never-applied or applied-unfunded, and last otherwise.
 *
 * Unanswered questions: a family route needs both `who` and `purpose`; with no answer to the funder question both
 * sides are counted, as for Either (the page says so). No other score exists. Pure: unit-tested on a fixture.
 */
import type { Pathfinder, PfRoute, Side } from '@/types';

export interface Answers { who?: string; purpose?: string; stage?: string; funder_kind?: string }

export interface Listed {
  id: string;
  family: string;
  entry: boolean;
  /** family routes: programmes that fit both answers, and the programmes on the route for the same side */
  count: number;
  n: number;
  share: number;
  index: number;
}

export const sidesFor = (funderKind?: string): Side[] => (funderKind === 'federal' ? ['federal'] : funderKind === 'foundation' ? ['foundation'] : ['federal', 'foundation']);

export function fitOf(route: Pick<PfRoute, 'fit' | 'n'>, a: Answers): { count: number; n: number } {
  const sides = sidesFor(a.funder_kind);
  const count = route.fit.filter((f) => f.who === a.who && f.purpose === a.purpose && sides.includes(f.funder)).reduce((s, f) => s + f.count, 0);
  const n = sides.reduce((s, side) => s + (route.n?.[side] ?? 0), 0);
  return { count, n };
}

export const isListed = (count: number, n: number) => n > 0 && count >= 2 && count * 5 >= n;

export const entryMatches = (route: Pick<PfRoute, 'who' | 'purpose'>, a: Answers) =>
  (a.who !== undefined || a.purpose !== undefined) && (a.who === undefined || route.who.includes(a.who)) && (a.purpose === undefined || route.purpose.includes(a.purpose));

export const entryFirst = (a: Answers) => a.stage === 'never-applied' || a.stage === 'applied-unfunded';

export function rankRoutes(pf: Pick<Pathfinder, 'routes'>, a: Answers): Listed[] {
  const entries: Listed[] = [];
  const family: Listed[] = [];
  pf.routes.forEach((r, index) => {
    if (r.family === 'start') {
      if (entryMatches(r, a)) entries.push({ id: r.id, family: r.family, entry: true, count: 0, n: 0, share: 0, index });
      return;
    }
    if (a.who === undefined || a.purpose === undefined) return;
    const { count, n } = fitOf(r, a);
    if (isListed(count, n)) family.push({ id: r.id, family: r.family, entry: false, count, n, share: count / n, index });
  });
  family.sort((x, y) => y.share - x.share || y.count - x.count || x.index - y.index);
  return entryFirst(a) ? [...entries, ...family] : [...family, ...entries];
}

/** The count behind a listed route, in the rule's words. */
export function countSentence(l: Listed, a: Answers): string {
  if (l.entry) return 'An entry route: its own who and purpose tags include these answers.';
  const side = a.funder_kind === 'federal' ? ' federal' : a.funder_kind === 'foundation' ? ' foundation' : '';
  return `${l.count} of ${l.n}${side} programmes on this route fit both answers.`;
}

export const hasAnyAnswer = (a: Answers) => Object.values(a).some((v) => v !== undefined && v !== '');

/** The rule's last sentence, which the page prints. */
export const lastSentence = (rule: string) => (rule.trim().match(/[^.]+\.\s*$/)?.[0] ?? rule).trim();
