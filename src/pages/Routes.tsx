import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import { AS_OF, familyColour, FAMILIES, FAMILY_LABEL } from '@/lib/data';
import { loadRoutes, useAsync } from '@/lib/heavy';
import type { Pathfinder } from '@/types';
import Prose from '@/components/records/Prose';

const pf = pathfinderJson as unknown as Pathfinder;
const optionLabel = (field: string) => Object.fromEntries((pf.questions.find((q) => q.field === field)?.options ?? []).map((o) => [o.tag ?? o.value ?? '', o.label]));
export const WHO_LABEL = optionLabel('who');
export const PURPOSE_LABEL = optionLabel('purpose');
export const STAGE_LABEL = optionLabel('stage');
export const SIDE_LABEL = optionLabel('funder_kind');
/** `door` values as written in the pack; shown verbatim with the hyphens opened. */
export const doorWord = (d: string) => d.replace(/-/g, ' ');

/** `/routes` — the catalogue, filterable by family, funder side, door and who it is for; filters live in the URL. */
export default function Routes() {
  const routes = useAsync(loadRoutes);
  const [params, setParams] = useSearchParams();
  const family = params.get('family') ?? '';
  const side = params.get('side') ?? '';
  const door = params.get('door') ?? '';
  const who = params.get('who') ?? '';
  const q = params.get('q') ?? '';
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const doors = useMemo(() => [...new Set((routes ?? []).map((r) => r.door))].sort(), [routes]);

  const shown = useMemo(() => (routes ?? []).filter((r) =>
    (!family || r.family === family) &&
    (!side || r.funder_kind === side || (side !== 'either' && r.funder_kind === 'either')) &&
    (!door || r.door === door) &&
    (!who || r.who.includes(who)) &&
    (!q || `${r.name} ${r.id}`.toLowerCase().includes(q.toLowerCase())),
  ), [routes, family, side, door, who, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Routes</h1>
      <p className="bx-prose mt-2 max-w-3xl">Every route to grant money the guide records: six entry routes, then four families. A route page gathers the programmes on it with their status and the date each was read, the gates in front of it, the standing it needs, the rules worth reading, help, what changed, a saved search into the opportunity feed, and its sources. Records as of {AS_OF}.</p>

      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm" role="search" aria-label="Filter routes">
        <label className="block"><span className="block text-xs bx-muted mb-1">Family</span>
          <select className="bx-input" value={family} onChange={(e) => set('family', e.target.value)} data-testid="filter-family"><option value="">All families</option>{FAMILIES.map((f) => <option key={f} value={f}>{FAMILY_LABEL[f]}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Funder side</span>
          <select className="bx-input" value={side} onChange={(e) => set('side', e.target.value)}><option value="">Any</option><option value="federal">{SIDE_LABEL.federal ?? 'federal'}</option><option value="foundation">{SIDE_LABEL.foundation ?? 'foundation'}</option><option value="either">Routes marked either</option></select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Door</span>
          <select className="bx-input" value={door} onChange={(e) => set('door', e.target.value)}><option value="">Any door</option>{doors.map((d) => <option key={d} value={d}>{doorWord(d)}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Who it is for</span>
          <select className="bx-input" value={who} onChange={(e) => set('who', e.target.value)}><option value="">Anyone</option>{Object.entries(WHO_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Name contains</span>
          <input className="bx-input" value={q} onChange={(e) => set('q', e.target.value)} /></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{routes ? `${shown.length} of ${routes.length} routes` : 'Loading…'}{(family || side || door || who || q) && <> · <button type="button" className="underline" onClick={() => setParams({}, { replace: true })}>clear filters</button></>}</p>

      {FAMILIES.filter((f) => !family || f === family).map((f) => {
        const list = shown.filter((r) => r.family === f);
        if (!list.length) return null;
        return (
          <section key={f} className="mt-6" aria-labelledby={`fam-${f}`}>
            <h2 id={`fam-${f}`} className="text-2xl flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: familyColour(f) }} />{FAMILY_LABEL[f]}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {list.map((r) => (
                <li key={r.id} className="bx-card p-3 border-l-4" style={{ borderLeftColor: familyColour(r.family) }} data-testid={`route-card-${r.id}`}>
                  <Link className="font-semibold underline" to={`/routes/${r.id}`}>{r.name}</Link>
                  <div className="mt-1.5 text-sm line-clamp-3"><Prose md={r.what} /></div>
                  <p className="mt-1.5 flex flex-wrap gap-1 text-xs">
                    <span className="bx-chip bg-paper-2 dark:bg-night-2">door: {doorWord(r.door)}</span>
                    <span className="bx-chip bg-paper-2 dark:bg-night-2">funders: {r.funder_kind}</span>
                    <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">{r.programs.length} programme{r.programs.length === 1 ? '' : 's'}</span>
                    <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">{r.gates.length} gate{r.gates.length === 1 ? '' : 's'}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
