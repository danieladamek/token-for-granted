import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadFunders, loadProgramsIndex, useAsync } from '@/lib/heavy';
import type { Funder, ProgramMeta } from '@/types';
import { STATUS_LABEL, STATUSES } from '@/lib/data';
import { propublicaUrl } from '@/lib/opps';
import Prose from '@/components/records/Prose';
import CiteList from '@/components/records/CiteList';
import FieldView, { humanise } from '@/components/records/FieldView';
import { AsOf, BlockLabel, Conflicts, Field, PendingChanges, RecordHeader, RecordLinks, Sources, StatusChip, Variants } from '@/components/records/Bits';
import NotFound from './NotFound';

const FEDERAL: [string, string][] = [
  ['what', 'What it is'], ['how_it_decides', 'How it decides'], ['cycle', 'Cycle'], ['where_it_posts', 'Where it posts'], ['who_to_talk_to', 'Whom to talk to'],
  ['funding_rates', 'Funding rates, as published'], ['funding_rates_note', 'Funding rates note'], ['governing_terms', 'Governing terms'], ['policy_guide_note', 'Policy guide note'],
];
const FOUNDATION: [string, string][] = [
  ['what', 'What it is'], ['what_it_funds', 'What it funds, in its own words'], ['who_it_funds', 'Who it funds'], ['how_to_approach', 'How to approach it'], ['cycle', 'Cycle'],
  ['typical_grant', 'Typical grant'], ['indirect_costs', 'Indirect costs'], ['geography', 'Geography'], ['legal_form', 'Legal form'], ['legal_form_note', 'Legal form note'],
  ['giving_form', 'Form of giving'], ['filing_part_xiv', 'Form 990-PF, Part XIV'], ['scope_note', 'Scope note'], ['trust_note', 'Trust note'], ['financials_note', 'Financials note'],
];
const SKIP = new Set(['id', 'name', 'funder_kind', 'foundation_kind', 'parent', 'programs', 'programs_all', 'routes', 'side', 'unsolicited', 'unsolicited_note', 'ein',
  'budget', 'policy_guide', 'giving', 'assets', 'assets_further', 'assets_filing', 'assets_second_entity', 'grants_database_url', 'grants_database_note', 'fields',
  'pending_changes', 'conflicts', 'variants', 'official_url', 'as_of', 'sources', 'sweep', 'changes_affecting', ...FEDERAL.map(([k]) => k), ...FOUNDATION.map(([k]) => k)]);

interface Money { amount?: string; fiscal_year?: number; year?: number; status?: string; basis?: string; note?: string; cite?: number[] }

/** Budget lines: a request is labelled as a request (KICKOFF §4b); every status is shown as the record writes it. */
function Budget({ items }: { items: Money[] }) {
  if (!items?.length) return null;
  return (
    <section aria-label="Budget" data-testid="budget">
      <BlockLabel>Budget lines, as published</BlockLabel>
      <ul className="grid gap-1.5 text-sm">
        {items.map((b, i) => {
          const request = /request/i.test(b.status ?? '');
          return (
            <li key={i} className="border-l-2 border-[color:var(--bx-line)] pl-2">
              <span className="font-semibold tabular-nums">{b.amount}</span> <span className="bx-muted">FY {b.fiscal_year}</span>{' '}
              {request ? <span className="bx-chip border border-dashed border-[color:var(--bx-line)]" data-testid="budget-request">a request{b.status && b.status !== 'requested' ? ` — ${b.status}` : ''}</span> : b.status ? <span className="bx-chip bg-paper-2 dark:bg-night-2">{b.status}</span> : <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">status not recorded</span>}
              {b.note && <span className="block text-xs bx-muted"><Prose md={b.note} /></span>}
              {b.cite && <CiteList ns={b.cite} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Giving and assets with their years and bases, as recorded. */
function Giving({ f }: { f: Funder }) {
  const giving = (f.giving as Money[] | undefined) ?? [];
  const assets = [f.assets, ...((f.assets_further as Money[] | undefined) ?? []), f.assets_filing, f.assets_second_entity].filter(Boolean) as Money[];
  if (!giving.length && !assets.length) return null;
  return (
    <section aria-label="Giving and assets" data-testid="giving">
      <BlockLabel>Giving and assets, with their years and bases</BlockLabel>
      <div className="overflow-x-auto"><table className="bx-table">
        <thead><tr><th scope="col">What</th><th scope="col">Amount</th><th scope="col">Year</th><th scope="col">Basis</th><th scope="col">Sources</th></tr></thead>
        <tbody>
          {giving.map((g, i) => <tr key={`g${i}`}><td>giving</td><td className="tabular-nums whitespace-nowrap">{g.amount}</td><td>{g.year}</td><td>{g.basis ?? '—'}</td><td>{g.cite ? <CiteList ns={g.cite} /> : '—'}</td></tr>)}
          {assets.map((a, i) => <tr key={`a${i}`}><td>assets</td><td className="tabular-nums whitespace-nowrap">{a.amount}</td><td>{a.year}</td><td>{a.basis ?? '—'}</td><td>{a.cite ? <CiteList ns={a.cite} /> : '—'}</td></tr>)}
        </tbody>
      </table></div>
    </section>
  );
}

function ProgrammesByStatus({ list }: { list: ProgramMeta[] }) {
  if (!list.length) return <p className="text-sm bx-muted">No programme record names this funder.</p>;
  return (
    <div className="grid gap-3">
      {STATUSES.map((st) => {
        const ps = list.filter((p) => p.status === st);
        if (!ps.length) return null;
        return (
          <div key={st}>
            <h3 className="text-sm font-semibold">{STATUS_LABEL[st]} <span className="bx-muted font-normal">({ps.length})</span></h3>
            <ul className="mt-1 grid gap-1.5 sm:grid-cols-2">{ps.map((p) => <li key={p.id} className="bx-card p-2 text-sm"><Link className="underline font-semibold" to={`/programs/${p.id}`}>{p.name}</Link><p className="mt-0.5"><StatusChip status={p.status} date={p.status_date} /></p></li>)}</ul>
          </div>
        );
      })}
    </div>
  );
}

/** `/funders/:id` — a federal funder or a foundation, each in its own fixed order. */
export default function FunderPage() {
  const { id } = useParams();
  const funders = useAsync(loadFunders);
  const programs = useAsync(loadProgramsIndex);
  const f = funders?.find((x) => x.id === id);
  useEffect(() => { if (f) document.title = `${f.name} · Token for Granted`; return () => { document.title = 'Token for Granted'; }; }, [f]);
  const list = useMemo(() => (f && programs ? programs.filter((p) => p.funder === f.id || f.programs.includes(p.id)) : []), [f, programs]);
  const extra = useMemo(() => (f ? Object.entries(f).filter(([k]) => !SKIP.has(k)) : []), [f]);
  if (!funders) return <div className="mx-auto max-w-3xl px-4 py-12 bx-muted" role="status">Loading…</div>;
  if (!f) return <NotFound />;
  const foundation = f.side === 'foundation';
  const parent = funders.find((x) => x.id === String(f.parent ?? '').toLowerCase().split(/[\s(,]/)[0]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8" data-testid="funder-page" data-side={f.side}>
      <p className="text-sm"><Link className="underline" to="/funders">Funders</Link>{foundation && <> / <Link className="underline" to="/funders#foundations">Foundations</Link></>}</p>
      <div className="mt-2">
        <RecordHeader title={f.name} anchor={{ type: 'funders', id: f.id }}>
          <span className="bx-chip bg-paper-2 dark:bg-night-2">{f.funder_kind}</span>
          {typeof f.foundation_kind === 'string' && <span className="bx-chip bg-paper-2 dark:bg-night-2">{f.foundation_kind}</span>}
          {!foundation && f.parent ? <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">parent: {parent ? <Link className="underline" to={`/funders/${parent.id}`}>{String(f.parent)}</Link> : String(f.parent)}</span> : null}
          <AsOf date={f.as_of} />
        </RecordHeader>
      </div>

      {foundation && (
        <section className="bx-card p-3 mt-4 text-sm border-l-4 border-l-[color:var(--bx-accent)]" aria-label="How it takes requests" data-testid="unsolicited">
          <p><span className="font-semibold">How it takes requests: </span><span className="bx-chip border border-[color:var(--bx-line)]">{f.unsolicited}</span></p>
          {typeof f.unsolicited_note === 'string' && <div className="mt-1.5" data-testid="unsolicited-note"><Prose md={f.unsolicited_note} /></div>}
        </section>
      )}

      {(foundation ? FOUNDATION : FEDERAL).map(([k, label]) => <Field key={k} label={label} value={f[k]} name={k} />)}
      {!foundation && <Budget items={(f.budget as Money[] | undefined) ?? []} />}
      {!foundation && typeof f.policy_guide === 'string' && <><BlockLabel>Policy guide</BlockLabel><FieldView value={f.policy_guide} /></>}
      {foundation && <Giving f={f} />}

      <BlockLabel>Programmes by status</BlockLabel>
      {programs ? <ProgrammesByStatus list={list} /> : <p className="text-sm bx-muted" role="status">Loading…</p>}
      {f.routes.length > 0 && (<><BlockLabel>Routes that name this funder</BlockLabel><RecordLinks type="routes" ids={f.routes} /></>)}

      {foundation && (
        <section aria-label="Links out" data-testid="foundation-links">
          <BlockLabel>Links out</BlockLabel>
          <ul className="grid gap-1 text-sm">
            {f.official_url && <li><a className="underline break-all" href={f.official_url} target="_blank" rel="noreferrer">The foundation’s own page ↗</a></li>}
            {typeof f.grants_database_url === 'string' ? <li><a className="underline break-all" href={f.grants_database_url} target="_blank" rel="noreferrer">Its grants database ↗</a>{typeof f.grants_database_note === 'string' && <span className="bx-muted"> — <Prose md={f.grants_database_note} className="inline" /></span>}</li> : <li className="bx-muted">No grants database is recorded for it.</li>}
            {f.ein ? <li><a className="underline" href={propublicaUrl(f.ein)} target="_blank" rel="noreferrer" data-testid="propublica-link">Its filings on ProPublica Nonprofit Explorer (EIN {f.ein}) ↗</a></li> : <li className="bx-muted">No EIN is recorded, so there is no filing link.</li>}
          </ul>
        </section>
      )}
      {!foundation && f.official_url && <p className="mt-6 text-sm"><span className="font-semibold">Official page: </span><a className="underline break-all" href={f.official_url} target="_blank" rel="noreferrer">{f.official_url} ↗</a></p>}

      <PendingChanges items={f.pending_changes} />
      <Conflicts items={f.conflicts} />
      {f.changes_affecting.length > 0 && (<><BlockLabel>In the dated ledger</BlockLabel><RecordLinks type="changes" ids={f.changes_affecting} /></>)}
      {extra.map(([k, v]) => <Field key={k} label={humanise(k)} value={v} name={k} />)}
      <Sources ns={f.sources} />
      <Variants items={f.variants} />
      <p className="mt-6 text-sm bx-muted">This record is as of {f.as_of}. It states what the funder’s own pages and filings say; it is not advice.</p>
    </article>
  );
}
