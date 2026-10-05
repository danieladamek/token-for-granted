import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { countSentence, fitOf, isListed, lastSentence, rankRoutes } from '../../src/lib/pathfinder';
import type { PfRoute } from '../../src/types';
import { ROOT } from './helpers';

const fam = (id: string, n: { federal: number; foundation: number }, fit: PfRoute['fit']): PfRoute => ({ id, family: 'research', door: 'direct', funder_kind: 'federal', n, fit, who: [], purpose: [], stage: [] });
const entry = (id: string, who: string[], purpose: string[]): PfRoute => ({ id, family: 'start', door: 'registration', funder_kind: 'federal', fit: [], who, purpose, stage: [] });
const F = (who: string, purpose: string, funder: 'federal' | 'foundation', count: number) => ({ who, purpose, funder, count });

const routes: PfRoute[] = [
  entry('entry-a', ['faculty-investigator'], ['research-project']),
  fam('half', { federal: 10, foundation: 0 }, [F('faculty-investigator', 'research-project', 'federal', 5)]),
  fam('all-small', { federal: 3, foundation: 0 }, [F('faculty-investigator', 'research-project', 'federal', 3)]),
  fam('under-fifth', { federal: 20, foundation: 0 }, [F('faculty-investigator', 'research-project', 'federal', 3)]),
  fam('fit-of-one', { federal: 2, foundation: 0 }, [F('faculty-investigator', 'research-project', 'federal', 1)]),
  fam('mixed', { federal: 4, foundation: 6 }, [F('faculty-investigator', 'research-project', 'federal', 1), F('faculty-investigator', 'research-project', 'foundation', 3)]),
  entry('entry-b', ['nonprofit-programmes'], ['service']),
];
const pf = { routes };

describe('the pathfinder, by the rule as written', () => {
  it('lists by share, then count; hides a route under a fifth and a route with a fit of 1', () => {
    const r = rankRoutes(pf, { who: 'faculty-investigator', purpose: 'research-project', funder_kind: 'federal', stage: 'established' });
    expect(r.map((x) => [x.id, x.count, x.n])).toEqual([['all-small', 3, 3], ['half', 5, 10], ['entry-a', 0, 0]]);
    expect(r.find((x) => x.id === 'under-fifth')).toBeUndefined();
    expect(r.find((x) => x.id === 'fit-of-one')).toBeUndefined();
  });
  it('`either` sums both sides, counts and n alike', () => {
    expect(fitOf(routes[5], { who: 'faculty-investigator', purpose: 'research-project', funder_kind: 'either' })).toEqual({ count: 4, n: 10 });
    expect(fitOf(routes[5], { who: 'faculty-investigator', purpose: 'research-project', funder_kind: 'foundation' })).toEqual({ count: 3, n: 6 });
    const r = rankRoutes(pf, { who: 'faculty-investigator', purpose: 'research-project', funder_kind: 'either', stage: 'established' });
    expect(r.map((x) => x.id)).toContain('mixed');
  });
  it('entry routes come first for never-applied and applied-unfunded, last for established', () => {
    const a = { who: 'faculty-investigator', purpose: 'research-project', funder_kind: 'federal' };
    expect(rankRoutes(pf, { ...a, stage: 'never-applied' })[0].id).toBe('entry-a');
    expect(rankRoutes(pf, { ...a, stage: 'applied-unfunded' })[0].id).toBe('entry-a');
    const est = rankRoutes(pf, { ...a, stage: 'established' });
    expect(est[est.length - 1].id).toBe('entry-a');
  });
  it('an entry route is listed only when its own tags contain the answers', () => {
    const r = rankRoutes(pf, { who: 'nonprofit-programmes', purpose: 'service' });
    expect(r.map((x) => x.id)).toEqual(['entry-b']);
  });
  it('the count is shown in the rule’s words, and nothing else is scored', () => {
    const [first] = rankRoutes(pf, { who: 'faculty-investigator', purpose: 'research-project', funder_kind: 'federal', stage: 'funded-once' });
    expect(countSentence(first, { funder_kind: 'federal' })).toBe('3 of 3 federal programmes on this route fit both answers.');
    expect(Object.keys(first).sort()).toEqual(['count', 'entry', 'family', 'id', 'index', 'n', 'share']);
    expect(isListed(2, 10)).toBe(true);
    expect(isListed(2, 11)).toBe(false);
  });
  it('on the real pack: a non-profit delivering a service gets the programme-service routes, and the page prints the rule’s last sentence', () => {
    const real = yaml.load(fs.readFileSync(path.join(ROOT, 'content-pack/pathfinder.yaml'), 'utf8')) as { rule: string; routes: PfRoute[] };
    const r = rankRoutes(real, { who: 'nonprofit-programmes', purpose: 'service' });
    expect(r.filter((x) => !x.entry).slice(0, 5).every((x) => x.family === 'programme-service')).toBe(true);
    expect(lastSentence(real.rule)).toBe('No route is recommended over another.');
  });
});
