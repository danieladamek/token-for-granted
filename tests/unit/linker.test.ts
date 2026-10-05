import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { ROOT } from './helpers';
import { buildMatcher, expandCitation, findAmbiguousVariants, isAllCaps, linkCitations, linkTerms, segment, unlink } from '../../scripts/lib/linker';

const TERMS = [
  { id: 'agonist', term: 'Agonist', variants: ['agonists'] },
  { id: 'partial-agonist', term: 'Partial agonist', variants: ['partial agonists'] },
  { id: 'lsd', term: 'LSD', variants: ['lysergic acid diethylamide'] },
  { id: 'doi-compound', term: 'DOI', variants: [] },
  { id: 'five-ht2a', term: '5-HT2A', variants: ['5-HT2A receptor', '5-HT2A receptors'] },
  { id: 'head-twitch-response', term: 'Head-twitch response', variants: ['HTR'] },
];
const m = buildMatcher(TERMS);

describe('term matcher', () => {
  it('links whole words, case-insensitively, first occurrence per section only', () => {
    const r = linkTerms('An agonist and another Agonist; agonists too.', m);
    expect(r.text).toBe('An [agonist](#term:agonist) and another Agonist; agonists too.');
    expect(r.linked).toEqual(['agonist']);
    expect(r.occurrences.agonist).toBe(3);
  });
  it('links every occurrence when asked', () => {
    expect(linkTerms('LSD and LSD.', m, { everyOccurrence: true }).text).toBe('[LSD](#term:lsd) and [LSD](#term:lsd).');
  });
  it('respects word boundaries — no match inside a word or across a hyphen', () => {
    expect(linkTerms('LSD-25 and LSDs and BLSD.', m).text).toBe('LSD-25 and LSDs and BLSD.');
    expect(linkTerms('The LSD.', m).text).toBe('The [LSD](#term:lsd).');
  });
  it('longest match wins, and the shorter term is not linked inside the longer one', () => {
    const r = linkTerms('A partial agonist is an agonist.', m);
    expect(r.text).toBe('A [partial agonist](#term:partial-agonist) is an [agonist](#term:agonist).');
  });
  it('matches multi-token receptor notation', () => {
    expect(linkTerms('Acting at the 5-HT2A receptor here.', m).text).toBe('Acting at the [5-HT2A receptor](#term:five-ht2a) here.');
  });
  it('skips headings, code, maths, links and HTML comments', () => {
    const md = '# LSD heading\n\nText LSD here. `LSD` code. $LSD$ maths. [LSD link](http://x) <!-- LSD --> and\n\n```\nLSD\n```\n';
    const r = linkTerms(md, m);
    expect(r.text).toContain('# LSD heading');
    expect(r.text).toContain('Text [LSD](#term:lsd) here.');
    expect(r.text).toContain('`LSD` code. $LSD$ maths. [LSD link](http://x) <!-- LSD -->');
    expect(r.text).toContain('```\nLSD\n```');
    expect(r.linked).toEqual(['lsd']);
  });
  it('all-caps variants are case-sensitive, so "doi" the identifier is not linked as DOI the compound', () => {
    expect(isAllCaps('DOI')).toBe(true);
    expect(isAllCaps('Agonist')).toBe(false);
    const r = linkTerms('See doi:10.1000/x for DOI, a substituted amphetamine.', m);
    expect(r.text).toBe('See doi:10.1000/x for [DOI](#term:doi-compound), a substituted amphetamine.');
  });
  it('matches notation across <sup> and keeps the link well-formed', () => {
    const sup = buildMatcher([{ id: 'x', term: 'HTR 50', variants: [] }]);
    expect(linkTerms('The HTR<sup>50</sup> value.', sup).text).toBe('The [HTR<sup>50</sup>](#term:x) value.');
  });
  it('reports ambiguous variants across terms', () => {
    expect(findAmbiguousVariants(TERMS)).toEqual([]);
    expect(findAmbiguousVariants([...TERMS, { id: 'other', term: 'Other', variants: ['lsd'] }]))
      .toEqual([{ variant: 'lsd', ids: ['lsd', 'other'] }]);
  });
  it('segment keeps sup/sub inside text but skips other tags', () => {
    expect(segment('a<sup>b</sup> <em>c</em>').filter((s) => s.skip).map((s) => s.text)).toEqual(['<em>', '</em>']);
  });
});

describe('citations', () => {
  it('expands lists and ranges', () => {
    expect(expandCitation('1')).toEqual([1]);
    expect(expandCitation('91,81,95')).toEqual([91, 81, 95]);
    expect(expandCitation('3–5')).toEqual([3, 4, 5]);
    expect(expandCitation('15–17,80')).toEqual([15, 16, 17, 80]);
  });
  it('links tokens outside skip zones and leaves bracketed chemistry alone', () => {
    const r = linkCitations('Claim [1,2] and [3–5]. Not `[9]`. The radioligand [3H]ketanserin is not a citation.');
    expect(r.text).toBe('Claim [1,2](#cite:1,2) and [3–5](#cite:3,4,5). Not `[9]`. The radioligand [3H]ketanserin is not a citation.');
    expect(r.cites).toEqual([1, 2, 3, 4, 5]);
  });
  it('unlink restores the original text', () => {
    const src = 'LSD is an agonist at the 5-HT2A receptor [1,2].';
    expect(unlink(linkCitations(linkTerms(src, m).text).text)).toBe(src);
  });
});

describe('this pack’s vocabulary (KICKOFF §3.3 — longest match wins), on the real glossary', () => {
  const glossary = yaml.load(fs.readFileSync(path.join(ROOT, 'content-pack/glossary.yaml'), 'utf8')) as { id: string; term: string; variants: string[] }[];
  const real = buildMatcher(glossary);
  it('"negotiated indirect cost rate" links as the NICRA term, not as "indirect cost"', () => {
    const r = linkTerms('paid at the negotiated indirect cost rate on file', real);
    expect(r.text).toBe('paid at the [negotiated indirect cost rate](#term:nicra) on file');
  });
  it('"SAM.gov" wins over "SAM"', () => {
    const r = linkTerms('Register in SAM.gov first; SAM then issues the UEI.', real, { everyOccurrence: true });
    expect(r.text).toContain('[SAM.gov](#term:sam-gov)');
    expect(r.text).not.toContain('[SAM](#term:sam-gov).gov');
  });
  it('"research project grants" does not link as the foundation term "Project grant (from a foundation)"', () => {
    const r = linkTerms('NIH reported that its success rate for research project grants fell.', real);
    expect(r.linked).not.toContain('project-grant');
    expect(r.text).not.toContain('#term:project-grant');
  });
  it('a variant claimed by two terms is ambiguous', () => {
    expect(findAmbiguousVariants(glossary)).toEqual([]);
  });
});

describe('longest match on a synthetic vocabulary', () => {
  const mm = buildMatcher([
    { id: 'project-grant', term: 'Project grant (from a foundation)', variants: ['project grants'] },
    { id: 'rpg', term: 'Research project grant', variants: ['research project grants'] },
    { id: 'sam', term: 'SAM', variants: [] },
    { id: 'sam-gov', term: 'SAM.gov', variants: [] },
  ]);
  it('the longer phrase takes the position', () => {
    expect(linkTerms('research project grants and project grants', mm, { everyOccurrence: true }).text).toBe('[research project grants](#term:rpg) and [project grants](#term:project-grant)');
  });
  it('"SAM.gov" over "SAM", and SAM (all capitals) is case-sensitive', () => {
    expect(linkTerms('SAM.gov; SAM; the sam file', mm, { everyOccurrence: true }).text).toBe('[SAM.gov](#term:sam-gov); [SAM](#term:sam); the sam file');
  });
});
