import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadFoundationIndex, loadFoundationShard, money, propublicaUrl, toFoundation, type FoundationIndex, type FoundationRow } from '@/lib/opps';

const PAGE = 100;
const utc = (iso: string) => `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/**
 * The foundation directory (KICKOFF §4b /find, second tab): every private foundation in the IRS exempt-organisation
 * master file, with the IRS's own figures, searched in this browser. `top.json` (the 500 largest by assets) loads first;
 * a state's file loads when that state is chosen. Each row links to its ProPublica profile; ProPublica is not called.
 */
export default function FoundationDirectory() {
  const [params, setParams] = useSearchParams();
  const st = params.get('state') ?? '';
  const q = params.get('fq') ?? '';
  const code = params.get('code') ?? '';
  const minAssets = params.get('assets') ?? '';
  const dq = useDeferredValue(q);
  const [idx, setIdx] = useState<FoundationIndex | null | undefined>();
  const [rows, setRows] = useState<FoundationRow[] | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); p.set('tab', 'foundations'); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); setLimit(PAGE); };
  useEffect(() => { let live = true; loadFoundationIndex().then((x) => { if (live) setIdx(x); }); return () => { live = false; }; }, []);
  useEffect(() => {
    if (!idx) return;
    let live = true;
    setRows(null);
    loadFoundationShard(st ? `${st.toLowerCase()}.json` : 'top.json').then((s) => { if (live) setRows(s ? s.rows.map((r) => toFoundation(s.columns, r)) : []); });
    return () => { live = false; };
  }, [idx, st]);
  const shown = useMemo(() => (rows ?? []).filter((r) => (!dq || `${r.name} ${r.city}`.toLowerCase().includes(dq.toLowerCase())) && (!code || r.code === code) && (!minAssets || (r.assets ?? 0) >= Number(minAssets))), [rows, dq, code, minAssets]);

  if (idx === undefined) return <p className="mt-4 bx-muted" role="status">Loading the directory…</p>;
  if (idx === null) return (
    <div className="bx-card p-4 mt-4 border-l-4 border-l-amber-500" data-testid="directory-degraded">
      <p className="font-semibold">This copy of the site has no foundation directory.</p>
      <p className="text-sm mt-1">It is built each night from the IRS exempt-organisation master file; a local build without a harvest has none. The IRS publishes the file at <a className="underline" href="https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf" target="_blank" rel="noreferrer">irs.gov ↗</a>.</p>
    </div>
  );
  const states = Object.keys(idx.by_state).sort();
  return (
    <section className="mt-4" aria-label="The foundation directory" data-testid="foundation-directory">
      <div className="bx-card p-3 text-sm grid gap-1.5">
        <p><strong data-testid="foundation-count">{idx.total.toLocaleString()}</strong> private foundations in the IRS exempt-organisation master file, harvested {utc(idx.harvestedAt)}, with the IRS’s own figures.</p>
        <p className="bx-muted">What it is: every private foundation the IRS lists, operating and non-operating, as the IRS’s documentation of the FOUNDATION column labels them{idx.documentation_url && <> (<a className="underline" href={idx.documentation_url} target="_blank" rel="noreferrer">the IRS’s information sheet ↗</a>)</>}. What it is not: it does not show whether a foundation takes requests — for that, the {''}<Link className="underline" to="/funders#foundations">65 foundations with a record of their own</Link> say how each takes them — and community foundations are public charities, so they are not separable in this file.</p>
        {!idx.codes_from_documentation && <p className="bx-todo !rounded-md !block !py-1">The IRS documentation could not be fetched at harvest time, so rows were kept by their private-foundation filing requirement and codes are shown as raw codes.</p>}
        {idx.missing_states.length > 0 && <p className="text-xs bx-muted">State files not available at harvest: {idx.missing_states.join(', ')}.</p>}
        {idx.efile && <p className="text-xs bx-muted">Last e-filed: the latest 990-PF row in the IRS e-file index for {idx.efile.year} ({idx.efile.matched.toLocaleString()} matched), where the index lists one.</p>}
      </div>
      <div className="bx-card p-3 mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm" role="search" aria-label="Filter foundations">
        <label className="block"><span className="block text-xs bx-muted mb-1">Name or city</span><input className="bx-input" value={q} onChange={(e) => set('fq', e.target.value)} data-testid="directory-q" /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">State</span><select className="bx-input" value={st} onChange={(e) => set('state', e.target.value)} data-testid="directory-state"><option value="">The 500 largest by assets</option>{states.map((s) => <option key={s} value={s}>{s} ({idx.by_state[s].toLocaleString()})</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Category (the IRS’s FOUNDATION code)</span><select className="bx-input" value={code} onChange={(e) => set('code', e.target.value)}><option value="">Any</option>{Object.entries(idx.codes).map(([c, l]) => <option key={c} value={c}>{c} — {l}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Assets at least (US$)</span><input className="bx-input" inputMode="numeric" value={minAssets} onChange={(e) => set('assets', e.target.value.replace(/\D/g, ''))} /></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status" data-testid="directory-status">{rows === null ? 'Loading…' : `${shown.length.toLocaleString()} of ${rows.length.toLocaleString()} ${st ? `in ${st}` : 'in the 500 largest'}`}</p>
      {rows && (
        <div className="overflow-x-auto mt-2">
          <table className="bx-table" data-testid="directory-table">
            <thead><tr><th scope="col">Foundation</th><th scope="col">City, state</th><th scope="col">Category</th><th scope="col">Assets (IRS)</th><th scope="col">Income (IRS)</th><th scope="col">Ruling</th><th scope="col">NTEE</th>{idx.efile && <th scope="col">Last e-filed</th>}</tr></thead>
            <tbody>{shown.slice(0, limit).map((r) => (
              <tr key={r.ein} data-testid="directory-row">
                <td><a className="underline" href={propublicaUrl(r.ein)} target="_blank" rel="noreferrer">{r.name} ↗</a><span className="block text-[11px] bx-muted font-mono">EIN {r.ein}</span></td>
                <td>{r.city}, {r.state}</td><td title={idx.codes[r.code] ?? ''}>{r.code}{idx.codes[r.code] ? ` — ${idx.codes[r.code]}` : ''}</td>
                <td className="tabular-nums whitespace-nowrap">{money(r.assets)}</td><td className="tabular-nums whitespace-nowrap">{money(r.income)}</td><td>{r.ruling}</td><td>{r.ntee}</td>{idx.efile && <td>{r.lastEfile ?? '—'}</td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {shown.length > limit && <p className="mt-3"><button type="button" className="bx-btn" onClick={() => setLimit((l) => l + PAGE * 2)}>Show more ({shown.length - limit} left)</button></p>}
      <p className="mt-3 text-xs bx-muted">Sources: {idx.source_urls.slice(0, 3).map((u) => <a key={u} className="underline mr-2" href={u} target="_blank" rel="noreferrer">{u.replace(/^https?:\/\//, '')}</a>)}{idx.source_urls.length > 3 && `and ${idx.source_urls.length - 3} more state files`}.</p>
    </section>
  );
}
