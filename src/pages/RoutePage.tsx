import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import { loadChanges, loadGates, loadHelp, loadMechanics, loadProgramsIndex, loadRoutes, loadStanding, useAsync } from '@/lib/heavy';
import type { Pathfinder, ProgramMeta, Route } from '@/types';
import { findHref } from '@/lib/find-link';
import { FAMILY_LABEL, STATUS_LABEL } from '@/lib/data';
import { sortChanges } from '@/lib/changes';
import Prose from '@/components/records/Prose';
import { AsOf, BlockLabel, ChangeChip, Conflicts, FamilyChip, PendingChanges, RecordHeader, RecordLinks, Sources, StatusChip, Variants } from '@/components/records/Bits';
import { doorWord, PURPOSE_LABEL, STAGE_LABEL, WHO_LABEL } from './Routes';
import NotFound from './NotFound';

const pf = pathfinderJson as unknown as Pathfinder;
const ROUTE_STATUSES = pf.display.route_statuses;

/** "Find opportunities": the route's saved filter into /find, or — for a foundation route without one — the directory. */
export function FindBlock({ r }: { r: Pick<Route, 'id' | 'name' | 'find_filter' | 'funder_kind'> }) {
  const f = r.find_filter;
  return (
    <section aria-label="Find opportunities" data-testid="find-block">
      <BlockLabel>Find opportunities</BlockLabel>
      {f ? (
        <div className="bx-card p-3 text-sm">
          <Link className="bx-btn-primary" to={findHref(f, r.name, r.id)} data-testid="open-find">Open the opportunity search with this route’s saved filter →</Link>
          <p className="mt-2 text-xs bx-muted">
            Saved filter from the pack:
            {f.applicant_types.length > 0 && <> who may apply — {f.applicant_types.join(', ')}</>}
            {f.agencies.length > 0 && <> · agencies {f.agencies.join(', ')}</>}
            {f.keywords.length > 0 && <> · any of the words {f.keywords.map((k) => `“${k}”`).join(', ')}</>}.
            Results come from this site’s own daily copy of the public Grants.gov extract.
          </p>
        </div>
      ) : r.funder_kind === 'foundation' ? (
        <p className="bx-card p-3 text-sm" data-testid="no-feed">No public feed of foundation calls exists, so this route has no saved search. The <Link className="underline" to="/find?tab=foundations">foundation directory</Link> lists every private foundation the IRS lists, and each foundation page on <Link className="underline" to="/funders#foundations">Funders</Link> links to the foundation’s own site.</p>
      ) : (
        <p className="bx-card p-3 text-sm" data-testid="no-saved-search">The pack records no saved search for this route. The <Link className="underline" to="/find">opportunity search</Link> can still be filtered by hand.</p>
      )}
    </section>
  );
}

function ProgrammeCard({ p }: { p: ProgramMeta }) {
  return (
    <li className="bx-card p-2.5 text-sm" data-testid="route-programme" data-status={p.status}>
      <Link className="font-semibold underline" to={`/programs/${p.id}`}>{p.name}</Link>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs"><StatusChip status={p.status} date={p.status_date} />{p.next_date && <span className="bx-muted">next date on the page: {p.next_date}</span>}</p>
      <p className="text-xs bx-muted mt-0.5">{p.funder_name}</p>
    </li>
  );
}

/** `/routes/:id` — in the fixed order of KICKOFF §4b. */
export default function RoutePage() {
  const { id } = useParams();
  const routes = useAsync(loadRoutes);
  const programs = useAsync(loadProgramsIndex);
  const gates = useAsync(loadGates);
  const standing = useAsync(loadStanding);
  const mechanics = useAsync(loadMechanics);
  const help = useAsync(loadHelp);
  const changes = useAsync(loadChanges);
  const r = routes?.find((x) => x.id === id);
  useEffect(() => { if (r) document.title = `${r.name} · Token for Granted`; return () => { document.title = 'Token for Granted'; }; }, [r]);
  const progs = useMemo(() => (r && programs ? r.programs.map((pid) => programs.find((p) => p.id === pid)).filter((p): p is ProgramMeta => !!p) : []), [r, programs]);
  const listed = progs.filter((p) => ROUTE_STATUSES.includes(p.status));
  const more = progs.length - listed.length;
  const routeChanges = useMemo(() => (r && changes ? sortChanges(changes.filter((c) => r.changes.includes(c.id))) : { dated: [], undated: [] }), [r, changes]);
  if (!routes) return <div className="mx-auto max-w-3xl px-4 py-12 bx-muted" role="status">Loading…</div>;
  if (!r) return <NotFound />;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8" data-testid="route-page">
      <p className="text-sm"><Link className="underline" to="/routes">Routes</Link> / <Link className="underline" to={`/routes?family=${r.family}`}>{FAMILY_LABEL[r.family]}</Link></p>
      <div className="mt-2">
        <RecordHeader title={r.name} anchor={{ type: 'routes', id: r.id }}>
          <FamilyChip family={r.family} /><AsOf date={r.as_of} />
          <span className="bx-chip bg-paper-2 dark:bg-night-2">door: {doorWord(r.door)}</span>
          <span className="bx-chip bg-paper-2 dark:bg-night-2">funders: {r.funder_kind}</span>
        </RecordHeader>
      </div>

      <BlockLabel>What it is</BlockLabel>
      <div className="bx-reader !text-[16px] !leading-7"><Prose md={r.what} /></div>
      {r.who_for && (<><BlockLabel>Who it is for</BlockLabel><Prose md={r.who_for} /></>)}
      {r.how_it_works.length > 0 && (<><BlockLabel>How it works</BlockLabel><ol className="list-decimal pl-5 grid gap-1.5" data-testid="how-it-works">{r.how_it_works.map((s, i) => <li key={i}><Prose md={s} /></li>)}</ol></>)}
      {r.watch && (<section aria-label="What changed in 2025–26, or is pending" data-testid="watch"><BlockLabel>What changed in 2025–26, or is pending</BlockLabel><Prose md={r.watch} /></section>)}
      {r.id === 'formula-money-through-the-state' && pf.display.pass_through_note && <p className="bx-card p-3 mt-4 text-sm border-l-4 border-l-[color:var(--bx-line)]" data-testid="pass-through-note">{pf.display.pass_through_note}</p>}

      <section aria-label="Programmes on this route" data-testid="route-programmes">
        <BlockLabel>Programmes on this route</BlockLabel>
        {!programs ? <p className="text-sm bx-muted" role="status">Loading…</p> : (
          <>
            {ROUTE_STATUSES.map((st) => {
              const list = listed.filter((p) => p.status === st);
              if (!list.length) return null;
              return (
                <div key={st} className="mt-2" data-testid={`route-status-${st}`}>
                  <h3 className="text-sm font-semibold">{STATUS_LABEL[st] ?? st} <span className="bx-muted font-normal">({list.length})</span></h3>
                  <ul className="mt-1 grid gap-2 sm:grid-cols-2">{list.map((p) => <ProgrammeCard key={p.id} p={p} />)}</ul>
                </div>
              );
            })}
            {listed.length === 0 && <p className="text-sm bx-muted">None of this route’s programmes is open, forecast, closed or paid by formula as read.</p>}
            {more > 0 && <p className="mt-3 text-sm" data-testid="route-more"><Link className="underline" to={`/programs?route=${r.id}&status=all`}>{more} more programmes on this route have no current notice, have expired, are not being competed or could not be confirmed</Link></p>}
            {pf.display.route_statuses_note && <p className="mt-2 text-xs bx-muted" data-testid="route-statuses-note">{pf.display.route_statuses_note}</p>}
            {progs.length !== r.programs.length && <p className="mt-2"><span className="bx-todo">{r.programs.length - progs.length} programme id(s) on this route are not in the pack</span></p>}
          </>
        )}
        {r.funders.length > 0 && <p className="mt-3 text-sm"><span className="font-semibold text-xs bx-muted uppercase tracking-[0.15em]">Funders: </span><RecordLinks type="funders" ids={r.funders} /></p>}
      </section>

      {r.gates.length > 0 && (
        <section aria-label="Gates on this route" data-testid="route-gates">
          <BlockLabel>Gates on this route ({r.gates.length})</BlockLabel>
          <ul className="grid gap-1.5">
            {r.gates.map((g) => {
              const gate = gates?.find((x) => x.id === g);
              return (
                <li key={g} className="text-sm border-l-2 pl-2" style={{ borderLeftColor: 'var(--bx-line)' }}>
                  {gate ? <><Link className="bx-chip border border-[color:var(--bx-line)] hover:underline mr-1.5" to={`/gates#${g}`}>{gate.name}</Link><div className="bx-muted line-clamp-2 mt-0.5"><Prose md={gate.what} /></div></>
                    : gates ? <span className="bx-todo">{g} — not a gate id in the pack</span> : g}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {r.standing.length > 0 && (
        <section aria-label="Standing that opens or limits it" data-testid="route-standing">
          <BlockLabel>Standing that opens or limits it</BlockLabel>
          <ul className="grid gap-1.5">{r.standing.map((s) => { const st = standing?.find((x) => x.id === s); return <li key={s} className="text-sm">{st ? <><Link className="underline font-semibold" to={`/standing#${s}`}>{st.name}</Link> <span className="bx-muted text-xs">({st.applies_to})</span><div className="bx-muted line-clamp-2"><Prose md={st.who_qualifies} /></div></> : standing ? <span className="bx-todo">{s} — not in the pack</span> : s}</li>; })}</ul>
        </section>
      )}

      {r.mechanics.length > 0 && (
        <section aria-label="Rules worth reading" data-testid="route-mechanics">
          <BlockLabel>Rules worth reading</BlockLabel>
          <ul className="grid gap-1.5">{r.mechanics.map((m) => { const me = mechanics?.find((x) => x.id === m); return <li key={m} className="text-sm">{me ? <><Link className="underline font-semibold" to={`/how#${m}`}>{me.name}</Link><div className="bx-muted line-clamp-2"><Prose md={me.what} /></div></> : mechanics ? <span className="bx-todo">{m} — not in the pack</span> : m}</li>; })}</ul>
        </section>
      )}

      {r.help.length > 0 && (
        <section aria-label="Help" data-testid="route-help">
          <BlockLabel>Help</BlockLabel>
          <ul className="grid gap-1.5">{r.help.map((h) => { const he = help?.find((x) => x.id === h); return <li key={h} className="text-sm">{he ? <><Link className="underline font-semibold" to={`/help#${h}`}>{he.name}</Link><div className="bx-muted line-clamp-2"><Prose md={he.what} /></div></> : help ? <span className="bx-todo">{h} — not in the pack</span> : h}</li>; })}</ul>
        </section>
      )}

      {r.changes.length > 0 && (
        <section aria-label="Changes that bear on it" data-testid="route-changes">
          <BlockLabel>Changes that bear on it ({r.changes.length}, newest first)</BlockLabel>
          {!changes ? <p className="text-sm bx-muted" role="status">Loading…</p> : (
            <ul className="grid gap-2">
              {[...routeChanges.dated, ...routeChanges.undated].map((c) => (
                <li key={c.id} className="bx-card p-2.5 text-sm">
                  <p className="text-xs"><ChangeChip status={c.status} date={c.date} /></p>
                  <Prose md={c.what} className="mt-1" />
                  <Link className="underline text-xs" to={`/changes#${c.id}`}>In the ledger →</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <FindBlock r={r} />
      <PendingChanges items={r.pending_changes} />
      <Conflicts items={r.conflicts} />
      <BlockLabel>Tags the pathfinder reads</BlockLabel>
      <p className="flex flex-wrap gap-1 text-xs">
        {r.who.map((t) => <span key={t} className="bx-chip bg-paper-2 dark:bg-night-2">{WHO_LABEL[t] ?? t}</span>)}
        {r.purpose.map((t) => <span key={t} className="bx-chip bg-paper-2 dark:bg-night-2">{PURPOSE_LABEL[t] ?? t}</span>)}
        {r.stage.map((t) => <span key={t} className="bx-chip border border-[color:var(--bx-line)] bx-muted">{STAGE_LABEL[t] ?? t}</span>)}
      </p>
      <Sources ns={r.sources} />
      <Variants items={r.variants} />
      <p className="mt-6 text-sm bx-muted">This route is as of {r.as_of}. It states what the governing texts and official pages say; it is not advice.</p>
    </article>
  );
}
