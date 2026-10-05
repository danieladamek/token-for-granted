import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { familyColour, FAMILY_LABEL, PROGRAM_FAMILIES, STATUS_LABEL, STATUSES } from '@/lib/data';
import { loadProgramsIndex, loadRoutes, useAsync } from '@/lib/heavy';
import { StatusChip } from '@/components/records/Bits';
import { PURPOSE_LABEL, WHO_LABEL } from './Routes';

const PAGE = 60;

/** `/programs` — the full catalogue of programmes with nothing hidden; every filter lives in the URL. */
export default function Programs() {
  const programs = useAsync(loadProgramsIndex);
  const routes = useAsync(loadRoutes);
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) ?? '';
  const family = get('family'), funder = get('funder'), side = get('side'), who = get('who'), purpose = get('purpose'), route = get('route'), aln = get('aln');
  const status = get('status') === 'all' ? '' : get('status');
  const q = get('q');
  const dq = useDeferredValue(q);
  const [limit, setLimit] = useState(PAGE);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); setLimit(PAGE); };
  const funders = useMemo(() => [...new Map((programs ?? []).map((p) => [p.funder, p.funder_name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [programs]);
  const shown = useMemo(() => (programs ?? []).filter((p) =>
    (!family || p.family === family) && (!funder || p.funder === funder) && (!side || p.side === side) && (!status || p.status === status) &&
    (!who || p.who.includes(who)) && (!purpose || p.purpose.includes(purpose)) && (!route || p.routes.includes(route)) &&
    (!aln || p.als.some((a) => a.startsWith(aln))) &&
    (!dq || `${p.name} ${p.what} ${p.mechanism_code ?? ''}`.toLowerCase().includes(dq.toLowerCase())),
  ), [programs, family, funder, side, status, who, purpose, route, aln, dq]);
  const routeName = routes?.find((r) => r.id === route)?.name;
  const filtered = family || funder || side || status || who || purpose || route || aln || q;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Programmes</h1>
      <p className="bx-prose mt-2 max-w-3xl">Every programme the guide records, federal and foundation, whatever its status. Each shows its status with the date it was read; a status is a reading on one day. {routeName && <>Filtered to the route <Link className="underline" to={`/routes/${route}`}>{routeName}</Link>, every status included.</>}</p>
      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm" role="search" aria-label="Filter programmes">
        <label className="block"><span className="block text-xs bx-muted mb-1">Search name and description</span><input className="bx-input" value={q} onChange={(e) => set('q', e.target.value)} data-testid="programs-q" /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Status</span><select className="bx-input" value={status} onChange={(e) => set('status', e.target.value)} data-testid="programs-status"><option value="">Every status</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Family</span><select className="bx-input" value={family} onChange={(e) => set('family', e.target.value)}><option value="">All families</option>{PROGRAM_FAMILIES.map((f) => <option key={f} value={f}>{FAMILY_LABEL[f]}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Funder side</span><select className="bx-input" value={side} onChange={(e) => set('side', e.target.value)}><option value="">Both</option><option value="federal">Federal and congressionally created</option><option value="foundation">Foundations and other private grantmakers</option></select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Funder</span><select className="bx-input" value={funder} onChange={(e) => set('funder', e.target.value)}><option value="">Any funder</option>{funders.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Who</span><select className="bx-input" value={who} onChange={(e) => set('who', e.target.value)}><option value="">Anyone</option>{Object.entries(WHO_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">What the money is for</span><select className="bx-input" value={purpose} onChange={(e) => set('purpose', e.target.value)}><option value="">Anything</option>{Object.entries(PURPOSE_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Route</span><select className="bx-input" value={route} onChange={(e) => set('route', e.target.value)}><option value="">Any route</option>{(routes ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Assistance Listing (number or prefix)</span><input className="bx-input font-mono" value={aln} onChange={(e) => set('aln', e.target.value.trim())} placeholder="93.859" /></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status" data-testid="programs-count">{programs ? `${shown.length} of ${programs.length} programmes` : 'Loading…'}{filtered && <> · <button type="button" className="underline" onClick={() => setParams({}, { replace: true })}>clear filters</button></>}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.slice(0, limit).map((p) => (
          <li key={p.id} className="bx-card p-3 border-l-4 text-sm" style={{ borderLeftColor: familyColour(p.family) }} data-testid="program-card">
            <Link className="font-semibold underline" to={`/programs/${p.id}`}>{p.name}</Link>
            <p className="mt-1"><StatusChip status={p.status} date={p.status_date} /></p>
            <p className="text-xs bx-muted mt-1">{FAMILY_LABEL[p.family]} · {p.funder_name}{p.als.length ? ` · ${p.als.slice(0, 3).join(', ')}${p.als.length > 3 ? '…' : ''}` : ''}</p>
          </li>
        ))}
      </ul>
      {shown.length > limit && <p className="mt-4"><button type="button" className="bx-btn" onClick={() => setLimit((l) => l + PAGE * 2)}>Show more ({shown.length - limit} left)</button></p>}
    </div>
  );
}
