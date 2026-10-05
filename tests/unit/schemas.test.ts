import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ManifestSchema, zodErrors, type FigureDef } from '../../scripts/lib/schemas';
import { loadFigureData } from '../../scripts/lib/figures';
import { classifyGate, classifyStanding } from '../../scripts/lib/records';
import { editYaml, loadYaml, MINI, ROOT, runBuild } from './helpers';

type Rec = Record<string, unknown>;
const messages = (r: { success: boolean; error?: unknown }) => (r.success ? [] : zodErrors('x', r.error as never).map((e) => `${e.where}: ${e.message}`));
const has = (errs: { where: string; message: string }[], where: string, msg: RegExp) => errs.some((e) => e.where.includes(where) && msg.test(e.message));

describe('the packs validate', () => {
  it('the fixture pack builds with 0 errors', () => {
    const r = runBuild();
    expect(r.errors).toEqual([]);
    expect(r.code).toBe(0);
  });
  it('the real pack: no uncited prose in the guide, primers or records; the errors are the ones the pack really carries', () => {
    const prov = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/provenance.json'), 'utf8'));
    const errs = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/build-errors.json'), 'utf8')) as { where: string; message: string }[];
    expect(prov.blocks.uncited).toBe(0);
    expect(prov.concept_uncited).toBe(0);
    expect(prov.record_prose.uncited).toBe(0);
    expect(prov.synthesis_passages).toBe(35);
    expect(prov.terms.linked_pct_of_occurring).toBeGreaterThanOrEqual(95);
    expect(errs.every((e) => /^glossary\/status-label|^queries\//.test(e.where))).toBe(true);
    expect(prov.build_errors).toBe(errs.length);
  });
});

describe('one deliberate error per rule fails the build with the right message', () => {
  it('manifest: permissions.text is required, and pages needs the quotation rule', () => {
    const r = runBuild((d) => editYaml<{ permissions: { text: string } }>(d, 'manifest.yaml', (m) => { m.permissions.text = ''; }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'manifest/permissions/text', /REQUIRED/)).toBe(true);
    expect(r.buildErrorsMd).toContain('permissions.text is REQUIRED');
  });
  it('manifest: topic mode needs a venue that says it is not peer reviewed; every family needs a colour', () => {
    const m = loadYaml<Rec & { palette: { groups: Record<string, string> } }>(MINI, 'manifest.yaml');
    expect(messages(ManifestSchema.safeParse({ ...m, venue: 'Official guidance' }))).toContain('x/venue: topic mode: venue must make the non-peer-reviewed status unmissable');
    const noColour = structuredClone(m); delete noColour.palette.groups.capacity;
    expect(messages(ManifestSchema.safeParse(noColour))).toContain('x/palette/groups: palette.groups needs a colour for family capacity');
  });
  it('a route with an unknown programme id', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'routes.yaml', (rs) => { (rs[1].programs as string[]).push('ghost-programme'); }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'routes/route-one', /programs\[\] -> unknown programme id ghost-programme/)).toBe(true);
  });
  it('a route with an unknown gate, funder, standing, mechanic, help or change id', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'routes.yaml', (rs) => {
      (rs[1].gates as string[]).push('ghost-gate'); (rs[1].funders as string[]).push('ghost-funder'); (rs[1].standing as string[]).push('ghost-standing');
      (rs[1].mechanics as string[]).push('ghost-rule'); (rs[1].help as string[]).push('ghost-help'); (rs[1].changes as string[]).push('ghost-change');
    }));
    for (const [f, w] of [['gates', 'gate'], ['funders', 'funder'], ['standing', 'standing'], ['mechanics', 'mechanic'], ['help', 'help'], ['changes', 'change']]) {
      expect(has(r.errors, 'routes/route-one', new RegExp(`${f}\\[\\] -> unknown ${w} id ghost-`))).toBe(true);
    }
  });
  it('a programme with a status outside the eight', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'programs.yaml', (ps) => { ps[0].status = 'open-now'; }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'programs/prog-open/status', /status must be one of open \| forecast \| closed/)).toBe(true);
  });
  it('a programme with an unknown funder or route, and a standing record that opens a missing programme', () => {
    const r = runBuild((d) => {
      editYaml<Rec[]>(d, 'programs.yaml', (ps) => { ps[0].funder = 'ghost-funder'; (ps[0].on_routes as string[]).push('ghost-route'); });
      editYaml<Rec[]>(d, 'standing.yaml', (ss) => { (ss[0].opens as string[]).push('ghost-programme'); });
    });
    expect(has(r.errors, 'programs/prog-open', /funder -> unknown funder id ghost-funder/)).toBe(true);
    expect(has(r.errors, 'programs/prog-open', /on_routes\[\] -> unknown route id ghost-route/)).toBe(true);
    expect(has(r.errors, 'standing/standing-one', /opens\[\] -> unknown programme id ghost-programme/)).toBe(true);
  });
  it('a change whose affects id resolves nowhere (affects may name any record file)', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'changes.yaml', (cs) => { (cs[0].affects as string[]).push('ghost-record'); }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'changes/ch-day', /affects\[\] -> ghost-record resolves to no record in any record file/)).toBe(true);
  });
  it('a change dated in a shape that is not a day, a month, a year or unknown', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'changes.yaml', (cs) => { cs[0].date = 'spring 2025'; }));
    expect(has(r.errors, 'changes/ch-day/date', /YYYY-MM-DD, YYYY-MM, YYYY or unknown/)).toBe(true);
  });
  it('a glossary see to a missing term', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'glossary.yaml', (ts) => { (ts[0].see as string[]).push('ghost-term'); }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'glossary/sam-gov', /see -> unknown term ghost-term/)).toBe(true);
  });
  it('a route prose field with an uncited block of 25 words or more', () => {
    const long = 'This sentence is written to be long enough to cross the gate of twenty five words without any citation at all, which is exactly what the rule forbids here.';
    const r = runBuild((d) => editYaml<Rec[]>(d, 'routes.yaml', (rs) => { rs[1].watch = long; }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'routes/route-one/watch', /uncited record prose of \d+ words/)).toBe(true);
    // never repaired: the build does not add a citation
    expect(r.buildErrorsMd).toContain('Uncited prose is never repaired by adding a citation');
  });
  it('an uncited glossary definition is an error too, and a framing marker clears a block', () => {
    const long = 'This definition runs on for well over twenty five words so that the gate counts it, and it carries no citation number anywhere in it at all.';
    const r = runBuild((d) => editYaml<Rec[]>(d, 'glossary.yaml', (ts) => { ts[1].definition = long; ts[2].definition = `${long} <!-- framing -->`; }));
    expect(has(r.errors, 'glossary/indirect-costs/definition', /uncited block/)).toBe(true);
    expect(has(r.errors, 'glossary/nicra', /uncited/)).toBe(false);
  });
  it('an uncited block in review.md, and an unresolved [n]', () => {
    const r = runBuild((d) => {
      const p = path.join(d, 'review.md');
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('Research project grants are not', 'Here is a paragraph that runs long enough to be counted by the gate, more than twenty five words, and it cites nothing at all anywhere in it.\n\nResearch project grants are not [99] and are not'));
    });
    expect(has(r.errors, 'review.md/s1', /uncited block of \d+ words/)).toBe(true);
    expect(has(r.errors, 'review.md', /cites \[99\] with no reference entry/)).toBe(true);
  });
  it('a pathfinder route that names no route', () => {
    const r = runBuild((d) => editYaml<{ routes: Rec[] }>(d, 'pathfinder.yaml', (p) => { p.routes.push({ id: 'ghost-route', family: 'research', door: 'direct', funder_kind: 'federal', n: { federal: 1, foundation: 0 }, fit: [] }); }));
    expect(has(r.errors, 'pathfinder/routes/ghost-route', /unknown route id/)).toBe(true);
  });
  it('a missing figure data file, and a figure record column that names no record', () => {
    const r = runBuild((d) => {
      fs.writeFileSync(path.join(d, 'figures/data/mini-table.csv'), 'id,rule,record,ref\nr1,SAM,routes/ghost,1\n');
      editYaml<Rec[]>(d, 'figures.yaml', (fs2) => { fs2[1].data = 'figures/data/nope.json'; });
    });
    expect(has(r.errors, 'figures/mini-table', /record routes\/ghost is not a record in the pack/)).toBe(true);
    expect(has(r.errors, 'figures/mini-path', /data file missing figures\/data\/nope.json/)).toBe(true);
  });
  it('an ambiguous term variant', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'glossary.yaml', (ts) => { (ts[1].variants as string[]).push('SAM'); }));
    expect(has(r.errors, 'glossary', /ambiguous variant "sam" claimed by indirect-costs and sam-gov/)).toBe(true);
  });
  it('a reference whose fact_check does not have one code per key fact', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'references.yaml', (rs) => { rs[0].fact_check = ['C']; }));
    expect(has(r.errors, 'references/0/fact_check', /1 codes for 2 key_facts/)).toBe(true);
  });
});

describe('figure data', () => {
  it('declared fields must exist in the CSV, and every row of a synthesised data figure needs a ref', () => {
    const fig = { id: 'f', label: 'F', title: 'T', kind: 'table', synthesis: 'data', refs: [1], data: 'figures/data/mini-table.csv', columns: [{ field: 'rule' }, { field: 'nope' }], caption: 'c', how_to_read: 'h', explain: [], hotspots: [], concepts: [], discussed_in: [], source: 's' } as unknown as FigureDef;
    const errors: { where: string; message: string }[] = [];
    loadFigureData(fig, MINI, { termIds: new Set(), sectionIds: new Set(), refNs: new Set([1, 2]), topic: true, recordKeys: new Set(['routes/route-one', 'mechanics/mini-rule']) }, errors);
    expect(errors.map((e) => e.message)).toEqual(['column field nope not in csv']);
  });
  it('the real pathway figures parse with fractional rows and an overlay row above the lanes', () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/figures/who-decides.json'), 'utf8'));
    expect(data.pathway.nodes.find((n: { kind: string }) => n.kind === 'overlay').row).toBe(-1);
    const four = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/figures/four-doors.json'), 'utf8'));
    expect(four.pathway.nodes.some((n: { row: number }) => !Number.isInteger(n.row))).toBe(true);
  });
});

describe('grouping derived from the records’ own fields', () => {
  it('gates are grouped by the words of their id', () => {
    expect(classifyGate({ id: 'sam-registration' }).group).toBe('registration');
    expect(classifyGate({ id: 'era-commons' })).toEqual({ group: 'agency-systems', because: 'era' });
    expect(classifyGate({ id: 'federalwide-assurance' }).group).toBe('assurances');
    expect(classifyGate({ id: 'recognition-of-exemption-501c3' }).group).toBe('nonprofit-standing');
    expect(classifyGate({ id: 'payment-management-system' }).group).toBe('after-award');
  });
  it('standing is grouped by applies_to and the words of its id', () => {
    expect(classifyStanding({ id: 'nsf-epscor-jurisdiction', applies_to: 'institution' }).group).toBe('jurisdiction');
    expect(classifyStanding({ id: 'hbcu', applies_to: 'institution' }).group).toBe('designated');
    expect(classifyStanding({ id: 'nih-early-stage-investigator', applies_to: 'investigator' }).group).toBe('investigator');
    expect(classifyStanding({ id: 'private-operating-foundation', applies_to: 'nonprofit' }).group).toBe('foundation-kinds');
  });
});
