import { Link, useSearchParams } from 'react-router-dom';
import gateGroupsJson from '@/data/gate-groups.json';
import { GATE_COLOUR } from '@/lib/data';
import { loadGates, loadRoutes, useAsync } from '@/lib/heavy';
import type { Gate } from '@/types';
import Prose from '@/components/records/Prose';
import { AsOf, BlockLabel, Conflicts, Field, OfficialLink, PendingChanges, RecordHeader, RecordLinks, Sources, Variants } from '@/components/records/Bits';
import { Disclosure, OtherFields } from '@/components/records/RecordSections';
import ReaderFigure from '@/components/reader/ReaderFigure';

const GROUPS = gateGroupsJson as { id: string; label: string; rule: string }[];
const WHO: { id: string; label: string }[] = [
  { id: 'organisation', label: 'The organisation does it' }, { id: 'person', label: 'The person does it' }, { id: 'both', label: 'Both the organisation and the person' }, { id: 'not stated', label: 'Who does it is not stated on the record' },
];
const SHOWN = new Set(['id', 'name', 'what', 'applies_when', 'who_does_it', 'steps', 'time', 'cost', 'renewal', 'common_problems', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'variants', 'sweep', 'changes_affecting', 'routes', 'programs_requiring', 'group', 'same_as']);

function GateBody({ g, routeName }: { g: Gate; routeName: (id: string) => string }) {
  return (
    <>
      <RecordHeader title={g.name} anchor={{ type: 'gates', id: g.id }} level={3}><AsOf date={g.as_of} />{g.who_does_it && <span className="bx-chip bg-paper-2 dark:bg-night-2">who does it: {g.who_does_it}</span>}</RecordHeader>
      {typeof g.same_as === 'string' && <p className="mt-2 text-sm bx-card p-2">The pack records this gate under another id as well; the full record is <Link className="underline" to={`/gates#${g.same_as}`}>{g.same_as}</Link>.</p>}
      <BlockLabel>What it is</BlockLabel><Prose md={g.what} />
      <Field label="Applies when" value={g.applies_when} />
      <Field label="Who does it" value={g.who_does_it} />
      <Field label="Steps" value={g.steps} ordered />
      <Field label="Time" value={g.time} />
      <Field label="Cost" value={g.cost} />
      <Field label="Renewal" value={g.renewal} />
      <Field label="Common problems (as an official page warns)" value={g.common_problems} />
      <PendingChanges items={g.pending_changes} />
      <Conflicts items={g.conflicts} />
      <OtherFields record={g} shown={SHOWN} />
      <div className="mt-4"><OfficialLink url={g.official_url} /></div>
      <BlockLabel>Routes that need it ({g.routes.length})</BlockLabel>
      {g.routes.length ? <p className="flex flex-wrap gap-1.5">{g.routes.map((r) => <Link key={r} className="bx-chip border border-[color:var(--bx-line)] hover:underline" to={`/routes/${r}`}>{routeName(r)}</Link>)}</p> : <p className="text-sm bx-muted">No route record lists this gate.</p>}
      {g.programs_requiring.length > 0 && (<><BlockLabel>Programmes that list it ({g.programs_requiring.length})</BlockLabel><RecordLinks type="programs" ids={g.programs_requiring} /></>)}
      {g.changes_affecting.length > 0 && (<><BlockLabel>In the dated ledger</BlockLabel><RecordLinks type="changes" ids={g.changes_affecting} /></>)}
      <Sources ns={g.sources} />
      <Variants items={g.variants} />
    </>
  );
}

/**
 * `/gates` — checklists grouped by kind or by who does it (KICKOFF §4b). The kind is derived at build time from each
 * gate's own id by the rules printed below; who does it is the record's own field.
 */
export default function Gates() {
  const gates = useAsync(loadGates);
  const routes = useAsync(loadRoutes);
  const [params, setParams] = useSearchParams();
  const by = params.get('by') === 'who' ? 'who' : 'kind';
  const routeName = (id: string) => routes?.find((x) => x.id === id)?.name ?? id;
  const groups = by === 'kind'
    ? GROUPS.map((g) => ({ id: g.id, label: g.label, list: (gates ?? []).filter((x) => x.group?.group === g.id) }))
    : WHO.map((w) => ({ id: w.id, label: w.label, list: (gates ?? []).filter((x) => (x.who_does_it ?? 'not stated') === w.id) }));
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Gates</h1>
      <p className="bx-prose mt-2">The registrations, systems, assurances and filings that stand in front of the routes. Each gate says what it is, when it applies, who does it, the steps, time, cost and renewal where an official page states them, the problems an official page warns about, pending changes, sources, and the routes that need it.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Group gates by">
        <span className="bx-muted">Group by:</span>
        <button type="button" className={`bx-btn ${by === 'kind' ? 'bx-btn-on' : ''}`} aria-pressed={by === 'kind'} onClick={() => setParams({}, { replace: true })}>kind</button>
        <button type="button" className={`bx-btn ${by === 'who' ? 'bx-btn-on' : ''}`} aria-pressed={by === 'who'} onClick={() => setParams({ by: 'who' }, { replace: true })} data-testid="group-by-who">who does it</button>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer bx-muted">How the kinds are assigned</summary>
        <ul className="mt-2 grid gap-1">{GROUPS.map((g) => <li key={g.id}><span className="font-semibold">{g.label}:</span> {g.rule}.</li>)}</ul>
        <p className="mt-1 bx-muted">The tests run on the words of each gate’s id when the site is built, after-award first and registration last; the word that placed each gate is shown on it.</p>
      </details>
      <ReaderFigure id="registration-times" />
      {!gates && <p className="bx-muted" role="status">Loading…</p>}
      {groups.map((grp) => {
        if (!grp.list.length) return null;
        return (
          <section key={grp.id} className="mt-8" aria-labelledby={`gg-${grp.id}`}>
            <h2 id={`gg-${grp.id}`} className="text-2xl flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: GATE_COLOUR }} />{grp.label} <span className="bx-muted text-base font-body">({grp.list.length})</span></h2>
            <div className="mt-3 grid gap-2">
              {grp.list.map((g) => (
                <Disclosure key={g.id} id={g.id} summary={<><span className="font-semibold">{g.name}</span><span className="block text-xs bx-muted mt-0.5">{g.routes.length} route{g.routes.length === 1 ? '' : 's'} need it{g.who_does_it ? ` · ${g.who_does_it}` : ''}{by === 'kind' && g.group.because ? ` · kind from “${g.group.because}”` : by === 'who' ? ` · ${GROUPS.find((x) => x.id === g.group.group)?.label ?? ''}` : ''}</span></>}>
                  <GateBody g={g} routeName={routeName} />
                </Disclosure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
