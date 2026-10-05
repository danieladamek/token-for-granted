import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import statusWordsJson from '@/data/status-words.json';
import { loadProgram, loadRoutes, useAsync } from '@/lib/heavy';
import type { Program } from '@/types';
import { STATUS_LABEL } from '@/lib/data';
import { recordMeta } from '@/lib/records';
import { alnHref, fundedHref } from '@/lib/find-link';
import { loadByAln, loadHarvestManifest, loadOppIndex, toOpp, type Opp } from '@/lib/opps';
import Prose from '@/components/records/Prose';
import FieldView, { humanise } from '@/components/records/FieldView';
import { AsOf, BlockLabel, Conflicts, FamilyChip, Field, PendingChanges, RecordHeader, RecordLinks, Sources, Variants } from '@/components/records/Bits';
import Term from '@/components/reader/Term';
import NotFound from './NotFound';
import { PURPOSE_LABEL, STAGE_LABEL, WHO_LABEL } from './Routes';

export const STATUS_WORDS = statusWordsJson as Record<string, { text: string; term: string | null }>;

/** The order a programme's fields render in; any key not named here renders after, never dropped. */
const ORDER: [string, string][] = [
  ['what', 'What it is'], ['funds', 'Funds'], ['mechanism_code', 'Mechanism or programme number'],
  ['applicant', 'Who submits the application'], ['applicant_note', 'Applicant note'], ['eligibility_note', 'Eligibility note'],
  ['citizenship', 'Citizenship'], ['career_window', 'Career window'], ['stipend', 'Stipend'], ['obligation', 'Obligation'],
  ['route', 'Route of the money'], ['pass_through_via', 'Whom a non-profit applies to'], ['match', 'Match'], ['service_area', 'Service area'], ['reporting', 'Reporting'],
  ['cycle', 'Cycle'], ['awards', 'Awards, exactly as stated'], ['success', 'Success rates, as published'],
  ['indirect_costs', 'Indirect costs'], ['cost_sharing', 'Cost sharing'], ['budget_rules', 'Budget rules'], ['review', 'Review'],
  ['steps', 'Steps'], ['portal', 'Portal'], ['distinctive', 'As the funder frames it'],
];
const SKIP = new Set(['id', 'name', 'family', 'kind', 'funder', 'funder_kind', 'owner', 'status', 'status_as_of', 'status_note', 'next_date', 'status_change',
  'status_date', 'side', 'assistance_listings', 'who_may_apply', 'gates', 'who', 'purpose', 'stage', 'fields', 'on_routes', 'standing_opening', 'pending_changes',
  'conflicts', 'variants', 'official_url', 'as_of', 'sources', 'sweep', 'changes_affecting', 'consolidation_notes', ...ORDER.map(([k]) => k)]);

/** The status banner (KICKOFF §4b): label, date read, note, next date, and the status pass's own sentence. */
export function StatusBanner({ p }: { p: Program }) {
  const words = STATUS_WORDS[p.status];
  const warn = p.status === 'unconfirmed' || p.status === 'no-current-notice';
  return (
    <div className={`bx-card mt-4 p-3 text-sm border-l-4 ${warn ? 'border-l-amber-500' : 'border-l-[color:var(--bx-accent)]'}`} role="note" data-testid="status-banner" data-status={p.status}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-base" data-testid="status-label">{STATUS_LABEL[p.status] ?? p.status}</span>
        <span data-testid="status-date">read {p.status_date}</span>
      </p>
      {words && <p className="mt-1 bx-muted" data-testid="status-words">In this guide’s words, {STATUS_LABEL[p.status]} means: {words.text}{words.text.endsWith('.') ? '' : '.'} {words.term && <Term id={words.term}>Glossary</Term>}</p>}
      {p.status_note && <div className="mt-1.5"><Prose md={p.status_note} /></div>}
      {p.next_date && <p className="mt-1"><span className="font-semibold">Next date given on the page: </span>{p.next_date}</p>}
      {p.status_change && <div className="mt-2 border-l-2 border-[color:var(--bx-line)] pl-2"><p className="text-xs font-semibold bx-muted uppercase tracking-[0.12em]">On the day of the status pass</p><Prose md={p.status_change} /></div>}
      <p className="mt-1.5 text-xs bx-muted">A status is a reading on one day; it is not a statement that the programme is open now.</p>
    </div>
  );
}

/** "On Grants.gov, harvested <date>": the posted and forecast notices under the programme's Assistance Listings. */
function HarvestBlock({ p }: { p: Program }) {
  const [state, setState] = useState<{ at: string | null; opps: Opp[] } | null | undefined>();
  useEffect(() => {
    let live = true;
    (async () => {
      const [idx, man] = await Promise.all([loadOppIndex(), loadHarvestManifest()]);
      if (!idx) { if (live) setState(null); return; }
      const prefixes = [...new Set(p.assistance_listings.map((a) => a.split('.')[0]))];
      const parts = await Promise.all(prefixes.map((x) => loadByAln(x)));
      const seen = new Map<string, Opp>();
      for (const part of parts) if (part) for (const a of p.assistance_listings) for (const row of part.listings[a] ?? []) { const o = toOpp(part.columns, row); seen.set(o.id, o); }
      if (live) setState({ at: idx.harvestedAt ?? man?.harvestedAt ?? null, opps: [...seen.values()].sort((a, b) => (a.status === b.status ? a.title.localeCompare(b.title) : a.status === 'posted' ? -1 : 1)) });
    })();
    return () => { live = false; };
  }, [p]);
  return (
    <section aria-label="On Grants.gov" data-testid="harvest-block">
      <BlockLabel>On Grants.gov{state?.at ? `, harvested ${state.at.slice(0, 16).replace('T', ' ')} UTC` : ''}</BlockLabel>
      <div className="bx-card p-3 text-sm">
        <p className="text-xs bx-muted">An Assistance Listing can cover several programmes, and this list is a search result over this site’s copy of the Grants.gov extract under {p.assistance_listings.join(', ')} — it is not the programme’s status, which is the guide’s reading above.</p>
        {state === undefined && <p className="mt-2 bx-muted" role="status">Loading…</p>}
        {state === null && <p className="mt-2" data-testid="harvest-missing">This build carries no harvest of Grants.gov notices. Grants.gov’s own search is at <a className="underline" href="https://www.grants.gov/search-grants" target="_blank" rel="noreferrer">grants.gov/search-grants ↗</a>.</p>}
        {state && state.opps.length === 0 && <p className="mt-2">No posted or forecast notice under these listings in the harvest.</p>}
        {state && state.opps.length > 0 && (
          <ul className="mt-2 grid gap-1.5">
            {state.opps.slice(0, 40).map((o) => (
              <li key={o.id} data-testid="harvest-notice">
                <a className="underline font-semibold" href={o.link} target="_blank" rel="noreferrer">{o.number} · {o.title} ↗</a>
                <span className="block text-xs bx-muted">{o.status === 'forecast' ? `forecast · estimated post ${o.estPostDate || 'not given'} · estimated due ${o.estDueDate || 'not given'}` : `posted ${o.postDate}${o.closeDate ? ` · closes ${o.closeDate}` : ' · no close date in the extract'}`} · {o.agency}</span>
              </li>
            ))}
            {state.opps.length > 40 && <li className="text-xs"><Link className="underline" to={alnHref(p.assistance_listings, p.name, p.id)}>All {state.opps.length} in the opportunity search →</Link></li>}
          </ul>
        )}
        <p className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className="bx-btn !py-0.5" to={alnHref(p.assistance_listings, p.name, p.id)} data-testid="program-find">Search these listings in /find</Link>
          {p.assistance_listings.slice(0, 6).map((a) => <Link key={a} className="bx-btn !py-0.5" to={fundedHref(a, p.name, p.funder.startsWith('nih') && typeof p.mechanism_code === 'string' ? p.mechanism_code : undefined)} data-testid="program-funded">Who has won under {a} →</Link>)}
        </p>
      </div>
    </section>
  );
}

/** `/programs/:id` — the status banner first, then every field the record carries in a fixed order. */
export default function ProgramPage() {
  const { id } = useParams();
  const [p, setP] = useState<Program | null | undefined>();
  useEffect(() => { let live = true; setP(undefined); if (id) loadProgram(id).then((x) => { if (live) setP(x); }); return () => { live = false; }; }, [id]);
  const routes = useAsync(loadRoutes);
  useEffect(() => { if (p) document.title = `${p.name} · Token for Granted`; return () => { document.title = 'Token for Granted'; }; }, [p]);
  const extra = useMemo(() => (p ? Object.entries(p).filter(([k]) => !SKIP.has(k)) : []), [p]);
  if (p === undefined) return <div className="mx-auto max-w-3xl px-4 py-12 bx-muted" role="status">Loading…</div>;
  if (!p) return <NotFound />;
  const w = p.who_may_apply as { applicant_types?: string[]; standing?: string[]; [k: string]: unknown } | null | undefined;
  const funder = recordMeta('funders', p.funder);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8" data-testid="program-page">
      <p className="text-sm"><Link className="underline" to="/programs">Programmes</Link></p>
      <div className="mt-2">
        <RecordHeader title={p.name} anchor={{ type: 'programs', id: p.id }}>
          <FamilyChip family={p.family} /><span className="bx-chip bg-paper-2 dark:bg-night-2">{p.kind}</span>
          <span className="bx-chip bg-paper-2 dark:bg-night-2">{p.side === 'foundation' ? 'foundation side' : 'federal side'}</span><AsOf date={p.as_of} />
        </RecordHeader>
      </div>
      <StatusBanner p={p} />
      <p className="mt-3 text-sm"><span className="font-semibold">Funder: </span>{funder ? <Link className="underline" to={funder.to}>{funder.title}</Link> : <span className="bx-todo">{p.funder} — not a funder in the pack</span>}{p.owner ? <span className="bx-muted"> · {String(p.owner)}</span> : null}</p>

      {ORDER.map(([k, label]) => {
        const v = p[k];
        if (k === 'what') return <div key={k}><BlockLabel>{label}</BlockLabel><div className="bx-reader !text-[16px] !leading-7"><Prose md={String(v ?? '')} /></div></div>;
        if (k === 'funds') return v ? <Field key={k} label={label} value={Array.isArray(v) ? v.join(', ') : v} /> : null;
        if (k === 'steps') return <Field key={k} label={label} value={v} ordered />;
        return <Field key={k} label={label} value={v} name={k} />;
      })}

      {p.assistance_listings.length > 0 && (<><BlockLabel>Assistance Listings</BlockLabel><p className="flex flex-wrap gap-1.5 text-sm">{p.assistance_listings.map((a) => <span key={a} className="bx-chip bg-paper-2 dark:bg-night-2 font-mono">{a}</span>)}</p></>)}
      {w && (
        <section aria-label="Who may apply" data-testid="who-may-apply">
          <BlockLabel>Who may apply</BlockLabel>
          <div className="bx-card p-3 text-sm grid gap-2">
            {w.applicant_types?.length ? <p><span className="font-semibold">Applicant types: </span>{w.applicant_types.join(', ')}</p> : null}
            {w.standing?.length ? <p><span className="font-semibold">Standing: </span><RecordLinks type="standing" ids={w.standing} /></p> : null}
            {Object.entries(w).filter(([k]) => k !== 'applicant_types' && k !== 'standing').map(([k, v]) => <div key={k}><p className="text-xs font-semibold bx-muted">{humanise(k)}</p><FieldView value={v} name={k} /></div>)}
          </div>
        </section>
      )}
      {p.gates.length > 0 && (<><BlockLabel>Gates</BlockLabel><RecordLinks type="gates" ids={p.gates} /></>)}
      {p.standing_opening.length > 0 && (<><BlockLabel>Standing that opens it</BlockLabel><RecordLinks type="standing" ids={p.standing_opening} /></>)}
      {p.assistance_listings.length > 0 && <HarvestBlock p={p} />}
      <Conflicts items={p.conflicts} />
      <PendingChanges items={p.pending_changes} />
      {p.on_routes.length > 0 && (<><BlockLabel>Routes this programme is on</BlockLabel><p className="flex flex-wrap gap-1.5">{p.on_routes.map((rid) => <Link key={rid} className="bx-chip border border-[color:var(--bx-line)] hover:underline" to={`/routes/${rid}`}>{routes?.find((x) => x.id === rid)?.name ?? rid}</Link>)}</p></>)}
      {p.changes_affecting.length > 0 && (<><BlockLabel>In the dated ledger</BlockLabel><RecordLinks type="changes" ids={p.changes_affecting} /></>)}
      <BlockLabel>Tags</BlockLabel>
      <p className="flex flex-wrap gap-1 text-xs">
        {p.who.map((t) => <span key={t} className="bx-chip bg-paper-2 dark:bg-night-2">{WHO_LABEL[t] ?? t}</span>)}
        {p.purpose.map((t) => <span key={t} className="bx-chip bg-paper-2 dark:bg-night-2">{PURPOSE_LABEL[t] ?? t}</span>)}
        {p.stage.map((t) => <span key={t} className="bx-chip border border-[color:var(--bx-line)] bx-muted">{STAGE_LABEL[t] ?? t}</span>)}
        {Array.isArray(p.fields) && (p.fields as string[]).map((t) => <span key={t} className="bx-chip border border-dashed border-[color:var(--bx-line)] bx-muted">{t}</span>)}
      </p>
      {extra.map(([k, v]) => <Field key={k} label={humanise(k)} value={v} name={k} />)}
      {p.official_url && <p className="mt-6 text-sm"><span className="font-semibold">Official page: </span><a className="underline break-all" href={p.official_url} target="_blank" rel="noreferrer">{p.official_url} ↗</a></p>}
      <Sources ns={p.sources} />
      <Variants items={p.variants} />
      {Array.isArray(p.consolidation_notes) && (p.consolidation_notes as string[]).length > 0 && <Field label="Consolidation notes (how the pack was assembled)" value={p.consolidation_notes} />}
      <p className="mt-6 text-sm bx-muted">This record is as of {p.as_of}; its status was read {p.status_date}. It states what the official pages say; it is not advice.</p>
    </article>
  );
}
