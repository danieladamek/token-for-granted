import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { recordedDate, STATUS_WORD, sweepPart } from '@/lib/data';
import { loadChanges, useAsync } from '@/lib/heavy';
import { monthOf, sortChanges } from '@/lib/changes';
import { findRecord } from '@/lib/records';
import Prose from '@/components/records/Prose';
import { ChangeChip, RecordHeader, Sources } from '@/components/records/Bits';
import ReaderFigure from '@/components/reader/ReaderFigure';
import type { Change, RecordType } from '@/types';

const AFFECT_WORD: Record<RecordType, string> = { funders: 'a funder', programs: 'a programme', gates: 'a gate', standing: 'a standing class', mechanics: 'a rule', routes: 'a route', help: 'help', changes: 'another change' };
const PARTS = ['research', 'people', 'service', 'capacity', 'rules', 'foundations'];
const PAGE = 80;

function Entry({ c }: { c: Change }) {
  return (
    <li id={c.id} className="bx-card p-3 scroll-mt-28" data-testid={`change-${c.id}`}>
      <RecordHeader title={recordedDate(c.date)} anchor={{ type: 'changes', id: c.id }} level={3}>
        <ChangeChip status={c.status} /><span className="bx-chip border border-[color:var(--bx-line)] bx-muted">recorded under {sweepPart(c.sweep)}</span>
      </RecordHeader>
      <div className="mt-1"><Prose md={c.what} /></div>
      {c.affects.length > 0 && <p className="mt-2 text-sm"><span className="bx-muted">Affects: </span>{c.affects.map((a) => { const m = findRecord(a, c.affects_files[a]); return m ? <Link key={a} className="underline mr-2" to={m.to}>{m.title}</Link> : <span key={a} className="mr-2 bx-todo">{a}</span>; })}</p>}
      {c.routes.length > 0 && <p className="mt-1 text-xs bx-muted">On {c.routes.length} route{c.routes.length === 1 ? '' : 's'}: {c.routes.map((r) => <Link key={r} className="underline mr-1.5" to={`/routes/${r}`}>{findRecord(r, ['routes'])?.title ?? r}</Link>)}</p>}
      <Sources ns={c.sources} />
    </li>
  );
}

/** `/changes` — the dated ledger, newest first, filterable by status, part, month and what it affects; undated last. */
export default function Changes() {
  const changes = useAsync(loadChanges);
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const part = params.get('part') ?? '';
  const month = params.get('month') ?? '';
  const affects = params.get('affects') ?? '';
  const [limit, setLimit] = useState(PAGE);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); setLimit(PAGE); };
  const sorted = useMemo(() => sortChanges(changes ?? []), [changes]);
  const all = useMemo(() => [...sorted.dated, ...sorted.undated], [sorted]);
  const statuses = [...new Set(all.map((c) => c.status))];
  const months = [...new Set(sorted.dated.map((c) => monthOf(c.date)).filter((m): m is string => !!m))].sort().reverse();
  const match = (c: Change) => (!status || c.status === status) && (!part || c.sweep.split('-')[0] === part) && (!month || monthOf(c.date) === month) &&
    (!affects || (affects.includes('/') ? c.affects.includes(affects.split('/')[1]) : Object.values(c.affects_files).some((t) => t.includes(affects as RecordType))));
  const dated = sorted.dated.filter(match);
  const undated = sorted.undated.filter(match);
  // a deep link (#id) to an entry beyond the current page opens enough of the list to show it
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  const hashAt = hash ? dated.findIndex((c) => c.id === hash) : -1;
  const shownLimit = Math.max(limit, hashAt + 1);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">What changed</h1>
      <p className="bx-prose mt-2">The dated ledger of 2025 and 2026, newest first. Each entry carries its status as a labelled chip, its date as recorded (a month or a year is shown as such), links to what it affects and its sources. A budget request is a request; an order that covers named parties covers only them.</p>
      <ReaderFigure id="changes-timeline" />
      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm" role="search" aria-label="Filter changes">
        <label className="block"><span className="block text-xs bx-muted mb-1">Status</span><select className="bx-input" value={status} onChange={(e) => set('status', e.target.value)} data-testid="changes-status"><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{STATUS_WORD[s] ?? s}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Recorded under</span><select className="bx-input" value={part} onChange={(e) => set('part', e.target.value)}><option value="">Every part</option>{PARTS.map((p) => <option key={p} value={p}>{sweepPart(p)}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Month</span><select className="bx-input" value={month} onChange={(e) => set('month', e.target.value)}><option value="">Any month</option>{months.map((m) => <option key={m} value={m}>{recordedDate(m)}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Affects</span><select className="bx-input" value={affects} onChange={(e) => set('affects', e.target.value)}><option value="">Anything</option>{(Object.keys(AFFECT_WORD) as RecordType[]).filter((t) => t !== 'changes' && t !== 'help' && t !== 'routes').map((t) => <option key={t} value={t}>{AFFECT_WORD[t]}</option>)}</select></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{changes ? `${dated.length + undated.length} of ${changes.length} entries` : 'Loading…'}</p>
      <ol className="mt-4 grid gap-3">{dated.slice(0, shownLimit).map((c) => <Entry key={c.id} c={c} />)}</ol>
      {dated.length > shownLimit && <p className="mt-4"><button type="button" className="bx-btn" onClick={() => setLimit((l) => l + PAGE * 2)}>Show more ({dated.length - shownLimit} left)</button></p>}
      {undated.length > 0 && (
        <section className="mt-10" aria-labelledby="undated-h">
          <h2 id="undated-h" className="text-2xl">Undated</h2>
          <p className="text-sm bx-muted">Entries whose date the sources did not settle.</p>
          <ol className="mt-3 grid gap-3">{undated.map((c) => <Entry key={c.id} c={c} />)}</ol>
        </section>
      )}
    </div>
  );
}
