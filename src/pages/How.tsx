import { useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sweepPart } from '@/lib/data';
import { loadMechanics, loadRoutes, useAsync } from '@/lib/heavy';
import Prose from '@/components/records/Prose';
import CiteList from '@/components/records/CiteList';
import { AsOf, BlockLabel, Conflicts, Field, OfficialLink, PendingChanges, RecordHeader, RecordLinks, Sources, Variants } from '@/components/records/Bits';
import { Disclosure, OtherFields } from '@/components/records/RecordSections';
import ReaderFigure from '@/components/reader/ReaderFigure';

const PARTS = ['rules', 'research', 'people', 'service', 'capacity', 'foundations'];
const SHOWN = new Set(['id', 'name', 'what', 'rule', 'figures', 'applies_to', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'variants', 'sweep', 'changes_affecting', 'routes']);
const plain = (s: string) => s.replace(/\]\(#(term|cite):[^)]*\)/g, ']').replace(/\[([^\]]*)\]/g, '$1');

/** `/how` — the rules and processes, grouped by the part of the guide that recorded them; filter by route and text. */
export default function How() {
  const mechanics = useAsync(loadMechanics);
  const routes = useAsync(loadRoutes);
  const [params, setParams] = useSearchParams();
  const route = params.get('route') ?? '';
  const q = params.get('q') ?? '';
  const dq = useDeferredValue(q);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const shown = useMemo(() => (mechanics ?? []).filter((m) => (!route || m.routes.includes(route)) && (!dq || plain(`${m.name} ${m.what} ${Array.isArray(m.rule) ? m.rule.join(' ') : m.rule ?? ''}`).toLowerCase().includes(dq.toLowerCase()))), [mechanics, route, dq]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Rules and processes</h1>
      <p className="bx-prose mt-2">How an award works underneath: the rules in force with their sections, the figures exactly as the texts give them, what each applies to, and what is pending. Grouped by the part of the guide that recorded them.</p>
      <ReaderFigure id="indirect-cost-rules" />
      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-2 text-sm" role="search" aria-label="Filter rules">
        <label className="block"><span className="block text-xs bx-muted mb-1">Search names and text</span><input className="bx-input" value={q} onChange={(e) => set('q', e.target.value)} data-testid="how-q" /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Route</span><select className="bx-input" value={route} onChange={(e) => set('route', e.target.value)}><option value="">Any route</option>{(routes ?? []).filter((r) => r.mechanics.length).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{mechanics ? `${shown.length} of ${mechanics.length}` : 'Loading…'}</p>
      {PARTS.map((part) => {
        const list = shown.filter((m) => m.sweep.split('-')[0] === part);
        if (!list.length) return null;
        return (
          <section key={part} className="mt-8" aria-labelledby={`hp-${part}`}>
            <h2 id={`hp-${part}`} className="text-2xl">Recorded under {sweepPart(part)} <span className="bx-muted text-base font-body">({list.length})</span></h2>
            <div className="mt-3 grid gap-2">
              {list.map((m) => (
                <Disclosure key={m.id} id={m.id} summary={<span className="font-semibold">{m.name}</span>}>
                  <RecordHeader title={m.name} anchor={{ type: 'mechanics', id: m.id }} level={3}><AsOf date={m.as_of} /></RecordHeader>
                  <BlockLabel>What it is</BlockLabel><Prose md={m.what} />
                  <Field label="The rule" value={typeof m.rule === 'string' ? [m.rule] : m.rule} />
                  {m.figures.length > 0 && (
                    <><BlockLabel>Figures, exactly as the text gives them</BlockLabel>
                      <div className="overflow-x-auto"><table className="bx-table"><thead><tr><th scope="col">What</th><th scope="col">Figure</th><th scope="col">Sources</th></tr></thead>
                        <tbody>{m.figures.map((f, i) => <tr key={i}><td>{f.label}</td><td>{f.value}</td><td><CiteList ns={f.cite} /></td></tr>)}</tbody></table></div></>
                  )}
                  <Field label="Applies to" value={m.applies_to} />
                  <PendingChanges items={m.pending_changes} />
                  <Conflicts items={m.conflicts} />
                  <OtherFields record={m} shown={SHOWN} />
                  <div className="mt-4"><OfficialLink url={m.official_url} /></div>
                  {m.routes.length > 0 && (<><BlockLabel>Routes that point to it</BlockLabel><RecordLinks type="routes" ids={m.routes} /></>)}
                  {m.changes_affecting.length > 0 && (<><BlockLabel>In the dated ledger</BlockLabel><RecordLinks type="changes" ids={m.changes_affecting} /></>)}
                  <Sources ns={m.sources} />
                  <Variants items={m.variants} />
                </Disclosure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
