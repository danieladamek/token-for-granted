import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type MiniSearch from 'minisearch';
import savedJson from '@/data/saved-searches.json';
import { findHref } from '@/lib/find-link';
import { byDate, ELIG_GROUPS, hayOf, matches, stateFromParams } from '@/lib/find';
import { loadHarvestManifest, loadOppIndex, loadOppShard, loadRecent, money, toOpp, type HarvestManifest, type Opp, type OppIndex, type RecentNotice } from '@/lib/opps';
import type { FindFilter } from '@/types';
import FoundationDirectory from '@/components/find/FoundationDirectory';

const GRANTS_SEARCH = 'https://www.grants.gov/search-grants';
const saved = savedJson as unknown as { routes: { id: string; name: string; family: string; find_filter: FindFilter }[]; programs: { id: string; name: string; assistance_listings: string[] }[] };
const PAGE = 50;
const utc = (iso: string) => `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

function Recent({ name, title }: { name: 'federal-register' | 'nsf-rss'; title: string }) {
  const [d, setD] = useState<{ harvestedAt: string; source: string; items: RecentNotice[] } | null | undefined>();
  useEffect(() => { let live = true; loadRecent(name).then((x) => { if (live) setD(x); }); return () => { live = false; }; }, [name]);
  if (d === undefined) return null;
  return (
    <section className="bx-card p-3 text-sm" aria-label={title} data-testid={`recent-${name}`}>
      <h3 className="font-semibold">{title}</h3>
      {d === null ? <p className="text-xs bx-muted mt-1">Not in this build’s harvest.</p> : (
        <>
          <p className="text-xs bx-muted">From {d.source}, harvested {utc(d.harvestedAt)}; each links out.</p>
          <ul className="mt-2 grid gap-1">{d.items.slice(0, 12).map((it, i) => <li key={i}><a className="underline" href={it.url} target="_blank" rel="noreferrer">{it.title} ↗</a> <span className="text-xs bx-muted">{it.date}{it.agencies?.length ? ` · ${it.agencies.join(', ')}` : ''}</span></li>)}</ul>
        </>
      )}
    </section>
  );
}

/**
 * `/find` — the opportunity search (KICKOFF §4b). Client-side over this site's own nightly copy of the public
 * Grants.gov daily extract (public/data/opportunities/). Every result links out to its Grants.gov page; nothing is
 * proxied. With no harvest present it says so and gives the Grants.gov search link; it never errors. The second tab is
 * the foundation directory, built from the IRS exempt-organisation master file.
 */
export default function Find() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'foundations' ? 'foundations' : 'notices';
  const [man, setMan] = useState<HarvestManifest | null | undefined>();
  const [idx, setIdx] = useState<OppIndex | null | undefined>();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [ms, setMs] = useState<MiniSearch<Opp> | null>(null);
  const [shown, setShown] = useState(PAGE);
  const state = stateFromParams(params);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); if (!['saved', 'label', 'program', 'tab'].includes(k)) { p.delete('saved'); p.delete('label'); p.delete('program'); } setParams(p, { replace: true }); };
  const label = params.get('label');

  useEffect(() => {
    let live = true;
    (async () => {
      const [m, i] = await Promise.all([loadHarvestManifest(), loadOppIndex()]);
      if (!live) return;
      setMan(m); setIdx(i);
      if (!i) return;
      const files = [...new Set(i.agencies.flatMap((a) => a.shards))];
      setProgress({ done: 0, total: files.length });
      await Promise.all(files.map((f) => loadOppShard(f).then((s) => {
        if (!live || !s) return;
        const rows = s.rows.map((r) => toOpp(s.columns, r));
        setOpps((o) => o.concat(rows));
      }).finally(() => { if (live) setProgress((p) => ({ ...p, done: p.done + 1 })); })));
    })();
    return () => { live = false; };
  }, []);

  const loading = idx === undefined || (!!idx && progress.done < progress.total);
  const building = useRef(false);
  useEffect(() => {
    if (loading || !idx || building.current || !opps.length) return;
    building.current = true;
    void import('minisearch').then(({ default: MS }) => {
      const m = new MS<Opp>({ idField: 'id', fields: ['title', 'agency', 'topAgency', 'number', 'excerpt'], storeFields: [], searchOptions: { prefix: true, combineWith: 'AND', boost: { title: 2 } } });
      return m.addAllAsync(opps, { chunkSize: 400 }).then(() => setMs(m));
    });
  }, [loading, idx, opps]);

  const hays = useMemo(() => new Map(opps.map((o) => [o.id, hayOf(o)])), [opps]);
  const dq = useDeferredValue(state.q);
  const today = (idx?.harvestedAt ?? new Date().toISOString()).slice(0, 10);
  const results = useMemo(() => {
    let base = opps;
    let order: Map<string, number> | null = null;
    if (dq.trim() && ms) { const hits = ms.search(dq); order = new Map(hits.map((h, i) => [String(h.id), i])); base = opps.filter((o) => order!.has(o.id)); }
    const f = { ...state, q: ms ? '' : dq };
    const out = base.filter((o) => matches(o, f, today, hays.get(o.id)));
    out.sort(order ? (a, b) => order!.get(a.id)! - order!.get(b.id)! : byDate);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opps, ms, dq, params, hays, today]);
  useEffect(() => { setShown(PAGE); }, [params]);

  const typeLabels = idx?.labels.applicant_types ?? {};
  const instrLabels = idx?.labels.instruments ?? {};
  const eligCodes = Object.keys(idx?.counts.by_applicant_type ?? {}).sort();
  const groupOn = (codes: string[]) => codes.length === state.elig.length && codes.every((c) => state.elig.includes(c));
  const stale = man?.failures ?? [];
  const cc = idx?.cross_check;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Find opportunities</h1>
      <div className="mt-3 flex gap-1 text-sm" role="tablist" aria-label="What to search">
        <button type="button" role="tab" aria-selected={tab === 'notices'} className={`bx-btn ${tab === 'notices' ? 'bx-btn-on' : ''}`} onClick={() => { const p = new URLSearchParams(params); p.delete('tab'); setParams(p, { replace: true }); }} data-testid="tab-notices">Federal notices</button>
        <button type="button" role="tab" aria-selected={tab === 'foundations'} className={`bx-btn ${tab === 'foundations' ? 'bx-btn-on' : ''}`} onClick={() => setParams({ tab: 'foundations' }, { replace: true })} data-testid="tab-foundations">The foundation directory</button>
      </div>

      <div className="bx-card p-3 mt-3 text-sm grid gap-1.5" data-testid="find-about">
        <p className="bx-muted">NIH has posted its opportunities on Grants.gov only since fiscal year 2026 (see <Link className="underline" to="/funders/nih">NIH</Link>); NSF also posts on its own site (see <Link className="underline" to="/funders/nsf">NSF</Link>). No public feed of foundation calls exists, which is why the foundation side is a directory. This page fetches only this site’s own files; searches run in this browser and nothing is sent anywhere.</p>
        <div className="grid gap-1.5 min-h-[5.5rem]">
        {idx === undefined && <p className="bx-muted" role="status">Loading this site’s copy of the public data…</p>}
        {idx && (
          <p>Searching this site’s own copy of the public Grants.gov daily extract (<span className="font-mono text-xs">{idx.extract.file}</span>), harvested <strong data-testid="harvest-date">{utc(idx.harvestedAt)}</strong>:{' '}
            <strong data-testid="count-posted">{idx.counts.posted.toLocaleString()}</strong> posted and <strong data-testid="count-forecast">{idx.counts.forecast.toLocaleString()}</strong> forecast notices. Notices are up to a day old.</p>
        )}
        {idx && <p className="text-xs bx-muted">Kept from the extract: {idx.rule}</p>}
        {stale.length > 0 && <p className="bx-todo !rounded-md !block !py-1" data-testid="stale-feed">The last harvest failed for {stale.map((f) => `${f.source} (${f.status ?? 'no response'}: ${f.message})`).join('; ')}. Data from {stale.length === 1 ? 'that feed' : 'those feeds'} may be stale or missing.</p>}
        {cc && cc.over_5pct.length > 0 && <p className="bx-todo !rounded-md !block !py-1" data-testid="cross-check">The Grants.gov search API counted differently from the extract by more than 5 percent for {cc.over_5pct.join(', ')} ({cc.note}).</p>}
        </div>
      </div>

      {tab === 'foundations' ? <FoundationDirectory /> : (
        <>
          {idx === null && (
            <div className="bx-card p-4 mt-4 border-l-4 border-l-amber-500" data-testid="find-degraded">
              <p className="font-semibold">This copy of the site has no harvested opportunity data.</p>
              <p className="text-sm mt-1">The data is built into the published site each night; a local build without a harvest has none. Grants.gov’s own search is here: <a className="underline" href={GRANTS_SEARCH} target="_blank" rel="noreferrer">Grants.gov search ↗</a></p>
            </div>
          )}
          {idx === undefined && <div className="min-h-[90vh]" aria-hidden="true" />}
          {idx && (
            <>
              <section className="mt-4" aria-labelledby="saved-h">
                <h2 id="saved-h" className="text-lg">Saved filters</h2>
                <p className="text-xs bx-muted">Every route’s saved filter from the pack. A programme page opens this search on its own Assistance Listings.</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
                  {saved.routes.map((r) => <Link key={r.id} className={`bx-btn !py-0.5 ${params.get('saved') === r.id ? 'bx-btn-on' : ''}`} to={findHref(r.find_filter, r.name, r.id)} data-testid={`saved-${r.id}`}>{r.name.length > 56 ? `${r.name.slice(0, 54)}…` : r.name}</Link>)}
                </div>
              </section>

              <div className="bx-card p-3 mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm" role="search" aria-label="Filter opportunities">
                <label className="block lg:col-span-2"><span className="block text-xs bx-muted mb-1">Keyword (title, agency, description excerpt)</span>
                  <input className="bx-input" type="search" value={state.q} onChange={(e) => set('q', e.target.value)} data-testid="find-q" /></label>
                <label className="block"><span className="block text-xs bx-muted mb-1">Status</span>
                  <select className="bx-input" value={state.status} onChange={(e) => set('status', e.target.value)} data-testid="find-status-filter"><option value="">Posted and forecast</option><option value="posted">Posted</option><option value="forecast">Forecast</option></select></label>
                <label className="block"><span className="block text-xs bx-muted mb-1">Agency</span>
                  <select className="bx-input" value={state.agency} onChange={(e) => set('agency', e.target.value)} data-testid="find-agency"><option value="">Any agency</option>{idx.agencies.map((a) => <option key={a.code} value={a.code}>{a.name} ({a.posted + a.forecast})</option>)}</select></label>
                <fieldset className="lg:col-span-4">
                  <legend className="text-xs bx-muted mb-1">Who may apply (the extract’s applicant-type codes, any of)</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {ELIG_GROUPS.map((g) => <button key={g.id} type="button" className={`bx-btn !py-0.5 ${groupOn(g.codes) ? 'bx-btn-on' : ''}`} aria-pressed={groupOn(g.codes)} onClick={() => set('elig', groupOn(g.codes) ? '' : g.codes.join('|'))} data-testid={`elig-group-${g.id}`}>{g.label}</button>)}
                  </div>
                  <select className="bx-input mt-2" value={state.elig.length === 1 ? state.elig[0] : ''} onChange={(e) => set('elig', e.target.value)} aria-label="One applicant type" data-testid="find-elig">
                    <option value="">{state.elig.length > 1 ? `Codes ${state.elig.join(', ')}` : 'Or one applicant type…'}</option>
                    {eligCodes.map((c) => <option key={c} value={c}>{c} — {typeLabels[c] ?? 'label not in the harvest'} ({idx.counts.by_applicant_type[c]})</option>)}
                  </select>
                </fieldset>
                <label className="block"><span className="block text-xs bx-muted mb-1">Funding instrument</span>
                  <select className="bx-input" value={state.instrument} onChange={(e) => set('instrument', e.target.value)}><option value="">Any</option>{Object.entries(instrLabels).map(([c, l]) => <option key={c} value={c}>{c} — {l}</option>)}</select></label>
                <label className="block"><span className="block text-xs bx-muted mb-1">Assistance Listing (any of, | between)</span>
                  <input className="bx-input font-mono" value={state.aln.join('|')} onChange={(e) => set('aln', e.target.value.replace(/[^\d.|]/g, ''))} placeholder="93.859" data-testid="find-aln" /></label>
                <label className="block"><span className="block text-xs bx-muted mb-1">Closes within</span>
                  <select className="bx-input" value={state.closeWithin} onChange={(e) => set('close', e.target.value)}><option value="">Any time</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
                <label className="block"><span className="block text-xs bx-muted mb-1">Forecast: estimated post within</span>
                  <select className="bx-input" value={state.estPostWithin} onChange={(e) => set('estpost', e.target.value)}><option value="">Any time</option><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option></select></label>
                <label className="block"><span className="block text-xs bx-muted mb-1">Award ceiling at least (US$)</span>
                  <input className="bx-input" inputMode="numeric" value={state.ceilingMin} onChange={(e) => set('ceiling', e.target.value.replace(/\D/g, ''))} /></label>
              </div>

              <p className="mt-3 text-sm bx-muted" role="status" aria-live="polite" data-testid="find-status">
                {loading ? `Loading the harvest… ${progress.done} of ${progress.total || '…'} files` : `${results.length.toLocaleString()} result${results.length === 1 ? '' : 's'}`}
                {label && <> · saved filter: <strong data-testid="saved-label">{label}</strong>{state.any.length > 0 && <> (any of: {state.any.map((a) => `“${a}”`).join(', ')})</>}</>}
                {[...params.keys()].length > 0 && <> · <button type="button" className="underline" onClick={() => setParams({}, { replace: true })}>clear all filters</button></>}
              </p>

              <ol className="mt-3 grid gap-2" data-testid="find-results">
                {results.slice(0, shown).map((o) => (
                  <li key={o.id} className="bx-card p-3 text-sm" data-testid="find-result" data-status={o.status}>
                    <a className="font-semibold underline" href={o.link} target="_blank" rel="noreferrer">{o.title} ↗</a>
                    <p className="text-xs bx-muted mt-0.5">{o.number} · {o.agency}{o.topAgency && o.agency !== o.topAgency ? ` (${o.topAgency})` : ''}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                      {o.status === 'forecast'
                        ? <><span className="bx-chip border border-dashed border-[color:var(--bx-line)] font-semibold" data-testid="forecast-chip">forecast</span><span className="bx-muted">estimated post {o.estPostDate || 'not given'} · estimated due {o.estDueDate || 'not given'}</span></>
                        : <><span className="bx-chip border border-[color:var(--bx-line)]">posted {o.postDate}</span><span className="bx-muted">{o.closeDate ? `closes ${o.closeDate}` : 'no close date in the extract'}</span></>}
                      {o.ceiling ? <span className="bx-muted">· ceiling {money(o.ceiling)}</span> : null}
                      {o.als.length > 0 && <span className="bx-muted">· AL {o.als.join(', ')}</span>}
                    </p>
                    <p className="mt-1 text-xs"><span className="bx-muted">Who may apply: </span>{o.applicantTypes.map((c) => typeLabels[c] ? `${typeLabels[c]} (${c})` : c).join('; ') || 'not coded'}</p>
                    {o.excerpt && <p className="mt-1 text-xs bx-muted line-clamp-2">{o.excerpt}</p>}
                  </li>
                ))}
              </ol>
              {results.length > shown && <p className="mt-3"><button type="button" className="bx-btn" onClick={() => setShown((s) => s + PAGE)}>Show {Math.min(PAGE, results.length - shown)} more</button></p>}
            </>
          )}
          <h2 className="text-lg mt-8">Recently published</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <Recent name="federal-register" title="Federal Register: notices of funding opportunity" />
            <Recent name="nsf-rss" title="NSF funding announcements (RSS)" />
          </div>
        </>
      )}
    </div>
  );
}
