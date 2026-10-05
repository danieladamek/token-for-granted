import { describe, expect, it } from 'vitest';
import { byDate, ELIG_GROUPS, emptyState, matches, stateFromParams } from '../../src/lib/find';
import { compareNewestFirst, monthOf, sortChanges } from '../../src/lib/changes';
import type { Opp } from '../../src/lib/opps';

const opp = (o: Partial<Opp>): Opp => ({
  id: '1', number: 'N-1', title: 'A notice', agencyCode: 'HHS-NIH11', agency: 'National Institutes of Health', topAgency: 'HHS', status: 'posted',
  postDate: '2026-09-01', closeDate: '2026-11-01', lastUpdated: '', estPostDate: '', estDueDate: '', applicantTypes: ['06', '20'], eligibilityNote: '',
  instruments: ['G'], categories: ['HL'], als: ['93.859'], ceiling: 500000, floor: null, totalFunding: null, awards: null, costSharing: 'No', excerpt: 'Research on R01 things', link: '', ...o,
});
const today = '2026-10-05';

describe('/find filters', () => {
  it('applicant-type groups match any of their codes, including "unrestricted and other"', () => {
    const g = ELIG_GROUPS.find((x) => x.id === 'unrestricted-other')!;
    expect(g.codes).toEqual(['99', '25']);
    expect(matches(opp({ applicantTypes: ['99'] }), { ...emptyState(), elig: g.codes }, today)).toBe(true);
    expect(matches(opp({ applicantTypes: ['06'] }), { ...emptyState(), elig: g.codes }, today)).toBe(false);
  });
  it('a saved route filter: applicant types and keywords any-of', () => {
    const f = stateFromParams(new URLSearchParams('elig=06|20&any=R01|R21'));
    expect(matches(opp({}), f, today)).toBe(true);
    expect(matches(opp({ excerpt: 'nothing', title: 'Other' }), f, today)).toBe(false);
  });
  it('agency, instrument, Assistance Listing prefix, ceiling', () => {
    expect(matches(opp({}), { ...emptyState(), agency: 'HHS' }, today)).toBe(true);
    expect(matches(opp({}), { ...emptyState(), agency: 'HHS-NIH11' }, today)).toBe(true);
    expect(matches(opp({}), { ...emptyState(), agency: 'NSF' }, today)).toBe(false);
    expect(matches(opp({}), { ...emptyState(), instrument: 'CA' }, today)).toBe(false);
    expect(matches(opp({}), { ...emptyState(), aln: ['93'] }, today)).toBe(true);
    expect(matches(opp({}), { ...emptyState(), ceilingMin: '600000' }, today)).toBe(false);
  });
  it('close-date window for posted notices; estimated-post window for forecasts', () => {
    expect(matches(opp({ closeDate: '2026-10-20' }), { ...emptyState(), closeWithin: '30' }, today)).toBe(true);
    expect(matches(opp({ closeDate: '2027-01-20' }), { ...emptyState(), closeWithin: '30' }, today)).toBe(false);
    expect(matches(opp({ status: 'forecast', closeDate: '', estPostDate: '2026-11-01' }), { ...emptyState(), estPostWithin: '30' }, today)).toBe(true);
  });
  it('keyword words are all required', () => {
    expect(matches(opp({}), { ...emptyState(), q: 'r01 research' }, today)).toBe(true);
    expect(matches(opp({}), { ...emptyState(), q: 'r01 ocean' }, today)).toBe(false);
  });
  it('posted by close date (none last), then forecasts', () => {
    const xs = [opp({ id: 'f', status: 'forecast', estPostDate: '2026-12-01' }), opp({ id: 'b', closeDate: '' }), opp({ id: 'a', closeDate: '2026-10-10' })];
    expect([...xs].sort(byDate).map((o) => o.id)).toEqual(['a', 'b', 'f']);
  });
});

describe('the changes sorter', () => {
  it('newest first with day, month and year dates; unknown last; a month after its days', () => {
    const cs = [{ date: '2025-03' }, { date: '2026-01-05' }, { date: 'unknown' }, { date: '2025' }, { date: '2025-03-14' }, { date: '2026-02' }];
    const { dated, undated } = sortChanges(cs);
    expect(dated.map((c) => c.date)).toEqual(['2026-02', '2026-01-05', '2025-03-14', '2025-03', '2025']);
    expect(undated.map((c) => c.date)).toEqual(['unknown']);
    expect(compareNewestFirst({ date: '2026-01-05' }, { date: '2025-12-31' })).toBeLessThan(0);
    expect(monthOf('2025-03-14')).toBe('2025-03');
    expect(monthOf('2025')).toBeNull();
  });
});
