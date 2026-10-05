import { useSearchParams } from 'react-router-dom';
import standingGroupsJson from '@/data/standing-groups.json';
import { loadStanding, useAsync } from '@/lib/heavy';
import Prose from '@/components/records/Prose';
import { AsOf, BlockLabel, Conflicts, Field, OfficialLink, PendingChanges, RecordHeader, RecordLinks, Sources, Variants } from '@/components/records/Bits';
import { Disclosure, OtherFields } from '@/components/records/RecordSections';
import ReaderFigure from '@/components/reader/ReaderFigure';

const GROUPS = standingGroupsJson as { id: string; label: string; rule: string }[];
const APPLIES = [{ id: 'institution', label: 'Applies to an institution' }, { id: 'nonprofit', label: 'Applies to a non-profit' }, { id: 'investigator', label: 'Applies to an investigator' }];
const SHOWN = new Set(['id', 'name', 'applies_to', 'what', 'who_qualifies', 'how_decided', 'opens', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'variants', 'sweep', 'changes_affecting', 'routes', 'group']);

/** `/standing` — eligibility classes grouped by `applies_to` and by kind (KICKOFF §4b). Figure 8 sits here. */
export default function Standing() {
  const standing = useAsync(loadStanding);
  const [params, setParams] = useSearchParams();
  const by = params.get('by') === 'applies' ? 'applies' : 'kind';
  const groups = by === 'kind'
    ? GROUPS.map((g) => ({ id: g.id, label: g.label, list: (standing ?? []).filter((s) => (s.group as { group: string } | undefined)?.group === g.id) }))
    : APPLIES.map((a) => ({ id: a.id, label: a.label, list: (standing ?? []).filter((s) => s.applies_to === a.id) }));
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Standing</h1>
      <p className="bx-prose mt-2">The eligibility classes that open a programme or close it: lists of states and territories, designated institutions, an institution’s profile, a non-profit’s tax standing, the kinds of foundation, and an investigator’s own status. Each says who qualifies, how that is decided, and which programmes it opens.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Group standing by">
        <span className="bx-muted">Group by:</span>
        <button type="button" className={`bx-btn ${by === 'kind' ? 'bx-btn-on' : ''}`} aria-pressed={by === 'kind'} onClick={() => setParams({}, { replace: true })}>kind</button>
        <button type="button" className={`bx-btn ${by === 'applies' ? 'bx-btn-on' : ''}`} aria-pressed={by === 'applies'} onClick={() => setParams({ by: 'applies' }, { replace: true })}>what it applies to</button>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer bx-muted">How the kinds are assigned</summary>
        <ul className="mt-2 grid gap-1">{GROUPS.map((g) => <li key={g.id}><span className="font-semibold">{g.label}:</span> {g.rule}.</li>)}</ul>
        <p className="mt-1 bx-muted">The tests run on each record’s applies_to and the words of its id when the site is built, in the order listed.</p>
      </details>
      <ReaderFigure id="jurisdiction-lists" />
      {!standing && <p className="bx-muted" role="status">Loading…</p>}
      {groups.map((grp) => grp.list.length ? (
        <section key={grp.id} className="mt-8" aria-labelledby={`sg-${grp.id}`}>
          <h2 id={`sg-${grp.id}`} className="text-2xl">{grp.label} <span className="bx-muted text-base font-body">({grp.list.length})</span></h2>
          <div className="mt-3 grid gap-2">
            {grp.list.map((s) => (
              <Disclosure key={s.id} id={s.id} summary={<><span className="font-semibold">{s.name}</span><span className="block text-xs bx-muted mt-0.5">{s.applies_to} · opens {s.opens.length} programme{s.opens.length === 1 ? '' : 's'}</span></>}>
                <RecordHeader title={s.name} anchor={{ type: 'standing', id: s.id }} level={3}><AsOf date={s.as_of} /><span className="bx-chip bg-paper-2 dark:bg-night-2">applies to: {s.applies_to}</span></RecordHeader>
                <BlockLabel>What it is</BlockLabel><Prose md={s.what} />
                <Field label="Who qualifies" value={s.who_qualifies} />
                <Field label="How it is decided" value={s.how_decided} />
                {s.opens.length > 0 && (<><BlockLabel>Programmes it opens ({s.opens.length})</BlockLabel><RecordLinks type="programs" ids={s.opens} /></>)}
                {s.routes.length > 0 && (<><BlockLabel>Routes that name it</BlockLabel><RecordLinks type="routes" ids={s.routes} /></>)}
                <PendingChanges items={s.pending_changes} />
                <Conflicts items={s.conflicts} />
                <OtherFields record={s} shown={SHOWN} />
                <div className="mt-4"><OfficialLink url={s.official_url} /></div>
                {s.changes_affecting.length > 0 && (<><BlockLabel>In the dated ledger</BlockLabel><RecordLinks type="changes" ids={s.changes_affecting} /></>)}
                <Sources ns={s.sources} />
                <Variants items={s.variants} />
              </Disclosure>
            ))}
          </div>
        </section>
      ) : null)}
    </div>
  );
}
