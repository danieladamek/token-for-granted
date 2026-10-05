import { useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadHelp, loadRoutes, useAsync } from '@/lib/heavy';
import Prose from '@/components/records/Prose';
import { AsOf, BlockLabel, Conflicts, Field, OfficialLink, RecordHeader, RecordLinks, Sources, Variants } from '@/components/records/Bits';
import { Disclosure, OtherFields } from '@/components/records/RecordSections';

const SHOWN = new Set(['id', 'name', 'what', 'who_it_is_for', 'cost', 'official_url', 'as_of', 'sources', 'conflicts', 'variants', 'sweep', 'changes_affecting', 'routes', 'pending_changes']);
const plain = (s?: string) => (s ?? '').replace(/\]\(#(term|cite):[^)]*\)/g, ']').replace(/\[([^\]]*)\]/g, '$1');

/** `/help` — the help records, filterable by who each is for and by cost, as the records state them. */
export default function Help() {
  const help = useAsync(loadHelp);
  const routes = useAsync(loadRoutes);
  const [params, setParams] = useSearchParams();
  const who = params.get('who') ?? '';
  const cost = params.get('cost') ?? '';
  const route = params.get('route') ?? '';
  const dwho = useDeferredValue(who);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const shown = useMemo(() => (help ?? []).filter((h) =>
    (!dwho || plain(`${h.who_it_is_for ?? ''} ${h.name} ${h.what}`).toLowerCase().includes(dwho.toLowerCase())) &&
    (!cost || (cost === 'stated' ? !!h.cost : !h.cost)) && (!route || h.routes.includes(route))), [help, dwho, cost, route]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Help</h1>
      <p className="bx-prose mt-2">Offices, help desks, programme staff and tools the official pages point to, each with who it is for and its cost where the record states them.</p>
      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-3 text-sm" role="search" aria-label="Filter help">
        <label className="block"><span className="block text-xs bx-muted mb-1">Who it is for (words in the record)</span><input className="bx-input" value={who} onChange={(e) => set('who', e.target.value)} data-testid="help-who" /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Cost</span><select className="bx-input" value={cost} onChange={(e) => set('cost', e.target.value)}><option value="">Any</option><option value="stated">Cost stated on the record</option><option value="none">No cost recorded</option></select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Route</span><select className="bx-input" value={route} onChange={(e) => set('route', e.target.value)}><option value="">Any route</option>{(routes ?? []).filter((r) => r.help.length).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{help ? `${shown.length} of ${help.length}` : 'Loading…'}</p>
      <div className="mt-4 grid gap-2">
        {shown.map((h) => (
          <Disclosure key={h.id} id={h.id} summary={<><span className="font-semibold">{h.name}</span>{h.cost && <span className="block text-xs bx-muted mt-0.5 line-clamp-1">{plain(h.cost)}</span>}</>}>
            <RecordHeader title={h.name} anchor={{ type: 'help', id: h.id }} level={3}><AsOf date={h.as_of} /></RecordHeader>
            <BlockLabel>What it is</BlockLabel><Prose md={h.what} />
            <Field label="Who it is for" value={h.who_it_is_for} />
            <Field label="Cost" value={h.cost} />
            <Conflicts items={h.conflicts} />
            <OtherFields record={h} shown={SHOWN} />
            <div className="mt-4"><OfficialLink url={h.official_url} /></div>
            {h.routes.length > 0 && (<><BlockLabel>Routes that point to it</BlockLabel><RecordLinks type="routes" ids={h.routes} /></>)}
            <Sources ns={h.sources} />
            <Variants items={h.variants} />
          </Disclosure>
        ))}
      </div>
    </div>
  );
}
